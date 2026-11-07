import { getSupabaseClient, isSupabaseConfigured } from './supabase';
import {
  Employee,
  AttendanceRecord,
  LeaveRequest,
  ConsiderationRequest,
  PayrollRecord,
  Department,
  CompanyPolicy,
  ActivityLogEntry,
  UserAccessRecord,
  CompanySettings,
  EmployeeReview,
} from '../types/hrms';

/**
 * Complete SQL Schema for Supabase Table Creation
 * Paste into Supabase Dashboard -> SQL Editor
 */
export const SUPABASE_FULL_HRMS_SCHEMA_SQL = `-- ========================================================
-- ARGOS HRMS FULL DATABASE SCHEMA FOR SUPABASE
-- Run this in Supabase Dashboard -> SQL Editor
-- ========================================================

-- 1. Employees Table
CREATE TABLE IF NOT EXISTS public.employees (
  id TEXT PRIMARY KEY,
  uid TEXT,
  manager_uid TEXT,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL,
  is_super_admin BOOLEAN DEFAULT false,
  designation TEXT,
  department TEXT,
  manager_id TEXT,
  manager_name TEXT,
  status TEXT DEFAULT 'Active',
  employment_type TEXT DEFAULT 'Full-Time',
  location TEXT,
  joining_date TEXT,
  probation_end_date TEXT,
  dob TEXT,
  gender TEXT,
  address TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  avatar_url TEXT,
  bank_name TEXT,
  bank_account_number TEXT,
  ifsc_code TEXT,
  pan_number TEXT,
  salary_data JSONB,
  leave_balance_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Attendance Records Table
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  employee_name TEXT,
  department TEXT,
  manager_id TEXT,
  date TEXT NOT NULL,
  check_in TEXT,
  check_out TEXT,
  punch_in TEXT,
  punch_out TEXT,
  status TEXT DEFAULT 'Present',
  is_late BOOLEAN DEFAULT false,
  late_minutes INTEGER DEFAULT 0,
  working_hours NUMERIC(5,2) DEFAULT 0,
  overtime_hours NUMERIC(5,2) DEFAULT 0,
  source TEXT DEFAULT 'WEB',
  is_manual_correction BOOLEAN DEFAULT false,
  manual_correction_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Leave Requests Table
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  employee_name TEXT,
  department TEXT,
  leave_type TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  days_count INTEGER DEFAULT 1,
  reason TEXT,
  status TEXT DEFAULT 'Pending',
  applied_at TEXT,
  decided_at TEXT,
  decided_by TEXT,
  decision_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Consideration Requests Table
CREATE TABLE IF NOT EXISTS public.consideration_requests (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  employee_name TEXT,
  department TEXT,
  date TEXT NOT NULL,
  type TEXT NOT NULL,
  reason TEXT,
  supporting_note TEXT,
  status TEXT DEFAULT 'Pending HR',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Payroll Records Table
CREATE TABLE IF NOT EXISTS public.payroll_records (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  employee_name TEXT,
  department TEXT,
  month TEXT NOT NULL,
  gross_salary NUMERIC(10,2) DEFAULT 0,
  base_salary NUMERIC(10,2) DEFAULT 0,
  net_salary NUMERIC(10,2) DEFAULT 0,
  late_deduction NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'Processed',
  processed_at TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Departments Table
CREATE TABLE IF NOT EXISTS public.departments (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  code TEXT,
  head_id TEXT,
  head_name TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. Company Policies Table
CREATE TABLE IF NOT EXISTS public.company_policies (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT,
  description TEXT,
  version TEXT DEFAULT '1.0',
  effective_date TEXT,
  status TEXT DEFAULT 'Active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 8. Activity Logs Table
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  category TEXT,
  actor_name TEXT,
  actor_id TEXT,
  target_item TEXT,
  details TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 9. Employee Reviews Table
CREATE TABLE IF NOT EXISTS public.employee_reviews (
  id TEXT PRIMARY KEY,
  target_employee_id TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  target_employee_name TEXT,
  target_employee_department TEXT,
  target_employee_designation TEXT,
  reviewer_employee_id TEXT NOT NULL,
  reviewer_employee_name TEXT,
  reviewer_department TEXT,
  reviewer_designation TEXT,
  review_type TEXT NOT NULL, -- POSITIVE or NEGATIVE
  star_count INTEGER DEFAULT 1, -- 1 to 5 stars
  category TEXT,
  custom_category TEXT,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  decided_at TIMESTAMP WITH TIME ZONE,
  decided_by TEXT,
  decision_note TEXT
);

-- Enable RLS & Allow Anonymous/Public Access for HRMS Operations
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consideration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow All Employees Ops" ON public.employees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Attendance Ops" ON public.attendance_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Leave Ops" ON public.leave_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Consideration Ops" ON public.consideration_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Payroll Ops" ON public.payroll_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Departments Ops" ON public.departments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Policies Ops" ON public.company_policies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Activity Logs Ops" ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Reviews Ops" ON public.employee_reviews FOR ALL USING (true) WITH CHECK (true);
`;

/**
 * Async Sync Routine: Upsert Employee to Supabase
 */
export const syncEmployeeToSupabase = async (emp: Employee) => {
  if (!isSupabaseConfigured()) return;
  try {
    const client = getSupabaseClient();
    await client.from('employees').upsert([
      {
        id: emp.id,
        uid: emp.uid,
        manager_uid: emp.managerUid,
        full_name: emp.fullName,
        email: emp.email,
        phone: emp.phone,
        role: emp.role,
        is_super_admin: emp.isSuperAdmin || false,
        designation: emp.designation,
        department: emp.department,
        manager_id: emp.managerId,
        manager_name: emp.managerName,
        status: emp.status,
        employment_type: emp.employmentType,
        location: emp.location,
        joining_date: emp.joiningDate,
        probation_end_date: emp.probationEndDate,
        dob: emp.dob,
        gender: emp.gender,
        address: emp.address,
        emergency_contact_name: emp.emergencyContactName,
        emergency_contact_phone: emp.emergencyContactPhone,
        avatar_url: emp.avatarUrl,
        bank_name: emp.bankName,
        bank_account_number: emp.bankAccountNumber,
        ifsc_code: emp.ifscCode,
        pan_number: emp.panNumber,
        salary_data: emp.salary,
        leave_balance_data: emp.leaveBalance,
        updated_at: new Date().toISOString(),
      },
    ]);
  } catch (err) {
    console.warn('Failed syncing employee to Supabase:', err);
  }
};

/**
 * Async Sync Routine: Upsert Attendance Record to Supabase
 */
export const syncAttendanceRecordToSupabase = async (att: AttendanceRecord) => {
  if (!isSupabaseConfigured()) return;
  try {
    const client = getSupabaseClient();
    await client.from('attendance_records').upsert([
      {
        id: att.id,
        employee_id: att.employeeId,
        employee_name: att.employeeName,
        department: att.department,
        manager_id: att.managerId,
        date: att.date,
        check_in: att.checkIn,
        check_out: att.checkOut,
        punch_in: att.punchIn,
        punch_out: att.punchOut,
        status: att.status,
        is_late: att.isLate || false,
        late_minutes: att.lateMinutes || 0,
        working_hours: att.workingHours || 0,
        overtime_hours: att.overtimeHours || 0,
        source: att.source || 'WEB',
        is_manual_correction: att.isManualCorrection || false,
        manual_correction_reason: att.manualCorrectionReason,
        notes: att.notes,
      },
    ]);
  } catch (err) {
    console.warn('Failed syncing attendance to Supabase:', err);
  }
};

/**
 * Fetch Initial State from Supabase tables on Startup
 */
export const loadInitialDataFromSupabase = async () => {
  if (!isSupabaseConfigured()) return null;
  try {
    const client = getSupabaseClient();
    const [empRes, attRes, leaveRes, deptRes] = await Promise.all([
      client.from('employees').select('*').limit(500),
      client.from('attendance_records').select('*').order('date', { ascending: false }).limit(500),
      client.from('leave_requests').select('*').limit(500),
      client.from('departments').select('*').limit(100),
    ]);

    if (empRes.data && empRes.data.length > 0) {
      const fetchedEmployees: Employee[] = empRes.data.map((row: any) => ({
        id: row.id,
        uid: row.uid || `uid_${row.id}`,
        managerUid: row.manager_uid || 'uid_argos_admin',
        fullName: row.full_name,
        email: row.email || '',
        phone: row.phone || '',
        role: row.role || 'EMPLOYEE',
        isSuperAdmin: row.is_super_admin || false,
        designation: row.designation || 'Employee',
        department: row.department || 'General',
        managerId: row.manager_id || 'EMP-ADMIN',
        managerName: row.manager_name || 'Root Admin',
        status: row.status || 'Active',
        employmentType: row.employment_type || 'Full-Time',
        location: row.location || 'HQ',
        joiningDate: row.joining_date || '2026-01-01',
        probationEndDate: row.probation_end_date || '2026-04-01',
        dob: row.dob || '1995-01-01',
        gender: row.gender || 'Other',
        address: row.address || '',
        emergencyContactName: row.emergency_contact_name || '',
        emergencyContactPhone: row.emergency_contact_phone || '',
        avatarUrl: row.avatar_url || '',
        bankName: row.bank_name || '',
        bankAccountNumber: row.bank_account_number || '',
        ifscCode: row.ifsc_code || '',
        panNumber: row.pan_number || '',
        salary: row.salary_data || { baseSalary: 0, hra: 0, specialAllowance: 0, pfDeduction: 0, taxDeduction: 0, professionalTax: 0 },
        leaveBalance: row.leave_balance_data || { casualTotal: 12, casualUsed: 0, sickTotal: 8, sickUsed: 0, earnedTotal: 15, earnedUsed: 0 },
        salaryHistory: [],
      }));

      return {
        employees: fetchedEmployees,
        attendance: attRes.data || [],
        leaves: leaveRes.data || [],
        departments: deptRes.data || [],
      };
    }
  } catch (err) {
    console.warn('Supabase fetch error:', err);
  }
  return null;
};

/**
 * Async Sync Routine: Upsert Employee Review to Supabase
 */
export const syncReviewToSupabase = async (rev: EmployeeReview) => {
  if (!isSupabaseConfigured()) return;
  try {
    const client = getSupabaseClient();
    await client.from('employee_reviews').upsert([
      {
        id: rev.id,
        target_employee_id: rev.targetEmployeeId,
        target_employee_name: rev.targetEmployeeName,
        target_employee_department: rev.targetEmployeeDepartment,
        target_employee_designation: rev.targetEmployeeDesignation,
        reviewer_employee_id: rev.reviewerEmployeeId || rev.reviewerId,
        reviewer_employee_name: rev.reviewerEmployeeName || rev.reviewerName,
        reviewer_department: rev.reviewerDepartment,
        reviewer_designation: rev.reviewerDesignation,
        review_type: rev.reviewType,
        star_count: rev.starCount || 1,
        category: rev.category || 'Other',
        custom_category: rev.customCategory || null,
        reason: rev.reason,
        status: rev.status,
        submitted_at: rev.submittedAt,
        decided_at: rev.decidedAt || null,
        decided_by: rev.decidedBy || null,
        decision_note: rev.decisionNote || null,
      },
    ]);
  } catch (err) {
    console.warn('Failed syncing review to Supabase:', err);
  }
};
