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
 * Supabase Auth: Verify OTP Code (Email or Mobile Phone)
 */
export const supabaseVerifyOtp = async (identifier: string, token: string) => {
  if (!isSupabaseConfigured()) {
    return { data: null, error: new Error('Supabase credentials not configured') };
  }
  const client = getSupabaseClient();
  const isEmail = identifier.includes('@');
  if (isEmail) {
    return await client.auth.verifyOtp({
      email: identifier,
      token: token.trim(),
      type: 'email',
    });
  } else {
    return await client.auth.verifyOtp({
      phone: identifier,
      token: token.trim(),
      type: 'sms',
    });
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

/**
 * Record User Login Activity in Supabase Table 'user_login_activity'
 * Visible in Supabase Dashboard Table Editor & SQL Editor
 */
export interface LoginLogEntry {
  email?: string;
  phone?: string;
  employeeId?: string;
  employeeName?: string;
  department?: string;
  role?: string;
  authMethod: 'EMAIL_OTP' | 'PHONE_OTP' | 'PASSWORD' | 'GOOGLE';
  status?: 'SUCCESS' | 'FAILED';
}

export const recordSupabaseLoginActivity = async (entry: LoginLogEntry) => {
  if (!isSupabaseConfigured()) return;
  try {
    const client = getSupabaseClient();
    const payload = {
      user_id: entry.employeeId || 'EMP-ADMIN',
      email: entry.email || null,
      phone: entry.phone || null,
      employee_id: entry.employeeId || 'EMP-ADMIN',
      employee_name: entry.employeeName || 'Argos Administrator',
      department: entry.department || 'Administration',
      role: entry.role || 'ADMIN',
      auth_method: entry.authMethod,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 100) : 'Web App',
      login_status: entry.status || 'SUCCESS',
      logged_in_at: new Date().toISOString(),
    };

    const res = await client.from('user_login_activity').insert([payload]);
    if (res.error) {
      console.warn('Supabase login activity log note:', res.error.message);
    }
  } catch (err) {
    console.warn('Failed recording Supabase login activity:', err);
  }
};

/**
 * Professional HTML Email Template for Supabase Auth OTP
 */
export const SUPABASE_EMAIL_OTP_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your Argos HRMS Verification Code</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f7; margin: 0; padding: 40px 20px;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #e5e5ea;">
    <tr>
      <td style="padding: 32px 32px 24px 32px; background-color: #0f172a; text-align: center;">
        <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0;">Argos HRMS</h1>
        <p style="color: #94a3b8; font-size: 13px; margin: 6px 0 0 0;">Enterprise Identity & Authentication Services</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <p style="color: #334155; font-size: 15px; margin: 0 0 20px 0; line-height: 1.5;">Hello,</p>
        <p style="color: #334155; font-size: 15px; margin: 0 0 24px 0; line-height: 1.5;">Use the following 6-digit One-Time Password (OTP) code to sign in to your workspace:</p>
        <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
          <span style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #0f172a;">{{ .Token }}</span>
        </div>
        <p style="color: #64748b; font-size: 13px; margin: 0 0 16px 0; line-height: 1.5;">This verification code is valid for <strong>10 minutes</strong>. Do not share this code with anyone.</p>
        <p style="color: #94a3b8; font-size: 12px; margin: 24px 0 0 0; padding-top: 16px; border-top: 1px solid #f1f5f9; text-align: center;">If you did not request this verification code, please contact your HR administrator.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;

/**
 * SMS OTP Template for Supabase Twilio/MessageBird/Vonage Integration
 */
export const SUPABASE_SMS_OTP_TEMPLATE = `Your Argos HRMS login verification code is {{ .Token }}. Valid for 10 minutes. Do not share this code.`;

/**
 * SQL Schema Script for Supabase Table Editor
 */
export const SUPABASE_LOGIN_ACTIVITY_SQL = `-- Create Login Activity Table in Supabase Dashboard (SQL Editor)
CREATE TABLE IF NOT EXISTS public.user_login_activity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT,
  email TEXT,
  phone TEXT,
  employee_id TEXT,
  employee_name TEXT,
  department TEXT,
  role TEXT,
  auth_method TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  login_status TEXT DEFAULT 'SUCCESS',
  logged_in_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security and setup access policies
ALTER TABLE public.user_login_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public inserts for login activity" 
ON public.user_login_activity FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow read login activity for authenticated users" 
ON public.user_login_activity FOR SELECT USING (true);`;
