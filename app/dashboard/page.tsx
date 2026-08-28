'use client';

import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { Eye, AlertCircle, TrendingUp, Clock, RefreshCw, LogOut, Flame, AlertTriangle, Bot } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { MainLayout } from '@/components/main-layout';
import { MetricCard } from '@/components/dashboard-card';
import { Button } from '@/components/form-components';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';

export default function DashboardPage() {
  const router = useRouter();
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ? createClient() : null;
  
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [prediction, setPrediction] = useState<any>(null);
  const [hasData, setHasData] = useState(false);
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [streak, setStreak] = useState(0);
  const [groupAvg, setGroupAvg] = useState<any>(null);
  const [riskHistory, setRiskHistory] = useState<any[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (!supabase) {
          console.error('Supabase is not configured');
          router.push('/login');
          return;
        }

        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          router.push('/login');
          return;
        }

        // Load user profile to get full name
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', authUser.id)
          .single();

        // Combine auth user with profile data
        const displayName = profile?.first_name && profile?.last_name 
          ? `${profile.first_name} ${profile.last_name}`
          : profile?.first_name 
          ? profile.first_name
          : authUser.user_metadata?.name 
          ? authUser.user_metadata.name
          : authUser.email?.split('@')[0] || 'User';

        const userData = {
          ...authUser,
          profile: profile || null,
          displayName: displayName
        };

        setUser(userData);

        const { data: logs } = await supabase
          .from('daily_logs')
          .select('*')
          .eq('user_id', authUser.id)
          .order('created_at', { ascending: false });

        if (logs && logs.length > 0) {
          setHasData(true);
          setAllLogs(logs);

          // Calculate logging streak
          const logDates = new Set(logs.map((l: any) => l.date));
          let currentStreak = 0;
          const checkDate = new Date();
          checkDate.setHours(0, 0, 0, 0);
          while (true) {
            const dateStr = checkDate.toISOString().split('T')[0];
            if (logDates.has(dateStr)) {
              currentStreak++;
              checkDate.setDate(checkDate.getDate() - 1);
            } else {
              break;
            }
          }
          setStreak(currentStreak);

          // Fetch group averages for comparison
          fetch('/api/stats/averages').then(r => r.json()).then(setGroupAvg).catch(() => {});

          // Fetch last 7 predictions for risk history sparkline
          const { data: recentPreds } = await supabase
            .from('predictions')
            .select('risk_percentage, created_at')
            .eq('user_id', authUser.id)
            .order('created_at', { ascending: true })
            .limit(7);
          if (recentPreds) {
            setRiskHistory(recentPreds.map((p: any) => ({ value: p.risk_percentage ?? 0 })));
          }

          // Fetch latest prediction
          const { data: predictions } = await supabase
            .from('predictions')
            .select('*')
            .eq('user_id', authUser.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (predictions) {
            setPrediction(predictions);
          }

          // Calculate analytics from all logs
          const avgScreenTime = logs.length > 0 
            ? (logs.reduce((sum, log) => sum + (log.screen_time || 0), 0) / logs.length).toFixed(1)
            : 0;
          
          const avgSleepHours = logs.length > 0
            ? (logs.reduce((sum, log) => sum + (log.sleep_hours || 0), 0) / logs.length).toFixed(1)
            : 0;
          
          const avgBrightness = logs.length > 0
            ? (logs.reduce((sum, log) => sum + (log.brightness || 0), 0) / logs.length).toFixed(0)
            : 0;

          // Count symptom frequencies
          const eyeStrainCount = logs.filter(log => log.eye_strain === 1).length;
          const headachesCount = logs.filter(log => log.headaches === 1).length;
          const dryEyesCount = logs.filter(log => log.dry_eyes === 1).length;
          const blurryVisionCount = logs.filter(log => log.blurry_vision === 1).length;

          setAnalytics({
            averageScreenTime: avgScreenTime,
            averageSleepHours: avgSleepHours,
            averageBrightness: avgBrightness,
            totalLogsRecorded: logs.length,
            eyeStrainFrequency: eyeStrainCount,
            headachesFrequency: headachesCount,
            dryEyesFrequency: dryEyesCount,
            blurryVisionFrequency: blurryVisionCount,
            logs: logs,
          });
        } else {
          setHasData(false);
        }
      } catch (err) {
        console.error('Auth check error:', err);
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router, supabase]);

  // Redirect to daily log if no data
  useEffect(() => {
    if (!isLoading && !hasData) {
      router.push('/daily-log');
    }
  }, [hasData, isLoading, router]);

  const handleLogout = async () => {
    try {
      await supabase?.auth.signOut();
      router.push('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleRefreshPredictions = async () => {
    setIsRefreshing(true);
    setError('');
    try {
      if (user && supabase) {
        const { data: logs } = await supabase
          .from('daily_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (logs && logs.length > 0) {
          setHasData(true);
          setAllLogs(logs);

          const { data: predictions } = await supabase
            .from('predictions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (predictions) {
            setPrediction(predictions);
          }

          // Recalculate analytics
          const avgScreenTime = logs.length > 0 
            ? (logs.reduce((sum, log) => sum + (log.screen_time || 0), 0) / logs.length).toFixed(1)
            : 0;
          
          const avgSleepHours = logs.length > 0
            ? (logs.reduce((sum, log) => sum + (log.sleep_hours || 0), 0) / logs.length).toFixed(1)
            : 0;
          
          const avgBrightness = logs.length > 0
            ? (logs.reduce((sum, log) => sum + (log.brightness || 0), 0) / logs.length).toFixed(0)
            : 0;

          const eyeStrainCount = logs.filter(log => log.eye_strain === 1).length;
          const headachesCount = logs.filter(log => log.headaches === 1).length;
          const dryEyesCount = logs.filter(log => log.dry_eyes === 1).length;
          const blurryVisionCount = logs.filter(log => log.blurry_vision === 1).length;

          setAnalytics({
            averageScreenTime: avgScreenTime,
            averageSleepHours: avgSleepHours,
            averageBrightness: avgBrightness,
            totalLogsRecorded: logs.length,
            eyeStrainFrequency: eyeStrainCount,
            headachesFrequency: headachesCount,
            dryEyesFrequency: dryEyesCount,
            blurryVisionFrequency: blurryVisionCount,
            logs: logs,
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <div className="inline-block p-4 bg-muted rounded-full">
              <Eye className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <p className="text-lg text-muted-foreground">Loading your dashboard...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!hasData) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <div className="inline-block p-4 bg-muted rounded-full">
              <Eye className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <p className="text-lg text-muted-foreground">Redirecting to daily log...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Only render prediction data if it exists
  return (
    <MainLayout>
      <div className="space-y-8">

        {/* ── High / Critical risk persistent alert banner ──────────────── */}
        {prediction && (prediction.risk_level === 2 || prediction.risk_level === 3) && (() => {
          const isCritical = prediction.risk_level === 3;
          return (
            <div className={`flex items-start gap-4 p-4 rounded-xl border ${
              isCritical
                ? 'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-700'
                : 'bg-orange-50 dark:bg-orange-950/30 border-orange-300 dark:border-orange-700'
            }`}>
              <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isCritical ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${isCritical ? 'text-red-900 dark:text-red-100' : 'text-orange-900 dark:text-orange-100'}`}>
                  {isCritical ? '🚨 Critical eye strain risk detected' : '⚠️ High eye strain risk detected'}
                </p>
                <p className={`text-sm mt-0.5 ${isCritical ? 'text-red-800 dark:text-red-200' : 'text-orange-800 dark:text-orange-200'}`}>
                  Your latest risk score is <strong>{prediction.risk_percentage?.toFixed(1)}%</strong>.
                  {isCritical
                    ? ' Rest your eyes now and consider reducing screen time today.'
                    : ' Follow the recommendations below to bring your risk down.'}
                </p>
              </div>
              <button
                onClick={() => router.push('/risk-prediction')}
                className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                  isCritical
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-orange-600 hover:bg-orange-700 text-white'
                }`}
              >
                View Details
              </button>
            </div>
          );
        })()}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
              Welcome back, {user?.displayName || 'User'}!
            </h1>
            <p className="text-muted-foreground mt-2">Real-time eye health analysis powered by AI</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              variant="primary"
              size="lg"
              onClick={() => router.push('/daily-log')}
              className="flex items-center justify-center gap-2"
            >
              <Clock className="w-4 h-4" />
              Log New Data
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={handleRefreshPredictions}
              isLoading={isRefreshing}
              className="flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 text-destructive hover:bg-destructive/10"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Risk Prediction Section */}
        {prediction ? (
          <div className="space-y-6">
            {/* Risk Level and Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <div className={`rounded-xl border border-border p-6 ${
                prediction.risk_level === 0 ? 'bg-green-500/10' :
                prediction.risk_level === 1 ? 'bg-yellow-500/10' :
                prediction.risk_level === 2 ? 'bg-orange-500/10' :
                'bg-red-500/10'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Eye Strain Risk</p>
                    <p className={`text-3xl font-bold mt-2 ${
                      prediction.risk_level === 0 ? 'text-green-600' :
                      prediction.risk_level === 1 ? 'text-yellow-600' :
                      prediction.risk_level === 2 ? 'text-orange-600' :
                      'text-red-600'
                    }`}>{prediction.risk_percentage?.toFixed(1) || 'N/A'}%</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {prediction.risk_level === 0 ? 'Low' : prediction.risk_level === 1 ? 'Moderate' : prediction.risk_level === 2 ? 'High' : 'Critical'}
                    </p>
                  </div>
                  <Eye className={`w-12 h-12 ${
                    prediction.risk_level === 0 ? 'text-green-600' :
                    prediction.risk_level === 1 ? 'text-yellow-600' :
                    prediction.risk_level === 2 ? 'text-orange-600' :
                    'text-red-600'
                  }`} />
                </div>
              </div>

              <MetricCard
                title="Fatigue Score"
                value={prediction.fatigue_score?.toFixed(1) || 'N/A'}
                unit="/10"
                icon={<TrendingUp className="w-6 h-6 text-primary" />}
              />

              <MetricCard
                title="Data Completeness"
                value={prediction.confidence ? (prediction.confidence * 100).toFixed(0) : 'N/A'}
                unit="%"
                icon={<Eye className="w-6 h-6 text-secondary" />}
              />

              <MetricCard
                title="Data Points"
                value={analytics?.totalLogsRecorded || '0'}
                description="Logs recorded"
                icon={<AlertCircle className="w-6 h-6 text-blue-500" />}
              />

              <MetricCard
                title="Logging Streak"
                value={streak}
                unit={streak === 1 ? ' day' : ' days'}
                description={streak >= 7 ? '🔥 On fire!' : streak >= 3 ? '⚡ Keep it up!' : 'Log daily to build streak'}
                icon={<Flame className={`w-6 h-6 ${streak >= 7 ? 'text-orange-500' : streak >= 3 ? 'text-yellow-500' : 'text-muted-foreground'}`} />}
              />
            </div>

            {/* Analytics Section */}
            {analytics && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-border rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">📊 Analytics</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-border">
                      <span className="text-sm text-muted-foreground">Avg Screen Time</span>
                      <span className="font-semibold text-foreground">{analytics.averageScreenTime} hrs</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-border">
                      <span className="text-sm text-muted-foreground">Avg Sleep</span>
                      <span className="font-semibold text-foreground">{analytics.averageSleepHours} hrs</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-border">
                      <span className="text-sm text-muted-foreground">Avg Brightness</span>
                      <span className="font-semibold text-foreground">{analytics.averageBrightness}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Logs</span>
                      <span className="font-semibold text-foreground">{analytics.totalLogsRecorded}</span>
                    </div>
                  </div>
                </div>

                {/* Symptoms Trends */}
                <div className="border border-border rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">📈 Symptoms Trend</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-border">
                      <span className="text-sm text-muted-foreground">Eye Strain</span>
                      <span className="font-semibold text-foreground">{analytics.eyeStrainFrequency} times</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-border">
                      <span className="text-sm text-muted-foreground">Headaches</span>
                      <span className="font-semibold text-foreground">{analytics.headachesFrequency} times</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-border">
                      <span className="text-sm text-muted-foreground">Dry Eyes</span>
                      <span className="font-semibold text-foreground">{analytics.dryEyesFrequency} times</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Blurry Vision</span>
                      <span className="font-semibold text-foreground">{analytics.blurryVisionFrequency} times</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Comparison + Risk History */}
            {(groupAvg || riskHistory.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Group Comparison */}
                {groupAvg && analytics && (
                  <div className="border border-border rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4">📊 How You Compare</h3>
                    <p className="text-xs text-muted-foreground mb-4">vs. average of {groupAvg.totalRespondents} respondents</p>
                    <div className="space-y-4">
                      {[
                        { label: 'Screen Time', yours: parseFloat(analytics.averageScreenTime), avg: groupAvg.avgScreenTime, unit: 'h', lowerIsBetter: true },
                        { label: 'Sleep Hours', yours: parseFloat(analytics.averageSleepHours), avg: groupAvg.avgSleepHours, unit: 'h', lowerIsBetter: false },
                        { label: 'Brightness', yours: parseInt(analytics.averageBrightness), avg: groupAvg.avgBrightness, unit: '%', lowerIsBetter: false, optimal: 70 },
                      ].map(({ label, yours, avg, unit, lowerIsBetter, optimal }) => {
                        const better = optimal
                          ? Math.abs(yours - optimal) <= Math.abs(avg - optimal)
                          : lowerIsBetter ? yours <= avg : yours >= avg;
                        return (
                          <div key={label} className="flex items-center justify-between gap-4">
                            <span className="text-sm text-muted-foreground w-24">{label}</span>
                            <div className="flex items-center gap-2 flex-1">
                              <span className={`text-sm font-semibold ${better ? 'text-green-600' : 'text-orange-600'}`}>
                                You: {yours}{unit}
                              </span>
                              <span className="text-xs text-muted-foreground">vs Avg: {avg}{unit}</span>
                              <span className="text-xs">{better ? '✓' : '↑'}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Risk History Sparkline */}
                {riskHistory.length > 1 && (
                  <div className="border border-border rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-1">📉 Risk History</h3>
                    <p className="text-xs text-muted-foreground mb-4">Last {riskHistory.length} submissions</p>
                    <div className="h-28">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={riskHistory}>
                          <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, 'Risk']} contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', fontSize: '12px' }} />
                          <Line type="monotone" dataKey="value" stroke="#ef4444" strokeWidth={2} dot={{ r: 3, fill: '#ef4444' }} activeDot={{ r: 5 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-2">
                      <span>Earliest</span>
                      <span>Latest: {riskHistory[riskHistory.length - 1]?.value?.toFixed(1)}%</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Recommendations */}
            <div className="border border-border rounded-xl p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">💡 Personalized Recommendations</h3>
              <ul className="space-y-3">
                {prediction.recommendations?.map(
                  (rawRec: unknown, idx: number) => {
                    // Parse stringified JSON objects if needed
                    let rec = rawRec;
                    if (typeof rawRec === 'string') {
                      try {
                        const parsed = JSON.parse(rawRec);
                        if (parsed && typeof parsed === 'object' && parsed.title) rec = parsed;
                      } catch { /* plain string */ }
                    }
                    if (typeof rec === 'string') {
                      return (
                        <li key={idx} className="flex items-start gap-3">
                          <div className="mt-1 w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">{rec}</span>
                        </li>
                      )
                    }
                    const r = rec as { title: string; description: string; category: string }
                    return (
                      <li key={idx} className="flex items-start gap-3">
                        <div className="mt-1 w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{r.title}</p>
                          <p className="text-sm text-muted-foreground mt-0.5">{r.description}</p>
                        </div>
                      </li>
                    )
                  }
                )}
              </ul>
            </div>

            {/* AI Assistant link card */}
            <div
              role="button"
              onClick={() => router.push('/ai-assistant')}
              className="flex items-center justify-between p-5 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Personalised AI Recommendations available</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Ask EyeGuard AI about your data</p>
                </div>
              </div>
              <span className="text-xs text-primary font-semibold group-hover:underline">View All →</span>
            </div>
          </div>
        ) : (
          /* ── Zero-prediction state: logs exist but no prediction row yet ── */
          <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 p-10 text-center space-y-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mx-auto">
              <AlertCircle className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">No prediction yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                Your log was saved but a risk score hasn't been generated. Submit today's log to get your first prediction.
              </p>
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={() => router.push('/daily-log')}
              className="inline-flex items-center gap-2"
            >
              <Clock className="w-4 h-4" />
              Log Today's Data
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
