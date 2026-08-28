import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdmin } from '@/lib/admin-guard'
import { recordAdminAuditEvent } from '@/lib/admin-audit'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ logId: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdmin(user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let adminClient
  try {
    adminClient = createAdminClient()
  } catch {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const { logId } = await params

  // Fetch the log first so we can include it in the audit trail
  const { data: log, error: fetchErr } = await adminClient
    .from('daily_logs')
    .select('id, user_id, date, email, risk_level')
    .eq('id', logId)
    .single()

  if (fetchErr || !log) {
    return NextResponse.json({ error: 'Log not found' }, { status: 404 })
  }

  // Delete linked predictions first (FK constraint)
  await adminClient.from('predictions').delete().eq('daily_log_id', logId)

  // Delete the log
  const { error: deleteErr } = await adminClient
    .from('daily_logs')
    .delete()
    .eq('id', logId)

  if (deleteErr) {
    console.error('Failed to delete log:', deleteErr)
    return NextResponse.json({ error: 'Failed to delete log entry' }, { status: 500 })
  }

  // Audit trail
  try {
    await recordAdminAuditEvent({
      targetUserId: log.user_id ?? null,
      targetEmail: log.email ?? null,
      eventType: 'log_deleted',
      description: `Admin deleted log entry for ${log.date} (risk: ${log.risk_level ?? 'unknown'})`,
      eventData: { logId, date: log.date, riskLevel: log.risk_level },
      actorId: user?.id ?? null,
      actorEmail: user?.email ?? null,
    })
  } catch (auditError) {
    console.error('Audit logging failed:', auditError)
  }

  return NextResponse.json({ success: true })
}
