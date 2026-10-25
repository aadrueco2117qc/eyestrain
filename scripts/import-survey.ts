/**
 * Standalone one-time import of the EyeGuard survey Excel file into Supabase.
 *
 * Reuses the same shared logic as the admin upload route (lib/survey-import.ts),
 * so the CVSQ scoring and column mapping stay identical.
 *
 * Usage:
 *   pnpm import-survey
 *   pnpm import-survey "path/to/your-file.xlsx"
 *   npx tsx scripts/import-survey.ts "path/to/your-file.xlsx"
 *
 * Requires .env.local to contain:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { parseSurveyExcel, insertSurveyRows } from '../lib/survey-import'

// ── 1. Load .env.local (tsx doesn't auto-load it) ────────────────────────────
function loadEnvFile(path: string) {
  if (!existsSync(path)) return
  const content = readFileSync(path, 'utf-8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    // Strip surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}

const projectRoot = resolve(__dirname, '..')
loadEnvFile(resolve(projectRoot, '.env.local'))

// ── 2. Validate required env ────────────────────────────────────────────────
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('\n✗ Missing Supabase environment variables.')
  console.error('  Ensure .env.local defines NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

// ── 3. Resolve the Excel file path ──────────────────────────────────────────
const argPath = process.argv[2]
const defaultFile = resolve(
  projectRoot,
  'EyeGuard Survey Questionnaire   (Responses) (2).xlsx',
)
const excelPath = argPath ? resolve(process.cwd(), argPath) : defaultFile

if (!existsSync(excelPath)) {
  console.error(`\n✗ Excel file not found:\n  ${excelPath}`)
  console.error('  Pass the path as an argument:  pnpm import-survey "path/to/file.xlsx"')
  process.exit(1)
}

console.log('EyeGuard Survey Import')
console.log('───────────────────────')
console.log(`Excel file: ${excelPath}`)
console.log(`Supabase:  ${supabaseUrl}`)
console.log('')

// ── 4. Admin (service-role) Supabase client — bypasses RLS ──────────────────
const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// ── 5. Parse + insert ────────────────────────────────────────────────────────
;(async () => {
  const fileName = excelPath.split(/[\\/]/).pop() ?? 'upload.xlsx'

  // Pre-flight: confirm the target table exists. PostgREST returns a specific
  // error if the table is missing, which we surface with a clear message.
  const { error: probeError } = await adminClient
    .from('survey_responses')
    .select('id')
    .limit(1)

  if (probeError) {
    console.error('\n✗ Could not read the survey_responses table.')
    console.error('  PostgREST error:', probeError.message)
    console.error('')
    console.error('  The table does not exist yet. Run the SQL migration first:')
    console.error('    database/schema_survey_responses.sql')
    console.error('  in the Supabase Dashboard → SQL Editor, then re-run this script.')
    process.exit(1)
  }

  console.log('✓ survey_responses table exists.\n')

  const bytes = readFileSync(excelPath)
  console.log(`Read ${bytes.byteLength.toLocaleString()} bytes. Parsing…`)

  const parsed = await parseSurveyExcel(bytes)
  console.log(`Parsed ${parsed.totalRows} data rows.`)
  if (parsed.errors.length > 0) {
    console.warn(`  ${parsed.errors.length} parse warning(s):`)
    for (const w of parsed.errors.slice(0, 10)) console.warn('   ⚠', w)
    if (parsed.errors.length > 10) console.warn(`   …and ${parsed.errors.length - 10} more.`)
  }

  // CVSQ distribution preview
  const buckets: Record<string, number> = {}
  for (const r of parsed.rows) buckets[r.cvsq_status] = (buckets[r.cvsq_status] ?? 0) + 1
  console.log('\nCVS-Smart score distribution (computed):')
  for (const k of ['Positive CVS Case', 'High Probability', 'Low Probability', 'Not a CVS Case', 'Normal']) {
    if (buckets[k] != null) console.log(`  ${k.padEnd(22)} ${buckets[k]}`)
  }

  console.log('\nInserting into Supabase…')
  const insertResult = await insertSurveyRows(adminClient, parsed.rows, fileName)

  console.log('\n───────────────────────')
  console.log('Import complete.')
  console.log(`  Rows parsed:    ${parsed.totalRows}`)
  console.log(`  Rows inserted:  ${insertResult.inserted}`)
  console.log(`  Duplicates:     ${insertResult.duplicates}`)
  if (insertResult.errors.length > 0) {
    console.error(`  Insert errors:  ${insertResult.errors.length}`)
    for (const e of insertResult.errors.slice(0, 10)) console.error('   ✗', e)
  }

  // Verify
  const { count, error: countErr } = await adminClient
    .from('survey_responses')
    .select('*', { count: 'exact', head: true })
  if (countErr) {
    console.warn('\nCould not verify row count:', countErr.message)
  } else {
    console.log(`\n✓ survey_responses now holds ${count} total row(s).`)
  }

  process.exit(0)
})().catch((err) => {
  console.error('\n✗ Import failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
