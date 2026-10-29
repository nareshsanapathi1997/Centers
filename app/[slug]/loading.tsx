/** Instant shell while center sub-pages stream in. */
export default function CenterSlugLoading() {
  return (
    <div className="page-wrapper loaded" aria-busy="true" aria-label="Loading page">
      <div
        className="placeholder-glow"
        style={{ minHeight: '72vh', padding: '2rem 0' }}
      >
        <div className="container">
          <span
            className="placeholder col-12 mb-4 d-block rounded-3"
            style={{ height: 220 }}
          />
          <span className="placeholder col-8 mb-3 d-block rounded" style={{ height: 28 }} />
          <span className="placeholder col-10 mb-4 d-block rounded" style={{ height: 18 }} />
          <div className="row g-3">
            <span className="placeholder col-md-4 d-block rounded-3" style={{ height: 160 }} />
            <span className="placeholder col-md-4 d-block rounded-3" style={{ height: 160 }} />
            <span className="placeholder col-md-4 d-block rounded-3" style={{ height: 160 }} />
          </div>
        </div>
      </div>
    </div>
  )
}
