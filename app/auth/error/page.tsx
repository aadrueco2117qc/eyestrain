'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import Image from 'next/image';

function AuthErrorContent() {
  const params = useSearchParams();
  // Supabase appends ?error=... when the link genuinely fails.
  // When it's absent the user likely clicked a confirmation link that
  // already exchanged correctly but the callback redirected here — treat
  // it as a successful confirmation so the messaging is accurate.
  const hasError = params.get('error') || params.get('error_description');

  if (!hasError) {
    // Account confirmed (or link already used after a successful confirm)
    return (
      <div className="min-h-screen bg-[#0f0a07] flex items-center justify-center p-6">
        <div className="relative z-10 w-full max-w-md text-center space-y-8">
          <div className="flex justify-center">
            <Image src="/logo-mark.png" alt="EyeGuard" width={72} height={72}
              className="h-16 w-16 object-contain" priority />
          </div>

          <div className="flex justify-center">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-green-500/15 flex items-center justify-center ring-4 ring-green-500/20">
                <CheckCircle2 className="w-10 h-10 text-green-400" />
              </div>
              <span className="absolute inset-0 rounded-full animate-ping bg-green-500/10 pointer-events-none"
                style={{ animationDuration: '2s' }} />
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-bold text-[#fff7ed]">Account confirmed!</h1>
            <p className="text-[#fff7ed]/50 leading-relaxed max-w-sm mx-auto">
              Your EyeGuard account has been successfully verified. You can now sign in and start tracking your eye health.
            </p>
          </div>

          <div className="space-y-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2.5 w-full px-6 py-3.5
                bg-gradient-to-br from-amber-500 to-orange-500 text-white text-sm font-bold rounded-2xl
                hover:from-amber-400 hover:to-orange-400 hover:scale-[1.02] transition-all
                shadow-xl shadow-orange-500/25"
            >
              Sign In to EyeGuard
              <ArrowRight className="w-4 h-4" />
            </Link>
            <p className="text-xs text-[#fff7ed]/25">
              Already signed in?{' '}
              <Link href="/dashboard" className="text-[#f97316] hover:underline">Go to dashboard</Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Genuine error (expired link, already used, etc.)
  return (
    <div className="min-h-screen bg-[#0f0a07] flex items-center justify-center p-6">
      <div className="relative z-10 w-full max-w-md text-center space-y-8">
        <div className="flex justify-center">
          <Image src="/logo-mark.png" alt="EyeGuard" width={72} height={72}
            className="h-16 w-16 object-contain" priority />
        </div>

        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-red-500/15 flex items-center justify-center ring-4 ring-red-500/20">
            <AlertTriangle className="w-10 h-10 text-red-400" />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-[#fff7ed]">Link expired</h1>
          <p className="text-[#fff7ed]/50 leading-relaxed max-w-sm mx-auto">
            This link has expired or has already been used. Links are valid for a limited time — please request a new one.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold
              bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-orange-500/25
              hover:from-amber-400 hover:to-orange-400 transition-all"
          >
            Back to Login
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-sm font-medium
              border border-[#f97316]/25 text-[#fff7ed]/70 hover:border-[#f97316]/50 hover:text-[#fff7ed] transition-all"
          >
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0f0a07] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#f97316]/40 border-t-[#f97316] rounded-full animate-spin" />
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  );
}
