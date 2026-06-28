/**
 * Agent Memory — Persistent cross-session memory for AI agents.
 *
 * Types:
 *   episodic  — Events and experiences (things that happened)
 *   semantic  — Facts and knowledge (things the agent knows)
 *   procedural — How-to knowledge (things the agent knows how to do)
 *   context    — Current task state (working memory snapshot)
 */

import { createServerClient } from '../../supabase/client'
import type { ToolResult } from './index'

// ─── Store a memory ───────────────────────────────────────────
export async function storeMemory(args: {
  agent_id: string
  memory_type: 'episodic' | 'semantic' | 'procedural' | 'context'
  content: string
  summary?: string
  importance?: number      // 1-10, default 5
  metadata?: Record<string, unknown>
}): Promise<ToolResult> {
  try {
    const supabase = createServerClient(true)
    const importance = Math.min(10, Math.max(1, args.importance ?? 5))

    const { data, error } = await (supabase as any)
      .from('ai_school_agent_memories')
      .insert({
        agent_id: args.agent_id,
        memory_type: args.memory_type,
        content: args.content,
        summary: args.summary || args.content.slice(0, 200),
        importance,
        metadata: args.metadata || {},
      })
      .select('id, memory_type, importance, created_at')
      .single()

    if (error) throw error

    return {
      success: true,
      data: {
        memory_id: data.id,
        memory_type: data.memory_type,
        importance: data.importance,
        created_at: data.created_at,
        message: `Memory stored (${data.memory_type}). The agent will recall this in future sessions.`,
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ─── Recall memories ──────────────────────────────────────────
export async function recallMemory(args: {
  agent_id: string
  query?: string
  memory_type?: 'episodic' | 'semantic' | 'procedural' | 'context'
  limit?: number
}): Promise<ToolResult> {
  try {
    const supabase = createServerClient(true)
    const limit = args.limit ?? 10

    let query = (supabase as any)
      .from('ai_school_agent_memories')
      .select('id, memory_type, content, summary, importance, metadata, access_count, created_at, updated_at')
      .eq('agent_id', args.agent_id)
      .order('importance', { ascending: false })
      .limit(limit * 2)  // fetch more, filter below

    if (args.memory_type) {
      query = query.eq('memory_type', args.memory_type)
    }

    const { data, error } = await query
    if (error) throw error

    // Sort by relevance: importance first, then recency
    const sorted = (data || [])
      .sort((a: any, b: any) => {
        const impDiff = b.importance - a.importance
        if (Math.abs(impDiff) > 2) return impDiff
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      })
      .slice(0, limit)

    const byType: Record<string, any[]> = {}
    for (const mem of sorted) {
      if (!byType[mem.memory_type]) byType[mem.memory_type] = []
      byType[mem.memory_type].push({
        id: mem.id,
        content: mem.content,
        summary: mem.summary,
        importance: mem.importance,
        accessed: mem.access_count,
        updated: mem.updated_at,
      })
    }

    const totalCount = (data || []).length

    return {
      success: true,
      data: {
        total_stored: totalCount,
        recalled: sorted.length,
        memories_by_type: byType,
        query_note: args.query
          ? `Filtered for: "${args.query}" — check content for relevance`
          : 'Showing most important + recent memories',
        instruction: 'Use these memories to inform your actions. episodic=events, semantic=facts, procedural=how-to, context=current task.',
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ─── Update memory ────────────────────────────────────────────
export async function updateMemory(args: {
  agent_id: string
  memory_id: string
  content?: string
  summary?: string
  importance?: number
}): Promise<ToolResult> {
  try {
    const supabase = createServerClient(true)

    const updates: Record<string, unknown> = {}
    if (args.content !== undefined) updates.content = args.content
    if (args.summary !== undefined) updates.summary = args.summary
    if (args.importance !== undefined) updates.importance = Math.min(10, Math.max(1, args.importance))

    if (Object.keys(updates).length === 0) {
      return { success: false, error: 'No fields to update' }
    }

    const { error } = await (supabase as any)
      .from('ai_school_agent_memories')
      .update(updates)
      .eq('id', args.memory_id)
      .eq('agent_id', args.agent_id)

    if (error) throw error

    return {
      success: true,
      data: {
        memory_id: args.memory_id,
        message: 'Memory updated. Changes persist across sessions.',
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ─── Delete memory ────────────────────────────────────────────
export async function deleteMemory(args: {
  agent_id: string
  memory_id: string
}): Promise<ToolResult> {
  try {
    const supabase = createServerClient(true)

    const { error } = await (supabase as any)
      .from('ai_school_agent_memories')
      .delete()
      .eq('id', args.memory_id)
      .eq('agent_id', args.agent_id)

    if (error) throw error

    return {
      success: true,
      data: { memory_id: args.memory_id, message: 'Memory deleted permanently.' },
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ─── Snapshot current context ─────────────────────────────────
export async function snapshotContext(args: {
  agent_id: string
  task: string
  current_state: string
  next_steps?: string[]
}): Promise<ToolResult> {
  try {
    const supabase = createServerClient(true)

    // Store as context memory type
    const content = JSON.stringify({
      task: args.task,
      state: args.current_state,
      next_steps: args.next_steps || [],
      snapshot_at: new Date().toISOString(),
    }, null, 2)

    const { data, error } = await (supabase as any)
      .from('ai_school_agent_memories')
      .insert({
        agent_id: args.agent_id,
        memory_type: 'context',
        content,
        summary: `Context snapshot: ${args.task}`,
        importance: 10, // Context is always high importance
        metadata: { snapshot: true, task: args.task },
      })
      .select('id, created_at')
      .single()

    if (error) throw error

    return {
      success: true,
      data: {
        snapshot_id: data.id,
        message: `Context snapshot saved for task: "${args.task}". Next session can resume from this state.`,
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}