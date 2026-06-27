import { createClient, SupabaseClient } from '@supabase/supabase-js'

export async function createServerClient(useServiceRole = false): Promise<SupabaseClient> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  // Use ShortcutSistem's Supabase credentials
  // Service role key stored as SUPABASE_SERVICE_ROLE_KEY_SHORTCUT
  // Anon key stored as NEXT_PUBLIC_SUPABASE_ANON_KEY (same as service role for now)
  const key = useServiceRole
    ? (process.env.SUPABASE_SERVICE_ROLE_KEY_SHORTCUT || process.env.SUPABASE_SERVICE_ROLE_KEY || '')
    : (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY_SHORTCUT || '')

  const supabase = createClient(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  } as any)

  return supabase
}
