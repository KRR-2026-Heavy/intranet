export default function PhaseTwoPreview() {
  return (
    <main className="phase-preview">
      <section className="phase-preview__panel phase-preview__panel--white">
        <img
          className="brand-logo"
          src="/images/KRR new logo.avif"
          alt="KRR Engineering Private Limited"
        />
        <p className="eyebrow">Corporate Intranet</p>
        <h1>Welcome to KRR Engineering</h1>
        <p>Connecting People, Departments and Progress.</p>
      </section>
      <section className="phase-preview__panel phase-preview__panel--grey">
        <p className="eyebrow">Phase 2</p>
        <h2>Frontend foundation ready</h2>
        <div className="phase-preview__tokens" aria-label="Corporate color palette">
          <span className="token token--white">#FFFFFF</span>
          <span className="token token--grey">#F2F2F2</span>
          <span className="token token--red">#AF2324</span>
          <span className="token token--dark-grey">#808080</span>
        </div>
      </section>
    </main>
  )
}
