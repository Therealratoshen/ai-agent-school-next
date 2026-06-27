import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export function createServerClient(serviceRole = false): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const key = serviceRole
    ? (process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder')
    : (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder')
  return createClient(url, key)
}
