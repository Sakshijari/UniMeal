# Test Data Examples

Use these examples when manually testing UniMeal. Enter them via the app’s Meals, Ingredients, and Budget pages. All values are realistic for a student meal-planning scenario.

---

## Meals

Add these via **Meals** → “Add a meal”. Use the exact weekday values so filters and display behave as expected.

| Meal name           | Weekday   |
|---------------------|-----------|
| Oatmeal with banana | Monday    |
| Pasta carbonara     | Tuesday   |
| Chicken stir-fry    | Wednesday |
| Lentil soup         | Thursday  |
| Fish and vegetables | Friday    |
| Pancakes            | Saturday  |
| Rice and curry      | Sunday    |

Optional extras for testing duplicates and list behaviour:

| Meal name        | Weekday |
|------------------|---------|
| Grilled cheese   | Monday  |
| Vegetable curry  | Tuesday |

---

## Ingredients

Add these via **Ingredients** → “Add an ingredient”. Use **YYYY-MM-DD** for expiry. Adjust dates to today ± a few days to test “expiring soon” (within 3 days).

Example dates (replace with dates relative to your test day):

- **Today:** e.g. `2026-01-28`
- **Expiring soon (1–3 days):** e.g. `2026-01-29`, `2026-01-30`, `2026-01-31`
- **Later:** e.g. `2026-02-15`, `2026-03-01`

| Ingredient name   | Price (€) | Expiry date |
|-------------------|-----------|-------------|
| Milk              | 1.29      | (1–2 days from today) |
| Bread             | 2.49      | (2–3 days from today) |
| Chicken breast    | 5.99      | (5–7 days from today) |
| Pasta             | 1.19      | (e.g. 2026-03-01)     |
| Olive oil         | 4.50      | (e.g. 2026-06-01)     |
| Tomatoes          | 2.20      | (3–4 days from today) |
| Rice              | 1.89      | (e.g. 2026-08-01)     |
| Lentils           | 1.50      | (e.g. 2026-12-01)     |

Use at least one ingredient with expiry within 3 days to verify the “Expiring soon” highlight on the Ingredients page.

---

## Budget

Set via **Budget** → “Set monthly budget”.

| Field           | Example value | Notes                    |
|-----------------|---------------|--------------------------|
| Monthly limit   | 200           | Realistic student budget |
| Alternative      | 150            | Tighter budget scenario  |
| Alternative      | 300            | More headroom            |

After setting a limit and adding ingredients with prices, the Budget page should show:

- **Spent** = sum of all ingredient prices
- **Remaining** = monthly limit − spent
- Warning when remaining ≤ 20% of limit

---

## Quick test set

Minimal set for a short smoke test:

1. **Meals:** Add “Pasta carbonara” for Tuesday and “Oatmeal with banana” for Monday.
2. **Ingredients:** Add “Milk” €1.29, expiry tomorrow (YYYY-MM-DD); add “Pasta” €1.19, expiry in one month.
3. **Budget:** Set monthly limit to 200.

Then check: Meals list shows 2 items, Ingredients list shows 2 (Milk expiring soon if within 3 days), Budget shows Spent €2.48 and Remaining €197.52.
