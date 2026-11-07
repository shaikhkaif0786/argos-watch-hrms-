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
  EmployeeReview,
  UserRole,
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
  employee_id TEXT NOT NULL,
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
  employee_id TEXT NOT NULL,
  employee_name TEXT,
  department TEXT,
  leave_type TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  days_count NUMERIC(5,2) DEFAULT 1,
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
  employee_id TEXT NOT NULL,
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
  employee_id TEXT NOT NULL,
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
  target_employee_id TEXT NOT NULL,
  target_employee_name TEXT,
  target_employee_department TEXT,
  target_employee_designation TEXT,
  reviewer_employee_id TEXT NOT NULL,
  reviewer_employee_name TEXT,
  reviewer_department TEXT,
  reviewer_designation TEXT,
  review_type TEXT NOT NULL,
  star_count INTEGER DEFAULT 1,
  category TEXT,
  custom_category TEXT,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING',
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

const mapEmployeeToRow = (emp: Employee) => ({
  id: emp.id,
  uid: emp.uid || `uid_${emp.id}`,
  manager_uid: emp.managerUid || 'uid_argos_admin',
  full_name: emp.fullName,
  email: emp.email || '',
  phone: emp.phone || '',
  role: emp.role || UserRole.EMPLOYEE,
  is_super_admin: emp.isSuperAdmin || false,
  designation: emp.designation || 'Employee',
  department: emp.department || 'Unassigned',
  manager_id: emp.managerId || 'EMP-ADMIN',
  manager_name: emp.managerName || 'Argos Administrator',
  status: emp.status || 'Active',
  employment_type: emp.employmentType || 'Full-Time',
  location: emp.location || 'Main Atelier & HQ',
  joining_date: emp.joiningDate || '2026-01-01',
  probation_end_date: emp.probationEndDate || '2026-04-01',
  dob: emp.dob || '1995-01-01',
  gender: emp.gender || 'Other',
  address: emp.address || '',
  emergency_contact_name: emp.emergencyContactName || '',
  emergency_contact_phone: emp.emergencyContactPhone || '',
  avatar_url: emp.avatarUrl || '',
  bank_name: emp.bankName || '',
  bank_account_number: emp.bankAccountNumber || '',
  ifsc_code: emp.ifscCode || '',
  pan_number: emp.panNumber || '',
  salary_data: emp.salary || {
    baseSalary: 0,
    hra: 0,
    specialAllowance: 0,
    pfDeduction: 0,
    taxDeduction: 0,
    professionalTax: 0,
  },
  leave_balance_data: emp.leaveBalance || {
    casualTotal: 12,
    casualUsed: 0,
    sickTotal: 8,
    sickUsed: 0,
    earnedTotal: 15,
    earnedUsed: 0,
  },
  updated_at: new Date().toISOString(),
});

const mapDepartmentToRow = (dept: Department) => ({
  id: dept.id,
  name: dept.name,
  code: dept.code || dept.name.slice(0, 3).toUpperCase(),
  head_id: dept.managerId || 'EMP-ADMIN',
  head_name: dept.managerName || 'Argos Administrator',
  description: dept.description || '',
});

const mapAttendanceToRow = (att: AttendanceRecord) => ({
  id: att.id,
  employee_id: att.employeeId,
  employee_name: att.employeeName,
  department: att.department,
  manager_id: att.managerId || 'EMP-ADMIN',
  date: att.date,
  check_in: att.checkIn || null,
  check_out: att.checkOut || null,
  punch_in: att.punchIn || att.checkIn || null,
  punch_out: att.punchOut || att.checkOut || null,
  status: att.status || 'Present',
  is_late: att.isLate || false,
  late_minutes: att.lateMinutes || 0,
  working_hours: att.workingHours || 0,
  overtime_hours: att.overtimeHours || 0,
  source: att.source || 'WEB',
  is_manual_correction: att.isManualCorrection || false,
  manual_correction_reason: att.manualCorrectionReason || null,
  notes: att.notes || '',
});

const mapLeaveToRow = (lv: LeaveRequest) => ({
  id: lv.id,
  employee_id: lv.employeeId,
  employee_name: lv.employeeName,
  department: lv.department,
  leave_type: lv.leaveType,
  start_date: lv.startDate,
  end_date: lv.endDate,
  days_count: lv.days ?? 1,
  reason: lv.reason || '',
  status: lv.status || 'Approved',
  applied_at: lv.appliedOn || lv.createdAt || new Date().toISOString().slice(0, 10),
  decided_at: lv.decidedAt || null,
  decided_by: lv.decidedBy || null,
  decision_note: lv.decisionNote || null,
});

/**
 * Upsert single Employee to Supabase
 */
export const syncEmployeeToSupabase = async (emp: Employee) => {
  if (!isSupabaseConfigured()) return;
  try {
    const client = getSupabaseClient();
    await client.from('employees').upsert([mapEmployeeToRow(emp)]);
  } catch (err) {
    console.warn('Failed syncing employee to Supabase:', err);
  }
};

/**
 * Bulk Upsert Employees to Supabase
 */
export const syncAllEmployeesToSupabase = async (employees: Employee[]) => {
  if (!isSupabaseConfigured() || employees.length === 0) return;
  try {
    const client = getSupabaseClient();
    const rows = employees.map(mapEmployeeToRow);
    for (let i = 0; i < rows.length; i += 100) {
      await client.from('employees').upsert(rows.slice(i, i + 100));
    }
  } catch (err) {
    console.warn('Failed bulk syncing employees to Supabase:', err);
  }
};

/**
 * Delete Employee from Supabase
 */
export const deleteEmployeeFromSupabase = async (employeeId: string) => {
  if (!isSupabaseConfigured()) return;
  try {
    const client = getSupabaseClient();
    await client.from('employees').delete().eq('id', employeeId);
  } catch (err) {
    console.warn('Failed deleting employee from Supabase:', err);
  }
};

/**
 * Upsert single Department to Supabase
 */
export const syncDepartmentToSupabase = async (dept: Department) => {
  if (!isSupabaseConfigured()) return;
  try {
    const client = getSupabaseClient();
    await client.from('departments').upsert([mapDepartmentToRow(dept)]);
  } catch (err) {
    console.warn('Failed syncing department to Supabase:', err);
  }
};

/**
 * Bulk Upsert Departments to Supabase
 */
export const syncAllDepartmentsToSupabase = async (departments: Department[]) => {
  if (!isSupabaseConfigured() || departments.length === 0) return;
  try {
    const client = getSupabaseClient();
    await client.from('departments').upsert(departments.map(mapDepartmentToRow));
  } catch (err) {
    console.warn('Failed bulk syncing departments to Supabase:', err);
  }
};

/**
 * Delete Department from Supabase
 */
export const deleteDepartmentFromSupabase = async (departmentId: string) => {
  if (!isSupabaseConfigured()) return;
  try {
    const client = getSupabaseClient();
    await client.from('departments').delete().eq('id', departmentId);
  } catch (err) {
    console.warn('Failed deleting department from Supabase:', err);
  }
};

/**
 * Upsert Attendance Record to Supabase
 */
export const syncAttendanceRecordToSupabase = async (att: AttendanceRecord) => {
  if (!isSupabaseConfigured()) return;
  try {
    const client = getSupabaseClient();
    await client.from('attendance_records').upsert([mapAttendanceToRow(att)]);
  } catch (err) {
    console.warn('Failed syncing attendance to Supabase:', err);
  }
};

/**
 * Bulk Upsert Attendance Records to Supabase
 */
export const syncAllAttendanceToSupabase = async (records: AttendanceRecord[]) => {
  if (!isSupabaseConfigured() || records.length === 0) return;
  try {
    const client = getSupabaseClient();
    const rows = records.map(mapAttendanceToRow);
    for (let i = 0; i < rows.length; i += 200) {
      await client.from('attendance_records').upsert(rows.slice(i, i + 200));
    }
  } catch (err) {
    console.warn('Failed bulk syncing attendance to Supabase:', err);
  }
};

/**
 * Upsert Leave Request to Supabase
 */
export const syncLeaveRequestToSupabase = async (lv: LeaveRequest) => {
  if (!isSupabaseConfigured()) return;
  try {
    const client = getSupabaseClient();
    await client.from('leave_requests').upsert([mapLeaveToRow(lv)]);
  } catch (err) {
    console.warn('Failed syncing leave request to Supabase:', err);
  }
};

/**
 * Bulk Upsert Leave Requests to Supabase
 */
export const syncAllLeavesToSupabase = async (leaves: LeaveRequest[]) => {
  if (!isSupabaseConfigured() || leaves.length === 0) return;
  try {
    const client = getSupabaseClient();
    const rows = leaves.map(mapLeaveToRow);
    for (let i = 0; i < rows.length; i += 200) {
      await client.from('leave_requests').upsert(rows.slice(i, i + 200));
    }
  } catch (err) {
    console.warn('Failed bulk syncing leaves to Supabase:', err);
  }
};

/**
 * Purge all existing Employee, Department, Attendance, Leave, Consideration, Payroll & Review records in Supabase
 */
export const purgeAllSupabaseHRMSData = async () => {
  if (!isSupabaseConfigured()) return;
  try {
    const client = getSupabaseClient();
    await Promise.all([
      client.from('employee_reviews').delete().neq('id', '__never__'),
      client.from('attendance_records').delete().neq('id', '__never__'),
      client.from('leave_requests').delete().neq('id', '__never__'),
      client.from('consideration_requests').delete().neq('id', '__never__'),
      client.from('payroll_records').delete().neq('id', '__never__'),
      client.from('employees').delete().neq('id', '__never__'),
      client.from('departments').delete().neq('id', '__never__'),
    ]);
  } catch (err) {
    console.warn('Failed purging Supabase tables:', err);
  }
};

/**
 * Fetch Initial State from Supabase tables on Startup (ensures Local & Deployed apps display identical data)
 */
export const loadInitialDataFromSupabase = async () => {
  if (!isSupabaseConfigured()) return null;
  try {
    const client = getSupabaseClient();
    const [empRes, attRes, leaveRes, deptRes, revRes] = await Promise.all([
      client.from('employees').select('*').limit(1000),
      client.from('attendance_records').select('*').order('date', { ascending: false }).limit(2000),
      client.from('leave_requests').select('*').limit(2000),
      client.from('departments').select('*').limit(200),
      client.from('employee_reviews').select('*').limit(1000),
    ]);

    if (empRes.error && deptRes.error) {
      return null;
    }

    const fetchedEmployees: Employee[] = (empRes.data || []).map((row: any) => ({
      id: row.id,
      uid: row.uid || `uid_${row.id}`,
      managerUid: row.manager_uid || 'uid_argos_admin',
      fullName: row.full_name,
      email: row.email || '',
      officialEmail: row.email || '',
      phone: row.phone || '',
      role: (row.role as UserRole) || UserRole.EMPLOYEE,
      isSuperAdmin: row.is_super_admin || false,
      designation: row.designation || 'Employee',
      department: row.department || 'General',
      managerId: row.manager_id || 'EMP-ADMIN',
      managerName: row.manager_name || 'Argos Administrator',
      status: row.status || 'Active',
      employmentType: row.employment_type || 'Full-Time',
      location: row.location || 'Main Atelier & HQ',
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
      salary: row.salary_data || {
        baseSalary: 0,
        hra: 0,
        specialAllowance: 0,
        pfDeduction: 0,
        taxDeduction: 0,
        professionalTax: 0,
      },
      leaveBalance: row.leave_balance_data || {
        casualTotal: 12,
        casualUsed: 0,
        sickTotal: 8,
        sickUsed: 0,
        earnedTotal: 15,
        earnedUsed: 0,
      },
      salaryHistory: [],
    }));

    const fetchedDepartments: Department[] = (deptRes.data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      code: row.code || row.name.slice(0, 3).toUpperCase(),
      managerId: row.head_id || 'EMP-ADMIN',
      managerName: row.head_name || 'Argos Administrator',
      parentDepartmentId: null,
      location: 'Main Atelier & HQ',
      description: row.description || '',
      annualBudget: 10000000,
    }));

    const fetchedAttendance: AttendanceRecord[] = (attRes.data || []).map((row: any) => ({
      id: row.id,
      employeeId: row.employee_id,
      employeeCode: row.employee_id,
      employeeName: row.employee_name || row.employee_id,
      department: row.department || 'General',
      managerId: row.manager_id || 'EMP-ADMIN',
      uid: `uid_${row.employee_id}`,
      managerUid: 'uid_argos_admin',
      date: row.date,
      checkIn: row.check_in || null,
      checkOut: row.check_out || null,
      punchIn: row.punch_in || row.check_in || null,
      punchOut: row.punch_out || row.check_out || null,
      status: row.status || 'Present',
      isLate: Boolean(row.is_late),
      lateMinutes: Number(row.late_minutes) || 0,
      earlyDepartureMinutes: 0,
      workingHours: Number(row.working_hours) || 0,
      overtimeHours: Number(row.overtime_hours) || 0,
      source: row.source || 'WEB',
      isManualCorrection: Boolean(row.is_manual_correction),
      manualCorrectionReason: row.manual_correction_reason || undefined,
      notes: row.notes || '',
    }));

    const fetchedLeaves: LeaveRequest[] = (leaveRes.data || []).map((row: any) => ({
      id: row.id,
      employeeId: row.employee_id,
      employeeName: row.employee_name || row.employee_id,
      department: row.department || 'General',
      managerId: 'EMP-ADMIN',
      uid: `uid_${row.employee_id}`,
      managerUid: 'uid_argos_admin',
      leaveType: row.leave_type || 'Casual',
      startDate: row.start_date,
      endDate: row.end_date,
      days: Number(row.days_count) || 1,
      isHalfDay: Number(row.days_count) === 0.5,
      reason: row.reason || '',
      appliedBy: row.employee_name || row.employee_id,
      status: row.status || 'Approved',
      appliedOn: row.applied_at || row.start_date,
      createdAt: row.applied_at || row.start_date,
      decidedAt: row.decided_at || undefined,
      decidedBy: row.decided_by || undefined,
      decisionNote: row.decision_note || undefined,
    }));

    const fetchedReviews: EmployeeReview[] = (revRes.data || []).map((row: any) => ({
      id: row.id,
      targetEmployeeId: row.target_employee_id,
      targetEmployeeName: row.target_employee_name || row.target_employee_id,
      targetEmployeeDepartment: row.target_employee_department || 'General',
      targetEmployeeDesignation: row.target_employee_designation || 'Employee',
      reviewerId: row.reviewer_employee_id,
      reviewerEmployeeId: row.reviewer_employee_id,
      reviewerName: row.reviewer_employee_name || row.reviewer_employee_id,
      reviewerEmployeeName: row.reviewer_employee_name || row.reviewer_employee_id,
      reviewerDepartment: row.reviewer_department || 'General',
      reviewerDesignation: row.reviewer_designation || 'Employee',
      reviewType: row.review_type === 'NEGATIVE' ? 'NEGATIVE' : 'POSITIVE',
      starCount: Math.min(5, Math.max(1, Number(row.star_count) || 1)),
      category: row.category || 'Other',
      customCategory: row.custom_category || undefined,
      reason: row.reason || '',
      status: row.status || 'PENDING',
      submittedAt: row.submitted_at || new Date().toISOString().slice(0, 16).replace('T', ' '),
      decidedAt: row.decided_at || undefined,
      decidedBy: row.decided_by || undefined,
      decisionNote: row.decision_note || undefined,
    }));

    return {
      employees: fetchedEmployees,
      departments: fetchedDepartments,
      attendance: fetchedAttendance,
      leaves: fetchedLeaves,
      reviews: fetchedReviews,
    };
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
