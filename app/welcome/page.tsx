'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle2, ArrowRight, Shield, Activity, Eye } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function WelcomePage() {
  const router   = useRouter();
  const supabase = createClient();
  const [name, setName] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      // Give the callback a moment to finish the session exchange
      for (let i = 0; i < 10; i++) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const rawName = user.user_metadata?.name as string | undefined;
          if (rawName) setName(rawName.split(' ')[0]); // first name only
          setReady(true);
          return;
        }
        await new Promise(r => setTimeout(r, 400));
      }
      // Still no session — just show the page without a name
      setReady(true);
    };
    init();
  }, [supabase]);

  return (
    <div className="min-h-screen bg-[#0f0a07] flex items-center justify-center p-6">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-[#f97316]/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 w-72 h-72 bg-[#fb923c]/6 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-lg text-center space-y-10">

        {/* Logo */}
        <div className="flex justify-center">
          <Image src="/logo-mark.png" alt="EyeGuard" width={80} height={80}
            className="h-20 w-20 object-contain" priority />
        </div>

        {/* Success badge */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-green-500/15 flex items-center justify-center ring-4 ring-green-500/20">
              <CheckCircle2 className="w-12 h-12 text-green-400" />
            </div>
            {/* Pulse ring */}
            <span className="absolute inset-0 rounded-full animate-ping bg-green-500/10 pointer-events-none" style={{ animationDuration: '2s' }} />
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#fff7ed]">
            {ready && name ? (
              <>Welcome, <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f97316] to-[#fb923c]">{name}!</span></>
            ) : (
              <>You're all set! <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f97316] to-[#fb923c]">🎉</span></>
            )}
          </h1>
          <p className="text-[#fff7ed]/50 text-base leading-relaxed max-w-sm mx-auto">
            Your EyeGuard account has been successfully verified. You can now log in and start tracking your eye health.
          </p>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: Activity, label: 'Daily Log',       desc: 'Track symptoms & screen time' },
            { icon: Shield,   label: 'Risk Score',      desc: 'AI-powered eye strain assessment' },
            { icon: Eye,      label: 'Recommendations', desc: 'Personalised habits to improve' },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-[#fff7ed]/[0.04] border border-[#f97316]/10">
              <div className="w-10 h-10 rounded-xl bg-[#f97316]/12 flex items-center justify-center">
                <Icon className="w-5 h-5 text-[#f97316]" />
              </div>
              <p className="text-xs font-semibold text-[#fff7ed]/80">{label}</p>
              <p className="text-[11px] text-[#fff7ed]/35 leading-tight">{desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2.5 w-full px-6 py-3.5 bg-gradient-to-br from-amber-500 to-orange-500 text-white text-sm font-bold rounded-2xl hover:from-amber-400 hover:to-orange-400 hover:scale-[1.02] transition-all shadow-xl shadow-orange-500/25"
          >
            Go to Login
            <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-xs text-[#fff7ed]/25">
            Already verified?{' '}
            <Link href="/login" className="text-[#f97316] hover:underline">Sign in now</Link>
          </p>
        </div>

      </div>
    </div>
  );
}
