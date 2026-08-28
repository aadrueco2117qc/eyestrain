'use client';

import { Calendar, Download, TrendingUp, Eye, BarChart3 } from 'lucide-react';
import { MainLayout } from '@/components/main-layout';
import { ChartCard, MetricCard } from '@/components/dashboard-card';
import { Button, SelectField } from '@/components/form-components';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const TIME_RANGE_DAYS: Record<string, number> = {
  '7days': 7,
  '30days': 30,
  '90days': 90,
};

function formatDateLabel(isoDate: string): string {
  const [, month, day] = isoDate.split('-');
  return `${month}/${day}`;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [timeRange, setTimeRange] = useState('7days');
  const [isLoading, setIsLoading] = useState(true);
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [predMap, setPredMap] = useState<Record<string, { risk_percentage: number; fatigue_score: number }>>({});
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        const { data: logs, error } = await supabase
          .from('daily_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: true });

        if (error) { console.error('Error loading logs:', error); return; }

        const logsArr = logs || [];
        setAllLogs(logsArr);
        setHasData(logsArr.length > 0);

        if (logsArr.length > 0) {
          const logIds = logsArr.map((l: any) => l.id);
          const { data: preds } = await supabase
            .from('predictions')
            .select('daily_log_id, risk_percentage, fatigue_score')
            .in('daily_log_id', logIds);

          const map: Record<string, { risk_percentage: number; fatigue_score: number }> = {};
          (preds || []).forEach((p: any) => {
            map[p.daily_log_id] = {
              risk_percentage: p.risk_percentage ?? 0,
              fatigue_score: p.fatigue_score ?? 0,
            };
          });
          setPredMap(map);
        }
      } catch (err) {
        console.error('Error:', err);
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [router, supabase]);

  // Apply time range filter
  const days = TIME_RANGE_DAYS[timeRange] ?? 7;
  const filteredLogs = useMemo(() => allLogs.slice(-days), [allLogs, days]);

  // Build chart points
  const chartPoints = useMemo(() =>
    filteredLogs.map((log: any) => {
      const pred = predMap[log.id];
      return {
        label: formatDateLabel(log.date),
        date: log.date,
        eyeStrain: pred ? Number(pred.risk_percentage) : 0,
        fatigue: pred ? Math.min(Number(pred.fatigue_score) * 10, 100) : 0,
        screenTime: Number(log.screen_time) || 0,
      };
    }), [filteredLogs, predMap]);

  // Derived analytics
  const analytics = useMemo(() => {
    if (filteredLogs.length === 0) return null;
    const n = filteredLogs.length;
    const avgScreenTime = filteredLogs.reduce((s: number, l: any) => s + (l.screen_time || 0), 0) / n;
    const totalHours = filteredLogs.reduce((s: number, l: any) => s + (l.screen_time || 0), 0);
    const avgBreaks = filteredLogs.reduce((s: number, l: any) => s + (l.breaks_taken || 0), 0) / n;

    const eyeStrainCount = filteredLogs.filter((l: any) => l.eye_strain === 1).length;
    const headachesCount = filteredLogs.filter((l: any) => l.headaches === 1).length;
    const dryEyesCount = filteredLogs.filter((l: any) => l.dry_eyes === 1).length;
    const blurryVisionCount = filteredLogs.filter((l: any) => l.blurry_vision === 1).length;

    const symptomFrequency = {
      'Eye Strain': Math.round((eyeStrainCount / n) * 100),
      'Headaches': Math.round((headachesCount / n) * 100),
      'Dry Eyes': Math.round((dryEyesCount / n) * 100),
      'Blurry Vision': Math.round((blurryVisionCount / n) * 100),
    };

    const riskValues = chartPoints.map(p => p.eyeStrain);
    const firstRisk = riskValues[0] ?? 0;
    const lastRisk = riskValues[riskValues.length - 1] ?? 0;
    const trendDirection = lastRisk < firstRisk - 5 ? 'Improving' : lastRisk > firstRisk + 5 ? 'Worsening' : 'Stable';

    const topSymptomEntry = Object.entries(symptomFrequency).sort((a, b) => b[1] - a[1])[0];

    return {
      averageScreenTime: parseFloat(avgScreenTime.toFixed(1)),
      totalHours: parseFloat(totalHours.toFixed(1)),
      averageBreaks: Math.round(avgBreaks),
      trendDirection,
      improving: trendDirection === 'Improving',
      symptomFrequency,
      topSymptom: topSymptomEntry,
      firstRisk,
      lastRisk,
    };
  }, [filteredLogs, chartPoints]);

  // Export as CSV
  const handleExport = () => {
    if (filteredLogs.length === 0) return;
    const boolToYesNo = (v: any) => v === 1 || v === true ? 'Yes' : 'No';
    // Prefix date with a tab to prevent Excel auto-formatting as date
    const formatDate = (d: string) => {
      if (!d) return '';
      const [y, m, day] = d.split('-');
      return `${m}-${day}-${y}`;
    };
    const headers = [
      'Date',
      'Screen Time (hours)',
      'Sleep Hours',
      'Brightness (%)',
      'Breaks Taken',
      'Eye Strain',
      'Headaches',
      'Dry Eyes',
      'Blurry Vision',
      'Risk Level',
    ];
    const rows = filteredLogs.map((l: any) => [
      formatDate(l.date),
      l.screen_time ?? '',
      l.sleep_hours ?? '',
      l.brightness ?? '',
      l.breaks_taken ?? 0,
      boolToYesNo(l.eye_strain),
      boolToYesNo(l.headaches),
      boolToYesNo(l.dry_eyes),
      boolToYesNo(l.blurry_vision),
      l.risk_level ?? '',
    ]);
    const escapeField = (v: any) => {
      const s = String(v ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [headers, ...rows].map(row => row.map(escapeField).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eyeguard-my-data-${timeRange}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <div className="inline-block p-4 bg-muted rounded-full">
              <BarChart3 className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <p className="text-lg text-muted-foreground">Loading analytics…</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!hasData) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-96 rounded-lg border-2 border-dashed border-border bg-muted/30 m-4 md:m-8">
          <div className="text-center space-y-4 p-8">
            <div className="inline-block p-4 bg-primary/10 rounded-full">
              <Eye className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">No Data Yet</h2>
            <p className="text-muted-foreground max-w-sm">
              Complete the daily log survey to start seeing analytics and insights about your eye health.
            </p>
            <button
              onClick={() => router.push('/daily-log')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors"
            >
              Start Daily Log
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">Analytics & Insights</h1>
            <p className="text-muted-foreground mt-2">Analyze your eye health trends over time</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <SelectField
              options={[
                { value: '7days', label: 'Last 7 days' },
                { value: '30days', label: 'Last 30 days' },
                { value: '90days', label: 'Last 90 days' },
              ]}
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
            />
            <Button variant="outline" size="lg" onClick={handleExport} className="w-full sm:w-auto">
              <Download className="w-5 h-5 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard title="Average Daily Screen Time" value={analytics?.averageScreenTime || 0} unit="hours" icon={<Calendar className="w-6 h-6 text-primary" />} />
          <MetricCard
            title="Total Hours This Period"
            value={analytics?.totalHours || 0}
            unit="hours"
            description={`Over ${filteredLogs.length} logged day${filteredLogs.length !== 1 ? 's' : ''}`}
            icon={<TrendingUp className="w-6 h-6 text-secondary" />}
          />
          <MetricCard title="Average Breaks/Day" value={analytics?.averageBreaks || 0} icon={<Calendar className="w-6 h-6 text-accent" />} />
          <MetricCard
            title="Trend Direction"
            value={analytics?.trendDirection || 'Stable'}
            description={analytics?.trendDirection === 'Improving' ? 'Risk decreasing' : analytics?.trendDirection === 'Worsening' ? 'Risk increasing' : 'Consistent health metrics'}
            icon={<TrendingUp className={`w-6 h-6 ${analytics?.trendDirection === 'Improving' ? 'text-green-600' : analytics?.trendDirection === 'Worsening' ? 'text-destructive' : 'text-yellow-600'}`} />}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Eye Strain Risk Trend" description={`${days}-day trend`}>
            <div className="h-64">
              {chartPoints.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data for this range</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartPoints} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} domain={[0, 100]} unit="%" width={36} />
                    <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, 'Eye Strain Risk']} contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)' }} />
                    <Line type="monotone" dataKey="eyeStrain" stroke="#ef4444" strokeWidth={2} dot={{ r: 3, fill: '#ef4444' }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </ChartCard>

          <ChartCard title="Fatigue Index Trend" description={`${days}-day trend`}>
            <div className="h-64">
              {chartPoints.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data for this range</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartPoints} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} domain={[0, 100]} unit="%" width={36} />
                    <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, 'Fatigue Index']} contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)' }} />
                    <Line type="monotone" dataKey="fatigue" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: '#f59e0b' }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </ChartCard>
        </div>

        {/* Symptom Frequency */}
        <ChartCard title="Symptom Frequency Analysis">
          <div className="space-y-4">
            {analytics && Object.entries(analytics.symptomFrequency).map(([symptom, frequency]) => (
              <div key={symptom} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{symptom}</span>
                  <span className="text-sm font-semibold text-primary">{frequency as number}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${frequency}%` }} />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* Key Insights */}
        <ChartCard title="Key Insights">
          <div className="space-y-4">
            {analytics && (
              <>
                <div className={`p-4 rounded-lg border ${
                  analytics.improving ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' :
                  analytics.trendDirection === 'Worsening' ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800' :
                  'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
                }`}>
                  <p className={`text-sm font-semibold ${analytics.improving ? 'text-green-900 dark:text-green-100' : analytics.trendDirection === 'Worsening' ? 'text-yellow-900 dark:text-yellow-100' : 'text-blue-900 dark:text-blue-100'}`}>
                    {analytics.improving ? '✓ Improving Trend' : analytics.trendDirection === 'Worsening' ? '⚠ Worsening Trend' : '→ Stable Trend'}
                  </p>
                  <p className={`text-sm mt-2 ${analytics.improving ? 'text-green-800 dark:text-green-200' : analytics.trendDirection === 'Worsening' ? 'text-yellow-800 dark:text-yellow-200' : 'text-blue-800 dark:text-blue-200'}`}>
                    {analytics.improving ? 'Your risk level has improved compared to your earliest logged entry. Keep up the good habits.' :
                     analytics.trendDirection === 'Worsening' ? 'Your risk level has increased. Consider reducing screen time and taking more breaks.' :
                     'Your risk level has been consistent across this period.'}
                  </p>
                </div>

                {analytics.topSymptom && analytics.topSymptom[1] > 0 && (
                  <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
                    <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-100">⚠ Most Frequent Symptom</p>
                    <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-2">
                      {analytics.topSymptom[0]} appears in {analytics.topSymptom[1]}% of your logs.
                      {analytics.topSymptom[0] === 'Dry Eyes' ? ' Consider using lubricating eye drops and a humidifier.' : ''}
                      {analytics.topSymptom[0] === 'Eye Strain' ? ' Try the 20-20-20 rule and adjust your monitor distance.' : ''}
                      {analytics.topSymptom[0] === 'Headaches' ? ' Check your monitor position and reduce glare.' : ''}
                      {analytics.topSymptom[0] === 'Blurry Vision' ? ' Take more frequent breaks and consider an eye exam.' : ''}
                    </p>
                  </div>
                )}

                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">💡 Based on Your Data</p>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mt-2">
                    Your average screen time is {analytics.averageScreenTime}h/day with {analytics.averageBreaks} break{analytics.averageBreaks !== 1 ? 's' : ''} on average.
                    {analytics.averageScreenTime > 8 ? ' This exceeds the recommended 8-hour limit — consider scheduling more breaks.' : ' This is within a manageable range.'}
                  </p>
                </div>
              </>
            )}
          </div>
        </ChartCard>
      </div>
    </MainLayout>
  );
}
