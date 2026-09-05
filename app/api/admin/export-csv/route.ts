import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdmin } from '@/lib/admin-guard'
import { DAILY_LOG_COLUMNS, transformLogsForCSV } from '@/lib/csv-export'
import { generateXlsx, type XlsxColumn } from '@/lib/xlsx-export'
import { NextResponse } from 'next/server'

// Column definitions — header label + row key + explicit width (chars)
const COLUMNS: XlsxColumn[] = [
  { header: 'Date',               key: 'Date',               width: 12 },
  { header: 'Email',              key: 'Email',              width: 36 },
  { header: 'Age',                key: 'Age',                width:  8 },
  { header: 'Gender',             key: 'Gender',             width: 12 },
  { header: 'Year Level',         key: 'Year Level',         width: 14 },
  { header: 'Field of Study',     key: 'Field of Study',     width: 24 },
  { header: 'Screen Time (hrs)',  key: 'Screen Time (hours)', width: 16 },
  { header: 'Breaks Taken',       key: 'Breaks Taken',       width: 13 },
  { header: 'Eye Strain',         key: 'Eye Strain',         width: 11 },
  { header: 'Headaches',          key: 'Headaches',          width: 11 },
  { header: 'Blurry Vision',      key: 'Blurry Vision',      width: 13 },
  { header: 'Dry Eyes',           key: 'Dry Eyes',           width: 10 },
  { header: 'Brightness (%)',     key: 'Brightness (%)',     width: 14 },
  { header: 'Sleep Hours',        key: 'Sleep Hours',        width: 12 },
  { header: 'Risk Level',         key: 'Risk Level',         width: 12 },
  { header: 'Submitted At',       key: 'Submitted At',       width: 14 },
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
    const rows = transformLogsForCSV((logs ?? []) as unknown as Record<string, unknown>[]) as Record<string, import('@/lib/xlsx-export').CellValue>[]
    const xlsx = generateXlsx(rows, COLUMNS, 'EyeGuard Data')
    const today = new Date().toISOString().split('T')[0]

    return new Response(xlsx, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="eyeguard-export-${today}.xlsx"`,
        'Content-Length': xlsx.byteLength.toString(),
      },
    })
  } catch (err) {
    console.error('XLSX generation error:', err)
    return NextResponse.json({ error: 'Failed to generate export' }, { status: 500 })
  }
}
