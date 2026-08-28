/**
 * Pure CSV serialization utility.
 * Produces RFC 4180-compliant CSV output — no external dependencies.
 */

function escapeField(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value)
  if (str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

export function serializeToCSV(
  rows: Record<string, unknown>[],
  columns: string[],
): string {
  const lines: string[] = []
  lines.push(columns.map(escapeField).join(','))
  for (const row of rows) {
    lines.push(columns.map((col) => escapeField(row[col])).join(','))
  }
  return lines.join('\r\n')
}

/** The columns to SELECT from daily_logs for the CSV export. */
export const DAILY_LOG_COLUMNS = [
  'id',
  'user_id',
  'date',
  'email',
  'age',
  'gender',
  'year_level',
  'field_of_study',
  'screen_time',
  'breaks_taken',
  'eye_strain',
  'headaches',
  'blurry_vision',
  'dry_eyes',
  'brightness',
  'sleep_hours',
  'risk_level',
  'created_at',
] as const

const boolToYesNo = (v: unknown) => (v === 1 || v === true ? 'Yes' : 'No')

function formatDate(d: unknown): string {
  if (!d || typeof d !== 'string') return ''
  const [y, m, day] = d.split('T')[0].split('-')
  return `${m}/${day}/${y}`
}

function formatTimestamp(ts: unknown): string {
  if (!ts || typeof ts !== 'string') return ''
  return formatDate(ts.split('T')[0])
}

export function transformLogsForCSV(
  logs: Record<string, unknown>[],
): Record<string, unknown>[] {
  return logs.map((log) => ({
    'Date':                 formatDate(log.date),
    'Email':                log.email ?? '',
    'Age':                  log.age ?? '',
    'Gender':               log.gender ?? '',
    'Year Level':           log.year_level ?? '',
    'Field of Study':       log.field_of_study ?? '',
    'Screen Time (hours)':  log.screen_time ?? '',
    'Breaks Taken':         log.breaks_taken ?? 0,
    'Eye Strain':           boolToYesNo(log.eye_strain),
    'Headaches':            boolToYesNo(log.headaches),
    'Blurry Vision':        boolToYesNo(log.blurry_vision),
    'Dry Eyes':             boolToYesNo(log.dry_eyes),
    'Brightness (%)':       log.brightness ?? '',
    'Sleep Hours':          log.sleep_hours ?? '',
    'Risk Level':           log.risk_level ?? '',
    'Submitted At':         formatTimestamp(log.created_at),
  }))
}
