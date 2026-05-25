import { useState } from 'react'; // Fixed: Removed unused 'React' import

export default function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError('');
    setResults([]);

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
      setResults(data);
    } catch (err) {
      console.error('Analysis failed:', err);
      setError(err.message || 'Something went wrong while connecting to the backend.');
    } finally {
      setLoading(false);
    }
  };

  const getVerdictStyles = (verdict) => {
    switch (verdict) {
      case 'SUPPORTED':
        return {
          badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          card: 'border-l-4 border-emerald-500 bg-slate-900/40 shadow-[0_0_15px_-3px_rgba(16,185,129,0.1)]',
          text: 'text-emerald-400'
        };
      case 'REFUTED':
        return {
          badge: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
          card: 'border-l-4 border-rose-500 bg-slate-900/40 shadow-[0_0_15px_-3px_rgba(244,63,94,0.1)]',
          text: 'text-rose-400'
        };
      case 'UNVERIFIED':
      default:
        return {
          badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          card: 'border-l-4 border-amber-500 bg-slate-900/40 shadow-[0_0_15px_-3px_rgba(245,158,11,0.1)]',
          text: 'text-amber-400'
        };
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased p-4 md:p-12 selection:bg-indigo-500/30">
      {/* Background Glow Accents */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-75 bg-linear-to-b from-indigo-500/10 to-transparent blur-3xl pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        
        {/* Header Section */}
        <header className="mb-12 text-left">
          {/* Fixed: Wrapped emoji in an accessible span */}
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
                  Processing Pipeline...
                </span>
              ) : (
                'Analyze Article'
              )}
            </button>
          </form>

          {error && (
            /* Fixed: Wrapped error emoji in an accessible span */
            <div className="mt-4 p-3.5 bg-rose-500/10 text-rose-400 text-sm rounded-xl border border-rose-500/20 flex items-center gap-2">
              <span role="img" aria-label="warning">⚠️</span> {error}
            </div>
          )}
        </div>

        {/* Results Block Display */}
        <div className="space-y-5 text-left">
          {results.length > 0 && (
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <h2 className="text-lg font-bold text-slate-200 tracking-tight">
                Extracted Claims & Verdicts
              </h2>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-xs">
                {results.length} verified
              </span>
            </div>
          )}

          {results.map((result, index) => {
            const styles = getVerdictStyles(result.verdict);
            return (
              <div
                key={index}
                className={`p-6 rounded-xl border border-slate-800/60 backdrop-blur-sm transition-all duration-300 hover:border-slate-700/80 ${styles.card}`}
              >
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                  <h3 className="text-base md:text-lg font-semibold text-slate-100 leading-snug flex-1">
                    {result.claim_text}
                  </h3>
                  <span className={`px-2.5 py-1 text-xs font-black tracking-widest rounded border shrink-0 uppercase ${styles.badge}`}>
                    {result.verdict}
                  </span>
                </div>
                
                <div className="pt-3 border-t border-slate-800/60">
                  <span className="text-xs font-bold text-slate-500 tracking-wider uppercase block mb-1">
                    Automated Verification Report
                  </span>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {result.explanation}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}