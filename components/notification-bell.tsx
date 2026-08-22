'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, X, AlertTriangle, TrendingUp, Eye, CheckCircle, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// ── Types ─────────────────────────────────────────────────────────────────────

type NotifLevel = 'critical' | 'high' | 'info' | 'success';

interface Notification {
  id: string;
  level: NotifLevel;
  title: string;
  body: string;
  href?: string;
  timestamp: string; // ISO date string
  read: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const LEVEL_STYLES: Record<NotifLevel, { icon: React.ReactNode; badge: string; dot: string; bg: string }> = {
  critical: {
    icon:  <AlertTriangle className="w-4 h-4 text-red-500" />,
    badge: 'bg-red-500',
    dot:   'bg-red-500',
    bg:    'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800',
  },
  high: {
    icon:  <AlertTriangle className="w-4 h-4 text-orange-500" />,
    badge: 'bg-orange-500',
    dot:   'bg-orange-500',
    bg:    'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800',
  },
  info: {
    icon:  <Eye className="w-4 h-4 text-blue-500" />,
    badge: 'bg-blue-500',
    dot:   'bg-blue-400',
    bg:    'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800',
  },
  success: {
    icon:  <CheckCircle className="w-4 h-4 text-green-500" />,
    badge: 'bg-green-500',
    dot:   'bg-green-400',
    bg:    'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800',
  },
};

const STORAGE_KEY = 'eyeguard_notif_read';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function NotificationBell() {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // ── Load read IDs from localStorage ────────────────────────────────────────
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setReadIds(new Set(JSON.parse(stored)));
    } catch { /* ignore */ }
  }, []);

  // ── Build notifications from Supabase data ──────────────────────────────────
  useEffect(() => {
    const load = async () => {
      // Read localStorage synchronously here so we never race with the
      // separate readIds state useEffect
      let currentReadIds = new Set<string>();
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          currentReadIds = new Set(JSON.parse(stored));
          setReadIds(currentReadIds);
        }
      } catch { /* ignore */ }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch last 14 predictions with their log dates
        const { data: preds } = await supabase
          .from('predictions')
          .select('id, risk_level, risk_percentage, fatigue_score, confidence, created_at, daily_log_id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(14);

        // Fetch latest daily log to check if user logged today
        const today = new Date().toISOString().split('T')[0];
        const { data: todayLog } = await supabase
          .from('daily_logs')
          .select('id')
          .eq('user_id', user.id)
          .eq('date', today)
          .limit(1);

        const built: Notification[] = [];

        // 1. Not logged today reminder (only show if past 10am)
        const nowHour = new Date().getHours();
        if (nowHour >= 10 && (!todayLog || todayLog.length === 0)) {
          built.push({
            id: 'no-log-today',
            level: 'info',
            title: "You haven't logged today",
            body: "Track today's screen time and symptoms to keep your streak going.",
            href: '/daily-log',
            timestamp: new Date().toISOString(),
            read: false,
          });
        }

        // 2. Risk-based notifications from recent predictions
        const riskLabels = ['Low', 'Moderate', 'High', 'Critical'];
        for (const pred of preds ?? []) {
          const level = pred.risk_level ?? 0;
          const pct   = pred.risk_percentage?.toFixed(1) ?? '?';
          const date  = new Date(pred.created_at).toISOString().split('T')[0];

          if (level === 3) {
            built.push({
              id: `pred-${pred.id}`,
              level: 'critical',
              title: '🚨 Critical eye strain risk',
              body:  `Your risk score was ${pct}% on ${date}. Rest your eyes and reduce screen time.`,
              href:  '/risk-prediction',
              timestamp: pred.created_at,
              read: false,
            });
          } else if (level === 2) {
            built.push({
              id: `pred-${pred.id}`,
              level: 'high',
              title: '⚠️ High eye strain risk',
              body:  `Your risk score was ${pct}% on ${date}. Follow your recommendations.`,
              href:  '/risk-prediction',
              timestamp: pred.created_at,
              read: false,
            });
          } else if (level <= 1 && pred.risk_percentage !== null) {
            // Only add one "good" notification — the most recent low/moderate
            if (built.findIndex(n => n.level === 'success') === -1) {
              built.push({
                id: `pred-${pred.id}`,
                level: 'success',
                title: `${riskLabels[level]} risk — looking good`,
                body:  `Latest score: ${pct}%. Keep up your healthy habits!`,
                href:  '/risk-prediction',
                timestamp: pred.created_at,
                read: false,
              });
            }
          }

          // High fatigue warning (independent of risk level)
          if ((pred.fatigue_score ?? 0) >= 7 && built.findIndex(n => n.id === `fatigue-${pred.id}`) === -1) {
            built.push({
              id: `fatigue-${pred.id}`,
              level: 'high',
              title: 'High visual fatigue detected',
              body:  `Fatigue score ${pred.fatigue_score?.toFixed(1)}/10 on ${date}. Take a break from screens.`,
              href:  '/risk-prediction',
              timestamp: pred.created_at,
              read: false,
            });
          }
        }

        // Cap at 10, mark read state from localStorage
        const capped = built.slice(0, 10).map(n => ({
          ...n,
          read: currentReadIds.has(n.id),
        }));

        setNotifications(capped);
      } catch (err) {
        console.error('Notification load error:', err);
      }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Close on outside click ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current  && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Close on Escape ─────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const unread = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    const allIds = notifications.map(n => n.id);
    const newSet = new Set([...readIds, ...allIds]);
    setReadIds(newSet);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...newSet])); } catch { /* ignore */ }
  };

  const markRead = (id: string) => {
    const newSet = new Set([...readIds, id]);
    setReadIds(newSet);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...newSet])); } catch { /* ignore */ }
  };

  const handleClick = (notif: Notification) => {
    markRead(notif.id);
    setOpen(false);
    if (notif.href) router.push(notif.href);
  };

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={() => setOpen(v => !v)}
        aria-label={`Notifications${unread > 0 ? ` — ${unread} unread` : ''}`}
        aria-expanded={open}
        className="relative p-2 rounded-full bg-background/70 backdrop-blur-sm shadow-sm border border-border hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <Bell className="w-5 h-5 text-foreground" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">Notifications</h2>
              {unread > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-red-500 text-white">
                  {unread}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-primary hover:underline px-2 py-1 rounded"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 hover:bg-muted rounded-md transition-colors"
                aria-label="Close notifications"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto divide-y divide-border">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 px-6 text-center">
                <Bell className="w-8 h-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
                <p className="text-xs text-muted-foreground">Log your daily data to start receiving alerts.</p>
              </div>
            ) : (
              notifications.map(notif => {
                const style = LEVEL_STYLES[notif.level];
                return (
                  <button
                    key={notif.id}
                    onClick={() => handleClick(notif)}
                    className={`w-full text-left flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-muted/50 ${!notif.read ? 'bg-muted/20' : ''}`}
                  >
                    {/* Icon */}
                    <div className={`mt-0.5 flex-shrink-0 p-1.5 rounded-lg border ${style.bg}`}>
                      {style.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-medium leading-snug ${notif.read ? 'text-muted-foreground' : 'text-foreground'}`}>
                          {notif.title}
                        </p>
                        {!notif.read && (
                          <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-snug">{notif.body}</p>
                      <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" />
                        {timeAgo(notif.timestamp)}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-border bg-muted/30">
              <button
                onClick={() => { setOpen(false); router.push('/risk-prediction'); }}
                className="text-xs text-primary hover:underline"
              >
                View full risk assessment →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
