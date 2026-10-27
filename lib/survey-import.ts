/**
 * Survey Excel → Supabase import (shared logic).
 *
 * Used by:
 *   - app/api/admin/import-survey/route.ts   (admin upload route)
 *   - scripts/import-survey.ts                (one-time CLI import)
 *
 * Parses an uploaded EyeGuard Google Form Excel export (sheet "Form Responses 1")
 * and maps each row — by column position — into the `survey_responses` table
 * shape, computing the CVSQ score (Iqbal et al., 2024) along the way.
 *
 * The mapping is by INDEX (not by header text) because Google Forms emits
 * messy, duplicate-looking headers ("Question 1 ", "Question 1", "Question 3 2",
 * and very long instruction-text headers for the Q19 symptom grid).
 */

import readXlsxFile from 'read-excel-file/node'

// ─────────────────────────────────────────────────────────────────────────────
// Column positions in the Excel sheet (0-based, confirmed by inspection of the
// actual "EyeGuard Survey Questionnaire (Responses) (2).xlsx" file).
// ─────────────────────────────────────────────────────────────────────────────
export const COL = {
  TIMESTAMP: 0,                       // response timestamp
  EMAIL: 1,                            // respondent email
  // Part 1 — CVS-Smart
  CVSQ_Q1_VISUAL: 2,                  // comma-separated visual complaints
  CVSQ_Q2_OCULAR: 3,                  // comma-separated ocular surface complaints
  CVSQ_Q3_EXTRAOCULAR: 4,             // comma-separated extraocular complaints
  CVSQ_Q4_FREQUENCY: 5,              // Rare | Infrequent | Frequent
  CVSQ_Q5_SCREEN_ASSOC: 6,           // Never | Sometimes | Always
  // Part 2 — EyeGuard Survey
  EG_AGE: 7,
  EG_GENDER: 8,
  EG_YEAR_LEVEL: 9,
  EG_FIELD_OF_STUDY: 10,
  EG_ACADEMIC_SCREEN_TIME: 11,
  EG_NON_ACADEMIC_SCREEN_TIME: 12,
  EG_PRIMARY_DEVICE: 13,
  EG_CONTINUOUS_SCREEN_USE: 14,
  EG_ONLINE_CLASSES_PER_DAY: 15,
  EG_FOLLOWS_20_20_20: 16,
  EG_BLUE_LIGHT_FILTER: 17,
  EG_SCREEN_BRIGHTNESS: 18,
  EG_DARK_ROOM_USE: 19,
  EG_SCREEN_DISTANCE: 20,
  EG_WEARS_GLASSES: 21,
  EG_BLUE_LIGHT_GLASSES: 22,
  EG_BREAK_FREQUENCY: 23,
  EG_SLEEP_HOURS: 24,
  // Q19 symptom grid (Never/Rarely/Sometimes/Often/Always)
  SYM_DRY_EYES: 25,
  SYM_EYE_ITCHINESS: 26,
  SYM_BLURRED_VISION: 27,
  SYM_HEADACHES: 28,
  SYM_EYE_IRRITATION: 29,
  SYM_LIGHT_SENSITIVITY: 30,
  SYM_DIFFICULTY_FOCUSING: 31,
  SYM_NECK_SHOULDER_PAIN: 32,
  SYM_MENTAL_FATIGUE: 33,
  SYM_DIFFICULTY_CONCENTRATING: 34,
  // Section 5 — self-assessment
  EG_OVERALL_EYE_STRAIN: 35,
  EG_DIGITAL_FATIGUE_FREQUENCY: 36,
  EG_PRIMARY_SYMPTOM_HISTORY: 37,
} as const

export const EXPECTED_COL_COUNT = 38

// ─────────────────────────────────────────────────────────────────────────────
// Row type — matches the `survey_responses` table columns exactly.
// ─────────────────────────────────────────────────────────────────────────────
export interface SurveyResponseRow {
  row_index: number
  response_timestamp: string | null
  email: string | null
  // CVSQ raw
  cvsq_q1_visual_raw: string | null
  cvsq_q2_ocular_raw: string | null
  cvsq_q3_extraocular_raw: string | null
  cvsq_q4_frequency: string | null
  cvsq_q5_screen_associated: string | null
  // CVSQ computed
  cvsq_q1_score: number
  cvsq_q2_score: number
  cvsq_q3_score: number
  cvsq_q4_score: number
  cvsq_q5_score: number
  cvsq_total: number
  cvsq_status: string
  // EyeGuard raw
  eg_age: string | null
  eg_gender: string | null
  eg_year_level: string | null
  eg_field_of_study: string | null
  eg_academic_screen_time: string | null
  eg_non_academic_screen_time: string | null
  eg_primary_device: string | null
  eg_continuous_screen_use: string | null
  eg_online_classes_per_day: string | null
  eg_follows_20_20_20: string | null
  eg_blue_light_filter: string | null
  eg_screen_brightness: string | null
  eg_dark_room_use: string | null
  eg_screen_distance: string | null
  eg_wears_glasses: string | null
  eg_blue_light_glasses: string | null
  eg_break_frequency: string | null
  eg_sleep_hours: string | null
  sym_dry_eyes: string | null
  sym_eye_itchiness: string | null
  sym_blurred_vision: string | null
  sym_headaches: string | null
  sym_eye_irritation: string | null
  sym_light_sensitivity: string | null
  sym_difficulty_focusing: string | null
  sym_neck_shoulder_pain: string | null
  sym_mental_fatigue: string | null
  sym_difficulty_concentrating: string | null
  eg_overall_eye_strain: string | null
  eg_digital_fatigue_frequency: string | null
  eg_primary_symptom_history: string | null
}

export interface ParseResult {
  rows: SurveyResponseRow[]
  totalRows: number
  errors: string[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Normalise any cell value to a trimmed string or null. */
function cellStr(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null
  if (v instanceof Date) return v.toISOString()
  return String(v).trim()
}

/**
 * For the three CVSQ complaint columns, the Google Form writes the literal
 * string "None" when the respondent selected no checkboxes. Store that as
 * NULL (cleaner for analysis) rather than the string "None".
 * Only used for complaint columns — "None" IS a valid answer elsewhere
 * (e.g. overall eye strain = "None"), so this is not applied globally.
 */
function cvsqComplaintCell(v: unknown): string | null {
  const s = cellStr(v)
  if (s === null) return null
  return s.toLowerCase() === 'none' ? null : s
}

/** Normalise the timestamp cell to an ISO string (or null). */
function cellTimestamp(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null
  if (v instanceof Date) return v.toISOString()
  const s = String(v).trim()
  // Already ISO-ish
  const parsed = new Date(s)
  return isNaN(parsed.getTime()) ? s : parsed.toISOString()
}

/**
 * Count complaints from a comma-separated string (Excel format), e.g.
 * "Blurred vision, Eye strain / fatigue, Glare / seeing halos of light" → 3
 * Matches the live-form `countComplaints` which counts non-empty selections.
 */
function countComplaints(raw: string | null): number {
  if (!raw) return 0
  return raw
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && p.toLowerCase() !== 'none')
    .length
}

const FREQ_MAP: Record<string, number> = { Rare: 0, Infrequent: 1, Frequent: 2 }
const SCREEN_MAP: Record<string, number> = { Never: 0, Sometimes: 1, Always: 2 }

/**
 * Compute the CVSQ score and 5-tier status (Iqbal et al., 2024).
 * Identical formula to app/api/predict-supabase/route.ts → computeCvsqScore.
 */
export function computeCvsq(
  q1Raw: string | null,
  q2Raw: string | null,
  q3Raw: string | null,
  q4: string | null,
  q5: string | null,
): { q1: number; q2: number; q3: number; q4: number; q5: number; total: number; status: string } {
  const q1 = Math.min(countComplaints(q1Raw), 2)
  const q2 = Math.min(countComplaints(q2Raw), 2)
  const q3 = Math.min(countComplaints(q3Raw), 2)
  const q4Score = FREQ_MAP[q4 ?? ''] ?? 0
  const q5Score = SCREEN_MAP[q5 ?? ''] ?? 0
  const total = q1 + q2 + q3 + q4Score + q5Score

  const status =
    total >= 7 ? 'Positive CVS Case' :
    total >= 5 ? 'High Probability' :
    total >= 3 ? 'Low Probability' :
    total >= 1 ? 'Not a CVS Case' :
                 'Normal'

  return { q1, q2, q3, q4: q4Score, q5: q5Score, total, status }
}

/** Safely get a cell from a row by index, tolerant of short rows. */
function get(row: unknown[], idx: number): unknown {
  return idx < row.length ? row[idx] : null
}

// ─────────────────────────────────────────────────────────────────────────────
// Main parse function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse an EyeGuard survey Excel file (as a Buffer/Uint8Array) into
 * SurveyResponseRow objects ready for Supabase insert.
 *
 * The first row is treated as the header and skipped. Subsequent rows are
 * mapped by column position (see COL constants).
 */
export async function parseSurveyExcel(
  data: Uint8Array | Buffer,
): Promise<ParseResult> {
  // read-excel-file's Node entry accepts a Buffer (Input = Stream | Buffer | PathLike).
  // Convert any byte-ish input to a Buffer so overload resolution picks the
  // no-schema overload (Promise<Row[]>), not the schema overload.
  const buf: Buffer = Buffer.isBuffer(data) ? data : Buffer.from(data)
  const rawRows = await readXlsxFile(buf)
  const errors: string[] = []

  // Sanity check: file must have at least a header row + some data
  if (!rawRows || rawRows.length < 2) {
    return { rows: [], totalRows: Math.max(0, (rawRows?.length ?? 0) - 1), errors: ['File has no data rows (only a header or empty).'] }
  }

  // Validate header width so we warn early if the file shape is unexpected.
  const headerCols = rawRows[0]?.length ?? 0
  if (headerCols < EXPECTED_COL_COUNT) {
    errors.push(`Header has ${headerCols} columns; expected ${EXPECTED_COL_COUNT}. Mapping by position may be misaligned — verify this is the EyeGuard survey export.`)
  }

  const rows: SurveyResponseRow[] = []
  for (let i = 1; i < rawRows.length; i++) {
    const r = (rawRows[i] as unknown[]) ?? []
    // Skip fully empty rows
    if (r.every((c) => c === null || c === undefined || c === '')) continue

    try {
      const q1Raw = cvsqComplaintCell(get(r, COL.CVSQ_Q1_VISUAL))
      const q2Raw = cvsqComplaintCell(get(r, COL.CVSQ_Q2_OCULAR))
      const q3Raw = cvsqComplaintCell(get(r, COL.CVSQ_Q3_EXTRAOCULAR))
      const q4 = cellStr(get(r, COL.CVSQ_Q4_FREQUENCY))
      const q5 = cellStr(get(r, COL.CVSQ_Q5_SCREEN_ASSOC))
      const cvsq = computeCvsq(q1Raw, q2Raw, q3Raw, q4, q5)

      rows.push({
        row_index: i, // 1-based data row number (matches Excel row index excluding header)
        response_timestamp: cellTimestamp(get(r, COL.TIMESTAMP)),
        email: cellStr(get(r, COL.EMAIL)),
        cvsq_q1_visual_raw: q1Raw,
        cvsq_q2_ocular_raw: q2Raw,
        cvsq_q3_extraocular_raw: q3Raw,
        cvsq_q4_frequency: q4,
        cvsq_q5_screen_associated: q5,
        cvsq_q1_score: cvsq.q1,
        cvsq_q2_score: cvsq.q2,
        cvsq_q3_score: cvsq.q3,
        cvsq_q4_score: cvsq.q4,
        cvsq_q5_score: cvsq.q5,
        cvsq_total: cvsq.total,
        cvsq_status: cvsq.status,
        eg_age: cellStr(get(r, COL.EG_AGE)),
        eg_gender: cellStr(get(r, COL.EG_GENDER)),
        eg_year_level: cellStr(get(r, COL.EG_YEAR_LEVEL)),
        eg_field_of_study: cellStr(get(r, COL.EG_FIELD_OF_STUDY)),
        eg_academic_screen_time: cellStr(get(r, COL.EG_ACADEMIC_SCREEN_TIME)),
        eg_non_academic_screen_time: cellStr(get(r, COL.EG_NON_ACADEMIC_SCREEN_TIME)),
        eg_primary_device: cellStr(get(r, COL.EG_PRIMARY_DEVICE)),
        eg_continuous_screen_use: cellStr(get(r, COL.EG_CONTINUOUS_SCREEN_USE)),
        eg_online_classes_per_day: cellStr(get(r, COL.EG_ONLINE_CLASSES_PER_DAY)),
        eg_follows_20_20_20: cellStr(get(r, COL.EG_FOLLOWS_20_20_20)),
        eg_blue_light_filter: cellStr(get(r, COL.EG_BLUE_LIGHT_FILTER)),
        eg_screen_brightness: cellStr(get(r, COL.EG_SCREEN_BRIGHTNESS)),
        eg_dark_room_use: cellStr(get(r, COL.EG_DARK_ROOM_USE)),
        eg_screen_distance: cellStr(get(r, COL.EG_SCREEN_DISTANCE)),
        eg_wears_glasses: cellStr(get(r, COL.EG_WEARS_GLASSES)),
        eg_blue_light_glasses: cellStr(get(r, COL.EG_BLUE_LIGHT_GLASSES)),
        eg_break_frequency: cellStr(get(r, COL.EG_BREAK_FREQUENCY)),
        eg_sleep_hours: cellStr(get(r, COL.EG_SLEEP_HOURS)),
        sym_dry_eyes: cellStr(get(r, COL.SYM_DRY_EYES)),
        sym_eye_itchiness: cellStr(get(r, COL.SYM_EYE_ITCHINESS)),
        sym_blurred_vision: cellStr(get(r, COL.SYM_BLURRED_VISION)),
        sym_headaches: cellStr(get(r, COL.SYM_HEADACHES)),
        sym_eye_irritation: cellStr(get(r, COL.SYM_EYE_IRRITATION)),
        sym_light_sensitivity: cellStr(get(r, COL.SYM_LIGHT_SENSITIVITY)),
        sym_difficulty_focusing: cellStr(get(r, COL.SYM_DIFFICULTY_FOCUSING)),
        sym_neck_shoulder_pain: cellStr(get(r, COL.SYM_NECK_SHOULDER_PAIN)),
        sym_mental_fatigue: cellStr(get(r, COL.SYM_MENTAL_FATIGUE)),
        sym_difficulty_concentrating: cellStr(get(r, COL.SYM_DIFFICULTY_CONCENTRATING)),
        eg_overall_eye_strain: cellStr(get(r, COL.EG_OVERALL_EYE_STRAIN)),
        eg_digital_fatigue_frequency: cellStr(get(r, COL.EG_DIGITAL_FATIGUE_FREQUENCY)),
        eg_primary_symptom_history: cellStr(get(r, COL.EG_PRIMARY_SYMPTOM_HISTORY)),
      })
    } catch (err) {
      errors.push(`Row ${i}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return { rows, totalRows: rows.length, errors }
}

// ─────────────────────────────────────────────────────────────────────────────
// Insert helper — shared by the route and the CLI script.
// Uses the admin (service-role) Supabase client, which bypasses RLS.
// Inserts in batches to stay well under Supabase's per-request row limits.
// ─────────────────────────────────────────────────────────────────────────────

export interface InsertResult {
  inserted: number
  duplicates: number  // rows skipped due to the (email, response_timestamp) unique constraint
  errors: string[]
}

const BATCH_SIZE = 200

export async function insertSurveyRows(
  supabaseAdmin: { from: (t: string) => any },
  rows: SurveyResponseRow[],
  sourceFile: string,
): Promise<InsertResult> {
  let inserted = 0
  let duplicates = 0
  const errors: string[] = []

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE).map((r) => ({
      row_index: r.row_index,
      source_file: sourceFile,
      response_timestamp: r.response_timestamp,
      email: r.email,
      cvsq_q1_visual_raw: r.cvsq_q1_visual_raw,
      cvsq_q2_ocular_raw: r.cvsq_q2_ocular_raw,
      cvsq_q3_extraocular_raw: r.cvsq_q3_extraocular_raw,
      cvsq_q4_frequency: r.cvsq_q4_frequency,
      cvsq_q5_screen_associated: r.cvsq_q5_screen_associated,
      cvsq_q1_score: r.cvsq_q1_score,
      cvsq_q2_score: r.cvsq_q2_score,
      cvsq_q3_score: r.cvsq_q3_score,
      cvsq_q4_score: r.cvsq_q4_score,
      cvsq_q5_score: r.cvsq_q5_score,
      cvsq_total: r.cvsq_total,
      cvsq_status: r.cvsq_status,
      eg_age: r.eg_age,
      eg_gender: r.eg_gender,
      eg_year_level: r.eg_year_level,
      eg_field_of_study: r.eg_field_of_study,
      eg_academic_screen_time: r.eg_academic_screen_time,
      eg_non_academic_screen_time: r.eg_non_academic_screen_time,
      eg_primary_device: r.eg_primary_device,
      eg_continuous_screen_use: r.eg_continuous_screen_use,
      eg_online_classes_per_day: r.eg_online_classes_per_day,
      eg_follows_20_20_20: r.eg_follows_20_20_20,
      eg_blue_light_filter: r.eg_blue_light_filter,
      eg_screen_brightness: r.eg_screen_brightness,
      eg_dark_room_use: r.eg_dark_room_use,
      eg_screen_distance: r.eg_screen_distance,
      eg_wears_glasses: r.eg_wears_glasses,
      eg_blue_light_glasses: r.eg_blue_light_glasses,
      eg_break_frequency: r.eg_break_frequency,
      eg_sleep_hours: r.eg_sleep_hours,
      sym_dry_eyes: r.sym_dry_eyes,
      sym_eye_itchiness: r.sym_eye_itchiness,
      sym_blurred_vision: r.sym_blurred_vision,
      sym_headaches: r.sym_headaches,
      sym_eye_irritation: r.sym_eye_irritation,
      sym_light_sensitivity: r.sym_light_sensitivity,
      sym_difficulty_focusing: r.sym_difficulty_focusing,
      sym_neck_shoulder_pain: r.sym_neck_shoulder_pain,
      sym_mental_fatigue: r.sym_mental_fatigue,
      sym_difficulty_concentrating: r.sym_difficulty_concentrating,
      eg_overall_eye_strain: r.eg_overall_eye_strain,
      eg_digital_fatigue_frequency: r.eg_digital_fatigue_frequency,
      eg_primary_symptom_history: r.eg_primary_symptom_history,
    }))

    // upsert with ignoreDuplicates so re-importing the same file is safe —
    // existing rows (same email + response_timestamp) are skipped, not duplicated.
    const { error } = await supabaseAdmin
      .from('survey_responses')
      .upsert(batch, { onConflict: 'email,response_timestamp', ignoreDuplicates: true })

    if (error) {
      // PostgREST returns 23505 unique violation for duplicates when
      // ignoreDuplicates isn't honoured by the server version; treat those as skips.
      if (error.code === '23505') {
        duplicates += batch.length
      } else {
        errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message} (code ${error.code})`)
      }
    } else {
      // Count the rows that were actually new (upsert with ignoreDuplicates returns
      // no row count from PostgREST, so we approximate inserted = batch size).
      inserted += batch.length
    }
  }

  return { inserted, duplicates, errors }
}
