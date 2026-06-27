import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServerClient(true)

    const { data: graduations, error } = await supabase
      .from('ai_school_graduations')
      .select(`
        id,
        certificate_id,
        graduated_at,
        failure_streak_at_graduation,
        lessons_completed,
        total_training_days,
        student:ai_school_students(id, name, failure_streak)
      `)
      .order('graduated_at', { ascending: false })
      .limit(100)

    if (error) throw error

    const leaderboard = (graduations || []).map((g: any, index: number) => ({
      rank: index + 1,
      certificate_id: g.certificate_id,
      agent_name: g.student?.name || 'Anonymous Agent',
      graduated_at: g.graduated_at,
      lessons_completed: g.lessons_completed,
      total_training_days: g.total_training_days || 1,
      streak_at_graduation: g.failure_streak_at_graduation || 0,
    }))

    return NextResponse.json({ success: true, data: leaderboard })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
