export default function BudgetPage() {
  return (
    <div className="card">
      <header className="page-header">
        <h1 className="page-title">Budget</h1>
        <p className="page-subtitle">
          Here you&apos;ll be able to set your monthly food budget and see how
          much you have left based on your planned meals and ingredients.
        </p>
      </header>
      <section className="page-section">
        <h2 className="page-section-title">Coming soon</h2>
        <p className="page-section-text">
          We&apos;ll connect this page to your UniMeal budget in Firestore and
          show a simple remaining-budget calculation.
        </p>
      </section>
    </div>
  );
}

