'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  AlertTriangle, CheckCircle2, Eye, Moon, Monitor, Sun, Activity,
  Clock, ArrowRight, ChevronDown, Info,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { MainLayout } from '@/components/main-layout';
import { AuthGuard } from '@/components/auth-guard';
import { Button } from '@/components/form-components';

// ── Helpers ───────────────────────────────────────────────────────────────────

const RISK_META = {
  0: { label: 'Low',      text: 'text-green-700  dark:text-green-400',  bg: 'bg-green-500',  card: 'bg-green-50  dark:bg-green-950/30  border-green-300  dark:border-green-800',  badge: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700',  mascot: '/low.png',      mascotMsg: "You're doing great! Your eye health looks good right now. Keep up your healthy habits and stay consistent!"  },
  1: { label: 'Moderate', text: 'text-yellow-700 dark:text-yellow-400', bg: 'bg-yellow-500', card: 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-300 dark:border-yellow-800', badge: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700', mascot: '/low.png',      mascotMsg: "Heads up! Your eye strain risk is moderate. Small habit tweaks now can prevent it from climbing higher."     },
  2: { label: 'High',     text: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-500', card: 'bg-orange-50 dark:bg-orange-950/30 border-orange-300 dark:border-orange-800', badge: 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-700', mascot: '/high.png',     mascotMsg: "Your risk is high! Cut down screen time, take breaks, and follow the recommendations below. Your eyes need relief."  },
  3: { label: 'Critical', text: 'text-red-700    dark:text-red-400',    bg: 'bg-red-500',    card: 'bg-red-50    dark:bg-red-950/30    border-red-300    dark:border-red-800',    badge: 'bg-red-100    dark:bg-red-900/40    text-red-800    dark:text-red-300    border-red-300    dark:border-red-700',    mascot: '/critical.png', mascotMsg: "Critical alert! Please rest your eyes immediately and consider seeing an eye care professional if symptoms persist." },
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

// ── Mascot bubble — one per risk level ───────────────────────────────────────

function MascotBubble({ riskLvl, msg, size = 'lg' }: { riskLvl: 0|1|2|3; msg: string; size?: 'sm'|'lg' }) {
  const titleSm = size === 'sm' ? 'text-lg' : 'text-xl';
  const bodySm  = size === 'sm' ? 'text-xs'  : 'text-sm';

  if (riskLvl === 0) return (
    <div className="relative rounded-2xl px-6 py-5 shadow-xl shadow-green-500/20
      bg-gradient-to-br from-green-400 to-emerald-500 dark:from-green-500 dark:to-emerald-600
      border-2 border-green-300/60 dark:border-green-400/40">
      <p style={{ fontFamily: 'var(--font-nunito)', letterSpacing: '0.01em' }}
        className={`${titleSm} font-extrabold text-white leading-tight mb-1.5`}>✨ You're doing great!</p>
      <p style={{ fontFamily: 'var(--font-nunito)' }} className={`${bodySm} font-semibold text-white/90 leading-relaxed`}>{msg}</p>
      {size === 'lg' && <span className="absolute -bottom-[14px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[16px] border-t-emerald-500 dark:border-t-emerald-600" aria-hidden />}
    </div>
  );

  if (riskLvl === 1) return (
    <div className="relative rounded-2xl px-6 py-5 shadow-xl shadow-yellow-500/20
      bg-gradient-to-br from-yellow-400 to-amber-500 dark:from-yellow-500 dark:to-amber-600
      border-2 border-yellow-300/60 dark:border-yellow-400/40">
      <p style={{ fontFamily: 'var(--font-nunito)', letterSpacing: '0.01em' }}
        className={`${titleSm} font-extrabold text-white leading-tight mb-1.5`}>⚠️ Watch out!</p>
      <p style={{ fontFamily: 'var(--font-nunito)' }} className={`${bodySm} font-semibold text-white/90 leading-relaxed`}>{msg}</p>
      {size === 'lg' && <span className="absolute -bottom-[14px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[16px] border-t-amber-500 dark:border-t-amber-600" aria-hidden />}
    </div>
  );

  if (riskLvl === 2) return (
    <div className="relative rounded-2xl px-6 py-5 shadow-xl shadow-orange-500/30
      bg-gradient-to-br from-orange-500 to-red-500 dark:from-orange-600 dark:to-red-600
      border-2 border-orange-400/60 dark:border-orange-500/40">
      <span className="absolute inset-0 rounded-2xl animate-pulse ring-2 ring-orange-400/50 pointer-events-none" aria-hidden />
      <p style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '0.08em', fontSize: size === 'sm' ? '1.6rem' : '2rem', lineHeight: 1.1, textShadow: '0 2px 12px rgba(0,0,0,0.3)' }}
        className="text-white mb-1.5">YOUR RISK IS HIGH</p>
      <p style={{ fontFamily: 'var(--font-nunito)' }} className={`${bodySm} font-bold text-white/90 leading-relaxed`}>{msg}</p>
      {size === 'lg' && <span className="absolute -bottom-[14px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[16px] border-t-red-500 dark:border-t-red-600" aria-hidden />}
    </div>
  );

  return (
    <div className="relative rounded-2xl px-6 py-5
      bg-gradient-to-br from-red-600 to-rose-700 dark:from-red-700 dark:to-rose-800
      border-2 border-red-400 dark:border-red-500"
      style={{ boxShadow: '0 0 0 3px rgba(239,68,68,0.25), 0 8px 40px rgba(239,68,68,0.4)' }}>
      <span className="absolute inset-0 rounded-2xl animate-ping ring-2 ring-red-400/40 pointer-events-none" style={{ animationDuration: '1.4s' }} aria-hidden />
      <p style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '0.12em', fontSize: size === 'sm' ? '1.75rem' : '2.2rem', lineHeight: 1.05, textShadow: '0 0 18px rgba(255,100,100,0.75), 0 2px 8px rgba(0,0,0,0.5)' }}
        className="text-white mb-1.5">🚨 CRITICAL ALERT!</p>
      <p style={{ fontFamily: 'var(--font-nunito)' }} className={`${bodySm} font-bold text-white/90 leading-relaxed`}>{msg}</p>
      {size === 'lg' && <span className="absolute -bottom-[14px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[16px] border-t-rose-700 dark:border-t-rose-800" aria-hidden />}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RiskPredictionPage() {
  const router  = useRouter();
  const supabase = createClient();
  const [isLoading,  setIsLoading]  = useState(true);
  const [hasData,    setHasData]    = useState(false);
  const [prediction, setPrediction] = useState<any>(null);
  const [latestLog,  setLatestLog]  = useState<any>(null);
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

  // ── Loading / empty states ───────────────────────────────────────────────────

  if (isLoading) return (
    <AuthGuard><MainLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="inline-block p-4 bg-muted rounded-full">
            <Activity className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <p className="text-lg text-muted-foreground">Loading your risk assessment…</p>
        </div>
      </div>
    </MainLayout></AuthGuard>
  );

  if (!hasData) return (
    <AuthGuard><MainLayout>
      <div className="space-y-8 max-w-2xl mx-auto px-4 py-10">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Risk Assessment</h1>
          <p className="text-muted-foreground mt-2">Your personalised eye health risk assessment</p>
        </div>
        <div className="flex items-center justify-center min-h-72 rounded-2xl border-2 border-dashed border-border bg-muted/30">
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

  if (!prediction) return (
    <AuthGuard><MainLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
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

  // ── Derived values ───────────────────────────────────────────────────────────

  const riskPct = parseFloat(prediction.risk_percentage) || 0;
  const riskLvl = Math.min(3, Math.max(0, prediction.risk_level ?? 0)) as 0 | 1 | 2 | 3;
  const meta    = RISK_META[riskLvl];

  const screenTime  = Number(latestLog?.screen_time)  || 0;
  const sleepHours  = Number(latestLog?.sleep_hours)  || 7;
  const brightness  = Number(latestLog?.brightness)   || 70;
  const breaksTaken = latestLog?.breaks_taken == null ? null : Number(latestLog.breaks_taken);

  const esFreq = freqToScore(latestLog?.eye_strain_frequency)    || (latestLog?.eye_strain    ? 1 : 0);
  const bvFreq = freqToScore(latestLog?.blurry_vision_frequency) || (latestLog?.blurry_vision ? 1 : 0);
  const hFreq  = freqToScore(latestLog?.headaches_frequency)     || (latestLog?.headaches     ? 1 : 0);
  const deFreq = freqToScore(latestLog?.dry_eyes_frequency)      || (latestLog?.dry_eyes      ? 1 : 0);
  const cvqRaw = (esFreq * 2) + (bvFreq * 2) + hFreq + deFreq;

  const screenBarPct = Math.min((screenTime / 12) * 100, 100);
  const screenStatus = screenTime >= 8 ? 'bad' : screenTime >= 5 ? 'warn' : 'good';
  const screenMsg    =
    screenTime >= 8 ? 'Very high — major driver of eye strain' :
    screenTime >= 6 ? 'High — exceeds safe daily limit' :
    screenTime >= 4 ? 'Moderate — take regular breaks' : 'Low — well within safe range';

  const sleepBarPct  = Math.min(Math.max(0, ((9 - sleepHours) / 5) * 100), 100);
  const sleepStatus  = sleepHours < 5 ? 'bad' : sleepHours < 7 ? 'warn' : 'good';
  const sleepMsg     =
    sleepHours < 5 ? 'Severely insufficient — eye recovery critically impaired' :
    sleepHours < 6 ? 'Poor — moisture and repair cycles disrupted' :
    sleepHours < 7 ? 'Below optimal — mild eye recovery impact' : 'Good — adequate overnight recovery';

  const symptomBarPct = (cvqRaw / 12) * 100;
  const symptomStatus = cvqRaw >= 8 ? 'bad' : cvqRaw >= 4 ? 'warn' : 'good';
  const symptomCount  = [esFreq, bvFreq, hFreq, deFreq].filter(f => f > 0).length;
  const symptomMsg    = `${symptomCount} of 4 symptoms reported — ` + (
    cvqRaw >= 8 ? 'severe symptom burden' : cvqRaw >= 4 ? 'moderate — monitor closely' : 'mild or none');

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

  // Recommendations — parse, deduplicate by title, then filter/inject breaks
  const rawRecs = prediction.recommendations || [];
  const recs = rawRecs.map((r: unknown) => {
    if (typeof r === 'string') { try { const p = JSON.parse(r); if (p?.title) return p; } catch {} return { title: r, description: '' }; }
    return r as { title: string; description: string; category?: string };
  });

  // Title-level dedup — prevents duplicates stored before the fix was applied
  const _seenTitles = new Set<string>();
  const dedupedRecs = recs.filter((r: any) => {
    const t = r.title ?? '';
    if (_seenTitles.has(t)) return false;
    _seenTitles.add(t);
    return true;
  });

  const injectingBreaks = breaksTaken !== null && breaksTaken < 3;

  // Remove any wellness_tips rec that overlaps with the breaks injection
  // (e.g. "20-20-20 Rule", "Take regular eye breaks", "Eye breaks" category)
  const EYE_BREAK_PATTERNS = /20.20.20|eye break|regular break/i;
  const filteredRecs = injectingBreaks
    ? dedupedRecs.filter((r: any) => {
        const title = r.title ?? '';
        const cat   = r.category ?? '';
        return !EYE_BREAK_PATTERNS.test(title) && !EYE_BREAK_PATTERNS.test(cat);
      })
    : dedupedRecs;

  if (injectingBreaks) {
    filteredRecs.unshift({
      title: 'Take regular eye breaks',
      description: breaksTaken === 0
        ? 'Follow the 20-20-20 rule: every 20 minutes, look at something 20 feet away for 20 seconds.'
        : `Only ${breaksTaken} break${breaksTaken === 1 ? '' : 's'} taken today. Aim for a short break every 20 minutes.`,
      category: 'eye breaks',
    });
  }
  const visibleRecs = filteredRecs.slice(0, 6);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <AuthGuard>
      <MainLayout>
        {/*
          Outer padding shell — keeps content away from viewport edges.
          Inner flex row: left column scrolls, right column sticks.
        */}
        <div className="w-full max-w-[1400px] mx-auto px-4 py-6 sm:px-8 sm:py-8 lg:pr-[440px] xl:pr-[500px]">
          <div className="flex flex-col rounded-[2rem]
            bg-[radial-gradient(circle_at_12%_0%,rgba(249,115,22,0.07),transparent_34%),linear-gradient(160deg,rgba(251,191,100,0.09),rgba(249,115,22,0.03)_50%,rgba(180,100,30,0.05))]
            dark:bg-[radial-gradient(circle_at_12%_0%,rgba(249,115,22,0.15),transparent_34%),linear-gradient(135deg,rgba(67,28,12,0.48),rgba(15,10,7,0.1)_48%,rgba(120,53,15,0.13))]
            px-5 py-7 sm:px-8 sm:py-10">

            {/* ══════════════════════════════════
                LEFT — scrollable content stack
            ══════════════════════════════════ */}
            <div className="w-full flex flex-col gap-6">

              {/* Page header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#f97316]/20">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f97316]">Personal health overview</p>
                  <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mt-1.5">
                    Risk <span className="text-[#f97316]">Assessment</span>
                  </h1>
                  <p className="text-muted-foreground text-sm mt-1">Based on your latest daily log</p>
                </div>
                <button
                  onClick={() => router.push('/daily-log')}
                  className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all
                    bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-orange-500/30
                    hover:from-amber-400 hover:to-orange-400 hover:shadow-orange-400/40 hover:scale-[1.02]
                    dark:from-amber-600 dark:to-orange-600 dark:shadow-orange-600/20
                    self-start sm:self-auto flex-shrink-0"
                >
                  <ArrowRight className="w-4 h-4" />
                  Update Log
                </button>
              </div>

              {/* ── CVS-Smart + EyeGuard score cards ──────────────────────── */}
              {(() => {
                const cvsqScore  = prediction.cvsq_score  ?? null;
                const cvsqStatus = prediction.cvsq_status ?? '—';
                const cvsqQ1     = prediction.cvsq_q1 ?? null;
                const cvsqQ2     = prediction.cvsq_q2 ?? null;
                const cvsqQ3     = prediction.cvsq_q3 ?? null;
                const cvsqQ4     = prediction.cvsq_q4 ?? null;
                const cvsqQ5     = prediction.cvsq_q5 ?? null;
                const concordant = prediction.concordant;
                const scenario   = prediction.concordance_scenario;

                const cvsqTier = cvsqScore == null ? 0 : cvsqScore >= 7 ? 3 : cvsqScore >= 5 ? 2 : cvsqScore >= 3 ? 1 : 0;
                const CVSQ_META = {
                  0: { text: 'text-green-500  dark:text-green-400',  bg: 'bg-green-500',  card: 'border-green-500/30  bg-green-500/5'  },
                  1: { text: 'text-yellow-500 dark:text-yellow-400', bg: 'bg-yellow-500', card: 'border-yellow-500/30 bg-yellow-500/5' },
                  2: { text: 'text-orange-500 dark:text-orange-400', bg: 'bg-orange-500', card: 'border-orange-500/30 bg-orange-500/5' },
                  3: { text: 'text-red-500    dark:text-red-400',    bg: 'bg-red-500',    card: 'border-red-500/30    bg-red-500/5'    },
                } as const;
                const cm = CVSQ_META[cvsqTier as 0|1|2|3];

                const cvsqAction =
                  cvsqScore == null ? 'Submit the survey to see your CVS-Smart result.' :
                  cvsqScore >= 7 ? 'Consult an ophthalmologist — this score indicates confirmed CVS.' :
                  cvsqScore >= 5 ? 'Consider confirming with an eye care professional to rule out CVS.' :
                  cvsqScore >= 3 ? 'Low probability of CVS. Monitor symptoms, recheck every 6 months.' :
                  cvsqScore >= 1 ? 'No CVS detected. Continue following protective screen habits.' :
                  'No CVS symptoms detected. Keep up your current habits.';

                // Plain-language score explanations
                const cvsqExplain = (() => {
                  if (cvsqQ1 == null) return 'The CVS-Smart score sums five sub-scores (0–2 pts each, max 10). Submit the survey to see your breakdown.';
                  const lines: string[] = [];
                  if (cvsqQ1 === 0) lines.push('No visual complaints (blurred vision, eye strain, halos, etc.) → 0 pts.');
                  else if (cvsqQ1 === 1) lines.push('1 visual complaint → 1 pt.');
                  else lines.push('2+ visual complaints → 2 pts.');
                  if (cvsqQ2 === 0) lines.push('No ocular surface complaints (dry eyes, redness, irritation, etc.) → 0 pts.');
                  else if (cvsqQ2 === 1) lines.push('1 ocular surface complaint → 1 pt.');
                  else lines.push('2+ ocular surface complaints → 2 pts.');
                  if (cvsqQ3 === 0) lines.push('No extraocular complaints (headaches, neck/back pain, etc.) → 0 pts.');
                  else if (cvsqQ3 === 1) lines.push('1 extraocular complaint → 1 pt.');
                  else lines.push('2+ extraocular complaints → 2 pts.');
                  lines.push(`Complaint frequency: ${['Rare — less than twice a month', 'Infrequent — about once or twice a week', 'Frequent — most days'][cvsqQ4 ?? 0]} → ${cvsqQ4} pt${cvsqQ4 === 1 ? '' : 's'}.`);
                  lines.push(`Screen association: ${['Never linked to screen use', 'Sometimes occur during screen use', 'Always occur during screen use'][cvsqQ5 ?? 0]} → ${cvsqQ5} pt${cvsqQ5 === 1 ? '' : 's'}.`);
                  lines.push(`Total: ${cvsqScore}/10 → ${cvsqStatus}.`);
                  return lines.join(' ');
                })();

                const egExplain = (() => {
                  const lines: string[] = [];
                  const activeSyms = [
                    ['Blurred vision', latestLog?.sym_blurred_vision],
                    ['Dry eyes', latestLog?.sym_dry_eyes],
                    ['Eye irritation', latestLog?.sym_eye_irritation],
                    ['Headaches', latestLog?.sym_headaches],
                    ['Light sensitivity', latestLog?.sym_light_sensitivity],
                    ['Difficulty focusing', latestLog?.sym_difficulty_focusing],
                    ['Mental fatigue', latestLog?.sym_mental_fatigue],
                    ['Neck/shoulder pain', latestLog?.sym_neck_shoulder_pain],
                    ['Eye itchiness', latestLog?.sym_eye_itchiness],
                  ].filter(([, v]) => v && v !== 'Never') as [string, string][];
                  if (activeSyms.length === 0) lines.push('You reported no symptoms — symptom score is 0.');
                  else lines.push(`Symptoms: ${activeSyms.map(([n, f]) => `${n} (${f})`).join(', ')}. These add the most points.`);
                  if (screenTime >= 8) lines.push(`Screen time ${screenTime}h — above the safe limit, adds significant points.`);
                  else if (screenTime >= 5) lines.push(`Screen time ${screenTime}h — moderately high, adds some points.`);
                  else if (screenTime > 0) lines.push(`Screen time ${screenTime}h — within a manageable range.`);
                  if (sleepHours < 6) lines.push(`Sleep ${sleepHours}h — well below the 7–9h optimal, adds points.`);
                  else if (sleepHours < 7) lines.push(`Sleep ${sleepHours}h — slightly below optimal, minor penalty.`);
                  else lines.push(`Sleep ${sleepHours}h — healthy range, no penalty.`);
                  if (brightness < 40) lines.push(`Screen brightness ${brightness}% is too dim — causes squinting strain, adds points.`);
                  else if (brightness > 80) lines.push(`Screen brightness ${brightness}% is too bright — glare strain, adds points.`);
                  else lines.push(`Screen brightness ${brightness}% is in the optimal 40–80% range.`);
                  if (latestLog?.follows_20_20_20 === 'Always') lines.push('You follow the 20-20-20 rule — reduces your score.');
                  if (latestLog?.break_frequency === 'Rarely take breaks') lines.push('Rarely taking breaks adds points.');
                  if (latestLog?.dark_room_use === 'Always') lines.push('Always using screens in dark rooms adds points.');
                  return lines.join(' ');
                })();

                return (
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#f97316]">Daily log result</p>
                      <h2 className="text-2xl font-bold text-foreground mt-1">Your Assessment Scores</h2>
                      <p className="text-sm text-muted-foreground mt-0.5">Two separate instruments — each tells you something different about your eye health.</p>
                    </div>

                    {/* CVS-Smart card */}
                    <div className={`rounded-2xl border-2 overflow-hidden ${cm.card}`}>
                      <div className="flex flex-col sm:flex-row sm:items-start">
                        {/* Score column */}
                        <div className="flex-shrink-0 px-7 py-6 sm:w-56 sm:border-r border-white/10 flex flex-col gap-2">
                          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">CVS-Smart Score</p>
                          <div className="flex items-end gap-1.5">
                            <span className={`text-8xl font-extrabold tabular-nums leading-none ${cm.text}`}>{cvsqScore ?? '—'}</span>
                            <span className="text-3xl font-semibold text-muted-foreground pb-2">/ 10</span>
                          </div>
                          <p className={`text-base font-bold ${cm.text}`}>{cvsqStatus}</p>
                          <div className="space-y-1 mt-1">
                            <div className="h-2.5 rounded-full bg-black/15 dark:bg-white/10 overflow-hidden">
                              <div className={`h-full rounded-full ${cm.bg} transition-all duration-700`} style={{ width: `${cvsqScore != null ? (cvsqScore / 10) * 100 : 0}%` }} />
                            </div>
                            <div className="flex justify-between text-[9px] text-muted-foreground"><span>0</span><span>3</span><span>5</span><span>7</span><span>10</span></div>
                          </div>
                        </div>
                        {/* Details column */}
                        <div className="flex-1 px-6 py-6 space-y-3">
                          {cvsqQ1 != null && (
                            <div className="flex flex-wrap gap-2">
                              {[
                                { label: 'Visual',        val: cvsqQ1 },
                                { label: 'Ocular',        val: cvsqQ2 },
                                { label: 'Extraocular',   val: cvsqQ3 },
                                { label: 'Frequency',     val: cvsqQ4 },
                                { label: 'Screen-linked', val: cvsqQ5 },
                              ].map(({ label, val }) => (
                                <span key={label} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-semibold ${
                                  val === 2 ? `${cm.text} border-current bg-current/10` :
                                  val === 1 ? 'text-yellow-500 border-yellow-400/40 bg-yellow-400/10' :
                                  'text-muted-foreground border-border bg-muted/30'}`}>
                                  <span className="font-extrabold">{val}/2</span>
                                  <span className="font-normal opacity-75">{label}</span>
                                </span>
                              ))}
                            </div>
                          )}
                          <p className={`text-sm font-medium leading-relaxed ${cm.text}`}>{cvsqAction}</p>
                        </div>
                      </div>
                      <details className="group border-t border-white/10">
                        <summary className="flex items-center justify-between gap-3 px-6 py-3 cursor-pointer list-none hover:bg-white/5 transition-colors select-none">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">How this score was calculated</span>
                          <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-180 flex-shrink-0" />
                        </summary>
                        <div className="px-6 pb-5 pt-2 border-t border-white/5">
                          <p className="text-sm text-muted-foreground leading-relaxed">{cvsqExplain}</p>
                        </div>
                      </details>
                    </div>

                    {/* EyeGuard card */}
                    <div className={`rounded-2xl border-2 overflow-hidden ${meta.card}`}>
                      <div className="flex flex-col sm:flex-row sm:items-start">
                        {/* Score column */}
                        <div className="flex-shrink-0 px-7 py-6 sm:w-56 sm:border-r border-white/10 flex flex-col gap-2">
                          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">EyeGuard Score</p>
                          <div className="flex items-end gap-1.5">
                            <span className={`text-8xl font-extrabold tabular-nums leading-none ${meta.text}`}>{riskPct.toFixed(0)}</span>
                            <span className="text-3xl font-semibold text-muted-foreground pb-2">/ 100</span>
                          </div>
                          <div className={`inline-flex items-center gap-1.5 text-base font-bold ${meta.text}`}>
                            {riskLvl === 0 && <CheckCircle2 className="w-4 h-4" />}
                            {riskLvl === 1 && <Activity className="w-4 h-4" />}
                            {riskLvl >= 2 && <AlertTriangle className="w-4 h-4" />}
                            {meta.label}
                          </div>
                          <div className="space-y-1 mt-1">
                            <div className="h-2.5 rounded-full bg-black/15 dark:bg-white/10 overflow-hidden">
                              <div className={`h-full rounded-full ${meta.bg} transition-all duration-700`} style={{ width: `${riskPct}%` }} />
                            </div>
                            <div className="flex justify-between text-[9px] text-muted-foreground"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>
                          </div>
                        </div>
                        {/* Details column */}
                        <div className="flex-1 px-6 py-6 space-y-3">
                          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                            {[
                              { label: 'Symptoms',    pct: Math.min(100, (cvqRaw / 12) * 100),    color: cvqRaw >= 8 ? 'bg-red-500' : cvqRaw >= 4 ? 'bg-yellow-500' : 'bg-green-500' },
                              { label: 'Screen time', pct: Math.min(100, (screenTime / 12) * 100), color: screenTime >= 8 ? 'bg-red-500' : screenTime >= 5 ? 'bg-yellow-500' : 'bg-green-500' },
                              { label: 'Sleep',       pct: Math.min(100, Math.max(0, ((9 - sleepHours) / 5) * 100)), color: sleepHours < 6 ? 'bg-red-500' : sleepHours < 7 ? 'bg-yellow-500' : 'bg-green-500' },
                              { label: 'Brightness',  pct: Math.min(100, (Math.max(0, brightness < 40 ? 40 - brightness : brightness > 80 ? brightness - 80 : 0) / 40) * 100), color: 'bg-orange-400' },
                            ].map(({ label, pct, color }) => (
                              <div key={label} className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground w-24 flex-shrink-0">{label}</span>
                                <div className="flex-1 h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                                  <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-xs text-muted-foreground w-9 text-right tabular-nums">{pct.toFixed(0)}%</span>
                              </div>
                            ))}
                          </div>
                          <p className={`text-sm font-medium leading-relaxed ${meta.text}`}>
                            {riskLvl === 3 ? '⚠ Critical: rest your eyes immediately and consider consulting an eye care professional.' :
                             riskLvl === 2 ? 'High: reduce screen time, follow the 20-20-20 rule, and act on the recommendations below.' :
                             riskLvl === 1 ? 'Moderate: small habit improvements can lower your score before symptoms develop.' :
                             '✓ Low risk — your screen habits and environment are within a healthy range.'}
                          </p>
                        </div>
                      </div>
                      <details className="group border-t border-white/10">
                        <summary className="flex items-center justify-between gap-3 px-6 py-3 cursor-pointer list-none hover:bg-white/5 transition-colors select-none">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">How this score was calculated</span>
                          <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-180 flex-shrink-0" />
                        </summary>
                        <div className="px-6 pb-5 pt-2 border-t border-white/5">
                          <p className="text-sm text-muted-foreground leading-relaxed">{egExplain}</p>
                        </div>
                      </details>
                    </div>

                    {/* Concordance banner */}
                    {concordant != null && (
                      <div className={`rounded-2xl border p-4 flex gap-3 items-start ${
                        concordant ? 'border-green-500/30 bg-green-500/5' :
                        scenario === 'cvsq_high_eyeguard_low' ? 'border-orange-500/30 bg-orange-500/5' :
                        'border-blue-500/30 bg-blue-500/5'
                      }`}>
                        <span className="text-xl flex-shrink-0 mt-0.5">{concordant ? '✅' : scenario === 'cvsq_high_eyeguard_low' ? '⚠️' : '💡'}</span>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {concordant ? 'Both instruments agree on your risk level' :
                             scenario === 'cvsq_high_eyeguard_low' ? 'CVS-Smart detects active symptoms; EyeGuard sees relatively healthy habits' :
                             'EyeGuard detects risky habits; no active CVS symptoms reported yet'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {concordant ? 'The CVS-Smart clinical score and your EyeGuard behavioral score point to the same severity level. This cross-validation strengthens the reliability of your result.' :
                             scenario === 'cvsq_high_eyeguard_low' ? 'Your CVS-Smart score suggests symptoms consistent with CVS, but your behavioral habits are relatively healthy. Consider consulting an eye care professional.' :
                             'You haven\'t reported significant active symptoms yet, but your screen habits match a known early-warning risk pattern for CVS. Acting now can prevent symptoms from developing.'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Recommendations */}
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
                            {rec.category && (
                              <span className="block text-[11px] font-bold text-muted-foreground mt-0.5">
                                {rec.category.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                              </span>
                            )}
                          </span>
                          <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-180 flex-shrink-0" />
                        </summary>
                        {rec.description && <p className="px-4 pb-4 pl-12 text-xs leading-relaxed text-muted-foreground">{rec.description}</p>}
                      </details>
                    ))}
                  </div>
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

            </div>{/* end left column */}

          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            FIXED RIGHT PANEL — mascot always visible on scroll.
            Positioned from right edge of page, vertically
            spanning the full content area.
        ══════════════════════════════════════════════════════ */}
        <div className="hidden lg:flex fixed bottom-0 w-[420px] xl:w-[460px] flex-col items-stretch gap-3 px-4 pt-6 pb-4 pointer-events-none z-20"
          style={{ left: '60%', top: '7rem' }}>

          {/* Bubble — pointer-events back on so it's readable */}
          <div className="pointer-events-auto">
            <MascotBubble riskLvl={riskLvl} msg={meta.mascotMsg} size="lg" />
          </div>

          {/* Robot — fills all remaining fixed panel height */}
          <div className="relative flex-1 w-full">
            <Image
              key={meta.mascot}
              src={meta.mascot}
              alt={`EyeGuard mascot — ${meta.label} risk`}
              fill
              className="object-contain object-top animate-mascot-enter drop-shadow-2xl"
              priority
            />
          </div>

        </div>

        {/* Mobile mascot — stacks below content on small screens */}
        <div className="flex lg:hidden w-full max-w-[1400px] mx-auto px-4 sm:px-8 flex-col items-center gap-4 pb-8">
          <div className="w-full">
            <MascotBubble riskLvl={riskLvl} msg={meta.mascotMsg} size="sm" />
          </div>
          <div className="relative w-64 h-64">
            <Image
              key={`mobile-${meta.mascot}`}
              src={meta.mascot}
              alt={`EyeGuard mascot — ${meta.label} risk`}
              fill
              className="object-contain animate-mascot-enter drop-shadow-xl"
              priority
            />
          </div>
        </div>
      </MainLayout>
    </AuthGuard>
  );
}
