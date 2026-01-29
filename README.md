# UniMeal

UniMeal is a student meal-planning web app. Plan meals for the week, track ingredients and expiry dates, and keep your food budget under control. Built with Next.js and Firebase (Auth + Firestore).

---

## Features

- **Authentication** – Sign in with Google; protected dashboard and routes.
- **Meal planning** – Add meals by name and weekday; view and delete planned meals.
- **Ingredient inventory** – Add ingredients with name, price, and expiry date; see “expiring soon” (within 3 days).
- **Budget** – Set a monthly limit; see spent (sum of ingredient prices) and remaining; low-budget warning when remaining ≤ 20% of limit.
- **Responsive layout** – Header, navigation, and main content adapt to small screens.

---

## Setup

### Prerequisites

- Node.js 18+ and npm (or yarn/pnpm)
- A Google account (for sign-in)
- A Firebase project with Authentication (Google provider) and Firestore enabled

### 1. Clone and install

```bash
git clone <your-repo-url>
cd unimeal
npm install
```

### 2. Firebase configuration

1. In [Firebase Console](https://console.firebase.google.com), create or select a project.
2. Enable **Authentication** → **Sign-in method** → **Google**.
3. Create a **Firestore Database** (start in test mode if needed for first setup).
4. In **Project settings** → **Your apps**, add a web app and copy the config object.

### 3. Environment variables

Create `.env.local` in the project root (this file is not committed):

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

Replace the placeholders with values from your Firebase web app config.

### 4. Firestore security rules

1. In Firebase Console → **Firestore** → **Rules**, replace the rules with the contents of the project’s `firestore.rules` file.
2. Click **Publish**.

See [docs/firestore_rules.md](docs/firestore_rules.md) for rationale and [FIRESTORE_SETUP.md](FIRESTORE_SETUP.md) for step-by-step troubleshooting.

### 5. Run the app
## UniMeal

UniMeal – Student meal planning, ingredient inventory and budget tracking web app (Next.js + Firebase).

### Getting Started

First, install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in with Google to use the dashboard, meals, ingredients, and budget.

---

## Scripts

| Command       | Description              |
|---------------|--------------------------|
| `npm run dev` | Start dev server (port 3000) |
| `npm run build` | Build for production   |
| `npm run start` | Start production server |
| `npm run lint`  | Run ESLint             |

---

## Documentation

| Document | Description |
|----------|-------------|
| [docs/firestore_rules.md](docs/firestore_rules.md) | Firestore security rules rationale |
| [docs/test_data_examples.md](docs/test_data_examples.md) | Sensible test data for manual testing |
| [docs/manual_test_checklist.md](docs/manual_test_checklist.md) | Manual test cases (TC1..) |
| [FIRESTORE_SETUP.md](FIRESTORE_SETUP.md) | Firestore rules setup and troubleshooting |

---

## Tech stack

- **Next.js 16** (App Router)
- **React 19**
- **Firebase** (Auth, Firestore)
- **TypeScript**
- **CSS** (custom styles, no Tailwind in current build)

---

## License

Private / educational use as required by your course.
The app will be available at `http://localhost:3000`.
