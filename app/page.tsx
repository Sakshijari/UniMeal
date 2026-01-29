import Link from "next/link";

export default function Home() {
  return (
    <div className="card">
      <header className="page-header">
        <h1 className="page-title">Welcome to UniMeal</h1>
        <p className="page-subtitle">
          Sign in with your IU Google account to start planning meals, tracking
          ingredients, and keeping your food budget under control.
        </p>
      </header>
      <section className="page-section">
        <h2 className="page-section-title">Get started</h2>
        <p className="page-section-text">
          If you already have an account, you can go straight to your dashboard
          after signing in.
        </p>
        <div className="button-row" aria-label="Entry points">
          <Link href="/login" className="btn btn-primary">
            Sign in with Google
          </Link>
          <Link href="/dashboard" className="btn btn-secondary">
            View dashboard
          </Link>
        </div>
      </section>
    </div>
  );
}

