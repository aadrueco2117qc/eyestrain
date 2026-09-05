'use client';

import { Check, X } from 'lucide-react';
import { PASSWORD_RULES, passwordStrengthScore } from '@/lib/password-strength';

interface Props {
  password: string;
}

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLORS = [
  '',
  'bg-red-500',
  'bg-orange-500',
  'bg-yellow-500',
  'bg-green-500',
];
const STRENGTH_TEXT = [
  '',
  'text-red-400',
  'text-[#f97316]',
  'text-yellow-400',
  'text-green-400',
];

export function PasswordStrengthMeter({ password }: Props) {
  if (!password) return null;

  const score = passwordStrengthScore(password);

  return (
    <div className="space-y-2 mt-2">
      {/* Bar */}
      <div className="flex gap-1">
        {PASSWORD_RULES.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i < score ? STRENGTH_COLORS[score] : 'bg-[#fff7ed]/10'
            }`}
          />
        ))}
      </div>

      {/* Label */}
      <p className={`text-xs font-medium ${STRENGTH_TEXT[score]}`}>
        {STRENGTH_LABELS[score]}
      </p>

      {/* Rules */}
      <ul className="space-y-1">
        {PASSWORD_RULES.map(rule => {
          const ok = rule.test(password);
          return (
            <li key={rule.label} className={`flex items-center gap-1.5 text-xs transition-colors ${ok ? 'text-green-400' : 'text-[#fff7ed]/35'}`}>
              {ok
                ? <Check className="w-3 h-3 flex-shrink-0" />
                : <X className="w-3 h-3 flex-shrink-0" />}
              {rule.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
