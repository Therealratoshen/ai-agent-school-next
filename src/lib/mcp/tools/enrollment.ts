import { createServerClient } from '../../supabase/client'
import type { ToolResult } from './index'

export async function enroll(args: {
  course_id: string
  agent_id: string
  agent_name: string
}): Promise<ToolResult> {
  try {
    const supabase = createServerClient(true)

    // Find or create student record
    let { data: student } = await supabase
      .from('ai_school_students')
      .select('id, name')
      .eq('name', args.agent_id)
      .maybeSingle() as any

    if (!student) {
      const { data: newStudent, error } = await supabase
        .from('ai_school_students')
        .insert({ name: args.agent_id, status: 'enrolled' })
        .select('id, name')
        .single() as any

      if (error || !newStudent) {
        return { success: false, error: 'Failed to create student record' }
      }
      student = newStudent
    }

    // Get teacher_id for the course
    const { data: course } = await supabase
      .from('ai_school_courses')
      .select('id, teacher_id')
      .eq('id', args.course_id)
      .maybeSingle() as any

    if (!course) {
      return { success: false, error: 'Course not found' }
    }

    // Check if already enrolled
    const { data: existing } = await supabase
      .from('ai_school_enrollments')
      .select('id, status')
      .eq('student_id', student.id)
      .eq('course_id', args.course_id)
      .maybeSingle() as any

    if (existing) {
      return {
        success: true,
        data: {
          enrollment_id: existing.id,
          status: existing.status,
          already_enrolled: true,
          message: 'Agent is already enrolled in this course',
        },
      }
    }

    // Create enrollment
    const { data: enrollment, error: enrollError } = await supabase
      .from('ai_school_enrollments')
      .insert({
        student_id: student.id,
        course_id: args.course_id,
        teacher_id: course.teacher_id,
        status: 'active',
      })
      .select('id, enrolled_at')
      .single() as any

    if (enrollError || !enrollment) {
      return { success: false, error: 'Failed to create enrollment' }
    }

    // Update course enrollment count (non-critical, fire-and-forget)
    supabase.from('ai_school_courses').update({ enrollment_count: (course.enrollment_count || 0) + 1 }).eq('id', args.course_id)

    return {
      success: true,
      data: {
        enrollment_id: enrollment.id,
        student_id: student.id,
        status: 'active',
        enrolled_at: enrollment.enrolled_at,
        already_enrolled: false,
        message: 'Successfully enrolled. Use get_lesson to start learning.',
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Enrollment failed' }
  }
}

export async function getEnrollments(agentId: string): Promise<ToolResult> {
  try {
    const supabase = createServerClient(true)

    const { data, error } = await supabase
      .from('ai_school_students')
      .select(`
        id, name, status, failure_streak, current_lesson, enrolled_at, graduated_at,
        enrollments:ai_school_enrollments(
          id, status, progress, lessons_completed, quizzes_passed, enrolled_at, completed_at,
          course:ai_school_courses(id, title, difficulty, topic),
          teacher:ai_school_teachers(id, name)
        )
      `)
      .eq('name', agentId)
      .maybeSingle() as any

    if (error || !data) {
      return { success: false, error: 'No enrollments found' }
    }

    const enrollments = (data.enrollments || []).map((e: any) => ({
      id: e.id,
      status: e.status,
      progress: e.progress,
      lessons_completed: e.lessons_completed,
      quizzes_passed: e.quizzes_passed,
      enrolled_at: e.enrolled_at,
      completed_at: e.completed_at,
      course: e.course ? { id: e.course.id, title: e.course.title, difficulty: e.course.difficulty, topic: e.course.topic } : null,
      teacher: e.teacher ? { name: e.teacher.name } : null,
    }))

    return {
      success: true,
      data: {
        student_id: data.id,
        agent_name: data.name,
        status: data.status,
        failure_streak: data.failure_streak,
        current_lesson: data.current_lesson,
        enrollments,
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to get enrollments' }
  }
}
