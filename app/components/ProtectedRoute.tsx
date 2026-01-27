"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { useAuth } from "../../contexts/AuthContext";

type ProtectedRouteProps = {
  children: ReactNode;
};

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="card">
        <header className="page-header">
          <h1 className="page-title">Checking your session…</h1>
          <p className="page-subtitle">
            We&apos;re making sure you&apos;re signed in before showing your
            dashboard.
          </p>
        </header>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="card">
        <header className="page-header">
          <h1 className="page-title">Sign in to see this page</h1>
          <p className="page-subtitle">
            Your UniMeal dashboard is only available when you&apos;re signed in.
            This keeps your meals, ingredients, and budget private to you.
          </p>
        </header>
        <section className="page-section">
          <h2 className="page-section-title">Next step</h2>
          <p className="page-section-text">
            Go to the login page and sign in with your Google account. We&apos;ll
            bring you right back here afterwards.
          </p>
          <div className="button-row" aria-label="Authentication actions">
            <Link href="/login" className="btn btn-primary">
              Go to login
            </Link>
            <Link href="/" className="btn btn-secondary">
              Back to home
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return <>{children}</>;
}

