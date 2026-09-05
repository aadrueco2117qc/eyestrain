'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, CalendarCheck, ArrowRight, LayoutDashboard } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { MainLayout } from '@/components/main-layout';
import { AuthGuard } from '@/components/auth-guard';
import { ScreenTimeForm } from '@/components/screen-time-form';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/form-components';

const CONSENT_KEY = 'eyeguard_research_consent';
const NOTICE_REMINDER_KEY = 'eyeguard_research_notice_reminder';

interface PreviousLogData {
  firstName?: string;
  lastName?: string;
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
  const [userEmail, setUserEmail] = useState('');
  // null = loading, true = show modal, false = skip modal
  const [showConsent, setShowConsent] = useState<boolean | null>(null)
  const [agreedTerms, setAgreedTerms] = useState(false)
  const [agreedPrivacy, setAgreedPrivacy] = useState(false)
  const [doNotShowAgain, setDoNotShowAgain] = useState(false);

  useEffect(() => {
    // Check localStorage for consent preference
    const stored = localStorage.getItem(CONSENT_KEY);
    const reminderEnabled = localStorage.getItem(NOTICE_REMINDER_KEY) === 'enabled';
    setShowConsent(stored !== 'accepted' || reminderEnabled);

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
            .select('first_name, last_name, age, gender, year_level, field_of_study')
            .eq('user_id', user.id)
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
        const last = lastLogResult.data as Record<string, any> | null;

        setUserEmail(user.email || '');

        if (profile || last) {
          setPreviousLog({
            firstName: (profile as any)?.first_name || '',
            lastName: (profile as any)?.last_name || '',
            age: (profile as any)?.age || last?.age || '',
            gender: (profile as any)?.gender || last?.gender || '',
            yearLevel: (profile as any)?.year_level || last?.year_level || '',
            fieldOfStudy: (profile as any)?.field_of_study || last?.field_of_study || '',
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
    localStorage.setItem(CONSENT_KEY, 'accepted')
    // If "don't show again" is checked, disable the reminder in localStorage
    if (doNotShowAgain) {
      localStorage.removeItem(NOTICE_REMINDER_KEY)
    }
    setShowConsent(false)
  }

  const handleDecline = () => {
    // "Exit" — close modal without accepting; will show again next time
    setShowConsent(false)
  }

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
      const riskLevelLabel = result.risk_level !== undefined
        ? (['Low', 'Moderate', 'High', 'Critical'][result.risk_level] ?? String(result.risk_level))
        : undefined;

      // Fire toast notification for High or Critical risk
      if (result.risk_level === 2) {
        toast.warning('High Eye Strain Risk Detected', {
          description: `Your risk score is ${result.risk_percentage?.toFixed(1)}%. Take a break and follow the recommendations.`,
          duration: 8000,
          action: {
            label: 'View Details',
            onClick: () => router.push('/risk-prediction'),
          },
        });
      } else if (result.risk_level === 3) {
        toast.error('Critical Eye Strain Risk!', {
          description: `Your risk score is ${result.risk_percentage?.toFixed(1)}%. Please rest your eyes and reduce screen time immediately.`,
          duration: 12000,
          action: {
            label: 'View Details',
            onClick: () => router.push('/risk-prediction'),
          },
        });
      }

      setSuccessData({
        riskPercentage: result.risk_percentage,
        riskLevel: riskLevelLabel,
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
            {/* ── Terms & Privacy Consent Modal ──────────────────────── */}
            {showConsent === true && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-lg w-full flex flex-col max-h-[90vh]">

                  {/* Header */}
                  <div className="flex items-center gap-3 px-7 pt-7 pb-5 border-b border-border flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-foreground">Before You Continue</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">Please read and check both boxes to proceed</p>
                    </div>
                  </div>

                  {/* Scrollable body */}
                  <div className="overflow-y-auto flex-1 px-7 py-5 space-y-5 text-sm text-muted-foreground leading-relaxed">

                    {/* Research notice */}
                    <div className="rounded-xl bg-primary/5 border border-primary/15 p-4 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Research Participation Notice</p>
                      <ul className="space-y-2">
                        {[
                          <>This survey collects personal health data for <strong className="text-foreground">academic research</strong> on digital eye strain among Filipino students.</>,
                          <>Your participation is <strong className="text-foreground">voluntary</strong>. You may stop at any time without penalty.</>,
                          <>Your data is kept <strong className="text-foreground">confidential</strong> and will not be shared publicly or used for commercial purposes.</>,
                          <>Data is used solely to <strong className="text-foreground">improve the eye strain prediction model</strong> and provide personalised recommendations.</>,
                          <>You must be at least <strong className="text-foreground">17 years old</strong> to participate.</>,
                        ].map((item, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-primary font-bold mt-0.5 flex-shrink-0">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Terms summary */}
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-foreground">Terms of Service — Summary</p>
                      <p>EyeGuard is an <strong className="text-foreground">academic screening tool</strong>, not a medical device. Risk scores are informational only and do not constitute a medical diagnosis. Always consult a licensed eye care professional for health concerns.</p>
                      <p>By using EyeGuard you agree not to submit false data, attempt to access other accounts, or use the system for any purpose outside personal eye health monitoring and this research study.</p>
                      <a href="/terms" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline text-xs font-medium">
                        Read full Terms of Service ↗
                      </a>
                    </div>

                    {/* Privacy summary */}
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-foreground">Privacy Policy — Summary</p>
                      <p>We collect your email, profile information, and daily log data (screen time, symptoms, sleep). This is processed under the <strong className="text-foreground">Philippines' Data Privacy Act of 2012 (R.A. 10173)</strong>. You have the right to access, correct, and request deletion of your data at any time.</p>
                      <p>Data is stored securely on Supabase with encryption at rest and in transit. It is never sold or shared for advertising purposes.</p>
                      <a href="/privacy" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline text-xs font-medium">
                        Read full Privacy Policy ↗
                      </a>
                    </div>

                    {/* ── Required checkboxes ── */}
                    <div className="space-y-3 pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground font-medium">You must check both boxes before continuing:</p>

                      <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${agreedTerms ? 'border-primary/40 bg-primary/5' : 'border-border hover:border-primary/30 hover:bg-primary/[0.03]'}`}>
                        <div className="flex-shrink-0 mt-0.5">
                          <input type="checkbox" checked={agreedTerms} onChange={e => setAgreedTerms(e.target.checked)} className="sr-only" />
                          <div className={`w-[18px] h-[18px] rounded border-2 flex items-center justify-center transition-colors ${agreedTerms ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`}>
                            {agreedTerms && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" /></svg>}
                          </div>
                        </div>
                        <span className="text-sm text-foreground leading-snug">
                          I have read and agree to the{' '}
                          <a href="/terms" target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-primary hover:underline font-medium">Terms of Service</a>
                        </span>
                      </label>

                      <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${agreedPrivacy ? 'border-primary/40 bg-primary/5' : 'border-border hover:border-primary/30 hover:bg-primary/[0.03]'}`}>
                        <div className="flex-shrink-0 mt-0.5">
                          <input type="checkbox" checked={agreedPrivacy} onChange={e => setAgreedPrivacy(e.target.checked)} className="sr-only" />
                          <div className={`w-[18px] h-[18px] rounded border-2 flex items-center justify-center transition-colors ${agreedPrivacy ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`}>
                            {agreedPrivacy && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" /></svg>}
                          </div>
                        </div>
                        <span className="text-sm text-foreground leading-snug">
                          I have read and agree to the{' '}
                          <a href="/privacy" target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-primary hover:underline font-medium">Privacy Policy</a>
                          {' '}and consent to the collection and use of my data as described
                        </span>
                      </label>
                    </div>

                    {/* Don't show again — only enabled once both boxes are checked */}
                    <label className={`flex items-start gap-3 cursor-pointer group ${!agreedTerms || !agreedPrivacy ? 'opacity-40 pointer-events-none' : ''}`}>
                      <div className="flex-shrink-0 mt-0.5">
                        <input type="checkbox" checked={doNotShowAgain} onChange={e => setDoNotShowAgain(e.target.checked)} disabled={!agreedTerms || !agreedPrivacy} className="sr-only" />
                        <div className={`w-[18px] h-[18px] rounded border-2 flex items-center justify-center transition-colors ${doNotShowAgain ? 'bg-primary border-primary' : 'border-muted-foreground/40 group-hover:border-primary/50'}`}>
                          {doNotShowAgain && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" /></svg>}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors leading-relaxed">
                        Don't show this notice again — I understand and agree to the terms.<br />
                        <span className="text-muted-foreground/60">You can turn this back on anytime in <strong className="text-foreground">Settings → Privacy</strong>.</span>
                      </span>
                    </label>
                  </div>

                  {/* Actions */}
                  <div className="px-7 pb-7 pt-5 border-t border-border flex-shrink-0">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={handleConsent}
                        disabled={!agreedTerms || !agreedPrivacy}
                        className="flex-1 px-5 py-3 bg-primary text-primary-foreground text-sm font-semibold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 disabled:hover:bg-primary"
                      >
                        {!agreedTerms || !agreedPrivacy ? 'Check both boxes above to continue' : 'I Agree & Continue'}
                      </button>
                      <button
                        onClick={handleDecline}
                        className="sm:w-auto px-5 py-3 border border-border text-muted-foreground text-sm font-medium rounded-xl hover:bg-muted transition-colors"
                      >
                        Exit
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            )}

            <div className="min-h-[calc(100vh-7rem)] w-full max-w-5xl mx-auto space-y-8 rounded-[2rem] bg-[radial-gradient(circle_at_8%_0%,rgba(249,115,22,0.08),transparent_30%),linear-gradient(160deg,rgba(251,191,100,0.10),rgba(249,115,22,0.04)_50%,rgba(180,100,30,0.06))] dark:bg-[radial-gradient(circle_at_8%_0%,rgba(249,115,22,0.14),transparent_32%),linear-gradient(135deg,rgba(67,28,12,0.45),rgba(15,10,7,0.08)_52%,rgba(120,53,15,0.12))] px-4 py-6 sm:px-8 sm:py-10">
              <div className="border-b border-[#f97316]/15 pb-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#fb923c]">Daily check-in</p>
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground mt-2">Daily Eye Health Log</h1>
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
                <div className="flex items-start gap-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-primary">Why log daily data?</p>
                    <p className="text-sm text-primary/80 mt-1">Regular data entries help our AI model better understand your eye strain patterns and provide more accurate risk predictions and personalized recommendations.</p>
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
                  <ScreenTimeForm
                    onSubmit={handleFormSubmit}
                    email={userEmail}
                    defaultValues={previousLog ?? undefined}
                    onProfileUpdate={async (profile) => {
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) return;
                      await supabase.from('user_profiles').upsert({
                        user_id: user.id,
                        first_name: profile.firstName,
                        last_name: profile.lastName,
                        age: profile.age ? parseInt(profile.age) : null,
                        gender: profile.gender,
                        year_level: profile.yearLevel,
                        field_of_study: profile.fieldOfStudy,
                        updated_at: new Date().toISOString(),
                      }, { onConflict: 'user_id' });
                    }}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </MainLayout>
    </AuthGuard>
  );
}
