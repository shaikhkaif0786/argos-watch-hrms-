-- ============================================================================
-- ARGOS WATCH HRMS — SUPABASE DATABASE, STRICT RLS SECURITY & ADMIN USERS
-- Run this entire script ONCE in Supabase Dashboard -> SQL Editor -> New Query
-- ============================================================================

-- 1. Create missing tables used by HRMS app
CREATE TABLE IF NOT EXISTS public.user_login_activity (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text,
  phone text,
  employee_id text,
  employee_name text,
  department text,
  role text,
  auth_method text,
  status text,
  device_info text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.performance_reviews (
  id text PRIMARY KEY,
  employee_id text,
  reviewer_id text,
  period text,
  rating numeric,
  status text,
  payload jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Enable Row Level Security (RLS) on ALL HRMS tables
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consideration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_login_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;

-- 3. Strict Authenticated-Only Policies (100% blocks unauthenticated / anon hackers!)
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'employees',
    'attendance_records',
    'leave_requests',
    'consideration_requests',
    'payroll_records',
    'departments',
    'company_policies',
    'activity_logs',
    'user_login_activity',
    'performance_reviews'
  ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated users full access on %I" ON public.%I;', t, t);
    EXECUTE format(
      'CREATE POLICY "Authenticated users full access on %I" ON public.%I FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);',
      t, t
    );
  END LOOP;
END $$;

-- 4. Create the 2 Admin Users directly in Supabase Auth (email_confirmed = true)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  u1_id uuid := gen_random_uuid();
  u2_id uuid := gen_random_uuid();
BEGIN
  -- Admin 1: shaikhkaif@argos.watch / Kaif@123
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'shaikhkaif@argos.watch') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', u1_id, 'authenticated', 'authenticated',
      'shaikhkaif@argos.watch', crypt('Kaif@123', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"],"role":"ADMIN"}'::jsonb,
      '{"full_name":"Shaikh Kaif","role":"ADMIN"}'::jsonb,
      now(), now(), '', ''
    );
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), u1_id,
      jsonb_build_object('sub', u1_id::text, 'email', 'shaikhkaif@argos.watch'),
      'email', u1_id::text, now(), now(), now()
    );
  END IF;

  -- Admin 2: asifshaikh@argos.watch / Asif@123
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'asifshaikh@argos.watch') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', u2_id, 'authenticated', 'authenticated',
      'asifshaikh@argos.watch', crypt('Asif@123', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"],"role":"ADMIN"}'::jsonb,
      '{"full_name":"Asif Shaikh","role":"ADMIN"}'::jsonb,
      now(), now(), '', ''
    );
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), u2_id,
      jsonb_build_object('sub', u2_id::text, 'email', 'asifshaikh@argos.watch'),
      'email', u2_id::text, now(), now(), now()
    );
  END IF;
END $$;
