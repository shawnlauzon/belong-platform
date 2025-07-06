import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/shared/types/database'

export function createTestClient() {
  const url = process.env.VITE_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_KEY!
  
  return createClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}