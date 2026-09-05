import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 sm:px-10 py-4 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <Image src="/logo-mark.png" alt="EyeGuard" width={40} height={40} className="h-10 w-10 object-contain object-center" />
          <span className="text-base font-bold">
            <span className="text-foreground">Eye</span><span className="text-[#f97316]">Guard</span>
          </span>
        </div>
        <Link href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-12 pb-8 border-b border-border">
          <p className="text-xs text-primary font-semibold tracking-widest uppercase mb-3">Legal</p>
          <h1 className="text-4xl font-bold text-foreground">Privacy Policy</h1>
          <p className="text-muted-foreground text-sm mt-3">
            Effective date: January 1, 2026 · Last updated: August 2026
          </p>
        </div>

        <div className="space-y-10 text-sm text-muted-foreground leading-relaxed">

          <Section title="1. Who We Are">
            EyeGuard is an academic research project by students of Our Lady of Fatima University,
            designed to study digital eye strain among Filipino college students using a validated
            screening instrument (CVS-Q). This Privacy Policy explains how we collect, store, and
            use your personal data.
          </Section>

          <Section title="2. Privacy Law Framework">
            <p>
              This notice is designed around the Philippines' Data Privacy Act of 2012 (Republic Act No. 10173), especially its requirements for transparency, legitimate purpose, proportionality, lawful processing, security, and data-subject rights. The Act identifies health and education information as sensitive personal information. Where another law applies to a user or processing activity, additional obligations may apply.
            </p>
            <p className="mt-3">
              For users covered by the European Union General Data Protection Regulation, the same notice is intended to reflect the principles of purpose limitation, data minimisation, accuracy, storage limitation, security, and accountability. This page is product documentation, not legal advice or a legal determination that the project complies with every law.
            </p>
            <p className="mt-3 text-xs">
              Sources: <a className="text-primary hover:underline" href="https://privacy.gov.ph/data-privacy-act/" target="_blank" rel="noreferrer">National Privacy Commission, Republic Act No. 10173</a> and <a className="text-primary hover:underline" href="https://gdpr.eu/article-5-how-to-process-personal-data/" target="_blank" rel="noreferrer">GDPR Article 5 principles</a>.
            </p>
          </Section>

          <Section title="3. What Data We Collect">
            <p>When you register and use EyeGuard, we collect:</p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li><strong className="text-foreground">Account data:</strong> Email address and password (hashed and secured by Supabase Auth).</li>
              <li><strong className="text-foreground">Profile data:</strong> First name, last name, age, gender, year level, and field of study.</li>
              <li><strong className="text-foreground">Daily log data:</strong> Screen time, reported symptoms, sleep hours, screen brightness, and optional notes.</li>
              <li><strong className="text-foreground">Derived data:</strong> Risk scores and fatigue scores calculated from your submitted logs.</li>
            </ul>
          </Section>

          <Section title="4. How We Use Your Data">
            <p>Your data is used exclusively for:</p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li>Displaying your personal eye health dashboard, risk scores, and trends.</li>
              <li>Training and improving the eye strain prediction model.</li>
              <li>Generating aggregate, anonymised statistics for the academic research paper.</li>
              <li>Sending account-related emails (email confirmation, if configured).</li>
            </ul>
            <p className="mt-3">
              We do <strong className="text-foreground">not</strong> use your data for advertising,
              profiling for commercial purposes, or any purpose outside this research project.
            </p>
          </Section>

          <Section title="5. Data Storage and Security">
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>All data is stored on <strong className="text-foreground">Supabase</strong>, hosted on secure cloud infrastructure with encryption at rest and in transit (TLS).</li>
              <li>Passwords are never stored in plain text — Supabase Auth handles hashing using industry-standard bcrypt.</li>
              <li>Access to the database is restricted to the research team via Row Level Security (RLS) policies.</li>
              <li>Admin access requires a verified admin email and authenticated session.</li>
            </ul>
          </Section>

          <Section title="6. Data Sharing and AI Processing">
            <p>We do not sell or rent your personal data. The application uses service providers to operate authentication, storage, and AI features:</p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li><strong className="text-foreground">Supabase</strong> — database and authentication infrastructure.</li>
              <li><strong className="text-foreground">Google Gemini</strong> — receives the personal context needed to answer regular-user AI chat requests.</li>
              <li><strong className="text-foreground">Groq</strong> — may receive administrator chat requests when an authorised administrator uses the admin assistant.</li>
            </ul>
            <p className="mt-3">
              Research findings may be published in aggregate, anonymised form. We should not describe AI prompts as anonymous: the assistant receives only the context required for the requested feature, and users should avoid entering unnecessary identifying information in chat.
            </p>
          </Section>

          <Section title="7. Your Rights">
            <p>You have the right to:</p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li><strong className="text-foreground">Access</strong> your personal data — visible in your dashboard at any time.</li>
              <li><strong className="text-foreground">Correct</strong> inaccurate data — via your profile settings.</li>
              <li><strong className="text-foreground">Delete</strong> your data — contact us to request full account and data deletion.</li>
              <li><strong className="text-foreground">Withdraw consent</strong> — you may stop using the system at any time.</li>
            </ul>
          </Section>

          <Section title="8. Cookies and Tracking">
            EyeGuard uses session cookies managed by Supabase Auth to keep you logged in.
            We do not use third-party tracking cookies, advertising trackers, or analytics
            platforms that collect personal data.
          </Section>

          <Section title="9. Children's Privacy">
            EyeGuard is intended for users aged 13 and above. We do not knowingly collect data
            from children under 13. If you believe a minor has registered without parental
            consent, please contact us for data removal.
          </Section>

          <Section title="10. Retention">
            Your data is retained for the duration of the research study and may be kept in
            anonymised aggregate form thereafter for academic citation purposes. Identified
            personal records will be deleted upon request or at the conclusion of the study.
          </Section>

          <Section title="11. Changes to This Policy">
            If we make material changes to this Privacy Policy, we will update the effective
            date at the top of this page. Continued use of EyeGuard after changes constitutes
            acceptance of the updated policy.
          </Section>

          <Section title="12. Contact Us">
            For any privacy-related requests or questions, please contact the EyeGuard research
            team at{' '}
            <a href="mailto:avesquivel1011qc@student.fatima.edu.ph" className="text-primary hover:underline">
              avesquivel1011qc@student.fatima.edu.ph
            </a>.
          </Section>
        </div>

        {/* Footer links */}
        <div className="mt-14 pt-8 border-t border-border flex flex-col sm:flex-row gap-4 text-sm">
          <Link href="/terms" className="text-primary hover:underline">Terms of Service →</Link>
          <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">← Back to EyeGuard</Link>
        </div>
      </main>

      <footer className="border-t border-border px-6 py-6 text-center text-xs text-muted-foreground">
        © 2026 EyeGuard. Academic research project — not a commercial medical service.
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-3">
        <span className="w-1 h-5 rounded-full bg-primary flex-shrink-0" />
        {title}
      </h2>
      <div className="pl-4">{children}</div>
    </section>
  );
}
