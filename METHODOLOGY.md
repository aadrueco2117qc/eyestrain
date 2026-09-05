# EyeGuard — Risk Prediction Methodology

## Overview

EyeGuard uses a **rule-based scoring system** grounded in clinically validated instruments and published ergonomics standards to estimate a user's risk of Computer Vision Syndrome (CVS). This document explains every calculation, its source, and the evidence basis behind it.

---

## 1. Risk Score Calculation

### Primary Component — CVS-Q Symptom Score

**Basis:** Seguí MM, Cabrero-García J, Crespo A, Verdú J, Ronda E.
*"A reliable and valid questionnaire was developed to measure computer vision syndrome at the workplace."*
Journal of Clinical Epidemiology, 2015; 68(6): 662–73.
DOI: [10.1016/j.jclinepi.2015.01.011](https://doi.org/10.1016/j.jclinepi.2015.01.011)

The CVS-Q assigns weighted scores to four core symptoms:

| Symptom        | CVS-Q Weight | Reason                                              |
|----------------|:------------:|-----------------------------------------------------|
| Eye Strain     | 2            | Primary hallmark symptom of CVS (asthenopia)        |
| Blurry Vision  | 2            | High-weighted CVS indicator (accommodative stress)  |
| Headaches      | 1            | Secondary symptom, moderately associated with CVS   |
| Dry Eyes       | 1            | Secondary symptom (reduced blink rate at screen)    |

Each symptom is multiplied by a **frequency multiplier** derived from the CVS-Q ordinal scale:

| Reported Frequency          | Multiplier |
|-----------------------------|:----------:|
| Never                       | 0          |
| Rarely (1–2 times/week)     | 0.5        |
| Sometimes (3–4 times/week)  | 1.0        |
| Often (5–6 times/week)      | 1.5        |
| Always (every day)          | 2.0        |

**CVS-Q Raw Score** = (Eye Strain × 2) + (Blurry Vision × 2) + (Headaches × 1) + (Dry Eyes × 1)
- Maximum raw score = **12**
- Clinical CVS diagnosis threshold: raw score **≥ 6** (50%)

**Normalised Symptom Score (0–100%)** = (CVS-Q Raw Score / 12) × 100

---

### Secondary Components — Environmental Modifiers

These adjust the symptom score up or down based on known environmental risk factors. They cannot exceed ±35 points combined, ensuring symptoms remain the primary driver.

#### 1. Screen Time (max +25)
**Basis:** American Optometric Association (AOA). *Digital Eye Strain Report*, 2016.
- Clinical onset threshold: **≥ 2 hours** continuous screen use
- High exposure threshold: **≥ 6 hours/day**

| Screen Time | Modifier |
|-------------|----------|
| < 2 hours   | +0       |
| 2–6 hours   | +0 to +15 (linear) |
| > 6 hours   | +15 to +25 (diminishing scale) |

#### 2. Sleep (max +14)
**Basis:** National Sleep Foundation. *Sleep Duration Recommendations*, 2020.
Sheppard AL, Wolffsohn JS. *Digital eye strain: prevalence, measurement and amelioration.* BMJ Open Ophthalmology, 2018; 3(1): e000146.
- Optimal range: **7–9 hours** (supports tear film stability and ocular surface recovery)

| Sleep Hours | Modifier |
|-------------|----------|
| 7–9h        | +0 (optimal) |
| 6–7h        | +6 |
| 5–6h        | +10 |
| < 5h        | +14 |
| > 9h        | +2 |

#### 3. Screen Brightness (max +6)
**Basis:** ISO 9241-303:2011. *Ergonomics of Human-System Interaction — Requirements for Electronic Visual Displays.*
- Optimal luminance range: **40–80%** of screen maximum (minimises glare and contrast strain)

Each 10% deviation outside the 40–80% range adds +1.5 points, capped at +6.

#### 4. Eye Breaks / 20-20-20 Rule (max −12)
**Basis:** AOA. *20-20-20 Rule for Computer Users*, endorsed clinical recommendation.
Every 20 minutes, look at something 20 feet away for 20 seconds. This relieves accommodative fatigue.

Each break taken = **−3 points**, capped at −12.

#### 5. Blue Light Filter Usage (max −4)
**Basis:** Sheppard AL, Wolffsohn JS. BMJ Open Ophthalmology, 2018.
- Blue-light filtering reduces photostress and improves visual comfort.

| Usage          | Modifier |
|----------------|----------|
| Never          | +0       |
| Sometimes      | −1       |
| Regularly      | −2       |
| Always         | −4       |

#### 6. Exercise Frequency (max −3)
**Basis:** Scheiman M et al. *Clinical Management of Binocular Vision.* Lippincott Williams & Wilkins, 2011.
Regular physical activity improves ocular blood flow and reduces systemic fatigue contributing to eye strain.

| Exercise       | Modifier |
|----------------|----------|
| None           | +0       |
| Minimal        | −0.5     |
| Moderate       | −1.5     |
| Regular        | −3       |

#### 7. Outdoor Time (max −3)
**Basis:** Huang HM, Chang DS, Wu PC. *The Association between Near Work Activities and Myopia in Children.* PLOS ONE, 2015.
Distance viewing outdoors rests the accommodative system and reduces sustained near-focus fatigue.

| Outdoor Time   | Modifier |
|----------------|----------|
| < 30 min       | +0       |
| 30 min–1h      | −1       |
| 1–2h           | −2       |
| > 2h           | −3       |

---

### Final Risk Score Formula

```
If symptomScore = 0:
  riskScore = max(0, min(35, totalModifier))
  // No symptoms → risk is purely environmental exposure, capped at 35%

Else:
  riskScore = max(0, min(100, symptomScore + totalModifier))
```

**Risk Level Thresholds** (aligned with CVS-Q clinical cutoff):

| Score    | Level    | Meaning                                          |
|----------|----------|--------------------------------------------------|
| 0–24%    | Low      | Below clinical significance                      |
| 25–49%   | Moderate | Approaching CVS threshold — monitor habits       |
| 50–74%   | High     | Meets CVS diagnosis criteria (≥6/12 on CVS-Q)   |
| ≥75%     | Critical | Severe CVS — clinical consultation recommended   |

---

## 2. Fatigue Score (0–10)

The fatigue score is calculated **independently** from the risk score. It represents visual fatigue severity driven by accommodation demand and blink-rate reduction — not just overall risk.

```
symptomFatigue = (CVS-Q raw score / 12) × 5     → 0–5 pts
screenFatigue  = min(screenTime / 3, 2.5)        → 0–2.5 pts (max at 7.5h)
sleepFatigue   = <6h: 1.5 | <7h: 0.8 | else: 0  → 0–1.5 pts
breakFatigue   = 0 breaks: 1.0 | 1 break: 0.5   → 0–1 pt

fatigueScore   = min(10, symptomFatigue + screenFatigue + sleepFatigue + breakFatigue)
```

This means a user with many symptoms but adequate screen time will show moderate fatigue, while a user with extreme screen time but no symptoms will still show meaningful fatigue from accommodation load.

---

## 3. Data Completeness (formerly "Model Confidence")

This metric reflects **how complete the user's daily log was**, not a statistical probability. It is calculated as:

```
base             = 0.55
symptomFields    = +0.06 per answered symptom frequency (max +0.24, 4 fields)
lifestyleFields  = +0.02 per answered lifestyle field (max +0.06, 3 fields)
envFields        = +0.04 if screen time, brightness, and sleep hours all provided
historyBonus     = +0.08 if ≥14 logs | +0.05 if ≥7 logs | +0.02 if ≥3 logs
ceiling          = 0.92
```

**Why not higher than 92%?** A rule-based model — no matter how well filled out — cannot claim the same confidence as a trained model validated against labeled outcomes. 92% is the honest ceiling for a fully-completed rule-based assessment.

---

## 4. Trends Analysis

The Trends page plots `risk_percentage` and `fatigue_score` from stored `predictions` rows over time. No additional calculation is performed — these are the same values computed at submission and persisted to the database.

**Trend Insights** are derived by comparing the current 30-day window average against the prior 30-day window average to detect improvement or deterioration direction.

---

## 5. Factor Analysis

The Factor Analysis page decomposes the user's risk score into its contributing components by re-running the same formulas from the API against the stored log data. Each factor bar shows:

- The raw value logged (e.g., "12h screen time")
- The modifier that factor contributed to the final score
- A colour-coded status (green = optimal, yellow = warning, red = high risk)
- The source citation for that factor's threshold

---

## 6. Accuracy and Limitations

### What the system can claim:
- The CVS-Q instrument has published sensitivity/specificity data. Seguí et al. (2015) report **Cronbach's α = 0.89** (high internal consistency) and validated against clinical ophthalmologist assessment.
- Environmental thresholds are drawn from peer-reviewed ergonomics standards and clinical guidelines, not invented.
- The system correctly identifies users who report multiple high-frequency symptoms as high risk — consistent with CVS-Q clinical findings.

### What the system cannot claim:
- This is **not a trained machine learning model**. The weights are clinically derived, not learned from data.
- The system cannot diagnose eye conditions. It assesses **risk of CVS-like symptoms**, not underlying pathology.
- "Data completeness" is not a statistical confidence interval. It should not be interpreted as "85% probability of being correct."
- Accuracy improves as users log consistently over time — a single log provides limited pattern information.

### Intended Use:
EyeGuard is a **screening and awareness tool** designed to help students identify behavioural risk factors associated with digital eye strain. It is not a substitute for professional ophthalmological assessment.

---

## References

1. Seguí MM, et al. *A reliable and valid questionnaire was developed to measure computer vision syndrome at the workplace.* J Clin Epidemiol. 2015;68(6):662-73. DOI: 10.1016/j.jclinepi.2015.01.011

2. American Optometric Association. *Digital Eye Strain Report.* AOA, 2016. Available at: aoa.org

3. National Sleep Foundation. *Sleep Duration Recommendations.* NSF, 2020. Available at: sleepfoundation.org

4. ISO 9241-303:2011. *Ergonomics of Human-System Interaction — Part 303: Requirements for Electronic Visual Displays.* ISO, 2011.

5. Sheppard AL, Wolffsohn JS. *Digital eye strain: prevalence, measurement and amelioration.* BMJ Open Ophthalmology. 2018;3(1):e000146. DOI: 10.1136/bmjophth-2018-000146

6. Huang HM, Chang DS, Wu PC. *The Association between Near Work Activities and Myopia in Children — A Systematic Review and Meta-Analysis.* PLOS ONE. 2015;10(10):e0140419.

7. Scheiman M, Wick B. *Clinical Management of Binocular Vision.* 4th ed. Lippincott Williams & Wilkins, 2014.
