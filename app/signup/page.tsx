'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Eye, EyeOff, Mail, User, Lock, Check,
  CheckCircle2, ArrowRight, ArrowLeft, Shield,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

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
      if (!formData.password)               e.password        = 'Required';
      else if (formData.password.length < 8) e.password       = 'Min 8 characters';
      if (!formData.confirmPassword)         e.confirmPassword = 'Required';
      else if (formData.password !== formData.confirmPassword) e.confirmPassword = 'Passwords do not match';
      if (!formData.agreeToTerms)            e.agreeToTerms   = 'You must agree to continue';
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

  /* ── Email sent screen ── */
  if (emailSent) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-8">
        <div className="text-center space-y-6 max-w-sm">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Check your email</h2>
            <p className="text-white/50 text-sm mt-2 leading-relaxed">
              We sent a confirmation link to{' '}
              <span className="text-white font-medium">{formData.email}</span>.
              Click it to activate your account.
            </p>
          </div>
          <p className="text-xs text-white/30">
            Didn&apos;t receive it? Check spam.{' '}
            <Link href="/login" className="text-primary hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex">

      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-[42%] relative flex-col items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-violet-500/10 pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 w-56 h-56 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-8 max-w-xs w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Image src="/eyeguard-logo.svg" alt="EyeGuard" width={44} height={44} />
            <span className="text-xl font-bold text-white">EyeGuard</span>
          </div>

          {/* Step indicators */}
          <div className="space-y-2 pt-4">
            {[
              { n: 1, label: 'Personal Details',    desc: 'Basic info to set up your profile' },
              { n: 2, label: 'Security & Agreement', desc: 'Password and consent' },
            ].map(({ n, label, desc }) => {
              const done    = step > n;
              const active  = step === n;
              return (
                <div key={n} className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
                  active  ? 'border-primary/40 bg-primary/10'  :
                  done    ? 'border-white/10 bg-white/5'       :
                  'border-white/5 opacity-50'
                }`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold transition-all ${
                    done   ? 'bg-emerald-500 text-white'        :
                    active ? 'bg-primary text-white'            :
                    'bg-white/10 text-white/40'
                  }`}>
                    {done ? <Check className="w-3.5 h-3.5" /> : n}
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${active || done ? 'text-white' : 'text-white/40'}`}>{label}</p>
                    <p className="text-xs text-white/40 mt-0.5">{desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-xs text-white/30">
            <Shield className="w-3.5 h-3.5 text-primary/50" />
            Your data is kept confidential and used only for research.
          </div>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md space-y-8">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3">
            <Image src="/eyeguard-logo.svg" alt="EyeGuard" width={36} height={36} />
            <span className="text-lg font-bold text-white">EyeGuard</span>
          </div>

          {/* Heading */}
          <div>
            <p className="text-xs text-primary font-semibold tracking-widest uppercase mb-2">
              Step {step} of 2
            </p>
            <h2 className="text-3xl font-bold text-white">
              {step === 1 ? 'Get Started' : 'Secure Your Account'}
            </h2>
            <p className="text-white/50 mt-1.5 text-sm">
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
                      <label className="text-xs font-semibold text-white/60 uppercase tracking-wide">{label}</label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                        <input
                          name={name}
                          value={formData[name as keyof typeof formData] as string}
                          onChange={handleChange}
                          placeholder={placeholder}
                          className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                        />
                      </div>
                      {errors[name] && <p className="text-xs text-red-400">{errors[name]}</p>}
                    </div>
                  ))}
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/60 uppercase tracking-wide">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      type="email" name="email" value={formData.email} onChange={handleChange}
                      placeholder="you@example.com"
                      className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                    />
                  </div>
                  {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
                </div>

                {/* Age */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/60 uppercase tracking-wide">Age</label>
                  <select
                    name="age" value={formData.age} onChange={handleChange}
                    className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all appearance-none cursor-pointer"
                  >
                    <option value="" className="bg-[#1a1a2e]">Select your age</option>
                    {AGE_OPTIONS.map(a => (
                      <option key={a} value={a} className="bg-[#1a1a2e]">{a}</option>
                    ))}
                  </select>
                  {errors.age && <p className="text-xs text-red-400">{errors.age}</p>}
                </div>
              </>
            ) : (
              <>
                {/* Password */}
                {[
                  { name: 'password',        label: 'Password',         show: showPassword, toggle: () => setShowPassword(p => !p), placeholder: '••••••••', hint: 'At least 8 characters' },
                  { name: 'confirmPassword', label: 'Confirm Password',  show: showConfirm,  toggle: () => setShowConfirm(p => !p),  placeholder: '••••••••', hint: '' },
                ].map(({ name, label, show, toggle, placeholder, hint }) => (
                  <div key={name} className="space-y-1.5">
                    <label className="text-xs font-semibold text-white/60 uppercase tracking-wide">{label}</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <input
                        type={show ? 'text' : 'password'}
                        name={name}
                        value={formData[name as keyof typeof formData] as string}
                        onChange={handleChange}
                        placeholder={placeholder}
                        className="w-full pl-11 pr-12 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                      />
                      <button type="button" onClick={toggle} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {hint && !errors[name] && <p className="text-xs text-white/30">{hint}</p>}
                    {errors[name] && <p className="text-xs text-red-400">{errors[name]}</p>}
                  </div>
                ))}

                {/* Terms */}
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                    formData.agreeToTerms ? 'bg-primary border-primary' : 'border-white/20 bg-white/5'
                  }`}>
                    <input type="checkbox" name="agreeToTerms" checked={formData.agreeToTerms} onChange={handleChange} className="sr-only" />
                    {formData.agreeToTerms && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-sm text-white/50 leading-relaxed">
                    I agree to the{' '}
                    <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
                    {' '}and{' '}
                    <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
                  </span>
                </label>
                {errors.agreeToTerms && <p className="text-xs text-red-400">{errors.agreeToTerms}</p>}
              </>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 px-5 py-3.5 rounded-xl border border-white/15 text-white/70 text-sm font-semibold hover:bg-white/5 transition-all"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              )}
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-primary/25 hover:-translate-y-0.5"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>{step === 1 ? 'Continue' : 'Create Account'} <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </div>
          </form>

          <p className="text-center text-sm text-white/40">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:text-primary/80 font-semibold transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
