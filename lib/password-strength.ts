export interface PasswordRule {
  label: string;
  test: (pw: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { label: 'At least 8 characters',     test: pw => pw.length >= 8 },
  { label: 'One uppercase letter (A-Z)', test: pw => /[A-Z]/.test(pw) },
  { label: 'One number (0-9)',           test: pw => /[0-9]/.test(pw) },
  { label: 'One special character (!@#$…)', test: pw => /[^A-Za-z0-9]/.test(pw) },
];

export function validatePassword(pw: string): string | null {
  for (const rule of PASSWORD_RULES) {
    if (!rule.test(pw)) return `Password must include: ${rule.label.toLowerCase()}`;
  }
  return null;
}

export function passwordStrengthScore(pw: string): number {
  return PASSWORD_RULES.filter(r => r.test(pw)).length;
}
