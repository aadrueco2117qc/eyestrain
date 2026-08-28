'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, CalendarCheck, ArrowRight, LayoutDashboard } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/main-layout';
import { AuthGuard } from '@/components/auth-guard';
import { ScreenTimeForm } from '@/components/screen-time-form';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/form-components';

const CONSENT_KEY = 'eyeguard_research_consent';

interface PreviousLogData {
  age?: string;
  gender?: string;
  yearLevel?: string;
  fieldOfStudy?: string;
  academicScreenTime?: string;
  nonAcademicScreenTime?: string;
  primaryDevice?: string;
  eyeStrainFrequency?: string;
  headachesFrequency?: string;
  blurryVisionFrequency?: string;
  dryEyesFrequency?: string;
  exerciseFrequency?: string;
  outdoorTime?: string;
  blueLight?: string;
  screenHeight?: string;
  screenDistance?: string;
  roomLighting?: string;
  sleepHours?: string;
  screenBrightness?: string;
}

export default function DailyLogPage() {
  const router = useRouter();
  const supabase = createClient();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [successData, setSuccessData] = useState<{ riskPercentage?: number; riskLevel?: string; fatigueScore?: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alreadyLoggedToday, setAlreadyLoggedToday] = useState(false);
  const [checkingLog, setCheckingLog] = useState(true);
  const [previousLog, setPreviousLog] = useState<PreviousLogData | null>(null);
  // null = loading, true = show modal, false = skip modal
  const [showConsent, setShowConsent] = useState<boolean | null>(null);

  useEffect(() => {
    // Check localStorage for consent preference
    const stored = localStorage.getItem(CONSENT_KEY);
    setShowConsent(stored !== 'accepted');

    const loadUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const today = new Date().toISOString().split('T')[0];

        // Run both queries in parallel
        const [todayCheck, profileResult, lastLogResult] = await Promise.all([
          supabase
            .from('daily_logs')
            .select('id')
            .eq('user_id', user.id)
            .eq('date', today)
            .limit(1),
          supabase
            .from('user_profiles')
            .select('age, gender, year_level, field_of_study')
            .eq('id', user.id)
            .maybeSingle(),
          supabase
            .from('daily_logs')
            .select(
              'age, gender, year_level, field_of_study, ' +
              'academic_screen_time, non_academic_screen_time, primary_device, ' +
              'eye_strain_frequency, headaches_frequency, blurry_vision_frequency, dry_eyes_frequency, ' +
              'exercise_frequency, outdoor_time, blue_light, screen_height, ' +
              'screen_distance, room_lighting, sleep_hours, brightness'
            )
            .eq('user_id', user.id)
            .order('date', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        setAlreadyLoggedToday(!!(todayCheck.data && todayCheck.data.length > 0));

        // Build prefill: profile fields take priority for stable data,
        // daily fields come from the last log entry
        const profile = profileResult.data;
        const last = lastLogResult.data;

        if (profile || last) {
          setPreviousLog({
            age: profile?.age || last?.age || '',
            gender: profile?.gender || last?.gender || '',
            yearLevel: profile?.year_level || last?.year_level || '',
            fieldOfStudy: profile?.field_of_study || last?.field_of_study || '',
            academicScreenTime: last?.academic_screen_time || '',
            nonAcademicScreenTime: last?.non_academic_screen_time || '',
            primaryDevice: last?.primary_device || '',
            eyeStrainFrequency: last?.eye_strain_frequency || '',
            headachesFrequency: last?.headaches_frequency || '',
            blurryVisionFrequency: last?.blurry_vision_frequency || '',
            dryEyesFrequency: last?.dry_eyes_frequency || '',
            exerciseFrequency: last?.exercise_frequency || '',
            outdoorTime: last?.outdoor_time || '',
            blueLight: last?.blue_light || '',
            screenHeight: last?.screen_height || '',
            screenDistance: last?.screen_distance || '',
            roomLighting: last?.room_lighting || '',
            sleepHours: last?.sleep_hours != null ? String(last.sleep_hours) : '',
            // Brightness is intentionally NOT prefilled — it changes daily
          });
        }
      } catch { /* non-fatal */ }
      finally { setCheckingLog(false); }
    };

    loadUserData();
  }, [supabase]);

  const handleConsent = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    setShowConsent(false);
  };

  const handleDecline = () => {
    setShowConsent(false);
  };

  const handleFormSubmit = async (formData: any) => {
    try {
      setError('');
      setSuccess(false);
      setIsSubmitting(true);
      const response = await fetch('/api/predict-supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save daily log');
      }
      const result = await response.json();
      setSuccessData({
        riskPercentage: result.risk_percentage,
        riskLevel: result.risk_level !== undefined
          ? (['Low', 'Moderate', 'High', 'Critical'][result.risk_level] ?? result.risk_level)
          : undefined,
        fatigueScore: result.fatigue_score,
      });
      setSuccess(true);
      setAlreadyLoggedToday(true);
    } catch (err) {
      setIsSubmitting(false);
      setError(err instanceof Error ? err.message : 'Failed to save daily log');
    }
  };

  return (
    <AuthGuard>
      <MainLayout>
        {/* ── Full-screen success state ─────────────────────────────────── */}
        {success && (
          <div className="flex items-center justify-center min-h-[70vh]">
            <div className="text-center space-y-6 p-8 max-w-md w-full">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 mx-auto">
                <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-foreground">Log saved!</h2>
                <p className="text-muted-foreground text-sm">Your eye health data has been recorded for today.</p>
              </div>
              {successData && (
                <div className="grid grid-cols-2 gap-3 text-left">
                  {successData.riskPercentage !== undefined && (
                    <div className={`rounded-xl p-4 border ${
                      successData.riskLevel === 'Low'      ? 'bg-green-50  dark:bg-green-950/20  border-green-200  dark:border-green-800'  :
                      successData.riskLevel === 'Moderate' ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800' :
                      successData.riskLevel === 'High'     ? 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800' :
                      'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                    }`}>
                      <p className="text-xs text-muted-foreground mb-1">Risk Score</p>
                      <p className={`text-2xl font-bold ${
                        successData.riskLevel === 'Low'      ? 'text-green-700 dark:text-green-400'  :
                        successData.riskLevel === 'Moderate' ? 'text-yellow-700 dark:text-yellow-400' :
                        successData.riskLevel === 'High'     ? 'text-orange-700 dark:text-orange-400' :
                        'text-red-700 dark:text-red-400'
                      }`}>{successData.riskPercentage.toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{successData.riskLevel}</p>
                    </div>
                  )}
                  {successData.fatigueScore !== undefined && (
                    <div className="rounded-xl p-4 border border-border bg-muted/40">
                      <p className="text-xs text-muted-foreground mb-1">Fatigue Score</p>
                      <p className="text-2xl font-bold text-foreground">{successData.fatigueScore.toFixed(1)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">out of 10</p>
                    </div>
                  )}
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  View Dashboard
                </button>
                <button
                  onClick={() => router.push('/risk-prediction')}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 border border-border text-foreground text-sm font-medium rounded-xl hover:bg-muted transition-colors"
                >
                  Full Analysis
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Form (hidden after success) ───────────────────────────────── */}
        {!success && (
          <>
            {/* Consent Modal */}
            {showConsent === true && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-lg w-full p-8 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-5 h-5 text-primary" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground">Research Participation Notice</h2>
                  </div>
                  <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                    <p>Before you proceed, please read the following:</p>
                    <ul className="space-y-2 list-none">
                      <li className="flex items-start gap-2">
                        <span className="text-primary font-bold mt-0.5">•</span>
                        <span>This survey collects personal health data for <strong className="text-foreground">academic research</strong> on digital eye strain among students.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary font-bold mt-0.5">•</span>
                        <span>Your participation is <strong className="text-foreground">voluntary</strong>. You may stop at any time.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary font-bold mt-0.5">•</span>
                        <span>Your data is kept <strong className="text-foreground">confidential</strong> and will not be shared publicly.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary font-bold mt-0.5">•</span>
                        <span>Data is used solely to <strong className="text-foreground">improve the ML model</strong> and provide personalized eye health recommendations.</span>
                      </li>
                    </ul>
                    <p className="text-xs text-muted-foreground border-t border-border pt-4">
                      By clicking "I Agree", you consent to the collection and use of your data as described above.
                      You can turn off this notice anytime in <strong className="text-foreground">Settings → Privacy</strong>.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleConsent}
                      className="flex-1 px-6 py-3 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors"
                    >
                      I Agree &amp; Continue
                    </button>
                    <button
                      onClick={handleDecline}
                      className="flex-1 px-6 py-3 border border-border text-muted-foreground text-sm font-medium rounded-xl hover:bg-muted transition-colors"
                    >
                      Skip for Now
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-8 max-w-4xl">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground">Daily Eye Health Log</h1>
                <p className="text-muted-foreground mt-2">Record your daily screen time and symptoms to improve predictions</p>
              </div>

              {!checkingLog && alreadyLoggedToday && (
                <div className="flex items-start gap-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                  <CalendarCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">You already logged today</p>
                    <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">Submitting again will update your entry for today.</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => router.push('/dashboard')} className="flex-shrink-0">View Dashboard</Button>
                </div>
              )}

              {!alreadyLoggedToday && (
                <div className="flex items-start gap-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                  <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">Why log daily data?</p>
                    <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">Regular data entries help our AI model better understand your eye strain patterns and provide more accurate risk predictions and personalized recommendations.</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive font-medium">{error}</p>
                </div>
              )}

              <div className="bg-card rounded-xl border border-border p-6">
                {checkingLog ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <ScreenTimeForm onSubmit={handleFormSubmit} defaultValues={previousLog ?? undefined} />
                )}
              </div>
            </div>
          </>
        )}
      </MainLayout>
    </AuthGuard>
  );
}
