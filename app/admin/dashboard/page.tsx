'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  RefreshCw, Users, Monitor, Brain, TrendingUp,
  AlertTriangle, CheckCircle, Download, ArrowRight,
  Activity, Zap,
} from 'lucide-react'

interface AggregateStats {
  totalRespondents: number
  riskDistribution: { Low: number; Moderate: number; High: number; Critical: number }
  averageScreenTime: number
  topSymptoms: Array<{ symptom: string; count: number }>
}

interface MLStatus {
  modelLoaded: boolean
  trainingRows?: number
  newLogsSinceRetrain?: number
  retrainThreshold?: number
  error?: string
}

const RISK_META = {
  Low:      { color: 'text-green-600  dark:text-green-400',  bar: 'bg-green-500',  badge: 'bg-green-100  dark:bg-green-900/40  text-green-700  dark:text-green-300' },
  Moderate: { color: 'text-yellow-600 dark:text-yellow-400', bar: 'bg-yellow-500', badge: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300' },
  High:     { color: 'text-orange-600 dark:text-orange-400', bar: 'bg-orange-500', badge: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300' },
  Critical: { color: 'text-red-600    dark:text-red-400',    bar: 'bg-red-500',    badge: 'bg-red-100    dark:bg-red-900/40    text-red-700    dark:text-red-300'    },
} as const

function StatCard({ icon, label, value, sub, accent }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; accent?: string
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 flex items-start gap-4 hover:shadow-md transition-shadow">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${accent ?? 'bg-primary/10 text-primary'}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-3xl font-bold text-foreground mt-0.5">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  )
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<AggregateStats | null>(null)
  const [mlStatus, setMlStatus] = useState<MLStatus | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [mlLoading, setMlLoading] = useState(true)
  const [retraining, setRetraining] = useState(false)
  const [retrainMessage, setRetrainMessage] = useState('')
  const [retrainError, setRetrainError] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [exportError, setExportError] = useState('')

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => r.json()).then(setStats).catch(() => setStats(null))
      .finally(() => setStatsLoading(false))

    fetch('/api/admin/ml-status')
      .then((r) => r.json()).then(setMlStatus)
      .catch(() => setMlStatus({ modelLoaded: false, error: 'ML backend unavailable' }))
      .finally(() => setMlLoading(false))
  }, [])

  const handleRetrain = async () => {
    setRetraining(true); setRetrainMessage(''); setRetrainError('')
    try {
      const res = await fetch('/api/admin/ml-retrain', { method: 'POST' })
      if (res.ok) setRetrainMessage('Retrain started. Check server logs for progress.')
      else { const b = await res.json(); setRetrainError(b.error ?? 'Retrain failed.') }
    } catch { setRetrainError('ML backend unavailable') }
    finally { setRetraining(false) }
  }

  const handleExport = async () => {
    setDownloading(true); setExportError('')
    try {
      const res = await fetch('/api/admin/export-csv')
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error ?? 'Export failed') }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `eyeguard-export-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
    } catch (err) { setExportError(err instanceof Error ? err.message : 'Export failed') }
    finally { setDownloading(false) }
  }

  const totalRisk = stats
    ? Object.values(stats.riskDistribution).reduce((a, b) => a + b, 0) || 1
    : 1

  return (
    <div className="space-y-8 max-w-6xl">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">System-wide statistics and model management</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <Download className={`w-4 h-4 ${downloading ? 'animate-bounce' : ''}`} />
            {downloading ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </div>
      {exportError && <p className="text-sm text-destructive">{exportError}</p>}

      {/* KPI cards */}
      {statsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-6 h-28 animate-pulse" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<Users className="w-6 h-6" />} label="Total Respondents" value={stats.totalRespondents} sub="All-time submissions" accent="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400" />
          <StatCard icon={<Monitor className="w-6 h-6" />} label="Avg Screen Time" value={`${stats.averageScreenTime}h`} sub="Per daily log" accent="bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400" />
          <StatCard
            icon={<AlertTriangle className="w-6 h-6" />}
            label="High / Critical"
            value={`${stats.riskDistribution.High + stats.riskDistribution.Critical}%`}
            sub="Of all respondents"
            accent="bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400"
          />
          <StatCard
            icon={<CheckCircle className="w-6 h-6" />}
            label="Low Risk"
            value={`${stats.riskDistribution.Low}%`}
            sub="Healthy range"
            accent="bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400"
          />
        </div>
      ) : (
        <p className="text-destructive text-sm">Failed to load statistics.</p>
      )}

      {/* Risk distribution + symptoms */}
      {!statsLoading && stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Risk distribution */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-5 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Risk Distribution
            </h2>
            <div className="space-y-4">
              {(['Low', 'Moderate', 'High', 'Critical'] as const).map((level) => {
                const pct = stats.riskDistribution[level]
                const meta = RISK_META[level]
                return (
                  <div key={level}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-foreground">{level}</span>
                      <span className={`text-sm font-bold tabular-nums ${meta.color}`}>{pct}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-700 ${meta.bar}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-5 pt-4 border-t border-border flex flex-wrap gap-2">
              {(['Low', 'Moderate', 'High', 'Critical'] as const).map((level) => (
                <span key={level} className={`text-xs font-semibold px-2.5 py-1 rounded-full ${RISK_META[level].badge}`}>
                  {level}: {stats.riskDistribution[level]}%
                </span>
              ))}
            </div>
          </div>

          {/* Top symptoms */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-5 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Top Reported Symptoms
            </h2>
            {stats.topSymptoms.length === 0 ? (
              <p className="text-sm text-muted-foreground">No symptom data yet.</p>
            ) : (
              <div className="space-y-4">
                {stats.topSymptoms.map((s, idx) => {
                  const maxCount = stats.topSymptoms[0]?.count || 1
                  const barPct = (s.count / maxCount) * 100
                  return (
                    <div key={s.symptom}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-foreground capitalize">
                          {s.symptom.replace(/_/g, ' ')}
                        </span>
                        <span className="text-sm font-bold text-foreground tabular-nums">{s.count}</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            idx === 0 ? 'bg-red-500' : idx === 1 ? 'bg-orange-500' : idx === 2 ? 'bg-yellow-500' : 'bg-primary'
                          }`}
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ML Model status */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-5 flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          ML Model Status
        </h2>

        {mlLoading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-4 bg-muted rounded w-1/4" />
          </div>
        ) : mlStatus?.error ? (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{mlStatus.error}</p>
          </div>
        ) : mlStatus ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                {
                  label: 'Model Status',
                  value: mlStatus.modelLoaded ? 'Active' : 'Inactive',
                  valueClass: mlStatus.modelLoaded ? 'text-green-600 dark:text-green-400' : 'text-red-500',
                  icon: mlStatus.modelLoaded
                    ? <CheckCircle className="w-4 h-4" />
                    : <AlertTriangle className="w-4 h-4" />,
                },
                { label: 'Training Rows', value: mlStatus.trainingRows ?? '—', valueClass: 'text-foreground', icon: null },
                { label: 'New Logs', value: mlStatus.newLogsSinceRetrain ?? '—', valueClass: 'text-foreground', icon: null },
                { label: 'Retrain At', value: mlStatus.retrainThreshold ? `${mlStatus.retrainThreshold} logs` : '—', valueClass: 'text-foreground', icon: null },
              ].map(({ label, value, valueClass, icon }) => (
                <div key={label} className="bg-muted/50 rounded-xl p-4">
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  <div className={`flex items-center gap-1.5 text-lg font-bold ${valueClass}`}>
                    {icon}{value}
                  </div>
                </div>
              ))}
            </div>

            {typeof mlStatus.newLogsSinceRetrain === 'number' && typeof mlStatus.retrainThreshold === 'number' && (
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                  <span>Progress to next retrain</span>
                  <span>{mlStatus.newLogsSinceRetrain} / {mlStatus.retrainThreshold}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${Math.min(100, (mlStatus.newLogsSinceRetrain / mlStatus.retrainThreshold) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-4 flex-wrap">
              <button
                onClick={handleRetrain}
                disabled={retraining}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${retraining ? 'animate-spin' : ''}`} />
                {retraining ? 'Retraining…' : 'Retrain Model'}
              </button>
              {retrainMessage && <p className="text-sm text-green-600 dark:text-green-400">{retrainMessage}</p>}
              {retrainError && <p className="text-sm text-destructive">{retrainError}</p>}
            </div>
          </div>
        ) : null}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Manage Respondents', desc: 'View, filter, and search all users', href: '/admin/users', icon: <Users className="w-5 h-5" /> },
            { label: 'Analytics', desc: 'System-wide trend charts', href: '/admin/analytics', icon: <TrendingUp className="w-5 h-5" /> },
            { label: 'Activity Logs', desc: 'System event history', href: '/admin/logs', icon: <Activity className="w-5 h-5" /> },
            { label: 'Settings', desc: 'Admin configuration', href: '/admin/settings', icon: <Brain className="w-5 h-5" /> },
          ].map(({ label, desc, href, icon }) => (
            <button
              key={href}
              onClick={() => router.push(href)}
              className="flex items-start gap-3 p-4 bg-card border border-border rounded-2xl text-left hover:border-primary/50 hover:shadow-sm transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary mt-1 flex-shrink-0 transition-colors" />
            </button>
          ))}
        </div>
      </div>

    </div>
  )
}
