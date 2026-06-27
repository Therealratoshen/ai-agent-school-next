import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const certId = req.nextUrl.searchParams.get('certificate_id')

  if (!certId) {
    return NextResponse.json({ success: false, error: 'certificate_id required' }, { status: 400 })
  }

  try {
    const supabase = await createServerClient(true)

    const { data, error } = await supabase
      .from('ai_school_graduations')
      .select(`
        id,
        certificate_id,
        graduated_at,
        failure_streak_at_graduation,
        lessons_completed,
        total_training_days,
        student:ai_school_students(name),
        enrollment:ai_school_enrollments(
          course:ai_school_courses(title, topic, difficulty)
        )
      `)
      .eq('certificate_id', certId)
      .maybeSingle()

    if (error || !data) {
      return NextResponse.json({ success: false, error: 'Certificate not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        valid: true,
        certificate_id: data.certificate_id,
        agent_name: (data.student as any)?.name || 'Anonymous Agent',
        course_title: (data.enrollment as any)?.course?.title || 'AI Agent School Course',
        graduated_at: data.graduated_at,
        lessons_completed: data.lessons_completed,
        streak_at_graduation: data.failure_streak_at_graduation,
        total_training_days: data.total_training_days || 1,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
