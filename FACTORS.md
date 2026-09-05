# EyeGuard Factors

## What This Page Measures

EyeGuard has two related views:

- **Risk Prediction** explains the user's latest daily status.
- **Factor Analysis** explains longer-term patterns across all stored daily logs.

They use related health inputs, but their percentages answer different questions.

## Symptom Frequency Analysis

The **Symptom Frequency Analysis** on Factor Analysis is a percentage of logged days on which each symptom was reported.

For each symptom:

```text
frequency percentage = (days with symptom present / total logged days) x 100
```

The symptom fields are treated as present when their stored value is `1`:

- Eye Strain: `eye_strain = 1`
- Headaches: `headaches = 1`
- Dry Eyes: `dry_eyes = 1`
- Blurry Vision: `blurry_vision = 1`

Example: if dry eyes were reported on 6 of 7 logged days:

```text
(6 / 7) x 100 = 85.7%, displayed as 86%
```

This is a prevalence measure. It does **not** include symptom frequency multipliers or the risk-level threshold by itself.

## Current Risk Page Factors

The Risk Prediction page uses the newest daily log to explain the current score.

### Symptoms

The current symptom bar uses the CVS-Q weighting:

| Symptom | Weight |
| --- | ---: |
| Eye Strain | 2 |
| Blurry Vision | 2 |
| Headaches | 1 |
| Dry Eyes | 1 |

Each reported frequency is converted to a multiplier:

| Frequency | Multiplier |
| --- | ---: |
| Never | 0 |
| Rarely | 0.5 |
| Sometimes | 1.0 |
| Often | 1.5 |
| Always | 2.0 |

```text
CVS-Q raw score =
  (eye strain x 2) + (blurry vision x 2) + headaches + dry eyes

current symptom percentage = (CVS-Q raw score / 12) x 100
```

The maximum raw score is 12. This is different from Symptom Frequency Analysis: one is the severity of the newest log, while the other is the percentage of historical logs containing a symptom.

### Screen Time

On the Risk page, the latest daily screen time is displayed against a 12-hour reference scale:

```text
screen bar percentage = min(screen time / 12, 1) x 100
```

Status labels are:

- Under 5 hours: good
- 5 to under 8 hours: warning
- 8 hours or more: high risk

### Sleep

The latest sleep value is inverted because less sleep means more risk. Nine hours is treated as the healthy reference and four hours as the high-risk end:

```text
sleep bar percentage = clamp(((9 - sleep hours) / 5) x 100, 0, 100)
```

Status labels are:

- 7 hours or more: good
- 5 to under 7 hours: warning
- Under 5 hours: high risk

### Screen Brightness

Brightness between 40% and 80% is treated as the optimal range. The bar shows deviation outside that range:

```text
brightness deviation = 40 - brightness, when brightness < 40
                     = brightness - 80, when brightness > 80
                     = 0, otherwise

brightness bar percentage = min(brightness deviation / 40, 1) x 100
```

### Eye Breaks

Eye breaks are no longer shown as a contributing-factor card. When fewer than three breaks are recorded, they appear as a recommendation instead, using the 20-20-20 rule as the practical action.

## Factor Analysis Long-Term Risk

Factor Analysis averages the stored values across all user logs and calculates a separate long-term exposure score. Its five factors are:

| Factor | Maximum contribution |
| --- | ---: |
| Average screen time | 35 points |
| Average sleep deficit | 20 points |
| Average symptom burden | 30 points |
| Average eye-break deficit | 10 points |
| Average brightness deviation | 5 points |

The long-term total is:

```text
overall risk = clamp(screen risk + sleep risk + symptom risk
                     + break risk + brightness risk, 0, 100)
```

The implemented formulas are:

```text
screen risk     = min(35, 35 x log2(1 + average screen time / 6))
sleep risk      = clamp(((9 - average sleep) / 5) x 20, 0, 20)
symptom risk    = average normalized symptom burden x 30
break risk      = clamp(10 x (1 - average breaks / 3), 0, 10)
brightness risk = deviation outside 40-80%, capped at 5
```

For long-term symptom burden, each log is normalized by 8:

```text
log symptom burden =
  ((eye strain x 2) + (blurry vision x 2) + headaches + dry eyes) / 8
```

Long-term risk levels are:

- **Low:** below 25
- **Moderate:** 25 to under 50
- **High:** 50 to under 75
- **Critical:** 75 or higher

## Important Distinction

The Risk page answers:

> What is happening in my latest log, and what should I do now?

Factor Analysis answers:

> What patterns across my logged history are contributing to longer-term exposure?

The Risk page's symptom percentage and Factor Analysis' Symptom Frequency Analysis should therefore not be compared as if they were the same score.

## Methodology Basis

The underlying symptom weighting and thresholds are summarized from `METHODOLOGY.md`, including the CVS-Q symptom model, screen-time guidance, sleep guidance, brightness range, and the 20-20-20 break recommendation. EyeGuard is a screening and awareness tool, not a medical diagnosis.
