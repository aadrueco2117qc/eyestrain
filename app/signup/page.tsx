'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Eye, EyeOff, Mail, User, Lock, Check,
  CheckCircle2, ArrowRight, ArrowLeft, Shield,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { validatePassword } from '@/lib/password-strength';
import { PasswordStrengthMeter } from '@/components/password-strength-meter';

const AGE_OPTIONS = Array.from({ length: 70 }, (_, i) => i + 13);

export default function SignupPage() {
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ? createClient() : null;

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', age: '',
    password: '', confirmPassword: '', agreeToTerms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [signupError, setSignupError] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (step === 1) {
      if (!formData.firstName.trim()) e.firstName = 'Required';
      if (!formData.lastName.trim())  e.lastName  = 'Required';
      if (!formData.email.trim())     e.email     = 'Required';
      else if (!formData.email.includes('@')) e.email = 'Invalid email';
      if (!formData.age) e.age = 'Required';
    } else {
      if (!formData.password) e.password = 'Required';
      else {
        const passwordError = validatePassword(formData.password);
        if (passwordError) e.password = passwordError;
      }
      if (!formData.confirmPassword)         e.confirmPassword = 'Required';
      else if (formData.password !== formData.confirmPassword) e.confirmPassword = 'Passwords do not match';
      if (!formData.agreeToTerms)            e.agreeToTerms    = 'You must agree to continue';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError('');
    if (!validate()) return;
    if (step === 1) { setStep(2); return; }

    setIsLoading(true);
    try {
      if (!supabase) throw new Error('Service not configured.');
      const { error: err } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
            `${window.location.origin}/auth/callback`,
          data: { name: `${formData.firstName} ${formData.lastName}`, age: formData.age },
        },
      });
      if (err) throw err;
      setEmailSent(true);
    } catch (err) {
      setSignupError(err instanceof Error ? err.message : 'Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /* shared input classes */
  const inputCls =
    'w-full py-3.5 bg-[#fff7ed]/[0.06] border border-[#f97316]/20 rounded-xl text-[#fff7ed] placeholder:text-[#fff7ed]/25 text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]/50 focus:border-[#f97316]/50 transition-all';

  /* ── Email sent screen ── */
  if (emailSent) {
    return (
      <div className="min-h-screen bg-[#0f0a07] flex items-center justify-center p-8">
        <div className="text-center space-y-6 max-w-sm">
          <div className="w-16 h-16 rounded-full bg-[#f97316]/15 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-[#f97316]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#fff7ed]">Check your email</h2>
            <p className="text-[#fff7ed]/50 text-sm mt-2 leading-relaxed">
              We sent a confirmation link to{' '}
              <span className="text-[#fff7ed] font-medium">{formData.email}</span>.
              Click it to activate your account.
            </p>
          </div>
          <p className="text-xs text-[#fff7ed]/30">
            Didn&apos;t receive it? Check spam.{' '}
            <Link href="/login" className="text-[#f97316] hover:text-[#fb923c] transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0a07] flex">

      {/* ── Left decorative panel ── */}
      <div className="hidden lg:flex lg:w-[42%] relative flex-col items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#f97316]/12 via-transparent to-[#fb923c]/5 pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 w-56 h-56 bg-[#f97316]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-8 max-w-xs w-full">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <Image
              src="/logo-mark.png"
              alt="EyeGuard"
              width={40}
              height={40}
              className="h-10 w-10 object-contain"
            />
            <span className="text-xl font-bold text-[#fff7ed]">
              Eye<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f97316] to-[#fb923c]">Guard</span>
            </span>
          </div>

          {/* Step indicators */}
          <div className="space-y-2 pt-4">
            {[
              { n: 1, label: 'Personal Details',     desc: 'Basic info to set up your profile' },
              { n: 2, label: 'Security & Agreement',  desc: 'Password and consent' },
            ].map(({ n, label, desc }) => {
              const done   = step > n;
              const active = step === n;
              return (
                <div
                  key={n}
                  className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
                    active ? 'border-[#f97316]/40 bg-[#f97316]/10'
                    : done  ? 'border-[#fff7ed]/10 bg-[#fff7ed]/5'
                    :         'border-[#fff7ed]/5 opacity-50'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold transition-all ${
                    done   ? 'bg-[#f97316] text-[#0f0a07]'
                    : active ? 'bg-[#f97316] text-[#0f0a07]'
                    :          'bg-[#fff7ed]/10 text-[#fff7ed]/40'
                  }`}>
                    {done ? <Check className="w-3.5 h-3.5" /> : n}
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${active || done ? 'text-[#fff7ed]' : 'text-[#fff7ed]/40'}`}>
                      {label}
                    </p>
                    <p className="text-xs text-[#fff7ed]/40 mt-0.5">{desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-xs text-[#fff7ed]/30">
            <Shield className="w-3.5 h-3.5 text-[#f97316]/50" />
            Your data is kept confidential and used only for research.
          </div>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md space-y-8">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5">
            <Image
              src="/logo-mark.png"
              alt="EyeGuard"
              width={36}
              height={36}
              className="h-9 w-9 object-contain"
            />
            <span className="text-lg font-bold text-[#fff7ed]">
              Eye<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f97316] to-[#fb923c]">Guard</span>
            </span>
          </div>

          {/* Heading */}
          <div>
            <p className="text-xs text-[#f97316] font-semibold tracking-widest uppercase mb-2">
              Step {step} of 2
            </p>
            <h2 className="text-3xl font-bold text-[#fff7ed]">
              {step === 1 ? 'Get Started' : 'Secure Your Account'}
            </h2>
            <p className="text-[#fff7ed]/50 mt-1.5 text-sm">
              {step === 1
                ? 'Enter your details to create your profile'
                : 'Set a strong password and agree to the terms'}
            </p>
          </div>

          {signupError && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {signupError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {step === 1 ? (
              <>
                {/* Name row */}
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { name: 'firstName', label: 'First Name', placeholder: 'John' },
                    { name: 'lastName',  label: 'Last Name',  placeholder: 'Doe' },
                  ].map(({ name, label, placeholder }) => (
                    <div key={name} className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#fff7ed]/50 uppercase tracking-wide">
                        {label}
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#fff7ed]/30" />
                        <input
                          name={name}
                          value={formData[name as keyof typeof formData] as string}
                          onChange={handleChange}
                          placeholder={placeholder}
                          className={`${inputCls} pl-10 pr-4`}
                        />
                      </div>
                      {errors[name] && <p className="text-xs text-red-400">{errors[name]}</p>}
                    </div>
                  ))}
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#fff7ed]/50 uppercase tracking-wide">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#fff7ed]/30" />
                    <input
                      type="email" name="email" value={formData.email} onChange={handleChange}
                      placeholder="you@example.com"
                      className={`${inputCls} pl-11 pr-4`}
                    />
                  </div>
                  {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
                </div>

                {/* Age */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#fff7ed]/50 uppercase tracking-wide">Age</label>
                  <select
                    name="age" value={formData.age} onChange={handleChange}
                    className="w-full px-4 py-3.5 bg-[#fff7ed]/[0.06] border border-[#f97316]/20 rounded-xl text-[#fff7ed] text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]/50 focus:border-[#f97316]/50 transition-all appearance-none cursor-pointer"
                  >
                    <option value="" className="bg-[#1a1008]">Select your age</option>
                    {AGE_OPTIONS.map(a => (
                      <option key={a} value={a} className="bg-[#1a1008]">{a}</option>
                    ))}
                  </select>
                  {errors.age && <p className="text-xs text-red-400">{errors.age}</p>}
                </div>
              </>
            ) : (
              <>
                {/* Password fields */}
                {[
                  {
                    name: 'password', label: 'Password',
                    show: showPassword, toggle: () => setShowPassword(p => !p),
                    placeholder: '••••••••', hint: 'At least 8 characters',
                  },
                  {
                    name: 'confirmPassword', label: 'Confirm Password',
                    show: showConfirm, toggle: () => setShowConfirm(p => !p),
                    placeholder: '••••••••', hint: '',
                  },
                ].map(({ name, label, show, toggle, placeholder, hint }) => (
                  <div key={name} className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#fff7ed]/50 uppercase tracking-wide">
                      {label}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#fff7ed]/30" />
                      <input
                        type={show ? 'text' : 'password'}
                        name={name}
                        value={formData[name as keyof typeof formData] as string}
                        onChange={handleChange}
                        placeholder={placeholder}
                        className={`${inputCls} pl-11 pr-12`}
                      />
                      <button
                        type="button" onClick={toggle}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#fff7ed]/30 hover:text-[#fff7ed]/60 transition-colors"
                      >
                        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {name === 'password' && <PasswordStrengthMeter password={formData.password} />}
                    {hint && !errors[name] && <p className="text-xs text-[#fff7ed]/30">{hint}</p>}
                    {errors[name] && <p className="text-xs text-red-400">{errors[name]}</p>}
                  </div>
                ))}

                {/* Terms checkbox */}
                <label className="flex items-start gap-3 cursor-pointer">
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                    formData.agreeToTerms
                      ? 'bg-[#f97316] border-[#f97316]'
                      : 'border-[#fff7ed]/20 bg-[#fff7ed]/5'
                  }`}>
                    <input
                      type="checkbox" name="agreeToTerms"
                      checked={formData.agreeToTerms} onChange={handleChange}
                      className="sr-only"
                    />
                    {formData.agreeToTerms && <Check className="w-3 h-3 text-[#0f0a07]" />}
                  </div>
                  <span className="text-sm text-[#fff7ed]/50 leading-relaxed">
                    I agree to the{' '}
                    <Link href="/terms" className="text-[#f97316] hover:text-[#fb923c] transition-colors">
                      Terms of Service
                    </Link>
                    {' '}and{' '}
                    <Link href="/privacy" className="text-[#f97316] hover:text-[#fb923c] transition-colors">
                      Privacy Policy
                    </Link>
                  </span>
                </label>
                {errors.agreeToTerms && <p className="text-xs text-red-400">{errors.agreeToTerms}</p>}
              </>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 px-5 py-3.5 rounded-xl border border-[#fff7ed]/15 text-[#fff7ed]/70 text-sm font-semibold hover:bg-[#fff7ed]/5 transition-all"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              )}
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-[#f97316] to-[#fb923c] text-[#0f0a07] font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-[#f97316]/25 hover:-translate-y-0.5"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-[#0f0a07]/30 border-t-[#0f0a07] rounded-full animate-spin" />
                ) : (
                  <>{step === 1 ? 'Continue' : 'Create Account'} <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </div>
          </form>

          <p className="text-center text-sm text-[#fff7ed]/40">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-[#f97316] hover:text-[#fb923c] font-semibold transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
