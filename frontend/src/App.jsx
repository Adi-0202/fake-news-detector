import { useState } from 'react';

export default function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null); // Fixed: Stores object state instead of raw lists
  const [error, setError] = useState('');

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError('');
    setAnalysis(null);

    try {
      const response = await fetch('http://127.0.0.1:8000/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: url }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const data = await response.json();
      setAnalysis(data); // Stores the full structured payload
    } catch (err) {
      console.error('Analysis failed:', err);
      setError(err.message || 'Something went wrong while connecting to the backend.');
    } finally {
      setLoading(false);
    }
  };

  // Styles for individual claim badges
  const getClaimVerdictStyles = (verdict) => {
    switch (verdict) {
      case 'SUPPORTED':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 border-l-4 border-emerald-500 bg-slate-900/40 shadow-[0_0_15px_-3px_rgba(16,185,129,0.1)]';
      case 'REFUTED':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30 border-l-4 border-rose-500 bg-slate-900/40 shadow-[0_0_15px_-3px_rgba(244,63,94,0.1)]';
      case 'UNVERIFIED':
      default:
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30 border-l-4 border-amber-500 bg-slate-900/40 shadow-[0_0_15px_-3px_rgba(245,158,11,0.1)]';
    }
  };

  // Styles for the main global summary card banner
  const getGlobalVerdictStyles = (verdict) => {
    switch (verdict) {
      case 'TRUSTWORTHY':
        return 'border-emerald-500/40 bg-emerald-950/20 text-emerald-400 ring-emerald-500/20';
      case 'MIXED VALIDITY':
        return 'border-amber-500/40 bg-amber-950/20 text-amber-400 ring-amber-500/20';
      case 'HIGH RISK':
        return 'border-rose-500/40 bg-rose-950/20 text-rose-400 ring-rose-500/20';
      default:
        return 'border-slate-800 bg-slate-900/40 text-slate-400 ring-slate-800';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased p-4 md:p-12 selection:bg-indigo-500/30">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-75 bg-linear-to-b from-indigo-500/10 to-transparent blur-3xl pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        
        {/* Header Section */}
        <header className="mb-12 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs font-semibold mb-3 tracking-wide uppercase">
            <span role="img" aria-label="robot">🤖</span> Live Web RAG Engine Active
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-linear-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Neural Sieve Cascade
          </h1>
          <p className="mt-2 text-slate-400 max-w-xl text-base leading-relaxed">
            Deconstruct complex articles into structured claims and cross-examine them against organic search indexing instantaneously.
          </p>
        </header>

        {/* Input Form Box */}
        <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl border border-slate-800/80 shadow-xl mb-10">
          <form onSubmit={handleAnalyze} className="flex flex-col sm:flex-row gap-3">
            <input
              type="url"
              required
              placeholder="Paste article URL here (NDTV, The Hindu, Reuters...)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 px-4 py-3.5 bg-slate-950/80 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-slate-200 placeholder:text-slate-600 shadow-inner"
            />
            <button
              type="submit"
              disabled={loading}
              className={`sm:px-6 py-3.5 rounded-xl font-semibold text-white tracking-wide transition-all duration-200 shadow-lg ${
                loading 
                  ? 'bg-indigo-600/50 cursor-not-allowed opacity-80' 
                  : 'bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] hover:shadow-indigo-500/20'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Running Live Analysis...
                </span>
              ) : (
                'Analyze Article'
              )}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-3.5 bg-rose-500/10 text-rose-400 text-sm rounded-xl border border-rose-500/20 flex items-center gap-2">
              <span role="img" aria-label="warning">⚠️</span> {error}
            </div>
          )}
        </div>

        {/* Global Summary Metric Card Block */}
        {analysis && (
          <div className={`p-6 rounded-2xl border backdrop-blur-md mb-8 ring-1 transition-all duration-500 ${getGlobalVerdictStyles(analysis.overall_verdict)}`}>
            <span className="text-[10px] font-black tracking-widest uppercase opacity-60 block mb-1">
              Aggregated Source Verdict
            </span>
            <h2 className="text-2xl font-black tracking-tight mb-2 uppercase">
              {analysis.overall_verdict}
            </h2>
            <p className="text-sm opacity-90 leading-relaxed max-w-2xl">
              {analysis.overall_explanation}
            </p>
          </div>
        )}

        {/* Claims Mapping List */}
        <div className="space-y-5 text-left">
          {analysis && analysis.claims.length > 0 && (
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <h2 className="text-sm font-bold text-slate-400 tracking-wider uppercase">
                Detailed Claims Breakdown
              </h2>
            </div>
          )}

          {analysis && analysis.claims.map((result, index) => {
            const cardStyles = getClaimVerdictStyles(result.verdict);
            const badgeColor = result.verdict === 'SUPPORTED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : result.verdict === 'REFUTED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30';
            
            return (
              <div
                key={index}
                className={`p-6 rounded-xl border border-slate-800/60 backdrop-blur-sm transition-all duration-300 hover:border-slate-700/80 ${cardStyles}`}
              >
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                  <h3 className="text-base md:text-lg font-semibold text-slate-100 leading-snug flex-1">
                    {result.claim_text}
                  </h3>
                  <span className={`px-2.5 py-1 text-xs font-black tracking-widest rounded border shrink-0 uppercase ${badgeColor}`}>
                    {result.verdict}
                  </span>
                </div>
                
                <div className="pt-3 border-t border-slate-800/60 mb-4">
                  <span className="text-xs font-bold text-slate-500 tracking-wider uppercase block mb-1">
                    Automated Verification Report
                  </span>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {result.explanation}
                  </p>
                </div>

                {result.sources && result.sources.length > 0 && (
                  <div className="pt-3 border-t border-slate-900/60">
                    <span className="text-[11px] font-bold text-slate-500 tracking-wider uppercase block mb-2">
                      Retrieved Verification Sources
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {result.sources.map((src, sIdx) => (
                        <a
                          key={sIdx}
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs bg-slate-900 text-indigo-400 border border-slate-800 rounded-lg px-3 py-1.5 hover:bg-indigo-500/10 hover:border-indigo-500/30 inline-flex items-center gap-1.5 transition-all max-w-full truncate"
                          title={src.title}
                        >
                          <svg className="w-3 h-3 text-slate-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          <span className="truncate max-w-50 sm:max-w-75">
                            {src.title}
                          </span>
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
    </div>
  );
}