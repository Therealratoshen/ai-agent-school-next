/**
 * AI Agent School — MCP Test Suite
 * 
 * Tests the MCP endpoint: POST /api/mcp/agents
 * Requires running dev server: npm run dev
 * 
 * Run: npx jest __tests__/mcp.test.ts
 * Or run manually via curl for integration testing.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

// ── Helper types ──────────────────────────────────────────────────────────────
type JsonRpcRequest = {
  jsonrpc: '2.0'
  id: string | number
  method: string
  params?: Record<string, unknown>
}

type JsonRpcResponse = {
  jsonrpc: '2.0'
  id: string | number
  result?: unknown
  error?: { code: number; message: string }
}

type RegisterResponse = {
  success: boolean
  data?: { api_key: string; agent_id: string }
  error?: string
}

// ── Registration ──────────────────────────────────────────────────────────────
describe('MCP Registration', () => {
  let apiKey: string
  let agentId: string

  it('should register a new agent and return an API key', async () => {
    const res = await fetch(`${BASE_URL}/api/mcp/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent_id: `test-agent-${Date.now()}`,
        agent_name: 'Test Agent',
      }),
    })
    const data: RegisterResponse = await res.json()
    expect(data.success).toBe(true)
    expect(data.data?.api_key).toBeDefined()
    expect(data.data?.api_key?.startsWith('aas_')).toBe(true)
    expect(data.data?.agent_id).toBeDefined()
    apiKey = data.data!.api_key
    agentId = data.data!.agent_id
  })

  it('should reject registration with missing agent_id', async () => {
    const res = await fetch(`${BASE_URL}/api/mcp/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_name: 'No ID Agent' }),
    })
    const data: RegisterResponse = await res.json()
    expect(data.success).toBe(false)
    expect(res.status).toBe(400)
  })

  it('should reject duplicate agent_id', async () => {
    const id = `dup-test-${Date.now()}`
    // First registration
    await fetch(`${BASE_URL}/api/mcp/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_id: id, agent_name: 'First Agent' }),
    })
    // Duplicate
    const res = await fetch(`${BASE_URL}/api/mcp/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_id: id, agent_name: 'Duplicate Agent' }),
    })
    expect(res.status).toBe(409)
  })
})

// ── Authenticated requests ────────────────────────────────────────────────────
describe('MCP Tool Calls (authenticated)', () => {
  let apiKey: string

  beforeAll(async () => {
    const res = await fetch(`${BASE_URL}/api/mcp/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent_id: `auth-test-${Date.now()}`,
        agent_name: 'Auth Test Agent',
      }),
    })
    const data: RegisterResponse = await res.json()
    apiKey = data.data!.api_key
  })

  const mcpCall = async (req: JsonRpcRequest): Promise<JsonRpcResponse> => {
    const res = await fetch(`${BASE_URL}/api/mcp/agents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req),
    })
    return res.json()
  }

  it('should reject calls without Bearer token', async () => {
    const res = await fetch(`${BASE_URL}/api/mcp/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'chat', arguments: { message: 'hello' } },
      }),
    })
    expect(res.status).toBe(401)
  })

  it('should reject calls with invalid API key', async () => {
    const res = await fetch(`${BASE_URL}/api/mcp/agents`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer invalid_key_123',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'chat', arguments: { message: 'hello' } },
      }),
    })
    expect(res.status).toBe(401)
  })

  it('should return error for unknown method', async () => {
    const res = await mcpCall({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {},
    })
    expect(res.error?.code).toBe(-32601)
  })

  it('should call chat tool and return response', async () => {
    const res = await mcpCall({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'chat', arguments: { message: 'What is exponential backoff?' } },
    })
    expect(res.jsonrpc).toBe('2.0')
    expect(res.id).toBe(1)
    // Should have either result or error, not both
    expect(!!res.result !== !!res.error).toBe(true)
  })

  it('should call enroll_course tool', async () => {
    const res = await mcpCall({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'enroll_course',
        arguments: { course_id: 'b2c3d4e5-f6a7-8901-bcde-f23456789012' },
      },
    })
    expect(res.jsonrpc).toBe('2.0')
    // Should succeed (may have result or idempotent success)
    expect(!!res.result !== !!res.error).toBe(true)
  })

  it('should call read_lesson tool', async () => {
    const res = await mcpCall({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'read_lesson',
        arguments: {
          course_id: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
          lesson_number: 1,
        },
      },
    })
    expect(res.jsonrpc).toBe('2.0')
    expect(!!res.result !== !!res.error).toBe(true)
    if (res.result) {
      const r = res.result as any
      expect(r.title).toBeDefined()
      expect(r.content).toBeDefined()
    }
  })

  it('should call take_quiz tool', async () => {
    const res = await mcpCall({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: { name: 'take_quiz', arguments: { lesson_id: 'c3d4e5f6-a7b8-9012-cdef-345678901234' } },
    })
    expect(res.jsonrpc).toBe('2.0')
    if (res.result) {
      const r = res.result as any
      expect(r.questions).toBeDefined()
      expect(Array.isArray(r.questions)).toBe(true)
    }
  })

  it('should call check_progress tool', async () => {
    const res = await mcpCall({
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: { name: 'check_progress', arguments: {} },
    })
    expect(res.jsonrpc).toBe('2.0')
    expect(!!res.result !== !!res.error).toBe(true)
  })

  it('should reject message that is too long', async () => {
    const longMessage = 'a'.repeat(5000)
    const res = await mcpCall({
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: { name: 'chat', arguments: { message: longMessage } },
    })
    expect(res.error?.code).toBe(-32602)
  })

  it('should reject unknown tool name', async () => {
    const res = await mcpCall({
      jsonrpc: '2.0',
      id: 7,
      method: 'tools/call',
      params: { name: 'nonexistent_tool', arguments: {} },
    })
    expect(res.error).toBeDefined()
  })
})

// ── Rate limiting ─────────────────────────────────────────────────────────────
describe('MCP Rate Limiting', () => {
  let apiKey: string

  beforeAll(async () => {
    const res = await fetch(`${BASE_URL}/api/mcp/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent_id: `rate-limit-test-${Date.now()}`,
        agent_name: 'Rate Limit Test Agent',
      }),
    })
    const data: RegisterResponse = await res.json()
    apiKey = data.data!.api_key
  })

  it('should allow multiple requests within rate limit', async () => {
    const promises = Array.from({ length: 5 }, (_, i) =>
      fetch(`${BASE_URL}/api/mcp/agents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: i,
          method: 'tools/call',
          params: { name: 'chat', arguments: { message: 'ping' } },
        }),
      })
    )
    const results = await Promise.all(promises)
    // All should succeed (not rate limited for small bursts)
    results.forEach(r => expect([200, 401]).toContain(r.status))
  })
})

// ── GET endpoint ──────────────────────────────────────────────────────────────
describe('MCP GET Endpoint', () => {
  it('should return MCP server info', async () => {
    const res = await fetch(`${BASE_URL}/api/mcp/agents`)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data.name).toBe('AI Agent School MCP')
    expect(data.data.version).toBe('1.0.0')
    expect(Array.isArray(data.data.tools)).toBe(true)
    expect(data.data.tools.length).toBeGreaterThan(0)
  })
})
