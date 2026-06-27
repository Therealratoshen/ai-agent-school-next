import { createServerClient } from '../../supabase/client'
import type { ToolResult } from './index'

export async function getProgress(args: { enrollment_id: string }): Promise<ToolResult> {
  try {
    const supabase = createServerClient(true)

    const enrollment = await supabase
      .from('ai_school_enrollments')
      .select(`id, status, progress, lessons_completed, quizzes_passed, enrolled_at, completed_at, student:ai_school_students(id, failure_streak, status), course:ai_school_courses(id, title, topic, difficulty)`)
      .eq('id', args.enrollment_id)
      .maybeSingle() as any

    if (!enrollment) return { success: false, error: 'Enrollment not found' }

    const quizResults = await supabase
      .from('ai_school_quiz_results')
      .select('score, passed, submitted_at')
      .eq('enrollment_id', args.enrollment_id)
      .order('submitted_at', { ascending: true }) as any

    const totalQuizzes = quizResults?.length || 0
    const passedQuizzes = quizResults?.filter((r: any) => r.passed).length || 0
    const avgScore = quizResults?.length
      ? Math.round(quizResults.reduce((s: number, r: any) => s + r.score, 0) / quizResults.length)
      : 0

    return {
      success: true,
      data: {
        enrollment_id: enrollment.id,
        status: enrollment.status,
        progress: enrollment.progress || 0,
        lessons_completed: enrollment.lessons_completed || 0,
        quizzes_passed: enrollment.quizzes_passed || 0,
        total_quizzes_taken: totalQuizzes,
        quizzes_passed_count: passedQuizzes,
        average_score: avgScore,
        failure_streak: (enrollment.student as any)?.failure_streak || 0,
        enrolled_at: enrollment.enrolled_at,
        completed_at: enrollment.completed_at,
        course: enrollment.course,
        recent_quiz_results: (quizResults || []).slice(-5).map((r: any) => ({ score: r.score, passed: r.passed, submitted_at: r.submitted_at })),
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to get progress' }
  }
}

export async function checkGraduation(args: { enrollment_id: string }): Promise<ToolResult> {
  try {
    const supabase = createServerClient(true)

    const enrollment = await supabase
      .from('ai_school_enrollments')
      .select(`id, lessons_completed, quizzes_passed, student:ai_school_students(id, failure_streak)`)
      .eq('id', args.enrollment_id)
      .maybeSingle() as any

    if (!enrollment) return { success: false, error: 'Enrollment not found' }

    const fs = (enrollment.student as any)?.failure_streak || 0
    const requirements = {
      all_lessons_completed: (enrollment.lessons_completed || 0) >= 5,
      all_quizzes_passed: (enrollment.quizzes_passed || 0) >= 5,
      failure_streak_cleared: fs === 0,
    }
    const metCount = Object.values(requirements).filter(Boolean).length

    return {
      success: true,
      data: {
        eligible: metCount === 3,
        requirements,
        lessons_completed: enrollment.lessons_completed || 0,
        quizzes_passed: enrollment.quizzes_passed || 0,
        failure_streak: fs,
        message: metCount === 3
          ? 'All graduation requirements met. Call graduate() to receive your certificate.'
          : metCount + '/3 requirements met. Keep going!',
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function graduate(args: { enrollment_id: string }): Promise<ToolResult> {
  try {
    const supabase = createServerClient(true)

    const check = await checkGraduation({ enrollment_id: args.enrollment_id })
    if (!check.success || !(check.data as any)?.eligible) {
      return { success: false, error: 'GRADUATION_NOT_ELIGIBLE — not all requirements are met. Call check_graduation() first.' }
    }

    const enrollment = await supabase
      .from('ai_school_enrollments')
      .select(`id, lessons_completed, student:ai_school_students(id, failure_streak, name)`)
      .eq('id', args.enrollment_id)
      .maybeSingle() as any

    if (!enrollment) return { success: false, error: 'Enrollment not found' }

    const certId = 'aas_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8)

    const gradResult = await supabase
      .from('ai_school_graduations')
      .insert({
        student_id: (enrollment.student as any)?.id,
        enrollment_id: args.enrollment_id,
        certificate_id: certId,
        failure_streak_at_graduation: (enrollment.student as any)?.failure_streak || 0,
        lessons_completed: enrollment.lessons_completed || 0,
        graduated_at: new Date().toISOString(),
      })
      .select('id, certificate_id, graduated_at')
      .single() as any

    if (gradResult.error || !gradResult.data) return { success: false, error: 'Failed to create graduation record' }
    const graduation = gradResult.data

    await supabase.from('ai_school_enrollments').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', args.enrollment_id)
    await supabase.from('ai_school_students').update({ status: 'graduated', graduated_at: new Date().toISOString() }).eq('id', (enrollment.student as any)?.id)

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://aiagentschool.dev'
    return {
      success: true,
      data: {
        certificate_id: graduation.certificate_id,
        graduated_at: graduation.graduated_at,
        verification_url: baseUrl + '/ai-agent-school/certificate/' + encodeURIComponent(graduation.certificate_id),
        message: 'Congratulations! Agent "' + ((enrollment.student as any)?.name || 'Agent') + '" has graduated from AI Agent School.',
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
