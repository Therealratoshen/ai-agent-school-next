/**
 * Agent Profile — Persistent identity and stats for individual AI agents.
 *
 * Each agent has one profile that survives sessions. Contains:
 * - Identity (name, bio, specialties)
 * - Capability stats (uptime, error rate, skills)
 * - Activity (sessions, last active)
 * - Model info (which LLM powers this agent)
 */

import { createServerClient } from '../../supabase/client'
import type { ToolResult } from './index'

// ─── Get or create agent profile ──────────────────────────────
export async function getAgentProfile(args: {
  agent_id: string
}): Promise<ToolResult> {
  try {
    const supabase = createServerClient(true)

    // Get profile
    const { data: profile } = await (supabase as any)
      .from('ai_school_agent_profiles')
      .select('*')
      .eq('agent_id', args.agent_id)
      .maybeSingle()

    if (profile) {
      // Update last_active_at
      await (supabase as any)
        .from('ai_school_agent_profiles')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', profile.id)

      // Get skill count
      const { count: skillCount } = await (supabase as any)
        .from('ai_school_verified_skills')
        .select('id', { count: 'exact', head: true })
        .eq('agent_id', args.agent_id)
        .eq('status', 'active')

      // Get memory count
      const { count: memoryCount } = await (supabase as any)
        .from('ai_school_agent_memories')
        .select('id', { count: 'exact', head: true })
        .eq('agent_id', args.agent_id)

      return {
        success: true,
        data: {
          agent_id: profile.agent_id,
          bio: profile.bio,
          specialties: profile.specialties || [],
          model_used: profile.model_used,
          stats: {
            verified_skills: skillCount ?? 0,
            memories_stored: memoryCount ?? 0,
            total_sessions: profile.total_sessions,
            total_errors: profile.total_errors,
            uptime_score: Math.round(profile.uptime_score * 100),
            mcp_tools_count: profile.mcp_tools_count,
          },
          last_active: profile.last_active_at,
          member_since: profile.created_at,
          message: `Agent profile loaded. Identity persists across sessions.`,
        },
      }
    }

    // No profile yet — create from agent record
    const { data: agent } = await (supabase as any)
      .from('ai_school_agents')
      .select('agent_id, agent_name')
      .eq('id', args.agent_id)
      .maybeSingle()

    if (!agent) return { success: false, error: 'Agent not found' }

    const { data: newProfile, error } = await (supabase as any)
      .from('ai_school_agent_profiles')
      .insert({
        agent_id: args.agent_id,
        bio: `AI agent: ${agent.agent_name}`,
        specialties: [],
        last_active_at: new Date().toISOString(),
      })
      .select('*')
      .single()

    if (error) throw error

    return {
      success: true,
      data: {
        agent_id: newProfile.agent_id,
        bio: newProfile.bio,
        specialties: newProfile.specialties || [],
        stats: {
          verified_skills: 0,
          memories_stored: 0,
          total_sessions: 0,
          total_errors: 0,
          uptime_score: 100,
          mcp_tools_count: 0,
        },
        last_active: newProfile.last_active_at,
        member_since: newProfile.created_at,
        message: 'New agent profile created. Complete courses and tasks to build your capability profile.',
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ─── Update agent profile ─────────────────────────────────────
export async function updateAgentProfile(args: {
  agent_id: string
  bio?: string
  specialties?: string[]
  model_used?: string
}): Promise<ToolResult> {
  try {
    const supabase = createServerClient(true)

    const updates: Record<string, unknown> = {}
    if (args.bio !== undefined) updates.bio = args.bio
    if (args.specialties !== undefined) updates.specialties = args.specialties
    if (args.model_used !== undefined) updates.model_used = args.model_used
    updates.last_active_at = new Date().toISOString()

    const { error } = await (supabase as any)
      .from('ai_school_agent_profiles')
      .update(updates)
      .eq('agent_id', args.agent_id)

    if (error) throw error

    return {
      success: true,
      data: {
        message: 'Agent profile updated. Changes persist across all future sessions.',
        updated_fields: Object.keys(updates).filter(k => k !== 'last_active_at'),
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ─── Record agent activity (heartbeat) ────────────────────────
export async function recordActivity(args: {
  agent_id: string
  session_id: string
  activity_type: 'task_start' | 'task_complete' | 'error' | 'learning' | 'chat'
  details?: string
}): Promise<ToolResult> {
  try {
    const supabase = createServerClient(true)
    const now = new Date().toISOString()

    // Update profile stats
    const { data: profile } = await (supabase as any)
      .from('ai_school_agent_profiles')
      .select('id, total_sessions, total_errors, uptime_score')
      .eq('agent_id', args.agent_id)
      .maybeSingle()

    if (profile) {
      const updates: Record<string, unknown> = {
        last_active_at: now,
        total_sessions: profile.total_sessions + (args.activity_type === 'task_start' ? 1 : 0),
        total_errors: profile.total_errors + (args.activity_type === 'error' ? 1 : 0),
      }

      // Recalculate uptime score
      const newErrors = profile.total_errors + (args.activity_type === 'error' ? 1 : 0)
      const newSessions = profile.total_sessions + (args.activity_type === 'task_start' ? 1 : 0)
      updates.uptime_score = newSessions > 0
        ? Math.max(0, Math.min(1, 1 - (newErrors / Math.max(1, newSessions))))
        : 1

      await (supabase as any)
        .from('ai_school_agent_profiles')
        .update(updates)
        .eq('id', profile.id)
    }

    // Store episodic memory for significant events
    if (['task_complete', 'error'].includes(args.activity_type)) {
      await (supabase as any)
        .from('ai_school_agent_memories')
        .insert({
          agent_id: args.agent_id,
          memory_type: 'episodic',
          content: `[${args.activity_type}] ${args.details || 'Activity recorded'} | session: ${args.session_id}`,
          summary: `${args.activity_type}: ${(args.details || 'Activity').slice(0, 100)}`,
          importance: args.activity_type === 'error' ? 8 : 5,
          metadata: { session_id: args.session_id, activity_type: args.activity_type },
        })
    }

    return {
      success: true,
      data: {
        session_id: args.session_id,
        activity_type: args.activity_type,
        message: 'Activity recorded. Your profile reflects this session.',
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ─── Get network leaderboard ──────────────────────────────────
export async function getLeaderboard(args: {
  limit?: number
  sort_by?: 'uptime' | 'skills' | 'knowledge' | 'sessions'
}): Promise<ToolResult> {
  try {
    const supabase = createServerClient(true)
    const limit = args.limit ?? 20

    // Get profiles with agent names
    const { data: profiles, error } = await (supabase as any)
      .from('ai_school_agent_profiles')
      .select('*')
      .order('uptime_score', { ascending: false })
      .limit(limit)

    if (error) throw error

    // Enrich with agent names
    const agentIds = (profiles || []).map((p: any) => p.agent_id)
    let agents: any[] = []
    if (agentIds.length > 0) {
      const { data: agentData } = await (supabase as any)
        .from('ai_school_agents')
        .select('id, agent_id, agent_name')
        .in('id', agentIds)
      agents = agentData || []
    }

    // Get verified skill counts in one query
    let skillCounts: Record<string, number> = {}
    if (agentIds.length > 0) {
      const { data: skillData } = await (supabase as any)
        .from('ai_school_verified_skills')
        .select('agent_id, id')
        .in('agent_id', agentIds)
        .eq('status', 'active')
      if (skillData) {
        for (const s of skillData) {
          skillCounts[s.agent_id] = (skillCounts[s.agent_id] || 0) + 1
        }
      }
    }

    const leaderboard = (profiles || []).map((p: any) => {
      const agentInfo = agents.find((a: any) => a.id === p.agent_id)
      return {
        agent_name: agentInfo?.agent_name || 'Unknown Agent',
        bio: p.bio,
        specialties: p.specialties || [],
        uptime_score: Math.round((p.uptime_score || 0) * 100),
        total_sessions: p.total_sessions || 0,
        total_errors: p.total_errors || 0,
        verified_skills: skillCounts[p.agent_id] || 0,
        last_active: p.last_active_at,
      }
    })

    // Sort by requested criterion
    const sortBy = args.sort_by || 'uptime'
    if (sortBy === 'uptime') {
      leaderboard.sort((a: any, b: any) => b.uptime_score - a.uptime_score)
    } else if (sortBy === 'skills') {
      leaderboard.sort((a: any, b: any) => b.verified_skills - a.verified_skills)
    } else if (sortBy === 'sessions') {
      leaderboard.sort((a: any, b: any) => b.total_sessions - a.total_sessions)
    }

    return {
      success: true,
      data: {
        leaderboard,
        total_agents: profiles?.length || 0,
        sort_by: sortBy,
        message: 'Network leaderboard. Top agents by verified capability.',
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}