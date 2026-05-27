import { useState, useEffect, useCallback, useRef } from 'react';

export default function App() {
  const [activeTab, setActiveTab] = useState('url'); // 'url', 'text', 'pdf', or 'image'
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  
  // DOM References to safely clear native browser file buffers
  const pdfInputRef = useRef(null);
  const imageInputRef = useRef(null);
  
  const [sidebarWidth, setSidebarWidth] = useState(320); 
  const [isResizing, setIsResizing] = useState(false);

  const fetchHistory = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/history');
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (err) {
      console.error('Failed to load history storage logs:', err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const startResizing = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      if (e.clientX >= 240 && e.clientX <= 480) {
        setSidebarWidth(e.clientX);
      }
    };
    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleAnalyze = async (e, customItem = null) => {
    if (e) e.preventDefault();
    
    setLoading(true);
    setError('');
    setAnalysis(null);

    let endpoint = 'http://127.0.0.1:8000/analyze';
    let requestOptions = {};

    if (customItem) {
      endpoint = 'http://127.0.0.1:8000/analyze';
      let payload = { url: "", text: "" };
      if (customItem.url === "Raw Text Entry" || customItem.url.startsWith("PDF: ") || customItem.url.startsWith("Image: ")) {
        payload.text = (customItem.claims || []).map(c => c.claim_text).join(". ");
      } else {
        payload.url = customItem.url;
      }
      requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      };
    } else {
      if (activeTab === 'pdf') {
        if (!pdfFile) { setError('Please select a valid PDF file.'); setLoading(false); return; }
        endpoint = 'http://127.0.0.1:8000/analyze/pdf';
        const formData = new FormData();
        formData.append('file', pdfFile);
        requestOptions = { method: 'POST', body: formData };
      } else if (activeTab === 'image') {
        if (!imageFile) { setError('Please choose a valid image file.'); setLoading(false); return; }
        endpoint = 'http://127.0.0.1:8000/analyze/image';
        const formData = new FormData();
        formData.append('file', imageFile);
        requestOptions = { method: 'POST', body: formData };
      } else {
        let payload = { url: "", text: "" };
        if (activeTab === 'url') {
          if (!url.trim()) { setLoading(false); return; }
          payload.url = url.trim();
        } else {
          if (!text.trim()) { setLoading(false); return; }
          payload.text = text.trim();
        }
        requestOptions = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        };
      }
    }

    try {
      const response = await fetch(endpoint, requestOptions);
      if (!response.ok) throw new Error(`Server status fault: ${response.status}`);

      const data = await response.json();
      
      // Enforce data contract fallback synchronization
      setAnalysis({
        title: data.title || 'Analysis Report',
        overall_verdict: data.overall_verdict || 'UNVERIFIED',
        overall_explanation: data.overall_explanation || 'No tracking parameters derived.',
        claims: data.claims || []
      });
      
      await fetchHistory();
      
      // Safe cleanup phase: Clear both React states and underlying DOM values
      if (!customItem) {
        setUrl('');
        setText('');
        setPdfFile(null);
        setImageFile(null);
        if (pdfInputRef.current) pdfInputRef.current.value = "";
        if (imageInputRef.current) imageInputRef.current.value = "";
      }
    } catch (err) {
      console.error('Analysis failed:', err);
      setError(err.message || 'Something went wrong while connecting to the backend.');
    } finally {
      setLoading(false);
    }
  };

  const getClaimVerdictStyles = (verdict) => {
    switch (verdict) {
      case 'SUPPORTED': return 'border-l-4 border-emerald-500 bg-slate-900/40 shadow-[0_0_15px_-3px_rgba(16,185,129,0.1)]';
      case 'REFUTED': return 'border-l-4 border-rose-500 bg-slate-900/40 shadow-[0_0_15px_-3px_rgba(244,63,94,0.1)]';
      default: return 'border-l-4 border-amber-500 bg-slate-900/40 shadow-[0_0_15px_-3px_rgba(245,158,11,0.1)]';
    }
  };

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 font-sans antialiased flex flex-col md:flex-row selection:bg-indigo-500/30 ${isResizing ? 'cursor-col-resize select-none' : ''}`}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-75 bg-linear-to-b from-indigo-500/10 to-transparent blur-3xl pointer-events-none" />

      {/* History Sidebar Panel */}
      <aside style={{ width: `${sidebarWidth}px` }} className="hidden md:block bg-slate-900/30 border-r border-slate-900/80 p-6 z-10 shrink-0 h-screen sticky top-0 overflow-y-auto">
        <h2 className="text-sm font-bold text-slate-400 tracking-wider uppercase mb-5 flex items-center gap-2">
          <span>⏳</span> Recent Scan Logs
        </h2>
        {history.length === 0 ? (
          <p className="text-xs text-slate-600 italic">No past verifications indexed yet.</p>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <button
                key={item.id}
                onClick={() => setAnalysis(item)}
                className="w-full text-left p-3.5 rounded-xl border border-slate-900 bg-slate-950/40 hover:bg-slate-900/60 hover:border-slate-800/80 transition-all flex flex-col gap-2 group cursor-pointer"
              >
                <div className="flex justify-between items-center gap-2 w-full">
                  <span className={`text-[9px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded border ${item.overall_verdict === 'TRUSTWORTHY' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5' : item.overall_verdict === 'HIGH RISK' ? 'text-rose-400 border-rose-500/30 bg-rose-500/5' : 'text-amber-400 border-amber-500/30 bg-amber-500/5'}`}>
                    {item.overall_verdict}
                  </span>
                  <span className="text-[10px] text-slate-600 font-mono">
                    {item.timestamp ? item.timestamp.split(' ')[1]?.slice(0, 5) : 'Past'}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-200 truncate w-full group-hover:text-indigo-400 transition-colors">
                  {item.title || "Untracked Snapshot"}
                </h4>
                <p className="text-[11px] text-slate-600 truncate w-full font-mono">
                  {item.url === "Raw Text Entry" ? "📄 Raw Text Analysis" : item.url?.startsWith("PDF: ") ? "📁 " + item.url : item.url?.startsWith("Image: ") ? "🖼️ " + item.url : item.url}
                </p>
              </button>
            ))}
          </div>
        )}
      </aside>

      {/* Interactive Drag Resizer Grip */}
      <div onMouseDown={startResizing} className="hidden md:block w-1 cursor-col-resize sticky top-0 h-screen z-20 transition-colors border-r border-slate-900/40 hover:bg-indigo-500/40" />

      {/* Main Workspace Frame */}
      <main className="flex-1 p-4 md:p-12 relative z-10 w-full overflow-x-hidden">
        <div className="max-w-4xl mx-auto w-full">
          <header className="mb-8 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs font-semibold mb-3 tracking-wide uppercase">
              <span role="img" aria-label="robot">🤖</span> Live Web RAG Engine Active
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-linear-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Neural Sieve Cascade
            </h1>
            <p className="mt-2 text-slate-400 text-base leading-relaxed">
              Deconstruct complex payloads into structured claims and cross-examine them against organic search indexing instantaneously.
            </p>
          </header>

          {/* Tab Selection Bar */}
          <div className="flex flex-wrap gap-1 mb-4 border-b border-slate-900 pb-px">
            {[['url', '🔗 URL Link'], ['text', '📄 Raw Text'], ['pdf', '📁 PDF File'], ['image', '🖼️ Image Forward']].map(([tabId, label]) => (
              <button
                key={tabId}
                onClick={() => { setActiveTab(tabId); setError(''); }}
                className={`px-4 py-2.5 text-sm font-bold tracking-wide rounded-t-xl transition-all border-t border-x cursor-pointer ${
                  activeTab === tabId ? 'bg-slate-900/60 border-slate-800 text-indigo-400 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Input Interface Box */}
          <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl rounded-tl-none border border-slate-800/80 shadow-xl mb-10">
            <form onSubmit={(e) => handleAnalyze(e)} className="flex flex-col gap-4">
              
              {activeTab === 'url' && (
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="url" required placeholder="Paste full news article URL here..." value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="flex-1 px-4 py-3.5 bg-slate-950/80 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-200 shadow-inner"
                  />
                  <button type="submit" disabled={loading} className="sm:px-6 py-3.5 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-500 cursor-pointer">
                    {loading ? 'Running...' : 'Analyze Article'}
                  </button>
                </div>
              )}

              {activeTab === 'text' && (
                <div className="flex flex-col gap-3">
                  <textarea
                    required rows={5} placeholder="Type or paste custom statements or viral claims here..." value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="w-full px-4 py-3.5 bg-slate-950/80 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-200 font-sans text-sm shadow-inner"
                  />
                  <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-500 cursor-pointer">
                    {loading ? 'Processing...' : 'Analyze Raw Text Information'}
                  </button>
                </div>
              )}

              {activeTab === 'pdf' && (
                <div className="flex flex-col gap-4">
                  <div className="border-2 border-dashed border-slate-800 rounded-xl p-8 text-center bg-slate-950/40 relative hover:border-indigo-500/40 transition-colors">
                    <input 
                      type="file" 
                      ref={pdfInputRef}
                      accept=".pdf" 
                      onChange={(e) => e.target.files?.[0] && setPdfFile(e.target.files[0])} 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                    />
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-3xl">📁</span>
                      <p className="text-sm font-medium text-slate-300">{pdfFile ? pdfFile.name : "Click or Drag to browse a PDF report"}</p>
                    </div>
                  </div>
                  <button type="submit" disabled={loading || !pdfFile} className={`w-full py-3.5 rounded-xl font-semibold text-white ${!pdfFile ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 cursor-pointer'}`}>
                    {loading ? 'Verifying Document Pages...' : 'Analyze Uploaded PDF'}
                  </button>
                </div>
              )}

              {activeTab === 'image' && (
                <div className="flex flex-col gap-4">
                  <div className="border-2 border-dashed border-slate-800 rounded-xl p-8 text-center bg-slate-950/40 relative hover:border-indigo-500/40 transition-colors">
                    <input 
                      type="file" 
                      ref={imageInputRef}
                      accept="image/*" 
                      onChange={(e) => e.target.files?.[0] && setImageFile(e.target.files[0])} 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                    />
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-3xl">🖼️</span>
                      <p className="text-sm font-medium text-slate-300">{imageFile ? imageFile.name : "Upload a WhatsApp Forward Screenshot (PNG/JPG)"}</p>
                    </div>
                  </div>
                  <button type="submit" disabled={loading || !imageFile} className={`w-full py-3.5 rounded-xl font-semibold text-white ${!imageFile ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 cursor-pointer'}`}>
                    {loading ? 'Running Computer Vision OCR Inference...' : 'Extract & Verify Image Text'}
                  </button>
                </div>
              )}

            </form>

            {error && (
              <div className="mt-4 p-3.5 bg-rose-500/10 text-rose-400 text-sm rounded-xl border border-rose-500/20 flex items-center gap-2">
                <span>⚠️</span> {error}
              </div>
            )}
          </div>

          {/* Results Summary Template Block */}
          {analysis && (
            <div className={`p-6 rounded-2xl border backdrop-blur-md mb-8 text-left ${analysis.overall_verdict === 'TRUSTWORTHY' ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-400' : analysis.overall_verdict === 'HIGH RISK' ? 'border-rose-500/40 bg-rose-950/20 text-rose-400' : 'border-amber-500/40 bg-amber-950/20 text-amber-400'}`}>
              <span className="text-[10px] font-black tracking-widest uppercase opacity-60 block mb-1">Aggregated Source Verdict</span>
              <h2 className="text-2xl font-black tracking-tight mb-2 uppercase">{analysis.overall_verdict}</h2>
              <p className="text-sm opacity-90 leading-relaxed max-w-2xl">{analysis.overall_explanation}</p>
            </div>
          )}

          {/* Claims List Breakdown Cards */}
          <div className="space-y-5 text-left">
            {analysis && analysis.claims && analysis.claims.length > 0 && (
              <div className="pb-2 border-b border-slate-800">
                <h2 className="text-sm font-bold text-slate-400 tracking-wider uppercase">Detailed Claims Breakdown</h2>
              </div>
            )}

            {analysis && analysis.claims && analysis.claims.map((result, index) => {
              const cardStyles = getClaimVerdictStyles(result.verdict);
              const badgeColor = result.verdict === 'SUPPORTED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : result.verdict === 'REFUTED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30';
              
              return (
                <div key={index} className={`p-6 rounded-xl border border-slate-800/60 backdrop-blur-sm transition-all ${cardStyles}`}>
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                    <h3 className="text-base md:text-lg font-semibold text-slate-100 leading-snug flex-1">{result.claim_text}</h3>
                    <span className={`px-2.5 py-1 text-xs font-black tracking-widest rounded border shrink-0 uppercase ${badgeColor}`}>{result.verdict}</span>
                  </div>
                  <div className="pt-3 border-t border-slate-800/60 mb-4">
                    <span className="text-xs font-bold text-slate-500 tracking-wider uppercase block mb-1">Automated Verification Report</span>
                    <p className="text-slate-400 text-sm leading-relaxed">{result.explanation}</p>
                  </div>
                  {result.sources && result.sources.length > 0 && (
                    <div className="pt-3 border-t border-slate-900/60">
                      <span className="text-[11px] font-bold text-slate-500 tracking-wider uppercase block mb-2">Retrieved Verification Sources</span>
                      <div className="flex flex-wrap gap-2">
                        {result.sources.map((src, sIdx) => (
                          <a key={sIdx} href={src.url} target="_blank" rel="noopener noreferrer" className="text-xs bg-slate-900 text-indigo-400 border border-slate-800 rounded-lg px-3 py-1.5 hover:border-indigo-500/30 inline-flex items-center gap-1.5 transition-all truncate max-w-full" title={src.title}>
                            <svg className="w-3 h-3 text-slate-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                            <span className="truncate max-w-xs">{src.title}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}