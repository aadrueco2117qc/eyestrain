# EyeGuard ML Training Documentation

---

## Overview

EyeGuard uses a **dual-path prediction system**. The Flask backend hosts three scikit-learn models trained on a combination of synthetic and real data. The Next.js frontend has its own independent **rule-based scoring engine** (CVS-Q + environmental modifiers) that runs entirely without the Flask backend. The two systems produce different outputs that serve different purposes — explained in detail below.

---

## 1. The Two Prediction Paths

### Path A — Rule-Based Scoring (Next.js, `predict-supabase/route.ts`)

This is the primary path used every time a user submits a daily log. It does **not** call the Flask backend. It runs in the Next.js API layer and produces the risk level, risk percentage, fatigue score, confidence, and recommendations that are saved to Supabase.

### Path B — Flask ML Models (`backend/ml/`)

Three scikit-learn models live here. They are trained on startup and retrained automatically every 10 new log submissions. They can be called via the Flask API but the current app routes daily log submissions through Path A, not Path B. The Flask backend is primarily used for model retraining and status checks.

---

## 2. Path A — Rule-Based Scoring Engine (How Your Risk Is Calculated)

### Step 1 — CVS-Q Symptom Score (Primary Signal)

Based on the **Computer Vision Syndrome Questionnaire (CVS-Q)** by Seguí et al. (2015, *Journal of Clinical Epidemiology*).

| Symptom | Weight | Max contribution |
|---|---|---|
| Eye strain | 2 | 2 × frequency multiplier |
| Blurry vision | 2 | 2 × frequency multiplier |
| Headaches | 1 | 1 × frequency multiplier |
| Dry eyes | 1 | 1 × frequency multiplier |

**Frequency multipliers:**

| Frequency | Multiplier |
|---|---|
| Never | 0.0 |
| Rarely (1–2× / week) | 0.5 |
| Sometimes (3–4× / week) | 1.0 |
| Often (5–6× / week) | 1.5 |
| Always (every day) | 2.0 |

**CVS-Q raw score range:** 0–12  
**Normalised symptom score:** `(raw / 12) × 100` → 0–100

If the user reports no symptoms, the symptom score is 0 and only the exposure path applies (capped at 35%).

---

### Step 2 — Environmental Exposure Modifiers

These add or subtract from the symptom score based on lifestyle inputs.

**Screen time** (AOA 2016 guidelines):

| Range | Modifier |
|---|---|
| < 2 hours | +0 |
| 2–6 hours | +0 to +15 (linear) |
| 6–12 hours | +15 to +25 |

**Sleep** (NSF 2020 + Sheppard & Wolffsohn 2018):

| Sleep | Modifier |
|---|---|
| < 5 hours | +14 |
| 5–6 hours | +10 |
| 6–7 hours | +6 |
| 7–9 hours | 0 (optimal) |
| > 9 hours | +2 |

**Brightness** (ISO 9241-303, optimal range 40–80%):
- Each 10% outside the 40–80% range adds +1.5, maximum +6.

**Breaks taken** (AOA 20-20-20 rule):
- Each break: −3 points, maximum −12.

**Lifestyle protective factors:**

| Factor | Best case | Modifier |
|---|---|---|
| Blue-light filter (Always) | −4 | |
| Blue-light filter (Regularly) | −2 | |
| Blue-light filter (Sometimes) | −1 | |
| Exercise (Regular) | −3 | |
| Exercise (Moderate) | −1.5 | |
| Outdoor time (> 2h) | −3 | |
| Outdoor time (1–2h) | −2 | |

---

### Step 3 — Final Risk Score

```
if symptomScore == 0:
    riskScore = clamp(totalModifier, 0, 35)   # exposure-only floor, max 35%
else:
    riskScore = clamp(symptomScore + totalModifier, 0, 100)
```

The 35% cap for no-symptom users means: environmental exposure alone can raise risk to at most Moderate — a user without symptoms cannot be classified as High or Critical.

---

### Step 4 — Risk Level Thresholds

| Score range | Risk Level |
|---|---|
| 0–24 | Low |
| 25–49 | Moderate |
| 50–74 | High |
| 75–100 | Critical |

---

### Step 5 — Fatigue Score (0–10, independent)

Fatigue is calculated separately from risk and reflects **accommodation demand** (eye muscle strain), not just symptom load.

| Component | Max contribution |
|---|---|
| Symptom burden: `(cvqRaw / 12) × 5` | 5.0 pts |
| Screen time: `min(hours / 3, 2.5)` | 2.5 pts |
| Sleep deficit (< 6h = +1.5, < 7h = +0.8) | 1.5 pts |
| No breaks taken (+1.0) / 1 break (+0.5) | 1.0 pt |
| **Total max** | **10.0** |

A user with no reported symptoms but 9+ hours of screen time and poor sleep can score high fatigue while remaining Moderate risk — this reflects real-world visual fatigue patterns.

---

### Step 6 — Confidence Score

Confidence ranges from 0.55 to 0.92 and increases with:

| Factor | Bonus |
|---|---|
| Each symptom frequency field answered (max 4) | +0.06 each (max +0.24) |
| Each lifestyle field answered (max 3) | +0.02 each (max +0.06) |
| All environmental fields complete | +0.04 |
| User has 3+ historical logs | +0.03 |
| User has 10+ historical logs | +0.05 |

This makes confidence a proxy for **data completeness**, not model certainty.

---

## 3. Path B — Flask ML Models

### 3.1 Training Data Strategy

The system uses a **hybrid training strategy** depending on how much real data is available:

| Condition | Strategy |
|---|---|
| ≥ 20 real rows in Supabase | Train purely on real data |
| < 20 real rows | Generate 9,000 synthetic samples + append all real rows |

As of the current deployment, the system has **89 rows** in Supabase (`supabase_rows: 89`), which exceeds the 20-row threshold — so the models are trained **entirely on real user data**.

---

### 3.2 Synthetic Data Generation (used when real data < 20 rows)

When real data is insufficient, the `SyntheticDataGenerator` produces realistic simulated logs:

**Generation parameters:**
- **Users simulated:** 300
- **Days per user:** 30
- **Total synthetic samples:** 9,000

**Per-user simulation:**
- Base screen time drawn from `Uniform(4, 14)` hours
- Base risk pattern assigned randomly: Low / Moderate / High / Severe
- Daily variation: `Normal(0, 1)` added to screen time, clipped to [2, 16]h
- Break minutes: proportional to screen time, random up to `(screenTime/12) × 60` minutes
- Symptom probability: `(screenTime/16) × (1 - breakMinutes/60)`, clipped [0,1]
- Symptom count drawn from `[0, 1, 2, 3]` with weights based on symptom probability
- Symptoms drawn from pool of 8 named symptoms (eye strain, blurry vision, headache, etc.)
- Sleep quality: `Uniform(3, 10)`
- Water intake: `Uniform(2, 10)` cups
- Break type: random from [outdoor, rest, exercise, meditation, walk, gaming, social_media]
- Eye exercises: random from [0, 1, 2, 3, 4]
- Blue light filter: random boolean

**Risk label generation (synthetic):**
```
risk_level = min(3, base_risk_pattern + (num_symptoms > 2))
risk_pct   = clamp((screenTime/16×100) + (numSymptoms×15) - (breakMinutes×0.5), 0, 100)
```

**Fatigue label generation (synthetic):**
```
fatigue = (risk_level × 2.5) + (screenTime/16 × 3)
        - (breakEffectiveness × 1.5)
        - (sleepQuality/10 × 2)
        - (waterIntake/8 × 1)
        + Normal(0, 0.5 noise)
clamp(fatigue, 0, 10)
```

---

### 3.3 Real Data Processing (Supabase Loader)

When real data is used, `supabase_loader.py` fetches from `daily_logs` and converts it:

**Columns fetched:**
`screen_time`, `breaks_taken`, `eye_strain`, `headaches`, `blurry_vision`, `dry_eyes`, `brightness`, `sleep_hours`, `risk_level`, `eye_strain_frequency`, `headaches_frequency`, `blurry_vision_frequency`, `dry_eyes_frequency`

**Conversion to training format:**
- Binary symptom fields (1/0) mapped to symptom name strings
- `breaks_taken` multiplied by 5 to convert to minutes
- `sleep_hours` used as proxy for `sleep_quality`
- `water_intake_cups` defaulted to 6 (not collected in the app)
- `break_type` defaulted to `"rest"` (not collected)
- `blue_light_filter` defaulted to `False`

**Risk percentage label (derived from real data):**
```
base_pct     = risk_level_int × 25
screen_bonus = min(screenTime/12 × 20, 20)
symptom_bonus = numSymptoms × 3
risk_pct     = clamp(base_pct + screen_bonus + symptom_bonus, 0, 100)
```

---

### 3.4 Feature Engineering

12 features are extracted from each log entry:

| # | Feature | Description |
|---|---|---|
| 0 | `screen_time_minutes` | Raw screen time in minutes |
| 1 | `break_minutes` | Total break time in minutes |
| 2 | `symptom_index` | Weighted symptom severity 0–1 |
| 3 | `sleep_quality` | Normalised sleep (0–1) |
| 4 | `water_intake_ratio` | Water intake / 8 cups (0–1) |
| 5 | `break_effectiveness` | Break type × duration score (0–1) |
| 6 | `break_ratio` | Actual vs recommended break ratio (0–1) |
| 7 | `symptom_count` | Raw count of symptoms |
| 8 | `had_outdoor_break` | Binary (0 or 1) |
| 9 | `eye_exercises_count` | Number of eye exercise sessions |
| 10 | `blue_light_filter_enabled` | Binary (0 or 1) |
| 11 | `screen_time_ratio` | Screen time as fraction of a 24h day |

All features are **StandardScaler-normalised** before being fed into each model.

---

### 3.5 The Three Models

#### Model 1 — Risk Level Classifier
- **Algorithm:** Random Forest Classifier
- **Output:** Integer 0–3 (Low / Moderate / High / Critical)
- **Hyperparameters:**
  - `n_estimators = 200`
  - `max_depth = 15`
  - `min_samples_split = 5`
  - `min_samples_leaf = 2`
  - `random_state = 42`
  - `n_jobs = -1` (parallel)
- **Validation:** 5-fold cross-validation, metric: accuracy

#### Model 2 — Risk Percentage Regressor
- **Algorithm:** Gradient Boosting Regressor
- **Output:** Float 0–100 (risk percentage)
- **Hyperparameters:**
  - `n_estimators = 200`
  - `learning_rate = 0.1`
  - `max_depth = 8`
  - `min_samples_split = 5`
  - `min_samples_leaf = 2`
  - `subsample = 0.8`
  - `random_state = 42`
- **Validation:** 5-fold cross-validation, metric: R²

#### Model 3 — Fatigue Predictor
- **Algorithm:** Linear Regression
- **Output:** Float 0–10 (fatigue score)
- **Validation:** 5-fold cross-validation, metric: R²

---

### 3.6 Training Split and Validation

- **Method:** 5-fold stratified cross-validation (no held-out test set in production)
- **Train/test split:** Not applied permanently — the full dataset trains the final model; CV scores are reported for diagnostics only
- **Preprocessing:** `StandardScaler` fit on training data, applied to validation folds

---

### 3.7 Auto-Retraining

The Flask backend automatically retrains after every **10 new log submissions**:

1. Next.js calls `POST /api/ml/notify-new-log` after each successful log save
2. Flask increments an internal counter
3. When counter ≥ `RETRAIN_EVERY_N_LOGS` (default 10), a background thread starts retraining
4. The new model atomically replaces the old one in memory
5. Models are persisted to `backend/ml/models/` as `.pkl` files via `pickle`

Threshold is configurable via `RETRAIN_EVERY_N_LOGS` in `backend/.env`.

---

## 4. Model Persistence

Models are serialised to disk using `pickle`:

| File | Contents |
|---|---|
| `risk_classifier.pkl` | `RiskLevelClassifier` (Random Forest + fitted StandardScaler) |
| `risk_regressor.pkl` | `RiskPercentageRegressor` (Gradient Boosting + fitted StandardScaler) |
| `fatigue_predictor.pkl` | `FatiguePredictor` (Linear Regression + fitted StandardScaler) |
| `feature_engineer.pkl` | `FeatureEngineer` (feature name list) |

On Flask startup, if the `.pkl` files exist they are loaded directly (no retraining). If they don't exist, training runs immediately before the server accepts requests.

---

## 5. Current Training State

As of the last Flask startup (confirmed via `/api/ml/status`):

| Metric | Value |
|---|---|
| Model loaded | ✓ Yes |
| Supabase training rows | 89 |
| Training strategy used | Real data only (≥ 20 rows threshold met) |
| New logs since last retrain | 0 |
| Retrain threshold | 10 new logs |

---

## 6. Important Distinction: What the Models Are NOT Doing

The daily risk scores that users see in the app (dashboard, risk prediction page) are produced by **Path A (the rule-based engine)**, not the Flask ML models. The Flask models exist for experimentation and future integration. The rule-based engine was chosen as primary because:

1. It is fully **explainable** — every point can be traced to a specific input and a cited guideline
2. It does not require the Flask server to be running
3. It does not hallucinate — it cannot produce scores that contradict the input data
4. Clinical thresholds (CVS-Q, AOA, ISO, NSF) provide academic grounding for the capstone

The Flask ML models would take over as primary if the codebase were extended to call `POST /api/ml/predict` from the daily log submission flow instead of the rule-based route.

---

## 7. Referenced Guidelines

| Source | Applied to |
|---|---|
| Seguí et al. 2015, *J Clin Epidemiol* — CVS-Q | Symptom weighting and frequency multipliers |
| American Optometric Association (AOA) 2016 | Screen time thresholds, 20-20-20 break rule |
| National Sleep Foundation (NSF) 2020 | Sleep hour thresholds and modifiers |
| Sheppard & Wolffsohn 2018, *Ophthalmic Physiol Opt* | Blue-light filter and sleep interaction |
| ISO 9241-303:2011 | Brightness/luminance optimal range (40–80%) |
| Scheiman et al. 2011, *Optom Vis Sci* | Exercise and ocular blood flow |
| Huang et al. 2015, *Ophthalmology* | Outdoor time and accommodation relief |
