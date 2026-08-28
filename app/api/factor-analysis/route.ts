import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// ── Helpers ──────────────────────────────────────────────────────────────────

function freqToScore(freq: string | null | undefined): number {
  const map: Record<string, number> = {
    'Never': 0,
    'Rarely (1-2 times a week)': 1,
    'Sometimes (3-4 times a week)': 2,
    'Often (5-6 times a week)': 3,
    'Always (every day)': 4,
  };
  return map[freq ?? ''] ?? 0;
}

function pearson(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 2) return 0;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const denom = Math.sqrt(dx2 * dy2);
  return denom === 0 ? 0 : parseFloat((num / denom).toFixed(3));
}

function strengthLabel(r: number): 'None' | 'Weak' | 'Moderate' | 'Strong' {
  const a = Math.abs(r);
  if (a < 0.10) return 'None';
  if (a < 0.30) return 'Weak';
  if (a < 0.50) return 'Moderate';
  return 'Strong';
}

// ── Long-term risk for a currently healthy person ────────────────────────────
// Based on Sheppard & Wolffsohn (2018) and NSF (2020) exposure thresholds.
// Five independent factors contribute up to 100 total points.
function computeLongTermRisk(logs: any[]) {
  const n = logs.length;
  if (n === 0) return { overallRisk: 0, factors: [] };

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

  const avgScreen = avg(logs.map(l => Number(l.screen_time) || 0));
  const avgSleep  = avg(logs.map(l => Number(l.sleep_hours) || 7));
  const avgBright = avg(logs.map(l => Number(l.brightness) || 70));
  const avgBreaks = avg(logs.map(l => Number(l.breaks_taken) || 0));

  const esScores  = logs.map(l => freqToScore(l.eye_strain_frequency));
  const hScores   = logs.map(l => freqToScore(l.headaches_frequency));
  const bvScores  = logs.map(l => freqToScore(l.blurry_vision_frequency));
  const deScores  = logs.map(l => freqToScore(l.dry_eyes_frequency));
  const avgSymptomBurden =
    avg(logs.map((_, i) =>
      ((esScores[i] * 2) + (bvScores[i] * 2) + (hScores[i]) + (deScores[i])) / 8
    ));

  // Screen time: max 35 pts, logarithmic (risk grows fast then slows)
  const screenRisk = Math.min(35, 35 * Math.log2(1 + avgScreen / 6));

  // Sleep: max 20 pts, linear from 9h (0) down to ≤4h (20)
  const sleepRisk = Math.min(20, Math.max(0, ((9 - avgSleep) / 5) * 20));

  // Symptom burden: max 30 pts — persistent symptoms accelerate structural damage
  const symptomRisk = avgSymptomBurden * 30;

  // Break deficit: max 10 pts
  const breakRisk = Math.min(10, Math.max(0, 10 * Math.max(0, 1 - avgBreaks / 3)));

  // Brightness deviation: max 5 pts
  let brightRisk = 0;
  if (avgBright < 40)      brightRisk = Math.min(5, ((40 - avgBright) / 40) * 5);
  else if (avgBright > 80) brightRisk = Math.min(5, ((avgBright - 80) / 20) * 5);

  const overallRisk = parseFloat(
    Math.min(100, Math.max(0, screenRisk + sleepRisk + symptomRisk + breakRisk + brightRisk)).toFixed(1)
  );

  const riskLevel =
    overallRisk >= 75 ? 'Critical' :
    overallRisk >= 50 ? 'High' :
    overallRisk >= 25 ? 'Moderate' : 'Low';

  const factors = [
    {
      name: 'Screen Time',
      avgValue: avgScreen.toFixed(1),
      unit: 'h/day',
      contribution: parseFloat(screenRisk.toFixed(1)),
      max: 35,
      status:
        avgScreen >= 8 ? 'critical' :
        avgScreen >= 6 ? 'warning' : 'healthy',
      message:
        avgScreen >= 8 ? 'Very high — major driver of long-term eye damage' :
        avgScreen >= 6 ? 'High — exceeds the safe daily limit' :
        avgScreen >= 4 ? 'Moderate — manageable with regular breaks' :
        'Low — minimal risk',
    },
    {
      name: 'Sleep',
      avgValue: avgSleep.toFixed(1),
      unit: 'h/night',
      contribution: parseFloat(sleepRisk.toFixed(1)),
      max: 20,
      status:
        avgSleep < 5 ? 'critical' :
        avgSleep < 7 ? 'warning' : 'healthy',
      message:
        avgSleep < 5  ? 'Severely insufficient — eye recovery is critically impaired' :
        avgSleep < 6  ? 'Poor — eye moisture and repair cycles are disrupted' :
        avgSleep < 7  ? 'Below optimal — mild impact on eye recovery' :
        avgSleep <= 9 ? 'Good — adequate recovery time for your eyes' :
        'Slightly over optimal',
    },
    {
      name: 'Symptom Frequency',
      avgValue: (avgSymptomBurden * 100).toFixed(0),
      unit: '% burden',
      contribution: parseFloat(symptomRisk.toFixed(1)),
      max: 30,
      status:
        avgSymptomBurden >= 0.6 ? 'critical' :
        avgSymptomBurden >= 0.3 ? 'warning' : 'healthy',
      message:
        avgSymptomBurden >= 0.75 ? 'Severe — persistent symptoms indicate established strain' :
        avgSymptomBurden >= 0.50 ? 'High — frequent symptoms signal progressive damage' :
        avgSymptomBurden >= 0.25 ? 'Moderate — recurring symptoms need attention' :
        'Low — infrequent or no symptoms',
    },
    {
      name: 'Eye Breaks',
      avgValue: avgBreaks.toFixed(1),
      unit: 'breaks/day',
      contribution: parseFloat(breakRisk.toFixed(1)),
      max: 10,
      status:
        avgBreaks < 1 ? 'critical' :
        avgBreaks < 3 ? 'warning' : 'healthy',
      message:
        avgBreaks === 0 ? 'None taken — eyes never get a chance to recover' :
        avgBreaks < 1   ? 'Very few — almost no relief from screen fatigue' :
        avgBreaks < 3   ? 'Insufficient — more breaks would significantly reduce risk' :
        'Good — regular breaks are protecting your eyes',
    },
    {
      name: 'Screen Brightness',
      avgValue: avgBright.toFixed(0),
      unit: '%',
      contribution: parseFloat(brightRisk.toFixed(1)),
      max: 5,
      status:
        brightRisk >= 4 ? 'critical' :
        brightRisk >= 2 ? 'warning' : 'healthy',
      message:
        avgBright < 30  ? 'Too dim — straining eyes to see clearly' :
        avgBright < 40  ? 'Slightly dim — minor contrast strain' :
        avgBright <= 80 ? 'Optimal range — no brightness-related risk' :
        avgBright <= 90 ? 'Slightly bright — minor glare impact' :
        'Too bright — glare is stressing your eyes',
    },
  ];

  return { overallRisk, riskLevel, factors };
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: logs, error: logsError } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: true });

    if (logsError) return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });

    const allLogs = logs || [];
    const n = allLogs.length;
    if (n === 0) return NextResponse.json({ hasData: false });

    // ── Arrays for correlation ──────────────────────────────────────────────
    const screenTimes   = allLogs.map(l => Number(l.screen_time)  || 0);
    const sleepHours    = allLogs.map(l => Number(l.sleep_hours)  || 7);
    const breaksTaken   = allLogs.map(l => Number(l.breaks_taken) || 0);
    const brightnessArr = allLogs.map(l => Number(l.brightness)   || 70);

    const esScores  = allLogs.map(l => freqToScore(l.eye_strain_frequency));
    const hScores   = allLogs.map(l => freqToScore(l.headaches_frequency));
    const bvScores  = allLogs.map(l => freqToScore(l.blurry_vision_frequency));
    const deScores  = allLogs.map(l => freqToScore(l.dry_eyes_frequency));

    // Inverted for directionality (more deficit = more risk)
    const sleepDeficit = sleepHours.map(h => Math.max(0, 7 - h));
    const breakDeficit = breaksTaken.map(b => Math.max(0, 3 - b));
    const brightDev    = brightnessArr.map(b => b < 40 ? 40 - b : b > 80 ? b - 80 : 0);

    // ── Correlation matrix: factor rows × symptom columns ──────────────────
    const symptoms = ['Eye Strain', 'Headaches', 'Blurry Vision', 'Dry Eyes'] as const;
    const symptomScores = { 'Eye Strain': esScores, 'Headaches': hScores, 'Blurry Vision': bvScores, 'Dry Eyes': deScores };

    const factorVectors = [
      { factor: 'Screen Time',         values: screenTimes,  avgDisplay: `${(screenTimes.reduce((a,b)=>a+b,0)/n).toFixed(1)}h/day` },
      { factor: 'Sleep Deficit',       values: sleepDeficit, avgDisplay: `${(sleepHours.reduce((a,b)=>a+b,0)/n).toFixed(1)}h/night` },
      { factor: 'Break Deficit',       values: breakDeficit, avgDisplay: `${(breaksTaken.reduce((a,b)=>a+b,0)/n).toFixed(1)}/day` },
      { factor: 'Brightness Deviation',values: brightDev,    avgDisplay: `${(brightnessArr.reduce((a,b)=>a+b,0)/n).toFixed(0)}%` },
    ];

    const correlationMatrix = factorVectors.map(({ factor, values, avgDisplay }) => ({
      factor,
      avgDisplay,
      correlations: Object.fromEntries(
        symptoms.map(s => {
          const r = pearson(values, symptomScores[s]);
          return [s, { r, strength: strengthLabel(r), direction: r >= 0 ? 'positive' : 'negative' }];
        })
      ),
    }));

    // ── Symptom frequency distribution (for bar display) ───────────────────
    const freqLabels = ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'];
    const symptomDistribution = [
      { symptom: 'Eye Strain',    counts: freqLabels.map((_, i) => esScores.filter(s => s === i).length) },
      { symptom: 'Headaches',     counts: freqLabels.map((_, i) => hScores.filter(s => s === i).length) },
      { symptom: 'Blurry Vision', counts: freqLabels.map((_, i) => bvScores.filter(s => s === i).length) },
      { symptom: 'Dry Eyes',      counts: freqLabels.map((_, i) => deScores.filter(s => s === i).length) },
    ];

    // ── Trend over time (last 30 entries max) ──────────────────────────────
    const trendData = allLogs.slice(-30).map(l => {
      const [, month, day] = (l.date as string).split('-');
      return {
        label: `${month}/${day}`,
        screenTime: Number(l.screen_time) || 0,
        sleepHours: Number(l.sleep_hours) || 0,
        eyeStrain:    freqToScore(l.eye_strain_frequency),
        headaches:    freqToScore(l.headaches_frequency),
        blurryVision: freqToScore(l.blurry_vision_frequency),
        dryEyes:      freqToScore(l.dry_eyes_frequency),
      };
    });

    // ── Summary ────────────────────────────────────────────────────────────
    const avgScreenTime = screenTimes.reduce((a, b) => a + b, 0) / n;
    const avgSleepHours = sleepHours.reduce((a, b) => a + b, 0) / n;
    const symptomPresencePct = {
      eyeStrain:    parseFloat(((allLogs.filter(l => l.eye_strain    === 1).length / n) * 100).toFixed(1)),
      headaches:    parseFloat(((allLogs.filter(l => l.headaches     === 1).length / n) * 100).toFixed(1)),
      blurryVision: parseFloat(((allLogs.filter(l => l.blurry_vision === 1).length / n) * 100).toFixed(1)),
      dryEyes:      parseFloat(((allLogs.filter(l => l.dry_eyes      === 1).length / n) * 100).toFixed(1)),
    };

    const longTermRisk = computeLongTermRisk(allLogs);

    return NextResponse.json({
      hasData: true,
      totalLogs: n,
      summary: {
        avgScreenTime: parseFloat(avgScreenTime.toFixed(1)),
        avgSleepHours: parseFloat(avgSleepHours.toFixed(1)),
        symptomPresencePct,
      },
      correlationMatrix,
      symptomDistribution,
      freqLabels,
      trendData,
      longTermRisk,
    });
  } catch (err) {
    console.error('Factor analysis error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
