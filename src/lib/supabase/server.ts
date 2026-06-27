import { createClient, SupabaseClient } from '@supabase/supabase-js'

export async function createServerClient(useServiceRole = false): Promise<SupabaseClient> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  // Both env vars hold the ShortcutSistem service role key value.
  // SUPABASE_SERVICE_ROLE_KEY_SHORTCUT: secret store value
  // NEXT_PUBLIC_SUPABASE_ANON_KEY: Vercel env var (always accessible, same value)
  const key = useServiceRole
    ? (process.env.SUPABASE_SERVICE_ROLE_KEY_SHORTCUT || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')
    : (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')

  if (!key) {
    throw new Error('Missing Supabase API key. Set NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel env vars.')
  }

  const supabase = createClient(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  } as any)

  return supabase
}
