'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Activity, Moon, Monitor, Coffee, Sun, Eye } from 'lucide-react';
import { MainLayout } from '@/components/main-layout';
import { AuthGuard } from '@/components/auth-guard';
import { ChartCard, MetricCard } from '@/components/dashboard-card';
import { Button } from '@/components/form-components';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, LineChart, Line, Legend,
} from 'recharts';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Factor {
  name: string;
  avgValue: string;
  unit: string;
  contribution: number;
  max: number;
  status: 'healthy' | 'warning' | 'critical';
  message: string;
}

interface CorrelationRow {
  factor: string;
  avgDisplay: string;
  correlations: Record<string, { r: number; strength: string; direction: string }>;
}

interface SymptomDist {
  symptom: string;
  counts: number[];
}

interface AnalysisData {
  hasData: boolean;
  totalLogs: number;
  summary: {
    avgScreenTime: number;
    avgSleepHours: number;
    symptomPresencePct: {
      eyeStrain: number;
      headaches: number;
      blurryVision: number;
      dryEyes: number;
    };
  };
  correlationMatrix: CorrelationRow[];
  symptomDistribution: SymptomDist[];
  freqLabels: string[];
  trendData: Array<{
    label: string;
    screenTime: number;
    sleepHours: number;
    eyeStrain: number;
    headaches: number;
    blurryVision: number;
    dryEyes: number;
  }>;
  longTermRisk: {
    overallRisk: number;
    riskLevel: string;
    factors: Factor[];
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const RISK_COLORS: Record<string, string> = {
  Low:      'text-green-600 dark:text-green-400',
  Moderate: 'text-yellow-600 dark:text-yellow-400',
  High:     'text-orange-600 dark:text-orange-400',
  Critical: 'text-red-600 dark:text-red-400',
};

const RISK_BG: Record<string, string> = {
  Low:      'bg-green-500',
  Moderate: 'bg-yellow-500',
  High:     'bg-orange-500',
  Critical: 'bg-red-500',
};

const STATUS_BAR: Record<string, string> = {
  healthy:  'bg-green-500',
  warning:  'bg-yellow-500',
  critical: 'bg-red-500',
};

const STATUS_BADGE: Record<string, string> = {
  healthy:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  warning:  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const STRENGTH_COLOR: Record<string, string> = {
  None:     'text-muted-foreground',
  Weak:     'text-primary',
  Moderate: 'text-yellow-500',
  Strong:   'text-red-500',
};

const STRENGTH_BG: Record<string, string> = {
  None:     'bg-muted/50',
  Weak:     'bg-primary/10',
  Moderate: 'bg-yellow-500/20',
  Strong:   'bg-red-500/20',
};

const FACTOR_ICONS: Record<string, React.ReactNode> = {
  'Screen Time':         <Monitor className="w-5 h-5" />,
  'Sleep':               <Moon className="w-5 h-5" />,
  'Symptom Frequency':   <Activity className="w-5 h-5" />,
  'Eye Breaks':          <Coffee className="w-5 h-5" />,
  'Screen Brightness':   <Sun className="w-5 h-5" />,
};

const SYMPTOM_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e'];

// ── Component ─────────────────────────────────────────────────────────────────

export default function FactorAnalysisPage() {
  const router = useRouter();
  const [data, setData] = useState<AnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/factor-analysis')
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => setError('Failed to load analysis data.'))
      .finally(() => setIsLoading(false));
  }, []);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <AuthGuard>
        <MainLayout>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center space-y-4">
              <div className="inline-block p-4 bg-muted rounded-full">
                <Activity className="w-8 h-8 text-primary animate-pulse" />
              </div>
              <p className="text-lg text-muted-foreground">Analysing your data...</p>
            </div>
          </div>
        </MainLayout>
      </AuthGuard>
    );
  }

  // ── No data ──────────────────────────────────────────────────────────────
  if (error || !data || !data.hasData) {
    return (
      <AuthGuard>
        <MainLayout>
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-bold text-foreground">Factor Analysis</h1>
              <p className="text-muted-foreground mt-2">How your habits connect to your eye health</p>
            </div>
            <div className="flex items-center justify-center min-h-96 rounded-lg border-2 border-dashed border-border bg-muted/30">
              <div className="text-center space-y-4 p-8">
                <div className="inline-block p-4 bg-primary/10 rounded-full">
                  <AlertCircle className="w-12 h-12 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">No Data Yet</h2>
                <p className="text-muted-foreground max-w-md">
                  Log your daily habits at least once to see how your screen time, sleep,
                  and other factors connect to your symptoms.
                </p>
                <Button variant="primary" size="lg" onClick={() => router.push('/daily-log')}>
                  Start Logging
                </Button>
              </div>
            </div>
          </div>
        </MainLayout>
      </AuthGuard>
    );
  }

  const { summary, correlationMatrix, symptomDistribution, freqLabels, trendData, longTermRisk } = data;

  // ── Radar data: factor contribution as % of their max ────────────────────
  const radarData = longTermRisk.factors.map(f => ({
    subject: f.name,
    value: parseFloat(((f.contribution / f.max) * 100).toFixed(1)),
  }));

  // ── Symptom distribution chart data ──────────────────────────────────────
  const distChartData = freqLabels.map((label, i) => ({
    freq: label,
    'Eye Strain':    symptomDistribution.find(s => s.symptom === 'Eye Strain')?.counts[i]    ?? 0,
    'Headaches':     symptomDistribution.find(s => s.symptom === 'Headaches')?.counts[i]     ?? 0,
    'Blurry Vision': symptomDistribution.find(s => s.symptom === 'Blurry Vision')?.counts[i] ?? 0,
    'Dry Eyes':      symptomDistribution.find(s => s.symptom === 'Dry Eyes')?.counts[i]      ?? 0,
  }));

  const riskColor = RISK_COLORS[longTermRisk.riskLevel] ?? 'text-foreground';
  const riskBg    = RISK_BG[longTermRisk.riskLevel]     ?? 'bg-primary';

  return (
    <AuthGuard>
      <MainLayout>
        <div className="min-h-[calc(100vh-7rem)] w-full max-w-6xl mx-auto space-y-10 rounded-[2rem] bg-[radial-gradient(circle_at_8%_0%,rgba(249,115,22,0.08),transparent_30%),linear-gradient(160deg,rgba(251,191,100,0.10),rgba(249,115,22,0.04)_50%,rgba(180,100,30,0.06))] dark:bg-[radial-gradient(circle_at_8%_0%,rgba(249,115,22,0.14),transparent_32%),linear-gradient(135deg,rgba(67,28,12,0.45),rgba(15,10,7,0.08)_52%,rgba(120,53,15,0.12))] px-4 py-6 sm:px-8 sm:py-10">

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-[#f97316]/15 pb-6">
            <div>
              <h1 className="text-4xl font-bold text-foreground">Factor Analysis</h1>
              <p className="text-muted-foreground mt-2">
                How your habits connect to your eye health · {data.totalLogs} logged {data.totalLogs === 1 ? 'day' : 'days'}
              </p>
            </div>
          </div>

          {/* ── Summary cards ───────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Avg Screen Time"
              value={summary.avgScreenTime}
              unit="h/day"
              icon={<Monitor className="w-6 h-6 text-primary" />}
              description={summary.avgScreenTime >= 6 ? 'Above safe limit' : 'Within range'}
            />
            <MetricCard
              title="Avg Sleep"
              value={summary.avgSleepHours}
              unit="h/night"
              icon={<Moon className="w-6 h-6 text-primary" />}
              description={summary.avgSleepHours < 7 ? 'Below recommended' : 'Adequate'}
            />
            <MetricCard
              title="Eye Strain Days"
              value={`${summary.symptomPresencePct.eyeStrain}%`}
              icon={<Eye className="w-6 h-6 text-primary" />}
              description="of logged days"
            />
            <MetricCard
              title="Long-term Risk"
              value={`${longTermRisk.overallRisk}%`}
              icon={<Activity className="w-6 h-6 text-primary" />}
              description={longTermRisk.riskLevel}
            />
          </div>

          {/* ── Long-term risk gauge + radar ────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Risk gauge */}
            <ChartCard
              title="Long-term Risk"
              description="Estimated risk of developing a chronic eye condition if current habits continue"
            >
              <div className="space-y-6">
                {/* Big number */}
                <div className="flex items-end gap-3">
                  <span className={`text-6xl font-bold ${riskColor}`}>
                    {longTermRisk.overallRisk}%
                  </span>
                  <span className={`mb-2 px-3 py-1 rounded-full text-sm font-semibold ${STATUS_BADGE[
                    longTermRisk.riskLevel === 'Low' ? 'healthy' :
                    longTermRisk.riskLevel === 'Critical' ? 'critical' : 'warning'
                  ]}`}>
                    {longTermRisk.riskLevel}
                  </span>
                </div>

                {/* Full-width progress bar */}
                <div className="space-y-1">
                  <div className="h-4 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${riskBg}`}
                      style={{ width: `${longTermRisk.overallRisk}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0%</span>
                    <span>25% Moderate</span>
                    <span>50% High</span>
                    <span>75% Critical</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Per-factor bars */}
                <div className="space-y-3 pt-2">
                  {longTermRisk.factors.map(f => (
                    <div key={f.name} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{FACTOR_ICONS[f.name]}</span>
                          <span className="font-medium text-foreground">{f.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[f.status]}`}>
                            {f.avgValue} {f.unit}
                          </span>
                        </div>
                        <span className="font-semibold text-foreground text-xs">
                          {f.contribution}/{f.max}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${STATUS_BAR[f.status]}`}
                          style={{ width: `${(f.contribution / f.max) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">{f.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            </ChartCard>

            {/* Radar */}
            <ChartCard
              title="Risk Profile"
              description="Each axis shows how much a factor is contributing relative to its maximum impact"
            >
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                    <PolarGrid stroke="var(--border)" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 100]}
                      tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                      tickCount={4}
                    />
                    <Radar
                      name="Your Risk"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.25}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* ── Factor vs Symptom correlation matrix ────────────────────── */}
          <ChartCard
            title="What's Driving Your Symptoms"
            description="Shows how strongly each habit is connected to each symptom across all your logged days"
          >
            {/* Mobile: stacked cards */}
            <div className="block sm:hidden space-y-4">
              {correlationMatrix.map(row => (
                <div key={row.factor} className="rounded-lg border border-border p-4 space-y-3">
                  <div>
                    <p className="font-semibold text-foreground">{row.factor}</p>
                    <p className="text-xs text-muted-foreground">Avg: {row.avgDisplay}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(row.correlations).map(([symptom, val]) => (
                      <div
                        key={symptom}
                        className={`rounded-lg p-2 text-center ${STRENGTH_BG[val.strength]}`}
                      >
                        <p className="text-xs text-muted-foreground">{symptom}</p>
                        <p className={`text-sm font-bold ${STRENGTH_COLOR[val.strength]}`}>
                          {val.strength}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: full table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 pr-4 font-semibold text-foreground w-44">Factor</th>
                    <th className="text-center py-3 px-3 font-semibold text-foreground">Eye Strain</th>
                    <th className="text-center py-3 px-3 font-semibold text-foreground">Headaches</th>
                    <th className="text-center py-3 px-3 font-semibold text-foreground">Blurry Vision</th>
                    <th className="text-center py-3 px-3 font-semibold text-foreground">Dry Eyes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {correlationMatrix.map(row => (
                    <tr key={row.factor} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 pr-4">
                        <p className="font-medium text-foreground">{row.factor}</p>
                        <p className="text-xs text-muted-foreground">{row.avgDisplay}</p>
                      </td>
                      {['Eye Strain', 'Headaches', 'Blurry Vision', 'Dry Eyes'].map(s => {
                        const val = row.correlations[s];
                        return (
                          <td key={s} className="py-3 px-3 text-center">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${STRENGTH_BG[val.strength]} ${STRENGTH_COLOR[val.strength]}`}>
                              {val.strength}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-muted-foreground mt-3">
                            Strength is based on how consistently changes in the factor align with changes in the symptom across your logged days.
                            <span className="ml-2 text-primary font-medium">Weak</span>
                            <span className="mx-1">·</span>
                            <span className="text-yellow-500 font-medium">Moderate</span>
                            <span className="mx-1">·</span>
                            <span className="text-red-500 font-medium">Strong</span>
                          </p>
            </div>
          </ChartCard>

          {/* ── Symptom frequency distribution ──────────────────────────── */}
          <ChartCard
            title="How Often Do You Feel Each Symptom?"
            description="Distribution of symptom frequency across all your logged days"
          >
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distChartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="freq" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)' }}
                    formatter={(v: number, name: string) => [`${v} day${v !== 1 ? 's' : ''}`, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
                  {['Eye Strain', 'Headaches', 'Blurry Vision', 'Dry Eyes'].map((s, i) => (
                    <Bar key={s} dataKey={s} fill={SYMPTOM_COLORS[i]} radius={[3, 3, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* ── Trend over time ──────────────────────────────────────────── */}
          {trendData.length > 1 && (
            <ChartCard
              title="Screen Time vs Symptom Severity Over Time"
              description="Tracks how your screen time and symptom levels have moved together"
            >
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis yAxisId="left" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} width={28} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 4]} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} width={28} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
                    <Line yAxisId="left"  type="monotone" dataKey="screenTime"   stroke={'var(--color-primary)'} strokeWidth={2} dot={false} name="Screen Time (h)" />
                    <Line yAxisId="right" type="monotone" dataKey="eyeStrain"    stroke="#ef4444" strokeWidth={1.5} dot={false} name="Eye Strain" strokeDasharray="4 2" />
                    <Line yAxisId="right" type="monotone" dataKey="headaches"    stroke="#f97316" strokeWidth={1.5} dot={false} name="Headaches"  strokeDasharray="4 2" />
                    <Line yAxisId="right" type="monotone" dataKey="blurryVision" stroke="#eab308" strokeWidth={1.5} dot={false} name="Blurry Vision" strokeDasharray="4 2" />
                    <Line yAxisId="right" type="monotone" dataKey="dryEyes"      stroke="#22c55e" strokeWidth={1.5} dot={false} name="Dry Eyes"   strokeDasharray="4 2" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          )}

          {/* ── CTA ─────────────────────────────────────────────────────── */}
          <div className="p-6 rounded-lg bg-primary/10 border border-primary/20">
            <h3 className="text-lg font-semibold text-foreground mb-1">
              Keep logging to improve accuracy
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              The more days you log, the stronger and more reliable the connections between your habits and symptoms become.
            </p>
            <Button variant="primary" size="lg" onClick={() => router.push('/daily-log')}>
              Log Today
            </Button>
          </div>

        </div>
      </MainLayout>
    </AuthGuard>
  );
}
