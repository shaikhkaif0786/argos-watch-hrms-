import { createClient, SupabaseClient } from '@supabase/supabase-js';

const getEnvUrl = () => import.meta.env.VITE_SUPABASE_URL || '';
const getEnvKey = () => import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const getLocalUrl = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('argos_supabase_url') || '';
  }
  return '';
};

const getLocalKey = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('argos_supabase_anon_key') || '';
  }
  return '';
};

export const getSupabaseConfig = () => {
  const envUrl = getEnvUrl();
  const envKey = getEnvKey();
  if (envUrl && envKey) {
    return { url: envUrl, key: envKey, source: 'env' as const };
  }

  const localUrl = getLocalUrl();
  const localKey = getLocalKey();
  if (localUrl && localKey) {
    return { url: localUrl, key: localKey, source: 'localStorage' as const };
  }

  return { url: '', key: '', source: 'none' as const };
};

export const isSupabaseConfigured = () => {
  const config = getSupabaseConfig();
  return Boolean(config.url && config.key);
};

let clientInstance: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient => {
  const config = getSupabaseConfig();
  if (!clientInstance) {
    clientInstance = createClient(
      config.url || 'https://placeholder.supabase.co',
      config.key || 'placeholder-key'
    );
  }
  return clientInstance;
};

export const resetSupabaseClient = () => {
  clientInstance = null;
};

export const saveSupabaseCredentials = (url: string, key: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('argos_supabase_url', url.trim());
    localStorage.setItem('argos_supabase_anon_key', key.trim());
    resetSupabaseClient();
  }
};

export const clearSupabaseCredentials = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('argos_supabase_url');
    localStorage.removeItem('argos_supabase_anon_key');
    resetSupabaseClient();
  }
};

export const supabase = getSupabaseClient();

/**
 * Supabase Auth: Sign in with Email and Password
 */
export const supabaseSignInWithEmail = async (email: string, password: string) => {
  if (!isSupabaseConfigured()) {
    return { data: null, error: new Error('Supabase credentials not configured') };
  }
  const client = getSupabaseClient();
  return await client.auth.signInWithPassword({
    email,
    password,
  });
};

/**
 * Supabase Auth: Sign in with Mobile Phone and Password
 */
export const supabaseSignInWithPhone = async (phone: string, password: string) => {
  if (!isSupabaseConfigured()) {
    return { data: null, error: new Error('Supabase credentials not configured') };
  }
  const client = getSupabaseClient();
  return await client.auth.signInWithPassword({
    phone,
    password,
  });
};

/**
 * Supabase Auth: Send OTP Code (Email or Mobile Phone)
 */
export const supabaseSendOtp = async (identifier: string) => {
  if (!isSupabaseConfigured()) {
    return { data: null, error: new Error('Supabase credentials not configured') };
  }
  const client = getSupabaseClient();
  const isEmail = identifier.includes('@');
  if (isEmail) {
    return await client.auth.signInWithOtp({ email: identifier });
  } else {
    return await client.auth.signInWithOtp({ phone: identifier });
  }
};

/**
 * Supabase Auth: Sign Out
 */
export const supabaseSignOut = async () => {
  if (!isSupabaseConfigured()) return { error: null };
  const client = getSupabaseClient();
  return await client.auth.signOut();
};
