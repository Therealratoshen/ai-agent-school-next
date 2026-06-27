import { createServerClient } from '../../supabase/client'
import type { ToolResult } from './index'

const PASSING_SCORE = 70

export async function submitQuiz(args: {
  enrollment_id: string
  lesson_id: string
  answers: Record<string, string>
}): Promise<ToolResult> {
  try {
    const supabase = createServerClient(true)

    const { data: questions } = await supabase
      .from('ai_school_quizzes')
      .select('id, question_id, correct_answer, options')
      .eq('lesson_id', args.lesson_id) as any

    if (!questions || questions.length === 0) {
      return { success: false, error: 'No quiz found for this lesson' }
    }

    const { data: enrollment } = await supabase
      .from('ai_school_enrollments')
      .select('id, student_id, lessons_completed, quizzes_passed')
      .eq('id', args.enrollment_id)
      .maybeSingle() as any

    if (!enrollment) return { success: false, error: 'Enrollment not found' }

    const { data: existingPassed } = await supabase
      .from('ai_school_quiz_results')
      .select('id')
      .eq('enrollment_id', args.enrollment_id)
      .eq('lesson_id', args.lesson_id)
      .eq('passed', true)
      .maybeSingle() as any

    if (existingPassed) return { success: false, error: 'QUIZ_ALREADY_PASSED — this lesson quiz was already passed' }

    // Grade
    let correctCount = 0
    const totalCount = questions.length
    const feedback: Record<string, { correct: boolean; explanation: string }> = {}

    for (const q of questions as any[]) {
      const givenAnswer = args.answers[q.question_id]
      const isCorrect = givenAnswer?.toLowerCase() === q.correct_answer?.toLowerCase()
      if (isCorrect) correctCount++
      feedback[q.question_id] = {
        correct: isCorrect,
        explanation: isCorrect ? 'Correct!' : `Incorrect. The answer was: ${q.correct_answer}`,
      }
    }

    const score = Math.round((correctCount / totalCount) * 100)
    const passed = score >= PASSING_SCORE

    await supabase.from('ai_school_quiz_results').insert({
      enrollment_id: args.enrollment_id,
      lesson_id: args.lesson_id,
      score,
      correct_count: correctCount,
      total_count: totalCount,
      answers: args.answers,
      feedback,
      passed,
    })

    if (passed) {
      const { data: lesson } = await supabase
        .from('ai_school_lessons')
        .select('module_number, course_id')
        .eq('id', args.lesson_id)
        .maybeSingle() as any

      if (lesson) {
        const newLessonsCompleted = Math.max(enrollment.lessons_completed || 0, lesson.module_number)
        const newQuizzesPassed = (enrollment.quizzes_passed || 0) + 1

        await supabase.from('ai_school_enrollments').update({
          lessons_completed: newLessonsCompleted,
          quizzes_passed: newQuizzesPassed,
          progress: Math.round((newLessonsCompleted / 5) * 100),
        }).eq('id', args.enrollment_id)

        await supabase.from('ai_school_students').update({ failure_streak: 0 }).eq('id', enrollment.student_id)
      }
    } else {
      // Increment failure streak
      try {
        await supabase.rpc('increment_failure_streak', { p_student_id: enrollment.student_id })
      } catch {}
    }

    return {
      success: true,
      data: {
        score,
        correct_count: correctCount,
        total_count: totalCount,
        passed,
        feedback,
        message: passed
          ? `Passed! Score: ${score}%. ${correctCount}/${totalCount} correct.`
          : `Not passed. Score: ${score}%. Need ${PASSING_SCORE}% to pass. Review feedback and try again.`,
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Quiz submission failed' }
  }
}
