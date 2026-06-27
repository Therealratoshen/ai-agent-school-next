import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// Temporary admin debug + migration route
// Delete after running
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  if (searchParams.get('secret') !== 'migrate-now') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServerClient(true)

  // Try simple raw query
  const { data, error, status } = await supabase
    .from('ai_school_courses')
    .select('id, title, status')
    .limit(5)

  const { count: agentCount } = await supabase
    .from('ai_school_agents')
    .select('id', { count: 'exact', head: true })

  const { count: courseCount } = await supabase
    .from('ai_school_courses')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published')

  const { count: enrollmentCount } = await supabase
    .from('ai_school_enrollments')
    .select('id', { count: 'exact', head: true })

  return NextResponse.json({
    success: true,
    debug: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceRoleKey: !!(process.env.SUPABASE_SERVICE_ROLE_KEY_SHORTCUT),
      hasAnonKey: !!(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    },
    queryResult: { data, error, status },
    counts: {
      agents: agentCount ?? 0,
      publishedCourses: courseCount ?? 0,
      enrollments: enrollmentCount ?? 0,
    }
  })
}

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

  await tryOp('course', async () => {
    await supabase.from('ai_school_courses').upsert({
      id: courseId,
      teacher_id: teacherId,
      title: 'Cron Job Handling',
      description: 'Learn how to handle cron jobs properly, detect silent failures, and implement auto-recovery.',
      topic: 'cron_handling',
      difficulty: 'beginner',
      status: 'published',
      enrollment_count: 12,
      published_at: new Date().toISOString(),
    }, { onConflict: 'id' })
  })

  await tryOp('publish_draft', async () => {
    await supabase.from('ai_school_courses')
      .update({ status: 'published' })
      .eq('status', 'draft')
  })

  return NextResponse.json({ success: true, results })
}
