export default function KesselRunLoading() {
  return <div className="kr-loading" aria-busy="true" aria-label="Loading workspace"><p role="status">Opening your writing workspace…</p><div className="kr-skeleton kr-skeleton-heading" /><div className="kr-grid">{[0, 1, 2].map(value => <div key={value} className="kr-skeleton kr-skeleton-card" />)}</div></div>;
}
