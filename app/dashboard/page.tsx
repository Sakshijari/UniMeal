"use client";

import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import Link from "next/link";
import { useMemo, useEffect, useState } from "react";

import { ProtectedRoute } from "../components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/src/lib/firebase";

type BudgetDoc = { monthlyLimit: number; updatedAt?: Timestamp };
type IngredientSummary = { id: string; name: string; price: number; expiryDate: string };
type MealSummary = { id: string; name: string; weekday: string };

const WEEKDAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

function isExpiringSoon(expiryDate: string): boolean {
  if (!expiryDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= 3;
}

function formatDate(dateString: string): string {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCurrency(value: number | null): string {
  if (value == null || isNaN(value)) return "–";
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  });
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [monthlyLimit, setMonthlyLimit] = useState<number | null>(null);
  const [limitInput, setLimitInput] = useState("");
  const [isSavingBudget, setIsSavingBudget] = useState(false);
  const [budgetError, setBudgetError] = useState<string | null>(null);

  const [ingredients, setIngredients] = useState<IngredientSummary[]>([]);
  const [meals, setMeals] = useState<MealSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Budget document + ingredients (for spent)
  useEffect(() => {
    if (authLoading || !user?.uid) {
      if (!authLoading) setLoading(false);
      return;
    }
    setLoading(true);
    const budgetRef = doc(db, "users", user.uid, "budget", "current");
    const ingredientsRef = collection(db, "users", user.uid, "ingredients");

    const unsubBudget = onSnapshot(
      budgetRef,
      (snap) => {
        if (!snap.exists()) {
          setMonthlyLimit(null);
          setLimitInput("");
          return;
        }
        const data = snap.data() as BudgetDoc;
        const limit = typeof data.monthlyLimit === "number" ? data.monthlyLimit : 0;
        setMonthlyLimit(limit);
        setLimitInput(limit ? String(limit) : "");
      },
      () => {},
    );

    const unsubIng = onSnapshot(
      ingredientsRef,
      (snap) => {
        const list: IngredientSummary[] = [];
        snap.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            name: data.name ?? "",
            price: typeof data.price === "number" ? data.price : 0,
            expiryDate: data.expiryDate ?? "",
          });
        });
        setIngredients(list);
      },
      () => {},
    );

    return () => {
      unsubBudget();
      unsubIng();
    };
  }, [user?.uid, authLoading]);

  // Meals
  useEffect(() => {
    if (authLoading || !user?.uid) return;
    const mealsRef = collection(db, "users", user.uid, "meals");
    const unsub = onSnapshot(
      mealsRef,
      (snap) => {
        const list: MealSummary[] = [];
        snap.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            name: data.name ?? "",
            weekday: data.weekday ?? "",
          });
        });
        setMeals(list);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, [user?.uid, authLoading]);

  const spent = useMemo(
    () =>
      ingredients.reduce((sum, i) => sum + (typeof i.price === "number" && !isNaN(i.price) ? i.price : 0), 0),
    [ingredients],
  );
  const remaining = monthlyLimit != null ? monthlyLimit - spent : null;
  const expiringSoon = useMemo(
    () => ingredients.filter((i) => isExpiringSoon(i.expiryDate)),
    [ingredients],
  );
  const expiringSoonCount = expiringSoon.length;

  // Upcoming meals: sort by weekday order, take first 5
  const upcomingMeals = useMemo(() => {
    const sorted = [...meals].sort(
      (a, b) => WEEKDAY_ORDER.indexOf(a.weekday) - WEEKDAY_ORDER.indexOf(b.weekday),
    );
    return sorted.slice(0, 5);
  }, [meals]);

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    setBudgetError(null);
    if (!user?.uid) {
      setBudgetError("Sign in to set your budget.");
      return;
    }
    const value = parseFloat(limitInput);
    if (isNaN(value) || value <= 0) {
      setBudgetError("Enter a number greater than 0.");
      return;
    }
    setIsSavingBudget(true);
    try {
      await setDoc(
        doc(db, "users", user.uid, "budget", "current"),
        { monthlyLimit: value, updatedAt: Timestamp.now() },
        { merge: true },
      );
      setMonthlyLimit(value);
    } catch {
      setBudgetError("Could not save. Try again.");
    } finally {
      setIsSavingBudget(false);
    }
  };

  const budgetWarning =
    remaining != null && monthlyLimit != null && monthlyLimit > 0 && remaining <= monthlyLimit * 0.2;

  return (
    <ProtectedRoute>
      <div className="card">
        <header className="page-header">
          <h1 className="page-title">Welcome to your UniMeal dashboard</h1>
          <p className="page-subtitle">
            Your overview for meals, ingredients, and budget. Use the quick actions below or the menu to dive in.
          </p>
        </header>

        <section className="page-grid dashboard-grid" aria-label="Dashboard overview">
          {/* Today's summary – real stats */}
          <div className="page-section dashboard-summary">
            <h2 className="page-section-title">Summary</h2>
            {loading ? (
              <p className="page-section-text">Loading…</p>
            ) : (
              <>
                <div className="dashboard-stats">
                  <div className="dashboard-stat">
                    <span className="dashboard-stat-label">Budget remaining</span>
                    {monthlyLimit == null ? (
                      <span className="dashboard-stat-value dashboard-stat-value--muted">
                        Not set
                      </span>
                    ) : remaining != null && remaining < 0 ? (
                      <span className="dashboard-stat-value dashboard-stat-value--danger">
                        {formatCurrency(-remaining)} over
                      </span>
                    ) : (
                      <span
                        className={
                          budgetWarning
                            ? "dashboard-stat-value dashboard-stat-value--warning"
                            : "dashboard-stat-value"
                        }
                      >
                        {formatCurrency(remaining)}
                      </span>
                    )}
                    <Link href="/budget" className="dashboard-stat-link">
                      View budget →
                    </Link>
                  </div>
                  <div className="dashboard-stat">
                    <span className="dashboard-stat-label">Expiring soon (3 days)</span>
                    <span className="dashboard-stat-value">
                      {expiringSoonCount} {expiringSoonCount === 1 ? "item" : "items"}
                    </span>
                    <Link href="/ingredients" className="dashboard-stat-link">
                      View ingredients →
                    </Link>
                  </div>
                  <div className="dashboard-stat">
                    <span className="dashboard-stat-label">Planned meals</span>
                    <span className="dashboard-stat-value">{meals.length}</span>
                    <Link href="/meals" className="dashboard-stat-link">
                      View meals →
                    </Link>
                  </div>
                </div>
                {(expiringSoon.length > 0 || upcomingMeals.length > 0) && (
                  <div className="dashboard-preview">
                    {expiringSoon.length > 0 && (
                      <div className="dashboard-preview-block">
                        <h3 className="dashboard-preview-title">Expiring soon</h3>
                        <ul className="dashboard-preview-list" aria-label="Ingredients expiring soon">
                          {expiringSoon.slice(0, 4).map((i) => (
                            <li key={i.id}>
                              <Link href="/ingredients" className="dashboard-preview-link">
                                {i.name}
                              </Link>
                              <span className="dashboard-preview-meta">
                                {formatDate(i.expiryDate)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {upcomingMeals.length > 0 && (
                      <div className="dashboard-preview-block">
                        <h3 className="dashboard-preview-title">Upcoming meals</h3>
                        <ul className="dashboard-preview-list" aria-label="Upcoming planned meals">
                          {upcomingMeals.map((m) => (
                            <li key={m.id}>
                              <Link href="/meals" className="dashboard-preview-link">
                                {m.name}
                              </Link>
                              <span className="dashboard-preview-meta">
                                {m.weekday ? m.weekday.charAt(0).toUpperCase() + m.weekday.slice(1) : ""}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Quick actions + quick budget */}
          <div className="page-section">
            <h2 className="page-section-title">Quick actions</h2>
            <p className="page-section-text">
              Add a meal or an ingredient, or set your monthly budget below.
            </p>
            <div className="button-row" aria-label="Quick actions">
              <Link href="/meals" className="btn btn-primary">
                Add a meal
              </Link>
              <Link href="/ingredients" className="btn btn-secondary">
                Add ingredient
              </Link>
            </div>

            <div className="input-group" style={{ marginTop: "1.25rem" }}>
              <label className="input-label" htmlFor="quick-budget">
                Set this month&apos;s budget (€)
              </label>
              <form onSubmit={handleSaveBudget} className="dashboard-budget-form">
                <input
                  id="quick-budget"
                  type="number"
                  min="1"
                  step="1"
                  className="input"
                  placeholder="e.g. 200"
                  aria-describedby="quick-budget-help"
                  value={limitInput}
                  onChange={(e) => setLimitInput(e.target.value)}
                  disabled={isSavingBudget}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSavingBudget || !limitInput.trim()}
                  style={{ marginTop: "0.5rem" }}
                >
                  {isSavingBudget ? "Saving…" : "Save budget"}
                </button>
              </form>
              {budgetError && (
                <p id="quick-budget-error" className="input-helper" style={{ color: "#b91c1c" }}>
                  {budgetError}
                </p>
              )}
              <p id="quick-budget-help" className="input-helper">
                Your budget is used on the Budget page to show spent (from ingredient prices) and
                remaining.
              </p>
            </div>
          </div>
        </section>
      </div>
    </ProtectedRoute>
  );
}
