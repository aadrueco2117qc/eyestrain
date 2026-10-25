/**
 * CSV / XLSX export utility — updated for new questionnaire schema.
 * Exports daily_logs with all new columns (CVSQ + EyeGuard Part 2).
 */

export const DAILY_LOG_COLUMNS = [
  'id', 'user_id', 'date', 'email',
  // Profile
  'age', 'gender', 'year_level', 'field_of_study',
  // Screen time (new split + computed total)
  'academic_screen_time', 'non_academic_screen_time', 'screen_time',
  'primary_device', 'continuous_screen_use', 'online_classes_per_day',
  // Habits & environment (new)
  'follows_20_20_20', 'blue_light_filter', 'screen_brightness',
  'dark_room_use', 'screen_distance', 'wears_glasses',
  'blue_light_glasses', 'break_frequency', 'sleep_hours',
  // Symptom grid (new — frequency strings)
  'sym_dry_eyes', 'sym_eye_itchiness', 'sym_blurred_vision', 'sym_headaches',
  'sym_eye_irritation', 'sym_light_sensitivity', 'sym_difficulty_focusing',
  'sym_neck_shoulder_pain', 'sym_mental_fatigue', 'sym_difficulty_concentrating',
  // Self-assessment (new)
  'overall_eye_strain', 'digital_fatigue_frequency', 'primary_symptom_history',
  // CVSQ raw (new)
  'cvsq_frequency', 'cvsq_screen_associated',
  // Risk result
  'risk_level', 'created_at',
] as const

function formatDate(d: unknown): string {
  if (!d || typeof d !== 'string') return ''
  const [y, m, day] = d.split('T')[0].split('-')
  return `${m}/${day}/${y}`
}

function formatTimestamp(ts: unknown): string {
  if (!ts || typeof ts !== 'string') return ''
  return formatDate(ts.split('T')[0])
}

function str(v: unknown): string {
  if (v == null) return ''
  return String(v)
}

export function transformLogsForCSV(
  logs: Record<string, unknown>[],
): Record<string, unknown>[] {
  return logs.map((log) => ({
    'Date':                    formatDate(log.date),
    'Email':                   str(log.email),
    'Age':                     str(log.age),
    'Gender':                  str(log.gender),
    'Year Level':              str(log.year_level),
    'Field of Study':          str(log.field_of_study),
    // Screen time
    'Academic Screen Time':    str(log.academic_screen_time),
    'Non-Academic Screen Time': str(log.non_academic_screen_time),
    'Total Screen Time (hrs)': log.screen_time ?? '',
    'Primary Device':          str(log.primary_device),
    'Continuous Use Without Break': str(log.continuous_screen_use),
    'Online Classes Per Day':  str(log.online_classes_per_day),
    // Habits & environment
    'Follows 20-20-20 Rule':   str(log.follows_20_20_20),
    'Blue Light Filter':       str(log.blue_light_filter),
    'Screen Brightness':       str(log.screen_brightness),
    'Dark Room Use':           str(log.dark_room_use),
    'Screen Distance':         str(log.screen_distance),
    'Wears Glasses':           str(log.wears_glasses),
    'Blue Light Glasses':      str(log.blue_light_glasses),
    'Break Frequency':         str(log.break_frequency),
    'Sleep Hours':             log.sleep_hours ?? '',
    // Symptom grid
    'Sym: Dry Eyes':           str(log.sym_dry_eyes),
    'Sym: Eye Itchiness':      str(log.sym_eye_itchiness),
    'Sym: Blurred Vision':     str(log.sym_blurred_vision),
    'Sym: Headaches':          str(log.sym_headaches),
    'Sym: Eye Irritation':     str(log.sym_eye_irritation),
    'Sym: Light Sensitivity':  str(log.sym_light_sensitivity),
    'Sym: Difficulty Focusing': str(log.sym_difficulty_focusing),
    'Sym: Neck/Shoulder Pain': str(log.sym_neck_shoulder_pain),
    'Sym: Mental Fatigue':     str(log.sym_mental_fatigue),
    'Sym: Difficulty Concentrating': str(log.sym_difficulty_concentrating),
    // Self-assessment
    'Overall Eye Strain':      str(log.overall_eye_strain),
    'Digital Fatigue Frequency': str(log.digital_fatigue_frequency),
    'Primary Symptom History': str(log.primary_symptom_history),
    // CVSQ
    'CVS-Q Frequency':         str(log.cvsq_frequency),
    'CVS-Q Screen Associated': str(log.cvsq_screen_associated),
    // Risk
    'Risk Level':              str(log.risk_level),
    'Submitted At':            formatTimestamp(log.created_at),
  }))
}
