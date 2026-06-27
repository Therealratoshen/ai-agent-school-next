import { createServerClient } from '../../supabase/client'
import type { ToolResult } from './index'

export async function getLesson(args: {
  course_id: string
  lesson_number: number
}): Promise<ToolResult> {
  try {
    const supabase = createServerClient(true)

    const { data: lesson } = await supabase
      .from('ai_school_lessons')
      .select('id, module_number, title, content, content_type, estimated_minutes')
      .eq('course_id', args.course_id)
      .eq('module_number', args.lesson_number)
      .maybeSingle() as any

    if (!lesson) return { success: false, error: `Lesson ${args.lesson_number} not found` }

    const { data: quizzes } = await supabase
      .from('ai_school_quizzes')
      .select('id, question_id, question, question_type, options, explanation')
      .eq('lesson_id', lesson.id) as any

    const quizQuestions = (quizzes || []).map((q: any) => ({
      question_id: q.question_id,
      question: q.question,
      question_type: q.question_type,
      options: Array.isArray(q.options) ? q.options : [],
      explanation: q.explanation || 'Review the lesson material.',
    }))

    return {
      success: true,
      data: {
        lesson_id: lesson.id,
        module_number: lesson.module_number,
        title: lesson.title,
        content: lesson.content,
        content_type: lesson.content_type,
        estimated_minutes: lesson.estimated_minutes,
        quiz: {
          questions: quizQuestions,
          passing_score: 70,
          total_questions: quizQuestions.length,
        },
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to get lesson' }
  }
}
