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

import { OnboardingOverlay } from "../components/OnboardingOverlay";
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

/** Keyword (in ingredient name) → dish suggestions for "Use it up". */
const USE_IT_UP_SUGGESTIONS: Record<string, string[]> = {
  milk: ["French toast", "Oatmeal", "Hot chocolate", "Smoothie"],
  bread: ["Grilled cheese", "French toast", "Toast", "Croutons"],
  tomato: ["Pasta sauce", "Bruschetta", "Salad", "Soup"],
  tomatoes: ["Pasta sauce", "Bruschetta", "Salad", "Soup"],
  chicken: ["Stir-fry", "Soup", "Sandwich", "Salad"],
  egg: ["Scrambled eggs", "Omelette", "French toast"],
  eggs: ["Scrambled eggs", "Omelette", "French toast"],
  cheese: ["Grilled cheese", "Pasta", "Omelette", "Toast"],
  potato: ["Mash", "Soup", "Roast", "Hash"],
  potatoes: ["Mash", "Soup", "Roast", "Hash"],
  onion: ["Stir-fry", "Soup", "Omelette", "Pasta"],
  onions: ["Stir-fry", "Soup", "Omelette", "Pasta"],
  rice: ["Stir-fry", "Rice bowl", "Soup", "Pudding"],
  pasta: ["Pasta sauce", "Carbonara", "Salad"],
  spinach: ["Salad", "Omelette", "Soup", "Pasta"],
  mushroom: ["Stir-fry", "Soup", "Omelette", "Pasta"],
  mushrooms: ["Stir-fry", "Soup", "Omelette", "Pasta"],
  carrot: ["Soup", "Stir-fry", "Salad", "Roast"],
  carrots: ["Soup", "Stir-fry", "Salad", "Roast"],
  banana: ["Smoothie", "Oatmeal", "Pancakes"],
  bananas: ["Smoothie", "Oatmeal", "Pancakes"],
  lemon: ["Lemonade", "Fish", "Salad", "Tea"],
  lemons: ["Lemonade", "Fish", "Salad", "Tea"],
  yogurt: ["Smoothie", "Oatmeal", "Parfait"],
  yoghurt: ["Smoothie", "Oatmeal", "Parfait"],
  lentils: ["Soup", "Curry", "Salad"],
  beans: ["Soup", "Salad", "Chilli", "Pasta"],
  bacon: ["Carbonara", "Omelette", "Sandwich", "Salad"],
  fish: ["Fish and vegetables", "Soup", "Tacos"],
  mince: ["Bolognese", "Chilli", "Tacos"],
  minced: ["Bolognese", "Chilli", "Tacos"],
  beef: ["Stir-fry", "Soup", "Sandwich"],
  pork: ["Stir-fry", "Roast", "Sandwich"],
  lettuce: ["Salad", "Sandwich", "Wrap"],
  cucumber: ["Salad", "Sandwich", "Tzatziki"],
  pepper: ["Stir-fry", "Salad", "Roast", "Omelette"],
  peppers: ["Stir-fry", "Salad", "Roast", "Omelette"],
  broccoli: ["Stir-fry", "Soup", "Roast", "Pasta"],
  cauliflower: ["Soup", "Roast", "Curry"],
  zucchini: ["Stir-fry", "Pasta", "Roast"],
  courgette: ["Stir-fry", "Pasta", "Roast"],
  avocado: ["Toast", "Salad", "Guacamole"],
  olive: ["Pasta", "Salad", "Pizza"],
  olives: ["Pasta", "Salad", "Pizza"],
};

function getUseItUpSuggestions(ingredientNames: string[]): string[] {
  const seen = new Set<string>();
  const suggestions: string[] = [];
  for (const name of ingredientNames) {
    const lower = name.toLowerCase().trim();
    if (!lower) continue;
    for (const [keyword, dishes] of Object.entries(USE_IT_UP_SUGGESTIONS)) {
      if (lower.includes(keyword)) {
        for (const dish of dishes) {
          if (!seen.has(dish)) {
            seen.add(dish);
            suggestions.push(dish);
          }
        }
      }
    }
  }
  return suggestions.slice(0, 5);
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

  const useItUpSuggestions = useMemo(
    () => getUseItUpSuggestions(expiringSoon.map((i) => i.name)),
    [expiringSoon],
  );

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
      {user?.uid && (
        <OnboardingOverlay
          userId={user.uid}
          hasBudget={monthlyLimit != null}
          hasMeals={meals.length > 0}
          hasIngredients={ingredients.length > 0}
        />
      )}
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
                    {expiringSoon.length > 0 && useItUpSuggestions.length > 0 && (
                      <div className="dashboard-use-it-up" role="region" aria-label="Use it up suggestions">
                        <h3 className="dashboard-use-it-up-title">Use it up</h3>
                        <p className="dashboard-use-it-up-text">
                          You have ingredients expiring soon. Try using them in:
                        </p>
                        <ul className="dashboard-use-it-up-list" aria-label="Dish suggestions">
                          {useItUpSuggestions.map((dish) => (
                            <li key={dish} className="dashboard-use-it-up-item">
                              {dish}
                            </li>
                          ))}
                        </ul>
                        <Link href="/meals" className="dashboard-use-it-up-link">
                          Plan a meal →
                        </Link>
                      </div>
                    )}
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
