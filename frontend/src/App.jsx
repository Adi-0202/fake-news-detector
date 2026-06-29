import { useState, useEffect } from 'react';
import UrlInputForm from './components/UrlInputForm';
import Home from './pages/Home';
import Results from './pages/Results';
import Auth from './pages/Auth'; // 1. Import your new Auth gateway view
import './index.css';
import { API_BASE_URL } from './config';

export default function App() {
  // Read token from storage on startup
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [history, setHistory] = useState([]);

  // Load isolated history from backend when token is verified
  useEffect(() => {
    if (!token) return;

    fetch(`${API_BASE_URL}/history`, {
      headers: { 'Authorization': `Bearer ${token}` } // 2. Attach secure token
    })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setHistory(data.slice().reverse()); })
      .catch(() => {});
  }, [token]);

  const handleResult = (result) => {
    setAnalysis(result);
    setHistory(prev => [result, ...prev]);
    setRightOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setHistory([]);
    setAnalysis(null);
    setRightOpen(false);
  };

  const badgeClass = (verdict) =>
    verdict === 'TRUSTWORTHY' ? 'ht' : verdict === 'HIGH RISK' ? 'hr' : 'hu';

  const srcLabel = (url) =>
    url === 'Raw Text Entry' ? '◈ Raw text'
    : url?.startsWith('PDF:') ? '◈ ' + url
    : url?.startsWith('Image:') ? '◈ ' + url
    : url;

  // 3. SECURE GATE BARRIER: Render login card if no session token exists
  if (!token) {
    return <Auth onLoginSuccess={(newToken) => setToken(newToken)} />;
  }

  return (
    <div className="layout" style={{ cursor: 'default' }}>
      {/* ── LEFT SIDEBAR ── */}
      <aside className={`left-sidebar${leftOpen ? '' : ' collapsed'}`}>
        <div className="ls-head">
          <div className="ls-logo">N</div>
          <div className="ls-brand">NeuralSieve <span>/ Logs</span></div>
          <button className="ls-close" onClick={() => setLeftOpen(false)} title="Close sidebar">
            <CloseIcon />
          </button>
        </div>
        <div className="ls-label">Recent verifications</div>
        <div className="ls-scroll">
          {history.length === 0 ? (
            <p className="ls-empty">
              No scans yet. Hit <strong style={{ color: 'var(--accent)' }}>New Analysis</strong> to begin.
            </p>
          ) : (
            history.map(item => (
              <button
                key={item.id}
                className="hist-card"
                onClick={() => setAnalysis(item)}
              >
                <div className="hist-top">
                  <span className={`hbadge ${badgeClass(item.overall_verdict)}`}>
                    {item.overall_verdict}
                  </span>
                  <span className="htime">
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="htitle">{item.title}</div>
                <div className="hurl">{srcLabel(item.url)}</div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className={`content-wrap${rightOpen ? ' shifted' : ''}`}>
        {/* Topbar */}
        <div className="topbar">
          <div className="tb-left">
            <button className="menu-btn" onClick={() => setLeftOpen(o => !o)} title="Toggle history">
              <MenuIcon />
            </button>
            <div className="tb-logo">N</div>
            <div className="tb-brand">NeuralSieve <span>Cascade</span></div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className={`new-btn${rightOpen ? ' active' : ''}`}
              onClick={() => setRightOpen(o => !o)}
            >
              <PlusIcon /> New Analysis
            </button>
            {/* 4. Sleek Minimal Logout Trigger Button */}
            <button className="logout-btn" onClick={handleLogout} title="Revoke session credentials">
              Logout
            </button>
          </div>
        </div>

        {/* Page content */}
        <div className="content-scroll">
          <div className="inner">
            <div className="live-badge">
              <span className="live-dot" /> Live RAG engine active
            </div>
            <h1>Neural Sieve <em>Cascade</em></h1>
            <p className="page-sub">
              Deconstruct complex payloads into structured claims and cross-examine them
              against live search intelligence.
            </p>

            {analysis ? <Results analysis={analysis} /> : <Home />}
          </div>
        </div>
      </div>

      {/* ── RIGHT DRAWER ── */}
      <div className={`right-drawer${rightOpen ? ' open' : ''}`}>
        <div className="rd-head">
          <div className="rd-title">New Analysis</div>
          <button className="rd-close" onClick={() => setRightOpen(false)} title="Close panel">
            <CloseIcon />
          </button>
        </div>
        <div className="rd-scroll">
          {/* 5. Pass down the active verification token payload to your URL entry forms */}
          <UrlInputForm onResult={handleResult} token={token} />
        </div>
      </div>
    </div>
  );
}

/* ── Inline icons ── */
function CloseIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function MenuIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}