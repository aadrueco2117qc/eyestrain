import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdmin } from '@/lib/admin-guard'
import { serializeToCSV, transformLogsForCSV, DAILY_LOG_COLUMNS } from '@/lib/csv-export'
import { NextResponse } from 'next/server'

const READABLE_HEADERS = [
  'Date',
  'Email',
  'Age',
  'Gender',
  'Year Level',
  'Field of Study',
  'Screen Time (hours)',
  'Breaks Taken',
  'Eye Strain',
  'Headaches',
  'Blurry Vision',
  'Dry Eyes',
  'Brightness (%)',
  'Sleep Hours',
  'Risk Level',
  'Submitted At',
]

export async function GET() {
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

  const { data: logs, error } = await adminClient
    .from('daily_logs')
    .select(DAILY_LOG_COLUMNS.join(', '))
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
  }

  try {
    const rows = transformLogsForCSV((logs ?? []) as Record<string, unknown>[])
    const csv = serializeToCSV(rows, READABLE_HEADERS)
    const today = new Date().toISOString().split('T')[0]

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="eyeguard-export-${today}.csv"`,
      },
    })
  } catch (err) {
    console.error('CSV generation error:', err)
    return NextResponse.json({ error: 'Failed to generate export' }, { status: 500 })
  }
}
