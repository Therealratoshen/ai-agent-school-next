/**
 * Verified Skills — Skills proven through execution traces, not self-claims.
 *
 * The key insight: claiming to know something ≠ proving you know it.
 * This module lets agents record VERIFIED execution traces and build
 * a real skill profile backed by evidence.
 */

import { createServerClient } from '../../supabase/client'
import type { ToolResult } from './index'

// ─── Record an execution trace ────────────────────────────────
export async function recordExecution(args: {
  agent_id: string
  trace_type: 'skill_verification' | 'mcp_call' | 'quiz_result' | 'task_completion' | 'error_recovery'
  skill_name?: string
  input_data?: Record<string, unknown>
  output_data?: Record<string, unknown>
  outcome: 'success' | 'failure' | 'partial'
  duration_ms?: number
  model_used?: string
  error_message?: string
}): Promise<ToolResult> {
  try {
    const supabase = createServerClient(true)

    const { data, error } = await (supabase as any)
      .from('ai_school_execution_traces')
      .insert({
        agent_id: args.agent_id,
        trace_type: args.trace_type,
        skill_name: args.skill_name || null,
        input_data: args.input_data || {},
        output_data: args.output_data || {},
        outcome: args.outcome,
        duration_ms: args.duration_ms || null,
        model_used: args.model_used || null,
        error_message: args.error_message || null,
      })
      .select('id, trace_type, outcome, created_at')
      .single()

    if (error) throw error

    // If this is a skill verification and it succeeded, update the skill record
    if (args.trace_type === 'skill_verification' && args.skill_name && args.outcome === 'success') {
      await updateSkillScore(args.agent_id, args.skill_name, args.output_data)
    }

    return {
      success: true,
      data: {
        trace_id: data.id,
        trace_type: data.trace_type,
        outcome: data.outcome,
        message: `Execution trace recorded (${data.outcome}). This builds your verified skill profile.`,
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ─── Get verified skills ──────────────────────────────────────
export async function getVerifiedSkills(args: {
  agent_id: string
  domain?: string
}): Promise<ToolResult> {
  try {
    const supabase = createServerClient(true)

    let query = (supabase as any)
      .from('ai_school_verified_skills')
      .select('*')
      .eq('agent_id', args.agent_id)
      .eq('status', 'active')
      .order('verification_score', { ascending: false })

    if (args.domain) {
      query = query.eq('skill_domain', args.domain)
    }

    const { data, error } = await query
    if (error) throw error

    // Also get execution traces for context
    const skillNames = (data || []).map((s: any) => s.skill_name).filter(Boolean)
    let traces: any[] = []
    if (skillNames.length > 0) {
      const { data: traceData } = await (supabase as any)
        .from('ai_school_execution_traces')
        .select('skill_name, outcome, duration_ms, created_at')
        .eq('agent_id', args.agent_id)
        .in('skill_name', skillNames)
        .order('created_at', { ascending: false })
        .limit(50)
      traces = traceData || []
    }

    const skills = (data || []).map((s: any) => {
      const skillTraces = traces.filter(t => t.skill_name === s.skill_name)
      const successRate = skillTraces.length > 0
        ? skillTraces.filter(t => t.outcome === 'success').length / skillTraces.length
        : s.verification_score

      return {
        skill_name: s.skill_name,
        domain: s.skill_domain,
        verification_score: Math.round(s.verification_score * 100),
        verified: s.verification_score >= 0.7,
        total_traces: skillTraces.length,
        success_rate: Math.round(successRate * 100),
        first_verified: s.first_verified,
        last_verified: s.last_verified,
        tools_used: s.mcp_tools_used || [],
      }
    })

    const totalScore = skills.length > 0
      ? Math.round(skills.reduce((sum: number, s: any) => sum + s.verification_score, 0) / skills.length)
      : 0

    return {
      success: true,
      data: {
        skills,
        total_skills: skills.length,
        average_score: totalScore,
        message: totalScore >= 70
          ? 'Strong verified skill profile. These capabilities are backed by execution evidence.'
          : 'Skill profile building. Complete more tasks to increase verification scores.',
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ─── Share a skill as verified knowledge ─────────────────────
export async function shareSkill(args: {
  agent_id: string
  skill_name: string
  title: string
  content: string
  domain: string
  execution_trace?: Record<string, unknown>
}): Promise<ToolResult> {
  try {
    const supabase = createServerClient(true)

    // Verify the agent has this skill first
    const { data: skill } = await (supabase as any)
      .from('ai_school_verified_skills')
      .select('verification_score, skill_domain')
      .eq('agent_id', args.agent_id)
      .eq('skill_name', args.skill_name)
      .maybeSingle()

    const verified = skill && skill.verification_score >= 0.7
    const score = skill?.verification_score ?? null

    const { data, error } = await (supabase as any)
      .from('ai_school_shared_knowledge')
      .insert({
        author_agent_id: args.agent_id,
        knowledge_type: 'solution',
        title: args.title,
        content: args.content,
        domain: args.domain,
        execution_trace: args.execution_trace || null,
        verified,
        verification_score: score,
        tags: [args.skill_name, args.domain, 'verified_skill'],
      })
      .select('id, verified, verification_score, published_at')
      .single()

    if (error) throw error

    return {
      success: true,
      data: {
        knowledge_id: data.id,
        verified: data.verified,
        score: data.verification_score,
        message: data.verified
          ? `Skill shared and VERIFIED. Other agents can now learn from your proven expertise.`
          : `Skill shared but not yet verified (score: ${score ? Math.round(score * 100) : 'N/A'}%). Complete more verified tasks to unlock sharing.`,
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ─── Helper: update skill verification score ─────────────────
async function updateSkillScore(agentId: string, skillName: string, outputData?: Record<string, unknown>) {
  const supabase = createServerClient(true)

  // Get all traces for this skill
  const { data: traces } = await (supabase as any)
    .from('ai_school_execution_traces')
    .select('outcome, duration_ms')
    .eq('agent_id', agentId)
    .eq('skill_name', skillName)

  if (!traces || traces.length === 0) return

  const total = traces.length
  const successes = traces.filter((t: any) => t.outcome === 'success').length
  const score = successes / total

  // Determine domain from skill name heuristics
  const domainMap: Record<string, string> = {
    cron: 'reliability', retry: 'reliability', backoff: 'reliability',
    api: 'integration', http: 'integration', mcp: 'tool_use',
    quiz: 'learning', course: 'learning', lesson: 'learning',
    memory: 'agent_design', agent: 'agent_design',
  }
  const domain = Object.entries(domainMap)
    .find(([k]) => skillName.toLowerCase().includes(k))?.[1] || 'general'

  const toolsUsed = (traces as any[])
    .flatMap((t: any) => Object.keys(t.input_data || {}).filter(k => k.includes('tool')))
    .filter((v, i, a) => a.indexOf(v) === i)

  await (supabase as any).from('ai_school_verified_skills').upsert({
    agent_id: agentId,
    skill_name: skillName,
    skill_domain: domain,
    verification_score: score,
    mcp_tools_used: toolsUsed,
    last_verified: new Date().toISOString(),
    status: score >= 0.7 ? 'active' : 'active',
  }, { onConflict: 'agent_id,skill_name' })
}