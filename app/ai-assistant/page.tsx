'use client';

import { createClient } from '@/lib/supabase/client';
import { MainLayout } from '@/components/main-layout';
import { AuthGuard } from '@/components/auth-guard';
import { AiChat } from '@/components/ai-chat';
import { useEffect, useState } from 'react';
import { CheckCircle, Eye, Droplets, Activity, AlertTriangle } from 'lucide-react';

export default function AiAssistantPage() {
  const supabase = createClient();
  const [prediction, setPrediction] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('first_name')
        .eq('id', authUser.id)
        .maybeSingle();

      setUser({
        name: profile?.first_name ?? authUser.email?.split('@')[0] ?? 'there',
      });

      const { data: pred } = await supabase
        .from('predictions')
        .select('risk_level, risk_percentage, fatigue_score, recommendations')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setPrediction(pred);
    };
    load();
  }, [supabase]);

  const riskLabels = ['Low', 'Moderate', 'High', 'Critical'];
  const riskLabel = prediction ? (riskLabels[prediction.risk_level] ?? 'Unknown') : null;

  const recs = prediction?.recommendations
    ? prediction.recommendations.map((r: unknown) => {
        if (typeof r === 'string') {
          try { const p = JSON.parse(r); if (p?.title) return p; } catch { /* plain */ }
          return { title: r, description: '' };
        }
        return r as { title: string; description: string };
      })
    : [];

  const recIcons = [
    <AlertTriangle key="a" className="w-5 h-5" />,
    <Eye key="b" className="w-5 h-5" />,
    <Droplets key="c" className="w-5 h-5" />,
    <Activity key="d" className="w-5 h-5" />,
  ];

  return (
    <AuthGuard>
      <MainLayout>
        <div className="space-y-6 max-w-5xl">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">EyeGuard Assistant</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Personalised recommendations and AI-powered eye health guidance
            </p>
          </div>

          {/* Recommendations */}
          {recs.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5 text-primary" />
                <h2 className="text-base font-semibold text-foreground">Personalised Recommendations</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {recs.slice(0, 4).map((rec: { title: string; description: string }, i: number) => (
                  <div
                    key={i}
                    className={`p-5 rounded-2xl border bg-card transition-colors hover:border-primary/40 ${
                      i === 0 && riskLabel && ['High', 'Critical'].includes(riskLabel)
                        ? 'border-orange-500/40 bg-orange-500/5'
                        : 'border-border'
                    }`}
                  >
                    <div className={`mb-3 ${
                      i === 0 && riskLabel && ['High', 'Critical'].includes(riskLabel)
                        ? 'text-orange-500'
                        : 'text-primary'
                    }`}>
                      {recIcons[i] ?? <CheckCircle className="w-5 h-5" />}
                    </div>
                    {i === 0 && riskLabel && ['High', 'Critical'].includes(riskLabel) && (
                      <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest bg-orange-500/15 px-2 py-0.5 rounded-full mb-2 inline-block">
                        High Priority
                      </span>
                    )}
                    <p className="text-sm font-semibold text-foreground mt-1">{rec.title}</p>
                    {rec.description && (
                      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{rec.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Chat */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                <Eye className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <h2 className="text-base font-semibold text-foreground">Ask EyeGuard AI</h2>
            </div>
            <AiChat
              mode="inline"
              initialMessage={
                prediction && user
                  ? `Hi ${user.name}! 👋 Based on your latest data, your eye strain risk is ${riskLabel} (${prediction.risk_percentage?.toFixed(1)}%). Ask me anything about your eye health or what you can do to improve it!`
                  : `Hi! I'm EyeGuard AI 👋 Ask me anything about eye health, screen time habits, or your data.`
              }
            />
          </section>
        </div>
      </MainLayout>
    </AuthGuard>
  );
}
