import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { createServerClient } from '../supabase/client'

const BCRYPT_ROUNDS = 10

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

export async function createApiKey(agentId: string, agentName: string): Promise<{
  key: string
  agentId: string
  agentIdDb: string
} | null> {
  try {
    const supabase = createServerClient(true)
    const rawKey = generateApiKey('aas')

    // Hash the key for storage
    const hashedKey = hashApiKey(rawKey)

    const { data, error } = await supabase
      .from('ai_school_agents')
      .insert({
        agent_id: agentId,
        agent_name: agentName,
        hashed_api_key: hashedKey,
        total_requests: 0,
        total_errors: 0,
      })
      .select('id, agent_id, agent_name')
      .single()

    if (error || !data) {
      console.error('[MCP Auth] Failed to create agent:', error?.message)
      return null
    }

    return {
      key: rawKey,
      agentId: data.agent_id,
      agentIdDb: data.id,
    }
  } catch (err) {
    console.error('[MCP Auth] createApiKey error:', err)
    return null
  }
}

export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  return authHeader.slice(7)
}

export async function validateApiKey(
  rawKey: string
): Promise<AgentInfo | null> {
  try {
    const supabase = createServerClient(true)
    const hashedKey = hashApiKey(rawKey)

    const { data, error } = await supabase
      .from('ai_school_agents')
      .select('id, agent_id, agent_name, supabase_user_id, created_at')
      .eq('hashed_api_key', hashedKey)
      .maybeSingle()

    if (error || !data) return null

    return {
      apiKeyId: data.id,
      agentId: data.agent_id,
      agentName: data.agent_name,
      userId: data.supabase_user_id,
      createdAt: data.created_at,
    }
  } catch (err) {
    console.error('[MCP Auth] validateApiKey error:', err)
    return null
  }
}
