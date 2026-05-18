'use client';

import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

let supabase: ReturnType<typeof createClient<Database>> | null = null;

function initSupabase() {
  if (supabase) {
    return supabase;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Validate environment variables
  if (!supabaseUrl || !supabaseAnonKey) {
    const error = `Missing Supabase environment variables. URL: ${!!supabaseUrl}, Anon Key: ${!!supabaseAnonKey}`;
    console.error(error);
    throw new Error(error);
  }

  supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return supabase;
}

export { initSupabase };
export const getSupabase = () => initSupabase();
