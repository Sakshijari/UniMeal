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
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ProtectedRoute } from "../components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/src/lib/firebase";

type Meal = {
  id: string;
  name: string;
  weekday: string;
  createdAt: Timestamp;
};

type MealTemplate = {
  id: string;
  name: string;
  defaultWeekday: string; // optional in UI; stored as "" if not set
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

const VIEW_STORAGE_KEY = "unimeal-meals-view";

export default function MealsPage() {
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formWeekday, setFormWeekday] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "week">(() => {
    if (typeof window === "undefined") return "week";
    const stored = localStorage.getItem(VIEW_STORAGE_KEY) as "list" | "week" | null;
    return stored === "list" || stored === "week" ? stored : "week";
  });
  const [weekdayFilter, setWeekdayFilter] = useState<string>(""); // "" = all days
  const [templates, setTemplates] = useState<MealTemplate[]>([]);
  const [saveTemplateLoading, setSaveTemplateLoading] = useState(false);
  const [deleteTemplateLoading, setDeleteTemplateLoading] = useState<string | null>(null);
  const [exportCopied, setExportCopied] = useState(false);
  const addFormRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(VIEW_STORAGE_KEY, viewMode);
  }, [viewMode]);

  // Pre-fill weekday from URL ?day=monday and scroll to form
  useEffect(() => {
    const day = searchParams.get("day");
    if (day && WEEKDAYS.some((d) => d.value === day)) {
      setFormWeekday(day);
      addFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [searchParams]);

  const focusAddForm = useCallback((weekday: string) => {
    setFormWeekday(weekday);
    addFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Apply weekday filter: "" = all, otherwise only that day
  const filteredMeals = useMemo(() => {
    if (!weekdayFilter) return meals;
    return meals.filter((m) => m.weekday === weekdayFilter);
  }, [meals, weekdayFilter]);

  const mealsByDay = useMemo(() => {
    const map: Record<string, Meal[]> = {};
    WEEKDAYS.forEach((d) => {
      map[d.value] = [];
    });
    filteredMeals.forEach((m) => {
      if (map[m.weekday]) map[m.weekday].push(m);
    });
    return map;
  }, [filteredMeals]);

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

  // Realtime listener for meal templates
  useEffect(() => {
    if (authLoading || !user?.uid) return;
    const templatesRef = collection(db, "users", user.uid, "mealTemplates");
    const q = query(templatesRef);
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: MealTemplate[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            name: data.name || "",
            defaultWeekday: data.defaultWeekday ?? "",
            createdAt: data.createdAt || { seconds: 0, nanoseconds: 0 },
          } as MealTemplate);
        });
        list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        setTemplates(list);
      },
      (err) => {
        console.error("[UniMeal] Meal templates listener error", err);
      },
    );
    return () => unsubscribe();
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

  const handleSaveAsTemplate = async () => {
    if (!formName.trim() || !user?.uid) return;
    setSaveTemplateLoading(true);
    setError(null);
    try {
      const templatesRef = collection(db, "users", user.uid, "mealTemplates");
      await addDoc(templatesRef, {
        name: formName.trim(),
        defaultWeekday: formWeekday || "",
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("[UniMeal] Save template error", err);
      setError("Could not save template. Please try again.");
    } finally {
      setSaveTemplateLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!user?.uid) return;
    if (!confirm("Remove this template? You can add it again later.")) return;
    setDeleteTemplateLoading(templateId);
    setError(null);
    try {
      const ref = doc(db, "users", user.uid, "mealTemplates", templateId);
      await deleteDoc(ref);
    } catch (err) {
      console.error("[UniMeal] Delete template error", err);
      setError("Could not remove template. Please try again.");
    } finally {
      setDeleteTemplateLoading(null);
    }
  };

  const handleUseTemplate = (t: MealTemplate) => {
    setFormName(t.name);
    setFormWeekday(t.defaultWeekday || "");
    addFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleAddFromTemplate = async (t: MealTemplate) => {
    if (!user?.uid || !t.name.trim()) return;
    const day = t.defaultWeekday || WEEKDAYS[0].value;
    setIsSubmitting(true);
    setError(null);
    try {
      const mealsRef = collection(db, "users", user.uid, "meals");
      await addDoc(mealsRef, {
        name: t.name.trim(),
        weekday: day,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("[UniMeal] Add from template error", err);
      setError("Could not add meal. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getWeekdayLabelForExport = (value: string) =>
    WEEKDAYS.find((w) => w.value === value)?.label || value;

  const getMealPlanExportText = useCallback(() => {
    const lines: string[] = ["UniMeal – Meal plan", ""];
    WEEKDAYS.forEach((d) => {
      const dayMeals = mealsByDay[d.value] ?? [];
      if (dayMeals.length > 0) {
        lines.push(getWeekdayLabelForExport(d.value));
        dayMeals.forEach((m) => lines.push(`- ${m.name}`));
        lines.push("");
      }
    });
    if (lines[lines.length - 1] === "" && lines.length > 2) lines.pop();
    return lines.join("\n");
  }, [mealsByDay]);

  const handleCopyMealPlan = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(getMealPlanExportText());
      setExportCopied(true);
      setTimeout(() => setExportCopied(false), 2000);
    } catch (err) {
      console.error("[UniMeal] Copy meal plan error", err);
      setError("Could not copy to clipboard.");
    }
  }, [getMealPlanExportText]);

  const handleDownloadMealPlan = useCallback(() => {
    const text = getMealPlanExportText();
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `unimeal-meal-plan-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [getMealPlanExportText]);

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

        <div ref={addFormRef} className="meals-add-form-anchor">
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
              <button
                type="button"
                className="btn btn-secondary"
                disabled={saveTemplateLoading || !formName.trim()}
                onClick={handleSaveAsTemplate}
                aria-label="Save current meal as a template for later"
              >
                {saveTemplateLoading ? "Saving…" : "Save as template"}
              </button>
            </div>
          </form>
          </section>
        </div>

        {templates.length > 0 && (
          <section className="page-section meals-templates-section">
            <h2 className="page-section-title">Add from template</h2>
            <p className="page-section-text" style={{ marginBottom: "0.75rem" }}>
              Use a saved template to fill the form or add the meal in one click.
            </p>
            <ul className="meals-templates-list" aria-label="Meal templates">
              {templates.map((t) => (
                <li key={t.id} className="meals-templates-item">
                  <div className="meals-templates-item-main">
                    <span className="meals-templates-item-name">{t.name}</span>
                    {t.defaultWeekday && (
                      <span className="meals-templates-item-day">
                        {getWeekdayLabel(t.defaultWeekday)}
                      </span>
                    )}
                  </div>
                  <div className="meals-templates-item-actions">
                    <button
                      type="button"
                      className="btn btn-secondary meals-templates-btn"
                      onClick={() => handleUseTemplate(t)}
                      disabled={isSubmitting}
                      aria-label={`Use template ${t.name} in form`}
                    >
                      Use in form
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary meals-templates-btn"
                      onClick={() => handleAddFromTemplate(t)}
                      disabled={isSubmitting}
                      aria-label={`Add ${t.name} for ${t.defaultWeekday ? getWeekdayLabel(t.defaultWeekday) : "Monday"}`}
                    >
                      Add meal
                    </button>
                    <button
                      type="button"
                      className="meals-templates-delete"
                      onClick={() => handleDeleteTemplate(t.id)}
                      disabled={deleteTemplateLoading === t.id}
                      aria-label={`Remove template ${t.name}`}
                      title="Remove template"
                    >
                      {deleteTemplateLoading === t.id ? "…" : "×"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="page-section">
          <div className="meals-view-header">
            <h2 className="page-section-title">
              {viewMode === "week" ? "Week at a glance" : `Your planned meals (${filteredMeals.length})`}
            </h2>
            <div className="meals-filters-row">
              <label htmlFor="meals-weekday-filter" className="meals-filter-label">
                Filter by day
              </label>
              <select
                id="meals-weekday-filter"
                className="input meals-weekday-filter"
                value={weekdayFilter}
                onChange={(e) => setWeekdayFilter(e.target.value)}
                aria-label="Filter meals by weekday"
              >
                <option value="">All days</option>
                {WEEKDAYS.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="meals-view-toggle" role="tablist" aria-label="View mode">
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === "week"}
                aria-controls="meals-content"
                id="meals-tab-week"
                className={"meals-view-toggle-btn" + (viewMode === "week" ? " meals-view-toggle-btn--active" : "")}
                onClick={() => setViewMode("week")}
              >
                Week
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === "list"}
                aria-controls="meals-content"
                id="meals-tab-list"
                className={"meals-view-toggle-btn" + (viewMode === "list" ? " meals-view-toggle-btn--active" : "")}
                onClick={() => setViewMode("list")}
              >
                List
              </button>
            </div>
            {(filteredMeals.length > 0) && (
              <div className="meals-export-actions">
                <button
                  type="button"
                  className="btn btn-secondary meals-export-btn"
                  onClick={handleCopyMealPlan}
                  aria-label="Copy meal plan to clipboard"
                >
                  {exportCopied ? "Copied!" : "Copy meal plan"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary meals-export-btn"
                  onClick={handleDownloadMealPlan}
                  aria-label="Download meal plan as text file"
                >
                  Download .txt
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <p className="page-section-text">Loading your meals…</p>
          ) : viewMode === "week" ? (
            <div id="meals-content" className="meals-week-calendar" role="tabpanel" aria-labelledby="meals-tab-week">
              {WEEKDAYS.map((day) => {
                const dayMeals = mealsByDay[day.value] ?? [];
                return (
                  <div key={day.value} className="meals-day-column">
                    <div className="meals-day-header">
                      <span className="meals-day-name">{day.label}</span>
                      <button
                        type="button"
                        className="meals-day-add-btn"
                        onClick={() => focusAddForm(day.value)}
                        aria-label={`Add meal for ${day.label}`}
                      >
                        + Add
                      </button>
                    </div>
                    <div className="meals-day-body">
                      {dayMeals.length === 0 ? (
                        <p className="meals-day-empty">No meals planned</p>
                      ) : (
                        <ul className="meals-day-list" aria-label={`Meals for ${day.label}`}>
                          {dayMeals.map((meal) => (
                            <li key={meal.id} className="meals-day-meal">
                              <span className="meals-day-meal-name">{meal.name}</span>
                              <button
                                type="button"
                                className="meals-day-meal-delete"
                                onClick={() => handleDelete(meal.id)}
                                disabled={deleteLoading === meal.id}
                                aria-label={`Delete ${meal.name}`}
                              >
                                {deleteLoading === meal.id ? "…" : "×"}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : filteredMeals.length === 0 ? (
            <p className="page-section-text">
              {meals.length === 0
                ? "You haven\u2019t added any meals yet. Use the form above to get started!"
                : weekdayFilter
                  ? `No meals planned for ${getWeekdayLabel(weekdayFilter)}. Try another day or clear the filter.`
                  : "No meals match the current filter."}
            </p>
          ) : (
            <div id="meals-content" className="meals-list-view" role="tabpanel" aria-labelledby="meals-tab-list">
              <div className="meals-list">
                {filteredMeals.map((meal) => (
                  <div key={meal.id} className="meals-list-item">
                    <div className="meals-list-item-main">
                      <span className="meals-list-item-name">{meal.name}</span>
                      <span className="meals-list-item-day">{getWeekdayLabel(meal.weekday)}</span>
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
            </div>
          )}
        </section>
      </div>
    </ProtectedRoute>
  );
}
