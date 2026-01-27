"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "../../contexts/AuthContext";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Meals", href: "/meals" },
  { label: "Ingredients", href: "/ingredients" },
  { label: "Budget", href: "/budget" },
] as const;

export function AppHeader() {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <div className="app-logo">
          <span className="app-logo-title">UniMeal</span>
          <span className="app-logo-subtitle">
            Plan meals • Reduce waste • Stay on budget
          </span>
        </div>
        <nav className="app-nav" aria-label="Primary">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href === "/dashboard" && pathname === "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  "app-nav-link" + (isActive ? " app-nav-link--active" : "")
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.8rem",
          }}
        >
          {loading && <span>Checking session…</span>}
          {!loading && user && (
            <>
              <span
                style={{
                  maxWidth: "11rem",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                  overflow: "hidden",
                }}
                title={user.email ?? undefined}
              >
                Signed in as <strong>{user.email}</strong>
              </span>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleLogout}
              >
                Log out
              </button>
            </>
          )}
          {!loading && !user && (
            <Link href="/login" className="btn btn-primary">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

