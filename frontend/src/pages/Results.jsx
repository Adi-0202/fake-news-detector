import OverallScore from '../components/OverallScore';
import ClaimCard from '../components/ClaimCard';

export default function Results({ analysis }) {
  if (!analysis) return null;

  return (
    <>
      <OverallScore
        title={analysis.title}
        verdict={analysis.overall_verdict}
        explanation={analysis.overall_explanation}
      />

      {analysis.claims?.length > 0 && (
        <>
          <div className="claims-hdr">
            <span className="claims-lbl">Claims breakdown</span>
            <span className="claims-cnt">
              {analysis.claims.length} claim{analysis.claims.length !== 1 ? 's' : ''}
            </span>
          </div>
          {analysis.claims.map((claim, i) => (
            <ClaimCard key={i} claim={claim} />
          ))}
        </>
      )}
    </>
  );
}
