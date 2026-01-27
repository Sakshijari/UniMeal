export default function MealsPage() {
  return (
    <div className="card">
      <header className="page-header">
        <h1 className="page-title">Meals</h1>
        <p className="page-subtitle">
          In the next steps you&apos;ll be able to create, list, and delete
          meals here. For now, this page is just a placeholder so the
          navigation feels complete.
        </p>
      </header>
      <section className="page-section">
        <h2 className="page-section-title">Coming soon</h2>
        <p className="page-section-text">
          We&apos;ll add a meal form, a table of planned meals, and Firestore
          integration after we finish the core layout and authentication.
        </p>
      </section>
    </div>
  );
}

