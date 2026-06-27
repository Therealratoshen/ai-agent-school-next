import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createHash } from 'crypto'

// Temporary admin migration route
// Call POST /api/admin/migrate?secret=migrate-now to run
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  if (searchParams.get('secret') !== 'migrate-now') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServerClient(true)
  const results: Record<string, string> = {}
  const tryOp = async (label: string, fn: () => Promise<void>) => {
    try {
      await fn()
      results[label] = 'ok'
    } catch (e: any) {
      results[label] = e.message || String(e)
    }
  }

  const courseId = 'b2c3d4e5-f6a7-8901-bcde-f23456789012'
  const teacherId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

  // 1. Create teacher
  await tryOp('teacher', async () => {
    await supabase.from('ai_school_teachers').upsert({
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
    }, { onConflict: 'id' })
  })

  // 2. Ensure Cron Job Handling course
  await tryOp('course', async () => {
    await supabase.from('ai_school_courses').upsert({
      id: courseId,
      teacher_id: teacherId,
      title: 'Cron Job Handling',
      description: 'Learn how to handle cron jobs properly, detect silent failures, and implement auto-recovery. Covers best practices for scheduling and monitoring recurring tasks in AI agent workflows.',
      topic: 'cron_handling',
      difficulty: 'beginner',
      status: 'published',
      enrollment_count: 12,
      published_at: new Date().toISOString(),
    }, { onConflict: 'id' })
  })

  // 3. Seed ai_school_api_keys with a test key if table is empty
  await tryOp('seed_api_keys', async () => {
    const { count } = await supabase
      .from('ai_school_api_keys')
      .select('id', { count: 'exact', head: true })
    if ((count ?? 0) === 0) {
      const hashedKey = createHash('sha256').update('test_api_key_placeholder').digest('hex')
      await supabase.from('ai_school_api_keys').insert({
        agent_id: '__system__',
        agent_name: 'System Setup Key',
        hashed_api_key: hashedKey,
      })
    }
  })

  // 4. Publish draft courses
  await tryOp('publish_draft', async () => {
    await supabase.from('ai_school_courses')
      .update({ status: 'published' })
      .eq('status', 'draft')
  })

  return NextResponse.json({ success: true, results })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  if (searchParams.get('secret') !== 'migrate-now') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServerClient(true)

  const { count: agents } = await supabase.from('ai_school_agents').select('id', { count: 'exact', head: true })
  const { count: courses } = await supabase.from('ai_school_courses').select('id', { count: 'exact', head: true }).eq('status', 'published')
  const { count: enrollments } = await supabase.from('ai_school_enrollments').select('id', { count: 'exact', head: true })
  const { count: apiKeys } = await supabase.from('ai_school_api_keys').select('id', { count: 'exact', head: true })

  return NextResponse.json({
    success: true,
    counts: {
      agents: agents ?? 0,
      publishedCourses: courses ?? 0,
      enrollments: enrollments ?? 0,
      apiKeys: apiKeys ?? 0,
    },
    hasServiceRoleKey: !!(process.env.SUPABASE_SERVICE_ROLE_KEY_SHORTCUT || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  })
}
