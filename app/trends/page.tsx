'use client';

import { useEffect, useState, useMemo } from 'react';
import { Calendar, TrendingUp, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { MainLayout } from '@/components/main-layout';
import { AuthGuard } from '@/components/auth-guard';
import { ChartCard, MetricCard } from '@/components/dashboard-card';
import { SelectField, Button } from '@/components/form-components';

interface ChartPoint {
  date: string;
  label: string;
  eyeStrain: number;
  screenTime: number;
  fatigue: number;
}

const TIME_RANGE_DAYS: Record<string, number> = { '7days': 7, '30days': 30, '90days': 90 };

function formatDateLabel(isoDate: string): string {
  const [, month, day] = isoDate.split('-');
  return `${month}/${day}`;
}

export default function TrendsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [metric, setMetric] = useState<'eyeStrain' | 'screenTime' | 'fatigue'>('eyeStrain');
  const [timeRange, setTimeRange] = useState('30days');
  const [isLoading, setIsLoading] = useState(true);
  const [allPoints, setAllPoints] = useState<ChartPoint[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        const { data: logs, error: logsError } = await supabase
          .from('daily_logs')
          .select('id, date, screen_time')
          .eq('user_id', user.id)
          .order('date', { ascending: true });

        if (logsError) throw logsError;
        if (!logs || logs.length === 0) { setAllPoints([]); return; }

        const logIds = logs.map((l: any) => l.id);
        const { data: preds } = await supabase
          .from('predictions')
          .select('daily_log_id, risk_percentage, fatigue_score')
          .in('daily_log_id', logIds);

        const predMap: Record<string, { risk_percentage: number; fatigue_score: number }> = {};
        (preds || []).forEach((p: any) => {
          predMap[p.daily_log_id] = { risk_percentage: p.risk_percentage ?? 0, fatigue_score: p.fatigue_score ?? 0 };
        });

        const points: ChartPoint[] = logs.map((log: any) => {
          const pred = predMap[log.id];
          return {
            date: log.date,
            label: formatDateLabel(log.date),
            eyeStrain: pred ? Number(pred.risk_percentage) : 0,
            screenTime: log.screen_time ? Number(log.screen_time) : 0,
            fatigue: pred ? Math.min(Number(pred.fatigue_score) * 10, 100) : 0,
          };
        });
        setAllPoints(points);
      } catch (err) {
        console.error('Error loading trend data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [router, supabase]);

  const days = TIME_RANGE_DAYS[timeRange] ?? 30;
  const filteredPoints = useMemo(() => allPoints.slice(-days), [allPoints, days]);
  const values = filteredPoints.map(p => p[metric]);
  const minValue = values.length ? Math.min(...values) : 0;
  const maxValue = values.length ? Math.max(...values) : 0;
  const avgValue = values.length ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) : '0.0';

  const calcTrend = (pts: ChartPoint[], key: 'eyeStrain' | 'screenTime' | 'fatigue') => {
    if (pts.length < 2) return { change: '0.0%', trend: 'neutral' as const };
    const first = pts[0][key], last = pts[pts.length - 1][key];
    if (first === 0) return { change: '0.0%', trend: 'neutral' as const };
    const pct = ((last - first) / first) * 100;
    return { change: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`, trend: (pct > 5 ? 'up' : pct < -5 ? 'down' : 'neutral') as 'up' | 'down' | 'neutral' };
  };

  const metricMeta = {
    eyeStrain: { label: 'Eye Strain Risk', unit: '%', current: filteredPoints.length ? Math.round(filteredPoints[filteredPoints.length - 1].eyeStrain) : 0, ...calcTrend(filteredPoints, 'eyeStrain'), color: '#ef4444' },
    screenTime: { label: 'Daily Screen Time', unit: 'hrs', current: filteredPoints.length ? filteredPoints[filteredPoints.length - 1].screenTime.toFixed(1) : '0.0', ...calcTrend(filteredPoints, 'screenTime'), color: 'var(--color-primary)' },
    fatigue: { label: 'Fatigue Index', unit: '/100', current: filteredPoints.length ? Math.round(filteredPoints[filteredPoints.length - 1].fatigue) : 0, ...calcTrend(filteredPoints, 'fatigue'), color: '#f59e0b' },
  };
  const selected = metricMeta[metric];

  if (isLoading) {
    return (
      <AuthGuard><MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <div className="inline-block p-4 bg-muted rounded-full"><TrendingUp className="w-8 h-8 text-primary animate-pulse" /></div>
            <p className="text-lg text-muted-foreground">Loading trends...</p>
          </div>
        </div>
      </MainLayout></AuthGuard>
    );
  }

  if (allPoints.length === 0) {
    return (
      <AuthGuard><MainLayout>
        <div className="space-y-8">
          <div><h1 className="text-3xl md:text-4xl font-bold text-foreground">Trends Analysis</h1><p className="text-muted-foreground mt-2">Track long-term patterns in your eye health</p></div>
          <div className="flex items-center justify-center min-h-96 rounded-lg border-2 border-dashed border-border bg-muted/30">
            <div className="text-center space-y-4 p-8">
              <div className="inline-block p-4 bg-primary/10 rounded-full"><AlertCircle className="w-12 h-12 text-primary" /></div>
              <h2 className="text-2xl font-bold text-foreground">No Trend Data Yet</h2>
              <p className="text-muted-foreground max-w-md">Trends appear after you log multiple days of data.</p>
              <Button variant="primary" size="lg" onClick={() => router.push('/daily-log')}>Start Logging</Button>
            </div>
          </div>
        </div>
      </MainLayout></AuthGuard>
    );
  }

  return (
    <AuthGuard><MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div><h1 className="text-3xl md:text-4xl font-bold text-foreground">Trends Analysis</h1><p className="text-muted-foreground mt-2">Track long-term patterns in your eye health</p></div>
          <div className="w-full sm:w-auto">
            <SelectField options={[{ value: '7days', label: 'Last 7 days' }, { value: '30days', label: 'Last 30 days' }, { value: '90days', label: 'Last 90 days' }]} value={timeRange} onChange={(e) => setTimeRange(e.target.value)} />
          </div>
        </div>

        {/* Metric selector */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(Object.keys(metricMeta) as Array<keyof typeof metricMeta>).map((key) => {
            const m = metricMeta[key];
            return (
              <button key={key} onClick={() => setMetric(key)} className={`p-4 rounded-lg border-2 transition-all text-left ${metric === key ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                <p className="text-sm font-medium text-muted-foreground">{m.label}</p>
                <div className="flex items-baseline gap-2 mt-2"><span className="text-2xl font-bold text-foreground">{m.current}</span><span className="text-sm text-muted-foreground">{m.unit}</span></div>
                <div className={`text-sm font-semibold mt-1 ${m.trend === 'up' ? 'text-destructive' : m.trend === 'down' ? 'text-green-600 dark:text-green-500' : 'text-muted-foreground'}`}>{m.change}</div>
              </button>
            );
          })}
        </div>

        {/* Line chart */}
        <ChartCard title={selected.label} description={`${days}-day trend · ${filteredPoints.length} entr${filteredPoints.length === 1 ? 'y' : 'ies'}`}>
          {filteredPoints.length === 0 ? (
            <div className="h-80 flex items-center justify-center text-muted-foreground">No data for this time range</div>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredPoints} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, metric === 'screenTime' ? 'auto' : 100]} unit={metric === 'screenTime' ? 'h' : '%'} width={40} />
                  <Tooltip formatter={(v: number) => [`${v.toFixed(1)} ${selected.unit}`, selected.label]} labelFormatter={(l) => `Date: ${l}`} contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)' }} />
                  <Line type="monotone" dataKey={metric} stroke={selected.color} strokeWidth={2} dot={{ r: 3, fill: selected.color }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-border grid grid-cols-3 gap-4 text-center">
            <div><p className="text-xs text-muted-foreground">Minimum</p><p className="text-lg font-bold text-foreground mt-1">{minValue.toFixed(1)} {selected.unit}</p></div>
            <div><p className="text-xs text-muted-foreground">Average</p><p className="text-lg font-bold text-foreground mt-1">{avgValue} {selected.unit}</p></div>
            <div><p className="text-xs text-muted-foreground">Maximum</p><p className="text-lg font-bold text-foreground mt-1">{maxValue.toFixed(1)} {selected.unit}</p></div>
          </div>
        </ChartCard>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard title={`${days}-Day Average`} value={avgValue} unit={selected.unit} icon={<Calendar className="w-6 h-6 text-primary" />} />
          <MetricCard title="Peak Value" value={maxValue.toFixed(1)} unit={selected.unit} icon={<TrendingUp className="w-6 h-6 text-destructive" />} />
          <MetricCard title="Lowest Value" value={minValue.toFixed(1)} unit={selected.unit} icon={<TrendingUp className="w-6 h-6 text-green-600 dark:text-green-500" />} />
        </div>

        {/* Insights */}
        <ChartCard title="Trend Insights">
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm font-semibold text-primary">Pattern Analysis</p>
              <p className="text-sm text-primary/80 mt-2">
                {selected.trend === 'up' ? `Your ${selected.label.toLowerCase()} has been increasing. Consider implementing preventive measures.` :
                 selected.trend === 'down' ? `Your ${selected.label.toLowerCase()} has been decreasing — a positive sign. Keep up your current habits.` :
                 `Your ${selected.label.toLowerCase()} has been relatively stable across your logged entries.`}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted border border-border">
              <p className="text-sm font-semibold text-foreground">Data Range</p>
              <p className="text-sm text-muted-foreground mt-2">
                Based on {filteredPoints.length} log {filteredPoints.length === 1 ? 'entry' : 'entries'} over the last {days} days.
                Min: {minValue.toFixed(1)}{selected.unit} · Avg: {avgValue}{selected.unit} · Max: {maxValue.toFixed(1)}{selected.unit}
              </p>
            </div>
          </div>
        </ChartCard>
      </div>
    </MainLayout></AuthGuard>
  );
}
