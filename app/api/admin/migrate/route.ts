import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uhramomdceifuolecrpu.supabase.co'
const SERVICE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY_SHORTCUT || ''

const courseId = 'b2c3d4e5-f6a7-8901-bcde-f23456789012'
const teacherId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

// ─── SQL Migration via REST API ─────────────────────────────────
async function runMigrationSQL(sql: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  })

  if (res.ok) return { success: true, message: 'Executed' }

  const err = await res.text()
  // exec_sql RPC might not exist yet — fall back to status message
  if (res.status === 404 || err.includes('does not exist')) {
    return {
      success: false,
      message: 'exec_sql RPC not available — run migration manually in Supabase Dashboard → SQL Editor. Paste the contents of supabase/migrations/002_agent_memory_and_skills.sql and click Run.',
    }
  }

  return { success: false, message: err.slice(0, 200) }
}

// ─── Read migration file ────────────────────────────────────────
function getMigrationSQL(): string {
  try {
    const fs = require('fs')
    const path = require('path')
    const filePath = path.join(process.cwd(), 'supabase', 'migrations', '002_agent_memory_and_skills.sql')
    return fs.readFileSync(filePath, 'utf-8')
  } catch {
    return ''
  }
}

// GET /api/admin/migrate?secret=migrate-now — status check
export async function GET(req: NextRequest) {
  if (new URL(req.url).searchParams.get('secret') !== 'migrate-now') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tables = [
    'ai_school_agents', 'ai_school_courses', 'ai_school_enrollments', 'ai_school_api_keys',
    'ai_school_agent_memories', 'ai_school_verified_skills', 'ai_school_shared_knowledge',
    'ai_school_agent_profiles', 'ai_school_skill_certificates', 'ai_school_agent_chats',
    'ai_school_execution_traces',
  ]

  const results: Record<string, unknown> = {}
  const migrationSQL = getMigrationSQL()

  for (const table of tables) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/${table}?select=id&limit=1`,
        {
          headers: {
            'apikey': SERVICE_KEY,
            'Authorization': `Bearer ${SERVICE_KEY}`,
          },
        }
      )
      results[table] = res.ok ? (res.headers.get('content-count') ? parseInt(res.headers.get('content-count')!) : 'exists') : -1
    } catch {
      results[table] = -1
    }
  }

  // Check if new tables exist
  const newTables = ['ai_school_agent_memories', 'ai_school_verified_skills', 'ai_school_shared_knowledge']
  const newTablesExist = newTables.every(t => results[t] !== undefined && results[t] !== -1)

  return NextResponse.json({
    tables: results,
    newTablesExist,
    needsMigration: !newTablesExist,
    migrationSQLPresent: !!migrationSQL,
    instruction: !newTablesExist
      ? 'Run supabase/migrations/002_agent_memory_and_skills.sql in Supabase Dashboard → SQL Editor first. Click "Run" to create all 7 new tables.'
      : 'All tables exist. POST to this endpoint to seed data.',
  })
}

// POST /api/admin/migrate?secret=migrate-now — run migration + seed
export async function POST(req: NextRequest) {
  if (new URL(req.url).searchParams.get('secret') !== 'migrate-now') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: Record<string, string> = {}
  const migrationSQL = getMigrationSQL()

  // Step 1: Try to run migration via RPC
  if (migrationSQL) {
    const migResult = await runMigrationSQL(migrationSQL)
    results['migration'] = migResult.success ? 'ok' : migResult.message
  }

  // Step 2: Seed data via REST API
  const seedResults = await seedData()
  Object.assign(results, seedResults)

  return NextResponse.json({ success: true, results })
}

// ─── Seed all data via REST API ─────────────────────────────────
async function seedData(): Promise<Record<string, string>> {
  const results: Record<string, string> = {}

  const rest = async (table: string, method: 'POST' | 'PATCH', body: Record<string, unknown>, params?: string) => {
    const url = `${SUPABASE_URL}/rest/v1/${table}${params ? `?${params}` : ''}`
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Prefer': method === 'POST' ? 'resolution=merge-duplicates' : '',
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await res.text()
      return err.slice(0, 100)
    }
    return 'ok'
  }

  // Teacher
  try {
    results['teacher'] = await rest('ai_school_teachers', 'POST', {
      id: teacherId,
      name: 'Production Reliability Expert',
      email: 'teacher@aiagentschool.dev',
      description: 'Expert in cron job handling, error recovery, and production monitoring.',
      llm_provider: 'openai',
      status: 'certified',
      rating_avg: 4.85,
      review_count: 12,
      total_students: 45,
      total_courses: 1,
    }, 'onConflict=id')
  } catch (e: any) { results['teacher'] = e.message }

  // Course 1 — Cron Job Handling
  try {
    results['course1_cron'] = await rest('ai_school_courses', 'POST', {
      id: courseId,
      teacher_id: teacherId,
      title: 'Cron Job Handling',
      description: 'Learn how to handle cron jobs properly, detect silent failures, and implement auto-recovery.',
      topic: 'cron_handling',
      difficulty: 'beginner',
      status: 'published',
      enrollment_count: 12,
      published_at: new Date().toISOString(),
    }, 'onConflict=id')
  } catch (e: any) { results['course1_cron'] = e.message }

  // Course 2 — API Error Recovery
  try {
    results['course2_api_error'] = await rest('ai_school_courses', 'POST', {
      id: 'c2-0001-0002-0002-000000000002',
      teacher_id: teacherId,
      title: 'API Error Recovery',
      description: 'Master the art of handling API failures gracefully. Exponential backoff, circuit breakers, bulkhead patterns, and graceful degradation.',
      topic: 'api_error_recovery',
      difficulty: 'intermediate',
      status: 'published',
      enrollment_count: 0,
      published_at: new Date().toISOString(),
    }, 'onConflict=id')
  } catch (e: any) { results['course2_api_error'] = e.message }

  // Course 3 — Multi-Agent Coordination
  try {
    results['course3_multi_agent'] = await rest('ai_school_courses', 'POST', {
      id: 'c3-0001-0003-0003-000000000003',
      teacher_id: teacherId,
      title: 'Multi-Agent Coordination',
      description: 'Build and orchestrate multiple AI agents that work together. Task decomposition, inter-agent communication, conflict resolution, and scalable architectures.',
      topic: 'multi_agent_coordination',
      difficulty: 'advanced',
      status: 'published',
      enrollment_count: 0,
      published_at: new Date().toISOString(),
    }, 'onConflict=id')
  } catch (e: any) { results['course3_multi_agent'] = e.message }

  // Publish all draft courses
  try {
    await fetch(
      `${SUPABASE_URL}/rest/v1/ai_school_courses?status=eq.draft`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({ status: 'published', published_at: new Date().toISOString() }),
      }
    )
    results['draftCourses'] = 'ok'
  } catch (e: any) { results['draftCourses'] = e.message }

  // Test agent profile
  try {
    results['agentProfile'] = await rest('ai_school_agent_profiles', 'POST', {
      agent_id: '42c55cb8-6061-4202-af23-1a581b8bf546',
      bio: 'Test agent for AI Agent School development.',
      specialties: ['cron_handling', 'api_error_recovery'],
      model_used: 'gpt-4o-mini',
      mcp_tools_count: 24,
      total_sessions: 5,
      uptime_score: 0.95,
      last_active_at: new Date().toISOString(),
    }, 'onConflict=agent_id')
  } catch (e: any) { results['agentProfile'] = e.message }

  return results
}
