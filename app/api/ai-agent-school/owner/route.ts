import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { hashApiKey, generateApiKey } from '@/lib/mcp/auth'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseAdmin = await createServerClient(true)

    // Get all agents for this user
    const { data: agents } = await supabaseAdmin
      .from('ai_school_agents')
      .select('*')
      .eq('supabase_user_id', user.id)
      .order('created_at', { ascending: false })

    // Get enrollments with course and teacher info
    const { data: enrollments } = await supabaseAdmin
      .from('ai_school_enrollments')
      .select(`
        id,
        status,
        progress,
        lessons_completed,
        quizzes_passed,
        enrolled_at,
        completed_at,
        course:ai_school_courses!inner(id, title, difficulty),
        teacher:ai_school_teachers(id, name)
      `)
      .in('student_id',
        (agents || []).map((a: any) => a.student_id).filter(Boolean)
      ) as { data: any[] }

    // Get graduations
    const { data: graduations } = await supabaseAdmin
      .from('ai_school_graduations')
      .select('*')
      .in('student_id', (agents || []).map((a: any) => a.student_id).filter(Boolean))

    // Get all available courses
    const { data: courses } = await supabaseAdmin
      .from('ai_school_courses')
      .select(`
        id, title, description, difficulty, enrollment_count,
        teacher:ai_school_teachers(id, name)
      `)
      .eq('status', 'published')

    return NextResponse.json({
      success: true,
      data: {
        agents: agents || [],
        enrollments: enrollments || [],
        graduations: (graduations || []).map((g: any) => ({
          ...g,
          course_title: (enrollments?.find((e: any) => e.id === g.enrollment_id)?.course as any)?.title,
        })),
        courses: (courses || []).map((c: any) => ({
          id: c.id,
          title: c.title,
          description: c.description,
          difficulty: c.difficulty,
          enrollment_count: c.enrollment_count,
          teacher: c.teacher ? { name: c.teacher.name } : null,
        })),
      },
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { agent_id, agent_name } = body

    if (!agent_id || typeof agent_id !== 'string' || !agent_name || typeof agent_name !== 'string') {
      return NextResponse.json({ success: false, error: 'agent_id and agent_name required' }, { status: 400 })
    }

    const supabaseAdmin = await createServerClient(true)

    // Check if already exists
    const { data: existing } = await supabaseAdmin
      .from('ai_school_agents')
      .select('id')
      .eq('agent_id', agent_id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ success: false, error: 'Agent ID already exists' }, { status: 409 })
    }

    // Create agent
    const rawKey = generateApiKey('aas')
    const { data: agent, error } = await supabaseAdmin
      .from('ai_school_agents')
      .insert({
        agent_id: agent_id,
        agent_name: agent_name,
        hashed_api_key: hashApiKey(rawKey),
        supabase_user_id: user.id,
      })
      .select('id, agent_id, agent_name, created_at')
      .single()

    if (error || !agent) {
      return NextResponse.json({ success: false, error: error?.message || 'Failed to create agent' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: agent.id,
        agent_id: agent.agent_id,
        agent_name: agent.agent_name,
        api_key: rawKey,
        created_at: agent.created_at,
      },
    }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
