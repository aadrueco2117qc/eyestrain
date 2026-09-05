'use client';

import { LogOut, X } from 'lucide-react';

interface LogoutDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function LogoutDialog({ open, onConfirm, onCancel, isLoading }: LogoutDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Panel */}
      <div className="relative w-full max-w-sm rounded-2xl border border-[#f97316]/20 bg-[#1a1008] shadow-2xl shadow-black/60 p-7">
        {/* Close */}
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-full text-[#fff7ed]/30 hover:text-[#fff7ed]/70 hover:bg-[#fff7ed]/5 transition-colors"
          aria-label="Cancel"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon */}
        <div className="w-12 h-12 rounded-2xl bg-[#f97316]/10 flex items-center justify-center mb-5">
          <LogOut className="w-5 h-5 text-[#f97316]" />
        </div>

        <h3 id="logout-title" className="text-base font-semibold text-[#fff7ed] mb-1">
          Sign out of EyeGuard?
        </h3>
        <p className="text-sm text-[#fff7ed]/50 mb-7 leading-relaxed">
          You'll be returned to the home page. You can sign back in any time.
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-[#f97316] to-[#fb923c] text-[#0f0a07] font-semibold text-sm hover:opacity-90 disabled:opacity-60 transition-all"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-[#0f0a07]/30 border-t-[#0f0a07] rounded-full animate-spin" />
            ) : (
              <>
                <LogOut className="w-4 h-4" />
                Yes, sign out
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 py-2.5 rounded-xl border border-[#fff7ed]/15 text-[#fff7ed]/70 text-sm font-semibold hover:bg-[#fff7ed]/5 transition-colors"
          >
            Stay signed in
          </button>
        </div>
      </div>
    </div>
  );
}
