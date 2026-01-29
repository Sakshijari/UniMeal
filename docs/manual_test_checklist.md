# Manual Test Checklist

Use this checklist to verify UniMeal before release or after changes. Run tests with a real Google account in a supported browser.

---

## TC1: Authentication

| ID   | Step | Expected result | Pass |
|------|------|------------------|------|
| TC1.1 | Open `/`. | Home page shows “Welcome to UniMeal” and “Sign in with Google”. | ☐ |
| TC1.2 | Click “Sign in with Google”. | Google sign-in popup or redirect. | ☐ |
| TC1.3 | Complete Google sign-in. | Redirect to `/dashboard`, header shows signed-in email. | ☐ |
| TC1.4 | Open `/dashboard` while signed in. | Dashboard content visible (no “Sign in to see this page”). | ☐ |
| TC1.5 | Open `/dashboard` in incognito (signed out). | “Sign in to see this page” and “Go to login” link. | ☐ |
| TC1.6 | Click “Log out” in header. | User signed out, header shows “Sign in”. | ☐ |
| TC1.7 | Open `/login` when already signed in. | Redirect to `/dashboard`. | ☐ |

---

## TC2: Navigation and layout

| ID   | Step | Expected result | Pass |
|------|------|------------------|------|
| TC2.1 | Signed in: click “Dashboard”, “Meals”, “Ingredients”, “Budget” in header. | Each route loads; active nav link highlighted. | ☐ |
| TC2.2 | Click “UniMeal” / logo. | Navigates to home or dashboard as appropriate. | ☐ |
| TC2.3 | Resize to mobile width. | Nav links hidden or adapted; layout readable. | ☐ |

---

## TC3: Meals

| ID   | Step | Expected result | Pass |
|------|------|------------------|------|
| TC3.1 | Go to Meals, submit form with empty name. | Validation error (e.g. “Meal name is required”). | ☐ |
| TC3.2 | Submit with name but no weekday. | Validation error (e.g. “Please select a weekday”). | ☐ |
| TC3.3 | Add meal: name “Pasta carbonara”, weekday Tuesday. | Meal appears in list with correct name and “Tuesday”. | ☐ |
| TC3.4 | Add second meal: “Oatmeal with banana”, Monday. | Both meals visible, correct weekdays. | ☐ |
| TC3.5 | Click “Delete” on one meal, confirm. | That meal removed from list. | ☐ |
| TC3.6 | Refresh page. | Meals persist (Firestore). | ☐ |

---

## TC4: Ingredients

| ID   | Step | Expected result | Pass |
|------|------|------------------|------|
| TC4.1 | Go to Ingredients, submit with empty name. | Validation error. | ☐ |
| TC4.2 | Add ingredient: “Milk”, price 1.29, expiry tomorrow (YYYY-MM-DD). | Ingredient appears with correct price and formatted expiry. | ☐ |
| TC4.3 | Add “Bread”, 2.49, expiry in 2 days. | Both ingredients visible; if within 3 days, “Expiring soon” shown. | ☐ |
| TC4.4 | Add “Pasta”, 1.19, expiry in 30+ days. | Three ingredients in list; Pasta not marked expiring soon. | ☐ |
| TC4.5 | Delete one ingredient, confirm. | Ingredient removed; list updates. | ☐ |
| TC4.6 | Refresh page. | Ingredients persist. | ☐ |

---

## TC5: Budget

| ID   | Step | Expected result | Pass |
|------|------|------------------|------|
| TC5.1 | Go to Budget before setting limit. | No limit or “Set monthly budget” flow. | ☐ |
| TC5.2 | Set monthly limit 200, save. | Limit 200 shown; Spent = sum of ingredient prices; Remaining = 200 − Spent. | ☐ |
| TC5.3 | Add ingredient with price (e.g. Rice 1.89). | Spent and Remaining update. | ☐ |
| TC5.4 | Set limit so remaining ≤ 20% of limit. | Warning (e.g. low budget / almost over). | ☐ |
| TC5.5 | Refresh page. | Limit and computed values persist. | ☐ |

---

## TC6: Protected routes and errors

| ID   | Step | Expected result | Pass |
|------|------|------------------|------|
| TC6.1 | Signed out: open `/meals`, `/ingredients`, `/budget`. | “Sign in to see this page” (or redirect to login). | ☐ |
| TC6.2 | Signed in: cause Firestore error (e.g. rules reverted). | Clear error message; app does not crash. | ☐ |
| TC6.3 | Sign in, then disconnect network; trigger a Firestore read. | Error handling (e.g. “unavailable” or retry). | ☐ |

---

## TC7: Cross-feature consistency

| ID   | Step | Expected result | Pass |
|------|------|------------------|------|
| TC7.1 | Add meals and ingredients, set budget. Sign out, sign in again. | Same data visible. | ☐ |
| TC7.2 | Delete an ingredient that contributed to budget. | Budget “Spent” decreases by that price. | ☐ |

---

## Sign-off

| Tester | Date | Environment (browser, OS) | Notes |
|--------|------|---------------------------|-------|
|        |      |                            |       |
