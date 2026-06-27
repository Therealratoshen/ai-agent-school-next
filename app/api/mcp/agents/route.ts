export const runtime = 'nodejs'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { handleMCPRequest } from '@/lib/mcp/server'
import { extractBearerToken, validateApiKey, createApiKey } from '@/lib/mcp/auth'

const MAX_REQUEST_SIZE = 10 * 1024
const MAX_MESSAGE_LENGTH = 4000

// In-memory rate limiter
const _rlStore = new Map<string, { count: number; resetTime: number }>()

function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  let entry = _rlStore.get(key)
  if (!entry || now > entry.resetTime) {
    entry = { count: 0, resetTime: now + windowMs }
    _rlStore.set(key, entry)
  }
  entry.count++
  return {
    allowed: entry.count <= limit,
    remaining: Math.max(0, limit - entry.count),
    reset: entry.resetTime,
  }
}

function getClientIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1'
  )
}

function isRegisterRequest(body: unknown): boolean {
  return !!(body && typeof body === 'object' && 'agent_id' in body && !('jsonrpc' in body))
}

function jsonError(id: string | number | null, code: number, message: string) {
  return { jsonrpc: '2.0', id, error: { code, message } }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()

    if (body.length > MAX_REQUEST_SIZE) {
      return NextResponse.json(
        { success: false, error: `Request too large. Max ${MAX_REQUEST_SIZE} bytes.` },
        { status: 413 }
      )
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(body)
    } catch {
      return NextResponse.json(jsonError(null, -32700, 'Invalid JSON'), { status: 400 })
    }

    const clientIP = getClientIP(req)

    // ── Registration (no auth) ─────────────────────────────────────────
    if (isRegisterRequest(parsed)) {
      const rl = rateLimit(`register:${clientIP}`, 60, 60_000)
      if (!rl.allowed) {
        return NextResponse.json(
          { success: false, error: 'Rate limit exceeded' },
          { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.reset - Date.now()) / 1000)) } }
        )
      }

      const rb = parsed as { agent_id?: unknown; agent_name?: unknown }

      if (!rb.agent_id || typeof rb.agent_id !== 'string') {
        return NextResponse.json({ success: false, error: 'agent_id is required' }, { status: 400 })
      }
      if (!rb.agent_name || typeof rb.agent_name !== 'string') {
        return NextResponse.json({ success: false, error: 'agent_name is required' }, { status: 400 })
      }
      if (rb.agent_id.length > 100 || rb.agent_name.length > 200) {
        return NextResponse.json({ success: false, error: 'agent_id or agent_name too long' }, { status: 400 })
      }

      const result = await createApiKey(rb.agent_id, rb.agent_name)
      if (!result) {
        return NextResponse.json({ success: false, error: 'Failed to create API key' }, { status: 500 })
      }

      return NextResponse.json(
        { success: true, data: { api_key: result.key, agent_id: result.agentId } },
        { status: 201 }
      )
    }

    // ── Authenticated request ──────────────────────────────────────────
    const apiKey = extractBearerToken(req.headers.get('Authorization'))
    if (!apiKey) {
      return NextResponse.json(
        jsonError(null, -32600, 'Unauthorized: Missing Bearer token'),
        { status: 401 }
      )
    }

    const agentInfo = await validateApiKey(apiKey)
    if (!agentInfo) {
      return NextResponse.json(
        jsonError(null, -32600, 'Invalid or expired API key'),
        { status: 401 }
      )
    }

    const rl = rateLimit(`agent:${agentInfo.agentId}`, 60, 60_000)
    if (!rl.allowed) {
      return NextResponse.json(
        jsonError(null, -32600, 'Rate limit exceeded'),
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.reset - Date.now()) / 1000)) } }
      )
    }

    const reqBody = parsed as { jsonrpc?: string; id?: string | number | null; method?: string; params?: unknown }
    if (!reqBody || reqBody.jsonrpc !== '2.0' || !reqBody.method) {
      return NextResponse.json(
        jsonError(null, -32700, 'Invalid JSON-RPC request'),
        { status: 400 }
      )
    }

    if (reqBody.method !== 'tools/call') {
      return NextResponse.json(
        jsonError(reqBody.id || null, -32601, `Method not found: ${reqBody.method}`),
        { status: 404 }
      )
    }

    const params = reqBody.params as { name?: string; arguments?: Record<string, unknown> }
    if (params?.name === 'chat' && typeof params?.arguments?.message === 'string' && params.arguments.message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        jsonError(reqBody.id || null, -32602, `Message too long. Max ${MAX_MESSAGE_LENGTH} chars`),
        { status: 400 }
      )
    }

    const validatedReq = reqBody as { jsonrpc: '2.0'; id: string | number | null; method: string; params?: Record<string, unknown> }
    const response = await handleMCPRequest(validatedReq, {
      agentId: agentInfo.agentId,
      agentName: agentInfo.agentName,
      apiKeyId: agentInfo.apiKeyId,
    })

    return NextResponse.json(response)
  } catch (err: any) {
    console.error('[MCP] Unhandled error:', err.message)
    return NextResponse.json(
      jsonError(null, -32603, `Internal error: ${err.message}`),
      { status: 500 }
    )
  }
}

export async function GET() {
  const { TOOL_DEFINITIONS } = await import('@/lib/mcp/tools/index')
  return NextResponse.json({
    success: true,
    data: {
      name: 'AI Agent School MCP',
      version: '1.0.0',
      description: 'Train AI agents with production-ready skills via MCP',
      endpoint: '/api/mcp/agents',
      authentication: { type: 'Bearer Token' },
      protocol: 'JSON-RPC 2.0',
      tools: TOOL_DEFINITIONS,
      documentation: '/ai-agent-school/docs',
    },
  })
}
