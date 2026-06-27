import { createHash, randomBytes } from 'crypto'
import { createServerClient } from '../supabase/client'

export interface AgentInfo {
  apiKeyId: string
  agentId: string
  agentName: string
  userId: string | null
  createdAt: string
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

export function generateApiKey(prefix = 'aas'): string {
  const bytes = randomBytes(24)
  return `${prefix}_${bytes.toString('base64url')}`
}

// ─── REST API helper for ai_school_api_keys (avoids Supabase JS client quirks) ──
async function apiKeysInsert(
  supabaseUrl: string,
  serviceRoleKey: string,
  payload: {
    agent_id: string
    agent_name: string
    api_key_hash: string
    api_key_prefix: string
    status: string
  }
): Promise<{ id: string } | null> {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/ai_school_api_keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error('[MCP Auth] REST insert failed:', err)
      return null
    }
    const data = await res.json()
    return Array.isArray(data) && data[0] ? { id: data[0].id } : null
  } catch (e) {
    console.error('[MCP Auth] REST insert error:', e)
    return null
  }
}

async function apiKeysLookup(
  supabaseUrl: string,
  serviceRoleKey: string,
  hashedKey: string
): Promise<{ id: string; agent_id: string; agent_name: string; created_at: string } | null> {
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/ai_school_api_keys?api_key_hash=eq.${hashedKey}&status=eq.active&select=id,agent_id,agent_name,created_at`,
      {
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    return Array.isArray(data) && data[0] ? data[0] : null
  } catch (e) {
    console.error('[MCP Auth] REST lookup error:', e)
    return null
  }
}

export async function createApiKey(agentId: string, agentName: string): Promise<{
  key: string
  agentId: string
  agentIdDb: string
} | null> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY_SHORTCUT ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      ''

    if (!serviceRoleKey) {
      console.error('[MCP Auth] No service role key available')
      return null
    }

    const rawKey = generateApiKey('aas')
    const hashedKey = hashApiKey(rawKey)
    const keyPrefix = rawKey.slice(0, 8)

    // Try REST API insert first (more reliable than JS client for this table)
    const inserted = await apiKeysInsert(supabaseUrl, serviceRoleKey, {
      agent_id: agentId,
      agent_name: agentName,
      api_key_hash: hashedKey,
      api_key_prefix: keyPrefix,
      status: 'active',
    })

    if (inserted) {
      return { key: rawKey, agentId, agentIdDb: inserted.id }
    }

    // Fallback: use Supabase JS client to insert into ai_school_agents
    const supabase = createServerClient(true)
    const { data, error } = await supabase
      .from('ai_school_agents')
      .insert({
        agent_id: agentId,
        agent_name: agentName,
        owner_user_id: null,
        total_requests: 0,
        total_errors: 0,
      })
      .select('id')
      .single()

    if (error || !data) {
      console.error('[MCP Auth] Fallback insert failed:', error)
      return null
    }

    return { key: rawKey, agentId, agentIdDb: data.id }
  } catch (err) {
    console.error('[MCP Auth] createApiKey error:', err)
    return null
  }
}

export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  return authHeader.slice(7)
}

export async function validateApiKey(rawKey: string): Promise<AgentInfo | null> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY_SHORTCUT ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      ''

    if (!serviceRoleKey) return null

    const hashedKey = hashApiKey(rawKey)
    const keyData = await apiKeysLookup(supabaseUrl, serviceRoleKey, hashedKey)

    if (keyData) {
      return {
        apiKeyId: keyData.id,
        agentId: keyData.agent_id,
        agentName: keyData.agent_name,
        userId: null,
        createdAt: keyData.created_at,
      }
    }

    return null
  } catch (err) {
    console.error('[MCP Auth] validateApiKey error:', err)
    return null
  }
}
