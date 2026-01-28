 "use client";

import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";

import { ProtectedRoute } from "../components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/src/lib/firebase";

type BudgetDoc = {
  monthlyLimit: number;
  updatedAt?: Timestamp;
};

type IngredientForBudget = {
  id: string;
  price: number;
};

export default function BudgetPage() {
  const { user, loading: authLoading } = useAuth();
  const [monthlyLimit, setMonthlyLimit] = useState<number | null>(null);
  const [limitInput, setLimitInput] = useState("");
  const [ingredients, setIngredients] = useState<IngredientForBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Compute spent and remaining using memoization
  const spent = useMemo(() => {
    return ingredients.reduce((sum, ing) => {
      const price = typeof ing.price === "number" ? ing.price : 0;
      return sum + (isNaN(price) ? 0 : price);
    }, 0);
  }, [ingredients]);

  const remaining = useMemo(() => {
    if (monthlyLimit == null) return null;
    return monthlyLimit - spent;
  }, [monthlyLimit, spent]);

  const formatCurrency = (value: number | null) => {
    if (value == null || isNaN(value)) return "-";
    return value.toLocaleString(undefined, {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 2,
    });
  };

  // Listen to budget document and ingredients prices
  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user?.uid) {
      setLoading(false);
      setError("You must be signed in to view your budget.");
      return;
    }

    setLoading(true);
    setError(null);

    console.log("[UniMeal] Setting up budget listeners for user:", user.uid);

    const budgetRef = doc(db, "users", user.uid, "budget", "current");
    const ingredientsRef = collection(db, "users", user.uid, "ingredients");

    const unsubscribeBudget = onSnapshot(
      budgetRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setMonthlyLimit(null);
          setLimitInput("");
          return;
        }
        const data = snapshot.data() as BudgetDoc;
        const limit = typeof data.monthlyLimit === "number" ? data.monthlyLimit : 0;
        setMonthlyLimit(limit);
        setLimitInput(limit ? String(limit) : "");
      },
      (err) => {
        console.error("[UniMeal] Budget listener error", err);
        setError(
          "Failed to load your budget. Please check your connection and try again.",
        );
      },
    );

    const unsubscribeIngredients = onSnapshot(
      ingredientsRef,
      (snapshot) => {
        const list: IngredientForBudget[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as { price?: number };
          list.push({
            id: docSnap.id,
            price: typeof data.price === "number" ? data.price : 0,
          });
        });
        setIngredients(list);
        setLoading(false);
      },
      (err) => {
        console.error("[UniMeal] Ingredients (for budget) listener error", err);
        setError(
          "Failed to load ingredient costs. Your budget summary may be incomplete.",
        );
        setLoading(false);
      },
    );

    return () => {
      unsubscribeBudget();
      unsubscribeIngredients();
    };
  }, [user?.uid, authLoading]);

  const handleSaveLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user?.uid) {
      setError("You must be signed in to update your budget.");
      return;
    }

    const value = parseFloat(limitInput);
    if (isNaN(value) || value <= 0) {
      setError("Monthly limit must be a number greater than 0.");
      return;
    }

    setIsSaving(true);
    try {
      const budgetRef = doc(db, "users", user.uid, "budget", "current");
      await setDoc(
        budgetRef,
        {
          monthlyLimit: value,
          updatedAt: Timestamp.now(),
        },
        { merge: true },
      );
      setMonthlyLimit(value);
    } catch (err) {
      console.error("[UniMeal] Save budget error", err);
      setError("Could not save your budget. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const remainingMessage = (() => {
    if (remaining == null || monthlyLimit == null) return null;
    if (remaining < 0) {
      return {
        tone: "danger" as const,
        text: `You are over budget by ${formatCurrency(-remaining)} this month.`,
      };
    }
    if (remaining === 0) {
      return {
        tone: "warning" as const,
        text: "You have exactly used your monthly budget.",
      };
    }
    if (remaining <= monthlyLimit * 0.2) {
      return {
        tone: "warning" as const,
        text: `Your remaining budget is getting low: ${formatCurrency(
          remaining,
        )} left.`,
      };
    }
    return {
      tone: "ok" as const,
      text: `You still have ${formatCurrency(remaining)} left in your budget.`,
    };
  })();

  return (
    <ProtectedRoute>
      <div className="card">
        <header className="page-header">
          <h1 className="page-title">Monthly food budget</h1>
          <p className="page-subtitle">
            Set a monthly limit for your food spending. UniMeal uses your
            ingredient prices to estimate how much you&apos;ve spent and how
            much is left.
          </p>
        </header>

        {error && (
          <div
            className="page-section"
            role="alert"
            style={{
              marginBottom: "1rem",
              padding: "0.75rem 1rem",
              borderRadius: "0.5rem",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              background: "rgba(254, 242, 242, 0.9)",
              color: "#991b1b",
            }}
          >
            <p className="page-section-text" style={{ margin: 0 }}>
              {error}
            </p>
          </div>
        )}

        {remainingMessage && (
          <div
            className="page-section"
            style={{
              marginBottom: "1rem",
              padding: "0.75rem 1rem",
              borderRadius: "0.5rem",
              border:
                remainingMessage.tone === "danger"
                  ? "1px solid rgba(239, 68, 68, 0.5)"
                  : remainingMessage.tone === "warning"
                    ? "1px solid rgba(234, 179, 8, 0.5)"
                    : "1px solid rgba(34, 197, 94, 0.5)",
              background:
                remainingMessage.tone === "danger"
                  ? "rgba(254, 242, 242, 0.9)"
                  : remainingMessage.tone === "warning"
                    ? "rgba(254, 252, 232, 0.9)"
                    : "rgba(240, 253, 244, 0.9)",
              color:
                remainingMessage.tone === "danger"
                  ? "#991b1b"
                  : remainingMessage.tone === "warning"
                    ? "#854d0e"
                    : "#166534",
            }}
          >
            <p className="page-section-text" style={{ margin: 0 }}>
              {remainingMessage.text}
            </p>
          </div>
        )}

        <section className="page-section" style={{ marginBottom: "1.5rem" }}>
          <h2 className="page-section-title">Set your monthly limit</h2>
          <form onSubmit={handleSaveLimit}>
            <div className="input-group">
              <label className="input-label" htmlFor="monthly-limit">
                Monthly food budget (in your currency)
              </label>
              <input
                id="monthly-limit"
                type="number"
                className="input"
                placeholder="e.g. 150.00"
                value={limitInput}
                onChange={(e) => setLimitInput(e.target.value)}
                disabled={isSaving || loading}
                min="0.01"
                step="0.01"
              />
              <p className="input-helper">
                This is the total amount you want to spend on food this month.
              </p>
            </div>

            <div className="button-row">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSaving || !limitInput.trim()}
              >
                {isSaving ? "Saving…" : "Save budget"}
              </button>
            </div>
          </form>
        </section>

        <section className="page-section">
          <h2 className="page-section-title">Summary</h2>
          {loading ? (
            <p className="page-section-text">
              Calculating your budget summary…
            </p>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: "1rem",
              }}
            >
              <div
                style={{
                  padding: "0.9rem 0.85rem",
                  borderRadius: "0.75rem",
                  border: "1px solid rgba(148, 163, 184, 0.4)",
                  background: "rgba(255, 255, 255, 0.9)",
                }}
              >
                <div
                  style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}
                >
                  Monthly limit
                </div>
                <div
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 650,
                    marginTop: "0.25rem",
                  }}
                >
                  {formatCurrency(monthlyLimit)}
                </div>
              </div>

              <div
                style={{
                  padding: "0.9rem 0.85rem",
                  borderRadius: "0.75rem",
                  border: "1px solid rgba(148, 163, 184, 0.4)",
                  background: "rgba(255, 255, 255, 0.9)",
                }}
              >
                <div
                  style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}
                >
                  Estimated spent (from ingredients)
                </div>
                <div
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 650,
                    marginTop: "0.25rem",
                  }}
                >
                  {formatCurrency(spent)}
                </div>
              </div>

              <div
                style={{
                  padding: "0.9rem 0.85rem",
                  borderRadius: "0.75rem",
                  border: "1px solid rgba(148, 163, 184, 0.4)",
                  background: "rgba(255, 255, 255, 0.9)",
                }}
              >
                <div
                  style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}
                >
                  Remaining
                </div>
                <div
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 650,
                    marginTop: "0.25rem",
                    color:
                      remaining != null && remaining < 0
                        ? "#b91c1c"
                        : "var(--color-text)",
                  }}
                >
                  {formatCurrency(remaining ?? null)}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </ProtectedRoute>
  );
}

