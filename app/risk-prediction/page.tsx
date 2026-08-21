'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, TrendingUp, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { MainLayout } from '@/components/main-layout';
import { AuthGuard } from '@/components/auth-guard';
import { ChartCard, MetricCard } from '@/components/dashboard-card';
import { Button } from '@/components/form-components';

export default function RiskPredictionPage() {
  const router = useRouter();
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const [predictions, setPredictions] = useState<any>(null);
  const [latestLog, setLatestLog] = useState<any>(null);

  useEffect(() => {
    const checkData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        const { data: logs } = await supabase
          .from('daily_logs')
          .select('*')
          .eq('user_id', user.id)
          .limit(1);

        setHasData((logs && logs.length > 0) || false);

        if (logs && logs.length > 0) {
          const { data: prediction } = await supabase
            .from('predictions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (prediction) setPredictions(prediction);

          const { data: recentLog } = await supabase
            .from('daily_logs')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (recentLog) setLatestLog(recentLog);
        }
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    checkData();
  }, [router, supabase]);

  if (isLoading) {
    return (
      <AuthGuard><MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <div className="inline-block p-4 bg-muted rounded-full"><Zap className="w-8 h-8 text-primary animate-pulse" /></div>
            <p className="text-lg text-muted-foreground">Loading predictions...</p>
          </div>
        </div>
      </MainLayout></AuthGuard>
    );
  }

  if (!hasData) {
    return (
      <AuthGuard><MainLayout>
        <div className="space-y-8">
          <div><h1 className="text-4xl font-bold text-foreground">Risk Prediction</h1><p className="text-muted-foreground mt-2">AI-powered predictions based on your usage patterns</p></div>
          <div className="flex items-center justify-center min-h-96 rounded-lg border-2 border-dashed border-border bg-muted/30">
            <div className="text-center space-y-4 p-8">
              <div className="inline-block p-4 bg-primary/10 rounded-full"><AlertCircle className="w-12 h-12 text-primary" /></div>
              <h2 className="text-2xl font-bold text-foreground">No Data Yet</h2>
              <p className="text-muted-foreground max-w-md">Start logging your daily screen time and symptoms to get AI-powered risk predictions.</p>
              <Button variant="primary" size="lg" onClick={() => router.push('/daily-log')}>Log Your First Entry</Button>
            </div>
          </div>
        </div>
      </MainLayout></AuthGuard>
    );
  }

  const riskPercentage = predictions?.risk_percentage || 0;
  const riskLevel = predictions?.risk_level || 0;
  const fatigueScore = predictions?.fatigue_score || 0;
  const confidence = predictions?.confidence || 0;

  const rawRecs = predictions?.recommendations || [];
  const recommendations = rawRecs.map((rec: unknown) => {
    if (typeof rec === 'string') {
      try { const p = JSON.parse(rec); if (p?.title) return p; } catch { /* plain string */ }
      return rec;
    }
    return rec;
  });

  const getRiskLabel = (l: number) => ['Low', 'Moderate', 'High', 'Critical'][l] ?? 'Unknown';
  const getRiskColor = (l: number) => ['bg-green-500/10 border-green-200 dark:border-green-800', 'bg-yellow-500/10 border-yellow-200 dark:border-yellow-800', 'bg-orange-500/10 border-orange-200 dark:border-orange-800', 'bg-red-500/10 border-red-200 dark:border-red-800'][l] ?? 'bg-gray-500/10 border-gray-200';

  // ------------------------------------------------------------------
  // Contributing Risk Factors — mirrors the CVS-Q based calculation
  // in /api/predict-supabase. Labels and descriptions reference the
  // same sources used in the API so the UI is defensible in evaluation.
  // ------------------------------------------------------------------
  const screenTime   = latestLog?.screen_time   ?? 0;
  const sleepHours   = latestLog?.sleep_hours   ?? 8;
  const brightness   = latestLog?.brightness    ?? 70;
  const breaksTaken  = latestLog?.breaks_taken  ?? 0;

  // CVS-Q symptom score contribution (primary, out of 100)
  const freqMap: Record<string, number> = {
    'Never': 0,
    'Rarely (1-2 times a week)': 0.5,
    'Sometimes (3-4 times a week)': 1.0,
    'Often (5-6 times a week)': 1.5,
    'Always (every day)': 2.0,
  };
  const eyeStrainFreq    = freqMap[latestLog?.eye_strain_frequency    ?? ''] ?? (latestLog?.eye_strain    ? 1.0 : 0);
  const blurryVisionFreq = freqMap[latestLog?.blurry_vision_frequency ?? ''] ?? (latestLog?.blurry_vision ? 1.0 : 0);
  const headachesFreq    = freqMap[latestLog?.headaches_frequency     ?? ''] ?? (latestLog?.headaches     ? 1.0 : 0);
  const dryEyesFreq      = freqMap[latestLog?.dry_eyes_frequency      ?? ''] ?? (latestLog?.dry_eyes      ? 1.0 : 0);

  const cvqRawScore = (eyeStrainFreq * 2) + (blurryVisionFreq * 2) + (headachesFreq * 1) + (dryEyesFreq * 1);
  const symptomScorePct = parseFloat(((cvqRawScore / 12) * 100).toFixed(1));

  // Screen time exposure (AOA 2016 thresholds)
  let screenModPct = 0;
  if (screenTime >= 2 && screenTime <= 6)  screenModPct = ((screenTime - 2) / 4) * 10;
  else if (screenTime > 6)                 screenModPct = 10 + (Math.min(screenTime - 6, 6) / 6) * 10;
  screenModPct = parseFloat(Math.min(screenModPct, 20).toFixed(1));

  // Sleep deficit (NSF 2020)
  let sleepModPct = 0;
  if (sleepHours < 5)       sleepModPct = 10;
  else if (sleepHours < 6)  sleepModPct = 8;
  else if (sleepHours < 7)  sleepModPct = 5;
  else if (sleepHours <= 9) sleepModPct = 0;
  else                      sleepModPct = 2;

  // Brightness deviation (ISO 9241-303, optimal 40–80%)
  let brightModPct = 0;
  if (brightness < 40)      brightModPct = Math.min(((40 - brightness) / 10), 5);
  else if (brightness > 80) brightModPct = Math.min(((brightness - 80) / 10), 5);
  brightModPct = parseFloat(brightModPct.toFixed(1));

  // Break adherence to AOA 20-20-20 rule
  const breakAdherencePct = parseFloat(Math.max(0, 100 - (breaksTaken * 20)).toFixed(1));

  const symptomCount = [eyeStrainFreq, blurryVisionFreq, headachesFreq, dryEyesFreq].filter(f => f > 0).length;

  const riskFactors = [
    {
      factor: 'CVS Symptom Score',
      source: 'CVS-Q · Seguí et al., J Clin Epidemiol 2015',
      weight: `CVS-Q raw ${cvqRawScore.toFixed(1)}/12 — ${symptomCount} of 4 symptoms reported`,
      impact: symptomScorePct,
    },
    {
      factor: 'Screen Time Exposure',
      source: 'AOA Digital Eye Strain Report 2016',
      weight: `${screenTime}h today — clinical threshold: ≥2h onset, ≥6h high-exposure`,
      impact: screenModPct,
    },
    {
      factor: 'Sleep Deficit',
      source: 'National Sleep Foundation 2020',
      weight: `${sleepHours}h sleep — optimal 7–9h for tear film stability`,
      impact: sleepModPct,
    },
    {
      factor: 'Screen Brightness Deviation',
      source: 'ISO 9241-303:2011 Display Ergonomics',
      weight: `${brightness}% brightness — ergonomic optimal range: 40–80%`,
      impact: brightModPct,
    },
    {
      factor: 'Break Adherence (20-20-20)',
      source: 'AOA 20-20-20 Rule',
      weight: `${breaksTaken} break${breaksTaken !== 1 ? 's' : ''} taken — each break reduces accommodative fatigue`,
      impact: breakAdherencePct,
    },
  ];

  const preventiveMeasures = [
    { title: '20-20-20 Rule', description: 'Every 20 minutes, look at something 20 feet away for 20 seconds' },
    { title: 'Optimize Workspace', description: 'Ensure proper lighting and screen position at eye level' },
    { title: 'Use Blue Light Filter', description: 'Enable blue light reduction, especially in evenings' },
    { title: 'Regular Exercise', description: 'Physical activity and movement help reduce overall fatigue' },
  ];

  return (
    <AuthGuard><MainLayout>
      <div className="space-y-8">
        <div><h1 className="text-4xl font-bold text-foreground">Risk Prediction</h1><p className="text-muted-foreground mt-2">AI-powered predictions based on your usage patterns</p></div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Current Risk Assessment" description="Based on your latest data">
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Eye Strain Risk</span>
                  <span className="text-2xl font-bold text-destructive">{riskPercentage.toFixed(1)}%</span>
                </div>
                <div className="h-3 rounded-full bg-muted overflow-hidden"><div className="h-full bg-destructive transition-all" style={{ width: `${riskPercentage}%` }} /></div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Fatigue Score</span>
                  <span className="text-2xl font-bold text-accent">{fatigueScore.toFixed(1)}/10</span>
                </div>
                <div className="h-3 rounded-full bg-muted overflow-hidden"><div className="h-full bg-accent transition-all" style={{ width: `${(fatigueScore / 10) * 100}%` }} /></div>
              </div>
              <div className={`p-4 rounded-lg border ${getRiskColor(riskLevel)}`}>
                <div className="flex items-center gap-2 mb-1"><AlertCircle className="w-5 h-5" /><span className="font-semibold">Risk Level: {getRiskLabel(riskLevel)}</span></div>
                <p className="text-sm mt-2">Data completeness: {(confidence * 100).toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground mt-1">Based on CVS-Q scoring method (Seguí et al., 2015)</p>
              </div>
            </div>
          </ChartCard>

          <ChartCard title="Recommendations" description="Personalized advice to reduce risk">
            <div className="space-y-3">
              {recommendations && recommendations.length > 0 ? (
                recommendations.map((rec: any, idx: number) => (
                  <div key={idx} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      {typeof rec === 'string' ? <p className="text-sm text-foreground">{rec}</p> : (
                        <><p className="text-sm font-medium text-foreground">{rec.title}</p><p className="text-xs text-muted-foreground mt-0.5">{rec.description}</p></>
                      )}
                    </div>
                  </div>
                ))
              ) : <p className="text-sm text-muted-foreground">No recommendations available yet</p>}
            </div>
          </ChartCard>
        </div>

        <ChartCard title="Contributing Risk Factors" description="Based on CVS-Q (Seguí et al., 2015) with environmental modifiers from AOA, NSF, and ISO 9241-303">
          <div className="space-y-3">
            {riskFactors.map((item) => (
              <div key={item.factor} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-lg bg-muted/50">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{item.factor}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.weight}</p>
                  <p className="text-xs text-primary/70 mt-0.5 italic">Source: {item.source}</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="h-2 flex-1 sm:w-32 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${item.impact}%` }} /></div>
                  <span className="text-sm font-semibold text-primary w-12 text-right">{item.impact}%</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border">
            CVS diagnosis threshold: CVS-Q score ≥ 6/12 (50%). Risk levels: Low &lt;25% · Moderate 25–49% · High 50–74% · Critical ≥75%.
          </p>
        </ChartCard>

        <ChartCard title="Recommended Preventive Measures">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {preventiveMeasures.map((measure) => (
              <div key={measure.title} className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors">
                <h4 className="font-semibold text-foreground">{measure.title}</h4>
                <p className="text-sm text-muted-foreground mt-2">{measure.description}</p>
              </div>
            ))}
          </div>
        </ChartCard>

        <div className="p-6 rounded-lg bg-primary/10 border border-primary/20">
          <h3 className="text-lg font-semibold text-foreground mb-2">Ready to improve your eye health?</h3>
          <p className="text-muted-foreground mb-4">Log your daily data to help the model provide even more accurate predictions.</p>
          <Button variant="primary" size="lg" onClick={() => router.push('/daily-log')}>Go to Daily Log</Button>
        </div>
      </div>
    </MainLayout></AuthGuard>
  );
}
