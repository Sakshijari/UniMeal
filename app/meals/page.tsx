"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { useEffect, useState } from "react";

import { ProtectedRoute } from "../components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/src/lib/firebase";

type Meal = {
  id: string;
  name: string;
  weekday: string;
  createdAt: Timestamp;
};

const WEEKDAYS = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
] as const;

export default function MealsPage() {
  const { user, loading: authLoading } = useAuth();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formWeekday, setFormWeekday] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  // Realtime listener for meals
  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return;
    }

    // If no user after auth loads, stop
    if (!user?.uid) {
      setLoading(false);
      setError("You must be signed in to view meals.");
      return;
    }

    setLoading(true);
    setError(null);
    
    // Debug: Log the user ID to verify authentication
    console.log("[UniMeal] Setting up meals listener for user:", user.uid);
    console.log("[UniMeal] User email:", user.email);
    
    try {
      const mealsRef = collection(db, "users", user.uid, "meals");
      // Query without orderBy to avoid index requirement - we'll sort in JavaScript
      const q = query(mealsRef);

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          console.log("[UniMeal] Meals snapshot received, size:", snapshot.size);
          const mealsData: Meal[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            mealsData.push({
              id: doc.id,
              name: data.name,
              weekday: data.weekday,
              createdAt: data.createdAt || { seconds: 0, nanoseconds: 0 },
            } as Meal);
          });
          
          // Sort by createdAt in JavaScript (most recent first)
          mealsData.sort((a, b) => {
            const aTime = a.createdAt?.seconds || 0;
            const bTime = b.createdAt?.seconds || 0;
            return bTime - aTime; // Descending order
          });
          
          setMeals(mealsData);
          setLoading(false);
          setError(null);
        },
        (err: unknown) => {
          console.error("[UniMeal] Meals listener error", err);
          console.error("[UniMeal] Error details:", {
            code: (err as any)?.code,
            message: (err as any)?.message,
            userUid: user?.uid,
            userEmail: user?.email,
          });
          
          // Check for specific error types
          const errorMessage =
            err instanceof Error
              ? err.message
              : String(err);
          const errorCode = (err as any)?.code || "";
          
          // Provide helpful error messages
          if (
            errorCode === "permission-denied" ||
            errorMessage.includes("permission") ||
            errorMessage.includes("Missing or insufficient permissions")
          ) {
            setError(
              "Permission denied. Steps to fix:\n1. Go to Firebase Console → Firestore → Rules\n2. Copy the rules from firestore.rules file\n3. Click Publish\n4. Wait 30 seconds and refresh this page"
            );
          } else if (
            errorCode === "unavailable" ||
            errorMessage.includes("unavailable")
          ) {
            setError("Firestore is temporarily unavailable. Please try again in a moment.");
          } else {
            setError(
              `Failed to load meals. Error: ${errorMessage}. Check browser console (F12) for details.`
            );
          }
          
          setLoading(false);
        },
      );

      return () => unsubscribe();
    } catch (setupError) {
      console.error("[UniMeal] Error setting up meals listener:", setupError);
      setError("Failed to set up meals listener. Please refresh the page.");
      setLoading(false);
    }
  }, [user?.uid, authLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formName.trim()) {
      setError("Meal name is required.");
      return;
    }
    if (!formWeekday) {
      setError("Please select a weekday.");
      return;
    }
    if (!user?.uid) {
      setError("You must be signed in to add meals.");
      return;
    }

    setIsSubmitting(true);
    try {
      const mealsRef = collection(db, "users", user.uid, "meals");
      await addDoc(mealsRef, {
        name: formName.trim(),
        weekday: formWeekday,
        createdAt: serverTimestamp(),
      });

      // Reset form
      setFormName("");
      setFormWeekday("");
      setError(null);
    } catch (err) {
      console.error("[UniMeal] Add meal error", err);
      setError("Could not add meal. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (mealId: string) => {
    if (!user?.uid) {
      setError("You must be signed in to delete meals.");
      return;
    }

    if (!confirm("Are you sure you want to delete this meal?")) {
      return;
    }

    setDeleteLoading(mealId);
    setError(null);
    try {
      const mealRef = doc(db, "users", user.uid, "meals", mealId);
      await deleteDoc(mealRef);
    } catch (err) {
      console.error("[UniMeal] Delete meal error", err);
      setError("Could not delete meal. Please try again.");
    } finally {
      setDeleteLoading(null);
    }
  };

  const getWeekdayLabel = (value: string) => {
    return WEEKDAYS.find((w) => w.value === value)?.label || value;
  };

  return (
    <ProtectedRoute>
      <div className="card">
        <header className="page-header">
          <h1 className="page-title">Meals</h1>
          <p className="page-subtitle">
            Plan your meals for the week. Add meals by name and weekday, then
            delete them when you&apos;re done.
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

        <section className="page-section" style={{ marginBottom: "1.5rem" }}>
          <h2 className="page-section-title">Add a meal</h2>
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="input-label" htmlFor="meal-name">
                Meal name
              </label>
              <input
                id="meal-name"
                type="text"
                className="input"
                placeholder="e.g. Pasta Carbonara"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                disabled={isSubmitting}
                maxLength={100}
              />
              <p className="input-helper">
                Enter the name of the meal you want to plan.
              </p>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="meal-weekday">
                Weekday
              </label>
              <select
                id="meal-weekday"
                className="input"
                value={formWeekday}
                onChange={(e) => setFormWeekday(e.target.value)}
                disabled={isSubmitting}
              >
                <option value="">Select a day</option>
                {WEEKDAYS.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
              <p className="input-helper">
                Choose which day of the week you&apos;ll have this meal.
              </p>
            </div>

            <div className="button-row">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting || !formName.trim() || !formWeekday}
              >
                {isSubmitting ? "Adding…" : "Add meal"}
              </button>
            </div>
          </form>
        </section>

        <section className="page-section">
          <h2 className="page-section-title">
            Your planned meals ({meals.length})
          </h2>
          {loading ? (
            <p className="page-section-text">Loading your meals…</p>
          ) : meals.length === 0 ? (
            <p className="page-section-text">
              You haven&apos;t added any meals yet. Use the form above to get
              started!
            </p>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
                marginTop: "0.75rem",
              }}
            >
              {meals.map((meal) => (
                <div
                  key={meal.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.75rem 1rem",
                    borderRadius: "0.5rem",
                    background: "rgba(255, 255, 255, 0.7)",
                    border: "1px solid rgba(148, 163, 184, 0.3)",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: "0.95rem",
                        fontWeight: 600,
                        marginBottom: "0.2rem",
                      }}
                    >
                      {meal.name}
                    </div>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--color-text-muted)",
                      }}
                    >
                      {getWeekdayLabel(meal.weekday)}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleDelete(meal.id)}
                    disabled={deleteLoading === meal.id}
                    style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem" }}
                  >
                    {deleteLoading === meal.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </ProtectedRoute>
  );
}
