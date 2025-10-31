// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { env } from './env';

export function supabaseAdmin() {
  if (!env.supabaseServiceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  return createClient(env.supabaseUrl, env.supabaseServiceKey, { auth: { persistSession: false } });
}

export function supabaseAnon() {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, { auth: { persistSession: false } });
}
