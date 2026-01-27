import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "UniMeal | Meal planning for IU students",
  description:
    "UniMeal helps IU students plan meals, track ingredients, and stay on top of their food budget.",
};

const navItems = [
  { label: "Dashboard", href: "/" },
  { label: "Meals", href: "/meals" },
  { label: "Ingredients", href: "/ingredients" },
  { label: "Budget", href: "/budget" },
] as const;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="app-body">
        <div className="app-shell">
          <header className="app-header">
            <div className="app-header-inner">
              <div className="app-logo">
                <span className="app-logo-title">UniMeal</span>
                <span className="app-logo-subtitle">
                  Plan meals • Reduce waste • Stay on budget
                </span>
              </div>
              <nav className="app-nav" aria-label="Primary">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="app-nav-link"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>
          <main className="app-main">
            <div className="app-container">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
