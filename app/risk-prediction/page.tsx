'use client';

import { useEffect, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, TrendingUp, TrendingDown,
  Minus, Eye, Moon, Monitor, Coffee, Sun, Activity,
  Dumbbell, Trees, Shield, Clock, ArrowRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { MainLayout } from '@/components/main-layout';
import { AuthGuard } from '@/components/auth-guard';
import { Button } from '@/components/form-components';
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer,
  Tooltip, CartesianGrid,
} from 'recharts';

// ── Helpers ───────────────────────────────────────────────────────────────────

const RISK_META = {
  0: { label: 'Low',      ring: 'ring-green-400  dark:ring-green-500',  text: 'text-green-600  dark:text-green-400',  bg: 'bg-green-500',  card: 'bg-green-50  dark:bg-green-950/30  border-green-200  dark:border-green-800'  },
  1: { label: 'Moderate', ring: 'ring-yellow-400 dark:ring-yellow-500', text: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-500', card: 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800' },
  2: { label: 'High',     ring: 'ring-orange-400 dark:ring-orange-500', text: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500', card: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800' },
  3: { label: 'Critical', ring: 'ring-red-400    dark:ring-red-500',    text: 'text-red-600    dark:text-red-400',    bg: 'bg-red-500',    card: 'bg-red-50    dark:bg-red-950/30    border-red-200    dark:border-red-800'    },
} as const;

function freqToScore(freq: string | null | undefined): number {
  return ({ 'Never': 0, 'Rarely (1-2 times a week)': 0.5, 'Sometimes (3-4 times a week)': 1.0, 'Often (5-6 times a week)': 1.5, 'Always (every day)': 2.0 })[freq ?? ''] ?? 0;
}

function freqLabel(freq: string | null | undefined): string {
  return ({ 'Never': 'Never', 'Rarely (1-2 times a week)': 'Rarely', 'Sometimes (3-4 times a week)': 'Sometimes', 'Often (5-6 times a week)': 'Often', 'Always (every day)': 'Always' })[freq ?? ''] ?? '—';
}

// ── Factor bar: colour driven by severity, not a global primary ───────────────
function FactorBar({
  icon, label, value, displayValue, barPct, barColor, status, message,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  displayValue?: string;
  barPct: number;   // 0–100, how filled the bar is
  barColor: string; // tailwind bg class
  status: 'good' | 'warn' | 'bad';
  message: string;
}) {
  const statusDot = status === 'good' ? 'bg-green-500' : status === 'warn' ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex flex-col gap-1.5 p-4 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground">{displayValue ?? value}</span>
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot}`} />
        </div>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${Math.min(100, Math.max(0, barPct))}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RiskPredictionPage() {
  const router = useRouter();
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const [prediction, setPrediction] = useState<any>(null);
  const [latestLog, setLatestLog] = useState<any>(null);
  const [riskHistory, setRiskHistory] = useState<{ label: string; risk: number; fatigue: number }[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        const { data: logs } = await supabase
          .from('daily_logs')
          .select('id, date')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(1);

        if (!logs || logs.length === 0) { setIsLoading(false); return; }
        setHasData(true);

        // Latest prediction + latest log in parallel
        const [predRes, logRes, historyLogsRes] = await Promise.all([
          supabase
            .from('predictions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single(),
          supabase
            .from('daily_logs')
            .select('*')
            .eq('user_id', user.id)
            .order('date', { ascending: false })
            .limit(1)
            .single(),
          // Fetch last 14 logs with their predictions for the trend chart
          supabase
            .from('daily_logs')
            .select('id, date')
            .eq('user_id', user.id)
            .order('date', { ascending: false })
            .limit(14),
        ]);

        if (predRes.data)  setPrediction(predRes.data);
        if (logRes.data)   setLatestLog(logRes.data);

        // Build trend history
        if (historyLogsRes.data && historyLogsRes.data.length > 1) {
          const logIds = historyLogsRes.data.map((l: any) => l.id);
          const { data: preds } = await supabase
            .from('predictions')
            .select('daily_log_id, risk_percentage, fatigue_score')
            .in('daily_log_id', logIds);

          const predMap: Record<string, any> = {};
          for (const p of preds ?? []) predMap[p.daily_log_id] = p;

          const history = [...historyLogsRes.data]
            .reverse()
            .map((l: any) => {
              const p = predMap[l.id];
              const [, m, d] = l.date.split('-');
              return { label: `${m}/${d}`, risk: p?.risk_percentage ?? 0, fatigue: p?.fatigue_score ?? 0 };
            })
            .filter(h => h.risk > 0);

          setRiskHistory(history);
        }
      } catch (err) {
        console.error('Error loading prediction:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [router, supabase]);

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <AuthGuard><MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <div className="inline-block p-4 bg-muted rounded-full">
              <Activity className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <p className="text-lg text-muted-foreground">Loading your risk assessment…</p>
          </div>
        </div>
      </MainLayout></AuthGuard>
    );
  }

  // ── No data ─────────────────────────────────────────────────────────────────
  if (!hasData) {
    return (
      <AuthGuard><MainLayout>
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Risk Prediction</h1>
            <p className="text-muted-foreground mt-2">Your personalised eye health risk assessment</p>
          </div>
          <div className="flex items-center justify-center min-h-96 rounded-xl border-2 border-dashed border-border bg-muted/30">
            <div className="text-center space-y-4 p-8">
              <div className="inline-block p-4 bg-primary/10 rounded-full">
                <Eye className="w-12 h-12 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">No data yet</h2>
              <p className="text-muted-foreground max-w-md">
                Log your daily screen time and symptoms to get your personalised risk score.
              </p>
              <Button variant="primary" size="lg" onClick={() => router.push('/daily-log')}>
                Log Today's Data
              </Button>
            </div>
          </div>
        </div>
      </MainLayout></AuthGuard>
    );
  }

  // ── No prediction row yet ────────────────────────────────────────────────────
  if (!prediction) {
    return (
      <AuthGuard><MainLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center space-y-4 p-8">
            <div className="inline-block p-4 bg-primary/10 rounded-full">
              <Clock className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Assessment pending</h2>
            <p className="text-muted-foreground max-w-sm">
              Your log was saved. Submit today's form to generate your risk score.
            </p>
            <Button variant="primary" size="lg" onClick={() => router.push('/daily-log')}>
              Complete Daily Log
            </Button>
          </div>
        </div>
      </MainLayout></AuthGuard>
    );
  }

  // ── Derived values ───────────────────────────────────────────────────────────
  const riskPct     = parseFloat(prediction.risk_percentage) || 0;
  const riskLvl     = Math.min(3, Math.max(0, prediction.risk_level ?? 0)) as 0 | 1 | 2 | 3;
  const fatigue     = parseFloat(prediction.fatigue_score) || 0;
  const confidence  = parseFloat(prediction.confidence) || 0;
  const meta        = RISK_META[riskLvl];

  // Trend direction vs previous entry
  const prevRisk    = riskHistory.length >= 2 ? riskHistory[riskHistory.length - 2].risk : null;
  const trendDelta  = prevRisk !== null ? riskPct - prevRisk : null;
  const TrendIcon   = trendDelta === null ? null : trendDelta < -3 ? TrendingDown : trendDelta > 3 ? TrendingUp : Minus;
  const trendColor  = trendDelta === null ? '' : trendDelta < -3 ? 'text-green-600 dark:text-green-400' : trendDelta > 3 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground';
  const trendText   = trendDelta === null ? '' : trendDelta < -3 ? `${Math.abs(trendDelta).toFixed(1)}% better than last log` : trendDelta > 3 ? `${trendDelta.toFixed(1)}% higher than last log` : 'Stable since last log';

  // ── Factor bars — derived from latest log (same formula as API) ────────────
  const screenTime  = Number(latestLog?.screen_time)   || 0;
  const sleepHours  = Number(latestLog?.sleep_hours)   || 7;
  const brightness  = Number(latestLog?.brightness)    || 70;
  const breaksTaken = Number(latestLog?.breaks_taken)  || 0;

  const esFreq  = freqToScore(latestLog?.eye_strain_frequency)    || (latestLog?.eye_strain    ? 1 : 0);
  const bvFreq  = freqToScore(latestLog?.blurry_vision_frequency) || (latestLog?.blurry_vision ? 1 : 0);
  const hFreq   = freqToScore(latestLog?.headaches_frequency)     || (latestLog?.headaches     ? 1 : 0);
  const deFreq  = freqToScore(latestLog?.dry_eyes_frequency)      || (latestLog?.dry_eyes      ? 1 : 0);
  const cvqRaw  = (esFreq * 2) + (bvFreq * 2) + (hFreq * 1) + (deFreq * 1);

  // Screen time bar: scale 0–12h → 0–100%
  const screenBarPct  = Math.min((screenTime / 12) * 100, 100);
  const screenStatus  = screenTime >= 8 ? 'bad' : screenTime >= 5 ? 'warn' : 'good';
  const screenMsg     =
    screenTime >= 8  ? 'Very high — major driver of eye strain' :
    screenTime >= 6  ? 'High — exceeds safe daily limit' :
    screenTime >= 4  ? 'Moderate — take regular breaks' : 'Low — well within safe range';

  // Sleep bar: invert — 9h=good(5%), 4h=bad(100%)
  const sleepBarPct   = Math.min(Math.max(0, ((9 - sleepHours) / 5) * 100), 100);
  const sleepStatus   = sleepHours < 5 ? 'bad' : sleepHours < 7 ? 'warn' : 'good';
  const sleepMsg      =
    sleepHours < 5  ? 'Severely insufficient — eye recovery critically impaired' :
    sleepHours < 6  ? 'Poor — moisture and repair cycles disrupted' :
    sleepHours < 7  ? 'Below optimal — mild eye recovery impact' : 'Good — adequate overnight recovery';

  // Symptom bar: cvqRaw / 12 → 0–100%
  const symptomBarPct = (cvqRaw / 12) * 100;
  const symptomStatus = cvqRaw >= 8 ? 'bad' : cvqRaw >= 4 ? 'warn' : 'good';
  const symptomCount  = [esFreq, bvFreq, hFreq, deFreq].filter(f => f > 0).length;
  const symptomMsg    = `${symptomCount} of 4 symptoms reported — ` + (
    cvqRaw >= 8 ? 'severe symptom burden' :
    cvqRaw >= 4 ? 'moderate — monitor closely' : 'mild or none');

  // Breaks bar: invert — 0 breaks=bad, 5+=good
  const breakBarPct   = Math.max(0, 100 - (breaksTaken / 5) * 100);
  const breakStatus   = breaksTaken === 0 ? 'bad' : breaksTaken < 3 ? 'warn' : 'good';
  const breakMsg      =
    breaksTaken === 0 ? 'No breaks — eyes had no relief from screen fatigue' :
    breaksTaken < 3   ? `${breaksTaken} break${breaksTaken > 1 ? 's' : ''} — more would help` :
    `${breaksTaken} breaks taken — good habit`;

  // Brightness bar: deviation from 40–80 optimal
  const brightDev     = brightness < 40 ? 40 - brightness : brightness > 80 ? brightness - 80 : 0;
  const brightBarPct  = Math.min((brightDev / 40) * 100, 100);
  const brightStatus  = brightDev >= 20 ? 'bad' : brightDev > 0 ? 'warn' : 'good';
  const brightMsg     =
    brightness < 30  ? 'Too dim — eyes working harder to see clearly' :
    brightness < 40  ? 'Slightly dim — minor contrast strain' :
    brightness <= 80 ? 'Optimal range — no brightness-related risk' :
    brightness <= 90 ? 'Slightly bright — minor glare' : 'Too bright — glare is stressing your eyes';

  // Colour mapping: green for good, yellow for warn, red for bad
  const barColor = (s: 'good' | 'warn' | 'bad') =>
    s === 'good' ? 'bg-green-500' : s === 'warn' ? 'bg-yellow-500' : 'bg-red-500';

  // Recommendations
  const rawRecs = prediction.recommendations || [];
  const recs = rawRecs.map((r: unknown) => {
    if (typeof r === 'string') { try { const p = JSON.parse(r); if (p?.title) return p; } catch {} return { title: r, description: '' }; }
    return r as { title: string; description: string; category?: string };
  });

  return (
    <AuthGuard>
      <MainLayout>
        <div className="space-y-8 max-w-5xl">

          {/* ── Header ───────────────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
            <div>
              <h1 className="text-4xl font-bold text-foreground">Risk Assessment</h1>
              <p className="text-muted-foreground mt-1">Based on your latest daily log</p>
            </div>
            <Button variant="outline" size="lg" onClick={() => router.push('/daily-log')} className="self-start sm:self-auto">
              Update Log
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          {/* ── Hero gauge + fatigue ─────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Risk gauge */}
            <div className={`md:col-span-2 rounded-2xl border-2 p-6 ${meta.card}`}>
              <p className="text-sm font-medium text-muted-foreground mb-4">Eye Strain Risk Score</p>
              <div className="flex items-end gap-4 mb-4">
                <span className={`text-7xl font-bold leading-none tabular-nums ${meta.text}`}>
                  {riskPct.toFixed(1)}
                </span>
                <div className="mb-1.5 space-y-1">
                  <span className="text-2xl font-semibold text-muted-foreground">%</span>
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ${meta.card} ${meta.text}`}>
                    {riskLvl === 0 && <CheckCircle2 className="w-4 h-4" />}
                    {riskLvl === 1 && <Activity className="w-4 h-4" />}
                    {riskLvl >= 2 && <AlertTriangle className="w-4 h-4" />}
                    {meta.label}
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5 mb-4">
                <div className="h-4 rounded-full bg-muted/50 overflow-hidden ring-1 ring-border">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${meta.bg}`}
                    style={{ width: `${riskPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground px-0.5">
                  <span>0</span><span>25 Moderate</span><span>50 High</span><span>75 Critical</span><span>100</span>
                </div>
              </div>

              {/* Trend vs previous */}
              {TrendIcon && (
                <div className={`flex items-center gap-1.5 text-sm font-medium ${trendColor}`}>
                  <TrendIcon className="w-4 h-4" />
                  {trendText}
                </div>
              )}
            </div>

            {/* Fatigue + confidence */}
            <div className="flex flex-col gap-4">
              <div className="flex-1 rounded-2xl border border-border bg-card p-5 flex flex-col justify-between">
                <p className="text-sm text-muted-foreground">Visual Fatigue</p>
                <div className="space-y-2 mt-3">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-foreground tabular-nums">{fatigue.toFixed(1)}</span>
                    <span className="text-lg text-muted-foreground">/10</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        fatigue >= 7 ? 'bg-red-500' : fatigue >= 5 ? 'bg-orange-500' : fatigue >= 3 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${(fatigue / 10) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {fatigue >= 7 ? 'High — take a break now' : fatigue >= 5 ? 'Moderate fatigue' : fatigue >= 3 ? 'Mild fatigue' : 'Well rested'}
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="text-sm text-muted-foreground mb-1">Assessment Confidence</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${confidence * 100}%` }} />
                  </div>
                  <span className="text-sm font-bold text-foreground tabular-nums">{(confidence * 100).toFixed(0)}%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {confidence < 0.7 ? 'Low — log more days to improve accuracy' : confidence < 0.85 ? 'Good — continue logging daily' : 'High — reliable assessment'}
                </p>
              </div>
            </div>
          </div>

          {/* ── Contributing factors ──────────────────────────────────────── */}
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">What's Affecting Your Score</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              <FactorBar
                icon={<Activity className="w-4 h-4" />}
                label="Symptoms"
                value={`${symptomCount}/4 present`}
                displayValue={`${(symptomBarPct).toFixed(0)}%`}
                barPct={symptomBarPct}
                barColor={barColor(symptomStatus)}
                status={symptomStatus}
                message={symptomMsg}
              />
              <FactorBar
                icon={<Monitor className="w-4 h-4" />}
                label="Screen Time"
                value={`${screenTime}h`}
                displayValue={`${screenTime}h today`}
                barPct={screenBarPct}
                barColor={barColor(screenStatus)}
                status={screenStatus}
                message={screenMsg}
              />
              <FactorBar
                icon={<Moon className="w-4 h-4" />}
                label="Sleep"
                value={`${sleepHours}h`}
                displayValue={`${sleepHours}h last night`}
                barPct={sleepBarPct}
                barColor={barColor(sleepStatus)}
                status={sleepStatus}
                message={sleepMsg}
              />
              <FactorBar
                icon={<Coffee className="w-4 h-4" />}
                label="Eye Breaks"
                value={`${breaksTaken}`}
                displayValue={`${breaksTaken} break${breaksTaken !== 1 ? 's' : ''}`}
                barPct={breakBarPct}
                barColor={barColor(breakStatus)}
                status={breakStatus}
                message={breakMsg}
              />
              <FactorBar
                icon={<Sun className="w-4 h-4" />}
                label="Screen Brightness"
                value={`${brightness}%`}
                displayValue={`${brightness}% brightness`}
                barPct={brightBarPct}
                barColor={barColor(brightStatus)}
                status={brightStatus}
                message={brightMsg}
              />
            </div>
          </div>

          {/* ── Symptom breakdown ────────────────────────────────────────── */}
          {cvqRaw > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-4">Symptom Breakdown</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Eye Strain',    freq: latestLog?.eye_strain_frequency,    score: esFreq,  icon: <Eye className="w-5 h-5" /> },
                  { label: 'Headaches',     freq: latestLog?.headaches_frequency,     score: hFreq,   icon: <AlertTriangle className="w-5 h-5" /> },
                  { label: 'Blurry Vision', freq: latestLog?.blurry_vision_frequency, score: bvFreq,  icon: <Activity className="w-5 h-5" /> },
                  { label: 'Dry Eyes',      freq: latestLog?.dry_eyes_frequency,      score: deFreq,  icon: <Shield className="w-5 h-5" /> },
                ].map(({ label, freq, score, icon }) => {
                  const sStatus = score === 0 ? 'good' : score <= 1 ? 'warn' : 'bad';
                  return (
                    <div key={label} className={`rounded-xl border p-4 space-y-2 ${
                      sStatus === 'good' ? 'bg-card border-border' :
                      sStatus === 'warn' ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800' :
                      'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                    }`}>
                      <div className={`${sStatus === 'good' ? 'text-muted-foreground' : sStatus === 'warn' ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                        {icon}
                      </div>
                      <p className="text-xs font-semibold text-foreground">{label}</p>
                      <p className={`text-sm font-bold ${
                        sStatus === 'good' ? 'text-green-600 dark:text-green-400' :
                        sStatus === 'warn' ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
                      }`}>{freqLabel(freq)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Risk trend sparkline ─────────────────────────────────────── */}
          {riskHistory.length > 1 && (
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-4">Your Risk Over Time</h2>
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={riskHistory} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} width={32} unit="%" />
                      <Tooltip
                        formatter={(v: number, name: string) => [`${v.toFixed(1)}%`, name === 'risk' ? 'Risk' : 'Fatigue ×10']}
                        contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', fontSize: '12px' }}
                      />
                      <Line type="monotone" dataKey="risk" stroke="#ef4444" strokeWidth={2} dot={{ r: 3, fill: '#ef4444' }} activeDot={{ r: 5 }} name="risk" />
                      <Line type="monotone" dataKey="fatigue" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="fatigue" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5"><span className="inline-block w-4 h-0.5 bg-red-500 rounded" /> Risk %</div>
                  <div className="flex items-center gap-1.5"><span className="inline-block w-4 h-0.5 bg-yellow-500 rounded" style={{ backgroundImage: 'repeating-linear-gradient(to right, #f59e0b 0, #f59e0b 4px, transparent 4px, transparent 6px)' }} /> Fatigue (×10)</div>
                </div>
              </div>
            </div>
          )}

          {/* ── Recommendations ──────────────────────────────────────────── */}
          {recs.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-4">Personalised Recommendations</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recs.map((rec: any, i: number) => (
                  <div key={i} className="flex gap-3 p-4 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors">
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{rec.title ?? rec}</p>
                      {rec.description && <p className="text-xs text-muted-foreground mt-0.5">{rec.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── CTA ─────────────────────────────────────────────────────── */}
          <div className={`rounded-2xl border-2 p-6 ${meta.card}`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {riskLvl >= 2 ? 'Take action today' : riskLvl === 1 ? 'Stay on track' : 'Keep up the good work'}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {riskLvl >= 2
                    ? 'Your risk is elevated. Log daily and follow the recommendations above to bring it down.'
                    : riskLvl === 1
                    ? 'You\'re approaching a higher risk zone. Small habit improvements can make a big difference.'
                    : 'Your eye health habits are solid. Keep logging to maintain your streak.'}
                </p>
              </div>
              <Button variant="primary" size="lg" onClick={() => router.push('/daily-log')} className="flex-shrink-0">
                Log Today
              </Button>
            </div>
          </div>

        </div>
      </MainLayout>
    </AuthGuard>
  );
}
