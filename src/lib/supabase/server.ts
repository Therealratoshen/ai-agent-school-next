import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function createServerClient(useServiceRole = false): Promise<SupabaseClient> {
  const cookieStore = await cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = useServiceRole
    ? process.env.SUPABASE_SERVICE_ROLE_KEY!
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const supabase = createClient(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  } as any)

  return supabase
}
