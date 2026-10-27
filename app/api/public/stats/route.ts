import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const adminClient = createAdminClient()

    // Run all three counts in parallel
    const [logsRes, surveyRes, predictionsRes] = await Promise.all([
      adminClient.from('daily_logs').select('user_id, email'),
      adminClient.from('survey_responses').select('email', { count: 'exact', head: false }),
      adminClient.from('predictions').select('id', { count: 'exact', head: true }),
    ])

    const logs    = logsRes.data ?? []
    const surveys = surveyRes.data ?? []

    // Unique respondents from daily_logs
    const uniqueUsers  = new Set(logs.map((l: any) => l.user_id ?? l.email)).size

    // Survey respondents (deduplicated against daily_logs emails)
    const dailyEmails  = new Set(logs.map((l: any) => l.email).filter(Boolean))
    let surveyUnique   = 0
    for (const s of surveys) {
      if (s.email && !dailyEmails.has(s.email)) surveyUnique++
    }

    const totalRespondents = uniqueUsers + surveyUnique
    const totalLogs        = logs.length + surveys.length

    return NextResponse.json({
      respondents:          totalRespondents,
      logsRecorded:         totalLogs,
      predictionsGenerated: predictionsRes.count ?? 0,
    })
  } catch {
    return NextResponse.json({
      respondents: 0, logsRecorded: 0, predictionsGenerated: 0,
    })
  }
}
