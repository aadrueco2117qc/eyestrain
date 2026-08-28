import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama3-70b-8192';

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
    }

    const { message, history } = await request.json();
    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Try to get authenticated user for personalized context
    let userContext = '';
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Fetch profile
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('first_name, last_name, age, gender, year_level, field_of_study')
          .eq('user_id', user.id)
          .single();

        // Fetch last 7 daily logs
        const { data: logs } = await supabase
          .from('daily_logs')
          .select('date, screen_time, sleep_hours, brightness, eye_strain, headaches, blurry_vision, dry_eyes, risk_level, age, gender, year_level, field_of_study, notes')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(7);

        // Fetch latest prediction
        const { data: prediction } = await supabase
          .from('predictions')
          .select('risk_level, risk_percentage, fatigue_score')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const latestLog = logs?.[0];
        const age = profile?.age ?? latestLog?.age ?? null;
        const gender = profile?.gender ?? latestLog?.gender ?? null;
        const yearLevel = profile?.year_level ?? latestLog?.year_level ?? null;
        const fieldOfStudy = profile?.field_of_study ?? latestLog?.field_of_study ?? null;
        const firstName = profile?.first_name ?? null;
        const email = user.email ?? null;

        const profileLines = [
          email ? `- Email: ${email}` : null,
          firstName ? `- Name: ${firstName}` : null,
          age ? `- Age: ${age}` : null,
          gender ? `- Gender: ${gender}` : null,
          yearLevel ? `- Year level: ${yearLevel}` : null,
          fieldOfStudy ? `- Field of study: ${fieldOfStudy}` : null,
        ].filter(Boolean).join('\n');

        let healthLines = '';
        if (logs && logs.length > 0) {
          const riskLabels = ['Low', 'Moderate', 'High', 'Critical'];
          const recentRisks = logs.map((l: any) => l.risk_level).filter(Boolean);
          const highRiskDays = logs.filter((l: any) => l.risk_level === 'High' || l.risk_level === 'Critical').length;
          const avgScreen = (logs.reduce((s: number, l: any) => s + (l.screen_time || 0), 0) / logs.length).toFixed(1);
          const avgSleep = (logs.reduce((s: number, l: any) => s + (l.sleep_hours || 0), 0) / logs.length).toFixed(1);
          const eyeStrainDays = logs.filter((l: any) => l.eye_strain === 1).length;
          const headacheDays = logs.filter((l: any) => l.headaches === 1).length;

          // Collect non-empty notes from recent logs
          const recentNotes = logs
            .map((l: any) => l.notes?.trim())
            .filter(Boolean)
            .slice(0, 3); // last 3 notes max

          healthLines = `
HEALTH DATA (last ${logs.length} logs):
- Average daily screen time: ${avgScreen} hours
- Average sleep: ${avgSleep} hours/night
- Eye strain: ${eyeStrainDays}/${logs.length} days
- Headaches: ${headacheDays}/${logs.length} days
- High/Critical risk days: ${highRiskDays}/${logs.length} days
- Recent risk levels: ${recentRisks.join(', ')}
${prediction ? `- Latest risk score: ${(prediction as any).risk_percentage?.toFixed(1)}% (${riskLabels[(prediction as any).risk_level] ?? 'Unknown'})` : ''}
${prediction ? `- Fatigue score: ${(prediction as any).fatigue_score?.toFixed(1)}/10` : ''}
${recentNotes.length > 0 ? `- User notes from recent logs:\n${recentNotes.map((n: string) => `  • ${n}`).join('\n')}` : ''}`;
        }

        if (profileLines || healthLines) {
          userContext = `\nUSER PROFILE:\n${profileLines || '(no profile data)'}\n${healthLines}`;
        }
      }
    } catch {
      // Non-fatal — continue without user context
    }

    const systemPrompt = `You are EyeGuard AI, a friendly and knowledgeable eye health assistant built into the EyeGuard app — a system that tracks eye strain risk for students.

${userContext
  ? `You have full access to this user's account data and health history. Use it to give personalized, specific answers. When the user asks about their account (email, age, year level, etc.), answer directly from the data below.\n${userContext}`
  : 'This user is not logged in. Provide general eye health advice only.'}

Guidelines:
- Answer questions about the user's own data directly and confidently (email, age, risk level, etc.)
- Be warm, concise, and practical
- Give actionable advice based on their actual numbers
- If they have high/critical risk, be more urgent
- Reference the 20-20-20 rule, screen distance, brightness, sleep when relevant
- Keep responses under 200 words unless more detail is needed
- Use simple language, avoid medical jargon
- You can answer general questions too, but tie them back to eye health when relevant`;

    const messages: { role: string; content: string }[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Add prior conversation history (skip the initial greeting)
    if (history && Array.isArray(history)) {
      for (const msg of history.slice(1).slice(-10)) {
        messages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content,
        });
      }
    }

    messages.push({ role: 'user', content: message });

    const groqRes = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 512,
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('Groq API error:', groqRes.status, errText);
      if (groqRes.status === 404) {
        return NextResponse.json({ error: 'AI model not found. Please contact support.' }, { status: 502 });
      }
      if (groqRes.status === 401) {
        return NextResponse.json({ error: 'AI service authentication failed.' }, { status: 502 });
      }
      return NextResponse.json({ error: `AI service error (${groqRes.status})` }, { status: 502 });
    }

    const groqData = await groqRes.json();
    const reply = groqData?.choices?.[0]?.message?.content ?? 'Sorry, I could not generate a response. Please try again.';

    return NextResponse.json({ reply });
  } catch (err) {
    console.error('Chat API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
