'use client'

import { useEffect, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

interface LogEntry {
  id: string
  date: string
  email: string | null
  // Screen time
  academic_screen_time: string | null
  non_academic_screen_time: string | null
  screen_time: number | null
  // Environment
  screen_brightness: string | null
  sleep_hours: number | null
  primary_device: string | null
  follows_20_20_20: string | null
  break_frequency: string | null
  dark_room_use: string | null
  // Symptoms (frequency strings)
  sym_dry_eyes: string | null
  sym_blurred_vision: string | null
  sym_headaches: string | null
  sym_eye_irritation: string | null
  sym_light_sensitivity: string | null
  sym_mental_fatigue: string | null
  sym_neck_shoulder_pain: string | null
  sym_difficulty_focusing: string | null
  sym_eye_itchiness: string | null
  // Self-assessment
  overall_eye_strain: string | null
  digital_fatigue_frequency: string | null
  // Risk
  risk_level: string | null
}

interface LogsResponse {
  logs: LogEntry[]
  page: number
  totalPages: number
  totalCount: number
}

type DateRange = 'today' | '7days' | '30days' | 'all'

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  today: 'Today', '7days': 'Last 7 days', '30days': 'Last 30 days', all: 'All time',
}

const riskBadge: Record<string, string> = {
  Low:      'bg-green-500/10  text-green-700  dark:text-green-400',
  Moderate: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  High:     'bg-orange-500/10 text-orange-700 dark:text-orange-400',
  Critical: 'bg-red-500/10    text-red-700    dark:text-red-400',
}

const symColor: Record<string, string> = {
  Never:     'text-muted-foreground',
  Rarely:    'text-yellow-600 dark:text-yellow-400',
  Sometimes: 'text-orange-500',
  Often:     'text-orange-600',
  Always:    'text-red-600 dark:text-red-400',
}

function FreqBadge({ value }: { value: string | null }) {
  if (!value || value === 'Never') return <span className="text-xs text-muted-foreground">—</span>
  return <span className={`text-xs font-medium ${symColor[value] ?? 'text-foreground'}`}>{value}</span>
}

export default function AdminLogsPage() {
  const [data,      setData]      = useState<LogsResponse | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [page,      setPage]      = useState(1)
  const [dateRange, setDateRange] = useState<DateRange>('all')

  const fetchLogs = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '25', dateRange })
      const res = await fetch(`/api/admin/logs?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      setData(await res.json())
    } catch { setError('Failed to load activity logs.') }
    finally { setLoading(false) }
  }, [page, dateRange])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const handleDateRangeChange = (range: DateRange) => { setDateRange(range); setPage(1) }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Activity Logs</h1>
        <p className="text-muted-foreground mt-1">
          {data ? `${data.totalCount.toLocaleString()} individual daily log ${data.totalCount === 1 ? 'entry' : 'entries'}` : 'Individual daily log submissions'}
        </p>
      </div>

      {/* Date range filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Calendar className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
        {(Object.keys(DATE_RANGE_LABELS) as DateRange[]).map((range) => (
          <button key={range} onClick={() => handleDateRangeChange(range)} aria-pressed={dateRange === range}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${dateRange === range ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}>
            {DATE_RANGE_LABELS[range]}
          </button>
        ))}
      </div>

      {error && <p role="alert" className="text-destructive text-sm">{error}</p>}

      {/* Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <p className="text-xs text-muted-foreground px-4 pt-3 pb-1">Scroll right to see all columns →</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <caption className="sr-only">Daily log entries</caption>
            <thead className="bg-muted">
              <tr>
                <th scope="col" className="px-3 py-2.5 text-left font-semibold text-foreground whitespace-nowrap">Date</th>
                <th scope="col" className="px-3 py-2.5 text-left font-semibold text-foreground whitespace-nowrap">Email</th>
                <th scope="col" className="px-3 py-2.5 text-left font-semibold text-foreground whitespace-nowrap">Screen Time</th>
                <th scope="col" className="px-3 py-2.5 text-left font-semibold text-foreground whitespace-nowrap">Sleep</th>
                <th scope="col" className="px-3 py-2.5 text-left font-semibold text-foreground whitespace-nowrap">Brightness</th>
                <th scope="col" className="px-3 py-2.5 text-left font-semibold text-foreground whitespace-nowrap">20-20-20</th>
                <th scope="col" className="px-3 py-2.5 text-left font-semibold text-foreground whitespace-nowrap">Breaks</th>
                <th scope="col" className="px-3 py-2.5 text-left font-semibold text-foreground whitespace-nowrap">Blurred Vision</th>
                <th scope="col" className="px-3 py-2.5 text-left font-semibold text-foreground whitespace-nowrap">Dry Eyes</th>
                <th scope="col" className="px-3 py-2.5 text-left font-semibold text-foreground whitespace-nowrap">Headaches</th>
                <th scope="col" className="px-3 py-2.5 text-left font-semibold text-foreground whitespace-nowrap">Eye Irritation</th>
                <th scope="col" className="px-3 py-2.5 text-left font-semibold text-foreground whitespace-nowrap">Mental Fatigue</th>
                <th scope="col" className="px-3 py-2.5 text-left font-semibold text-foreground whitespace-nowrap">Overall Strain</th>
                <th scope="col" className="px-3 py-2.5 text-left font-semibold text-foreground whitespace-nowrap">Risk</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={14} className="px-3 py-8 text-center text-muted-foreground" aria-busy="true">Loading…</td></tr>
              ) : !data || data.logs.length === 0 ? (
                <tr><td colSpan={14} className="px-3 py-8 text-center text-muted-foreground">No log entries found.</td></tr>
              ) : (
                data.logs.map((log) => {
                  const screenDisplay = log.screen_time != null
                    ? `${log.screen_time}h`
                    : log.academic_screen_time
                      ? log.academic_screen_time.replace(' hours', 'h').replace('Less than ', '<').replace('More than ', '>').replace('–', '–')
                      : '—'
                  return (
                    <tr key={log.id} className="border-t border-border hover:bg-muted/50 transition-colors">
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{log.date}</td>
                      <td className="px-3 py-2 text-foreground font-medium max-w-[160px] truncate">{log.email || '—'}</td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{screenDisplay}</td>
                      <td className="px-3 py-2 text-muted-foreground">{log.sleep_hours != null ? `${log.sleep_hours}h` : '—'}</td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{log.screen_brightness ?? '—'}</td>
                      <td className="px-3 py-2"><FreqBadge value={log.follows_20_20_20} /></td>
                      <td className="px-3 py-2 text-muted-foreground">{log.break_frequency ? log.break_frequency.replace('Every ', '').replace(' minutes', 'min').replace(' hours', 'h') : '—'}</td>
                      <td className="px-3 py-2"><FreqBadge value={log.sym_blurred_vision} /></td>
                      <td className="px-3 py-2"><FreqBadge value={log.sym_dry_eyes} /></td>
                      <td className="px-3 py-2"><FreqBadge value={log.sym_headaches} /></td>
                      <td className="px-3 py-2"><FreqBadge value={log.sym_eye_irritation} /></td>
                      <td className="px-3 py-2"><FreqBadge value={log.sym_mental_fatigue} /></td>
                      <td className="px-3 py-2 text-muted-foreground">{log.overall_eye_strain ?? '—'}</td>
                      <td className="px-3 py-2">
                        {log.risk_level
                          ? <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${riskBadge[log.risk_level] ?? 'bg-muted text-muted-foreground'}`}>{log.risk_level}</span>
                          : <span className="text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {data.page} of {Math.max(1, data.totalPages)} ({data.totalCount.toLocaleString()} total)</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} aria-label="Previous page" className="p-2 border border-border rounded-lg disabled:opacity-40 hover:bg-muted transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages} aria-label="Next page" className="p-2 border border-border rounded-lg disabled:opacity-40 hover:bg-muted transition-colors"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </div>
  )
}
