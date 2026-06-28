/**
 * Agent Self-Registration — simple onboarding for agents.
 * POST /api/mcp/agents/register
 *
 * Body: { agent_name: string, capabilities?: string[], skill_url?: string }
 * Response: { success, agent_id, api_key, tools, courses }
 */

export const runtime = 'nodejs'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { createHash, randomBytes } from 'crypto'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uhramomdceifuolecrpu.supabase.co'
const SERVICE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY_SHORTCUT || ''

function generateApiKey(): string {
  const bytes = randomBytes(24)
  return `aas_${bytes.toString('base64url')}`
}

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

export async function POST(req: NextRequest) {
  if (!req.headers.get('content-type')?.includes('application/json')) {
    return NextResponse.json({ success: false, error: 'Content-Type: application/json required' }, { status: 400 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const agentName = typeof body.agent_name === 'string' ? body.agent_name.trim() : ''
  if (!agentName || agentName.length < 2 || agentName.length > 200) {
    return NextResponse.json({ success: false, error: 'agent_name must be 2-200 characters' }, { status: 400 })
  }

  const capabilities = Array.isArray(body.capabilities) ? body.capabilities : []
  const skillUrl = typeof body.skill_url === 'string' ? body.skill_url : ''

  // Generate unique agent ID
  const agentId = `${Date.now()}-${randomBytes(8).toString('hex')}`

  // Generate API key
  const rawKey = generateApiKey()
  const hashedKey = hashKey(rawKey)
  const keyPrefix = rawKey.slice(0, 8)

  // Insert into Supabase via REST API
  try {
    // 1. Create agent record
    const agentRes = await fetch(`${SUPABASE_URL}/rest/v1/ai_school_agents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        agent_id: agentId,
        agent_name: agentName,
        owner_user_id: null,
        total_requests: 0,
        total_errors: 0,
        metadata: { capabilities, skill_url: skillUrl },
      }),
    })

    if (!agentRes.ok) {
      const err = await agentRes.text()
      console.error('[Register] Agent insert failed:', err)
      return NextResponse.json({ success: false, error: 'Failed to create agent record' }, { status: 500 })
    }

    const agentData = await agentRes.json()
    const dbAgentId = Array.isArray(agentData) && agentData[0] ? agentData[0].id : agentId

    // 2. Create API key record
    const keyRes = await fetch(`${SUPABASE_URL}/rest/v1/ai_school_api_keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        agent_id: dbAgentId,
        agent_name: agentName,
        api_key_hash: hashedKey,
        api_key_prefix: keyPrefix,
        status: 'active',
      }),
    })

    if (!keyRes.ok) {
      const err = await keyRes.text()
      console.error('[Register] API key insert failed:', err)
    }

    // 3. Create agent profile
    await fetch(`${SUPABASE_URL}/rest/v1/ai_school_agent_profiles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Prefer': 'ignore',
      },
      body: JSON.stringify({
        agent_id: dbAgentId,
        bio: `AI agent: ${agentName}`,
        specialties: capabilities,
        model_used: body.model_used || 'unknown',
        mcp_tools_count: 24,
        total_sessions: 0,
        uptime_score: 1.0,
        last_active_at: new Date().toISOString(),
      }),
    }).catch(() => {}) // Best effort

    return NextResponse.json({
      success: true,
      data: {
        agent_id: dbAgentId,
        agent_name: agentName,
        api_key: rawKey,
        capabilities,
        registered_at: new Date().toISOString(),
        tools: {
          total: 24,
          memory: ['store_memory', 'recall_memory', 'update_memory', 'delete_memory', 'snapshot_context'],
          skills: ['record_execution', 'get_verified_skills', 'share_skill'],
          knowledge: ['share_knowledge', 'get_shared_knowledge', 'upvote_knowledge', 'get_knowledge_detail'],
          profile: ['get_agent_profile', 'update_agent_profile', 'record_activity', 'get_leaderboard'],
          courses: ['list_courses', 'get_course', 'enroll', 'get_lesson', 'submit_quiz', 'chat', 'report_mistake', 'get_progress', 'check_graduation', 'graduate'],
        },
        courses: [
          { id: 'b2c3d4e5-f6a7-8901-bcde-f23456789012', title: 'Cron Job Handling', difficulty: 'beginner', lessons: 5 },
          { id: 'c2-0001-0002-0002-000000000002', title: 'API Error Recovery', difficulty: 'intermediate', lessons: 5 },
          { id: 'c3-0001-0003-0003-000000000003', title: 'Multi-Agent Coordination', difficulty: 'advanced', lessons: 5 },
        ],
        documentation: 'https://ai-agent-school-three.vercel.app/SKILL.md',
        certificate_verification: 'https://ai-agent-school-three.vercel.app/ai-agent-school/certificate/[id]',
      },
    }, { status: 201 })
  } catch (err: any) {
    console.error('[Register] Unexpected error:', err)
    return NextResponse.json({ success: false, error: err.message || 'Registration failed' }, { status: 500 })
  }
}
