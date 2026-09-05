import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Gemini models to try in order (newest first)
const GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.7-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.5-pro'];
const GEMINI_BASE   = 'https://generativelanguage.googleapis.com/v1/models';

export async function POST(request: NextRequest) {
  try {
    const { message, history } = await request.json();
    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // ── Build a complete, user-scoped context from Supabase ────────────
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
    }

    const [profileResult, logsResult, predictionsResult, progressResult, settingsResult] = await Promise.all([
      supabase.from('user_profiles')
        .select('first_name, last_name, age, gender, year_level, field_of_study, baseline_risk_level, medical_history, preferred_contact_method, opt_in_communications')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase.from('daily_logs')
        .select('date, academic_screen_time, non_academic_screen_time, screen_time, primary_device, breaks_taken, brightness, sleep_hours, eye_strain, eye_strain_frequency, headaches, headaches_frequency, blurry_vision, blurry_vision_frequency, dry_eyes, dry_eyes_frequency, risk_level, notes')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(90),
      supabase.from('predictions')
        .select('risk_level, risk_percentage, fatigue_score, confidence, recommendations, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase.from('user_progress')
        .select('total_logs_count, consecutive_days, last_log_date, avg_screen_time_week, avg_sleep_hours_week, avg_risk_score_week, daily_screen_time_goal, daily_sleep_hours_goal')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase.from('user_settings')
        .select('enable_email_notifications, enable_daily_reminders, reminder_time, theme, language, share_data_for_research, allow_data_export')
        .eq('user_id', user.id)
        .maybeSingle(),
    ]);

    const queryErrors = [
      profileResult.error,
      logsResult.error,
      predictionsResult.error,
      progressResult.error,
      settingsResult.error,
    ].filter(Boolean);
    if (queryErrors.length > 0) {
      console.error('Failed to load user chat context:', queryErrors);
    }

    const profile = profileResult.data;
    const logs = logsResult.data ?? [];
    const predictions = predictionsResult.data ?? [];
    const progress = progressResult.data;
    const settings = settingsResult.data;
    const riskLabels = ['Low', 'Moderate', 'High', 'Critical'];
    const number = (value: unknown) => typeof value === 'number' ? value : Number(value ?? 0);
    const average = (field: string) => logs.length
      ? (logs.reduce((sum: number, log: any) => sum + number(log[field]), 0) / logs.length).toFixed(1)
      : '0.0';
    const countPresent = (field: string) => logs.filter((log: any) => number(log[field]) === 1).length;
    const logLines = logs.slice(0, 30).map((log: any) => [
      log.date,
      `screen=${log.screen_time ?? 'n/a'}h`,
      `sleep=${log.sleep_hours ?? 'n/a'}h`,
      `brightness=${log.brightness ?? 'n/a'}%`,
      `breaks=${log.breaks_taken ?? 'n/a'}`,
      `symptoms=${[
        log.eye_strain && 'eye strain',
        log.headaches && 'headache',
        log.blurry_vision && 'blurry vision',
        log.dry_eyes && 'dry eyes',
      ].filter(Boolean).join(', ') || 'none'}`,
      `risk=${log.risk_level ?? 'n/a'}`,
      log.notes?.trim() ? `notes=${log.notes.trim()}` : null,
    ].filter(Boolean).join(' | '));

    const profileLines = [
      user.email ? `- Email: ${user.email}` : null,
      profile?.first_name || profile?.last_name ? `- Name: ${[profile.first_name, profile.last_name].filter(Boolean).join(' ')}` : null,
      profile?.age != null ? `- Age: ${profile.age}` : null,
      profile?.gender ? `- Gender: ${profile.gender}` : null,
      profile?.year_level ? `- Year level: ${profile.year_level}` : null,
      profile?.field_of_study ? `- Field of study: ${profile.field_of_study}` : null,
      profile?.baseline_risk_level ? `- Baseline risk level: ${profile.baseline_risk_level}` : null,
      profile?.medical_history ? `- Medical history: ${profile.medical_history}` : null,
      profile?.preferred_contact_method ? `- Preferred contact: ${profile.preferred_contact_method}` : null,
      profile?.opt_in_communications != null ? `- Email communications: ${profile.opt_in_communications ? 'enabled' : 'disabled'}` : null,
    ].filter(Boolean).join('\n');

    const latestPrediction = predictions[0] as any;
    const predictionLines = predictions.map((prediction: any) =>
      `- ${prediction.created_at ?? 'unknown date'}: risk=${riskLabels[number(prediction.risk_level)] ?? prediction.risk_level ?? 'n/a'}, percentage=${prediction.risk_percentage ?? 'n/a'}%, fatigue=${prediction.fatigue_score ?? 'n/a'}/10, confidence=${prediction.confidence ?? 'n/a'}`
    ).join('\n');

    const userContext = `USER PROFILE (this authenticated user only):
${profileLines || '- No profile fields are filled in'}

USER PROGRESS:
${progress ? JSON.stringify(progress) : '- No progress record'}

USER SETTINGS:
${settings ? JSON.stringify(settings) : '- No settings record'}

HEALTH SUMMARY (${logs.length} logs loaded, newest 30 shown below):
- Average screen time: ${average('screen_time')} hours/day
- Average sleep: ${average('sleep_hours')} hours/night
- Eye strain: ${countPresent('eye_strain')}/${logs.length} days
- Headaches: ${countPresent('headaches')}/${logs.length} days
- Blurry vision: ${countPresent('blurry_vision')}/${logs.length} days
- Dry eyes: ${countPresent('dry_eyes')}/${logs.length} days
- High/Critical risk days: ${logs.filter((log: any) => log.risk_level === 'High' || log.risk_level === 'Critical').length}/${logs.length}
- Latest prediction: ${latestPrediction ? `${latestPrediction.risk_percentage ?? 'n/a'}% risk, ${latestPrediction.fatigue_score ?? 'n/a'}/10 fatigue` : 'none'}

RECENT DAILY LOG DETAILS:
${logLines.length > 0 ? logLines.join('\n') : '- No daily logs'}

PREDICTION HISTORY:
${predictionLines || '- No predictions'}`;

    // ── System instruction ─────────────────────────────────────────────
    const systemInstruction = `You are EyeGuard AI, a friendly eye health assistant built into the EyeGuard app — a system that tracks eye strain risk for students.

${userContext
  ? `You have access to this user's health data. Use it to give personalised, specific answers.\n\n${userContext}`
  : 'This user has no logged data yet. Provide general eye health advice.'}

Guidelines:
- Answer questions about the user's data directly and confidently
- Treat the supplied context as the only source of personal data. Never infer or invent missing values.
- If a requested field is not present, say that it is not available rather than guessing.
- The health summary uses up to 90 recent logs; the detailed list contains the newest 30. Say which scope you are using when totals or averages matter.
- Never reveal or discuss data belonging to other users, survey respondents, or system-wide analytics.
- Be warm, concise, and practical. For personal-data questions, give a complete answer with clear headings and include every relevant field available in the context.
- Give actionable advice based on actual numbers when available
- Reference the 20-20-20 rule, screen distance, brightness, and sleep when relevant
- Use plain language, avoid jargon
- If risk is High or Critical, be appropriately urgent`;

    // ── Build Gemini conversation turns ───────────────────────────────
    // Gemini uses { role: 'user'|'model', parts: [{ text }] }
    const contents: { role: string; parts: { text: string }[] }[] = [];

    if (history && Array.isArray(history)) {
      // Skip the first greeting message, keep last 10 turns
      for (const msg of history.slice(1).slice(-10)) {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        });
      }
    }

    contents.push({ role: 'user', parts: [{ text: message }] });

    // ── Call Gemini REST API — try each model until one works ─────────
    let geminiRes: Response | null = null;
    let usedModel = '';

    for (const model of GEMINI_MODELS) {
      const url = `${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          },
        }),
      });

      // 404 = model not found for this key/region — try next
      if (res.status === 404) {
        console.warn(`Gemini model ${model} not found, trying next…`);
        continue;
      }

      geminiRes = res;
      usedModel = model;
      break;
    }

    if (!geminiRes) {
      return NextResponse.json({ error: 'No available AI model found. Please try again later.' }, { status: 502 });
    }

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text();
      console.error(`Gemini API error (${usedModel}):`, geminiRes.status, errBody);

      if (geminiRes.status === 400) {
        return NextResponse.json({ error: 'Invalid request to AI service.' }, { status: 502 });
      }
      if (geminiRes.status === 401 || geminiRes.status === 403) {
        return NextResponse.json({ error: 'AI service authentication failed. Check API key.' }, { status: 502 });
      }
      if (geminiRes.status === 429) {
        return NextResponse.json({ error: 'AI rate limit reached. Please try again in a moment.' }, { status: 429 });
      }
      return NextResponse.json({ error: `AI service error (${geminiRes.status})` }, { status: 502 });
    }

    const geminiData = await geminiRes.json();

    // Gemini can return a response across multiple text parts.
    const reply: string = geminiData?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text)
      .filter(Boolean)
      .join('\n')
      || 'Sorry, I could not generate a response. Please try again.';

    return NextResponse.json({ reply });

  } catch (err) {
    console.error('Chat API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
