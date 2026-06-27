/**
 * AI Teacher — Pluggable LLM adapter for the AI chat teacher.
 *
 * Supports multiple LLM providers. Set AI_TEACHER_PROVIDER env var:
 *   "openai"     → OpenAI GPT-4o
 *   "anthropic"  → Anthropic Claude
 *   "minimax"    → MiniMax API
 *   "local"      → Any OpenAI-compatible local/server endpoint
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

// ─── System prompt ──────────────────────────────────────────────────────────
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

// ─── OpenAI adapter ────────────────────────────────────────────────────────
async function openaiChat(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY not set')

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
    throw new Error(`OpenAI error: ${res.status} ${err}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content || 'No response from AI teacher.'
}

// ─── Anthropic adapter ────────────────────────────────────────────────────
async function anthropicChat(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')

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
    throw new Error(`Anthropic error: ${res.status} ${err}`)
  }

  const data = await res.json()
  return data.content?.[0]?.text || 'No response from AI teacher.'
}

// ─── MiniMax adapter ────────────────────────────────────────────────────────
async function minimaxChat(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.MINIMAX_API_KEY
  if (!apiKey) throw new Error('MINIMAX_API_KEY not set')

  const system = messages.find(m => m.role === 'system')?.content || ''
  const conversation = messages.filter(m => m.role !== 'system')

  const res = await fetch('https://api.minimax.chat/v1/text/chatcompletion_v2', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'MiniMax-Text-01',
      messages: [
        { role: 'system', content: system },
        ...conversation.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
      ],
      max_tokens: 800,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`MiniMax error: ${res.status} ${err}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content || 'No response from AI teacher.'
}

// ─── Router ────────────────────────────────────────────────────────────────
async function callLLM(messages: ChatMessage[]): Promise<string> {
  const provider = process.env.AI_TEACHER_PROVIDER || 'openai'

  switch (provider) {
    case 'anthropic':
      return anthropicChat(messages)
    case 'minimax':
      return minimaxChat(messages)
    case 'openai':
    default:
      return openaiChat(messages)
  }
}

// ─── Main chat function ────────────────────────────────────────────────────
export async function chat(params: ChatParams): Promise<ToolResult> {
  try {
    const supabase = createServerClient(true)
    const sessionId = `chat_${params.enrollment_id}`

    // Load conversation history
    const { data: session } = await supabase
      .from('ai_school_mcp_sessions')
      .select('id, token_usage, request_count')
      .eq('session_id', sessionId)
      .maybeSingle() as any

    const history: ChatMessage[] = session?.token_usage?.messages || []
    const recentHistory = history.slice(-MAX_HISTORY)

    // Get course context for system prompt
    const { data: course } = await supabase
      .from('ai_school_courses')
      .select('id, title, topic')
      .eq('id', params.course_id)
      .maybeSingle() as any

    const systemPrompt = buildSystemPrompt(course ? { title: course.title, topic: course.topic } : undefined)

    // Build messages
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...recentHistory,
      { role: 'user', content: params.message },
    ]

    // Call LLM
    const response = await callLLM(messages)

    // Save to history
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
        .update({
          token_usage: tokenUsage,
          request_count: (session.request_count || 0) + 1,
        })
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
        model: process.env.AI_TEACHER_PROVIDER || 'openai',
      },
    }
  } catch (err: any) {
    return { success: false, error: `AI teacher error: ${err.message}` }
  }
}
