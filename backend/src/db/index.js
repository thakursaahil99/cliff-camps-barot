import { config } from '../config.js';
import { createSupabaseStore } from './supabase.js';
import { createMemoryStore } from './memory.js';

let store;

/** Supabase when credentials are set; otherwise the local JSON store (development only). */
export function db() {
  if (store) return store;
  const hasSupabase = config.supabase.url && config.supabase.serviceKey;
  if (hasSupabase && !config.useMemoryDb) {
    store = createSupabaseStore();
  } else {
    if (config.isProd) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in production');
    console.warn('[db] Supabase not configured - using local JSON store in backend/.data (development only)');
    store = createMemoryStore();
  }
  return store;
}
