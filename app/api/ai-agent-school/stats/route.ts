import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// Public stats API — no auth required
export async function GET() {
  try {
    const supabase = await createServerClient()

    const [
      { count: totalAgents },
      { count: totalEnrollments },
      { count: totalGraduations },
      { count: totalCourses },
    ] = await Promise.all([
      supabase.from('ai_school_agents').select('*', { count: 'exact', head: true }),
      supabase.from('ai_school_enrollments').select('*', { count: 'exact', head: true }),
      supabase.from('ai_school_graduations').select('*', { count: 'exact', head: true }),
      supabase.from('ai_school_courses').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    ])

    const { data: topCourses } = await supabase
      .from('ai_school_courses')
      .select('id, title, enrollment_count, difficulty')
      .eq('status', 'published')
      .order('enrollment_count', { ascending: false })
      .limit(5)

    const { data: recentGraduates } = await supabase
      .from('ai_school_graduations')
      .select('certificate_id, graduated_at, course_id')
      .order('graduated_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      success: true,
      data: {
        total_agents: totalAgents || 0,
        total_enrollments: totalEnrollments || 0,
        total_graduations: totalGraduations || 0,
        total_courses: totalCourses || 0,
        top_courses: topCourses || [],
        recent_graduates: recentGraduates?.length || 0,
        updated_at: new Date().toISOString(),
      },
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    )
  }
}
