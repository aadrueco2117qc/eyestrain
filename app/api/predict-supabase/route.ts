import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { selectRecommendations, type RecommendationInput } from '@/lib/recommendations';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await request.json();

    // Validate required fields
    const requiredFields = ['screenTime', 'symptoms', 'sleepHours', 'brightness'];
    for (const field of requiredFields) {
      if (!formData[field] && formData[field] !== 0) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Save or update user profile
    try {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          first_name: formData.firstName || '',
          last_name: formData.lastName || '',
          age: formData.age,
          gender: formData.gender,
          year_level: formData.yearLevel,
          field_of_study: formData.fieldOfStudy,
        }, { onConflict: 'id' });

      if (profileError) {
        console.warn('Warning: Could not save user profile:', profileError);
        // Don't fail the entire request if profile save fails
      }
    } catch (profileErr) {
      console.warn('Warning: Profile save error:', profileErr);
    }

    // -------------------------------------------------------------------------
    // RISK CALCULATION — based on the Computer Vision Syndrome Questionnaire
    // (CVS-Q) validated instrument by Seguí et al. (2015), J Clin Epidemiol,
    // 68(6):662-73. DOI: 10.1016/j.jclinepi.2015.01.011
    //
    // Environmental modifiers are grounded in:
    //   - AOA Digital Eye Strain Report (2016): ≥2h continuous screen use
    //     associated with CVS onset; ≥6h/day considered high-exposure threshold
    //   - National Sleep Foundation (2020): <7h sleep impairs blink reflex
    //     and tear film stability, worsening dry eye and eye strain
    //   - ISO 9241-303:2011 (Visual Display Ergonomics): screen luminance
    //     40–80% of ambient light is the ergonomic optimal range
    //   - AOA 20-20-20 Rule: regular breaks reduce accommodative fatigue
    // -------------------------------------------------------------------------

    const screenTime   = parseFloat(formData.screenTime)  || 0;
    const sleepHours   = parseFloat(formData.sleepHours)  || 7;
    const brightness   = parseInt(formData.brightness)    || 70;
    const symptoms     = formData.symptoms                 || [];
    const breaksTaken  = parseInt(formData.breaksTaken)   || 0;

    // ------------------------------------------------------------------
    // STEP 1 — CVS-Q Symptom Score (primary component, max raw = 12)
    //
    // CVS-Q assigns weighted severity to each symptom category:
    //   Eye strain (asthenopia) : weight 2   — highest-weighted CVS symptom
    //   Blurry vision           : weight 2   — high-weighted CVS symptom
    //   Headaches               : weight 1   — moderate CVS symptom
    //   Dry eyes                : weight 1   — moderate CVS symptom
    //
    // Frequency multiplier (0–2 scale per CVS-Q ordinal scoring):
    //   Never = 0 | Rarely = 0.5 | Sometimes = 1 | Often = 1.5 | Always = 2
    //
    // Max possible raw score = (2+2+1+1) × 2 = 12
    // CVS diagnosis threshold ≥ 6 (Seguí et al. 2015)
    // ------------------------------------------------------------------
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

    // CVS-Q weighted symptom score (max 12)
    const cvqRawScore =
      (eyeStrainFreq    * 2) +  // weight 2
      (blurryVisionFreq * 2) +  // weight 2
      (headachesFreq    * 1) +  // weight 1
      (dryEyesFreq      * 1);   // weight 1

    // Normalise to 0–100 (dividing by max possible score of 12)
    // This is the primary driver: CVS symptoms are the gold-standard
    // diagnostic criterion (Seguí et al. 2015)
    const symptomScore = (cvqRawScore / 12) * 100;

    // ------------------------------------------------------------------
    // STEP 2 — Environmental Risk Modifiers
    //
    // These do not replace the symptom score; they scale it up or down
    // based on clinically identified exposure factors. Combined modifier
    // is capped at +30 / -10 to prevent symptoms being overshadowed.
    // ------------------------------------------------------------------

    // Screen time modifier (AOA 2016):
    //   < 2h  → no added risk (below CVS onset threshold)
    //   2–6h  → low–moderate exposure, linear scale 0→+10
    //   > 6h  → high exposure, linear scale 10→+20 (max at 12h+)
    let screenMod = 0;
    if (screenTime >= 2 && screenTime <= 6) {
      screenMod = ((screenTime - 2) / 4) * 10;    // 0 to +10
    } else if (screenTime > 6) {
      screenMod = 10 + (Math.min(screenTime - 6, 6) / 6) * 10; // +10 to +20
    }

    // Sleep modifier (NSF 2020):
    //   7–9h optimal → 0 modifier
    //   6–7h         → +5  (mild impairment of tear film stability)
    //   5–6h         → +8
    //   < 5h         → +10 (significant impairment)
    //   > 9h         → +2  (slight over-sleep fatigue)
    let sleepMod = 0;
    if (sleepHours < 5)        sleepMod = 10;
    else if (sleepHours < 6)   sleepMod = 8;
    else if (sleepHours < 7)   sleepMod = 5;
    else if (sleepHours <= 9)  sleepMod = 0;  // optimal
    else                       sleepMod = 2;

    // Brightness modifier (ISO 9241-303):
    //   40–80% optimal range → 0 modifier
    //   Outside range: each 10% deviation = +1 point, max +5
    let brightnessMod = 0;
    if (brightness < 40) {
      brightnessMod = Math.min(((40 - brightness) / 10), 5);
    } else if (brightness > 80) {
      brightnessMod = Math.min(((brightness - 80) / 10), 5);
    }

    // Break modifier (AOA 20-20-20 rule):
    //   Each break = –2 points, max –10 reduction
    //   (breaks reduce accommodative fatigue)
    const breakMod = -Math.min(breaksTaken * 2, 10);

    const totalModifier = screenMod + sleepMod + brightnessMod + breakMod;

    // ------------------------------------------------------------------
    // STEP 3 — Final Risk Score
    //
    // Symptoms are primary (CVS-Q validated); environment modifies.
    // If symptom score = 0 but environment is severe, a baseline
    // exposure risk of up to 20% is still possible.
    // ------------------------------------------------------------------
    let riskScore: number;
    if (symptomScore === 0) {
      // No symptoms reported — risk is purely environmental exposure
      riskScore = Math.max(0, Math.min(20, totalModifier));
    } else {
      riskScore = Math.max(0, Math.min(100, symptomScore + totalModifier));
    }

    // ------------------------------------------------------------------
    // STEP 4 — Risk Level Thresholds (aligned with CVS-Q)
    //
    // CVS-Q diagnosis threshold: raw score ≥ 6 out of 12 (50%)
    //   < 25%  → Low       (below clinical significance)
    //   25–49% → Moderate  (approaching CVS threshold)
    //   50–74% → High      (meets CVS diagnosis criteria)
    //   ≥ 75%  → Critical  (severe CVS, recommend clinical consultation)
    // ------------------------------------------------------------------
    let riskLevel = 0;
    if      (riskScore < 25) riskLevel = 0;
    else if (riskScore < 50) riskLevel = 1;
    else if (riskScore < 75) riskLevel = 2;
    else                     riskLevel = 3;

    // Fatigue score (0–10): proportional to risk, represents
    // visual fatigue severity consistent with CVS symptom burden
    const fatigueScore = parseFloat(((riskScore / 100) * 10).toFixed(1));

    // ------------------------------------------------------------------
    // STEP 5 — Confidence
    //
    // Confidence reflects data completeness, not a trained probability.
    // Base: 0.65 (rule-based floor)
    // +0.05 per symptom frequency answered (max 4 × 0.05 = +0.20)
    // +0.05 if all environmental fields present
    // Capped at 0.90 — a rule-based model cannot claim >90% confidence
    // ------------------------------------------------------------------
    const symptomFieldsAnswered = [
      formData.eyeStrainFrequency,
      formData.blurryVisionFrequency,
      formData.headachesFrequency,
      formData.dryEyesFrequency,
    ].filter(Boolean).length;

    const envFieldsComplete = !!(formData.sleepHours && formData.brightness && formData.screenTime);

    const confidence = Math.min(
      0.90,
      0.65 + (symptomFieldsAnswered * 0.05) + (envFieldsComplete ? 0.05 : 0)
    );

    // Symptom count for recommendations engine (unchanged interface)
    const symptomCount = [eyeStrainFreq, blurryVisionFreq, headachesFreq, dryEyesFreq]
      .filter(f => f > 0).length;

    // Generate personalized recommendations using the dynamic recommendation engine
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

    // Save daily log to Supabase (use upsert to handle updates)
    const today = new Date().toISOString().split('T')[0];
    
    const { data: dailyLog, error: logError } = await supabase
      .from('daily_logs')
      .upsert({
        user_id: user.id,
        date: today,
        email: user.email,
        age: formData.age,
        gender: formData.gender,
        year_level: formData.yearLevel,
        field_of_study: formData.fieldOfStudy,
        academic_screen_time: formData.academicScreenTime,
        non_academic_screen_time: formData.nonAcademicScreenTime,
        screen_time: screenTime,
        breaks_taken: formData.breaksTaken || 0,
        primary_device: formData.primaryDevice,
        eye_strain: eyeStrainFreq > 0 ? 1 : 0,
        eye_strain_frequency: formData.eyeStrainFrequency,
        headaches: headachesFreq > 0 ? 1 : 0,
        headaches_frequency: formData.headachesFrequency,
        blurry_vision: blurryVisionFreq > 0 ? 1 : 0,
        blurry_vision_frequency: formData.blurryVisionFrequency,
        dry_eyes: dryEyesFreq > 0 ? 1 : 0,
        dry_eyes_frequency: formData.dryEyesFrequency,
        brightness: brightness,
        sleep_hours: sleepHours,
        notes: formData.notes,
        risk_level: ['Low', 'Moderate', 'High', 'Critical'][riskLevel],
      }, { onConflict: 'user_id,date' })
      .select()
      .single();

    if (logError) {
      console.error('Error saving daily log:', logError);
      return NextResponse.json(
        { error: 'Failed to save daily log' },
        { status: 500 }
      );
    }

    // Delete old predictions for this daily log (if updating)
    await supabase
      .from('predictions')
      .delete()
      .eq('daily_log_id', dailyLog.id);

    // Save new prediction to Supabase
    const { data: prediction, error: predictionError } = await supabase
      .from('predictions')
      .insert({
        user_id: user.id,
        daily_log_id: dailyLog.id,
        risk_level: riskLevel,
        risk_percentage: riskScore,
        fatigue_score: fatigueScore,
        confidence: confidence,
        recommendations: recommendations,
      })
      .select()
      .single();

    if (predictionError) {
      console.error('Error saving prediction:', predictionError);
      return NextResponse.json(
        { error: 'Failed to save prediction' },
        { status: 500 }
      );
    }

    // Fire-and-forget: notify Flask backend that a new log was saved
    // so it can auto-retrain when the threshold is reached.
    const flaskUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
    fetch(`${flaskUrl}/api/ml/notify-new-log`, { method: 'POST' }).catch(() => {
      // Ignore errors — Flask backend may not be running
    });

    return NextResponse.json({
      success: true,
      daily_log_id: dailyLog.id,
      prediction_id: prediction.id,
      risk_level: riskLevel,
      risk_percentage: riskScore,
      fatigue_score: fatigueScore,
      confidence: confidence,
      recommendations: recommendations,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
