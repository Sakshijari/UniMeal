export default function DashboardPage() {
  return (
    <div className="card">
      <header className="page-header">
        <h1 className="page-title">Welcome to your UniMeal dashboard</h1>
        <p className="page-subtitle">
          This is your single place to plan meals, keep an eye on what&apos;s in
          your kitchen, and make sure your student budget lasts all month.
        </p>
      </header>
      <section className="page-grid" aria-label="UniMeal overview">
        <div className="page-section">
          <h2 className="page-section-title">Today&apos;s summary</h2>
          <p className="page-section-text">
            In the next steps, this card will show quick stats like remaining
            budget, ingredients expiring soon, and your next planned meals.
          </p>
          <div className="tag-row">
            <span className="tag-pill tag-pill--highlight">
              • Budget overview
            </span>
            <span className="tag-pill">• Expiring ingredients</span>
            <span className="tag-pill">• Upcoming meals</span>
          </div>
        </div>
        <div className="page-section">
          <h2 className="page-section-title">Quick actions</h2>
          <p className="page-section-text">
            These buttons don&apos;t do anything yet. We&apos;ll wire them up to
            forms and Firestore in later steps.
          </p>
          <div className="button-row" aria-label="Planned quick actions">
            <button className="btn btn-primary" type="button">
              Add a meal
            </button>
            <button className="btn btn-secondary" type="button">
              Add ingredient
            </button>
          </div>
          <div className="input-group">
            <label className="input-label" htmlFor="quick-budget">
              Set this month&apos;s budget (preview)
            </label>
            <input
              id="quick-budget"
              type="number"
              className="input"
              placeholder="e.g. 1500"
              aria-describedby="quick-budget-help"
            />
            <p id="quick-budget-help" className="input-helper">
              In the real app, this will save to your UniMeal budget in
              Firestore.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

