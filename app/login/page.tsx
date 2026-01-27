"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, error, loginWithGoogle } = useAuth();

  // If the user is already signed in, send them to the dashboard.
  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  const handleSignIn = async () => {
    await loginWithGoogle();
    // The auth listener will trigger and the effect above will redirect.
  };

  const isBusy = loading;

  return (
    <div className="card" aria-busy={isBusy}>
      <header className="page-header">
        <h1 className="page-title">Sign in to UniMeal</h1>
        <p className="page-subtitle">
          Use your Google account to sync your meals, ingredients, and budget
          across devices.
        </p>
      </header>

      {isBusy && (
        <p className="page-section-text" style={{ marginBottom: "0.75rem" }}>
          Checking your session…
        </p>
      )}

      {error && (
        <p
          className="page-section-text"
          role="alert"
          style={{
            marginBottom: "0.75rem",
            padding: "0.5rem 0.75rem",
            borderRadius: "0.5rem",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            background: "rgba(254, 242, 242, 0.9)",
            color: "#991b1b",
            fontSize: "0.85rem",
          }}
        >
          {error}
        </p>
      )}

      {!user && (
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSignIn}
          disabled={isBusy}
        >
          {isBusy ? "Signing you in…" : "Continue with Google"}
        </button>
      )}

      {user && (
        <p className="page-section-text" style={{ marginTop: "0.75rem" }}>
          You are already signed in as <strong>{user.email}</strong>. Redirecting
          you to your dashboard…
        </p>
      )}
    </div>
  );
}

