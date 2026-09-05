'use client';

import { useEffect, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, Eye, Moon, Monitor, Sun, Activity,
  Shield, Clock, ArrowRight, ChevronDown, Info,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { MainLayout } from '@/components/main-layout';
import { AuthGuard } from '@/components/auth-guard';
import { Button } from '@/components/form-components';

// ── Helpers ───────────────────────────────────────────────────────────────────

const RISK_META = {
  0: { label: 'Low',      text: 'text-green-700  dark:text-green-400',  bg: 'bg-green-500',  card: 'bg-green-50  dark:bg-green-950/30  border-green-300  dark:border-green-800',  badge: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700'  },
  1: { label: 'Moderate', text: 'text-yellow-700 dark:text-yellow-400', bg: 'bg-yellow-500', card: 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-300 dark:border-yellow-800', badge: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700' },
  2: { label: 'High',     text: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-500', card: 'bg-orange-50 dark:bg-orange-950/30 border-orange-300 dark:border-orange-800', badge: 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-700' },
  3: { label: 'Critical', text: 'text-red-700    dark:text-red-400',    bg: 'bg-red-500',    card: 'bg-red-50    dark:bg-red-950/30    border-red-300    dark:border-red-800',    badge: 'bg-red-100    dark:bg-red-900/40    text-red-800    dark:text-red-300    border-red-300    dark:border-red-700'    },
} as const;

function freqToScore(freq: string | null | undefined): number {
  return ({ 'Never': 0, 'Rarely (1-2 times a week)': 0.5, 'Sometimes (3-4 times a week)': 1.0, 'Often (5-6 times a week)': 1.5, 'Always (every day)': 2.0 })[freq ?? ''] ?? 0;
}

function FactorBar({
  icon, label, displayValue, barPct, barColor, status, message,
}: {
  icon: React.ReactNode;
  label: string;
  displayValue: string;
  barPct: number;
  barColor: string;
  status: 'good' | 'warn' | 'bad';
  message: string;
}) {
  const statusDot = status === 'good' ? 'bg-green-500' : status === 'warn' ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className={`flex flex-col gap-3 p-4 rounded-xl border bg-card shadow-sm transition-colors ${
      status === 'bad'  ? 'border-red-300    dark:border-red-800    ring-1 ring-red-200    dark:ring-red-900/40' :
      status === 'warn' ? 'border-yellow-300 dark:border-yellow-800' :
      'border-border hover:border-[#f97316]/30'
    }`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground">{displayValue}</span>
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot}`} />
        </div>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${Math.min(100, Math.max(0, barPct))}%` }} />
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{message}</p>
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
  const [methodOpen, setMethodOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        const { data: logs } = await supabase
          .from('daily_logs').select('id, date').eq('user_id', user.id)
          .order('date', { ascending: false }).limit(1);

        if (!logs || logs.length === 0) { setIsLoading(false); return; }
        setHasData(true);

        const [predRes, logRes] = await Promise.all([
          supabase.from('predictions').select('*').eq('user_id', user.id)
            .order('created_at', { ascending: false }).limit(1).single(),
          supabase.from('daily_logs').select('*').eq('user_id', user.id)
            .order('date', { ascending: false }).limit(1).single(),
        ]);

        if (predRes.data) setPrediction(predRes.data);
        if (logRes.data)  setLatestLog(logRes.data);
      } catch (err) {
        console.error('Error loading prediction:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [router, supabase]);

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

  if (!hasData) {
    return (
      <AuthGuard><MainLayout>
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Risk Assessment</h1>
            <p className="text-muted-foreground mt-2">Your personalised eye health risk assessment</p>
          </div>
          <div className="flex items-center justify-center min-h-96 rounded-xl border-2 border-dashed border-border bg-muted/30">
            <div className="text-center space-y-4 p-8">
              <div className="inline-block p-4 bg-primary/10 rounded-full">
                <Eye className="w-12 h-12 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">No data yet</h2>
              <p className="text-muted-foreground max-w-md">Log your daily screen time and symptoms to get your personalised risk score.</p>
              <Button variant="primary" size="lg" onClick={() => router.push('/daily-log')}>Log Today's Data</Button>
            </div>
          </div>
        </div>
      </MainLayout></AuthGuard>
    );
  }

  if (!prediction) {
    return (
      <AuthGuard><MainLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center space-y-4 p-8">
            <div className="inline-block p-4 bg-primary/10 rounded-full">
              <Clock className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Assessment pending</h2>
            <p className="text-muted-foreground max-w-sm">Your log was saved. Submit today's form to generate your risk score.</p>
            <Button variant="primary" size="lg" onClick={() => router.push('/daily-log')}>Complete Daily Log</Button>
          </div>
        </div>
      </MainLayout></AuthGuard>
    );
  }

  // ── Derived values ───────────────────────────────────────────────────────────
  const riskPct    = parseFloat(prediction.risk_percentage) || 0;
  const riskLvl    = Math.min(3, Math.max(0, prediction.risk_level ?? 0)) as 0 | 1 | 2 | 3;
  const meta       = RISK_META[riskLvl];

  const screenTime  = Number(latestLog?.screen_time)  || 0;
  const sleepHours  = Number(latestLog?.sleep_hours)  || 7;
  const brightness  = Number(latestLog?.brightness)   || 70;
  const breaksTaken = latestLog?.breaks_taken == null ? null : Number(latestLog.breaks_taken);

  const esFreq  = freqToScore(latestLog?.eye_strain_frequency)    || (latestLog?.eye_strain    ? 1 : 0);
  const bvFreq  = freqToScore(latestLog?.blurry_vision_frequency) || (latestLog?.blurry_vision ? 1 : 0);
  const hFreq   = freqToScore(latestLog?.headaches_frequency)     || (latestLog?.headaches     ? 1 : 0);
  const deFreq  = freqToScore(latestLog?.dry_eyes_frequency)      || (latestLog?.dry_eyes      ? 1 : 0);
  const cvqRaw  = (esFreq * 2) + (bvFreq * 2) + (hFreq * 1) + (deFreq * 1);

  const screenBarPct  = Math.min((screenTime / 12) * 100, 100);
  const screenStatus  = screenTime >= 8 ? 'bad' : screenTime >= 5 ? 'warn' : 'good';
  const screenMsg     =
    screenTime >= 8 ? 'Very high — major driver of eye strain' :
    screenTime >= 6 ? 'High — exceeds safe daily limit' :
    screenTime >= 4 ? 'Moderate — take regular breaks' : 'Low — well within safe range';

  const sleepBarPct   = Math.min(Math.max(0, ((9 - sleepHours) / 5) * 100), 100);
  const sleepStatus   = sleepHours < 5 ? 'bad' : sleepHours < 7 ? 'warn' : 'good';
  const sleepMsg      =
    sleepHours < 5 ? 'Severely insufficient — eye recovery critically impaired' :
    sleepHours < 6 ? 'Poor — moisture and repair cycles disrupted' :
    sleepHours < 7 ? 'Below optimal — mild eye recovery impact' : 'Good — adequate overnight recovery';

  const symptomBarPct = (cvqRaw / 12) * 100;
  const symptomStatus = cvqRaw >= 8 ? 'bad' : cvqRaw >= 4 ? 'warn' : 'good';
  const symptomCount  = [esFreq, bvFreq, hFreq, deFreq].filter(f => f > 0).length;
  const symptomMsg    = `${symptomCount} of 4 symptoms reported — ` + (
    cvqRaw >= 8 ? 'severe symptom burden' :
    cvqRaw >= 4 ? 'moderate — monitor closely' : 'mild or none');

  const brightDev    = brightness < 40 ? 40 - brightness : brightness > 80 ? brightness - 80 : 0;
  const brightBarPct = Math.min((brightDev / 40) * 100, 100);
  const brightStatus = brightDev >= 20 ? 'bad' : brightDev > 0 ? 'warn' : 'good';
  const brightMsg    =
    brightness < 30  ? 'Too dim — eyes working harder to see clearly' :
    brightness < 40  ? 'Slightly dim — minor contrast strain' :
    brightness <= 80 ? 'Optimal range — no brightness-related risk' :
    brightness <= 90 ? 'Slightly bright — minor glare' : 'Too bright — glare is stressing your eyes';

  const barColor = (s: 'good' | 'warn' | 'bad') =>
    s === 'good' ? 'bg-green-500' : s === 'warn' ? 'bg-yellow-500' : 'bg-red-500';

  // Recommendations
  const rawRecs = prediction.recommendations || [];
  const recs = rawRecs.map((r: unknown) => {
    if (typeof r === 'string') { try { const p = JSON.parse(r); if (p?.title) return p; } catch {} return { title: r, description: '' }; }
    return r as { title: string; description: string; category?: string };
  });
  if (breaksTaken !== null && breaksTaken < 3) {
    recs.unshift({
      title: 'Take regular eye breaks',
      description: breaksTaken === 0
        ? 'No breaks were recorded today. Follow the 20-20-20 rule to give your eyes regular relief.'
        : `Only ${breaksTaken} break${breaksTaken === 1 ? '' : 's'} recorded today. Add more screen-free breaks.`,
      category: 'eye breaks',
    });
  }
  const visibleRecs = recs.slice(0, 4);

  return (
    <AuthGuard>
      <MainLayout>
        <div className="min-h-[calc(100vh-7rem)] w-full max-w-6xl mx-auto space-y-10 rounded-[2rem] bg-[radial-gradient(circle_at_12%_0%,rgba(249,115,22,0.08),transparent_34%),linear-gradient(160deg,rgba(251,191,100,0.10),rgba(249,115,22,0.04)_50%,rgba(180,100,30,0.06))] dark:bg-[radial-gradient(circle_at_12%_0%,rgba(249,115,22,0.16),transparent_34%),linear-gradient(135deg,rgba(67,28,12,0.5),rgba(15,10,7,0.1)_48%,rgba(120,53,15,0.14))] px-4 py-6 sm:px-8 sm:py-10">

          {/* ── Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#f97316]/20 pb-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f97316]">Personal health overview</p>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mt-1.5">Risk Assessment</h1>
              <p className="text-muted-foreground text-sm mt-1">Based on your latest daily log</p>
            </div>
            {/* Update Log — distinct amber-teal highlight so it stands out */}
            <button
              onClick={() => router.push('/daily-log')}
              className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all
                bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-orange-500/30
                hover:from-amber-400 hover:to-orange-400 hover:shadow-orange-400/40 hover:scale-[1.02]
                dark:from-amber-600 dark:to-orange-600 dark:shadow-orange-600/20
                self-start sm:self-auto"
            >
              <ArrowRight className="w-4 h-4" />
              Update Log
            </button>
          </div>

          {/* ── Hero gauge ── */}
          <div className={`rounded-2xl border-2 p-5 sm:p-6 ${meta.card}`}>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground mb-4">Eye Strain Risk Score</p>

            {/* Score + badge on same visual level */}
            <div className="flex items-center gap-4 mb-5 flex-wrap">
              <div className="flex items-baseline gap-1.5">
                <span className={`text-5xl sm:text-6xl font-bold tabular-nums leading-none ${meta.text}`}>
                  {riskPct.toFixed(1)}
                </span>
                <span className="text-2xl font-semibold text-muted-foreground">%</span>
              </div>

              {/* Risk level badge — same visual weight as the score */}
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-base font-bold ${meta.badge}`}>
                {riskLvl === 0 && <CheckCircle2 className="w-5 h-5" />}
                {riskLvl === 1 && <Activity className="w-5 h-5" />}
                {riskLvl >= 2 && <AlertTriangle className="w-5 h-5" />}
                {meta.label}
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-2 mb-4">
              <div className="h-3 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${meta.bg}`}
                  style={{ width: `${riskPct}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground px-0.5">
                <span>0</span><span>25 Moderate</span><span>50 High</span><span>75 Critical</span><span>100</span>
              </div>
            </div>

            <p className={`text-sm font-semibold ${meta.text}`}>
              {riskLvl === 3 ? 'Critical: rest your eyes immediately and seek professional advice if symptoms persist.' :
               riskLvl === 2 ? 'High: reduce screen exposure and follow the recommendations below.' :
               riskLvl === 1 ? 'Moderate: small daily habit changes can lower your risk.' :
               'Low: keep logging and maintain your healthy screen habits.'}
            </p>
          </div>

          {/* ── Contributing factors — 2 × 2 grid ── */}
          <div>
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#f97316]">The signal behind the score</p>
              <h2 className="text-2xl font-bold text-foreground mt-1">What's Affecting Your Score</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FactorBar
                icon={<Activity className="w-4 h-4" />}
                label="Symptoms"
                displayValue={`${(symptomBarPct).toFixed(0)}%`}
                barPct={symptomBarPct}
                barColor={barColor(symptomStatus)}
                status={symptomStatus}
                message={symptomMsg}
              />
              <FactorBar
                icon={<Monitor className="w-4 h-4" />}
                label="Screen Time"
                displayValue={`${screenTime}h today`}
                barPct={screenBarPct}
                barColor={barColor(screenStatus)}
                status={screenStatus}
                message={screenMsg}
              />
              <FactorBar
                icon={<Moon className="w-4 h-4" />}
                label="Sleep"
                displayValue={`${sleepHours}h last night`}
                barPct={sleepBarPct}
                barColor={barColor(sleepStatus)}
                status={sleepStatus}
                message={sleepMsg}
              />
              <FactorBar
                icon={<Sun className="w-4 h-4" />}
                label="Screen Brightness"
                displayValue={`${brightness}% brightness`}
                barPct={brightBarPct}
                barColor={barColor(brightStatus)}
                status={brightStatus}
                message={brightMsg}
              />
            </div>
          </div>

          {/* ── Methodology accordion ── */}
          <div className="rounded-2xl border border-[#f97316]/25 bg-[#f97316]/[0.04] dark:bg-[#f97316]/[0.06] overflow-hidden">
            <button
              onClick={() => setMethodOpen(v => !v)}
              className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-[#f97316]/[0.06] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#f97316]/15 flex items-center justify-center flex-shrink-0">
                  <Info className="w-4 h-4 text-[#f97316]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">How Your Risk Score Is Calculated</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Based on the CVS-Q clinical instrument and published eye health guidelines</p>
                </div>
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#f97316]/30 bg-[#f97316]/10 text-[#f97316] text-xs font-semibold transition-all flex-shrink-0 ${methodOpen ? 'opacity-70' : ''}`}>
                {methodOpen ? 'Collapse' : 'See details'}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${methodOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {methodOpen && (
              <div className="px-5 pb-5 pt-1 grid gap-4 text-sm leading-relaxed text-muted-foreground sm:grid-cols-2 border-t border-[#f97316]/15">
                <div>
                  <h3 className="font-semibold text-[#f97316] mb-1">Why the score increases</h3>
                  <p>Reported symptoms are the primary driver. Additional points come from excessive screen time, insufficient sleep, brightness outside the 40–80% optimal range, and missing eye breaks.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-[#f97316] mb-1">Why the score decreases</h3>
                  <p>Lower symptom frequency, moderate screen exposure, 7–9 hours of sleep, suitable brightness, taking eye breaks, outdoor time, regular exercise, and blue-light-filter use all reduce the score.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-[#f97316] mb-1">Calculation method</h3>
                  <p>Symptoms are weighted using the CVS-Q instrument: eye strain and blurry vision count twice; headaches and dry eyes once. Environmental modifiers are then added or subtracted. The final score is capped at 0–100.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-[#f97316] mb-1">Clinical disclaimer</h3>
                  <p>This is a digital eye strain screening estimate, not a medical diagnosis. Consult a qualified eye-care professional about persistent symptoms. This tool has not been clinically validated as a standalone diagnostic product.</p>
                </div>
                <div className="sm:col-span-2 border-t border-[#f97316]/15 pt-4">
                  <h3 className="font-semibold text-[#f97316] mb-1">Research basis</h3>
                  <p>Symptom weighting follows the published CVS-Q by Seguí et al. (2015). Environmental thresholds draw on guidance from the American Optometric Association, National Sleep Foundation, ISO 9241-303, and peer-reviewed digital eye strain literature.</p>
                </div>
              </div>
            )}
          </div>

          {/* ── Recommendations — separate container ── */}
          {recs.length > 0 && (
            <div className="rounded-2xl border border-border bg-card/60 p-5 sm:p-6 space-y-5">
              <div className="border-b border-border pb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#f97316]">Small actions, meaningful change</p>
                <h2 className="text-2xl font-bold text-foreground mt-1">Personalised Recommendations</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {visibleRecs.map((rec: any, i: number) => (
                  <details key={i} className="group rounded-xl border border-border bg-background/60 hover:border-[#f97316]/30 hover:bg-[#f97316]/[0.03] transition-colors">
                    <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
                      <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-foreground">{rec.title ?? rec}</span>
                        {rec.category && <span className="block text-[11px] text-muted-foreground mt-0.5 capitalize">{rec.category}</span>}
                      </span>
                      <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-180 flex-shrink-0" />
                    </summary>
                    {rec.description && <p className="px-4 pb-4 pl-12 text-xs leading-relaxed text-muted-foreground">{rec.description}</p>}
                  </details>
                ))}
              </div>

              {/* CTA */}
              <div className={`rounded-2xl border-2 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${meta.card}`}>
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    {riskLvl >= 2 ? 'Take action today' : riskLvl === 1 ? 'Stay on track' : 'Keep up the good work'}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {riskLvl >= 2
                      ? 'Your risk is elevated. Log daily and follow the recommendations above to bring it down.'
                      : riskLvl === 1
                      ? "You're approaching a higher risk zone. Small habit improvements can make a big difference."
                      : 'Your eye health habits are solid. Keep logging to maintain your streak.'}
                  </p>
                </div>
                <button
                  onClick={() => router.push('/daily-log')}
                  className="inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap
                    bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-orange-500/30
                    hover:from-amber-400 hover:to-orange-400 hover:shadow-orange-400/40 hover:scale-[1.02]
                    dark:from-amber-600 dark:to-orange-600 self-start sm:self-auto flex-shrink-0"
                >
                  <ArrowRight className="w-4 h-4" />
                  Update Your Log
                </button>
              </div>
            </div>
          )}

        </div>
      </MainLayout>
    </AuthGuard>
  );
}
