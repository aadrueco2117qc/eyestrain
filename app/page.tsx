'use client';

import { useRouter } from 'next/navigation';
import { Eye, Zap, Shield, BookOpen, TrendingUp, Activity, ArrowRight, CheckCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface PublicStats {
  respondents: number;
  logsRecorded: number;
  predictionsGenerated: number;
}

export default function Home() {
  const router = useRouter();
  const [stats, setStats] = useState<PublicStats | null>(null);

  useEffect(() => {
    fetch('/api/public/stats')
      .then(r => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col overflow-x-hidden">

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 sm:px-10 py-4 border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <Eye className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight">EyeGuard</span>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/login"
            className="text-sm text-white/70 hover:text-white transition-colors px-3 py-2"
          >
            Login
          </a>
          <a
            href="/signup"
            className="text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
          >
            Get Started
          </a>
        </div>
      </nav>

      {/* ── Hero — full viewport height so stats appear on scroll ── */}
      <section className="relative min-h-[calc(100vh-65px)] flex flex-col items-center justify-center px-6 pt-16 pb-20 text-center overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 left-1/4 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Badge */}
        <div className="relative inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-semibold mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          AI-Powered Eye Health for Students
        </div>

        <h1 className="relative text-5xl sm:text-6xl md:text-7xl font-bold leading-tight tracking-tight max-w-4xl">
          Protect Your Eyes,{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-400">
            Predict the Risk
          </span>
        </h1>

        <p className="relative text-lg text-white/60 max-w-xl mx-auto mt-6 leading-relaxed">
          EyeGuard tracks your daily screen time and symptoms to assess your risk of
          Computer Vision Syndrome — backed by the validated CVS-Q scoring method.
        </p>

        <div className="relative flex flex-col sm:flex-row gap-3 justify-center mt-10">
          <a
            href="/signup"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5"
          >
            Get Started Free
            <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="/login"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl border border-white/20 text-white/80 font-semibold hover:bg-white/5 hover:border-white/30 transition-all"
          >
            Sign In
          </a>
        </div>

        {/* Trust line */}
        <div className="relative flex items-center gap-6 mt-10 text-xs text-white/40">
          {['Free to use', 'No credit card required', 'Research-backed scoring'].map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-primary/70" />
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* ── Stats bar ───────────────────────────────────────────────── */}
      <section className="border-y border-white/10 bg-white/[0.02]">
        <div className="max-w-4xl mx-auto grid grid-cols-3 divide-x divide-white/10 px-6 py-10">
          {[
            { label: 'Respondents Tracked',   value: stats ? fmt(stats.respondents)          : '—', color: 'text-primary' },
            { label: 'Daily Logs Recorded',   value: stats ? fmt(stats.logsRecorded)          : '—', color: 'text-cyan-400' },
            { label: 'Predictions Generated', value: stats ? fmt(stats.predictionsGenerated)  : '—', color: 'text-emerald-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center px-4">
              <p className={`text-4xl font-bold tabular-nums ${color}`}>{value}</p>
              <p className="text-xs text-white/50 mt-2">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────── */}
      <section className="px-6 sm:px-10 py-24 max-w-6xl mx-auto w-full">
        <div className="text-center mb-14">
          <p className="text-xs text-primary font-semibold tracking-widest uppercase mb-3">What EyeGuard Does</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Everything you need to monitor eye health
          </h2>
          <p className="text-white/50 mt-4 max-w-xl mx-auto text-sm leading-relaxed">
            Log daily habits, get a risk score based on validated research, and receive
            actionable recommendations — all in one place.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              icon: <Eye className="w-5 h-5" />,
              color: 'bg-primary/20 text-primary',
              title: 'Daily Eye Health Log',
              desc: 'Record screen time, symptoms, sleep, and environment each day. Takes under 5 minutes.',
            },
            {
              icon: <Zap className="w-5 h-5" />,
              color: 'bg-cyan-500/20 text-cyan-400',
              title: 'CVS-Q Risk Scoring',
              desc: 'Risk is calculated using the clinically validated Computer Vision Syndrome Questionnaire (Seguí et al., 2015).',
            },
            {
              icon: <Shield className="w-5 h-5" />,
              color: 'bg-emerald-500/20 text-emerald-400',
              title: 'Smart Recommendations',
              desc: 'Get personalized advice based on your actual data — screen time, brightness, sleep, and reported symptoms.',
            },
            {
              icon: <TrendingUp className="w-5 h-5" />,
              color: 'bg-violet-500/20 text-violet-400',
              title: 'Trends Analysis',
              desc: 'Track your eye strain risk and fatigue score over 7, 14, or 30 days to spot patterns.',
            },
            {
              icon: <Activity className="w-5 h-5" />,
              color: 'bg-orange-500/20 text-orange-400',
              title: 'Factor Breakdown',
              desc: 'See exactly which factors — symptoms, screen time, brightness, sleep — are driving your risk score.',
            },
            {
              icon: <BookOpen className="w-5 h-5" />,
              color: 'bg-rose-500/20 text-rose-400',
              title: 'AI Health Assistant',
              desc: 'Ask EyeGuard AI questions about your data and get evidence-based eye health guidance.',
            },
          ].map(({ icon, color, title, desc }) => (
            <div
              key={title}
              className="group p-6 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 transition-all"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${color}`}>
                {icon}
              </div>
              <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
              <p className="text-sm text-white/50 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA banner ──────────────────────────────────────────────── */}
      <section className="px-6 sm:px-10 pb-24 max-w-6xl mx-auto w-full">
        <div className="relative rounded-3xl overflow-hidden border border-primary/20 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent p-10 sm:p-14 text-center">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
          <h2 className="relative text-3xl sm:text-4xl font-bold text-white mb-4">
            Start protecting your eyes today
          </h2>
          <p className="relative text-white/60 max-w-lg mx-auto mb-8 text-sm leading-relaxed">
            Join other students tracking their eye health. Log daily, see your risk trend,
            and build better screen habits backed by research.
          </p>
          <a
            href="/signup"
            className="relative inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all shadow-xl shadow-primary/30 hover:-translate-y-0.5"
          >
            Create Free Account
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="border-t border-white/10 px-6 sm:px-10 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <Eye className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold text-white/80">EyeGuard</span>
          </div>
          <p className="text-xs text-white/40 text-center">
            © 2026 EyeGuard. AI-assisted eye health monitoring for students.
            Not a substitute for professional medical advice.
          </p>
          <div className="flex items-center gap-4 text-xs text-white/50">
            <a href="/terms" className="hover:text-white/80 transition-colors">Terms of Service</a>
            <a href="/privacy" className="hover:text-white/80 transition-colors">Privacy Policy</a>
            <a href="/login" className="hover:text-white/80 transition-colors">Login</a>
            <a href="/signup" className="hover:text-white/80 transition-colors">Sign Up</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
