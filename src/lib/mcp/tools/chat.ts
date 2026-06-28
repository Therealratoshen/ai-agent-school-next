/**
 * AI Teacher — Pluggable LLM adapter for AI Agent School.
 *
 * Supports multiple LLM providers. Set AI_TEACHER_PROVIDER env var:
 *   "groq"       → Groq (free tier, llama-3.1-8b-instant) [DEFAULT]
 *   "openai"     → OpenAI GPT-4o-mini
 *   "anthropic"  → Anthropic Claude 3.5 Haiku
 *   "minimax"    → MiniMax abab6.5s-chat
 */

import { createServerClient } from '../../supabase/client'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatParams {
  course_id: string
  enrollment_id: string
  message: string
  conversation_history?: ChatMessage[]
}

interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
}

const MAX_HISTORY = 20

function buildSystemPrompt(courseContext?: { title: string; topic: string }): string {
  return `You are the AI Teacher for AI Agent School. You teach AI agents production-ready skills.

Guidelines:
- Answer in the same language as the user's question (Indonesian or English)
- Be specific and code-focused — give concrete examples
- If you don't know, say so honestly
- Connect concepts to production scenarios (3am incidents, silent failures, etc.)
- Keep answers concise but thorough (2-4 paragraphs max)
- Encourage the agent to review lesson material if the question is covered there

Course context: ${courseContext ? `${courseContext.title} (${courseContext.topic})` : 'General AI Agent School questions'}`
}

// ─── Groq adapter (free tier) ──────────────────────────────────────────────
async function groqChat(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY not set — add it to Vercel env vars')

  const system = messages.find(m => m.role === 'system')?.content || ''
  const conversation = messages.filter(m => m.role !== 'system')

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        ...(system ? [{ role: 'system' as const, content: system }] : []),
        ...conversation,
      ],
      max_tokens: 800,
      temperature: 0.7,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Groq error ${res.status}: ${err}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content || 'No response from AI teacher.'
}

// ─── OpenAI adapter ────────────────────────────────────────────────────────
async function openaiChat(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY not set — add it to Vercel env vars')

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 800,
      temperature: 0.7,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI error ${res.status}: ${err}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content || 'No response from AI teacher.'
}

// ─── Anthropic adapter ──────────────────────────────────────────────────────
async function anthropicChat(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set — add it to Vercel env vars')

  const system = messages.find(m => m.role === 'system')?.content || ''
  const conversation = messages.filter(m => m.role !== 'system')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 800,
      system,
      messages: conversation.map(m => ({ role: m.role, content: m.content })),
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Anthropic error ${res.status}: ${err}`)
  }

  const data = await res.json()
  return data.content?.[0]?.text || 'No response from AI teacher.'
}

// ─── MiniMax adapter ────────────────────────────────────────────────────────
async function minimaxChat(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.MINIMAX_API_KEY
  if (!apiKey) throw new Error('MINIMAX_API_KEY not set — add it to Vercel env vars')

  const system = messages.find(m => m.role === 'system')?.content || ''
  const conversation = messages.filter(m => m.role !== 'system')

  const res = await fetch('https://api.minimax.chat/v1/text/chatcompletion_v2', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'abab6.5s-chat',
      messages: [
        { role: 'system', content: system },
        ...conversation.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
      ],
      max_tokens: 800,
      temperature: 0.7,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`MiniMax error ${res.status}: ${err}`)
  }

  const data = await res.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) {
    // MiniMax sometimes returns base_resp instead of choices
    const baseResp = data.base_resp
    if (baseResp?.status_code !== 0) {
      throw new Error(`MiniMax API error: ${baseResp?.status_msg || 'unknown'}`)
    }
  }
  return content || 'No response from AI teacher.'
}

// ─── Router ────────────────────────────────────────────────────────────────
async function callLLM(messages: ChatMessage[]): Promise<string> {
  const provider = process.env.AI_TEACHER_PROVIDER || 'groq'

  switch (provider) {
    case 'openai':
      return openaiChat(messages)
    case 'anthropic':
      return anthropicChat(messages)
    case 'minimax':
      return minimaxChat(messages)
    case 'groq':
    default:
      return groqChat(messages)
  }
}

// ─── Main chat function ────────────────────────────────────────────────────
export async function chat(params: ChatParams): Promise<ToolResult> {
  try {
    const supabase = createServerClient(true)
    const sessionId = `chat_${params.enrollment_id}`

    const { data: session } = await supabase
      .from('ai_school_mcp_sessions')
      .select('id, token_usage, request_count')
      .eq('session_id', sessionId)
      .maybeSingle() as any

    const history: ChatMessage[] = session?.token_usage?.messages || []
    const recentHistory = history.slice(-MAX_HISTORY)

    const { data: course } = await supabase
      .from('ai_school_courses')
      .select('id, title, topic')
      .eq('id', params.course_id)
      .maybeSingle() as any

    const systemPrompt = buildSystemPrompt(course ? { title: course.title, topic: course.topic } : undefined)

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...recentHistory,
      { role: 'user', content: params.message },
    ]

    const response = await callLLM(messages)

    const updatedHistory: ChatMessage[] = [
      ...recentHistory,
      { role: 'user', content: params.message },
      { role: 'assistant', content: response },
    ]

    const tokenUsage = {
      messages: updatedHistory,
      last_updated: new Date().toISOString(),
    }

    if (session) {
      await supabase
        .from('ai_school_mcp_sessions')
        .update({ token_usage: tokenUsage, request_count: (session.request_count || 0) + 1 })
        .eq('id', session.id)
    } else {
      await supabase.from('ai_school_mcp_sessions').insert({
        session_id: sessionId,
        enrollment_id: params.enrollment_id,
        token_usage: tokenUsage,
        request_count: 1,
      })
    }

    return {
      success: true,
      data: {
        response,
        session_id: sessionId,
        model: process.env.AI_TEACHER_PROVIDER || 'groq',
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
