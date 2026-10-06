import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Cache keys for credentials stored via UI or Environment
const STORAGE_KEY_URL = 'ctrl_print_supabase_url';
const STORAGE_KEY_KEY = 'ctrl_print_supabase_anon_key';

export function getStoredSupabaseConfig(): { url: string; anonKey: string } {
  let url = '';
  let anonKey = '';

  if (typeof window !== 'undefined') {
    url = localStorage.getItem(STORAGE_KEY_URL) || '';
    anonKey = localStorage.getItem(STORAGE_KEY_KEY) || '';
  }

  if (!url) {
    url = (import.meta.env.VITE_SUPABASE_URL as string) || '';
  }

  if (!anonKey) {
    anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';
  }

  return { url: url.trim(), anonKey: anonKey.trim() };
}

export function saveSupabaseConfig(url: string, anonKey: string) {
  if (typeof window !== 'undefined') {
    if (url) {
      localStorage.setItem(STORAGE_KEY_URL, url.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY_URL);
    }

    if (anonKey) {
      localStorage.setItem(STORAGE_KEY_KEY, anonKey.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY_KEY);
    }
  }

  // Re-instantiate client
  cachedClient = null;
}

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;

  const { url, anonKey } = getStoredSupabaseConfig();

  if (url && anonKey && url.startsWith('http')) {
    try {
      cachedClient = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      });
      return cachedClient;
    } catch (e) {
      console.warn('Failed to initialize Supabase client:', e);
      return null;
    }
  }

  return null;
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getStoredSupabaseConfig();
  return Boolean(url && anonKey && url.startsWith('http') && anonKey.length > 10);
}
