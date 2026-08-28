import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdmin } from '@/lib/admin-guard'
import { NextResponse } from 'next/server'

// ── Helpers ───────────────────────────────────────────────────────────────────

function freqToScore(freq: string | null | undefined): number {
  const map: Record<string, number> = {
    'Never': 0,
    'Rarely (1-2 times a week)': 1,
    'Sometimes (3-4 times a week)': 2,
    'Often (5-6 times a week)': 3,
    'Always (every day)': 4,
  }
  return map[freq ?? ''] ?? 0
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function delta(before: number, after: number): number {
  return parseFloat((after - before).toFixed(2))
}

// Direction: positive change means improvement for this metric?
// screen_time ↓ = good, sleep ↑ = good, symptoms ↓ = good, risk ↓ = good
function improvementStatus(
  screenDelta: number,
  sleepDelta: number,
  symptomDelta: number,
  riskDelta: number,
): 'Improved' | 'No Change' | 'Worsened' {
  // Score: +1 if metric moved in healthy direction, -1 if not, 0 if negligible
  let score = 0
  if (screenDelta < -0.3) score += 1   // screen time decreased
  else if (screenDelta > 0.5) score -= 1

  if (sleepDelta > 0.2) score += 1     // sleep increased
  else if (sleepDelta < -0.3) score -= 1

  if (symptomDelta < -0.1) score += 1  // symptoms decreased
  else if (symptomDelta > 0.1) score -= 1

  if (riskDelta < -3) score += 1       // risk score dropped
  else if (riskDelta > 3) score -= 1

  if (score >= 2) return 'Improved'
  if (score <= -2) return 'Worsened'
  return 'No Change'
}

// ── Route ─────────────────────────────────────────────────────────────────────

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

  // Fetch all registered-user logs (user_id not null) with predictions joined via log id
  const { data: logs, error: logsError } = await adminClient
    .from('daily_logs')
    .select(`
      id,
      user_id,
      email,
      date,
      screen_time,
      sleep_hours,
      breaks_taken,
      eye_strain,
      eye_strain_frequency,
      headaches,
      headaches_frequency,
      blurry_vision,
      blurry_vision_frequency,
      dry_eyes,
      dry_eyes_frequency,
      risk_level
    `)
    .not('user_id', 'is', null)
    .order('date', { ascending: true })

  if (logsError) {
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
  }

  // Fetch latest prediction per log to get risk_percentage
  const logIds = (logs ?? []).map((l: any) => l.id)
  let predMap: Record<string, number> = {}
  if (logIds.length > 0) {
    const { data: preds } = await adminClient
      .from('predictions')
      .select('daily_log_id, risk_percentage')
      .in('daily_log_id', logIds)
    for (const p of preds ?? []) {
      predMap[p.daily_log_id] = Number(p.risk_percentage) || 0
    }
  }

  // Fetch user profiles for display names
  const userIds = [...new Set((logs ?? []).map((l: any) => l.user_id))]
  const { data: profiles } = await adminClient
    .from('user_profiles')
    .select('user_id, first_name, last_name')
    .in('user_id', userIds)
  const profileMap: Record<string, { firstName: string; lastName: string }> = {}
  for (const p of profiles ?? []) {
    profileMap[p.user_id] = { firstName: p.first_name ?? '', lastName: p.last_name ?? '' }
  }

  // Group logs by user
  const byUser = new Map<string, any[]>()
  for (const log of logs ?? []) {
    const uid = log.user_id
    if (!byUser.has(uid)) byUser.set(uid, [])
    byUser.get(uid)!.push(log)
  }

  const results: any[] = []

  for (const [userId, userLogs] of byUser) {
    // Need at least 2 logs to compare
    if (userLogs.length < 2) continue

    // Split: "before" = all logs except last 7, "recent" = last 7
    // If fewer than 7 logs total, use first half vs second half
    let beforeLogs: any[]
    let recentLogs: any[]

    if (userLogs.length >= 14) {
      recentLogs = userLogs.slice(-7)
      beforeLogs = userLogs.slice(-14, -7)
    } else if (userLogs.length >= 4) {
      const split = Math.floor(userLogs.length / 2)
      beforeLogs = userLogs.slice(0, split)
      recentLogs = userLogs.slice(split)
    } else {
      // 2–3 logs: use first as baseline, rest as recent
      beforeLogs = [userLogs[0]]
      recentLogs = userLogs.slice(1)
    }

    // ── Metric averages ─────────────────────────────────────────────────────

    const beforeScreen  = avg(beforeLogs.map(l => Number(l.screen_time)  || 0))
    const recentScreen  = avg(recentLogs.map(l => Number(l.screen_time)  || 0))

    const beforeSleep   = avg(beforeLogs.map(l => Number(l.sleep_hours)  || 0))
    const recentSleep   = avg(recentLogs.map(l => Number(l.sleep_hours)  || 0))

    const beforeBreaks  = avg(beforeLogs.map(l => Number(l.breaks_taken) || 0))
    const recentBreaks  = avg(recentLogs.map(l => Number(l.breaks_taken) || 0))

    // Symptom burden: CVS-Q weighted average (0–4 scale per symptom, eye strain & blurry vision weight 2)
    const symptomBurden = (ls: any[]) =>
      avg(ls.map(l =>
        ((freqToScore(l.eye_strain_frequency)    * 2) +
         (freqToScore(l.blurry_vision_frequency) * 2) +
         (freqToScore(l.headaches_frequency)     * 1) +
         (freqToScore(l.dry_eyes_frequency)      * 1)) / 8
      ))
    const beforeSymptom = symptomBurden(beforeLogs)
    const recentSymptom = symptomBurden(recentLogs)

    // Per-symptom frequency averages (0–4 scale)
    const beforeEyeStrain    = avg(beforeLogs.map(l => freqToScore(l.eye_strain_frequency)))
    const recentEyeStrain    = avg(recentLogs.map(l => freqToScore(l.eye_strain_frequency)))
    const beforeHeadaches    = avg(beforeLogs.map(l => freqToScore(l.headaches_frequency)))
    const recentHeadaches    = avg(recentLogs.map(l => freqToScore(l.headaches_frequency)))
    const beforeBlurry       = avg(beforeLogs.map(l => freqToScore(l.blurry_vision_frequency)))
    const recentBlurry       = avg(recentLogs.map(l => freqToScore(l.blurry_vision_frequency)))
    const beforeDryEyes      = avg(beforeLogs.map(l => freqToScore(l.dry_eyes_frequency)))
    const recentDryEyes      = avg(recentLogs.map(l => freqToScore(l.dry_eyes_frequency)))

    // Risk percentage from predictions
    const beforeRisk = avg(beforeLogs.map(l => predMap[l.id] ?? 0))
    const recentRisk = avg(recentLogs.map(l => predMap[l.id] ?? 0))

    // Most recent risk level label
    const latestLog = userLogs[userLogs.length - 1]
    const latestRiskLevel = latestLog.risk_level ?? 'Unknown'

    // Deltas
    const screenDelta  = delta(beforeScreen,  recentScreen)
    const sleepDelta   = delta(beforeSleep,   recentSleep)
    const breaksDelta  = delta(beforeBreaks,  recentBreaks)
    const symptomDelta = delta(beforeSymptom, recentSymptom)
    const riskDelta    = delta(beforeRisk,    recentRisk)

    const status = improvementStatus(screenDelta, sleepDelta, symptomDelta, riskDelta)

    const profile = profileMap[userId]
    const displayName = profile?.firstName || profile?.lastName
      ? `${profile.firstName} ${profile.lastName}`.trim()
      : null

    results.push({
      userId,
      email: latestLog.email ?? '',
      displayName,
      totalLogs: userLogs.length,
      firstLogDate: userLogs[0].date,
      latestLogDate: latestLog.date,
      latestRiskLevel,
      status,

      // Before/after summaries
      before: {
        avgScreenTime:  parseFloat(beforeScreen.toFixed(1)),
        avgSleepHours:  parseFloat(beforeSleep.toFixed(1)),
        avgBreaks:      parseFloat(beforeBreaks.toFixed(1)),
        symptomBurden:  parseFloat((beforeSymptom * 100).toFixed(1)),
        riskPercentage: parseFloat(beforeRisk.toFixed(1)),
        eyeStrain:      parseFloat(beforeEyeStrain.toFixed(2)),
        headaches:      parseFloat(beforeHeadaches.toFixed(2)),
        blurryVision:   parseFloat(beforeBlurry.toFixed(2)),
        dryEyes:        parseFloat(beforeDryEyes.toFixed(2)),
        logCount:       beforeLogs.length,
      },
      recent: {
        avgScreenTime:  parseFloat(recentScreen.toFixed(1)),
        avgSleepHours:  parseFloat(recentSleep.toFixed(1)),
        avgBreaks:      parseFloat(recentBreaks.toFixed(1)),
        symptomBurden:  parseFloat((recentSymptom * 100).toFixed(1)),
        riskPercentage: parseFloat(recentRisk.toFixed(1)),
        eyeStrain:      parseFloat(recentEyeStrain.toFixed(2)),
        headaches:      parseFloat(recentHeadaches.toFixed(2)),
        blurryVision:   parseFloat(recentBlurry.toFixed(2)),
        dryEyes:        parseFloat(recentDryEyes.toFixed(2)),
        logCount:       recentLogs.length,
      },
      deltas: {
        screenTime:     screenDelta,
        sleepHours:     sleepDelta,
        breaks:         breaksDelta,
        symptomBurden:  parseFloat(symptomDelta.toFixed(3)),
        riskPercentage: riskDelta,
        eyeStrain:      parseFloat(delta(beforeEyeStrain, recentEyeStrain).toFixed(2)),
        headaches:      parseFloat(delta(beforeHeadaches, recentHeadaches).toFixed(2)),
        blurryVision:   parseFloat(delta(beforeBlurry, recentBlurry).toFixed(2)),
        dryEyes:        parseFloat(delta(beforeDryEyes, recentDryEyes).toFixed(2)),
      },
    })
  }

  // Sort: Worsened first (needs attention), then No Change, then Improved
  const order = { Worsened: 0, 'No Change': 1, Improved: 2 }
  results.sort((a, b) => order[a.status as keyof typeof order] - order[b.status as keyof typeof order])

  // Summary counts
  const improved  = results.filter(r => r.status === 'Improved').length
  const worsened  = results.filter(r => r.status === 'Worsened').length
  const noChange  = results.filter(r => r.status === 'No Change').length

  // Population-level averages
  const avgRiskDelta    = results.length ? avg(results.map(r => r.deltas.riskPercentage)) : 0
  const avgScreenDelta  = results.length ? avg(results.map(r => r.deltas.screenTime))     : 0
  const avgSleepDelta   = results.length ? avg(results.map(r => r.deltas.sleepHours))     : 0
  const avgSymptomDelta = results.length ? avg(results.map(r => r.deltas.symptomBurden))  : 0

  return NextResponse.json({
    users: results,
    summary: {
      total: results.length,
      improved,
      worsened,
      noChange,
      improvedPct: results.length ? parseFloat(((improved / results.length) * 100).toFixed(1)) : 0,
      worsenedPct: results.length ? parseFloat(((worsened / results.length) * 100).toFixed(1)) : 0,
      avgRiskDelta:    parseFloat(avgRiskDelta.toFixed(1)),
      avgScreenDelta:  parseFloat(avgScreenDelta.toFixed(1)),
      avgSleepDelta:   parseFloat(avgSleepDelta.toFixed(1)),
      avgSymptomDelta: parseFloat(avgSymptomDelta.toFixed(1)),
    },
  })
}
