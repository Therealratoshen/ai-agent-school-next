import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createHash } from 'crypto'

const courseId = 'b2c3d4e5-f6a7-8901-bcde-f23456789012'
const teacherId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

// GET /api/admin/migrate?secret=migrate-now — status check
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  if (searchParams.get('secret') !== 'migrate-now') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServerClient(true)

  const check = async (table: string) => {
    try {
      const { count } = await (supabase as any)
        .from(table)
        .select('id', { count: 'exact', head: true })
      return count ?? 0
    } catch { return -1 }
  }

  return NextResponse.json({
    tables: {
      agents:             await check('ai_school_agents'),
      courses:            await check('ai_school_courses'),
      enrollments:        await check('ai_school_enrollments'),
      apiKeys:            await check('ai_school_api_keys'),
      agentMemories:      await check('ai_school_agent_memories'),
      verifiedSkills:     await check('ai_school_verified_skills'),
      sharedKnowledge:    await check('ai_school_shared_knowledge'),
      agentProfiles:      await check('ai_school_agent_profiles'),
      skillCertificates:  await check('ai_school_skill_certificates'),
      agentChats:         await check('ai_school_agent_chats'),
      executionTraces:    await check('ai_school_execution_traces'),
    },
    instruction: 'Run supabase/migrations/002_agent_memory_and_skills.sql in Supabase Dashboard → SQL Editor first.'
  })
}

// POST /api/admin/migrate?secret=migrate-now — seed data
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  if (searchParams.get('secret') !== 'migrate-now') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServerClient(true)
  const results: Record<string, string> = {}
  const tryOp = async (label: string, fn: () => Promise<void>) => {
    try { await fn(); results[label] = 'ok' }
    catch (e: any) { results[label] = e.message || String(e) }
  }

  await tryOp('teacher', async () => {
    await (supabase as any).from('ai_school_teachers').upsert({
      id: teacherId, name: 'Production Reliability Expert',
      email: 'teacher@aiagentschool.dev',
      description: 'Expert in cron job handling, error recovery, and production monitoring.',
      llm_provider: 'openai', status: 'certified',
      rating_avg: 4.85, review_count: 12, total_students: 45, total_courses: 1,
    }, { onConflict: 'id' })
  })

  await tryOp('course', async () => {
    await (supabase as any).from('ai_school_courses').upsert({
      id: courseId, teacher_id: teacherId,
      title: 'Cron Job Handling',
      description: 'Learn how to handle cron jobs properly, detect silent failures, and implement auto-recovery.',
      topic: 'cron_handling', difficulty: 'beginner', status: 'published',
      enrollment_count: 12, published_at: new Date().toISOString(),
    }, { onConflict: 'id' })
  })

  await tryOp('apiKeys', async () => {
    const { count } = await (supabase as any)
      .from('ai_school_api_keys').select('id', { count: 'exact', head: true })
    if ((count ?? 0) === 0) {
      const hashedKey = createHash('sha256').update('test_api_key_placeholder').digest('hex')
      await (supabase as any).from('ai_school_api_keys').insert({
        agent_id: '__system__', agent_name: 'System Setup Key',
        hashed_api_key: hashedKey,
      })
    }
  })

  await tryOp('draftCourses', async () => {
    await (supabase as any).from('ai_school_courses')
      .update({ status: 'published' }).eq('status', 'draft')
  })

  // Seed 2 additional courses (API Error Recovery + Multi-Agent Coordination)
  const course2Id = 'c2-0001-0002-0002-000000000002'
  const course3Id = 'c3-0001-0003-0003-000000000003'

  await tryOp('course2_api_error', async () => {
    await (supabase as any).from('ai_school_courses').upsert({
      id: course2Id, teacher_id: teacherId,
      title: 'API Error Recovery',
      description: 'Master the art of handling API failures gracefully. Learn exponential backoff, circuit breakers, bulkhead patterns, and graceful degradation.',
      topic: 'api_error_recovery', difficulty: 'intermediate', status: 'published',
      enrollment_count: 0, published_at: new Date().toISOString(),
    }, { onConflict: 'id' })
  })

  await tryOp('course3_multi_agent', async () => {
    await (supabase as any).from('ai_school_courses').upsert({
      id: course3Id, teacher_id: teacherId,
      title: 'Multi-Agent Coordination',
      description: 'Build and orchestrate multiple AI agents that work together. Covers task decomposition, agent communication, conflict resolution, and scalable architectures.',
      topic: 'multi_agent_coordination', difficulty: 'advanced', status: 'published',
      enrollment_count: 0, published_at: new Date().toISOString(),
    }, { onConflict: 'id' })
  })

  // Create agent profile for test agent
  const testAgentId = '42c55cb8-6061-4202-af23-1a581b8bf546' // test-agent UUID
  await tryOp('agentProfile', async () => {
    await (supabase as any).from('ai_school_agent_profiles').upsert({
      agent_id: testAgentId,
      bio: 'Test agent for AI Agent School development.',
      specialties: ['cron_handling', 'api_error_recovery'],
      model_used: 'gpt-4o-mini',
      mcp_tools_count: 11,
      total_sessions: 5,
      uptime_score: 0.95,
      last_active_at: new Date().toISOString(),
    }, { onConflict: 'agent_id' })
  })

  return NextResponse.json({ success: true, results })
}
