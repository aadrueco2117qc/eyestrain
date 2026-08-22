'use client';

import { useState, useEffect } from 'react';
import { Save, Eye, LogOut, KeyRound, EyeOff, CheckCircle2, AlertCircle, Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/main-layout';
import { AuthGuard } from '@/components/auth-guard';
import { InputField, SelectField } from '@/components/form-components';
import { createClient } from '@/lib/supabase/client';

// ─── Inline status banner ────────────────────────────────────────────────────
function StatusBanner({ message }: { message: string }) {
  if (!message) return null;
  const isSuccess = message.toLowerCase().includes('success') || message.toLowerCase().includes('sent') || message.toLowerCase().includes('accepted') || message.toLowerCase().includes('reset');
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border text-sm font-medium ${
      isSuccess
        ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
        : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
    }`}>
      {isSuccess
        ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
        : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
      <span>{message}</span>
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────
function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-6 py-5 border-b border-border">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="px-6 py-6">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<any>(null);
  const [settings, setSettings] = useState({
    firstName: '',
    lastName: '',
    email: '',
    age: '',
    gender: '',
    yearLevel: '',
    fieldOfStudy: '',
  });

  // Password change state
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, next: false, confirm: false });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [consentEnabled, setConsentEnabled] = useState(true);

  // Notification settings state
  const [notifSettings, setNotifSettings] = useState({
    enable_email_notifications: true,
    enable_daily_reminders: true,
    reminder_time: '09:00',
  });
  const [isSavingNotif, setIsSavingNotif] = useState(false);
  const [notifMessage, setNotifMessage] = useState('');

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) { router.push('/login'); return; }

        setUser(authUser);
        setSettings((prev) => ({ ...prev, email: authUser.email || '' }));

        const consentStored = localStorage.getItem('eyeguard_research_consent');
        setConsentEnabled(consentStored === 'accepted');

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', authUser.id)
          .single();

        if (profile) {
          setSettings((prev) => ({
            ...prev,
            firstName: profile.first_name || '',
            lastName: profile.last_name || '',
            age: profile.age?.toString() || '',
            gender: profile.gender || '',
            yearLevel: profile.year_level || '',
            fieldOfStudy: profile.field_of_study || '',
          }));
        }

        // Load notification settings
        const { data: userSettings } = await supabase
          .from('user_settings')
          .select('enable_email_notifications, enable_daily_reminders, reminder_time')
          .eq('user_id', authUser.id)
          .maybeSingle();

        if (userSettings) {
          setNotifSettings({
            enable_email_notifications: userSettings.enable_email_notifications ?? true,
            enable_daily_reminders:     userSettings.enable_daily_reminders     ?? true,
            reminder_time:              (userSettings.reminder_time ?? '09:00:00').slice(0, 5),
          });
        }
      } catch (err) {
        console.error('Error loading user data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadUserData();
  }, [supabase, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
    setMessage('');
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    setMessage('');
    try {
      const { error } = await supabase.from('user_profiles').upsert({
        user_id: user.id,
        first_name: settings.firstName,
        last_name: settings.lastName,
        age: settings.age ? parseInt(settings.age) : null,
        gender: settings.gender,
        year_level: settings.yearLevel,
        field_of_study: settings.fieldOfStudy,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      if (error) {
        setMessage(`Error: ${error.message}`);
      } else {
        setMessage('Profile saved successfully!');
        setTimeout(() => setMessage(''), 5000);
      }
    } catch {
      setMessage('Error saving settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordMessage('');
    if (!passwords.next || !passwords.confirm) {
      setPasswordMessage('Please fill in all password fields.');
      return;
    }
    if (passwords.next.length < 8) {
      setPasswordMessage('New password must be at least 8 characters.');
      return;
    }
    if (passwords.next !== passwords.confirm) {
      setPasswordMessage('New passwords do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwords.next });
      if (error) {
        setPasswordMessage(`Error: ${error.message}`);
      } else {
        setPasswordMessage('Password changed successfully!');
        setPasswords({ current: '', next: '', confirm: '' });
        setTimeout(() => setPasswordMessage(''), 6000);
      }
    } catch {
      setPasswordMessage('Failed to change password. Please try again.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSaveNotifications = async () => {
    if (!user) return;
    setIsSavingNotif(true);
    setNotifMessage('');
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          enable_email_notifications: notifSettings.enable_email_notifications,
          enable_daily_reminders:     notifSettings.enable_daily_reminders,
          reminder_time:              notifSettings.reminder_time + ':00',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) {
        setNotifMessage(`Error: ${error.message}`);
      } else {
        setNotifMessage('Notification settings saved!');
        setTimeout(() => setNotifMessage(''), 5000);
      }
    } catch {
      setNotifMessage('Failed to save. Please try again.');
    } finally {
      setIsSavingNotif(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <MainLayout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-3">
              <div className="inline-block p-4 bg-muted rounded-full">
                <Eye className="w-7 h-7 text-primary animate-pulse" />
              </div>
              <p className="text-muted-foreground">Loading settings…</p>
            </div>
          </div>
        </MainLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <MainLayout>
        <div className="max-w-2xl space-y-6">

          {/* Page header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Settings</h1>
              <p className="text-sm text-muted-foreground mt-1">Manage your account and preferences</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>

          {/* Global status */}
          <StatusBanner message={message} />

          {/* ── Profile Information ── */}
          <Section title="Profile Information" description="Your personal details shown across the app">
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField label="First Name" name="firstName" value={settings.firstName} onChange={handleChange} placeholder="John" />
                <InputField label="Last Name" name="lastName" value={settings.lastName} onChange={handleChange} placeholder="Doe" />
              </div>
              <InputField
                label="Email Address"
                name="email"
                type="email"
                value={settings.email}
                disabled
                helperText="Email cannot be changed here"
              />
              <InputField label="Age" name="age" type="number" min="13" max="120" value={settings.age} onChange={handleChange} placeholder="22" />
            </div>
          </Section>

          {/* ── Health & Academic Profile ── */}
          <Section title="Health & Academic Profile" description="Used to personalise your risk analysis">
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SelectField
                  label="Gender"
                  name="gender"
                  value={settings.gender}
                  onChange={handleChange}
                  options={[
                    { value: '', label: 'Select…' },
                    { value: 'Male', label: 'Male' },
                    { value: 'Female', label: 'Female' },
                    { value: 'Other', label: 'Other' },
                    { value: 'Prefer not to say', label: 'Prefer not to say' },
                  ]}
                />
                <SelectField
                  label="Year Level"
                  name="yearLevel"
                  value={settings.yearLevel}
                  onChange={handleChange}
                  options={[
                    { value: '', label: 'Select…' },
                    { value: '1st Year', label: '1st Year' },
                    { value: '2nd Year', label: '2nd Year' },
                    { value: '3rd Year', label: '3rd Year' },
                    { value: '4th Year', label: '4th Year' },
                    { value: '5th Year or higher', label: '5th Year or higher' },
                  ]}
                />
              </div>
              <SelectField
                label="Field of Study"
                name="fieldOfStudy"
                value={settings.fieldOfStudy}
                onChange={handleChange}
                options={[
                  { value: '', label: 'Select…' },
                  { value: 'IT / Computer Science', label: 'IT / Computer Science' },
                  { value: 'Engineering', label: 'Engineering' },
                  { value: 'Business', label: 'Business' },
                  { value: 'Health Sciences', label: 'Health Sciences' },
                  { value: 'Education', label: 'Education' },
                  { value: 'Arts and Humanities', label: 'Arts and Humanities' },
                  { value: 'Other', label: 'Other' },
                ]}
              />
            </div>

            {/* Save button lives inside the profile sections */}
            <div className="mt-6 pt-5 border-t border-border flex justify-end">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? (
                  <span className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isSaving ? 'Saving…' : 'Save Profile'}
              </button>
            </div>
          </Section>

          {/* ── Change Password ── */}
          <Section title="Change Password" description="Choose a strong password of at least 8 characters">
            <div className="space-y-4">
              <StatusBanner message={passwordMessage} />

              {/* New password */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">New Password</label>
                <div className="relative">
                  <input
                    type={showPasswords.next ? 'text' : 'password'}
                    value={passwords.next}
                    onChange={(e) => setPasswords((p) => ({ ...p, next: e.target.value }))}
                    placeholder="Min. 8 characters"
                    className="w-full pr-10 px-3 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords((s) => ({ ...s, next: !s.next }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Toggle password visibility"
                  >
                    {showPasswords.next ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwords.confirm}
                    onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
                    placeholder="Repeat new password"
                    className="w-full pr-10 px-3 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords((s) => ({ ...s, confirm: !s.confirm }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Toggle password visibility"
                  >
                    {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwords.confirm && passwords.next !== passwords.confirm && (
                  <p className="text-xs text-destructive mt-1">Passwords do not match</p>
                )}
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-border flex justify-end">
              <button
                onClick={handleChangePassword}
                disabled={isChangingPassword || !passwords.next || !passwords.confirm}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {isChangingPassword ? (
                  <span className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <KeyRound className="w-4 h-4" />
                )}
                {isChangingPassword ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          </Section>

          {/* ── Notifications ── */}
          <Section
            title="Notifications"
            description="Control when and how EyeGuard alerts you about your eye health"
          >
            <div className="space-y-5">
              <StatusBanner message={notifMessage} />

              {/* Email notifications toggle */}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Email Notifications</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Receive high-risk alerts and reminders via email
                  </p>
                </div>
                <button
                  role="switch"
                  aria-checked={notifSettings.enable_email_notifications}
                  onClick={() => setNotifSettings(prev => ({ ...prev, enable_email_notifications: !prev.enable_email_notifications }))}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                    notifSettings.enable_email_notifications ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    notifSettings.enable_email_notifications ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {/* Daily reminder toggle */}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Daily Log Reminders</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Get a reminder email if you haven't logged today
                  </p>
                </div>
                <button
                  role="switch"
                  aria-checked={notifSettings.enable_daily_reminders}
                  onClick={() => setNotifSettings(prev => ({ ...prev, enable_daily_reminders: !prev.enable_daily_reminders }))}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                    notifSettings.enable_daily_reminders ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    notifSettings.enable_daily_reminders ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {/* Reminder time picker — only shown when daily reminders are on */}
              {notifSettings.enable_daily_reminders && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Reminder Time
                  </label>
                  <input
                    type="time"
                    value={notifSettings.reminder_time}
                    onChange={e => setNotifSettings(prev => ({ ...prev, reminder_time: e.target.value }))}
                    className="w-40 px-3 py-2.5 border border-border rounded-xl bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <p className="text-xs text-muted-foreground">
                    You'll receive a reminder at this time if you haven't logged yet
                  </p>
                </div>
              )}

              {/* High-risk alert note */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
                <Bell className="w-4 h-4 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-orange-800 dark:text-orange-200">
                  <strong>High-risk alerts</strong> appear automatically on your dashboard and as an in-app notification whenever your risk score reaches High or Critical — regardless of these settings.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-border flex justify-end">
              <button
                onClick={handleSaveNotifications}
                disabled={isSavingNotif}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {isSavingNotif ? (
                  <span className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isSavingNotif ? 'Saving…' : 'Save Notifications'}
              </button>
            </div>
          </Section>

          {/* ── Privacy ── */}
          <Section title="Privacy">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">Research Consent Notice</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>ON</strong> — consent given, notice won't appear again.<br />
                  <strong>OFF</strong> — notice will show next time you visit Daily Log.
                </p>
              </div>
              <button
                role="switch"
                aria-checked={consentEnabled}
                onClick={() => {
                  const next = !consentEnabled;
                  setConsentEnabled(next);
                  if (next) {
                    localStorage.setItem('eyeguard_research_consent', 'accepted');
                    setMessage('Consent accepted. The notice will no longer appear.');
                  } else {
                    localStorage.removeItem('eyeguard_research_consent');
                    setMessage('Consent reset. The notice will appear again on your next Daily Log visit.');
                  }
                  setTimeout(() => setMessage(''), 4000);
                }}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  consentEnabled ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  consentEnabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </Section>

          {/* ── About ── */}
          <Section title="About EyeGuard">
            <div className="divide-y divide-border">
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-muted-foreground">Version</span>
                <span className="text-sm font-semibold text-foreground">1.0.0</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-muted-foreground">Last Updated</span>
                <span className="text-sm font-semibold text-foreground">May 2026</span>
              </div>
            </div>
          </Section>

        </div>
      </MainLayout>
    </AuthGuard>
  );
}
