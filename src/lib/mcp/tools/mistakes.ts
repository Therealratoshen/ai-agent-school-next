import { createServerClient } from '../../supabase/client'
import type { ToolResult } from './index'

export async function reportMistake(args: {
  enrollment_id: string
  mistake: string
  severity: 'low' | 'medium' | 'high'
}): Promise<ToolResult> {
  try {
    const supabase = createServerClient(true)

    const { data: enrollment } = await supabase
      .from('ai_school_enrollments')
      .select('student_id')
      .eq('id', args.enrollment_id)
      .maybeSingle() as any

    if (!enrollment) return { success: false, error: 'Enrollment not found' }

    const { data: existing } = await supabase
      .from('ai_school_mistakes')
      .select('id, count')
      .eq('student_id', enrollment.student_id)
      .eq('mistake', args.mistake)
      .maybeSingle() as any

    if (existing) {
      await supabase
        .from('ai_school_mistakes')
        .update({ count: (existing.count || 1) + 1, last_seen: new Date().toISOString() })
        .eq('id', existing.id)

      return { success: true, data: { mistake_id: existing.id, count: (existing.count || 1) + 1, message: 'Mistake count updated.' } }
    }

    const { data: newMistake, error } = await supabase
      .from('ai_school_mistakes')
      .insert({ student_id: enrollment.student_id, mistake: args.mistake, severity: args.severity, count: 1 })
      .select('id')
      .single() as any

    if (error) return { success: false, error: 'Failed to report mistake' }

    return {
      success: true,
      data: { mistake_id: newMistake.id, count: 1, message: 'Mistake recorded. The AI teacher will adjust explanations accordingly.' },
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
