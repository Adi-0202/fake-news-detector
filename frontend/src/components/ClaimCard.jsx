import SourceBadge from './SourceBadge';

const claimConfig = {
  SUPPORTED:  { accent: '#00C896', border: 'rgba(0,200,150,0.25)', bg: 'rgba(0,200,150,0.04)' },
  REFUTED:    { accent: '#FF5D73', border: 'rgba(255,93,115,0.25)', bg: 'rgba(255,93,115,0.04)' },
  UNVERIFIED: { accent: '#F59E0B', border: 'rgba(245,158,11,0.25)', bg: 'rgba(245,158,11,0.04)' },
};

export default function ClaimCard({ claim }) {
  const cc = claimConfig[claim.verdict] || claimConfig.UNVERIFIED;

  return (
    <div
      className="claim-card"
      style={{ borderColor: cc.border, background: cc.bg }}
    >
      <div
        style={{
          position: 'absolute', top: 0, left: 0,
          width: 2, height: '100%',
          background: cc.accent,
          borderRadius: '2px 0 0 2px',
        }}
      />

      <div className="claim-card-top">
        <div className="claim-text">{claim.claim_text}</div>
        <span
          className="claim-badge"
          style={{ color: cc.accent, borderColor: cc.border }}
        >
          {claim.verdict}
        </span>
      </div>

      <div className="claim-divider" />

      <span className="claim-section-label">Verification report</span>
      <p className="claim-explanation">{claim.explanation}</p>

      {claim.sources?.length > 0 && (
        <div className="sources-row">
          <span className="claim-section-label" style={{ width: '100%', marginBottom: 4 }}>
            Sources
          </span>
          {claim.sources.map((src, i) => (
            <SourceBadge key={i} url={src.url} title={src.title} />
          ))}
        </div>
      )}
    </div>
  );
}
