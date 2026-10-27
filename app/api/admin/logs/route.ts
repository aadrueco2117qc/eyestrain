import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdmin } from '@/lib/admin-guard'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
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

  const { searchParams } = new URL(request.url)
  const page     = Math.max(1, parseInt(searchParams.get('page')     ?? '1',  10))
  const pageSize = Math.max(1, parseInt(searchParams.get('pageSize') ?? '25', 10))
  const dateRange = searchParams.get('dateRange') ?? 'all'

  let fromDate: string | null = null
  const now = new Date()
  if (dateRange === 'today') {
    fromDate = now.toISOString().slice(0, 10)
  } else if (dateRange === '7days') {
    const d = new Date(now); d.setDate(d.getDate() - 6)
    fromDate = d.toISOString().slice(0, 10)
  } else if (dateRange === '30days') {
    const d = new Date(now); d.setDate(d.getDate() - 29)
    fromDate = d.toISOString().slice(0, 10)
  }

  let countQuery = adminClient.from('daily_logs').select('id', { count: 'exact', head: true })
  if (fromDate) countQuery = countQuery.gte('date', fromDate)
  const { count, error: countError } = await countQuery
  if (countError) return NextResponse.json({ error: 'Failed to count logs' }, { status: 500 })

  const totalCount = count ?? 0
  const totalPages = Math.ceil(totalCount / pageSize)
  const offset = (page - 1) * pageSize

  let dataQuery = adminClient
    .from('daily_logs')
    .select([
      'id', 'date', 'email',
      // Screen time (new: split by academic + non-academic, plus calculated total)
      'academic_screen_time', 'non_academic_screen_time', 'screen_time',
      // Environment
      'screen_brightness', 'sleep_hours', 'primary_device',
      'follows_20_20_20', 'break_frequency', 'dark_room_use',
      // Symptom grid (new: frequency strings Never/Rarely/Sometimes/Often/Always)
      'sym_dry_eyes', 'sym_blurred_vision', 'sym_headaches', 'sym_eye_irritation',
      'sym_light_sensitivity', 'sym_mental_fatigue', 'sym_neck_shoulder_pain',
      'sym_difficulty_focusing', 'sym_eye_itchiness',
      // Self-assessment
      'overall_eye_strain', 'digital_fatigue_frequency',
      // CVSQ
      'cvsq_frequency', 'cvsq_screen_associated',
      // Risk
      'risk_level', 'created_at',
    ].join(', '))
    .order('date', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (fromDate) dataQuery = dataQuery.gte('date', fromDate)

  const { data: logs, error } = await dataQuery
  if (error) return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })

  return NextResponse.json({ logs: logs ?? [], page, totalPages, totalCount })
}
