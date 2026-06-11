const verdictConfig = {
  TRUSTWORTHY: {
    accent: '#00C896',
    bg: 'rgba(0,200,150,0.06)',
    border: 'rgba(0,200,150,0.2)',
  },
  'HIGH RISK': {
    accent: '#FF5D73',
    bg: 'rgba(255,93,115,0.06)',
    border: 'rgba(255,93,115,0.2)',
  },
  UNVERIFIED: {
    accent: '#F59E0B',
    bg: 'rgba(245,158,11,0.06)',
    border: 'rgba(245,158,11,0.2)',
  },
};

export default function OverallScore({ title, verdict, explanation }) {
  const vc = verdictConfig[verdict] || verdictConfig.UNVERIFIED;

  return (
    <div
      className="verdict-block"
      style={{ borderColor: vc.border, background: vc.bg, color: vc.accent }}
    >
      <div
        style={{
          position: 'absolute', top: 0, left: 0,
          width: 3, height: '100%',
          background: vc.accent,
          borderRadius: '2px 0 0 2px',
        }}
      />
      <span className="verdict-eyebrow">Overall verdict · {title}</span>
      <div className="verdict-title">{verdict}</div>
      <div className="verdict-text" style={{ color: vc.accent }}>
        {explanation}
      </div>
    </div>
  );
}
