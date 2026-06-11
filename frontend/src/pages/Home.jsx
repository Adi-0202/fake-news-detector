export default function Home() {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
          <line x1="11" y1="8" x2="11" y2="14" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
      </div>
      <div className="empty-title">Ready to verify</div>
      <p className="empty-sub">
        Click <strong style={{ color: 'var(--accent)' }}>New Analysis</strong> in the
        top-right to open the input panel and start a fact-check.
      </p>
    </div>
  );
}
