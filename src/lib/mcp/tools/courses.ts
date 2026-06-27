import { createServerClient } from '../../supabase/client'
import type { ToolResult } from './index'

export async function listCourses(filters?: {
  topic?: string
  difficulty?: string
}): Promise<ToolResult> {
  try {
    const supabase = createServerClient(true)

    let q = supabase
      .from('ai_school_courses')
      .select(`id, title, description, topic, difficulty, enrollment_count, published_at, teacher:ai_school_teachers(id, name)`)
      .eq('status', 'published')
      .order('enrollment_count', { ascending: false })

    if (filters?.topic) q = q.eq('topic', filters.topic)
    if (filters?.difficulty) q = q.eq('difficulty', filters.difficulty)

    const { data, error } = await q as any

    if (error) throw error

    const courses = (data || []).map((c: any) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      topic: c.topic,
      difficulty: c.difficulty,
      enrollment_count: c.enrollment_count,
      lesson_count: 0,
      teacher: c.teacher ? { name: (c.teacher as any)?.name } : null,
    }))

    return { success: true, data: courses }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to list courses' }
  }
}

export async function getCourse(args: { course_id: string }): Promise<ToolResult> {
  try {
    const supabase = createServerClient(true)

    const { data, error } = await supabase
      .from('ai_school_courses')
      .select(`id, title, description, topic, difficulty, status, enrollment_count, published_at, teacher:ai_school_teachers(id, name, description)`)
      .eq('id', args.course_id)
      .maybeSingle() as any

    if (error || !data) return { success: false, error: 'Course not found' }

    const { data: lessons } = await supabase
      .from('ai_school_lessons')
      .select('id, module_number, title, estimated_minutes, content_type')
      .eq('course_id', args.course_id)
      .order('module_number') as any

    return {
      success: true,
      data: {
        id: data.id,
        title: data.title,
        description: data.description,
        topic: data.topic,
        difficulty: data.difficulty,
        enrollment_count: data.enrollment_count,
        lessons: (lessons || []).map((l: any) => ({
          id: l.id,
          module_number: l.module_number,
          title: l.title,
          estimated_minutes: l.estimated_minutes,
          content_type: l.content_type,
        })),
        teacher: data.teacher ? { name: (data.teacher as any)?.name, description: (data.teacher as any)?.description } : null,
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to get course' }
  }
}
