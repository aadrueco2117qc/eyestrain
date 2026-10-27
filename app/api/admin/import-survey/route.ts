import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdmin } from '@/lib/admin-guard'
import { recordAdminAuditEvent } from '@/lib/admin-audit'
import { parseSurveyExcel, insertSurveyRows } from '@/lib/survey-import'

// Hard cap on upload size to protect the server (10 MB). The EyeGuard
// survey export with 399 rows is ~83 KB, so this is generous.
const MAX_FILE_BYTES = 10 * 1024 * 1024

export async function POST(req: NextRequest) {
  // ── 1. Auth — admin only ────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdmin(user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── 2. Read uploaded file ───────────────────────────────────────────────
  let file: File | null = null
  try {
    const form = await req.formData()
    file = form.get('file') as File | null
  } catch {
    return NextResponse.json({ error: 'Invalid form upload. Send multipart/form-data with a "file" field.' }, { status: 400 })
  }

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'No file uploaded. Provide an .xlsx file in the "file" field.' }, { status: 400 })
  }

  const name = file.name || 'upload.xlsx'
  if (!/\.xlsx$/i.test(name)) {
    return NextResponse.json({ error: `File "${name}" is not an .xlsx workbook. Export the Google Form responses as .xlsx.` }, { status: 400 })
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: `File is too large (${file.size} bytes). Max is ${MAX_FILE_BYTES} bytes.` }, { status: 413 })
  }

  // ── 3. Admin client (service role — bypasses RLS) ───────────────────────
  let adminClient
  try {
    adminClient = createAdminClient()
  } catch {
    return NextResponse.json({ error: 'Server configuration error (missing service role key).' }, { status: 500 })
  }

  // ── 4. Parse + insert ───────────────────────────────────────────────────
  try {
    const bytes = new Uint8Array(await file.arrayBuffer())

    if (bytes.byteLength === 0) {
      return NextResponse.json({ error: 'Uploaded file is empty.' }, { status: 400 })
    }

    const parsed = await parseSurveyExcel(bytes)

    if (parsed.rows.length === 0) {
      return NextResponse.json({
        error: 'No data rows found in the workbook.',
        totalRows: 0,
        parseErrors: parsed.errors,
      }, { status: 422 })
    }

    const insertResult = await insertSurveyRows(adminClient, parsed.rows, name)

    // ── 5. Audit log (best-effort) ───────────────────────────────────────
    try {
      await recordAdminAuditEvent({
        eventType: 'survey_import',
        description: `Imported ${name}: ${insertResult.inserted} rows inserted, ${insertResult.duplicates} duplicates skipped, ${parsed.totalRows} total parsed.`,
        targetEmail: user?.email ?? null,
        actorId: user?.id ?? null,
        actorEmail: user?.email ?? null,
        eventData: {
          filename: name,
          bytes: file.size,
          totalParsed: parsed.totalRows,
          inserted: insertResult.inserted,
          duplicates: insertResult.duplicates,
          errors: insertResult.errors,
          parseWarnings: parsed.errors,
        },
      })
    } catch {
      // Audit logging failure must not fail the import response.
    }

    // ── 6. Response ──────────────────────────────────────────────────────
    const cvsqBuckets: Record<string, number> = {}
    for (const r of parsed.rows) {
      cvsqBuckets[r.cvsq_status] = (cvsqBuckets[r.cvsq_status] ?? 0) + 1
    }

    return NextResponse.json({
      ok: true,
      filename: name,
      totalParsed: parsed.totalRows,
      inserted: insertResult.inserted,
      duplicates: insertResult.duplicates,
      cvsqStatusCounts: cvsqBuckets,
      parseWarnings: parsed.errors,
      insertErrors: insertResult.errors,
    })
  } catch (err) {
    console.error('Survey import failed:', err)
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Failed to import survey file.',
    }, { status: 500 })
  }
}

// Optional GET — quick health/usage note so the endpoint is discoverable.
export async function GET() {
  return NextResponse.json({
    endpoint: 'POST /api/admin/import-survey',
    usage: 'Send multipart/form-data with a "file" field containing an .xlsx Google Form export.',
    requiredRole: 'admin',
  })
}
