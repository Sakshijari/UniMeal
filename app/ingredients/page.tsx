export default function IngredientsPage() {
  return (
    <div className="card">
      <header className="page-header">
        <h1 className="page-title">Ingredients</h1>
        <p className="page-subtitle">
          This page will show your pantry and fridge, highlight items that are
          expiring soon, and help you reduce food waste.
        </p>
      </header>
      <section className="page-section">
        <h2 className="page-section-title">Coming soon</h2>
        <p className="page-section-text">
          We&apos;ll add ingredient CRUD operations, an &quot;expiring soon&quot; indicator,
          and Firestore rules in later steps.
        </p>
      </section>
    </div>
  );
}

