import { createClient, SupabaseClient } from '@supabase/supabase-js';
import ws from 'ws';

/** Supabase client for Storage only (Node 20 needs ws for Realtime init). */
export function createStorageSupabaseClient(url: string, serviceRoleKey: string): SupabaseClient {
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: ws as never },
  });
}
