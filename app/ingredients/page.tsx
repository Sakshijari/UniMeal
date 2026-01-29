"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";

import { ProtectedRoute } from "../components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/src/lib/firebase";

type Ingredient = {
  id: string;
  name: string;
  qty: number;
  unit: string;
  price: number;
  expiryDate: string; // YYYY-MM-DD format
  createdAt: Timestamp;
};

const UNITS = [
  { value: "kg", label: "kg" },
  { value: "g", label: "g" },
  { value: "L", label: "L" },
  { value: "mL", label: "mL" },
  { value: "pieces", label: "pieces" },
  { value: "pack", label: "pack" },
] as const;

export default function IngredientsPage() {
  const { user, loading: authLoading } = useAuth();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formQty, setFormQty] = useState("");
  const [formUnit, setFormUnit] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formExpiryDate, setFormExpiryDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expiringSoonOnly, setExpiringSoonOnly] = useState(false);

  // Check if ingredient is expiring soon (within 3 days)
  const isExpiringSoon = (expiryDate: string): boolean => {
    if (!expiryDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 3;
  };

  // Format date for display
  const formatDate = (dateString: string): string => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Get today's date in YYYY-MM-DD format for min date
  const getTodayDate = (): string => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  // Realtime listener for ingredients
  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return;
    }

    // If no user after auth loads, stop
    if (!user?.uid) {
      setLoading(false);
      setError("You must be signed in to view ingredients.");
      return;
    }

    setLoading(true);
    setError(null);

    console.log("[UniMeal] Setting up ingredients listener for user:", user.uid);

    try {
      const ingredientsRef = collection(db, "users", user.uid, "ingredients");
      const q = query(ingredientsRef);

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          console.log(
            "[UniMeal] Ingredients snapshot received, size:",
            snapshot.size,
          );
          const ingredientsData: Ingredient[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            ingredientsData.push({
              id: doc.id,
              name: data.name || "",
              qty: data.qty || 0,
              unit: data.unit || "",
              price: data.price || 0,
              expiryDate: data.expiryDate || "",
              createdAt: data.createdAt || { seconds: 0, nanoseconds: 0 },
            } as Ingredient);
          });

          // Sort by expiry date (soonest first), then by name
          ingredientsData.sort((a, b) => {
            if (a.expiryDate && b.expiryDate) {
              return a.expiryDate.localeCompare(b.expiryDate);
            }
            if (a.expiryDate) return -1;
            if (b.expiryDate) return 1;
            return a.name.localeCompare(b.name);
          });

          setIngredients(ingredientsData);
          setLoading(false);
          setError(null);
        },
        (err: unknown) => {
          console.error("[UniMeal] Ingredients listener error", err);
          console.error("[UniMeal] Error details:", {
            code: (err as any)?.code,
            message: (err as any)?.message,
            userUid: user?.uid,
          });

          const errorMessage =
            err instanceof Error ? err.message : String(err);
          const errorCode = (err as any)?.code || "";

          if (
            errorCode === "permission-denied" ||
            errorMessage.includes("permission") ||
            errorMessage.includes("Missing or insufficient permissions")
          ) {
            setError(
              "Permission denied. Make sure Firestore rules allow access to users/{uid}/ingredients and are published.",
            );
          } else if (
            errorCode === "unavailable" ||
            errorMessage.includes("unavailable")
          ) {
            setError(
              "Firestore is temporarily unavailable. Please try again in a moment.",
            );
          } else {
            setError(
              `Failed to load ingredients. Error: ${errorMessage}. Check browser console (F12) for details.`,
            );
          }

          setLoading(false);
        },
      );

      return () => unsubscribe();
    } catch (setupError) {
      console.error(
        "[UniMeal] Error setting up ingredients listener:",
        setupError,
      );
      setError("Failed to set up ingredients listener. Please refresh the page.");
      setLoading(false);
    }
  }, [user?.uid, authLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formName.trim()) {
      setError("Ingredient name is required.");
      return;
    }
    if (!formQty || parseFloat(formQty) <= 0) {
      setError("Quantity must be greater than 0.");
      return;
    }
    if (!formUnit) {
      setError("Please select a unit.");
      return;
    }
    if (!formPrice || parseFloat(formPrice) < 0) {
      setError("Price must be 0 or greater.");
      return;
    }
    if (!formExpiryDate) {
      setError("Expiry date is required.");
      return;
    }
    if (!user?.uid) {
      setError("You must be signed in to add ingredients.");
      return;
    }

    setIsSubmitting(true);
    try {
      const ingredientsRef = collection(
        db,
        "users",
        user.uid,
        "ingredients",
      );
      await addDoc(ingredientsRef, {
        name: formName.trim(),
        qty: parseFloat(formQty),
        unit: formUnit,
        price: parseFloat(formPrice),
        expiryDate: formExpiryDate,
        createdAt: serverTimestamp(),
      });

      // Reset form
      setFormName("");
      setFormQty("");
      setFormUnit("");
      setFormPrice("");
      setFormExpiryDate("");
      setError(null);
    } catch (err) {
      console.error("[UniMeal] Add ingredient error", err);
      setError("Could not add ingredient. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (ingredientId: string) => {
    if (!user?.uid) {
      setError("You must be signed in to delete ingredients.");
      return;
    }

    if (!confirm("Are you sure you want to delete this ingredient?")) {
      return;
    }

    setDeleteLoading(ingredientId);
    setError(null);
    try {
      const ingredientRef = doc(
        db,
        "users",
        user.uid,
        "ingredients",
        ingredientId,
      );
      await deleteDoc(ingredientRef);
    } catch (err) {
      console.error("[UniMeal] Delete ingredient error", err);
      setError("Could not delete ingredient. Please try again.");
    } finally {
      setDeleteLoading(null);
    }
  };

  const expiringSoonCount = ingredients.filter((ing) =>
    isExpiringSoon(ing.expiryDate),
  ).length;

  // Filter ingredients by search (name) and optional "expiring soon only"
  const filteredIngredients = useMemo(() => {
    let list = ingredients;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((ing) => ing.name.toLowerCase().includes(q));
    }
    if (expiringSoonOnly) {
      list = list.filter((ing) => isExpiringSoon(ing.expiryDate));
    }
    return list;
  }, [ingredients, searchQuery, expiringSoonOnly]);

  return (
    <ProtectedRoute>
      <div className="card">
        <header className="page-header">
          <h1 className="page-title">Ingredients</h1>
          <p className="page-subtitle">
            Track your pantry and fridge items. Items expiring within 3 days
            are highlighted to help reduce food waste.
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

        {expiringSoonCount > 0 && (
          <div
            className="page-section"
            style={{
              marginBottom: "1rem",
              padding: "0.75rem 1rem",
              borderRadius: "0.5rem",
              border: "1px solid rgba(234, 179, 8, 0.4)",
              background: "rgba(254, 252, 232, 0.9)",
              color: "#854d0e",
            }}
          >
            <p className="page-section-text" style={{ margin: 0, fontWeight: 600 }}>
              ⚠️ {expiringSoonCount} ingredient{expiringSoonCount !== 1 ? "s" : ""} expiring soon
            </p>
          </div>
        )}

        <section className="page-section" style={{ marginBottom: "1.5rem" }}>
          <h2 className="page-section-title">Add an ingredient</h2>
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="input-label" htmlFor="ingredient-name">
                Ingredient name <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                id="ingredient-name"
                type="text"
                className="input"
                placeholder="e.g. Milk"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                disabled={isSubmitting}
                maxLength={100}
                required
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem",
              }}
            >
              <div className="input-group">
                <label className="input-label" htmlFor="ingredient-qty">
                  Quantity <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  id="ingredient-qty"
                  type="number"
                  className="input"
                  placeholder="e.g. 2"
                  value={formQty}
                  onChange={(e) => setFormQty(e.target.value)}
                  disabled={isSubmitting}
                  min="0.01"
                  step="0.01"
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="ingredient-unit">
                  Unit <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  id="ingredient-unit"
                  className="input"
                  value={formUnit}
                  onChange={(e) => setFormUnit(e.target.value)}
                  disabled={isSubmitting}
                  required
                >
                  <option value="">Select unit</option>
                  {UNITS.map((unit) => (
                    <option key={unit.value} value={unit.value}>
                      {unit.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="ingredient-price">
                Price (optional)
              </label>
              <input
                id="ingredient-price"
                type="number"
                className="input"
                placeholder="e.g. 5.99"
                value={formPrice}
                onChange={(e) => setFormPrice(e.target.value)}
                disabled={isSubmitting}
                min="0"
                step="0.01"
              />
              <p className="input-helper">
                Enter the price you paid for this ingredient.
              </p>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="ingredient-expiry">
                Expiry date <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                id="ingredient-expiry"
                type="date"
                className="input"
                value={formExpiryDate}
                onChange={(e) => setFormExpiryDate(e.target.value)}
                disabled={isSubmitting}
                min={getTodayDate()}
                required
              />
              <p className="input-helper">
                When does this ingredient expire? Items expiring within 3 days
                will be highlighted.
              </p>
            </div>

            <div className="button-row">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={
                  isSubmitting ||
                  !formName.trim() ||
                  !formQty ||
                  !formUnit ||
                  !formExpiryDate
                }
              >
                {isSubmitting ? "Adding…" : "Add ingredient"}
              </button>
            </div>
          </form>
        </section>

        <section className="page-section">
          <div className="ingredients-list-header">
            <h2 className="page-section-title">
              Your ingredients ({filteredIngredients.length}
              {ingredients.length !== filteredIngredients.length
                ? ` of ${ingredients.length}`
                : ""}
              )
            </h2>
            <div className="ingredients-filters">
              <label htmlFor="ingredients-search" className="visually-hidden">
                Search ingredients by name
              </label>
              <input
                id="ingredients-search"
                type="search"
                className="input ingredients-search-input"
                placeholder="Search by name…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search ingredients by name"
              />
              <label className="ingredients-expiring-toggle">
                <input
                  type="checkbox"
                  checked={expiringSoonOnly}
                  onChange={(e) => setExpiringSoonOnly(e.target.checked)}
                  aria-describedby="ingredients-expiring-desc"
                />
                <span id="ingredients-expiring-desc">Expiring soon only</span>
              </label>
            </div>
          </div>
          {loading ? (
            <p className="page-section-text">Loading your ingredients…</p>
          ) : ingredients.length === 0 ? (
            <p className="page-section-text">
              You haven&apos;t added any ingredients yet. Use the form above to
              get started!
            </p>
          ) : filteredIngredients.length === 0 ? (
            <p className="page-section-text">
              No ingredients match your search or filter. Try clearing the
              search or &quot;Expiring soon only&quot;.
            </p>
          ) : (
            <div style={{ overflowX: "auto", marginTop: "0.75rem" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.9rem",
                }}
                aria-label="Ingredients list"
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: "2px solid rgba(148, 163, 184, 0.3)",
                    }}
                  >
                    <th
                      style={{
                        textAlign: "left",
                        padding: "0.75rem 0.5rem",
                        fontWeight: 600,
                      }}
                    >
                      Name
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "0.75rem 0.5rem",
                        fontWeight: 600,
                      }}
                    >
                      Quantity
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "0.75rem 0.5rem",
                        fontWeight: 600,
                      }}
                    >
                      Price
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "0.75rem 0.5rem",
                        fontWeight: 600,
                      }}
                    >
                      Expiry Date
                    </th>
                    <th
                      style={{
                        textAlign: "center",
                        padding: "0.75rem 0.5rem",
                        fontWeight: 600,
                      }}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIngredients.map((ingredient) => {
                    const expiringSoon = isExpiringSoon(ingredient.expiryDate);
                    return (
                      <tr
                        key={ingredient.id}
                        style={{
                          borderBottom: "1px solid rgba(148, 163, 184, 0.2)",
                          backgroundColor: expiringSoon
                            ? "rgba(254, 252, 232, 0.5)"
                            : "transparent",
                        }}
                      >
                        <td style={{ padding: "0.75rem 0.5rem" }}>
                          <div style={{ fontWeight: 600 }}>{ingredient.name}</div>
                          {expiringSoon && (
                            <div
                              style={{
                                fontSize: "0.75rem",
                                color: "#dc2626",
                                fontWeight: 600,
                                marginTop: "0.2rem",
                              }}
                            >
                              ⚠️ Expiring soon
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "0.75rem 0.5rem" }}>
                          {ingredient.qty} {ingredient.unit}
                        </td>
                        <td style={{ padding: "0.75rem 0.5rem" }}>
                          {ingredient.price > 0
                            ? `€${ingredient.price.toFixed(2)}`
                            : "-"}
                        </td>
                        <td style={{ padding: "0.75rem 0.5rem" }}>
                          {formatDate(ingredient.expiryDate)}
                        </td>
                        <td style={{ padding: "0.75rem 0.5rem", textAlign: "center" }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => handleDelete(ingredient.id)}
                            disabled={deleteLoading === ingredient.id}
                            style={{
                              fontSize: "0.8rem",
                              padding: "0.4rem 0.8rem",
                            }}
                            aria-label={`Delete ${ingredient.name}`}
                          >
                            {deleteLoading === ingredient.id
                              ? "Deleting…"
                              : "Delete"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </ProtectedRoute>
  );
}
