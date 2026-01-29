import type { Metadata } from "next";
import "./globals.css";

import { AuthProvider } from "../contexts/AuthContext";
import { ThemeProvider } from "../contexts/ThemeContext";
import { AppHeader } from "./components/AppHeader";

export const metadata: Metadata = {
  title: "UniMeal | Meal planning for IU students",
  description:
    "UniMeal helps IU students plan meals, track ingredients, and stay on top of their food budget.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem("unimeal-theme");document.documentElement.setAttribute("data-theme",t==="dark"?"dark":"light");})();`,
          }}
        />
      </head>
      <body className="app-body">
        <ThemeProvider>
          <AuthProvider>
            <div className="app-shell">
              <AppHeader />
              <main className="app-main">
                <div className="app-container">{children}</div>
              </main>
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
