import { createClient } from '@/lib/supabase/server'

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface RecommendationInput {
  screenTime: number      // hours
  sleepHours: number
  brightness: number      // 0–100
  riskLevel: string       // 'Low' | 'Moderate' | 'High' | 'Critical'
  eyeStrain: 0 | 1
  headaches: 0 | 1
  blurryVision: 0 | 1
  dryEyes: 0 | 1
}

export interface RecommendationOutput {
  title: string
  description: string
  category: string
}

interface WellnessTip {
  id: string
  category: string
  risk_level: string | null
  symptom_type: string | null
  title: string
  description: string
  implementation_steps: string[] | null
  priority: number
}

// ─── Hardcoded fallback ───────────────────────────────────────────────────────

const HARDCODED_FALLBACK: RecommendationOutput[] = [
  {
    title: 'Adjust your monitor distance',
    description:
      'Position your screen at arm\'s length (50–70 cm) and slightly below eye level to reduce neck and eye strain.',
    category: 'general',
  },
  {
    title: 'Maintain optimal screen brightness (60–80%)',
    description:
      'Keep your screen brightness between 60–80% to reduce glare and eye fatigue throughout the day.',
    category: 'brightness',
  },
  {
    title: 'Get 7–9 hours of sleep per night',
    description:
      'Adequate sleep is essential for eye recovery. Aim for 7–9 hours of quality sleep each night.',
    category: 'sleep',
  },
]

// ─── Helper ───────────────────────────────────────────────────────────────────

function toOutput(tip: WellnessTip): RecommendationOutput {
  return { title: tip.title, description: tip.description, category: tip.category }
}

// ─── Main function ────────────────────────────────────────────────────────────

/**
 * Selects personalised wellness recommendations for a user based on their
 * active symptoms, usage thresholds, and risk level.
 *
 * Always returns 3–8 items. Never throws — falls back to HARDCODED_FALLBACK
 * on any Supabase error or empty table.
 */
export async function selectRecommendations(
  input: RecommendationInput,
): Promise<RecommendationOutput[]> {
  try {
    const supabase = await createClient()

    const hasSymptoms =
      input.eyeStrain === 1 ||
      input.headaches === 1 ||
      input.blurryVision === 1 ||
      input.dryEyes === 1

    // ── Case A: No active symptoms → return top 3 general tips ──────────────
    if (!hasSymptoms) {
      const { data, error } = await supabase
        .from('wellness_tips')
        .select('*')
        .is('symptom_type', null)
        .order('priority', { ascending: false })
        .limit(3)

      if (error || !data || data.length === 0) {
        return HARDCODED_FALLBACK
      }
      // If fewer than 3 general tips exist, pad with hardcoded fallback items
      if (data.length < 3) {
        const mapped = data.map(toOutput)
        const needed = HARDCODED_FALLBACK.filter(
          (f) => !mapped.some((m) => m.title === f.title),
        )
        return [...mapped, ...needed].slice(0, 3)
      }
      return data.map(toOutput)
    }

    // ── Main algorithm ───────────────────────────────────────────────────────
    const candidateMap = new Map<string, WellnessTip>()

    const addTips = (tips: WellnessTip[] | null) => {
      if (!tips) return
      for (const tip of tips) {
        candidateMap.set(tip.id, tip)
      }
    }

    // Step 1: Symptom-matched tips
    const activeSymptoms: string[] = []
    if (input.eyeStrain === 1) activeSymptoms.push('eye_strain')
    if (input.headaches === 1) activeSymptoms.push('headaches')
    if (input.blurryVision === 1) activeSymptoms.push('blurry_vision')
    if (input.dryEyes === 1) activeSymptoms.push('dry_eyes')

    if (activeSymptoms.length > 0) {
      const { data } = await supabase
        .from('wellness_tips')
        .select('*')
        .in('symptom_type', activeSymptoms)
        .order('priority', { ascending: false })
      addTips(data as WellnessTip[])
    }

    // Step 2: Threshold-triggered tips
    if (input.screenTime > 8) {
      const { data } = await supabase
        .from('wellness_tips')
        .select('*')
        .eq('category', 'screen_time')
        .order('priority', { ascending: false })
        .limit(1)
      addTips(data as WellnessTip[])
    }

    if (input.sleepHours < 6) {
      const { data } = await supabase
        .from('wellness_tips')
        .select('*')
        .eq('category', 'sleep')
        .order('priority', { ascending: false })
        .limit(1)
      addTips(data as WellnessTip[])
    }

    if (input.brightness < 40 || input.brightness > 85) {
      const { data } = await supabase
        .from('wellness_tips')
        .select('*')
        .eq('category', 'brightness')
        .order('priority', { ascending: false })
        .limit(1)
      addTips(data as WellnessTip[])
    }

    // Step 3: Risk-level tips
    if (input.riskLevel) {
      const { data } = await supabase
        .from('wellness_tips')
        .select('*')
        .eq('risk_level', input.riskLevel)
        .order('priority', { ascending: false })
      addTips(data as WellnessTip[])
    }

    // Step 4: Always include at least one general tip
    {
      const { data } = await supabase
        .from('wellness_tips')
        .select('*')
        .is('symptom_type', null)
        .order('priority', { ascending: false })
        .limit(1)
      addTips(data as WellnessTip[])
    }

    // Step 5–6: Deduplicate (already done via Map) + sort by priority desc
    let result = Array.from(candidateMap.values()).sort(
      (a, b) => b.priority - a.priority,
    )

    // Step 7: Cap at 8
    if (result.length > 8) {
      result = result.slice(0, 8)
    }

    // Step 7: Fill to 3 if needed
    if (result.length < 3) {
      const existingIds = new Set(result.map((t) => t.id))
      const { data: generalTips } = await supabase
        .from('wellness_tips')
        .select('*')
        .is('symptom_type', null)
        .order('priority', { ascending: false })
        .limit(3)

      if (generalTips) {
        for (const tip of generalTips as WellnessTip[]) {
          if (!existingIds.has(tip.id)) {
            result.push(tip)
            existingIds.add(tip.id)
          }
          if (result.length >= 3) break
        }
      }
    }

    // Case C: Still fewer than 3 after fill → top 3 regardless of filters, then hardcoded fallback
    if (result.length < 3) {
      const { data: anyTips } = await supabase
        .from('wellness_tips')
        .select('*')
        .order('priority', { ascending: false })
        .limit(3)

      if (anyTips && anyTips.length >= 3) {
        return (anyTips as WellnessTip[]).map(toOutput)
      }
      // Table is empty or has too few tips — use hardcoded fallback
      return HARDCODED_FALLBACK
    }

    return result.map(toOutput)
  } catch (err) {
    console.error('[selectRecommendations] Unexpected error:', err)
    return HARDCODED_FALLBACK
  }
}
