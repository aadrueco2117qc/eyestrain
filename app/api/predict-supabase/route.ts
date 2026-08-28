import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { selectRecommendations, type RecommendationInput } from '@/lib/recommendations';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.json();

    const requiredFields = ['screenTime', 'symptoms', 'sleepHours', 'brightness'];
    for (const field of requiredFields) {
      if (!formData[field] && formData[field] !== 0) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    // ── Profile upsert ────────────────────────────────────────────────────────
    try {
      await supabase.from('user_profiles').upsert({
        user_id: user.id,
        first_name: formData.firstName || '',
        last_name:  formData.lastName  || '',
        age:           formData.age,
        gender:        formData.gender,
        year_level:    formData.yearLevel,
        field_of_study: formData.fieldOfStudy,
      }, { onConflict: 'user_id' });
    } catch { /* non-fatal */ }

    // ── Raw inputs ────────────────────────────────────────────────────────────
    const screenTime  = parseFloat(formData.screenTime)  || 0;
    const sleepHours  = parseFloat(formData.sleepHours)  || 7;
    const brightness  = parseInt(formData.brightness)    || 70;
    const symptoms    = formData.symptoms                 || [];

    // breaksTaken: try the dedicated field first, fall back to 0.
    // The form sends this from the lifestyle section.
    const breaksTaken = parseInt(formData.breaksTaken ?? formData.breaks_taken ?? '0') || 0;

    // Lifestyle signals collected in sections 4–5 of the survey
    const blueLight       = formData.blueLight       ?? '';   // 'Never'|'Sometimes'|'Regularly'|'Always'
    const exerciseFreq    = formData.exerciseFrequency ?? ''; // 'None'|'Minimal'|'Moderate'|'Regular'
    const outdoorTime     = formData.outdoorTime      ?? '';  // '<30min'|'30min–1h'|'1–2h'|'>2h'

    // ── STEP 1 — CVS-Q Symptom Score (primary, max raw = 12) ─────────────────
    // Weighted per Seguí et al. 2015 (J Clin Epidemiol):
    //   Eye strain + Blurry vision : weight 2 each (hallmark CVS symptoms)
    //   Headaches  + Dry eyes      : weight 1 each (secondary symptoms)
    // Frequency multiplier: Never=0 Rarely=0.5 Sometimes=1 Often=1.5 Always=2
    const freqMap: Record<string, number> = {
      'Never':                        0,
      'Rarely (1-2 times a week)':    0.5,
      'Sometimes (3-4 times a week)': 1.0,
      'Often (5-6 times a week)':     1.5,
      'Always (every day)':           2.0,
    };

    const eyeStrainFreq    = freqMap[formData.eyeStrainFrequency    ?? ''] ?? (symptoms.includes('eyeStrain')    ? 1.0 : 0);
    const blurryVisionFreq = freqMap[formData.blurryVisionFrequency ?? ''] ?? (symptoms.includes('blurryVision') ? 1.0 : 0);
    const headachesFreq    = freqMap[formData.headachesFrequency    ?? ''] ?? (symptoms.includes('headaches')    ? 1.0 : 0);
    const dryEyesFreq      = freqMap[formData.dryEyesFrequency      ?? ''] ?? (symptoms.includes('dryEyes')      ? 1.0 : 0);

    // CVS-Q raw score (0–12) → normalised 0–100
    const cvqRawScore =
      (eyeStrainFreq    * 2) +
      (blurryVisionFreq * 2) +
      (headachesFreq    * 1) +
      (dryEyesFreq      * 1);
    const symptomScore = (cvqRawScore / 12) * 100;

    // ── STEP 2 — Environmental exposure modifiers ─────────────────────────────
    // Screen time (AOA 2016):
    //   <2h   → 0      (below CVS onset threshold)
    //   2–6h  → 0→+15  (linear; 6h already exceeds safe threshold)
    //   >6h   → +15→+25 (diminishing returns — heavy users already symptomatic)
    let screenMod = 0;
    if (screenTime >= 2 && screenTime <= 6) {
      screenMod = ((screenTime - 2) / 4) * 15;
    } else if (screenTime > 6) {
      screenMod = 15 + (Math.min(screenTime - 6, 6) / 6) * 10;
    }

    // Sleep (NSF 2020 + Sheppard & Wolffsohn 2018):
    //   7–9h optimal → 0
    //   6–7h         → +6
    //   5–6h         → +10
    //   <5h          → +14
    //   >9h          → +2
    let sleepMod = 0;
    if      (sleepHours < 5)        sleepMod = 14;
    else if (sleepHours < 6)        sleepMod = 10;
    else if (sleepHours < 7)        sleepMod = 6;
    else if (sleepHours <= 9)       sleepMod = 0;
    else                            sleepMod = 2;

    // Brightness (ISO 9241-303: optimal 40–80%):
    //   each 10% outside range = +1.5, max +6
    let brightnessMod = 0;
    if (brightness < 40) {
      brightnessMod = Math.min(((40 - brightness) / 10) * 1.5, 6);
    } else if (brightness > 80) {
      brightnessMod = Math.min(((brightness - 80) / 10) * 1.5, 6);
    }

    // Break adherence (AOA 20-20-20):
    //   Each break taken → –3 points, max –12
    const breakMod = -Math.min(breaksTaken * 3, 12);

    // ── STEP 3 — Lifestyle bonus modifiers (protective factors) ───────────────
    // Blue-light filter usage reduces photostress (Sheppard & Wolffsohn 2018)
    const blueLightMod =
      blueLight === 'Always'     ? -4 :
      blueLight === 'Regularly'  ? -2 :
      blueLight === 'Sometimes'  ? -1 : 0;

    // Regular exercise improves ocular blood flow (Scheiman et al. 2011)
    const exerciseMod =
      exerciseFreq === 'Regular'   ? -3 :
      exerciseFreq === 'Moderate'  ? -1.5 :
      exerciseFreq === 'Minimal'   ? -0.5 : 0;

    // Outdoor time — distance viewing rests accommodation (Huang et al. 2015)
    const outdoorMod =
      outdoorTime === '>2h'        ? -3 :
      outdoorTime === '1–2h'       ? -2 :
      outdoorTime === '30min–1h'   ? -1 : 0;

    const totalModifier =
      screenMod + sleepMod + brightnessMod + breakMod +
      blueLightMod + exerciseMod + outdoorMod;

    // ── STEP 4 — Final risk score ─────────────────────────────────────────────
    // Primary path: symptoms drive the score; environment scales it.
    // Exposure path: even with no symptoms, sustained exposure creates real risk
    //   (capped at 35% — not a diagnosis, but a meaningful early-warning floor).
    let riskScore: number;
    if (symptomScore === 0) {
      riskScore = Math.max(0, Math.min(35, totalModifier));
    } else {
      riskScore = Math.max(0, Math.min(100, symptomScore + totalModifier));
    }
    riskScore = parseFloat(riskScore.toFixed(1));

    // ── STEP 5 — Risk level thresholds ───────────────────────────────────────
    // Aligned with CVS-Q clinical threshold (≥6/12 = 50% → High)
    let riskLevel = 0;
    if      (riskScore < 25) riskLevel = 0; // Low
    else if (riskScore < 50) riskLevel = 1; // Moderate
    else if (riskScore < 75) riskLevel = 2; // High
    else                     riskLevel = 3; // Critical

    // ── STEP 6 — Independent fatigue score (0–10) ─────────────────────────────
    // Fatigue is driven by accommodation demand and blink-rate reduction,
    // NOT purely by risk percentage. It weights:
    //   • Symptom burden (primary — directly reflects visual fatigue)
    //   • Screen time duration (accommodation load)
    //   • Sleep deficit (recovery impairment)
    //   • Break absence (no accommodative relief)
    // Capped independently so a low-symptom user with extreme screen time
    // can still show high fatigue while having moderate risk.
    const symptomFatigue  = (cvqRawScore / 12) * 5;          // 0–5 pts from symptoms
    const screenFatigue   = Math.min(screenTime / 3, 2.5);   // 0–2.5 pts (max at 7.5h)
    const sleepFatigue    = sleepHours < 6 ? 1.5 : sleepHours < 7 ? 0.8 : 0;  // 0–1.5 pts
    const breakFatigue    = breaksTaken === 0 ? 1.0 : breaksTaken === 1 ? 0.5 : 0; // 0–1 pt
    const fatigueRaw      = symptomFatigue + screenFatigue + sleepFatigue + breakFatigue;
    const fatigueScore    = parseFloat(Math.min(10, Math.max(0, fatigueRaw)).toFixed(1));

    // ── STEP 7 — Confidence ───────────────────────────────────────────────────
    // Reflects both form completeness AND historical depth.
    // More logged days = more reliable pattern recognition.
    const symptomFieldsAnswered = [
      formData.eyeStrainFrequency,
      formData.blurryVisionFrequency,
      formData.headachesFrequency,
      formData.dryEyesFrequency,
    ].filter(Boolean).length;
    const lifestyleFieldsAnswered = [blueLight, exerciseFreq, outdoorTime].filter(Boolean).length;
    const envFieldsComplete = !!(formData.sleepHours && formData.brightness && formData.screenTime);

    // History depth bonus: fetch count of prior logs
    let historyBonus = 0;
    try {
      const { count } = await supabase
        .from('daily_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      if (count && count >= 14) historyBonus = 0.08;
      else if (count && count >= 7)  historyBonus = 0.05;
      else if (count && count >= 3)  historyBonus = 0.02;
    } catch { /* non-fatal */ }

    const confidence = parseFloat(Math.min(
      0.92,
      0.55
      + (symptomFieldsAnswered  * 0.06)   // max +0.24
      + (lifestyleFieldsAnswered * 0.02)  // max +0.06
      + (envFieldsComplete ? 0.04 : 0)
      + historyBonus
    ).toFixed(3));

    // ── Recommendations ───────────────────────────────────────────────────────
    const recInput: RecommendationInput = {
      screenTime,
      sleepHours,
      brightness,
      riskLevel: ['Low', 'Moderate', 'High', 'Critical'][riskLevel],
      eyeStrain:    eyeStrainFreq    > 0 ? 1 : 0,
      headaches:    headachesFreq    > 0 ? 1 : 0,
      blurryVision: blurryVisionFreq > 0 ? 1 : 0,
      dryEyes:      dryEyesFreq      > 0 ? 1 : 0,
    };
    const recommendations = await selectRecommendations(recInput);

    // ── Save daily log ────────────────────────────────────────────────────────
    const today = new Date().toISOString().split('T')[0];

    const { data: dailyLog, error: logError } = await supabase
      .from('daily_logs')
      .upsert({
        user_id:   user.id,
        date:      today,
        email:     user.email,
        age:           formData.age,
        gender:        formData.gender,
        year_level:    formData.yearLevel,
        field_of_study: formData.fieldOfStudy,
        academic_screen_time:     formData.academicScreenTime,
        non_academic_screen_time: formData.nonAcademicScreenTime,
        screen_time:   screenTime,
        breaks_taken:  breaksTaken,
        primary_device: formData.primaryDevice,
        eye_strain:           eyeStrainFreq    > 0 ? 1 : 0,
        eye_strain_frequency: formData.eyeStrainFrequency,
        headaches:            headachesFreq    > 0 ? 1 : 0,
        headaches_frequency:  formData.headachesFrequency,
        blurry_vision:           blurryVisionFreq > 0 ? 1 : 0,
        blurry_vision_frequency: formData.blurryVisionFrequency,
        dry_eyes:           dryEyesFreq  > 0 ? 1 : 0,
        dry_eyes_frequency: formData.dryEyesFrequency,
        brightness:  brightness,
        sleep_hours: sleepHours,
        notes:       formData.notes,
        risk_level:  ['Low', 'Moderate', 'High', 'Critical'][riskLevel],
      }, { onConflict: 'user_id,date' })
      .select()
      .single();

    if (logError) {
      console.error('Error saving daily log:', logError);
      return NextResponse.json({ error: 'Failed to save daily log' }, { status: 500 });
    }

    // Delete old prediction for this log before inserting fresh one
    await supabase.from('predictions').delete().eq('daily_log_id', dailyLog.id);

    const { data: prediction, error: predictionError } = await supabase
      .from('predictions')
      .insert({
        user_id:        user.id,
        daily_log_id:   dailyLog.id,
        risk_level:     riskLevel,
        risk_percentage: riskScore,
        fatigue_score:  fatigueScore,
        confidence:     confidence,
        recommendations: recommendations,
      })
      .select()
      .single();

    if (predictionError) {
      console.error('Error saving prediction:', predictionError);
      return NextResponse.json({ error: 'Failed to save prediction' }, { status: 500 });
    }

    // Fire-and-forget Flask retrain notification
    const flaskBase = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
    fetch(`${flaskBase}/api/ml/notify-new-log`, { method: 'POST' }).catch(() => {});

    return NextResponse.json({
      success:          true,
      daily_log_id:     dailyLog.id,
      prediction_id:    prediction.id,
      risk_level:       riskLevel,
      risk_percentage:  riskScore,
      fatigue_score:    fatigueScore,
      confidence:       confidence,
      recommendations:  recommendations,
      // Expose component scores so the page can display them without recalculating
      score_breakdown: {
        symptomScore:    parseFloat(symptomScore.toFixed(1)),
        screenMod:       parseFloat(screenMod.toFixed(1)),
        sleepMod:        parseFloat(sleepMod.toFixed(1)),
        brightnessMod:   parseFloat(brightnessMod.toFixed(1)),
        breakMod:        parseFloat(breakMod.toFixed(1)),
        blueLightMod:    parseFloat(blueLightMod.toFixed(1)),
        exerciseMod:     parseFloat(exerciseMod.toFixed(1)),
        outdoorMod:      parseFloat(outdoorMod.toFixed(1)),
        totalModifier:   parseFloat(totalModifier.toFixed(1)),
        cvqRawScore:     parseFloat(cvqRawScore.toFixed(2)),
      },
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
