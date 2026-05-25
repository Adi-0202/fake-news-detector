import React, { useState } from 'react';

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

  // Helper function to return dynamic styling based on the backend AI verdict
  const getVerdictStyles = (verdict) => {
    switch (verdict) {
      case 'SUPPORTED':
        return {
          badge: 'bg-green-100 text-green-800 border-green-200',
          card: 'border-l-8 border-green-500 bg-emerald-50/30',
        };
      case 'REFUTED':
        return {
          badge: 'bg-red-100 text-red-800 border-red-200',
          card: 'border-l-8 border-red-500 bg-rose-50/30',
        };
      case 'UNVERIFIED':
      default:
        return {
          badge: 'bg-amber-100 text-amber-800 border-amber-200',
          card: 'border-l-8 border-amber-500 bg-amber-50/20',
        };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        
        {/* Header Section */}
        <header className="mb-10 text-center md:text-left">
          <h1 className="text-4xl font-extrabold tracking-tight text-indigo-950">
            Neural Sieve Cascade <span className="text-indigo-600 font-medium text-lg block md:inline md:ml-2">| Fact Checker</span>
          </h1>
          <p className="mt-2 text-slate-600">
            Paste an article link to perform real-time Live Web RAG fact extraction and cross-verification.
          </p>
        </header>

        {/* Input Form Box */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
          <form onSubmit={handleAnalyze} className="flex flex-col md:flex-row gap-4">
            <input
              type="url"
              required
              placeholder="Enter news article URL (e.g., NDTV, The Hindu...)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800 shadow-inner"
            />
            <button
              type="submit"
              disabled={loading}
              className={`px-6 py-3 rounded-xl font-semibold text-white shadow transition-all ${
                loading 
                  ? 'bg-indigo-400 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
              }`}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </span>
              ) : (
                'Analyze Article'
              )}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-xl border border-red-200">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Results Block Display */}
        <div className="space-y-4">
          {results.length > 0 && (
            <h2 className="text-xl font-bold text-indigo-950 mb-2">
              Extracted Claims & Verdicts
            </h2>
          )}

          {results.map((result, index) => {
            const styles = getVerdictStyles(result.verdict);
            return (
              <div
                key={index}
                className={`p-6 bg-white rounded-xl shadow-sm border border-slate-200 transition-all hover:shadow-md ${styles.card}`}
              >
                <div className="flex justify-between items-start gap-4 mb-3">
                  <h3 className="text-lg font-bold text-slate-800 flex-1">
                    {result.claim_text}
                  </h3>
                  <span className={`px-3 py-1 text-xs font-black tracking-wider rounded-full border ${styles.badge}`}>
                    {result.verdict}
                  </span>
                </div>
                <hr className="border-slate-100 my-2" />
                <p className="text-slate-600 text-sm leading-relaxed mt-2">
                  <strong className="text-slate-700 font-semibold block mb-1">Analysis Detail:</strong>
                  {result.explanation}
                </p>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}