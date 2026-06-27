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

// ─── API Keys stored in ai_school_api_keys table ────────────────────────────────
export async function createApiKey(agentId: string, agentName: string): Promise<{
  key: string
  agentId: string
  agentIdDb: string
} | null> {
  try {
    const supabase = createServerClient(true)
    const rawKey = generateApiKey('aas')
    const hashedKey = hashApiKey(rawKey)

    // Insert into ai_school_api_keys table
    const { data, error } = await supabase
      .from('ai_school_api_keys')
      .insert({
        agent_id: agentId,
        agent_name: agentName,
        hashed_api_key: hashedKey,
      })
      .select('id')
      .single()

    if (error || !data) {
      // Fallback: ai_school_agents table (existing schema without hashed_api_key)
      const { data: agentData, error: agentError } = await supabase
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

      if (agentError || !agentData) {
        console.error('[MCP Auth] Failed to create agent:', agentError || error)
        return null
      }
      return { key: rawKey, agentId, agentIdDb: agentData.id }
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
    const supabase = createServerClient(true)
    const hashedKey = hashApiKey(rawKey)

    // Try ai_school_api_keys table first
    const { data: keyData } = await supabase
      .from('ai_school_api_keys')
      .select('id, agent_id, agent_name, created_at')
      .eq('hashed_api_key', hashedKey)
      .maybeSingle()

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
