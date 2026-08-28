import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 sm:px-10 py-4 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <Image src="/eyeguard-logo.svg" alt="EyeGuard" width={30} height={30} />
          <span className="text-base font-bold text-foreground">EyeGuard</span>
        </div>
        <Link href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-12 pb-8 border-b border-border">
          <p className="text-xs text-primary font-semibold tracking-widest uppercase mb-3">Legal</p>
          <h1 className="text-4xl font-bold text-foreground">Terms of Service</h1>
          <p className="text-muted-foreground text-sm mt-3">
            Effective date: January 1, 2026 · Last updated: August 2026
          </p>
        </div>

        <div className="space-y-10 text-sm text-muted-foreground leading-relaxed">

          <Section title="1. Acceptance of Terms">
            By accessing or using EyeGuard ("the System," "we," "us"), you agree to be bound by
            these Terms of Service. If you do not agree, do not use the system. EyeGuard is an
            academic research project developed for a capstone study on digital eye strain among
            students at Our Lady of Fatima University.
          </Section>

          <Section title="2. Nature of the Service">
            <p>
              EyeGuard is a <strong className="text-foreground">screening and awareness tool</strong>, not a
              medical device or clinical service. It uses the Computer Vision Syndrome Questionnaire
              (CVS-Q) and published ergonomics guidelines to estimate eye strain risk from
              self-reported data. It is not intended to diagnose, treat, cure, or prevent any
              medical condition.
            </p>
            <p className="mt-3">
              Always consult a licensed ophthalmologist or healthcare professional for actual eye
              health concerns. Risk scores and recommendations provided by EyeGuard are
              informational only.
            </p>
          </Section>

          <Section title="3. Eligibility">
            You must be at least 13 years old to use EyeGuard. By registering, you confirm you
            meet this age requirement. Students participating as research respondents must do so
            voluntarily and may withdraw at any time without penalty.
          </Section>

          <Section title="4. Your Account">
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>You are responsible for maintaining the confidentiality of your password.</li>
              <li>You must provide accurate information when creating an account.</li>
              <li>You may not share your account with others.</li>
              <li>You may request deletion of your account and data at any time by contacting the research team.</li>
            </ul>
          </Section>

          <Section title="5. Data Collection and Research Use">
            <p>
              By using EyeGuard, you consent to the collection of the data you submit (screen
              time, symptoms, sleep habits, etc.) for academic research purposes. Your data:
            </p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li>Will be used solely to train and evaluate the eye strain prediction model.</li>
              <li>Will not be sold or shared with third parties for commercial purposes.</li>
              <li>Will be stored on Supabase-hosted infrastructure with encryption at rest.</li>
              <li>May be included in anonymised aggregate findings published in the capstone research paper.</li>
            </ul>
          </Section>

          <Section title="6. Acceptable Use">
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li>Submit false or intentionally misleading data to skew research results.</li>
              <li>Attempt to access other users' accounts or data.</li>
              <li>Use automated scripts or bots to submit data or interact with the system.</li>
              <li>Reverse-engineer, decompile, or exploit any part of the system.</li>
            </ul>
          </Section>

          <Section title="7. Intellectual Property">
            All content, code, designs, and research materials within EyeGuard are the
            intellectual property of the research team. You may not reproduce or distribute any
            part of the system without prior written consent.
          </Section>

          <Section title="8. Disclaimers and Limitation of Liability">
            EyeGuard is provided "as is" without warranties of any kind. The research team is not
            liable for any health decisions made based on the system's output, any data loss or
            service interruption, or any indirect or consequential damages arising from use of
            the system.
          </Section>

          <Section title="9. Termination">
            We reserve the right to suspend or terminate accounts that violate these terms or
            that submit fraudulent data. You may also deactivate your account at any time.
          </Section>

          <Section title="10. Changes to These Terms">
            We may update these Terms as the system evolves. Continued use after changes
            constitutes acceptance of the updated Terms. The effective date at the top of this
            page will reflect the most recent revision.
          </Section>

          <Section title="11. Contact">
            For questions about these Terms, contact the EyeGuard research team at{' '}
            <a href="mailto:avesquivel1011qc@student.fatima.edu.ph" className="text-primary hover:underline">
              avesquivel1011qc@student.fatima.edu.ph
            </a>.
          </Section>
        </div>

        {/* Footer links */}
        <div className="mt-14 pt-8 border-t border-border flex flex-col sm:flex-row gap-4 text-sm">
          <Link href="/privacy" className="text-primary hover:underline">Privacy Policy →</Link>
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
