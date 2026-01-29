"use client";

import { doc, onSnapshot, setDoc } from "firebase/firestore";
import Link from "next/link";
import { useEffect, useState } from "react";

import { db } from "@/src/lib/firebase";

const PREFERENCES_ONBOARDING_PATH = "preferences/onboarding";

type OnboardingOverlayProps = {
  userId: string;
  hasBudget: boolean;
  hasMeals: boolean;
  hasIngredients: boolean;
};

export function OnboardingOverlay({
  userId,
  hasBudget,
  hasMeals,
  hasIngredients,
}: OnboardingOverlayProps) {
  const [completed, setCompleted] = useState<boolean | null>(null);
  const [skipped, setSkipped] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const ref = doc(db, "users", userId, PREFERENCES_ONBOARDING_PATH);
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        const data = snap.data();
        setCompleted(data?.completed === true);
      },
      () => setCompleted(false),
    );
    return () => unsubscribe();
  }, [userId]);

  const allDone = hasBudget && hasMeals && hasIngredients;

  // Auto-complete onboarding when user has done all three steps
  useEffect(() => {
    if (!allDone || completed === true || skipped) return;
    const ref = doc(db, "users", userId, PREFERENCES_ONBOARDING_PATH);
    setDoc(ref, { completed: true }, { merge: true }).then(
      () => setCompleted(true),
      (err) => console.error("[UniMeal] Onboarding auto-complete error", err),
    );
  }, [allDone, userId, completed, skipped]);

  const handleSkip = async () => {
    setSaving(true);
    try {
      const ref = doc(db, "users", userId, PREFERENCES_ONBOARDING_PATH);
      await setDoc(ref, { completed: true }, { merge: true });
      setSkipped(true);
    } catch (err) {
      console.error("[UniMeal] Onboarding skip error", err);
    } finally {
      setSaving(false);
    }
  };

  const showOverlay =
    completed === false && !skipped;

  if (!showOverlay) return null;

  return (
    <div className="onboarding-overlay" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <div className="onboarding-backdrop" aria-hidden />
      <div className="onboarding-card">
        <h2 id="onboarding-title" className="onboarding-title">
          Welcome to UniMeal
        </h2>
        <p className="onboarding-subtitle">
          Get started in three quick steps: set your budget, plan a meal, and add an ingredient.
        </p>
        <ol className="onboarding-steps">
          <li className={"onboarding-step" + (hasBudget ? " onboarding-step--done" : "")}>
            {hasBudget ? (
              <span className="onboarding-step-check" aria-hidden>✓</span>
            ) : (
              <span className="onboarding-step-num" aria-hidden>1</span>
            )}
            <span className="onboarding-step-label">Set your monthly budget</span>
            {!hasBudget && (
              <Link href="/budget" className="btn btn-primary onboarding-step-action">
                Go to Budget
              </Link>
            )}
          </li>
          <li className={"onboarding-step" + (hasMeals ? " onboarding-step--done" : "")}>
            {hasMeals ? (
              <span className="onboarding-step-check" aria-hidden>✓</span>
            ) : (
              <span className="onboarding-step-num" aria-hidden>2</span>
            )}
            <span className="onboarding-step-label">Add your first meal</span>
            {!hasMeals && (
              <Link href="/meals" className="btn btn-primary onboarding-step-action">
                Go to Meals
              </Link>
            )}
          </li>
          <li className={"onboarding-step" + (hasIngredients ? " onboarding-step--done" : "")}>
            {hasIngredients ? (
              <span className="onboarding-step-check" aria-hidden>✓</span>
            ) : (
              <span className="onboarding-step-num" aria-hidden>3</span>
            )}
            <span className="onboarding-step-label">Add an ingredient</span>
            {!hasIngredients && (
              <Link href="/ingredients" className="btn btn-primary onboarding-step-action">
                Go to Ingredients
              </Link>
            )}
          </li>
        </ol>
        {allDone && (
          <p className="onboarding-all-done">
            You&apos;re all set! You can close this or click Skip below.
          </p>
        )}
        <div className="onboarding-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleSkip}
            disabled={saving}
            aria-label="Skip onboarding"
          >
            {saving ? "Saving…" : "Skip"}
          </button>
        </div>
      </div>
    </div>
  );
}
