# Firestore Security Rules – Rationale

This document explains the Firestore security rules used in UniMeal and why they are structured this way.

## Goal

**Users may only access their own data.** No user can read or write another user’s meals, ingredients, or budget.

## Data Model

UniMeal stores all user data under a single top-level collection, keyed by Firebase Auth UID:

- `users/{userId}/meals/{mealId}` – planned meals
- `users/{userId}/ingredients/{ingredientId}` – ingredient inventory
- `users/{userId}/budget/current` – monthly budget (single document)

Every document is scoped to one user via the `userId` segment in the path.

## Rule Structure

### 1. Authentication required

Every rule uses:

```text
request.auth != null
```

So:

- Unauthenticated clients cannot read or write any user data.
- Only signed-in users (e.g. Google) can access Firestore from the app.

### 2. Path-based isolation

Each rule then restricts access to the **owner** of that path:

```text
request.auth.uid == userId
```

So:

- `userId` in the path must equal the authenticated user’s UID.
- A user can only access documents under `users/<their-own-uid>/...`.

This gives **per-user isolation**: user A cannot read or write user B’s data, because those documents live under `users/<B's-uid>/...`.

### 3. Explicit paths

Rules are defined for each subcollection/document the app uses:

| Path pattern | Purpose |
|--------------|--------|
| `users/{userId}/meals/{mealId}` | Meal planning (CRUD). |
| `users/{userId}/ingredients/{ingredientId}` | Ingredient list (CRUD). |
| `users/{userId}/budget/{document=**}` | Budget document(s), e.g. `current`. |

Anything else (e.g. a new top-level collection or a typo in the path) is **not** allowed, because Firestore denies by default when no rule matches.

### 4. Read and write together

For this app we use `allow read, write` when the user owns the path. We do not split read vs write because:

- The app needs both read and write for meals, ingredients, and budget.
- The only protection we need is “same user”; no separate read-only roles.

If we later add admin or sharing features, we would add more specific rules (e.g. `allow read` for shared data, `allow write` only for owner).

## Why this is secure

1. **Server-side enforcement** – Rules run in Firestore. A malicious or buggy client cannot bypass them.
2. **No cross-user access** – The only way to pass the rule is `request.auth.uid == userId`, so users cannot access each other’s data.
3. **Deny by default** – Any path without a matching allow is denied.
4. **Minimal surface** – Only the paths the app actually uses are allowed.

## Deploying the rules

1. Open [Firebase Console](https://console.firebase.google.com) → your project → **Firestore** → **Rules**.
2. Replace the rules with the contents of the project’s `firestore.rules` file.
3. Click **Publish**.

After publishing, allow a short time for propagation. If the app still reports permission errors, double-check that the rules were published and that the client is signed in with Firebase Auth.

## Summary

UniMeal’s Firestore rules enforce **authenticated, per-user access**: only the owner of `users/{userId}/...` can read or write that data. This matches the app’s data model and keeps each student’s meals, ingredients, and budget private.
