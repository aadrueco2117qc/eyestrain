'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Lock, Send, Copy, Check,
  Pencil, Trash2, AlertTriangle, X, ShieldAlert,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface DailyLog {
  id: string
  date: string
  screen_time: number
  sleep_hours: number
  brightness: number
  eye_strain: number
  headaches: number
  blurry_vision: number
  dry_eyes: number
  risk_level: string
}

interface UserProfile {
  first_name?: string
  last_name?: string
  email?: string
  age?: number | string
  gender?: string
  year_level?: string
  field_of_study?: string
}

interface UserDetailResponse {
  profile: UserProfile | null
  logs: DailyLog[]
}

interface AuditEventData {
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  changedFields?: string[]
  [key: string]: unknown
}

interface AuditEvent {
  id: string
  event_type: string
  description: string
  actor_email: string | null
  actor_id?: string | null
  created_at: string
  event_data?: AuditEventData | null
}

interface ProfileForm {
  first_name: string
  last_name: string
  age: string
  gender: string
  year_level: string
  field_of_study: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const RISK_COLORS: Record<string, string> = {
  Low: 'text-green-600',
  Moderate: 'text-yellow-600',
  High: 'text-orange-600',
  Critical: 'text-red-600',
}

const RISK_BADGES: Record<string, string> = {
  Low:      'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400',
  Moderate: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  High:     'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  Critical: 'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400',
}

const GENDER_OPTIONS    = ['', 'Male', 'Female', 'Other', 'Prefer not to say']
const YEAR_OPTIONS      = ['', '1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year or higher']
const FIELD_OPTIONS     = ['', 'IT / Computer Science', 'Engineering', 'Business', 'Health Sciences', 'Education', 'Arts and Humanities', 'Other']

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ── Helpers ───────────────────────────────────────────────────────────────────

function activeSymptoms(log: DailyLog): string {
  const s: string[] = []
  if (log.eye_strain    === 1) s.push('Eye Strain')
  if (log.headaches     === 1) s.push('Headaches')
  if (log.blurry_vision === 1) s.push('Blurry Vision')
  if (log.dry_eyes      === 1) s.push('Dry Eyes')
  return s.length > 0 ? s.join(', ') : 'None'
}

// Small re-usable select
function AdminSelect({
  id, label, value, options, onChange,
}: {
  id: string; label: string; value: string
  options: string[]; onChange: (v: string) => void
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-muted-foreground">{label}</label>
      <select
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
      >
        {options.map(o => <option key={o} value={o}>{o || '— select —'}</option>)}
      </select>
    </div>
  )
}

// ── Confirmation modal ────────────────────────────────────────────────────────

function ConfirmModal({
  title, message, confirmLabel, destructive,
  loading, onConfirm, onCancel,
}: {
  title: string; message: string; confirmLabel: string
  destructive?: boolean; loading: boolean
  onConfirm: () => void; onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-background border border-border rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg flex-shrink-0 ${destructive ? 'bg-red-100 dark:bg-red-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'}`}>
            <AlertTriangle className={`w-5 h-5 ${destructive ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}`} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${
              destructive
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-primary hover:bg-primary/90 text-primary-foreground'
            }`}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Working…
              </span>
            ) : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminUserDetailPage() {
  const { userId } = useParams<{ userId: string }>()
  const router = useRouter()

  const [data, setData] = useState<UserDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Edit profile
  const [isEditing, setIsEditing] = useState(false)
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    first_name: '', last_name: '', age: '',
    gender: '', year_level: '', field_of_study: '',
  })
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [saveError, setSaveError] = useState('')

  // Delete user modal
  const [showDeleteUser, setShowDeleteUser] = useState(false)
  const [deleteUserLoading, setDeleteUserLoading] = useState(false)
  const [deleteUserError, setDeleteUserError] = useState('')

  // Delete log modal
  const [logToDelete, setLogToDelete] = useState<DailyLog | null>(null)
  const [deleteLogLoading, setDeleteLogLoading] = useState(false)

  // Password reset modal
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMessage, setResetMessage] = useState('')
  const [tempPassword, setTempPassword] = useState('')
  const [copied, setCopied] = useState(false)

  // Audit
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([])
  const [auditLoading, setAuditLoading] = useState(true)
  const [auditError, setAuditError] = useState('')

  const isRegistered = UUID_RE.test(userId ?? '')

  // ── Load user data ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return
    fetch(`/api/admin/users/${userId}`)
      .then(async res => {
        if (res.status === 404) throw new Error('not_found')
        if (!res.ok) throw new Error('fetch_error')
        return res.json()
      })
      .then(json => {
        setData(json)
        const p = json.profile ?? {}
        setProfileForm({
          first_name:    p.first_name    ?? '',
          last_name:     p.last_name     ?? '',
          age:           p.age != null   ? String(p.age) : '',
          gender:        p.gender        ?? '',
          year_level:    p.year_level    ?? '',
          field_of_study: p.field_of_study ?? '',
        })
      })
      .catch(err => setError(err.message === 'not_found' ? 'No logs found for this user.' : 'Failed to load user data.'))
      .finally(() => setLoading(false))
  }, [userId])

  // ── Load audit history ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return
    setAuditLoading(true)
    const qp = isRegistered
      ? `userId=${encodeURIComponent(userId)}`
      : `userEmail=${encodeURIComponent(data?.profile?.email ?? decodeURIComponent(userId))}`
    fetch(`/api/admin/audit?${qp}&limit=50`)
      .then(async res => { const j = await res.json(); if (!res.ok) throw new Error(j?.error || 'Failed'); return j })
      .then(j => setAuditEvents(j.events || []))
      .catch(err => setAuditError(err instanceof Error ? err.message : 'Failed to load audit history'))
      .finally(() => setAuditLoading(false))
  }, [userId, isRegistered, data?.profile?.email])

  // ── Profile save ────────────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    if (!userId) return
    setSaveLoading(true); setSaveMessage(''); setSaveError('')
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: profileForm }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Failed to save profile')
      setSaveMessage('Profile updated successfully.')
      setIsEditing(false)
      setData(cur => cur ? { ...cur, profile: { ...cur.profile, ...profileForm } } : cur)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setSaveLoading(false)
    }
  }

  // ── Delete user ─────────────────────────────────────────────────────────────
  const handleDeleteUser = async () => {
    setDeleteUserLoading(true); setDeleteUserError('')
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Failed to delete user')
      router.push('/admin/users')
    } catch (err) {
      setDeleteUserError(err instanceof Error ? err.message : 'Failed to delete user')
      setDeleteUserLoading(false)
      setShowDeleteUser(false)
    }
  }

  // ── Delete log entry ────────────────────────────────────────────────────────
  const handleDeleteLog = async () => {
    if (!logToDelete) return
    setDeleteLogLoading(true)
    try {
      const res = await fetch(`/api/admin/logs/${logToDelete.id}`, { method: 'DELETE' })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Failed to delete log')
      setData(cur => cur ? { ...cur, logs: cur.logs.filter(l => l.id !== logToDelete.id) } : cur)
    } catch (err) {
      console.error(err)
    } finally {
      setDeleteLogLoading(false)
      setLogToDelete(null)
    }
  }

  // ── Password reset ──────────────────────────────────────────────────────────
  const handleSendResetEmail = async () => {
    const email = data?.profile?.email ?? decodeURIComponent(userId ?? '')
    setResetLoading(true); setResetMessage('')
    try {
      const res = await fetch('/api/admin/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: email, action: 'send-reset-email' }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed')
      setResetMessage('Password reset email sent successfully!')
      setTimeout(() => setShowPasswordModal(false), 2000)
    } catch (err) {
      setResetMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally { setResetLoading(false) }
  }

  const handleGenerateTempPassword = async () => {
    setResetLoading(true); setResetMessage(''); setTempPassword('')
    try {
      const res = await fetch('/api/admin/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'generate-temp-password' }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed')
      setTempPassword(result.tempPassword)
    } catch (err) {
      setResetMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally { setResetLoading(false) }
  }

  const displayName = data?.profile
    ? [data.profile.first_name, data.profile.last_name].filter(Boolean).join(' ')
    : null

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} aria-label="Go back"
            className="p-2 hover:bg-muted rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">User Detail</h1>
            <p className="text-muted-foreground text-sm mt-0.5">{decodeURIComponent(userId ?? '')}</p>
          </div>
        </div>

        {/* Delete user — only for registered users */}
        {isRegistered && !loading && data && (
          <button
            onClick={() => setShowDeleteUser(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete User
          </button>
        )}
      </div>

      {loading && <p aria-busy="true" className="text-muted-foreground">Loading…</p>}
      {error   && <p role="alert" className="text-destructive">{error}</p>}
      {deleteUserError && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
          {deleteUserError}
        </div>
      )}

      {data && (
        <>
          {/* ── Profile ── */}
          <section aria-labelledby="profile-heading" className="border border-border rounded-xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 id="profile-heading" className="text-lg font-semibold text-foreground">Profile</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {isRegistered ? 'Edit and update registered user details.' : 'Survey respondent — read-only.'}
                </p>
              </div>
              {isRegistered && (
                <button
                  onClick={() => { setIsEditing(v => !v); setSaveMessage(''); setSaveError('') }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-background text-sm font-medium hover:bg-muted transition-colors"
                >
                  {isEditing ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                  {isEditing ? 'Cancel' : 'Edit Profile'}
                </button>
              )}
            </div>

            {/* Read-only display */}
            {!isEditing && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                {[
                  { label: 'Email',          value: data.profile?.email ?? decodeURIComponent(userId ?? '') },
                  { label: 'Name',           value: displayName || '—' },
                  { label: 'Age',            value: data.profile?.age ?? '—' },
                  { label: 'Gender',         value: data.profile?.gender ?? '—' },
                  { label: 'Year Level',     value: data.profile?.year_level ?? '—' },
                  { label: 'Field of Study', value: data.profile?.field_of_study ?? '—' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{label}</dt>
                    <dd className="mt-1 font-medium text-foreground">{String(value)}</dd>
                  </div>
                ))}
              </div>
            )}

            {/* Edit form */}
            {isEditing && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="fn" className="text-sm font-medium text-muted-foreground">First name</label>
                    <input id="fn" value={profileForm.first_name}
                      onChange={e => setProfileForm(p => ({ ...p, first_name: e.target.value }))}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent" />
                  </div>
                  <div>
                    <label htmlFor="ln" className="text-sm font-medium text-muted-foreground">Last name</label>
                    <input id="ln" value={profileForm.last_name}
                      onChange={e => setProfileForm(p => ({ ...p, last_name: e.target.value }))}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent" />
                  </div>
                  <div>
                    <label htmlFor="age" className="text-sm font-medium text-muted-foreground">Age</label>
                    <input id="age" type="number" value={profileForm.age}
                      onChange={e => setProfileForm(p => ({ ...p, age: e.target.value }))}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent" />
                  </div>
                  <AdminSelect id="gender" label="Gender"
                    value={profileForm.gender} options={GENDER_OPTIONS}
                    onChange={v => setProfileForm(p => ({ ...p, gender: v }))} />
                  <AdminSelect id="year" label="Year Level"
                    value={profileForm.year_level} options={YEAR_OPTIONS}
                    onChange={v => setProfileForm(p => ({ ...p, year_level: v }))} />
                  <AdminSelect id="field" label="Field of Study"
                    value={profileForm.field_of_study} options={FIELD_OPTIONS}
                    onChange={v => setProfileForm(p => ({ ...p, field_of_study: v }))} />
                </div>

                {saveError   && <p role="alert" className="text-sm text-destructive">{saveError}</p>}
                {saveMessage && <p className="text-sm text-green-600 dark:text-green-400">{saveMessage}</p>}

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
                  <button onClick={() => { setIsEditing(false); setSaveMessage(''); setSaveError('') }}
                    className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleSaveProfile} disabled={saveLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors">
                    {saveLoading
                      ? <><span className="w-3.5 h-3.5 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />Saving…</>
                      : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}

            {/* Reset password button */}
            {isRegistered && !isEditing && (
              <div className="pt-2 border-t border-border">
                <button onClick={() => setShowPasswordModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors">
                  <Lock className="w-4 h-4" />
                  Reset Password
                </button>
              </div>
            )}
          </section>

          {/* ── Log History ── */}
          <section aria-labelledby="logs-heading">
            <h2 id="logs-heading" className="text-lg font-semibold text-foreground mb-4">
              Log History ({data.logs.length})
            </h2>

            {data.logs.length === 0 ? (
              <p className="text-muted-foreground text-sm">No logs found for this user.</p>
            ) : (
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <caption className="sr-only">Daily log history</caption>
                    <thead className="bg-muted">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left font-semibold text-foreground">Date</th>
                        <th scope="col" className="px-4 py-3 text-left font-semibold text-foreground">Screen</th>
                        <th scope="col" className="px-4 py-3 text-left font-semibold text-foreground">Sleep</th>
                        <th scope="col" className="px-4 py-3 text-left font-semibold text-foreground">Brightness</th>
                        <th scope="col" className="px-4 py-3 text-left font-semibold text-foreground">Symptoms</th>
                        <th scope="col" className="px-4 py-3 text-left font-semibold text-foreground">Risk</th>
                        <th scope="col" className="px-4 py-3 text-center font-semibold text-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.logs.map(log => (
                        <tr key={log.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 text-foreground font-medium">{log.date}</td>
                          <td className="px-4 py-3 text-muted-foreground">{log.screen_time}h</td>
                          <td className="px-4 py-3 text-muted-foreground">{log.sleep_hours}h</td>
                          <td className="px-4 py-3 text-muted-foreground">{log.brightness}%</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs max-w-[140px] truncate">{activeSymptoms(log)}</td>
                          <td className="px-4 py-3">
                            {log.risk_level ? (
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${RISK_BADGES[log.risk_level] ?? 'bg-muted text-foreground'}`}>
                                {log.risk_level}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => setLogToDelete(log)}
                              aria-label={`Delete log for ${log.date}`}
                              className="p-1.5 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          {/* ── Audit History ── */}
          <section aria-labelledby="audit-heading" className="border border-border rounded-xl p-6">
            <h2 id="audit-heading" className="text-lg font-semibold text-foreground mb-1">Audit History</h2>
            <p className="text-sm text-muted-foreground mb-4">Recent admin actions involving this user.</p>

            {auditLoading ? (
              <p className="text-sm text-muted-foreground">Loading audit history…</p>
            ) : auditError ? (
              <p role="alert" className="text-sm text-destructive">{auditError}</p>
            ) : auditEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No admin audit events found for this user.</p>
            ) : (
              <div className="space-y-3">
                {auditEvents.map(event => {
                  const fieldLabels: Record<string, string> = {
                    first_name: 'First Name', last_name: 'Last Name',
                    age: 'Age', gender: 'Gender',
                    year_level: 'Year Level', field_of_study: 'Field of Study',
                  }
                  const hasStructured =
                    event.event_data &&
                    Array.isArray(event.event_data.changedFields) &&
                    event.event_data.changedFields.length > 0 &&
                    event.event_data.before !== undefined &&
                    event.event_data.after !== undefined

                  return (
                    <div key={event.id} className="rounded-lg border border-border bg-background p-4 space-y-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="text-sm font-medium text-foreground">{event.event_type}</p>
                        <p className="text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString()}</p>
                      </div>
                      {hasStructured ? (
                        <div className="mt-2 space-y-1.5">
                          {event.event_data!.changedFields!.map(field => {
                            const label = fieldLabels[field] ?? field.replace(/_/g, ' ')
                            const before = event.event_data!.before?.[field]
                            const after  = event.event_data!.after?.[field]
                            return (
                              <div key={field} className="rounded border border-border bg-muted/40 px-3 py-1.5 text-sm">
                                <span className="font-medium text-foreground">{label}: </span>
                                <span className="text-muted-foreground line-through">{before != null && before !== '' ? String(before) : '—'}</span>
                                {' → '}
                                <span className="font-medium text-foreground">{after != null && after !== '' ? String(after) : '—'}</span>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                      )}
                      {(event.actor_email || event.actor_id) && (
                        <p className="text-xs text-muted-foreground">By {event.actor_email ?? event.actor_id}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </>
      )}

      {/* ── Delete User confirmation modal ── */}
      {showDeleteUser && (
        <ConfirmModal
          title="Delete User Account"
          message={`This will permanently delete ${displayName ?? data?.profile?.email ?? 'this user'}'s account, all their logs, predictions, and profile data. This cannot be undone.`}
          confirmLabel="Delete User"
          destructive
          loading={deleteUserLoading}
          onConfirm={handleDeleteUser}
          onCancel={() => setShowDeleteUser(false)}
        />
      )}

      {/* ── Delete Log confirmation modal ── */}
      {logToDelete && (
        <ConfirmModal
          title="Delete Log Entry"
          message={`Delete the log for ${logToDelete.date}? The associated risk prediction will also be removed.`}
          confirmLabel="Delete Log"
          destructive
          loading={deleteLogLoading}
          onConfirm={handleDeleteLog}
          onCancel={() => setLogToDelete(null)}
        />
      )}

      {/* ── Password Reset modal ── */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-background border border-border rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Reset User Password</h2>
              <button onClick={() => { setShowPasswordModal(false); setTempPassword(''); setResetMessage('') }}
                className="p-1.5 hover:bg-muted rounded-lg transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {tempPassword ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 space-y-3">
                  <p className="text-sm text-foreground">Share this temporary password with the user:</p>
                  <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-2">
                    <code className="flex-1 font-mono text-sm font-semibold text-foreground">{tempPassword}</code>
                    <button onClick={() => { navigator.clipboard.writeText(tempPassword); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                      className="p-1.5 hover:bg-muted rounded transition-colors" title="Copy">
                      {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">⚠ The user should change this immediately upon login.</p>
                </div>
                <button onClick={() => { setShowPasswordModal(false); setTempPassword(''); setResetMessage('') }}
                  className="w-full px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 text-sm font-medium transition-colors">
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {resetMessage && (
                  <p className={`text-sm p-3 rounded-lg ${resetMessage.includes('Error') ? 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400' : 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400'}`}>
                    {resetMessage}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">Choose a method to help the user reset their password:</p>

                <button onClick={handleSendResetEmail} disabled={resetLoading}
                  className="w-full flex items-center gap-3 px-4 py-3 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 text-left">
                  <Send className="w-4 h-4 flex-shrink-0 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Send Reset Email</p>
                    <p className="text-xs text-muted-foreground">User receives a link to reset their password</p>
                  </div>
                </button>

                <button onClick={handleGenerateTempPassword} disabled={resetLoading || !isRegistered}
                  className="w-full flex items-center gap-3 px-4 py-3 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 text-left">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0 text-orange-600" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Generate Temporary Password</p>
                    <p className="text-xs text-muted-foreground">You'll share a one-time password directly{!isRegistered ? ' (registered users only)' : ''}</p>
                  </div>
                </button>

                <button onClick={() => setShowPasswordModal(false)}
                  className="w-full px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 text-sm font-medium transition-colors">
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
