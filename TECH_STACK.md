# EyeGuard — Technology Stack

Complete reference of every language, framework, library, service, and tool used in the system.

---

## System Architecture Overview

EyeGuard is split into two parts that run separately and communicate over HTTP:

```
┌─────────────────────────────────────┐        ┌──────────────────────────────┐
│         Frontend (Next.js)          │        │      Backend (Flask / ML)    │
│         localhost:3000              │◄──────►│      localhost:5000          │
│                                     │        │                              │
│  TypeScript + React + Tailwind CSS  │        │  Python + scikit-learn       │
│  Supabase (auth + database)         │        │  Random Forest               │
│  App Router (Next.js 16)            │        │  Gradient Boosting           │
└─────────────────────────────────────┘        └──────────────────────────────┘
         │                                                    │
         └────────────────────┬───────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │     Supabase      │
                    │  (cloud database) │
                    │  PostgreSQL       │
                    │  Auth             │
                    │  Row-Level Sec.   │
                    └───────────────────┘
```

---

## 1. Frontend

### Language
| Item | Detail |
|---|---|
| **TypeScript** | 5.7.3 — primary language for all frontend code |
| **JavaScript (JSX/TSX)** | React component syntax inside `.tsx` files |

### Framework
| Item | Version | Purpose |
|---|---|---|
| **Next.js** | 16.2.4 | Full-stack React framework; App Router; server-side rendering |
| **React** | 19 | UI component library |
| **React DOM** | 19 | DOM rendering for React |

### Styling
| Item | Version | Purpose |
|---|---|---|
| **Tailwind CSS** | 4.2.0 | Utility-first CSS framework |
| **PostCSS** | 8.5 | CSS transformation pipeline |
| **tw-animate-css** | 1.3.3 | Animation utilities for Tailwind |
| **class-variance-authority** | 0.7.1 | Variant-based component styling |
| **clsx** | 2.1.1 | Conditional class name merging |
| **tailwind-merge** | 3.3.1 | Merges conflicting Tailwind classes |

### UI Component Library
All components are from **Radix UI** — unstyled, accessible primitives:

| Component | Version |
|---|---|
| Accordion | 1.2.12 |
| Alert Dialog | 1.1.15 |
| Checkbox | 1.3.3 |
| Dialog | 1.1.15 |
| Dropdown Menu | 2.1.16 |
| Label | 2.1.8 |
| Navigation Menu | 1.2.14 |
| Popover | 1.1.15 |
| Progress | 1.1.8 |
| Radio Group | 1.3.8 |
| Select | 2.2.6 |
| Separator | 1.1.8 |
| Slider | 1.3.6 |
| Tabs | 1.1.13 |
| Toast | 1.2.15 |
| Tooltip | 1.2.8 |
| Switch | 1.2.6 |
| Scroll Area | 1.2.10 |

### Icons
| Item | Version | Purpose |
|---|---|---|
| **Lucide React** | 0.564.0 | Icon library used throughout the UI |

### Forms
| Item | Version | Purpose |
|---|---|---|
| **React Hook Form** | 7.54.1 | Form state management and validation |
| **@hookform/resolvers** | 3.9.1 | Connects Zod schemas to React Hook Form |
| **Zod** | 3.24.1 | Schema validation and type inference |

### Charts & Data Visualization
| Item | Version | Purpose |
|---|---|---|
| **Recharts** | 2.15.0 | Chart components used in analytics and dashboard pages |

### Notifications & Feedback
| Item | Version | Purpose |
|---|---|---|
| **Sonner** | 1.7.1 | Toast notification system (used for high/critical risk alerts) |

### Utilities
| Item | Version | Purpose |
|---|---|---|
| **date-fns** | 4.1.0 | Date formatting and manipulation |
| **SWR** | 2.4.1 | Data fetching with caching and revalidation |
| **cmdk** | 1.1.1 | Command palette component |
| **input-otp** | 1.4.2 | OTP input component |
| **react-day-picker** | 9.13.2 | Date picker component |
| **react-resizable-panels** | 2.1.7 | Resizable panel layouts |
| **embla-carousel-react** | 8.6.0 | Carousel/slider component |
| **next-themes** | 0.4.6 | Light/Dark mode theme switching |
| **vaul** | 1.1.2 | Drawer component |
| **@vercel/analytics** | 1.6.1 | Usage analytics tracking |

---

## 2. Backend (Flask / ML Service)

### Language
| Item | Detail |
|---|---|
| **Python** | Primary language for the backend and ML pipeline |

### Web Framework
| Item | Version | Purpose |
|---|---|---|
| **Flask** | 2.3.3 | Lightweight web framework for the ML API |
| **Flask-CORS** | 4.0.0 | Cross-Origin Resource Sharing — allows Next.js to call the Flask API |
| **Flask-SQLAlchemy** | 3.0.5 | ORM for the local SQLite/PostgreSQL database |
| **Flask-JWT-Extended** | 4.5.2 | JWT authentication for Flask API routes |
| **Werkzeug** | 2.3.7 | WSGI utility library (Flask dependency) |

### Machine Learning
| Item | Version | Purpose |
|---|---|---|
| **scikit-learn** | ≥ 1.5.2 | Random Forest Classifier, Gradient Boosting Regressor, Linear Regression, StandardScaler, cross-validation |
| **NumPy** | ≥ 2.1.0 | Numerical arrays and feature matrix operations |
| **Pandas** | ≥ 2.2.3 | Data manipulation for training data loading |

### ML Models (inside scikit-learn)
| Model | Algorithm | Task |
|---|---|---|
| `RiskLevelClassifier` | `RandomForestClassifier` (200 trees, max depth 15) | Classifies risk: Low / Moderate / High / Critical |
| `RiskPercentageRegressor` | `GradientBoostingRegressor` (200 estimators, LR 0.1) | Outputs continuous risk % (0–100%) |
| `FatiguePredictor` | `LinearRegression` | Outputs fatigue score (0–10) |

### Database (Backend Local)
| Item | Version | Purpose |
|---|---|---|
| **SQLAlchemy** | ≥ 2.0.35 | ORM |
| **SQLite** | Built-in | Development local database (`eyeguard.db`) |
| **PostgreSQL** | Cloud (via env) | Production database option |

### Task Scheduling
| Item | Version | Purpose |
|---|---|---|
| **APScheduler** | 3.10.4 | Schedules automatic ML model retraining after every N new daily logs |

### Email
| Item | Version | Purpose |
|---|---|---|
| **requests** | 2.31.0 | HTTP calls from Flask to send high-risk alert emails |

### Environment
| Item | Version | Purpose |
|---|---|---|
| **python-dotenv** | 1.0.0 | Loads `.env` variables into Flask config |

### Testing & Code Quality (Dev)
| Item | Version | Purpose |
|---|---|---|
| **pytest** | 7.4.0 | Backend test runner |
| **pytest-cov** | 4.1.0 | Test coverage reporting |
| **black** | 23.9.1 | Python code formatter |
| **flake8** | 6.0.0 | Python linter |

---

## 3. Database & Authentication (Supabase)

### What is Supabase?
Supabase is an open-source Firebase alternative. It provides a hosted PostgreSQL database, authentication, file storage, and real-time subscriptions. EyeGuard uses it as the primary cloud database.

### Supabase Services Used
| Service | How EyeGuard Uses It |
|---|---|
| **PostgreSQL** | Stores all user data, daily logs, predictions, and CVSQ scores |
| **Authentication** | Email/password sign-up and login; session management |
| **Row-Level Security (RLS)** | Each user can only read/write their own rows — enforced at the database level |
| **Supabase SSR** | Server-side session handling in Next.js App Router |
| **Supabase JS Client** | Used in both frontend and Flask backend to query the database |

### Supabase Packages
| Package | Version | Where Used |
|---|---|---|
| `@supabase/supabase-js` | 2.105.3 | Frontend — all database queries and auth |
| `@supabase/ssr` | 0.10.2 | Frontend — server-side session cookies in Next.js |
| `supabase` (Python) | ≥ 2.3.4 | Backend — Flask reads `daily_logs` from Supabase to retrain ML models |

### Key Database Tables
| Table | Purpose |
|---|---|
| `daily_logs` | One row per user per day — stores all survey answers |
| `predictions` | Stores CVSQ score, ML risk level, risk %, fatigue score, concordance |
| `user_profiles` | Name, age, gender, year level, field of study |
| `user_settings` | Notification preferences |
| `wellness_tips` | Recommendation content served to users |

### Supabase URL
```
https://vpfzjysugqrnshfzsaex.supabase.co
```

---

## 4. Frontend Testing

| Item | Version | Purpose |
|---|---|---|
| **Vitest** | 3.2.4 | Unit test runner (replaces Jest for Vite/Next projects) |
| **@vitest/coverage-v8** | 3.2.4 | Code coverage reports |
| **fast-check** | 3.23.2 | Property-based testing (generates random inputs to find edge cases) |

### Test Files in the Project
| File | What it tests |
|---|---|
| `lib/recommendations.test.ts` | Recommendation selection logic |
| `lib/recommendations.pbt.test.ts` | Property-based tests for recommendations |
| `app/api/admin/stats.pbt.test.ts` | Property-based tests for admin stats |
| `app/api/admin/users.pbt.test.ts` | Property-based tests for user management |
| `app/api/admin/__tests__/admin-auth.test.ts` | Admin authentication |
| `app/api/admin/__tests__/ml-proxy.test.ts` | ML proxy endpoint |
| `app/api/predict-supabase/__tests__/recommendations-wiring.test.ts` | Prediction + recommendations wiring |

---

## 5. Deployment & Hosting

| Component | Platform | URL |
|---|---|---|
| **Frontend** | Local (dev) / Vercel-ready | `http://localhost:3000` |
| **Flask ML Backend** | Local | `http://localhost:5000` |
| **Database** | Supabase (cloud) | `https://vpfzjysugqrnshfzsaex.supabase.co` |

### Environment Variables (Frontend — `.env.local`)
| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public API key for Supabase client |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side key with elevated permissions |
| `NEXT_PUBLIC_API_URL` | Flask backend URL (`http://localhost:5000/api`) |
| `NEXT_PUBLIC_ADMIN_EMAIL` | Admin account email |
| `NEXT_PUBLIC_RETRAIN_KEY` | API key for triggering ML retraining |

### Environment Variables (Backend — `backend/.env`)
| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase URL for reading training data |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for backend DB access |
| `SECRET_KEY` | Flask session secret |
| `JWT_SECRET` | JWT signing key |
| `RETRAIN_API_KEY` | Matches frontend retrain key |
| `RETRAIN_EVERY_N_LOGS` | Number of new logs before automatic retraining (default: 10) |

---

## 6. Project Structure Summary

```
CAPSTONE/
├── app/                        # Next.js App Router pages and API routes
│   ├── admin/                  # Admin dashboard pages
│   ├── api/                    # Backend API routes (TypeScript)
│   │   ├── predict-supabase/   # Main prediction endpoint
│   │   ├── admin/              # Admin management endpoints
│   │   ├── chat/               # AI chat endpoint
│   │   └── notifications/      # Notification endpoints
│   ├── daily-log/              # Daily survey page
│   ├── dashboard/              # User dashboard
│   ├── risk-prediction/        # Risk results page
│   └── analytics/              # Analytics page
├── components/                 # Reusable React components
├── lib/                        # Shared utilities (recommendations, Supabase client)
├── backend/                    # Flask + ML Python backend
│   ├── app.py                  # Flask app entry point
│   ├── ml/                     # ML models, training, prediction
│   │   ├── models.py           # RandomForest, GradientBoosting, LinearRegression
│   │   ├── features.py         # Feature engineering (12 features)
│   │   ├── training.py         # Training pipeline + synthetic data
│   │   ├── predictor.py        # Prediction service
│   │   └── storage.py          # Model persistence (pickle)
│   ├── routes/                 # Flask API routes
│   └── requirements.txt        # Python dependencies
├── package.json                # Node.js dependencies
├── tsconfig.json               # TypeScript configuration
├── next.config.mjs             # Next.js configuration
└── tailwind.config             # Tailwind CSS configuration
```

---

## 7. How the Two Parts Communicate

```
User fills survey (Next.js frontend)
        │
        ▼
POST /api/predict-supabase  (Next.js API route — TypeScript)
        │
        ├── Saves form data to Supabase (daily_logs table)
        │
        ├── Runs rule-based scoring (symptom weights + modifiers)
        │
        ├── POST /api/ml/predict  →  Flask backend (Python)
        │       │
        │       ├── Random Forest → risk level
        │       └── Gradient Boosting → risk percentage
        │
        ├── If Flask offline → uses rule-based score as fallback
        │
        ├── Saves prediction to Supabase (predictions table)
        │
        └── Returns risk level, risk %, fatigue score, CVSQ score, concordance
```

---

*EyeGuard Capstone Project — Technology Stack Reference*
*Frontend: TypeScript + Next.js 16 + React 19 + Tailwind CSS + Supabase*
*Backend: Python + Flask + scikit-learn (Random Forest + Gradient Boosting)*
