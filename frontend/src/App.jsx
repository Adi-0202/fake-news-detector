import { useState, useEffect, useCallback, useRef } from 'react';

export default function App() {
  const [activeTab, setActiveTab] = useState('url');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);

  const pdfInputRef = useRef(null);
  const imageInputRef = useRef(null);

  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);

  const fetchHistory = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/history');
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  useEffect(() => { fetchHistory(); }, []);

  const startResizing = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      if (e.clientX >= 220 && e.clientX <= 500) setSidebarWidth(e.clientX);
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
      let payload = { url: '', text: '' };
      if (customItem.url === 'Raw Text Entry' || customItem.url.startsWith('PDF: ') || customItem.url.startsWith('Image: ')) {
        payload.text = (customItem.claims || []).map(c => c.claim_text).join('. ');
      } else {
        payload.url = customItem.url;
      }
      requestOptions = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) };
    } else {
      if (activeTab === 'pdf') {
        if (!pdfFile) { setError('Please select a valid PDF file.'); setLoading(false); return; }
        endpoint = 'http://127.0.0.1:8000/analyze/pdf';
        const fd = new FormData(); fd.append('file', pdfFile);
        requestOptions = { method: 'POST', body: fd };
      } else if (activeTab === 'image') {
        if (!imageFile) { setError('Please choose a valid image file.'); setLoading(false); return; }
        endpoint = 'http://127.0.0.1:8000/analyze/image';
        const fd = new FormData(); fd.append('file', imageFile);
        requestOptions = { method: 'POST', body: fd };
      } else {
        let payload = { url: '', text: '' };
        if (activeTab === 'url') {
          if (!url.trim()) { setLoading(false); return; }
          payload.url = url.trim();
        } else {
          if (!text.trim()) { setLoading(false); return; }
          payload.text = text.trim();
        }
        requestOptions = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) };
      }
    }

    try {
      const response = await fetch(endpoint, requestOptions);
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      const data = await response.json();
      setAnalysis({
        title: data.title || 'Analysis Report',
        overall_verdict: data.overall_verdict || 'UNVERIFIED',
        overall_explanation: data.overall_explanation || 'No parameters derived.',
        claims: data.claims || []
      });
      await fetchHistory();
      if (!customItem) {
        setUrl(''); setText(''); setPdfFile(null); setImageFile(null);
        if (pdfInputRef.current) pdfInputRef.current.value = '';
        if (imageInputRef.current) imageInputRef.current.value = '';
      }
    } catch (err) {
      setError(err.message || 'Connection failed.');
    } finally {
      setLoading(false);
    }
  };

  const verdictConfig = {
    TRUSTWORTHY: { accent: '#00C896', bg: 'rgba(0,200,150,0.06)', border: 'rgba(0,200,150,0.2)', label: 'Verified credible' },
    'HIGH RISK':  { accent: '#FF5D73', bg: 'rgba(255,93,115,0.06)', border: 'rgba(255,93,115,0.2)', label: 'Potentially false' },
    UNVERIFIED:   { accent: '#F59E0B', bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.2)', label: 'Insufficient data' },
  };

  const claimConfig = {
    SUPPORTED:  { accent: '#00C896', border: 'rgba(0,200,150,0.25)', bg: 'rgba(0,200,150,0.04)' },
    REFUTED:    { accent: '#FF5D73', border: 'rgba(255,93,115,0.25)', bg: 'rgba(255,93,115,0.04)' },
    UNVERIFIED: { accent: '#F59E0B', border: 'rgba(245,158,11,0.25)', bg: 'rgba(245,158,11,0.04)' },
  };

  const vc = analysis ? (verdictConfig[analysis.overall_verdict] || verdictConfig.UNVERIFIED) : null;

  const tabs = [
    { id: 'url',   label: 'URL',      icon: <LinkIcon /> },
    { id: 'text',  label: 'Text',     icon: <TextIcon /> },
    { id: 'pdf',   label: 'PDF',      icon: <FileIcon /> },
    { id: 'image', label: 'Image',    icon: <ImageIcon /> },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,400;0,500;1,400&family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg:       #09090B;
          --bg2:      #0F1013;
          --bg3:      #141417;
          --bg4:      #18181C;
          --border:   rgba(255,255,255,0.055);
          --border2:  rgba(255,255,255,0.09);
          --accent:   #4F8CFF;
          --accent2:  #00D2A8;
          --text:     #F0F0F2;
          --text2:    #8B8D97;
          --text3:    #4B4D57;
          --font-display: 'Syne', sans-serif;
          --font-body:    'DM Sans', sans-serif;
          --font-mono:    'DM Mono', monospace;
          --radius:   10px;
          --radius-lg:16px;
        }

        body { background: var(--bg); color: var(--text); font-family: var(--font-body); -webkit-font-smoothing: antialiased; }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }

        .layout { display: flex; min-height: 100vh; }

        /* ── SIDEBAR ── */
        .sidebar {
          background: var(--bg2);
          border-right: 1px solid var(--border);
          display: flex; flex-direction: column;
          height: 100vh; position: sticky; top: 0;
          overflow: hidden; flex-shrink: 0; z-index: 10;
        }
        .sidebar-head {
          padding: 20px 20px 16px;
          border-bottom: 1px solid var(--border);
          display: flex; align-items: center; gap: 10px;
        }
        .sidebar-logo {
          width: 26px; height: 26px; border-radius: 7px;
          background: var(--accent); opacity: .9;
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 700; color: #fff;
          font-family: var(--font-display); flex-shrink: 0;
        }
        .sidebar-brand {
          font-family: var(--font-display);
          font-size: 13px; font-weight: 700;
          letter-spacing: -0.3px; color: var(--text);
        }
        .sidebar-brand span { color: var(--text2); font-weight: 400; }
        .sidebar-section-label {
          font-family: var(--font-mono);
          font-size: 9px; font-weight: 500;
          letter-spacing: 1.8px; text-transform: uppercase;
          color: var(--text3); padding: 16px 20px 10px;
        }
        .sidebar-scroll { overflow-y: auto; flex: 1; padding: 0 12px 12px; }
        .sidebar-empty {
          font-family: var(--font-mono);
          font-size: 11px; color: var(--text3);
          padding: 8px 8px; font-style: italic; line-height: 1.6;
        }
        .hist-card {
          width: 100%; text-align: left;
          padding: 12px 14px; border-radius: var(--radius);
          border: 1px solid transparent;
          background: transparent;
          color: inherit; cursor: pointer;
          transition: all .18s ease;
          display: flex; flex-direction: column; gap: 6px;
          margin-bottom: 4px;
        }
        .hist-card:hover {
          background: var(--bg4);
          border-color: var(--border);
        }
        .hist-card-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
        .hist-badge {
          font-family: var(--font-mono);
          font-size: 8px; font-weight: 500;
          letter-spacing: 1.5px; text-transform: uppercase;
          padding: 3px 7px; border-radius: 4px;
          border: 1px solid; display: inline-block;
        }
        .hist-badge-trust  { color: #00C896; border-color: rgba(0,200,150,.25); background: rgba(0,200,150,.07); }
        .hist-badge-risk   { color: #FF5D73; border-color: rgba(255,93,115,.25); background: rgba(255,93,115,.07); }
        .hist-badge-unverif{ color: #F59E0B; border-color: rgba(245,158,11,.25);  background: rgba(245,158,11,.07); }
        .hist-time { font-family: var(--font-mono); font-size: 10px; color: var(--text3); }
        .hist-title {
          font-family: var(--font-body); font-size: 12px;
          font-weight: 500; color: var(--text2);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          transition: color .18s;
        }
        .hist-card:hover .hist-title { color: var(--text); }
        .hist-url {
          font-family: var(--font-mono); font-size: 10px;
          color: var(--text3);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        /* ── RESIZER ── */
        .resizer {
          width: 5px; cursor: col-resize; position: relative;
          background: transparent; flex-shrink: 0;
          transition: background .2s;
          display: none;
        }
        .resizer:hover, .resizer.active { background: rgba(79,140,255,.3); }
        .resizer::after {
          content: ''; position: absolute; top: 50%; left: 50%;
          transform: translate(-50%,-50%);
          width: 1px; height: 40px; background: var(--border2); border-radius: 1px;
        }

        /* ── MAIN ── */
        .main { flex: 1; overflow-x: hidden; padding: 40px 48px 80px; min-width: 0; }

        .page-header { margin-bottom: 36px; }
        .live-badge {
          display: inline-flex; align-items: center; gap: 7px;
          font-family: var(--font-mono); font-size: 10px; font-weight: 500;
          letter-spacing: 1.5px; text-transform: uppercase;
          color: var(--accent2); padding: 5px 12px;
          border: 1px solid rgba(0,210,168,.2);
          background: rgba(0,210,168,.05);
          border-radius: 5px; margin-bottom: 18px;
        }
        .live-dot {
          width: 5px; height: 5px; border-radius: 50%;
          background: var(--accent2);
          animation: blink 2s ease infinite;
        }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.25} }
        h1 {
          font-family: var(--font-display);
          font-size: clamp(26px, 3.5vw, 38px);
          font-weight: 800; letter-spacing: -1.5px;
          line-height: 1.05; color: var(--text);
          margin-bottom: 10px;
        }
        h1 em { font-style: normal; color: var(--text2); font-weight: 600; }
        .page-sub {
          font-size: 14px; color: var(--text2);
          line-height: 1.7; max-width: 560px;
        }

        /* ── TABS ── */
        .tab-bar {
          display: flex; gap: 4px; margin-bottom: -1px;
          position: relative; z-index: 1;
        }
        .tab-btn {
          display: flex; align-items: center; gap: 7px;
          padding: 9px 18px; font-family: var(--font-body);
          font-size: 13px; font-weight: 500; cursor: pointer;
          border: 1px solid transparent; border-bottom: none;
          border-radius: 9px 9px 0 0;
          background: transparent; color: var(--text2);
          transition: all .18s ease;
        }
        .tab-btn svg { opacity: .6; transition: opacity .18s; }
        .tab-btn:hover { color: var(--text); background: var(--bg3); }
        .tab-btn:hover svg { opacity: 1; }
        .tab-btn.active {
          color: var(--text); background: var(--bg3);
          border-color: var(--border);
        }
        .tab-btn.active svg { opacity: 1; }

        /* ── INPUT BOX ── */
        .input-box {
          background: var(--bg3);
          border: 1px solid var(--border);
          border-radius: 0 var(--radius-lg) var(--radius-lg) var(--radius-lg);
          padding: 24px; margin-bottom: 28px;
          position: relative; overflow: hidden;
        }
        .input-box::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0;
          height: 1px; background: linear-gradient(90deg, var(--accent) 0%, transparent 60%);
          opacity: .35;
        }
        .url-row { display: flex; gap: 10px; }
        .field-input {
          flex: 1; padding: 12px 16px;
          background: var(--bg2); border: 1px solid var(--border2);
          border-radius: var(--radius); color: var(--text);
          font-family: var(--font-body); font-size: 13.5px;
          outline: none; transition: border-color .2s;
        }
        .field-input:focus { border-color: rgba(79,140,255,.5); }
        .field-input::placeholder { color: var(--text3); }
        textarea.field-input { resize: none; line-height: 1.65; }

        .submit-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 12px 22px; background: var(--accent);
          color: #fff; border: none; border-radius: var(--radius);
          font-family: var(--font-body); font-size: 13px; font-weight: 600;
          cursor: pointer; transition: all .2s; white-space: nowrap;
          letter-spacing: -0.2px;
        }
        .submit-btn:hover:not(:disabled) { background: #6BA3FF; transform: translateY(-1px); }
        .submit-btn:disabled { opacity: .38; cursor: not-allowed; transform: none; }
        .submit-btn-full { width: 100%; justify-content: center; }

        /* ── DROPZONE ── */
        .dropzone {
          border: 1px dashed var(--border2);
          border-radius: var(--radius); padding: 32px;
          text-align: center; background: var(--bg2);
          position: relative; cursor: pointer;
          transition: all .2s; margin-bottom: 14px;
        }
        .dropzone:hover { border-color: rgba(79,140,255,.4); background: rgba(79,140,255,.03); }
        .dropzone input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }
        .dropzone-icon {
          width: 38px; height: 38px; margin: 0 auto 12px;
          border-radius: 9px; background: var(--bg4);
          border: 1px solid var(--border2);
          display: flex; align-items: center; justify-content: center;
          color: var(--text2);
        }
        .dropzone-label { font-size: 13px; font-weight: 500; color: var(--text2); margin-bottom: 3px; }
        .dropzone-sub { font-size: 11px; color: var(--text3); font-family: var(--font-mono); }
        .dropzone-chosen { font-size: 12px; font-weight: 500; color: var(--accent); font-family: var(--font-mono); }

        /* ── ERROR ── */
        .error-bar {
          display: flex; align-items: center; gap: 10px;
          margin-top: 14px; padding: 11px 16px;
          background: rgba(255,93,115,.07); border: 1px solid rgba(255,93,115,.2);
          border-radius: var(--radius); font-size: 13px; color: #FF5D73;
        }

        /* ── VERDICT ── */
        .verdict-block {
          border-radius: var(--radius-lg); padding: 24px 28px;
          border: 1px solid; margin-bottom: 24px;
          position: relative; overflow: hidden;
        }
        .verdict-block::before {
          content: ''; position: absolute; top: 0; left: 0;
          width: 3px; height: 100%;
        }
        .verdict-eyebrow {
          font-family: var(--font-mono); font-size: 9px; font-weight: 500;
          letter-spacing: 2px; text-transform: uppercase;
          opacity: .55; margin-bottom: 8px; display: block;
        }
        .verdict-title {
          font-family: var(--font-display);
          font-size: 22px; font-weight: 800;
          letter-spacing: -0.5px; margin-bottom: 8px;
        }
        .verdict-text { font-size: 13.5px; line-height: 1.7; opacity: .8; max-width: 640px; }

        /* ── CLAIMS SECTION HEADER ── */
        .claims-header {
          display: flex; align-items: center; gap: 12px;
          margin-bottom: 16px; padding-bottom: 14px;
          border-bottom: 1px solid var(--border);
        }
        .claims-header-label {
          font-family: var(--font-mono); font-size: 9px; font-weight: 500;
          letter-spacing: 1.8px; text-transform: uppercase; color: var(--text3);
        }
        .claims-count {
          font-family: var(--font-mono); font-size: 10px; font-weight: 500;
          padding: 2px 8px; border-radius: 4px;
          background: var(--bg4); color: var(--text2);
          border: 1px solid var(--border);
        }

        /* ── CLAIM CARD ── */
        .claim-card {
          border-radius: var(--radius-lg); border: 1px solid;
          padding: 22px 24px; margin-bottom: 12px;
          position: relative; transition: all .2s;
        }
        .claim-card::before {
          content: ''; position: absolute; top: 0; left: 0;
          width: 2px; height: 100%; border-radius: 2px 0 0 2px;
        }
        .claim-card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 16px; }
        .claim-text { font-size: 14.5px; font-weight: 500; line-height: 1.55; flex: 1; }
        .claim-badge {
          font-family: var(--font-mono); font-size: 8px; font-weight: 500;
          letter-spacing: 1.5px; text-transform: uppercase;
          padding: 4px 10px; border-radius: 4px;
          border: 1px solid; white-space: nowrap; flex-shrink: 0;
        }
        .claim-divider { height: 1px; background: var(--border); margin-bottom: 14px; }
        .claim-section-label {
          font-family: var(--font-mono); font-size: 9px; font-weight: 500;
          letter-spacing: 1.5px; text-transform: uppercase;
          color: var(--text3); display: block; margin-bottom: 7px;
        }
        .claim-explanation { font-size: 13px; color: var(--text2); line-height: 1.7; }
        .sources-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--border); }
        .source-chip {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 5px 10px; background: var(--bg2);
          border: 1px solid var(--border2); border-radius: 6px;
          font-size: 11px; color: var(--accent);
          text-decoration: none; transition: all .18s;
          max-width: 220px;
        }
        .source-chip:hover { border-color: rgba(79,140,255,.4); background: rgba(79,140,255,.07); }
        .source-chip span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--font-mono); }

        /* ── LOADING SPINNER ── */
        .spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.2); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── RESPONSIVE ── */
        @media (max-width: 768px) {
          .sidebar { display: none !important; }
          .resizer { display: none !important; }
          .main { padding: 24px 20px 60px; }
          .url-row { flex-direction: column; }
          .submit-btn { width: 100%; justify-content: center; }
        }
        @media (min-width: 769px) {
          .sidebar { display: flex; }
          .resizer { display: block; }
        }
      `}</style>

      <div className="layout" style={{ cursor: isResizing ? 'col-resize' : 'default', userSelect: isResizing ? 'none' : 'auto' }}>

        {/* ── SIDEBAR ── */}
        <aside className="sidebar" style={{ width: `${sidebarWidth}px` }}>
          <div className="sidebar-head">
            <div className="sidebar-logo">N</div>
            <div className="sidebar-brand">NeuralSieve <span>/ Logs</span></div>
          </div>
          <div className="sidebar-section-label">Recent verifications</div>
          <div className="sidebar-scroll">
            {history.length === 0 ? (
              <p className="sidebar-empty">No scans recorded yet. Submit content to begin analysis.</p>
            ) : (
              history.map((item) => {
                const bClass = item.overall_verdict === 'TRUSTWORTHY' ? 'hist-badge-trust'
                  : item.overall_verdict === 'HIGH RISK' ? 'hist-badge-risk' : 'hist-badge-unverif';
                const srcLabel = item.url === 'Raw Text Entry' ? '◈ Raw text'
                  : item.url?.startsWith('PDF: ') ? '◈ ' + item.url
                  : item.url?.startsWith('Image: ') ? '◈ ' + item.url
                  : item.url;
                return (
                  <button key={item.id} className="hist-card" onClick={() => setAnalysis(item)}>
                    <div className="hist-card-top">
                      <span className={`hist-badge ${bClass}`}>{item.overall_verdict}</span>
                      <span className="hist-time">{item.timestamp ? item.timestamp.split(' ')[1]?.slice(0,5) : '--:--'}</span>
                    </div>
                    <div className="hist-title">{item.title || 'Untitled Scan'}</div>
                    <div className="hist-url">{srcLabel}</div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* ── RESIZER ── */}
        <div className={`resizer ${isResizing ? 'active' : ''}`} onMouseDown={startResizing} />

        {/* ── MAIN ── */}
        <main className="main">
          <div style={{ maxWidth: 780, width: '100%' }}>

            {/* Page Header */}
            <header className="page-header">
              <div className="live-badge">
                <span className="live-dot" />
                Live RAG engine active
              </div>
              <h1>Neural Sieve <em>Cascade</em></h1>
              <p className="page-sub">Deconstruct complex payloads into structured claims and cross-examine them against live search intelligence.</p>
            </header>

            {/* Tab Bar */}
            <div className="tab-bar">
              {tabs.map(t => (
                <button
                  key={t.id}
                  className={`tab-btn ${activeTab === t.id ? 'active' : ''}`}
                  onClick={() => { setActiveTab(t.id); setError(''); }}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* Input Box */}
            <div className="input-box">
              <form onSubmit={handleAnalyze}>
                {activeTab === 'url' && (
                  <div className="url-row">
                    <input
                      type="url" required
                      className="field-input"
                      placeholder="https://news-article-url.com/story/..."
                      value={url} onChange={e => setUrl(e.target.value)}
                    />
                    <button type="submit" className="submit-btn" disabled={loading}>
                      {loading ? <><span className="spinner" /> Analyzing…</> : <><RunIcon /> Analyze URL</>}
                    </button>
                  </div>
                )}
                {activeTab === 'text' && (
                  <>
                    <textarea
                      required rows={5}
                      className="field-input"
                      style={{ width: '100%', marginBottom: 12 }}
                      placeholder="Paste a claim, headline, or article text to verify…"
                      value={text} onChange={e => setText(e.target.value)}
                    />
                    <button type="submit" className="submit-btn submit-btn-full" disabled={loading}>
                      {loading ? <><span className="spinner" /> Processing…</> : <><RunIcon /> Analyze Text</>}
                    </button>
                  </>
                )}
                {activeTab === 'pdf' && (
                  <>
                    <div className="dropzone">
                      <input type="file" ref={pdfInputRef} accept=".pdf" onChange={e => e.target.files?.[0] && setPdfFile(e.target.files[0])} />
                      <div className="dropzone-icon"><FileIcon size={18} /></div>
                      {pdfFile
                        ? <div className="dropzone-chosen">↳ {pdfFile.name}</div>
                        : <><div className="dropzone-label">Drop a PDF report here</div><div className="dropzone-sub">or click to browse · .pdf only</div></>
                      }
                    </div>
                    <button type="submit" className="submit-btn submit-btn-full" disabled={loading || !pdfFile}>
                      {loading ? <><span className="spinner" /> Parsing document…</> : <><RunIcon /> Analyze PDF</>}
                    </button>
                  </>
                )}
                {activeTab === 'image' && (
                  <>
                    <div className="dropzone">
                      <input type="file" ref={imageInputRef} accept="image/*" onChange={e => e.target.files?.[0] && setImageFile(e.target.files[0])} />
                      <div className="dropzone-icon"><ImageIcon size={18} /></div>
                      {imageFile
                        ? <div className="dropzone-chosen">↳ {imageFile.name}</div>
                        : <><div className="dropzone-label">Upload a screenshot or image forward</div><div className="dropzone-sub">PNG, JPG, WEBP supported</div></>
                      }
                    </div>
                    <button type="submit" className="submit-btn submit-btn-full" disabled={loading || !imageFile}>
                      {loading ? <><span className="spinner" /> Running OCR…</> : <><RunIcon /> Extract &amp; Verify</>}
                    </button>
                  </>
                )}
                {error && (
                  <div className="error-bar">
                    <WarnIcon /> {error}
                  </div>
                )}
              </form>
            </div>

            {/* Overall Verdict */}
            {analysis && vc && (
              <div
                className="verdict-block"
                style={{
                  borderColor: vc.border,
                  background: vc.bg,
                  color: vc.accent,
                }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: vc.accent, borderRadius: '2px 0 0 2px' }} />
                <span className="verdict-eyebrow">Overall verdict · {analysis.title}</span>
                <div className="verdict-title">{analysis.overall_verdict}</div>
                <div className="verdict-text" style={{ color: vc.accent }}>{analysis.overall_explanation}</div>
              </div>
            )}

            {/* Claims */}
            {analysis?.claims?.length > 0 && (
              <>
                <div className="claims-header">
                  <span className="claims-header-label">Claims breakdown</span>
                  <span className="claims-count">{analysis.claims.length} claim{analysis.claims.length !== 1 ? 's' : ''}</span>
                </div>
                {analysis.claims.map((claim, i) => {
                  const cc = claimConfig[claim.verdict] || claimConfig.UNVERIFIED;
                  return (
                    <div key={i} className="claim-card" style={{ borderColor: cc.border, background: cc.bg }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, width: 2, height: '100%', background: cc.accent, borderRadius: '2px 0 0 2px' }} />
                      <div className="claim-card-top">
                        <div className="claim-text">{claim.claim_text}</div>
                        <span className="claim-badge" style={{ color: cc.accent, borderColor: cc.border }}>
                          {claim.verdict}
                        </span>
                      </div>
                      <div className="claim-divider" />
                      <span className="claim-section-label">Verification report</span>
                      <p className="claim-explanation">{claim.explanation}</p>
                      {claim.sources?.length > 0 && (
                        <div className="sources-row">
                          <span className="claim-section-label" style={{ width: '100%', marginBottom: 4 }}>Sources</span>
                          {claim.sources.map((src, si) => (
                            <a key={si} href={src.url} target="_blank" rel="noopener noreferrer" className="source-chip" title={src.title}>
                              <ChainIcon />
                              <span>{src.title}</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}

          </div>
        </main>
      </div>
    </>
  );
}

/* ── Inline SVG Icons ── */
function LinkIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>;
}
function TextIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
}
function FileIcon({ size = 13 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>;
}
function ImageIcon({ size = 13 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;
}
function RunIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>;
}
function ChainIcon() {
  return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>;
}
function WarnIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
}