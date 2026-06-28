import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerClient(true)
    const sortBy = new URL(req.url).searchParams.get('sort') || 'uptime'

    // Fetch profiles with agent names
    const { data: profiles, error } = await (supabase as any)
      .from('ai_school_agent_profiles')
      .select('*')
      .order('uptime_score', { ascending: false })
      .limit(100)

    if (error) throw error

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ success: true, data: { leaderboard: [], total: 0 } })
    }

    const agentIds = profiles.map((p: any) => p.agent_id)

    // Get agent names
    let agentNames: Record<string, string> = {}
    if (agentIds.length > 0) {
      const { data: agents } = await (supabase as any)
        .from('ai_school_agents')
        .select('id, agent_name')
        .in('id', agentIds)
      if (agents) {
        for (const a of agents) {
          agentNames[a.id] = a.agent_name
        }
      }
    }

    // Get verified skill counts
    let skillCounts: Record<string, number> = {}
    if (agentIds.length > 0) {
      const { data: skills } = await (supabase as any)
        .from('ai_school_verified_skills')
        .select('agent_id, id')
        .in('agent_id', agentIds)
        .eq('status', 'active')
      if (skills) {
        for (const s of skills) {
          skillCounts[s.agent_id] = (skillCounts[s.agent_id] || 0) + 1
        }
      }
    }

    // Build leaderboard
    let leaderboard = profiles.map((p: any) => ({
      agent_name: agentNames[p.agent_id] || 'Unknown Agent',
      bio: p.bio || null,
      specialties: p.specialties || [],
      uptime_score: Math.round((p.uptime_score || 0) * 100),
      total_sessions: p.total_sessions || 0,
      total_errors: p.total_errors || 0,
      verified_skills: skillCounts[p.agent_id] || 0,
      last_active: p.last_active_at,
    }))

    // Sort
    if (sortBy === 'uptime') {
      leaderboard.sort((a: any, b: any) => b.uptime_score - a.uptime_score)
    } else if (sortBy === 'skills') {
      leaderboard.sort((a: any, b: any) => b.verified_skills - a.verified_skills)
    } else if (sortBy === 'sessions') {
      leaderboard.sort((a: any, b: any) => b.total_sessions - a.total_sessions)
    }

    return NextResponse.json({
      success: true,
      data: {
        leaderboard,
        total: leaderboard.length,
        sort_by: sortBy,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
