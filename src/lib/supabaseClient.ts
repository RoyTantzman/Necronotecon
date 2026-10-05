import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigured = () => !!SUPABASE_URL && !!SUPABASE_KEY

export function makeClient() {
  return createClient(SUPABASE_URL!, SUPABASE_KEY!)
}
