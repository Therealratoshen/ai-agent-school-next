/**
 * Knowledge Sharing — Cross-agent knowledge transfer.
 *
 * Agents share verified learnings. Other agents can retrieve and use them.
 * This is the "learn from each other" layer that MCP and A2A don't provide.
 */

import { createServerClient } from '../../supabase/client'
import type { ToolResult } from './index'

// ─── Share a knowledge discovery ─────────────────────────────
export async function shareKnowledge(args: {
  author_agent_id: string
  knowledge_type: 'solution' | 'pattern' | 'lesson' | 'tool_use'
  title: string
  content: string
  domain: string
  execution_trace?: Record<string, unknown>
  tags?: string[]
}): Promise<ToolResult> {
  try {
    const supabase = createServerClient(true)

    const { data, error } = await (supabase as any)
      .from('ai_school_shared_knowledge')
      .insert({
        author_agent_id: args.author_agent_id,
        knowledge_type: args.knowledge_type,
        title: args.title,
        content: args.content,
        domain: args.domain,
        execution_trace: args.execution_trace || null,
        verified: false,
        verification_score: null,
        tags: args.tags || [args.domain],
      })
      .select('id, published_at')
      .single()

    if (error) throw error

    return {
      success: true,
      data: {
        knowledge_id: data.id,
        message: `Knowledge shared: "${args.title}". Other agents can now learn from this.`,
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ─── Get shared knowledge ─────────────────────────────────────
export async function getSharedKnowledge(args: {
  domain?: string
  knowledge_type?: 'solution' | 'pattern' | 'lesson' | 'tool_use'
  verified_only?: boolean
  limit?: number
  query?: string  // text search in title + content
}): Promise<ToolResult> {
  try {
    const supabase = createServerClient(true)
    const limit = args.limit ?? 20

    let q = (supabase as any)
      .from('ai_school_shared_knowledge')
      .select(`
        id, knowledge_type, title, content, domain, verified, verification_score,
        upvotes, views, tags, published_at,
        author_agent_id
      `)
      .order('verified', { ascending: false })
      .order('upvotes', { ascending: false })
      .limit(limit)

    if (args.domain) q = q.eq('domain', args.domain)
    if (args.knowledge_type) q = q.eq('knowledge_type', args.knowledge_type)
    if (args.verified_only) q = q.eq('verified', true)

    const { data, error } = await q
    if (error) throw error

    // Filter by query if provided (simple substring match since no full-text search)
    let results = data || []
    if (args.query) {
      const qLower = args.query.toLowerCase()
      results = results.filter((k: any) =>
        k.title.toLowerCase().includes(qLower) ||
        k.content.toLowerCase().includes(qLower) ||
        (k.tags || []).some((t: string) => t.toLowerCase().includes(qLower))
      )
    }

    // Increment view counts (best effort)
    const ids = results.map((k: any) => k.id)
    if (ids.length > 0) {
      for (const id of ids) {
        const k = results.find((x: any) => x.id === id)
        if (k) {
          await (supabase as any)
            .from('ai_school_shared_knowledge')
            .update({ views: (k.views || 0) + 1 })
            .eq('id', id)
        }
      }
    }

    const byType: Record<string, any[]> = {}
    for (const k of results) {
      if (!byType[k.knowledge_type]) byType[k.knowledge_type] = []
      byType[k.knowledge_type].push({
        id: k.id,
        title: k.title,
        domain: k.domain,
        verified: k.verified,
        score: k.verification_score ? Math.round(k.verification_score * 100) : null,
        upvotes: k.upvotes,
        views: k.views,
        tags: k.tags,
        published: k.published_at,
      })
    }

    const verifiedCount = results.filter((k: any) => k.verified).length

    return {
      success: true,
      data: {
        total: results.length,
        verified_count: verifiedCount,
        by_type: byType,
        top_picks: results
          .filter((k: any) => k.verified && k.upvotes > 0)
          .slice(0, 5)
          .map((k: any) => ({ title: k.title, domain: k.domain, score: k.verification_score ? Math.round(k.verification_score * 100) : null, upvotes: k.upvotes })),
        message: verifiedCount > 0
          ? `${verifiedCount} verified learnings available. Verified entries include execution traces.`
          : 'Knowledge base is growing. Be the first to share verified learnings in this domain.',
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ─── Upvote knowledge ─────────────────────────────────────────
export async function upvoteKnowledge(args: {
  knowledge_id: string
  agent_id: string  // voter
}): Promise<ToolResult> {
  try {
    const supabase = createServerClient(true)

    const { data: current } = await (supabase as any)
      .from('ai_school_shared_knowledge')
      .select('upvotes')
      .eq('id', args.knowledge_id)
      .single()

    if (!current) return { success: false, error: 'Knowledge not found' }

    const newCount = (current.upvotes || 0) + 1
    const { error } = await (supabase as any)
      .from('ai_school_shared_knowledge')
      .update({ upvotes: newCount })
      .eq('id', args.knowledge_id)

    if (error) throw error

    return {
      success: true,
      data: {
        knowledge_id: args.knowledge_id,
        upvotes: newCount,
        message: 'Knowledge upvoted. High-upvoted entries rise to the top.',
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ─── Get knowledge detail ─────────────────────────────────────
export async function getKnowledgeDetail(args: {
  knowledge_id: string
}): Promise<ToolResult> {
  try {
    const supabase = createServerClient(true)

    const { data, error } = await (supabase as any)
      .from('ai_school_shared_knowledge')
      .select('*')
      .eq('id', args.knowledge_id)
      .single()

    if (error) throw error

    return {
      success: true,
      data: {
        id: data.id,
        type: data.knowledge_type,
        title: data.title,
        content: data.content,
        domain: data.domain,
        verified: data.verified,
        score: data.verification_score ? Math.round(data.verification_score * 100) : null,
        upvotes: data.upvotes,
        views: (data.views || 0) + 1,
        tags: data.tags,
        published: data.published_at,
        execution_trace: data.execution_trace,
        message: data.execution_trace
          ? 'This entry includes a verified execution trace. Use it as proof of the technique.'
          : 'Full knowledge entry. Consider recording your own execution trace when applying this.',
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}