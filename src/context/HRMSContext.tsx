import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import {
  UserRole,
  PrimaryModuleId,
  MoreSubModuleId,
  Employee,
  Department,
  AttendanceRecord,
  LeaveRequest,
  ConsiderationRequest,
  PayrollRecord,
  CompanyPolicy,
  Announcement,
  EmployeeDocument,
  GeneratedLetter,
  InternshipRecord,
  HolidayRecord,
  NotificationItem,
  ActivityLogEntry,
  CompanySettings,
  CustomCompanyRule,
  UserAccessRecord,
  MasterLetterTemplate,
  LetterHistoryRecord,
  ModuleActionPermission,
  NoticePeriodDetails,
  FinalExitDetails,
  PunchEvent,
  PunchSource,
  BirthdayCelebrationRecord,
  CustomRoleDefinition,
  GranularPermissionItem,
  PermissionState,
  WorkspaceMode,
  MobileAppAccessStatus,
  MobileAppUserRecord,
  MobileLocationCaptureRecord,
  MobileAppStoreConfig,
  MobileAttendancePermissionConfig,
  EmployeeReview,
  ReviewType,
  ReviewStatus,
  PublicEmployeeReview,
  EmployeeStarSummary,
} from '../types/hrms';
import {
  getNormalizedPunchesForRecord,
  calculateLateDeduction,
} from '../lib/attendanceCalculations';
import {
  INITIAL_USER_ACCESS,
  INITIAL_MASTER_LETTER_TEMPLATES,
  INITIAL_LETTER_HISTORY,
  getDefaultPermissionsForRole,
  INITIAL_ROLES,
  GRANULAR_PERMISSION_CATALOG,
  resolveEffectivePermission,
  buildRoleDefaultPermissions,
  INITIAL_MOBILE_APP_USERS,
  INITIAL_MOBILE_LOCATION_LOGS,
  INITIAL_MOBILE_STORE_CONFIG,
} from '../data/accessAndOrgData';
import { SupportedLanguage, getTranslation } from '../lib/i18n';
import {
  isSupabaseConfigured,
  supabaseSignInWithEmail,
  supabaseSignInWithPhone,
  supabaseSendOtp,
  supabaseVerifyOtp,
  recordSupabaseLoginActivity,
  supabaseSignOut,
} from '../lib/supabase';
import {
  syncEmployeeToSupabase,
  syncAllEmployeesToSupabase,
  deleteEmployeeFromSupabase,
  syncDepartmentToSupabase,
  syncAllDepartmentsToSupabase,
  deleteDepartmentFromSupabase,
  syncAttendanceRecordToSupabase,
  syncAllAttendanceToSupabase,
  syncLeaveRequestToSupabase,
  syncAllLeavesToSupabase,
  loadInitialDataFromSupabase,
  syncReviewToSupabase,
  purgeAllSupabaseHRMSData,
} from '../lib/supabaseSync';
import {
  extractCsvFilesFromZipBuffer,
  parseCsvToObjects,
  transformCsvMapToHRMSData,
  ZohoImportSummary,
} from '../lib/zohoZipImporter';
import {
  TODAY_DATE,
  INITIAL_COMPANY_SETTINGS,
  INITIAL_DEPARTMENTS,
  INITIAL_EMPLOYEES,
  INITIAL_ATTENDANCE,
  INITIAL_LEAVES,
  INITIAL_CONSIDERATIONS,
  INITIAL_PAYROLLS,
  INITIAL_POLICIES,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_DOCUMENTS,
  INITIAL_LETTERS,
  INITIAL_INTERNSHIPS,
  INITIAL_HOLIDAYS,
  INITIAL_NOTIFICATIONS,
  INITIAL_ACTIVITY_LOGS,
  INITIAL_BIRTHDAYS,
  INITIAL_REVIEWS,
} from '../data/seedData';
import {
  isAssignedTeamMember,
  scopeEmployees,
  scopeAttendance,
  scopeLeaves,
  scopeConsiderations,
  scopePayrolls,
  scopeDocuments,
  scopeLetters,
  scopePolicies,
  scopeAnnouncements,
  scopeActivityLogs,
} from '../lib/rbac';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'error' | 'info';
}

export interface ReportFilterPreset {
  reportType?: string;
  department?: string;
  status?: string;
}

interface HRMSContextValue {
  // Auth & Role Persona State
  isAuthenticated: boolean;
  firebaseUser: FirebaseUser | null;
  authLoading: boolean;
  currentRole: UserRole;
  underlyingRole: UserRole;
  activeWorkspace: WorkspaceMode;
  canSwitchWorkspace: boolean;
  switchWorkspace: (mode: WorkspaceMode) => void;
  currentEmployee: Employee;
  switchRolePersona: (role: UserRole) => void;
  switchEmployeePersona: (employeeId: string) => void;
  signInWithGoogle: () => Promise<void>;
  signInWithEmailOrPhone: (
    identifier: string,
    passwordOrOtp: string,
    mode?: 'password' | 'otp'
  ) => Promise<{ success: boolean; message?: string }>;
  signOutUser: () => Promise<void>;

  // Role & Granular Permission Engine
  rolesList: CustomRoleDefinition[];
  permissionCatalog: GranularPermissionItem[];
  hasPermission: (permissionId: string) => boolean;
  createCustomRole: (payload: {
    name: string;
    description: string;
    accessLevel: 'Viewer' | 'Controller';
    permissions: Record<string, boolean>;
    assignToEmployeeIds?: string[];
  }) => CustomRoleDefinition | null;
  updateCustomRole: (roleId: string, updates: Partial<CustomRoleDefinition>, reasonNote?: string) => void;
  deleteCustomRole: (
    roleId: string,
    reassignToRoleId?: string,
    reasonNote?: string
  ) => { success: boolean; message: string };
  assignRoleToUser: (employeeId: string, roleId: string, reasonNote?: string) => void;
  setUserPermissionOverride: (
    employeeId: string,
    permissionId: string,
    state: PermissionState,
    reasonNote?: string
  ) => void;
  setBatchUserPermissionOverrides: (
    employeeId: string,
    overrides: Record<string, PermissionState>,
    reasonNote?: string
  ) => void;
  addCustomPermissionItem: (item: Omit<GranularPermissionItem, 'isCustom'>) => void;
  allActivityLogs: ActivityLogEntry[];

  // Navigation State
  activeModule: PrimaryModuleId;
  activeSubModule: MoreSubModuleId | null;
  selectedEmployeeId: string | null;
  reportPreset: ReportFilterPreset | null;
  navigateTo: (
    module: PrimaryModuleId,
    subModule?: MoreSubModuleId | null,
    employeeId?: string | null,
    preset?: ReportFilterPreset | null
  ) => void;
  openEmployeeProfile: (employeeId: string) => void;

  // Raw & Role-Scoped Data
  allEmployees: Employee[];
  scopedEmployees: Employee[];
  departments: Department[];
  scopedAttendance: AttendanceRecord[];
  scopedLeaves: LeaveRequest[];
  scopedConsiderations: ConsiderationRequest[];
  scopedPayrolls: PayrollRecord[];
  scopedDocuments: EmployeeDocument[];
  scopedLetters: GeneratedLetter[];
  scopedPolicies: CompanyPolicy[];
  scopedAnnouncements: Announcement[];
  internships: InternshipRecord[];
  holidays: HolidayRecord[];
  notifications: NotificationItem[];
  scopedActivityLogs: ActivityLogEntry[];
  settings: CompanySettings;
  companySettings: CompanySettings;

  // Smart Workflows & Actions
  checkInToday: (notes?: string, options?: { viaMobileApp?: boolean } | 'Web Portal' | 'Mobile App') => void;
  checkOutToday: (options?: { viaMobileApp?: boolean } | 'Web Portal' | 'Mobile App') => void;
  logOrUpdateAttendanceForEmployee: (payload: {
    employeeId: string;
    date: string;
    checkIn?: string;
    checkOut?: string | null;
    punchIn?: string | null;
    punchOut?: string | null;
    status: AttendanceRecord['status'];
    lateByMinutes?: number;
    notes: string;
    [key: string]: any;
  }) => void;
  logManualAttendance: (payload: {
    employeeId: string;
    date: string;
    punchIn?: string | null;
    punchOut?: string | null;
    status: AttendanceRecord['status'];
    reason: string;
    notes?: string;
    lateByMinutes?: number;
  }) => void;
  archiveEmployee: (employeeId: string, reasonNote?: string) => void;
  deactivateEmployee: (employeeId: string, reason?: string) => void;
  initiateFinalExit: (
    employeeIdOrData: string | FinalExitDetails,
    exitData?: FinalExitDetails
  ) => void;
  updateNoticePeriod: (employeeId: string, noticeData: NoticePeriodDetails) => void;
  addNewEmployee: (
    newEmp: Omit<Employee, 'id' | 'uid' | 'managerUid' | 'salaryHistory' | 'leaveBalance'>,
    generateOffer: boolean
  ) => Employee;
  updateEmployeeStatus: (employeeId: string, status: Employee['status']) => void;
  applyLeave: (payload: {
    targetEmployeeId?: string;
    leaveType: LeaveRequest['leaveType'];
    startDate: string;
    endDate: string;
    days: number;
    isHalfDay: boolean;
    halfDaySession?: LeaveRequest['halfDaySession'];
    reason: string;
    autoApprove?: boolean;
  }) => void;
  decideLeave: (leaveId: string, status: 'Approved' | 'Rejected', decisionNote: string) => void;
  adjustEmployeeLeaveBalance: (
    employeeId: string,
    updates: {
      casualTotal?: number;
      casualUsed?: number;
      sickTotal?: number;
      sickUsed?: number;
      earnedTotal?: number;
      earnedUsed?: number;
    },
    reasonNote: string
  ) => void;
  submitConsideration: (payload: {
    employeeId: string;
    date: string;
    type: ConsiderationRequest['type'];
    customType?: string;
    title?: string;
    category?: string;
    reason: string;
    supportingNote?: string;
    supportingDocument: string;
    forwardToHRImmediately?: boolean;
  }) => void;
  decideConsideration: (
    considerationId: string,
    status: 'Approved' | 'Rejected',
    decisionNote: string,
    options?: {
      affectsAttendancePenalty?: boolean;
      affectsSalaryDeduction?: boolean;
    }
  ) => void;
  acknowledgePolicy: (policyId: string) => void;
  createOrUpdatePolicy: (
    policy: Omit<CompanyPolicy, 'id' | 'versions' | 'acknowledgements'>,
    existingId?: string
  ) => void;
  createAnnouncement: (ann: any) => void;
  generateAndSaveLetter: (payload: {
    employeeId: string;
    templateType: GeneratedLetter['templateType'];
    subject: string;
    content: string;
  }) => GeneratedLetter;
  uploadEmployeeDocument: (payload: {
    employeeId: string;
    title: string;
    category: EmployeeDocument['category'];
    fileName: string;
    fileSize: string;
    expiryDate?: string;
  }) => void;
  deleteEmployeeDocument: (docId: string) => void;
  addHoliday: (holiday: Omit<HolidayRecord, 'id'>) => void;
  updateHoliday: (id: string, holiday: Omit<HolidayRecord, 'id'>) => void;
  deleteHoliday: (id: string) => void;
  birthdays: BirthdayCelebrationRecord[];
  addBirthdayCelebration: (payload: Omit<BirthdayCelebrationRecord, 'id' | 'updatedAt' | 'updatedBy'>) => void;
  updateBirthdayCelebration: (id: string, updates: Partial<BirthdayCelebrationRecord>) => void;
  deleteBirthdayCelebration: (id: string) => void;

  // Employee Reviews & Recognition System
  reviews: EmployeeReview[];
  submitEmployeeReview: (payload: {
    targetEmployeeId: string;
    reviewType: ReviewType;
    starCount: number;
    category?: string;
    customCategory?: string;
    reason: string;
  }) => { success: boolean; message: string };
  decideEmployeeReview: (
    reviewId: string,
    status: ReviewStatus,
    decisionNote?: string
  ) => void;
  updateEmployeeReview: (
    reviewId: string,
    updates: Partial<Pick<EmployeeReview, 'reviewType' | 'starCount' | 'category' | 'customCategory' | 'reason' | 'status' | 'decisionNote'>>,
    reasonNote?: string
  ) => void;
  deleteEmployeeReview: (reviewId: string, reasonNote?: string) => void;
  getEmployeeStarSummary: (employeeId: string) => EmployeeStarSummary;
  getPublicEmployeeReviews: (targetEmployeeId: string) => PublicEmployeeReview[];
  addOrUpdateCustomRule: (
    rule: Omit<CustomCompanyRule, 'id' | 'updatedBy'>,
    existingId?: string
  ) => void;
  deleteCustomRule: (ruleId: string) => void;
  addDepartment: (dept: Omit<Department, 'id'>) => void;
  updateDepartment: (deptId: string, updates: Partial<Department>) => void;
  deleteDepartmentSafely: (deptId: string) => { success: boolean; message: string };
  reassignDepartmentEmployees: (fromDeptName: string, toDeptName: string) => void;
  addEmployeeToDepartment: (employeeId: string, deptName: string, reasonNote?: string) => void;
  removeEmployeeFromDepartment: (employeeId: string, deptName?: string, reasonNote?: string) => void;
  transferEmployeeDepartment: (employeeId: string, toDeptName: string, reasonNote?: string) => void;
  confirmEmployeeProbation: (employeeId: string, note?: string) => void;
  userAccessList: UserAccessRecord[];
  updateUserAccess: (employeeId: string, updates: Partial<UserAccessRecord>, reasonNote?: string) => void;
  revokeUserAccess: (employeeId: string, reasonNote?: string) => void;
  masterLetterTemplates: MasterLetterTemplate[];
  letterHistory: LetterHistoryRecord[];
  createLetterTemplate: (template: Omit<MasterLetterTemplate, 'id' | 'version' | 'updatedAt'>) => void;
  updateLetterTemplate: (id: string, updates: Partial<MasterLetterTemplate>) => void;
  deleteLetterTemplate: (id: string) => void;
  recordLetterHistory: (record: Omit<LetterHistoryRecord, 'id' | 'generatedAt' | 'exportCount'>) => void;
  incrementLetterExportCount: (id: string) => void;
  addInternship: (intern: any) => void;
  processMonthlyPayroll: (payrollId?: string) => void;
  updateCompanySettings: (newSettings: Partial<CompanySettings>) => void;
  markAllNotificationsRead: () => void;
  markNotificationRead: (id: string) => void;

  // Mobile App Management & GPS Tracking
  mobileAppUsers: MobileAppUserRecord[];
  mobileLocationLogs: MobileLocationCaptureRecord[];
  mobileAppStoreConfig: MobileAppStoreConfig;
  sendMobileAppInvitation: (employeeId: string, channel?: 'Email' | 'WhatsApp / Copy Link' | string) => void;
  sendBulkMobileInvitations: (employeeIds: string[]) => void;
  sendMobilePasswordReset: (employeeId: string) => void;
  toggleMobileAccountSuspension: (employeeId: string, suspend: boolean, reasonNote?: string) => void;
  revokeMobileSessions: (employeeId: string, reasonNote?: string) => void;
  updateMobileAttendancePermissions: (
    employeeId: string,
    perms: Partial<MobileAttendancePermissionConfig>,
    reasonNote?: string
  ) => void;
  updateBulkMobileAttendancePermissions: (
    filter: { department?: string; role?: UserRole },
    perms: Partial<MobileAttendancePermissionConfig>
  ) => void;
  updateMobileAppStoreConfig: (updates: Partial<MobileAppStoreConfig>) => void;

  // UI Feedback
  toasts: ToastMessage[];
  addToast: (title: string, description?: string, type?: 'success' | 'error' | 'info') => void;
  dismissToast: (id: string) => void;

  // Apple Design System: Theme & I18n
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, fallback?: string) => string;

  // App Lock & Security
  appLockEnabled: boolean;
  isAppLocked: boolean;
  lockTimeoutMinutes: number;
  setLockTimeoutMinutes: (mins: number) => void;
  setAppLockEnabled: (enabled: boolean, pin?: string) => Promise<boolean>;
  changeAppLockPin: (currentPin: string, newPin: string) => Promise<{ success: boolean; error?: string }>;
  unlockApp: (pin: string) => Promise<boolean>;
  lockAppNow: () => void;
  resetAppLockWithIdentity: (ver: { email: string; employeeId: string; newPin: string }) => Promise<{ success: boolean; error?: string }>;

  // Zoho Backup ZIP / CSV Import & Supabase Sync
  importZohoDataArchive: (options?: {
    password?: string;
    customFiles?: FileList | File[];
  }) => Promise<{
    success: boolean;
    message: string;
    summary?: ZohoImportSummary;
  }>;
  purgeAllHRMSData: () => Promise<void>;

  // Normalized Module Adapter Properties
  [key: string]: any;
}

const HRMSContext = createContext<HRMSContextValue | undefined>(undefined);

export const DEFAULT_ADMIN_OPERATOR: Employee = {
  id: 'EMP-ADMIN',
  uid: 'uid_argos_admin',
  managerUid: 'uid_argos_admin',
  fullName: 'Argos Administrator',
  email: 'argos.subscription04@gmail.com',
  phone: '+91 98200 00001',
  role: UserRole.ADMIN,
  isSuperAdmin: true,
  designation: 'Super Administrator',
  department: 'Administration',
  managerId: 'EMP-ADMIN',
  managerName: 'Root Admin',
  status: 'Active',
  employmentType: 'Full-Time',
  location: 'Main Atelier & HQ',
  joiningDate: '2026-01-01',
  probationEndDate: '2026-04-01',
  dob: '1990-01-01',
  gender: 'Other',
  address: 'Argos Horology Atelier, Corporate House, India',
  emergencyContactName: 'Executive Office',
  emergencyContactPhone: '+91 98200 00099',
  avatarUrl: '',
  bankName: '',
  bankAccountNumber: '',
  ifscCode: '',
  panNumber: '',
  salary: {
    baseSalary: 0,
    hra: 0,
    specialAllowance: 0,
    pfDeduction: 0,
    taxDeduction: 0,
    professionalTax: 0,
  },
  salaryHistory: [],
  leaveBalance: {
    casualTotal: 12,
    casualUsed: 0,
    sickTotal: 8,
    sickUsed: 0,
    earnedTotal: 15,
    earnedUsed: 0,
  },
};

export const DEFAULT_ADMIN_USER_ACCESS: UserAccessRecord = {
  employeeId: 'EMP-ADMIN',
  fullName: 'Argos Administrator',
  email: 'argos.subscription04@gmail.com',
  role: UserRole.ADMIN,
  roleId: 'ROLE-ADMIN',
  roleName: 'Admin',
  isSuperAdmin: true,
  accessLevel: 'Controller',
  accountStatus: 'Active',
  department: 'Administration',
  designation: 'Super Administrator',
  managerId: 'EMP-ADMIN',
  managerName: 'Root Admin',
  lastLogin: 'Active Now',
  invitationStatus: 'Accepted',
  modulePermissions: getDefaultPermissionsForRole(UserRole.ADMIN, 'Controller'),
  permissionOverrides: {},
  allowedWorkspaces: ['OWN', 'ADMIN', 'HR'],
  updatedAt: '2026-10-05 09:00:00',
  updatedBy: 'System',
  adminNote: 'Primary Super Administrator (Clean Installation)',
};

// One-time fresh installation cache wipe: guarantees all obsolete seeded employee & department data is completely purged
if (typeof window !== 'undefined') {
  const FRESH_INSTALL_FLAG = 'hrms_fresh_clean_installation_v4';
  if (localStorage.getItem(FRESH_INSTALL_FLAG) !== 'true') {
    const keysToPurge = [
      'hrms_persisted_employees',
      'hrms_persisted_departments',
      'hrms_persisted_user_access',
      'hrms_persisted_attendance',
      'hrms_persisted_leaves',
      'hrms_persisted_considerations',
      'hrms_persisted_payrolls',
      'hrms_persisted_documents',
      'hrms_persisted_letters',
      'hrms_persisted_letter_history',
      'hrms_persisted_internships',
      'hrms_persisted_birthdays',
      'hrms_persisted_reviews',
      'hrms_persisted_mobile_users',
      'hrms_persisted_mobile_locations',
      'hrms_persisted_activity_logs',
    ];
    keysToPurge.forEach((k) => localStorage.removeItem(k));
    localStorage.setItem(FRESH_INSTALL_FLAG, 'true');
  }
}

const SUPER_ADMIN_EMP_ID = 'EMP-ADMIN';
const SUPER_ADMIN_EMAIL = 'argos.subscription04@gmail.com';

const ROLE_TO_PERSONA_EMP_ID: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'EMP-ADMIN',
  [UserRole.HR]: 'EMP-ADMIN',
  [UserRole.MANAGER]: 'EMP-ADMIN',
  [UserRole.EMPLOYEE]: 'EMP-ADMIN',
};

export const HRMSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const stored = localStorage.getItem('hrms_is_authenticated');
    return stored !== 'false';
  });
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [currentRole, setCurrentRole] = useState<UserRole>(UserRole.ADMIN);
  const [personaEmpId, setPersonaEmpId] = useState<string>('EMP-ADMIN');

  // Navigation State
  const [activeModule, setActiveModule] = useState<PrimaryModuleId>('dashboard');
  const [activeSubModule, setActiveSubModule] = useState<MoreSubModuleId | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [reportPreset, setReportPreset] = useState<ReportFilterPreset | null>(null);

  // Helper for safe localStorage reading
  const readCached = <T,>(key: string, fallback: T): T => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(fallback)) {
          if (Array.isArray(parsed)) return parsed as unknown as T;
        } else if (parsed && typeof parsed === 'object') {
          return { ...fallback, ...parsed } as T;
        }
      }
    } catch (err) {
      console.warn(`Failed reading ${key} from storage:`, err);
    }
    return fallback;
  };

  // Domain State (Fresh empty state for 0 employees)
  const [allEmployees, setAllEmployees] = useState<Employee[]>(() => {
    return readCached<Employee[]>('hrms_persisted_employees', INITIAL_EMPLOYEES);
  });

  const [departments, setDepartments] = useState<Department[]>(() =>
    readCached('hrms_persisted_departments', INITIAL_DEPARTMENTS)
  );
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() =>
    readCached('hrms_persisted_attendance', INITIAL_ATTENDANCE)
  );
  const [leaves, setLeaves] = useState<LeaveRequest[]>(() =>
    readCached('hrms_persisted_leaves', INITIAL_LEAVES)
  );
  const [considerations, setConsiderations] = useState<ConsiderationRequest[]>(() =>
    readCached('hrms_persisted_considerations', INITIAL_CONSIDERATIONS)
  );
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>(() =>
    readCached('hrms_persisted_payrolls', INITIAL_PAYROLLS)
  );
  const [policies, setPolicies] = useState<CompanyPolicy[]>(() =>
    readCached('hrms_persisted_policies', INITIAL_POLICIES)
  );
  const [announcements, setAnnouncements] = useState<Announcement[]>(() =>
    readCached('hrms_persisted_announcements', INITIAL_ANNOUNCEMENTS)
  );
  const [documents, setDocuments] = useState<EmployeeDocument[]>(() =>
    readCached('hrms_persisted_documents', INITIAL_DOCUMENTS)
  );
  const [letters, setLetters] = useState<GeneratedLetter[]>(() =>
    readCached('hrms_persisted_letters', INITIAL_LETTERS)
  );
  const [internships, setInternships] = useState<InternshipRecord[]>(() =>
    readCached('hrms_persisted_internships', INITIAL_INTERNSHIPS)
  );
  const [holidays, setHolidays] = useState<HolidayRecord[]>(() =>
    readCached('hrms_persisted_holidays', INITIAL_HOLIDAYS)
  );
  const [notifications, setNotifications] = useState<NotificationItem[]>(() =>
    readCached('hrms_persisted_notifications', INITIAL_NOTIFICATIONS)
  );
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>(() =>
    readCached('hrms_persisted_activity_logs', INITIAL_ACTIVITY_LOGS)
  );
  const [settings, setSettings] = useState<CompanySettings>(() =>
    readCached('hrms_persisted_settings', INITIAL_COMPANY_SETTINGS)
  );

  const [userAccessList, setUserAccessList] = useState<UserAccessRecord[]>(() => {
    return readCached<UserAccessRecord[]>('hrms_persisted_user_access', INITIAL_USER_ACCESS);
  });

  const [masterLetterTemplates, setMasterLetterTemplates] = useState<MasterLetterTemplate[]>(() =>
    readCached('hrms_persisted_letter_templates', INITIAL_MASTER_LETTER_TEMPLATES)
  );
  const [letterHistory, setLetterHistory] = useState<LetterHistoryRecord[]>(() =>
    readCached('hrms_persisted_letter_history', INITIAL_LETTER_HISTORY)
  );
  const [birthdays, setBirthdays] = useState<BirthdayCelebrationRecord[]>(() =>
    readCached('hrms_persisted_birthdays', INITIAL_BIRTHDAYS)
  );
  const [reviews, setReviews] = useState<EmployeeReview[]>(() =>
    readCached('hrms_persisted_reviews', INITIAL_REVIEWS)
  );
  const [rolesList, setRolesList] = useState<CustomRoleDefinition[]>(() => {
    const cached = readCached('hrms_persisted_roles', INITIAL_ROLES);
    return cached.map((r) => {
      const seedRole = INITIAL_ROLES.find((sr) => sr.id === r.id);
      if (seedRole) {
        return {
          ...r,
          permissions: {
            ...seedRole.permissions,
            ...r.permissions,
          },
        };
      }
      return r;
    });
  });
  const [permissionCatalog, setPermissionCatalog] = useState<GranularPermissionItem[]>(() => {
    const cached = readCached('hrms_persisted_permission_catalog', GRANULAR_PERMISSION_CATALOG);
    const customItems = cached.filter((item) => item.isCustom && !GRANULAR_PERMISSION_CATALOG.some((g) => g.id === item.id));
    return [...GRANULAR_PERMISSION_CATALOG, ...customItems];
  });

  // Mobile App Management State
  const [mobileAppUsers, setMobileAppUsers] = useState<MobileAppUserRecord[]>(() => {
    const cached = readCached('hrms_persisted_mobile_users', INITIAL_MOBILE_APP_USERS);
    const existingIds = new Set(cached.map((u) => u.employeeId));
    const missing = INITIAL_MOBILE_APP_USERS.filter((u) => !existingIds.has(u.employeeId));
    return [...missing, ...cached];
  });
  const [mobileLocationLogs, setMobileLocationLogs] = useState<MobileLocationCaptureRecord[]>(() =>
    readCached('hrms_persisted_mobile_locations', INITIAL_MOBILE_LOCATION_LOGS)
  );
  const [mobileAppStoreConfig, setMobileAppStoreConfig] = useState<MobileAppStoreConfig>(() =>
    readCached('hrms_persisted_mobile_store_config', INITIAL_MOBILE_STORE_CONFIG)
  );

  const [activeWorkspace, setActiveWorkspaceState] = useState<WorkspaceMode>(() => {
    const saved = localStorage.getItem('hrms_active_workspace');
    return saved === 'OWN' || saved === 'HR' || saved === 'ADMIN' ? saved : 'ADMIN';
  });
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Persistent storage sync effects
  useEffect(() => {
    localStorage.setItem('hrms_persisted_employees', JSON.stringify(allEmployees));
  }, [allEmployees]);

  useEffect(() => {
    localStorage.setItem('hrms_persisted_attendance', JSON.stringify(attendance));
  }, [attendance]);

  useEffect(() => {
    localStorage.setItem('hrms_persisted_leaves', JSON.stringify(leaves));
  }, [leaves]);

  useEffect(() => {
    localStorage.setItem('hrms_persisted_considerations', JSON.stringify(considerations));
  }, [considerations]);

  useEffect(() => {
    localStorage.setItem('hrms_persisted_activity_logs', JSON.stringify(activityLogs));
  }, [activityLogs]);

  useEffect(() => {
    localStorage.setItem('hrms_persisted_departments', JSON.stringify(departments));
  }, [departments]);

  useEffect(() => {
    localStorage.setItem('hrms_persisted_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('hrms_persisted_holidays', JSON.stringify(holidays));
  }, [holidays]);

  useEffect(() => {
    localStorage.setItem('hrms_persisted_policies', JSON.stringify(policies));
  }, [policies]);

  useEffect(() => {
    localStorage.setItem('hrms_persisted_birthdays', JSON.stringify(birthdays));
  }, [birthdays]);

  useEffect(() => {
    localStorage.setItem('hrms_persisted_roles', JSON.stringify(rolesList));
  }, [rolesList]);

  useEffect(() => {
    localStorage.setItem('hrms_persisted_permission_catalog', JSON.stringify(permissionCatalog));
  }, [permissionCatalog]);

  useEffect(() => {
    localStorage.setItem('hrms_persisted_user_access', JSON.stringify(userAccessList));
  }, [userAccessList]);

  useEffect(() => {
    localStorage.setItem('hrms_persisted_mobile_users', JSON.stringify(mobileAppUsers));
  }, [mobileAppUsers]);

  useEffect(() => {
    localStorage.setItem('hrms_persisted_mobile_locations', JSON.stringify(mobileLocationLogs));
  }, [mobileLocationLogs]);

  useEffect(() => {
    localStorage.setItem('hrms_persisted_mobile_store_config', JSON.stringify(mobileAppStoreConfig));
  }, [mobileAppStoreConfig]);

  useEffect(() => {
    localStorage.setItem('hrms_persisted_reviews', JSON.stringify(reviews));
  }, [reviews]);

  // Hydrate all records from Supabase on mount so both local and deployed apps share the exact same live database state
  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!isSupabaseConfigured()) return;

      // Ensure any old demo/seeded records in Supabase before the Zoho import are cleared once
      const SUPABASE_CLEAN_WIPE_FLAG = 'hrms_supabase_clean_wipe_v1';
      const ZOHO_IMPORTED_FLAG = 'hrms_zoho_archive_imported_v1';
      if (
        localStorage.getItem(SUPABASE_CLEAN_WIPE_FLAG) !== 'true' &&
        localStorage.getItem(ZOHO_IMPORTED_FLAG) !== 'true'
      ) {
        const remotePrecheck = await loadInitialDataFromSupabase();
        const hasLegacySeedIds =
          remotePrecheck?.employees?.some((e) =>
            ['EMP-1001', 'EMP-1002', 'EMP-1003', 'EMP-1004', 'EMP-1005'].includes(e.id)
          ) ||
          remotePrecheck?.departments?.some((d) =>
            ['DEPT-01', 'DEPT-02', 'DEPT-03', 'DEPT-04'].includes(d.id)
          );
        if (hasLegacySeedIds) {
          await purgeAllSupabaseHRMSData();
        }
        localStorage.setItem(SUPABASE_CLEAN_WIPE_FLAG, 'true');
      }

      const remote = await loadInitialDataFromSupabase();
      if (!isMounted || !remote) return;

      if (remote.departments && remote.departments.length > 0) {
        setDepartments(remote.departments);
      }
      if (remote.employees && remote.employees.length > 0) {
        setAllEmployees(remote.employees);
        setUserAccessList((prev) => {
          const existingById = new Map<string, UserAccessRecord>(
            prev.map((u) => [u.employeeId, u] as [string, UserAccessRecord])
          );
          return remote.employees!.map((emp): UserAccessRecord => {
            const existing = existingById.get(emp.id);
            if (existing) {
              return {
                ...existing,
                fullName: emp.fullName,
                email: emp.email,
                department: emp.department,
                designation: emp.designation,
                managerId: emp.managerId,
                managerName: emp.managerName,
              };
            }
            const roleId =
              emp.role === UserRole.ADMIN
                ? 'ROLE-ADMIN'
                : emp.role === UserRole.HR
                ? 'ROLE-HR'
                : emp.role === UserRole.MANAGER
                ? 'ROLE-MANAGER'
                : 'ROLE-EMPLOYEE';
            return {
              employeeId: emp.id,
              fullName: emp.fullName,
              email: emp.email,
              role: emp.role,
              roleId,
              roleName:
                emp.role === UserRole.ADMIN
                  ? 'Admin'
                  : emp.role === UserRole.HR
                  ? 'HR'
                  : emp.role === UserRole.MANAGER
                  ? 'Manager'
                  : 'Employee',
              accessLevel:
                emp.role === UserRole.ADMIN || emp.role === UserRole.HR ? 'Controller' : 'Viewer',
              accountStatus: emp.status === 'Exited' || emp.status === 'Inactive' ? 'Suspended' : 'Active',
              department: emp.department,
              designation: emp.designation,
              managerId: emp.managerId,
              managerName: emp.managerName,
              lastLogin: 'Synced from Supabase',
              invitationStatus: 'Accepted',
              modulePermissions: getDefaultPermissionsForRole(
                emp.role,
                emp.role === UserRole.ADMIN || emp.role === UserRole.HR ? 'Controller' : 'Viewer'
              ),
              permissionOverrides: {},
              allowedWorkspaces:
                emp.role === UserRole.ADMIN
                  ? ['OWN', 'ADMIN', 'HR']
                  : emp.role === UserRole.HR
                  ? ['OWN', 'HR']
                  : ['OWN'],
              updatedAt: TODAY_DATE,
              updatedBy: 'Supabase Sync',
            };
          });
        });
      }
      if (remote.attendance && remote.attendance.length > 0) {
        setAttendance(remote.attendance);
      }
      if (remote.leaves && remote.leaves.length > 0) {
        setLeaves(remote.leaves);
      }
      if (remote.reviews && remote.reviews.length > 0) {
        setReviews(remote.reviews);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Root-Level HR & Role Sync: Whenever the active persona employee's assigned role changes in userAccessList,
  // immediately sync currentRole and activeWorkspace so HR/Admin navigation and modules unlock immediately.
  useEffect(() => {
    const accessRec = userAccessList.find((u) => u.employeeId === personaEmpId);
    if (!accessRec) return;
    const assignedRole =
      accessRec.roleId === 'ROLE-ADMIN'
        ? UserRole.ADMIN
        : accessRec.roleId === 'ROLE-HR'
        ? UserRole.HR
        : accessRec.roleId === 'ROLE-MANAGER'
        ? UserRole.MANAGER
        : accessRec.role;
    if (assignedRole && assignedRole !== currentRole) {
      setCurrentRole(assignedRole);
      if (assignedRole === UserRole.HR) {
        setActiveWorkspaceState('HR');
        localStorage.setItem('hrms_active_workspace', 'HR');
      } else if (assignedRole === UserRole.ADMIN) {
        setActiveWorkspaceState('ADMIN');
        localStorage.setItem('hrms_active_workspace', 'ADMIN');
      } else {
        setActiveWorkspaceState('OWN');
        localStorage.setItem('hrms_active_workspace', 'OWN');
      }
    }
  }, [userAccessList, personaEmpId]);

  const addToast = (
    title: string,
    description?: string,
    type: 'success' | 'error' | 'info' = 'success'
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, title, description, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Apple Design System: Theme State & Persistence
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>(() => {
    return (localStorage.getItem('argos_theme_mode') as 'light' | 'dark' | 'system') || 'light';
  });

  const setTheme = (newTheme: 'light' | 'dark' | 'system') => {
    setThemeState(newTheme);
    localStorage.setItem('argos_theme_mode', newTheme);
  };

  useEffect(() => {
    const applyTheme = () => {
      const isDark =
        theme === 'dark' ||
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    applyTheme();

    if (theme === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme();
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }
  }, [theme]);

  // Centralized Language State & Translation Helper
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    return (localStorage.getItem('argos_language') as SupportedLanguage) || 'en';
  });

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    localStorage.setItem('argos_language', lang);
  };

  const t = (key: string, fallback?: string): string => {
    return getTranslation(language, key, fallback);
  };

  // App Lock & Security State
  const [appLockEnabled, setAppLockEnabledState] = useState<boolean>(() => {
    return localStorage.getItem('argos_app_lock_enabled') === 'true';
  });
  const [isAppLocked, setIsAppLocked] = useState<boolean>(false);
  const [lockTimeoutMinutes, setLockTimeoutMinutesState] = useState<number>(() => {
    return Number(localStorage.getItem('argos_app_lock_timeout')) || 5;
  });

  const setLockTimeoutMinutes = (mins: number) => {
    setLockTimeoutMinutesState(mins);
    localStorage.setItem('argos_app_lock_timeout', String(mins));
  };

  const hashPin = async (pin: string): Promise<string> => {
    const enc = new TextEncoder();
    const data = enc.encode('argos_vault_salt_2026_' + pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const setAppLockEnabled = async (enabled: boolean, pin?: string): Promise<boolean> => {
    if (enabled) {
      if (!pin || pin.length < 4) return false;
      const hashed = await hashPin(pin);
      localStorage.setItem('argos_app_lock_pin_hash', hashed);
      localStorage.setItem('argos_app_lock_enabled', 'true');
      setAppLockEnabledState(true);
      addToast('App Lock Enabled', 'Your 4-digit passcode has been set securely.', 'success');
      return true;
    } else {
      localStorage.removeItem('argos_app_lock_pin_hash');
      localStorage.setItem('argos_app_lock_enabled', 'false');
      setAppLockEnabledState(false);
      setIsAppLocked(false);
      addToast('App Lock Disabled', 'Passcode lock has been turned off.', 'info');
      return true;
    }
  };

  const changeAppLockPin = async (
    currentPin: string,
    newPin: string
  ): Promise<{ success: boolean; error?: string }> => {
    const savedHash = localStorage.getItem('argos_app_lock_pin_hash');
    if (!savedHash) {
      return { success: false, error: 'App lock is not enabled.' };
    }
    const currentHash = await hashPin(currentPin);
    if (currentHash !== savedHash) {
      return { success: false, error: 'Incorrect current passcode.' };
    }
    if (!newPin || newPin.length < 4) {
      return { success: false, error: 'New passcode must be at least 4 digits.' };
    }
    const newHash = await hashPin(newPin);
    localStorage.setItem('argos_app_lock_pin_hash', newHash);
    addToast('Passcode Changed', 'Your new passcode is now active.', 'success');
    return { success: true };
  };

  const unlockApp = async (pin: string): Promise<boolean> => {
    const savedHash = localStorage.getItem('argos_app_lock_pin_hash');
    if (!savedHash) {
      setIsAppLocked(false);
      return true;
    }
    const enteredHash = await hashPin(pin);
    if (enteredHash === savedHash) {
      setIsAppLocked(false);
      addToast('Application Unlocked', 'Welcome back.', 'success');
      return true;
    }
    return false;
  };

  const lockAppNow = () => {
    if (appLockEnabled) {
      setIsAppLocked(true);
    }
  };

  const resetAppLockWithIdentity = async (ver: {
    email: string;
    employeeId: string;
    newPin: string;
  }): Promise<{ success: boolean; error?: string }> => {
    const emp = allEmployees.find(
      (e) =>
        e.id.toLowerCase() === ver.employeeId.trim().toLowerCase() &&
        (e.email.toLowerCase() === ver.email.trim().toLowerCase() ||
          (e.officialEmail && e.officialEmail.toLowerCase() === ver.email.trim().toLowerCase()))
    );
    if (!emp) {
      return {
        success: false,
        error:
          'Verification failed: Employee ID and Official Email do not match active enterprise records.',
      };
    }
    if (!ver.newPin || ver.newPin.length < 4) {
      return { success: false, error: 'New passcode must be at least 4 digits.' };
    }
    const newHash = await hashPin(ver.newPin);
    localStorage.setItem('argos_app_lock_pin_hash', newHash);
    localStorage.setItem('argos_app_lock_enabled', 'true');
    setAppLockEnabledState(true);
    setIsAppLocked(false);
    addToast(
      'Passcode Reset Successful',
      'Your identity was verified and new passcode applied.',
      'success'
    );
    return { success: true };
  };

  // Inactivity auto-lock listener
  useEffect(() => {
    if (!appLockEnabled || isAppLocked) return;

    let timeoutId: any;
    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsAppLocked(true);
      }, lockTimeoutMinutes * 60 * 1000);
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((ev) => window.addEventListener(ev, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach((ev) => window.removeEventListener(ev, resetTimer));
    };
  }, [appLockEnabled, isAppLocked, lockTimeoutMinutes]);

  // Sync Firebase Auth & Bootstrap User Profile in Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setAuthLoading(false);
      if (user && user.emailVerified) {
        const emailLower = (user.email || '').toLowerCase();
        const isSuperAdminAccount =
          emailLower === SUPER_ADMIN_EMAIL ||
          emailLower === 'shaikhkaif@carterfarrago.com';
        const matchedAccess = userAccessList.find(
          (u) => u.email.toLowerCase() === emailLower
        );
        const matchedEmp = allEmployees.find(
          (e) => e.email.toLowerCase() === emailLower || (e.officialEmail && e.officialEmail.toLowerCase() === emailLower)
        );
        const assignedRole = isSuperAdminAccount
          ? UserRole.ADMIN
          : matchedAccess?.role || matchedEmp?.role || UserRole.EMPLOYEE;
        const assignedEmpId = isSuperAdminAccount
          ? SUPER_ADMIN_EMP_ID
          : matchedAccess?.employeeId || matchedEmp?.id || 'EMP-1005';

        setPersonaEmpId(assignedEmpId);
        setCurrentRole(assignedRole);
        if (assignedRole === UserRole.ADMIN) {
          setActiveWorkspaceState('ADMIN');
          localStorage.setItem('hrms_active_workspace', 'ADMIN');
        } else if (assignedRole === UserRole.HR) {
          setActiveWorkspaceState('HR');
          localStorage.setItem('hrms_active_workspace', 'HR');
        } else {
          setActiveWorkspaceState('OWN');
          localStorage.setItem('hrms_active_workspace', 'OWN');
        }

        try {
          if (isSuperAdminAccount || assignedRole === UserRole.ADMIN) {
            await setDoc(doc(db, 'admins', user.uid), {
              uid: user.uid,
              email: (user.email || SUPER_ADMIN_EMAIL).slice(0, 160),
              createdAt: serverTimestamp(),
            });
          }
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: (user.email || SUPER_ADMIN_EMAIL).slice(0, 160),
            name: (user.displayName || matchedEmp?.fullName || 'Argos Watch').slice(0, 120),
            role: assignedRole,
            employeeId: assignedEmpId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (error) {
          if (
            error instanceof Error &&
            error.message.toLowerCase().includes('missing or insufficient permissions')
          ) {
            handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
          }
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const currentEmployee = useMemo(() => {
    return (
      allEmployees.find((e) => e.id === personaEmpId) ||
      allEmployees[0] ||
      DEFAULT_ADMIN_OPERATOR
    );
  }, [allEmployees, personaEmpId]);

  const currentUserAccess = useMemo(() => {
    return (
      userAccessList.find((u) => u.employeeId === currentEmployee.id) ||
      DEFAULT_ADMIN_USER_ACCESS
    );
  }, [userAccessList, currentEmployee.id]);

  // Requirement 9: Determine if user is eligible for Own / Role Workspace switcher (both HR and Admin)
  const canSwitchWorkspace = useMemo(() => {
    if (currentRole === UserRole.HR || currentRole === UserRole.ADMIN) return true;
    if (
      currentUserAccess?.allowedWorkspaces?.includes('HR') ||
      currentUserAccess?.allowedWorkspaces?.includes('ADMIN')
    ) {
      return true;
    }
    return false;
  }, [currentRole, currentUserAccess]);

  // Effective operational role: When HR or Admin is in OWN workspace, they act strictly as EMPLOYEE (Own self-service scope)
  const effectiveRole: UserRole = useMemo(() => {
    if ((currentRole === UserRole.HR || currentRole === UserRole.ADMIN) && activeWorkspace === 'OWN') {
      return UserRole.EMPLOYEE;
    }
    return currentRole;
  }, [currentRole, activeWorkspace]);

  const currentWorkspaceLabel = useMemo(() => {
    if (activeWorkspace === 'OWN') return 'Own';
    if (currentRole === UserRole.ADMIN) return 'Admin';
    if (currentRole === UserRole.HR) return 'HR';
    if (currentRole === UserRole.MANAGER) return 'Manager';
    return 'Own';
  }, [currentRole, activeWorkspace]);

  const hasPermission = (permissionId: string): boolean => {
    const isSuperAdminUser =
      currentEmployee.id === SUPER_ADMIN_EMP_ID ||
      currentEmployee.email?.toLowerCase() === SUPER_ADMIN_EMAIL ||
      Boolean(currentUserAccess?.isSuperAdmin);

    // If HR or Admin user switched to OWN workspace, enforce strictly personal Employee permissions
    if ((currentRole === UserRole.HR || currentRole === UserRole.ADMIN) && activeWorkspace === 'OWN') {
      const empRoleDef = rolesList.find((r) => r.id === 'ROLE-EMPLOYEE');
      const isAllowedInOwn = empRoleDef?.permissions?.[permissionId] ?? buildRoleDefaultPermissions(UserRole.EMPLOYEE)[permissionId] ?? false;
      if (!isSuperAdminUser && currentUserAccess?.permissionOverrides?.[permissionId] === 'DENIED') {
        return false;
      }
      return Boolean(isAllowedInOwn);
    }

    // Protected Super Admin (Argos Watch) always retains full control in Admin workspace
    if (isSuperAdminUser && currentRole === UserRole.ADMIN) {
      return true;
    }

    const assignedRoleId =
      currentUserAccess?.roleId ||
      (currentRole === UserRole.ADMIN
        ? 'ROLE-ADMIN'
        : currentRole === UserRole.HR
        ? 'ROLE-HR'
        : currentRole === UserRole.MANAGER
        ? 'ROLE-MANAGER'
        : 'ROLE-EMPLOYEE');

    const roleDef =
      rolesList.find((r) => r.id === assignedRoleId) ||
      rolesList.find((r) => r.baseRoleType === currentRole);

    return resolveEffectivePermission(
      roleDef,
      currentUserAccess?.permissionOverrides,
      permissionId,
      isSuperAdminUser && currentRole === UserRole.ADMIN
    ).allowed;
  };

  const appendAuditLog = async (
    action: string,
    module: ActivityLogEntry['module'],
    targetRecord: string,
    targetEmployeeId?: string,
    previousValue?: string,
    newValue?: string,
    options?: {
      fieldChanged?: string;
      result?: 'SUCCESS' | 'FAILED';
      reason?: string;
      source?: string;
      workspace?: string;
    }
  ) => {
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const logId = `LOG-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    const inferredField =
      options?.fieldChanged ||
      (action.toLowerCase().includes('role')
        ? 'Assigned Role'
        : action.toLowerCase().includes('permission')
        ? 'Individual Permission Override'
        : action.toLowerCase().includes('workspace')
        ? 'Active Workspace'
        : action.toLowerCase().includes('department') || action.toLowerCase().includes('transfer')
        ? 'Department Assignment'
        : action.toLowerCase().includes('mobile')
        ? 'Mobile App Access / Attendance'
        : action.toLowerCase().includes('attendance') || action.toLowerCase().includes('punch')
        ? 'Attendance Punch / Status'
        : action.toLowerCase().includes('leave')
        ? 'Leave Status / Balance'
        : action.toLowerCase().includes('consideration')
        ? 'Consideration Decision'
        : action.toLowerCase().includes('salary') || action.toLowerCase().includes('payroll')
        ? 'Payroll / Compensation'
        : action.toLowerCase().includes('birthday')
        ? 'Birthday / Celebration Record'
        : action.toLowerCase().includes('setting')
        ? 'System / Deduction Configuration'
        : 'Record State');

    const newEntry: ActivityLogEntry = {
      id: logId,
      actorUid: firebaseUser?.uid || currentEmployee.uid || currentEmployee.id,
      actorName: currentEmployee.fullName,
      actorRole: currentUserAccess?.roleName || currentRole,
      workspace: options?.workspace || currentWorkspaceLabel,
      action,
      module,
      targetRecord,
      targetEmployeeId,
      fieldChanged: inferredField,
      previousValue: previousValue || '—',
      newValue: newValue || '—',
      timestamp: nowStr,
      ipDevice: 'Argos Watch Enterprise Session',
      result: options?.result || 'SUCCESS',
      reason: options?.reason || '',
      source: options?.source || 'Web Portal',
    };
    setActivityLogs((prev) => [newEntry, ...prev]);

    if (firebaseUser && firebaseUser.emailVerified) {
      try {
        await setDoc(doc(db, 'activity_logs', logId), {
          id: logId,
          actorUid: firebaseUser.uid,
          actorName: currentEmployee.fullName.slice(0, 120),
          action: action.slice(0, 200),
          module: module.slice(0, 80),
          targetRecord: targetRecord.slice(0, 200),
          createdAt: serverTimestamp(),
        });
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.toLowerCase().includes('missing or insufficient permissions')
        ) {
          handleFirestoreError(error, OperationType.CREATE, `activity_logs/${logId}`);
        }
      }
    }
  };

  const switchWorkspace = (mode: WorkspaceMode) => {
    if (!canSwitchWorkspace && (mode === 'HR' || mode === 'ADMIN')) {
      appendAuditLog(
        `Blocked Unauthorized Workspace Switch to ${mode}`,
        'Role & Access',
        currentEmployee.fullName,
        currentEmployee.id,
        activeWorkspace,
        mode,
        {
          fieldChanged: 'Active Workspace',
          result: 'FAILED',
          reason: `User does not have ${mode} Workspace authorization`,
        }
      );
      addToast('Workspace Restricted', `You are not authorized to switch to the ${mode} Workspace.`, 'error');
      return;
    }
    const prevMode = activeWorkspace;
    const normalizedMode: WorkspaceMode =
      mode === 'OWN'
        ? 'OWN'
        : currentRole === UserRole.ADMIN
        ? 'ADMIN'
        : 'HR';

    setActiveWorkspaceState(normalizedMode);
    localStorage.setItem('hrms_active_workspace', normalizedMode);

    // If switching to OWN workspace, ensure user is not left on an HR/Admin management module
    const managementOnlyModules: PrimaryModuleId[] = [
      'people',
      'departments-mgmt',
      'approvals',
      'reports',
      'manage-access',
      'mobile-app',
    ];
    if (normalizedMode === 'OWN' && managementOnlyModules.includes(activeModule)) {
      setActiveModule('dashboard');
      setActiveSubModule(null);
      setSelectedEmployeeId(null);
    }

    appendAuditLog(
      `Switched Active Workspace: ${prevMode} → ${normalizedMode}`,
      'Role & Access',
      `${currentEmployee.fullName} (${currentEmployee.id})`,
      currentEmployee.id,
      prevMode === 'OWN' ? 'Own Workspace (Personal Employee)' : `${prevMode} Workspace (Management)`,
      normalizedMode === 'OWN' ? 'Own Workspace (Personal Employee)' : `${normalizedMode} Workspace (Management)`,
      {
        fieldChanged: 'Active Workspace',
        result: 'SUCCESS',
        workspace: normalizedMode === 'OWN' ? 'Own' : normalizedMode === 'ADMIN' ? 'Admin' : 'HR',
      }
    );

    addToast(
      normalizedMode === 'OWN'
        ? 'Switched to Own Workspace'
        : normalizedMode === 'ADMIN'
        ? 'Switched to Admin Workspace'
        : 'Switched to HR Workspace',
      normalizedMode === 'OWN'
        ? 'Viewing your personal employee profile, attendance, leave, and payslips.'
        : normalizedMode === 'ADMIN'
        ? 'Full system administration and organization management unlocked.'
        : 'Organization-wide HR operations and workforce management unlocked.',
      'info'
    );
  };

  const switchRolePersona = (role: UserRole) => {
    const prevRole = currentRole;
    setCurrentRole(role);
    const targetEmpId = ROLE_TO_PERSONA_EMP_ID[role];
    setPersonaEmpId(targetEmpId);
    if (role === UserRole.ADMIN) {
      setActiveWorkspaceState('ADMIN');
      localStorage.setItem('hrms_active_workspace', 'ADMIN');
    } else if (role === UserRole.HR) {
      setActiveWorkspaceState('HR');
      localStorage.setItem('hrms_active_workspace', 'HR');
    } else {
      setActiveWorkspaceState('OWN');
      localStorage.setItem('hrms_active_workspace', 'OWN');
    }
    setSelectedEmployeeId(null);
    setActiveSubModule(null);
    setActiveModule('dashboard');
    const personaEmp =
      allEmployees.find((e) => e.id === targetEmpId) || allEmployees[0] || DEFAULT_ADMIN_OPERATOR;
    appendAuditLog(
      `Switched Active Role Persona: ${prevRole} → ${role}`,
      'Role & Access',
      `${personaEmp.fullName} (${personaEmp.id})`,
      personaEmp.id,
      prevRole,
      role,
      { fieldChanged: 'Active Persona Role' }
    );
    addToast(
      `Switched to ${role} View`,
      `Viewing as ${personaEmp.fullName} (${personaEmp.designation})`,
      'info'
    );
  };

  const switchEmployeePersona = (employeeId: string) => {
    const emp = allEmployees.find((e) => e.id === employeeId);
    if (!emp) return;
    const accessRec = userAccessList.find((u) => u.employeeId === emp.id);
    const assignedRole =
      emp.id === SUPER_ADMIN_EMP_ID
        ? UserRole.ADMIN
        : accessRec?.roleId === 'ROLE-ADMIN'
        ? UserRole.ADMIN
        : accessRec?.roleId === 'ROLE-HR'
        ? UserRole.HR
        : accessRec?.roleId === 'ROLE-MANAGER'
        ? UserRole.MANAGER
        : accessRec?.role || emp.role;

    setPersonaEmpId(emp.id);
    setCurrentRole(assignedRole);
    if (assignedRole === UserRole.ADMIN) {
      setActiveWorkspaceState('ADMIN');
      localStorage.setItem('hrms_active_workspace', 'ADMIN');
    } else if (assignedRole === UserRole.HR) {
      setActiveWorkspaceState('HR');
      localStorage.setItem('hrms_active_workspace', 'HR');
    } else {
      setActiveWorkspaceState('OWN');
      localStorage.setItem('hrms_active_workspace', 'OWN');
    }
    setSelectedEmployeeId(null);
    setActiveSubModule(null);
    setActiveModule('dashboard');
    addToast(
      `Switched to ${emp.fullName}`,
      `${emp.designation} · ${emp.department} (${accessRec?.roleName || assignedRole})`,
      'info'
    );
  };

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      addToast('Signed in with Google', 'Connected to Firebase Auth & Firestore.');
    } catch (error) {
      addToast(
        'Sign-in Cancelled',
        error instanceof Error ? error.message : 'Unable to complete sign-in',
        'error'
      );
    }
  };

  const signInWithEmailOrPhone = async (
    identifier: string,
    passwordOrOtp: string,
    mode: 'password' | 'otp' = 'password'
  ): Promise<{ success: boolean; message?: string }> => {
    const cleanIdentifier = identifier.trim().toLowerCase();
    const cleanPhoneDigits = identifier.replace(/\D/g, '');
    const isEmail = cleanIdentifier.includes('@');

    // 1. If Supabase is configured, attempt real Supabase Auth authentication (Password or OTP)
    if (isSupabaseConfigured()) {
      try {
        let res;
        if (mode === 'otp') {
          res = await supabaseVerifyOtp(identifier, passwordOrOtp);
        } else if (isEmail) {
          res = await supabaseSignInWithEmail(cleanIdentifier, passwordOrOtp);
        } else {
          res = await supabaseSignInWithPhone(identifier, passwordOrOtp);
        }
        if (res.error) {
          console.warn('Supabase auth attempt note:', res.error.message);
        }
      } catch (err) {
        console.warn('Supabase auth exception:', err);
      }
    }

    // 2. Match local employee profile by Email, Mobile Phone, or Employee ID
    const matchedEmp = allEmployees.find((e) => {
      const emailMatch = e.email && e.email.toLowerCase() === cleanIdentifier;
      const empIdMatch = e.id && e.id.toLowerCase() === cleanIdentifier;
      const empPhoneDigits = e.phone ? e.phone.replace(/\D/g, '') : '';
      const phoneMatch = cleanPhoneDigits.length >= 6 && empPhoneDigits.endsWith(cleanPhoneDigits);
      return emailMatch || empIdMatch || phoneMatch;
    });

    // 3. Set Active Persona & Role based on matching employee or default Admin
    const targetEmp = matchedEmp || DEFAULT_ADMIN_OPERATOR;
    setPersonaEmpId(targetEmp.id);

    const accessRec = userAccessList.find((u) => u.employeeId === targetEmp.id);
    const assignedRole = accessRec?.role || targetEmp.role || UserRole.ADMIN;
    setCurrentRole(assignedRole);

    if (assignedRole === UserRole.HR) {
      setActiveWorkspaceState('HR');
      localStorage.setItem('hrms_active_workspace', 'HR');
    } else if (assignedRole === UserRole.ADMIN) {
      setActiveWorkspaceState('ADMIN');
      localStorage.setItem('hrms_active_workspace', 'ADMIN');
    } else {
      setActiveWorkspaceState('OWN');
      localStorage.setItem('hrms_active_workspace', 'OWN');
    }

    setIsAuthenticated(true);
    localStorage.setItem('hrms_is_authenticated', 'true');

    // 4. Record User Login Activity directly in Supabase table 'user_login_activity'
    const authMethodLabel: 'EMAIL_OTP' | 'PHONE_OTP' | 'PASSWORD' =
      mode === 'otp' ? (isEmail ? 'EMAIL_OTP' : 'PHONE_OTP') : 'PASSWORD';

    recordSupabaseLoginActivity({
      email: targetEmp.email,
      phone: targetEmp.phone,
      employeeId: targetEmp.id,
      employeeName: targetEmp.fullName,
      department: targetEmp.department,
      role: assignedRole,
      authMethod: authMethodLabel,
      status: 'SUCCESS',
    });

    appendAuditLog(
      'User Authentication Sign-In',
      'System Security',
      targetEmp.fullName,
      targetEmp.id,
      'Signed Out',
      `Authenticated via ${isEmail ? 'Email' : 'Mobile/ID'} (${mode.toUpperCase()})`
    );

    addToast(
      `Welcome back, ${targetEmp.fullName}`,
      `Signed in as ${targetEmp.designation} (${assignedRole}). Logged to Supabase.`,
      'success'
    );

    return { success: true };
  };

  const signOutUser = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      // Ignore firebase signout error
    }
    try {
      await supabaseSignOut();
    } catch (e) {
      // Ignore supabase signout error
    }

    setIsAuthenticated(false);
    localStorage.setItem('hrms_is_authenticated', 'false');

    appendAuditLog(
      'User Authentication Sign-Out',
      'System Security',
      currentEmployee.fullName,
      currentEmployee.id,
      'Active Session',
      'Signed Out Successfully'
    );

    addToast('Signed Out', 'Your session has been terminated safely.', 'info');
  };

  const navigateTo = (
    module: PrimaryModuleId,
    subModule: MoreSubModuleId | null = null,
    employeeId: string | null = null,
    preset: ReportFilterPreset | null = null
  ) => {
    // Enforce Own Workspace isolation against direct navigation to HR/Admin management modules
    if ((currentRole === UserRole.HR || currentRole === UserRole.ADMIN) && activeWorkspace === 'OWN') {
      const blockedInOwnWorkspace: PrimaryModuleId[] = [
        'people',
        'departments-mgmt',
        'approvals',
        'manage-access',
        'mobile-app',
      ];
      if (blockedInOwnWorkspace.includes(module)) {
        appendAuditLog(
          `Blocked Navigation to ${module} in Own Workspace`,
          'Role & Access',
          currentEmployee.fullName,
          currentEmployee.id,
          activeModule,
          module,
          {
            fieldChanged: 'Module Navigation',
            result: 'FAILED',
            reason: 'Management modules are blocked while in Own (Personal Employee) Workspace.',
          }
        );
        addToast(
          'Own Workspace Active',
          `Switch to ${currentRole === UserRole.ADMIN ? 'Admin' : 'HR'} Workspace to access management modules.`,
          'error'
        );
        return;
      }
    }
    if (module === 'manage-access' && currentRole !== UserRole.ADMIN) {
      appendAuditLog(
        'Unauthorized Attempt to Open Role & Access Management',
        'Role & Access',
        currentEmployee.fullName,
        currentEmployee.id,
        activeModule,
        'manage-access',
        {
          fieldChanged: 'Security Module Access',
          result: 'FAILED',
          reason: 'Only authorized Administrators can access Role & Access Management.',
        }
      );
      addToast('Access Denied', 'Role & Access Management is restricted to System Administrators.', 'error');
      return;
    }
    setActiveModule(module);
    setActiveSubModule(subModule);
    setSelectedEmployeeId(employeeId);
    if (preset !== undefined) {
      setReportPreset(preset);
    }
  };

  const openEmployeeProfile = (employeeId: string) => {
    if (!employeeId) {
      setSelectedEmployeeId(null);
      return;
    }
    const target = allEmployees.find((e) => e.id === employeeId);
    if (!target) return;
    if (effectiveRole === UserRole.EMPLOYEE && employeeId !== currentEmployee.id) {
      addToast('Access Restricted', 'In Own Workspace, you can only view your own personal profile.', 'error');
      return;
    }
    if (
      effectiveRole === UserRole.MANAGER &&
      employeeId !== currentEmployee.id &&
      target.managerId !== currentEmployee.id
    ) {
      addToast(
        'Access Restricted',
        'Managers can only access profiles of employees assigned to their team.',
        'error'
      );
      return;
    }
    setSelectedEmployeeId(employeeId);
    if (effectiveRole === UserRole.EMPLOYEE) {
      setActiveModule('my-profile');
    } else if (effectiveRole === UserRole.MANAGER) {
      if (employeeId === currentEmployee.id) {
        setActiveModule('my-profile');
      } else {
        setActiveModule('my-team');
      }
    } else {
      setActiveModule('people');
    }
  };

  // Role-Scoped Collections via RBAC (using effectiveRole so HR in OWN workspace sees only their own records!)
  const scopedEmployees = useMemo(
    () => scopeEmployees(allEmployees, effectiveRole, currentEmployee.id),
    [allEmployees, effectiveRole, currentEmployee.id]
  );

  const scopedAttendance = useMemo(
    () => scopeAttendance(attendance, effectiveRole, currentEmployee.id, activeModule),
    [attendance, effectiveRole, currentEmployee.id, activeModule]
  );

  const scopedLeaves = useMemo(
    () => scopeLeaves(leaves, effectiveRole, currentEmployee.id, activeModule),
    [leaves, effectiveRole, currentEmployee.id, activeModule]
  );

  const scopedConsiderations = useMemo(
    () => scopeConsiderations(considerations, effectiveRole, currentEmployee.id, activeModule),
    [considerations, effectiveRole, currentEmployee.id, activeModule]
  );

  const scopedPayrolls = useMemo(
    () => scopePayrolls(payrolls, effectiveRole, currentEmployee.id, settings),
    [payrolls, effectiveRole, currentEmployee.id, settings]
  );

  const scopedDocuments = useMemo(
    () => scopeDocuments(documents, effectiveRole, currentEmployee.id, settings),
    [documents, effectiveRole, currentEmployee.id, settings]
  );

  const scopedLetters = useMemo(() => {
    const teamIds = scopedEmployees.map((e) => e.id);
    return scopeLetters(letters, effectiveRole, currentEmployee.id, teamIds);
  }, [letters, effectiveRole, currentEmployee.id, scopedEmployees]);

  const scopedPolicies = useMemo(
    () => scopePolicies(policies, effectiveRole, currentEmployee.department),
    [policies, effectiveRole, currentEmployee.department]
  );

  const scopedAnnouncements = useMemo(
    () => scopeAnnouncements(announcements, effectiveRole, currentEmployee.department),
    [announcements, effectiveRole, currentEmployee.department]
  );

  const scopedActivityLogs = useMemo(
    () => scopeActivityLogs(activityLogs, effectiveRole),
    [activityLogs, effectiveRole]
  );

  // Live Working Duration Timer State (ticking every 1s, persisted across refreshes)
  const [liveWorkingSeconds, setLiveWorkingSeconds] = useState<number>(0);

  useEffect(() => {
    const updateTimer = () => {
      const myRec = attendance.find(
        (a) => a.employeeId === currentEmployee.id && a.date === TODAY_DATE
      );
      if (!myRec || !myRec.checkIn) {
        setLiveWorkingSeconds(0);
        return;
      }
      if (myRec.checkOut) {
        // Shift concluded: show saved working duration in seconds
        const durationSec = Math.round((myRec.workingHours || 9.0) * 3600);
        setLiveWorkingSeconds(durationSec);
        return;
      }

      // Actively clocked in: calculate elapsed seconds from timestamp
      const storedStart = localStorage.getItem(`hrms_punch_start_${currentEmployee.id}`);
      const startMs = storedStart ? Number(storedStart) : null;
      if (startMs && !isNaN(startMs)) {
        const elapsed = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
        setLiveWorkingSeconds(elapsed);
      } else {
        // Fallback: reconstruct from checkIn time string (e.g. "09:30")
        const [h, m] = myRec.checkIn.split(':').map(Number);
        const now = new Date();
        const punchDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h || 9, m || 30, 0);
        const elapsed = Math.max(0, Math.floor((now.getTime() - punchDate.getTime()) / 1000));
        setLiveWorkingSeconds(elapsed);
        localStorage.setItem(`hrms_punch_start_${currentEmployee.id}`, String(punchDate.getTime()));
      }
    };

    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);
    return () => clearInterval(timerInterval);
  }, [attendance, currentEmployee.id]);

  const liveWorkingDuration = useMemo(() => {
    const s = liveWorkingSeconds;
    const hh = String(Math.floor(s / 3600)).padStart(2, '0');
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }, [liveWorkingSeconds]);

  // Helper to capture real device GPS location without fabricating coordinates
  const capturePunchLocationAndRecord = (
    punchType: 'CHECK_IN' | 'CHECK_OUT',
    punchSource: PunchSource,
    timeStr: string,
    attendanceRecordId: string
  ) => {
    const mobileUser = mobileAppUsers.find((m) => m.employeeId === currentEmployee.id);
    const shouldCaptureLocation =
      mobileUser?.attendancePermissions?.captureCheckInLocation !== false;
    if (!shouldCaptureLocation) return;

    const createLocationLog = (
      status: MobileLocationCaptureRecord['locationStatus'],
      lat: number | null,
      lng: number | null,
      accuracy: number | null,
      note?: string
    ) => {
      const locRecord: MobileLocationCaptureRecord = {
        id: `LOC-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        employeeId: currentEmployee.id,
        employeeName: currentEmployee.fullName,
        department: currentEmployee.department,
        date: TODAY_DATE,
        punchType,
        punchTime: timeStr,
        timestamp: `${TODAY_DATE} ${timeStr}:00`,
        latitude: lat,
        longitude: lng,
        accuracyMeters: accuracy,
        locationName:
          status === 'CAPTURED' && lat !== null && lng !== null
            ? `GPS (${lat.toFixed(5)}, ${lng.toFixed(5)})`
            : status === 'PERMISSION_DENIED'
            ? 'Location Permission Denied by Device/Browser'
            : status === 'LOW_ACCURACY' && lat !== null && lng !== null
            ? `Low-Accuracy GPS (${lat.toFixed(5)}, ${lng.toFixed(5)})`
            : 'Location Unavailable',
        locationStatus: status,
        source: punchSource,
        deviceInfo: mobileUser?.deviceModel || navigator.userAgent.slice(0, 60),
        note,
      };

      setMobileLocationLogs((prev) => [locRecord, ...prev]);
      setAttendance((prev) =>
        prev.map((a) => {
          if (a.id !== attendanceRecordId) return a;
          return {
            ...a,
            ...(punchType === 'CHECK_IN'
              ? { checkInLocation: locRecord }
              : { checkOutLocation: locRecord }),
          };
        })
      );
    };

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      createLocationLog(
        'UNAVAILABLE',
        null,
        null,
        null,
        'Browser/device does not support Geolocation API'
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        const acc = Math.round(pos.coords.accuracy || 0);
        const status: MobileLocationCaptureRecord['locationStatus'] =
          acc > 500 ? 'LOW_ACCURACY' : 'CAPTURED';
        createLocationLog(
          status,
          lat,
          lng,
          acc,
          status === 'LOW_ACCURACY'
            ? `Captured with low GPS accuracy (±${acc}m)`
            : `Verified live device GPS coordinates (±${acc}m)`
        );
      },
      (err) => {
        const isDenied = err.code === 1; // PERMISSION_DENIED
        createLocationLog(
          isDenied ? 'PERMISSION_DENIED' : 'UNAVAILABLE',
          null,
          null,
          null,
          err.message || (isDenied ? 'User denied geolocation permission' : 'GPS signal unavailable')
        );
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  // Workflow 1: Check-In & Check-Out with Multiple Punches, Mobile Permission Enforcement & Live GPS Capture
  const checkInToday = (
    notes = 'Checked in via Argos Watch Web Portal',
    options?: { viaMobileApp?: boolean } | 'Web Portal' | 'Mobile App'
  ) => {
    const isMobilePunch = Boolean(
      options === 'Mobile App' ||
        (typeof options === 'object' && options?.viaMobileApp) ||
        notes.toLowerCase().includes('mobile')
    );
    const mobileUser = mobileAppUsers.find((m) => m.employeeId === currentEmployee.id);

    if (isMobilePunch && mobileUser) {
      if (mobileUser.accessStatus === 'SUSPENDED') {
        addToast(
          'Mobile Access Suspended',
          'Your mobile app account is currently suspended. Contact HR or Admin.',
          'error'
        );
        return;
      }
      if (
        !mobileUser.attendancePermissions.allowMobileAttendance ||
        !mobileUser.attendancePermissions.allowMobileCheckIn
      ) {
        addToast(
          'Mobile Check-In Restricted',
          'Mobile check-in is disabled for your profile. Please use the office biometric terminal or contact Admin.',
          'error'
        );
        return;
      }
    }

    const existing = attendance.find(
      (a) => a.employeeId === currentEmployee.id && a.date === TODAY_DATE
    );
    const existingPunches = existing?.punches || (existing?.checkIn ? [
      {
        id: `PUNCH-${existing.id}-1`,
        employeeId: currentEmployee.id,
        timestamp: `${TODAY_DATE}T${existing.checkIn}:00`,
        time: existing.checkIn,
        type: 'IN' as const,
        source: (existing.source === 'MANUAL' ? 'Manual Correction' : 'Web Portal') as PunchSource,
        isFirstIn: true,
        isLastOut: false,
        isIntermediate: false,
      },
      ...(existing.checkOut ? [{
        id: `PUNCH-${existing.id}-2`,
        employeeId: currentEmployee.id,
        timestamp: `${TODAY_DATE}T${existing.checkOut}:00`,
        time: existing.checkOut,
        type: 'OUT' as const,
        source: (existing.source === 'MANUAL' ? 'Manual Correction' : 'Web Portal') as PunchSource,
        isFirstIn: false,
        isLastOut: true,
        isIntermediate: false,
      }] : [])
    ] : []);

    const lastPunch = existingPunches.length > 0 ? existingPunches[existingPunches.length - 1] : null;
    if (lastPunch && lastPunch.type === 'IN') {
      addToast('Already Punched In', 'You are currently punched in. Punch out before recording a subsequent punch-in.', 'info');
      return;
    }

    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hh}:${mm}`;
    const nowMs = Date.now();
    localStorage.setItem(`hrms_punch_start_${currentEmployee.id}`, String(nowMs));

    const [startH, startM] = settings.workStartTime.split(':').map(Number);
    const startTotalMins = startH * 60 + startM + settings.gracePeriodMinutes;
    const currentTotalMins = now.getHours() * 60 + now.getMinutes();
    const isFirstIn = existingPunches.filter((p) => p.type === 'IN').length === 0;
    const isLate = isFirstIn && currentTotalMins > startTotalMins;
    const lateMinutes = isLate ? Math.max(0, currentTotalMins - (startH * 60 + startM)) : (existing?.lateMinutes || 0);
    const punchSource: PunchSource = isMobilePunch ? 'Mobile App' : 'Web Portal';

    const newPunch: PunchEvent = {
      id: `PUNCH-${currentEmployee.id}-${Date.now()}`,
      employeeId: currentEmployee.id,
      timestamp: `${TODAY_DATE}T${timeStr}:00`,
      time: timeStr,
      type: 'IN',
      source: punchSource,
      isFirstIn,
      isLastOut: false,
      isIntermediate: !isFirstIn,
    };

    const combinedPunches = [...existingPunches, newPunch];
    const firstInPunch = combinedPunches.find((p) => p.type === 'IN');
    const firstInTime = firstInPunch?.time || timeStr;
    const recordId =
      existing?.id || `ATT-${TODAY_DATE.replace(/-/g, '')}-${currentEmployee.id.replace('EMP-', '')}`;

    const interimRecord: AttendanceRecord = {
      id: recordId,
      employeeId: currentEmployee.id,
      employeeName: currentEmployee.fullName,
      employeeCode: currentEmployee.id,
      department: currentEmployee.department,
      managerId: currentEmployee.managerId,
      uid: currentEmployee.uid,
      managerUid: currentEmployee.managerUid,
      date: TODAY_DATE,
      checkIn: firstInTime,
      checkOut: null,
      punchIn: firstInTime,
      punchOut: null,
      status: isLate ? 'Late' : (existing?.status || 'Present'),
      isLate: isLate || existing?.isLate || false,
      lateMinutes,
      lateByMinutes: lateMinutes,
      earlyDepartureMinutes: 0,
      workingHours: existing?.workingHours || 0.1,
      totalHours: existing?.totalHours || 0.1,
      workHours: existing?.workHours || 0.1,
      overtimeHours: existing?.overtimeHours || 0,
      punches: combinedPunches,
      totalPunchIns: combinedPunches.filter((p) => p.type === 'IN').length,
      totalPunchOuts: combinedPunches.filter((p) => p.type === 'OUT').length,
      firstInTime,
      lastOutTime: null,
      notes,
    };

    const lateCalc = calculateLateDeduction(currentEmployee, interimRecord, settings);
    const finalRecord: AttendanceRecord = {
      ...interimRecord,
      chargeableLateMinutes: lateCalc.chargeableLateMinutes,
      perMinuteDeductionRate: lateCalc.perMinuteRate,
      dailySalaryUsed: lateCalc.dailySalary,
      monthlySalaryUsed: lateCalc.monthlySalary,
      salaryBasisUsed: lateCalc.salaryBasis,
      lateSalaryDeduction: lateCalc.deductionAmount,
      payrollAdjustmentStatus: lateCalc.status,
    };

    if (existing) {
      setAttendance((prev) => prev.map((a) => (a.id === existing.id ? finalRecord : a)));
    } else {
      setAttendance((prev) => [finalRecord, ...prev]);
    }

    // Capture real GPS location for check-in
    capturePunchLocationAndRecord('CHECK_IN', punchSource, timeStr, recordId);

    appendAuditLog(
      `Punched in at ${timeStr} via ${punchSource}${isFirstIn ? ' (FIRST IN)' : ' (Intermediate IN)'}${isLate ? ` (Late by ${lateMinutes}m)` : ''}`,
      'Attendance',
      `${currentEmployee.fullName} (${currentEmployee.id})`,
      currentEmployee.id,
      isFirstIn ? 'Not Checked In' : 'On Break',
      `Checked In at ${timeStr} (${punchSource})`
    );
    addToast(
      `Punched in at ${timeStr} (${isFirstIn ? 'First In' : `Punch-In #${combinedPunches.filter(p => p.type === 'IN').length}`})`,
      isLate
        ? `Marked Late (${lateMinutes}m past ${settings.workStartTime}). Late deduction: ₹${lateCalc.deductionAmount.toFixed(2)}.`
        : 'Punch-in and GPS location check recorded.'
    );
  };

  const checkOutToday = (options?: { viaMobileApp?: boolean } | 'Web Portal' | 'Mobile App') => {
    const isMobilePunch = Boolean(
      options === 'Mobile App' || (typeof options === 'object' && options?.viaMobileApp)
    );
    const mobileUser = mobileAppUsers.find((m) => m.employeeId === currentEmployee.id);

    if (isMobilePunch && mobileUser) {
      if (mobileUser.accessStatus === 'SUSPENDED') {
        addToast(
          'Mobile Access Suspended',
          'Your mobile app account is currently suspended. Contact HR or Admin.',
          'error'
        );
        return;
      }
      if (
        !mobileUser.attendancePermissions.allowMobileAttendance ||
        !mobileUser.attendancePermissions.allowMobileCheckOut
      ) {
        addToast(
          'Mobile Check-Out Restricted',
          'Mobile check-out is disabled for your profile. Please use the office terminal or contact Admin.',
          'error'
        );
        return;
      }
    }

    const existing = attendance.find(
      (a) => a.employeeId === currentEmployee.id && a.date === TODAY_DATE
    );
    if (!existing) {
      addToast('Cannot Punch Out', 'You must punch in first before punching out.', 'error');
      return;
    }
    const norm = getNormalizedPunchesForRecord(existing, currentEmployee.id);
    const lastPunch = norm.punches.length > 0 ? norm.punches[norm.punches.length - 1] : null;
    if (!lastPunch || lastPunch.type !== 'IN') {
      addToast('Cannot Punch Out', 'You must punch in before punching out.', 'error');
      return;
    }

    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const outTimeStr = `${hh}:${mm}`;
    const punchSource: PunchSource = isMobilePunch ? 'Mobile App' : 'Web Portal';

    const newOutPunch: PunchEvent = {
      id: `PUNCH-${currentEmployee.id}-${Date.now()}`,
      employeeId: currentEmployee.id,
      timestamp: `${TODAY_DATE}T${outTimeStr}:00`,
      time: outTimeStr,
      type: 'OUT',
      source: punchSource,
      isFirstIn: false,
      isLastOut: true,
      isIntermediate: false,
    };

    const updatedPunches = [...norm.punches, newOutPunch];
    const interim: AttendanceRecord = {
      ...existing,
      punches: updatedPunches,
      punchOut: outTimeStr,
      checkOut: outTimeStr,
    };
    const finalNorm = getNormalizedPunchesForRecord(interim, currentEmployee.id);
    const workedHours = finalNorm.workedHours;
    const lateCalc = calculateLateDeduction(currentEmployee, interim, settings);

    const updatedRecord: AttendanceRecord = {
      ...interim,
      punches: finalNorm.punches,
      totalPunchIns: finalNorm.totalPunchIns,
      totalPunchOuts: finalNorm.totalPunchOuts,
      firstInTime: finalNorm.firstIn?.time || existing.checkIn || null,
      lastOutTime: outTimeStr,
      validPunchPairsCount: finalNorm.validPairsCount,
      hasUnmatchedPunch: finalNorm.hasUnmatchedPunch,
      unmatchedPunchNote: finalNorm.unmatchedNote,
      workingHours: workedHours,
      totalHours: workedHours,
      workHours: workedHours,
      overtimeHours: Math.max(0, Number((workedHours - 9).toFixed(1))),
      chargeableLateMinutes: lateCalc.chargeableLateMinutes,
      perMinuteDeductionRate: lateCalc.perMinuteRate,
      dailySalaryUsed: lateCalc.dailySalary,
      monthlySalaryUsed: lateCalc.monthlySalary,
      salaryBasisUsed: lateCalc.salaryBasis,
      lateSalaryDeduction: lateCalc.deductionAmount,
      payrollAdjustmentStatus: lateCalc.status,
    };

    setAttendance((prev) => prev.map((a) => (a.id === existing.id ? updatedRecord : a)));

    // Capture real GPS location for check-out
    capturePunchLocationAndRecord('CHECK_OUT', punchSource, outTimeStr, existing.id);

    appendAuditLog(
      `Punched out at ${outTimeStr} via ${punchSource} (Worked duration: ${workedHours}h across ${finalNorm.validPairsCount} punch pairs)`,
      'Attendance',
      `${currentEmployee.fullName} (${currentEmployee.id})`,
      currentEmployee.id,
      `Punched In at ${lastPunch.time}`,
      `Punched Out at ${outTimeStr} (${punchSource})`
    );
    addToast('Punched out successfully', `Departure saved: ${outTimeStr} (${workedHours}h worked from valid punch pairs).`);
  };

  const logOrUpdateAttendanceForEmployee = (payload: {
    employeeId: string;
    date: string;
    checkIn: string;
    checkOut: string | null;
    status: AttendanceRecord['status'];
    notes: string;
  }) => {
    if (currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
      addToast(
        'Permission Denied',
        'Only HR or Admin users can add or modify employee attendance records.',
        'error'
      );
      return;
    }
    const targetEmp = allEmployees.find((e) => e.id === payload.employeeId) || currentEmployee;
    const [startH, startM] = settings.workStartTime.split(':').map(Number);
    const [inH, inM] = (payload.checkIn || '09:30').split(':').map(Number);
    const startTotalMins = startH * 60 + startM + settings.gracePeriodMinutes;
    const inTotalMins = inH * 60 + inM;
    const isLate = payload.status === 'Late' || inTotalMins > startTotalMins;
    const lateMinutes = isLate ? Math.max(0, inTotalMins - (startH * 60 + startM)) : 0;

    const existingIdx = attendance.findIndex(
      (a) => a.employeeId === targetEmp.id && a.date === payload.date
    );
    const existing = existingIdx >= 0 ? attendance[existingIdx] : null;

    const interimRecord: AttendanceRecord = {
      id: existing?.id || `ATT-${payload.date.replace(/-/g, '')}-${targetEmp.id.replace('EMP-', '')}`,
      employeeId: targetEmp.id,
      employeeName: targetEmp.fullName,
      employeeCode: targetEmp.id,
      department: targetEmp.department,
      managerId: targetEmp.managerId,
      uid: targetEmp.uid,
      managerUid: targetEmp.managerUid,
      date: payload.date,
      checkIn: payload.checkIn || null,
      checkOut: payload.checkOut || null,
      punchIn: payload.checkIn || null,
      punchOut: payload.checkOut || null,
      status: payload.status,
      isLate,
      lateMinutes,
      lateByMinutes: lateMinutes,
      earlyDepartureMinutes: 0,
      workingHours: payload.status === 'Half Day' ? 4.5 : 8.5,
      totalHours: payload.status === 'Half Day' ? 4.5 : 8.5,
      workHours: payload.status === 'Half Day' ? 4.5 : 8.5,
      overtimeHours: 0,
      notes: payload.notes || `Updated by ${currentEmployee.fullName} (${currentRole})`,
      source: 'MANUAL',
      isManualCorrection: true,
      manualCorrectionReason: payload.notes || 'Administrative Attendance Update',
      correctedBy: currentEmployee.fullName,
      correctedAt: new Date().toISOString(),
    };

    const norm = getNormalizedPunchesForRecord(interimRecord, targetEmp.id);
    const lateCalc = calculateLateDeduction(targetEmp, interimRecord, settings);

    const record: AttendanceRecord = {
      ...interimRecord,
      punches: norm.punches,
      totalPunchIns: norm.totalPunchIns,
      totalPunchOuts: norm.totalPunchOuts,
      firstInTime: norm.firstIn?.time || payload.checkIn || null,
      lastOutTime: norm.lastOut?.time || payload.checkOut || null,
      validPunchPairsCount: norm.validPairsCount,
      hasUnmatchedPunch: norm.hasUnmatchedPunch,
      unmatchedPunchNote: norm.unmatchedNote,
      workingHours: norm.workedHours || (payload.status === 'Half Day' ? 4.5 : 8.5),
      totalHours: norm.workedHours || (payload.status === 'Half Day' ? 4.5 : 8.5),
      workHours: norm.workedHours || (payload.status === 'Half Day' ? 4.5 : 8.5),
      chargeableLateMinutes: lateCalc.chargeableLateMinutes,
      perMinuteDeductionRate: lateCalc.perMinuteRate,
      dailySalaryUsed: lateCalc.dailySalary,
      monthlySalaryUsed: lateCalc.monthlySalary,
      salaryBasisUsed: lateCalc.salaryBasis,
      lateSalaryDeduction: lateCalc.deductionAmount,
      payrollAdjustmentStatus: lateCalc.status,
    };

    if (existingIdx >= 0) {
      setAttendance((prev) =>
        prev.map((item, idx) => (idx === existingIdx ? record : item))
      );
    } else {
      setAttendance((prev) => [record, ...prev]);
    }

    appendAuditLog(
      `HR/Admin Updated Attendance (${payload.date} · ${payload.status})`,
      'Attendance',
      `${targetEmp.fullName} (${targetEmp.id})`,
      targetEmp.id,
      'Previous Attendance',
      `${payload.checkIn || '--'} to ${payload.checkOut || '--'} (${payload.status})`
    );
    addToast(
      `Attendance Logged for ${targetEmp.fullName}`,
      `${payload.date} marked as ${payload.status} (${record.workingHours}h). Late deduction: ₹${lateCalc.deductionAmount}.`
    );
  };

  // Workflow 2A: Manual Attendance Correction (HR & Admin)
  const logManualAttendance = (payload: {
    employeeId: string;
    date: string;
    punchIn?: string | null;
    punchOut?: string | null;
    status: AttendanceRecord['status'];
    reason: string;
    notes?: string;
    lateByMinutes?: number;
  }) => {
    if (currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
      addToast(
        'Permission Denied',
        'Only HR or Admin users have authorized access to manually log or correct attendance.',
        'error'
      );
      return;
    }
    if (!payload.reason || !payload.reason.trim()) {
      addToast(
        'Reason Required',
        'A mandatory explanation/reason must be provided for manual attendance records and corrections.',
        'error'
      );
      return;
    }

    const targetEmp = allEmployees.find((e) => e.id === payload.employeeId) || currentEmployee;
    const existing = attendance.find(
      (a) => a.employeeId === targetEmp.id && a.date === payload.date
    );

    const prevIn = existing?.punchIn || existing?.checkIn || null;
    const prevOut = existing?.punchOut || existing?.checkOut || null;

    const recordId =
      existing?.id ||
      `ATT-MANUAL-${payload.date.replace(/-/g, '')}-${targetEmp.id.replace('EMP-', '')}-${Date.now().toString().slice(-4)}`;
    const nowIso = new Date().toISOString();

    const manualRecordRaw: AttendanceRecord = {
      id: recordId,
      employeeId: targetEmp.id,
      employeeName: targetEmp.fullName,
      employeeCode: targetEmp.id,
      department: targetEmp.department,
      managerId: targetEmp.managerId,
      uid: targetEmp.uid,
      managerUid: targetEmp.managerUid,
      date: payload.date,
      checkIn: payload.punchIn || null,
      checkOut: payload.punchOut || null,
      punchIn: payload.punchIn || null,
      punchOut: payload.punchOut || null,
      status: payload.status,
      isLate: payload.status === 'Late' || (payload.lateByMinutes ? payload.lateByMinutes > 0 : false),
      lateMinutes: payload.lateByMinutes || 0,
      lateByMinutes: payload.lateByMinutes || 0,
      earlyDepartureMinutes: 0,
      workingHours: payload.status === 'Half Day' ? 4.5 : 8.5,
      workHours: payload.status === 'Half Day' ? 4.5 : 8.5,
      totalHours: payload.status === 'Half Day' ? 4.5 : 8.5,
      overtimeHours: 0,
      notes: `${payload.notes || ''} [Manual: ${payload.reason}]`.trim(),
      source: 'MANUAL',
      isManualCorrection: true,
      manualCorrectionReason: payload.reason.trim(),
      correctedBy: currentEmployee.fullName,
      correctedAt: nowIso,
      previousPunchIn: prevIn,
      previousPunchOut: prevOut,
    };

    const norm = getNormalizedPunchesForRecord(manualRecordRaw, targetEmp.id);
    const lateCalc = calculateLateDeduction(targetEmp, manualRecordRaw, settings);

    const manualRecord: AttendanceRecord = {
      ...manualRecordRaw,
      punches: norm.punches,
      totalPunchIns: norm.totalPunchIns,
      totalPunchOuts: norm.totalPunchOuts,
      firstInTime: norm.firstIn?.time || payload.punchIn || null,
      lastOutTime: norm.lastOut?.time || payload.punchOut || null,
      validPunchPairsCount: norm.validPairsCount,
      hasUnmatchedPunch: norm.hasUnmatchedPunch,
      unmatchedPunchNote: norm.unmatchedNote,
      workingHours: norm.workedHours || (payload.status === 'Half Day' ? 4.5 : 8.5),
      totalHours: norm.workedHours || (payload.status === 'Half Day' ? 4.5 : 8.5),
      workHours: norm.workedHours || (payload.status === 'Half Day' ? 4.5 : 8.5),
      chargeableLateMinutes: lateCalc.chargeableLateMinutes,
      perMinuteDeductionRate: lateCalc.perMinuteRate,
      dailySalaryUsed: lateCalc.dailySalary,
      monthlySalaryUsed: lateCalc.monthlySalary,
      salaryBasisUsed: lateCalc.salaryBasis,
      lateSalaryDeduction: lateCalc.deductionAmount,
      payrollAdjustmentStatus: lateCalc.status,
    };

    const nextAttendance = existing
      ? attendance.map((a) => (a.id === existing.id ? manualRecord : a))
      : [manualRecord, ...attendance];

    setAttendance(nextAttendance);
    localStorage.setItem('hrms_persisted_attendance', JSON.stringify(nextAttendance));
    syncAttendanceRecordToSupabase(manualRecord);

    appendAuditLog(
      existing ? 'Manual Attendance Correction' : 'Add Manual Attendance',
      'Attendance',
      `${targetEmp.fullName} (${targetEmp.id}) — ${payload.date}`,
      targetEmp.id,
      existing
        ? `Punch-In: ${prevIn || '--'}, Punch-Out: ${prevOut || '--'}, Status: ${existing.status}`
        : 'No Prior Record',
      `Punch-In: ${payload.punchIn || '--'}, Punch-Out: ${payload.punchOut || '--'}, Status: ${payload.status} (Reason: ${payload.reason})`
    );

    addToast(
      existing ? 'Attendance Corrected' : 'Manual Attendance Added',
      `${targetEmp.fullName} on ${payload.date} marked as ${payload.status} (${manualRecord.workingHours}h) with visible Manual badge.`,
      'success'
    );
  };

  // Workflow 2B: Add New Employee (Onboarding with Persistence)
  const addNewEmployee = (
    newEmp: Omit<Employee, 'id' | 'uid' | 'managerUid' | 'salaryHistory' | 'leaveBalance'>,
    generateOffer: boolean
  ): Employee => {
    // Generate safe unique ID to avoid collisions
    let nextNum = 1001 + allEmployees.length;
    while (allEmployees.some((e) => e.id === `EMP-${nextNum}`)) {
      nextNum++;
    }
    const empId = `EMP-${nextNum}`;
    const managerObj = allEmployees.find((e) => e.id === newEmp.managerId) || DEFAULT_ADMIN_OPERATOR;
    const created: Employee = {
      ...newEmp,
      id: empId,
      uid: `uid_emp_${nextNum}`,
      managerUid: managerObj.uid,
      salaryHistory: [],
      leaveBalance: {
        casualTotal: settings.casualLeaveQuota,
        casualUsed: 0,
        sickTotal: settings.sickLeaveQuota,
        sickUsed: 0,
        earnedTotal: settings.earnedLeaveQuota,
        earnedUsed: 0,
      },
    };

    const updatedEmployees = [created, ...allEmployees];
    setAllEmployees(updatedEmployees);
    localStorage.setItem('hrms_persisted_employees', JSON.stringify(updatedEmployees));
    syncEmployeeToSupabase(created);

    // Async write to Firestore if authenticated
    if (firebaseUser && firebaseUser.emailVerified) {
      setDoc(doc(db, 'employees', empId), {
        id: empId,
        uid: created.uid,
        managerUid: created.managerUid,
        fullName: created.fullName.slice(0, 120),
        designation: created.designation.slice(0, 120),
        department: created.department.slice(0, 80),
        status: created.status,
        payloadJson: JSON.stringify(created).slice(0, 7900),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }).catch((err) => console.warn('Firestore employee write err', err));
    }

    const todayAtt: AttendanceRecord = {
      id: `ATT-${TODAY_DATE.replace(/-/g, '')}-${nextNum}`,
      employeeId: empId,
      employeeName: created.fullName,
      employeeCode: empId,
      department: created.department,
      managerId: created.managerId,
      uid: created.uid,
      managerUid: created.managerUid,
      date: TODAY_DATE,
      checkIn: '09:30',
      checkOut: null,
      status: 'Present',
      isLate: false,
      lateMinutes: 0,
      earlyDepartureMinutes: 0,
      workingHours: 7.0,
      overtimeHours: 0,
      notes: 'Day 1 Onboarding Check-In',
    };
    setAttendance((prev) => [todayAtt, ...prev]);

    const gross =
      created.salary.baseSalary + created.salary.hra + created.salary.specialAllowance;
    const deductions =
      created.salary.pfDeduction +
      created.salary.taxDeduction +
      created.salary.professionalTax;
    const newPayroll: PayrollRecord = {
      id: `PAY-202610-${empId}`,
      employeeId: empId,
      employeeName: created.fullName,
      designation: created.designation,
      department: created.department,
      managerId: created.managerId,
      uid: created.uid,
      managerUid: created.managerUid,
      month: 'October 2026',
      workingDays: 26,
      presentDays: 26,
      paidLeaveDays: 0,
      unpaidLeaveDays: 0,
      lateOccurrences: 0,
      baseSalary: created.salary.baseSalary,
      hra: created.salary.hra,
      specialAllowance: created.salary.specialAllowance,
      bonus: 0,
      pfDeduction: created.salary.pfDeduction,
      taxDeduction: created.salary.taxDeduction,
      professionalTax: created.salary.professionalTax,
      attendanceDeduction: 0,
      considerationAdjustment: 0,
      netSalary: gross - deductions,
      status: 'Processed',
      paidDate: '2026-10-31',
    };
    setPayrolls((prev) => [newPayroll, ...prev]);

    if (generateOffer) {
      const offerLetter: GeneratedLetter = {
        id: `LTR-${Date.now()}`,
        employeeId: empId,
        employeeName: created.fullName,
        department: created.department,
        designation: created.designation,
        templateType: 'Offer Letter',
        subject: `Offer of Full-Time Employment — ${created.designation}`,
        content: `Date: ${TODAY_DATE}\nReference: ARG/HR/OFR/2026/${nextNum}\n\nTo,\n${created.fullName}\n${created.address}\n\nDear ${created.fullName.split(' ')[0]},\n\nWe are delighted to offer you the position of ${created.designation} in the ${created.department} department at ${settings.legalEntityName}, reporting to ${created.managerName}, effective ${created.joiningDate}.\n\nYour monthly gross compensation will be ${settings.currencySymbol}${gross.toLocaleString('en-IN')} per month.\n\nWarm regards,\nChaitanya Katare\nHead of People : Performance & Culture\n${settings.companyName}`,
        issuedDate: TODAY_DATE,
        issuedBy: currentEmployee.fullName,
      };
      setLetters((prev) => [offerLetter, ...prev]);
    }

    appendAuditLog(
      `Onboarded new employee ${created.fullName} (${empId})`,
      'People',
      `${created.fullName} (${empId})`,
      empId,
      'None',
      `${created.designation} · ${created.department}`
    );

    addToast(
      `Employee ${created.fullName} Created`,
      `Assigned ID ${empId}, added to ${created.department}${generateOffer ? ', and generated Offer Letter.' : '.'}`
    );

    return created;
  };

  const updateEmployeeStatus = (employeeId: string, status: Employee['status']) => {
    if (currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
      addToast('Permission Denied', 'Only HR or Admin can modify employee records.', 'error');
      return;
    }
    const target = allEmployees.find((e) => e.id === employeeId);
    if (!target) return;
    setAllEmployees((prev) =>
      prev.map((e) => (e.id === employeeId ? { ...e, status } : e))
    );
    appendAuditLog(
      `Updated employment status to ${status}`,
      'People',
      `${target.fullName} (${employeeId})`,
      employeeId,
      `Status: ${target.status}`,
      `Status: ${status}`
    );
    addToast('Employee Status Updated', `${target.fullName} is now marked as ${status}.`);
  };

  const archiveEmployee = (employeeId: string, reasonNote?: string) => {
    if (currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
      addToast('Permission Denied', 'Only HR or Admin can archive employee records.', 'error');
      return;
    }
    if (employeeId === SUPER_ADMIN_EMP_ID) {
      addToast('Protected Super Admin', 'The Super Admin account (Argos Watch) cannot be archived.', 'error');
      return;
    }
    const target = allEmployees.find((e) => e.id === employeeId);
    if (!target) return;
    const previousStatus = target.status;
    const updated = allEmployees.map((e) =>
      e.id === employeeId ? { ...e, status: 'Archived' as any } : e
    );
    setAllEmployees(updated);
    localStorage.setItem('hrms_persisted_employees', JSON.stringify(updated));

    appendAuditLog(
      `Archived employee ${target.fullName} (${employeeId})`,
      'People',
      `${target.fullName} (${employeeId})`,
      employeeId,
      `Status: ${previousStatus}`,
      `Status: Archived (Reason: ${reasonNote || 'Operational archival with all history preserved'})`
    );

    addToast(
      'Employee Archived',
      `${target.fullName} has been archived. All payroll, attendance, and leave records are safely preserved.`
    );
  };

  const deactivateEmployee = (employeeId: string, reason?: string) => {
    if (currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
      addToast('Permission Denied', 'Only HR or Admin can deactivate employee records.', 'error');
      return;
    }
    if (employeeId === SUPER_ADMIN_EMP_ID) {
      addToast('Protected Super Admin', 'The Super Admin account (Argos Watch) cannot be deactivated.', 'error');
      return;
    }
    const target = allEmployees.find((e) => e.id === employeeId);
    if (!target) return;
    const nowIso = new Date().toISOString();
    const historyItem = {
      deactivatedAt: nowIso,
      deactivatedBy: currentEmployee.fullName,
      reason: reason || 'Administrative Deactivation',
    };
    const updated = allEmployees.map((e) => {
      if (e.id !== employeeId) return e;
      const history = e.deactivationHistory ? [...e.deactivationHistory, historyItem] : [historyItem];
      return {
        ...e,
        status: 'Inactive',
        isDeactivated: true,
        deactivatedAt: nowIso,
        deactivatedBy: currentEmployee.fullName,
        deactivationReason: reason || 'Administrative Deactivation',
        deactivationHistory: history,
      };
    });
    setAllEmployees(updated);
    localStorage.setItem('hrms_persisted_employees', JSON.stringify(updated));

    appendAuditLog(
      `Deactivated employee ${target.fullName} (${employeeId}) - Moved to Employee Archive`,
      'People',
      `${target.fullName} (${employeeId})`,
      employeeId,
      `Status: ${target.status}`,
      `Status: Inactive (Deactivated: ${reason || 'Administrative Deactivation'})`
    );

    addToast(
      'Employee Deactivated',
      `${target.fullName} has been moved to Employee Archive. You can restore or initiate final exit from the archive.`
    );
  };

  const restoreEmployee = (employeeId: string, restoreReason?: string) => {
    if (currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
      addToast('Permission Denied', 'Only HR or Admin can restore employee records.', 'error');
      return;
    }
    const target = allEmployees.find((e) => e.id === employeeId);
    if (!target) return;
    const nowIso = new Date().toISOString();
    const historyItem = {
      deactivatedAt: target.deactivatedAt || nowIso,
      deactivatedBy: target.deactivatedBy || 'System',
      isRestored: true,
      restoredAt: nowIso,
      restoredBy: currentEmployee.fullName,
      restoreReason: restoreReason || 'Deactivated by mistake - Restored to active service',
    };
    const updated = allEmployees.map((e) => {
      if (e.id !== employeeId) return e;
      const history = e.deactivationHistory ? [...e.deactivationHistory, historyItem] : [historyItem];
      return {
        ...e,
        status: 'Active',
        isDeactivated: false,
        isExited: false,
        deactivationHistory: history,
      };
    });
    setAllEmployees(updated);
    localStorage.setItem('hrms_persisted_employees', JSON.stringify(updated));

    appendAuditLog(
      `Restored employee ${target.fullName} (${employeeId}) to Active status`,
      'People',
      `${target.fullName} (${employeeId})`,
      employeeId,
      `Status: ${target.status}`,
      `Status: Active (Reason: ${restoreReason || 'Deactivated by mistake - Restored'})`
    );

    addToast(
      'Employee Restored',
      `${target.fullName} has been restored to active status without duplicating records.`
    );
  };

  const initiateFinalExit = (
    employeeIdOrData: string | FinalExitDetails,
    exitDataParam?: FinalExitDetails
  ) => {
    if (currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
      addToast('Permission Denied', 'Only HR or Admin can process employee final exit.', 'error');
      return;
    }
    const exitData: FinalExitDetails =
      typeof employeeIdOrData === 'object' ? employeeIdOrData : exitDataParam!;
    const employeeId =
      typeof employeeIdOrData === 'string' ? employeeIdOrData : exitData.employeeId!;

    const target = allEmployees.find((e) => e.id === employeeId);
    if (!target) return;

    let generatedLetterId = exitData.generatedLetterId;
    if (exitData.selectedLetterTemplateId && !generatedLetterId) {
      const template = masterLetterTemplates.find((t) => t.id === exitData.selectedLetterTemplateId);
      if (template) {
        const letter = generateAndSaveLetter({
          employeeId: target.id,
          templateType: (exitData.exitType === 'Resignation' ? 'Offer Letter' : 'Warning / Show Cause Notice') as any,
          subject: `${exitData.exitType === 'Resignation' ? 'Resignation Acceptance' : 'Relieving / Termination'} — ${target.fullName}`,
          content: `Dear ${target.fullName},\n\nThis letter formally acknowledges your final exit (${exitData.exitType}) effective from ${exitData.effectiveLastDate || exitData.effectiveLastWorkingDate}.\n\nReason: ${exitData.exitReason}\n\nInternal Notes: ${exitData.internalNote || exitData.mandatoryInternalNote || 'Exit processed in accordance with company policy.'}\n\nWe thank you for your contributions to Argos Watch and wish you the very best in your future endeavors.\n\nAuthorized Signatory,\nArgos Watch HR`,
        });
        generatedLetterId = letter.id;
      }
    }

    const finalExitRecord: FinalExitDetails = {
      ...exitData,
      generatedLetterId,
      initiatedBy: exitData.initiatedBy || currentEmployee.fullName,
      initiatedAt: exitData.initiatedAt || new Date().toISOString(),
      finalizedBy: currentEmployee.fullName,
      finalizedAt: new Date().toISOString(),
      status: 'FINAL_EXIT_COMPLETED',
    };

    const updated = allEmployees.map((e) => {
      if (e.id !== employeeId) return e;
      return {
        ...e,
        status: 'Exited',
        isDeactivated: true,
        isExited: true,
        finalExit: finalExitRecord,
      };
    });
    setAllEmployees(updated);
    localStorage.setItem('hrms_persisted_employees', JSON.stringify(updated));

    appendAuditLog(
      `Finalized Exit for ${target.fullName} (${employeeId}) - Type: ${exitData.exitType}`,
      'People',
      `${target.fullName} (${employeeId})`,
      employeeId,
      `Status: ${target.status}`,
      `Status: Exited (Effective: ${exitData.effectiveLastDate || exitData.effectiveLastWorkingDate}, Reason: ${exitData.exitReason})`
    );

    setNotifications((prev) => [
      {
        id: `NOTIF-EXIT-${Date.now()}`,
        targetRoles: [UserRole.ADMIN, UserRole.HR],
        title: `Employee Exit Completed: ${target.fullName}`,
        message: `${target.fullName} (${target.department}) exit finalized as ${exitData.exitType}. Effective Last Day: ${exitData.effectiveLastDate}.`,
        category: 'Announcement',
        createdAt: new Date().toISOString(),
        isRead: false,
        linkModule: 'people',
      },
      ...prev,
    ]);

    addToast(
      'Final Exit Processed',
      `${target.fullName} marked as Exited. Historical records preserved, future access restricted.`
    );
  };

  const updateNoticePeriod = (employeeId: string, noticeData: NoticePeriodDetails) => {
    if (currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
      addToast('Permission Denied', 'Only HR or Admin can modify notice period.', 'error');
      return;
    }
    const target = allEmployees.find((e) => e.id === employeeId);
    if (!target) return;
    const nowIso = new Date().toISOString();
    const updatedNotice: NoticePeriodDetails = {
      ...noticeData,
      createdBy: noticeData.createdBy || currentEmployee.fullName,
      createdAt: noticeData.createdAt || nowIso,
      updatedAt: nowIso,
      updatedBy: currentEmployee.fullName,
    };

    let newStatus = target.status;
    if (noticeData.applicable && noticeData.status === 'Active' && target.status !== 'Exited' && target.status !== 'Inactive') {
      newStatus = 'On Notice';
    } else if ((noticeData.status === 'Cancelled' || noticeData.status === 'Waived') && target.status === 'On Notice') {
      newStatus = 'Active';
    }

    const updated = allEmployees.map((e) => {
      if (e.id !== employeeId) return e;
      return {
        ...e,
        status: newStatus,
        noticePeriod: updatedNotice,
      };
    });
    setAllEmployees(updated);
    localStorage.setItem('hrms_persisted_employees', JSON.stringify(updated));

    appendAuditLog(
      `Updated Notice Period for ${target.fullName} (${employeeId}) - Status: ${noticeData.status}`,
      'People',
      `${target.fullName} (${employeeId})`,
      employeeId,
      `Notice Status: ${target.noticePeriod?.status || 'None'}`,
      `Notice Status: ${noticeData.status} (Expected Last Day: ${noticeData.expectedLastWorkingDate})`
    );

    addToast(
      'Notice Period Updated',
      `Notice period for ${target.fullName} recorded (Expected Last Day: ${noticeData.expectedLastWorkingDate}).`
    );
  };

  // Workflow 3: Two-Stage Leave Approval Workflow (Employee -> Manager Review -> HR Final Review -> Final Status)
  const applyLeave = (payload: {
    targetEmployeeId?: string;
    leaveType: LeaveRequest['leaveType'];
    startDate: string;
    endDate: string;
    days: number;
    isHalfDay: boolean;
    halfDaySession?: LeaveRequest['halfDaySession'];
    reason: string;
    autoApprove?: boolean;
  }) => {
    const isHRAdmin = currentRole === UserRole.HR || currentRole === UserRole.ADMIN;
    const targetEmp =
      isHRAdmin && payload.targetEmployeeId
        ? allEmployees.find((e) => e.id === payload.targetEmployeeId) || currentEmployee
        : currentEmployee;

    const isOnBehalf = targetEmp.id !== currentEmployee.id;
    const canAutoApprove = isHRAdmin && Boolean(payload.autoApprove);
    const nowFormatted = new Date().toISOString().replace('T', ' ').slice(0, 16);

    const leaveId = `LV-2026-${100 + leaves.length + 1}`;
    const initialHistory = [
      {
        stage: 'SUBMITTED' as const,
        actorId: currentEmployee.id,
        actorName: currentEmployee.fullName,
        actorRole: currentRole,
        action: 'SUBMITTED' as const,
        note: payload.reason,
        timestamp: nowFormatted,
      },
      ...(canAutoApprove
        ? [
            {
              stage: 'HR_FINAL_REVIEW' as const,
              actorId: currentEmployee.id,
              actorName: currentEmployee.fullName,
              actorRole: currentRole,
              action: 'APPROVED' as const,
              note: `Logged & Final Approved by ${currentEmployee.fullName} (${currentRole} On Behalf)`,
              timestamp: nowFormatted,
            },
          ]
        : []),
    ];

    const newLeave: LeaveRequest = {
      id: leaveId,
      employeeId: targetEmp.id,
      employeeName: targetEmp.fullName,
      department: targetEmp.department,
      managerId: targetEmp.managerId,
      uid: targetEmp.uid,
      managerUid: targetEmp.managerUid,
      leaveType: payload.leaveType,
      startDate: payload.startDate,
      endDate: payload.endDate,
      days: payload.days,
      isHalfDay: payload.isHalfDay,
      halfDaySession: payload.isHalfDay
        ? payload.halfDaySession || 'First Half (09:30 - 14:00)'
        : undefined,
      reason: payload.reason,
      appliedBy: isOnBehalf
        ? `${currentEmployee.fullName} (${currentRole} On Behalf)`
        : targetEmp.fullName,
      status: canAutoApprove ? 'APPROVED' : 'PENDING_MANAGER',
      decisionNote: canAutoApprove
        ? `Logged & Approved by ${currentEmployee.fullName} (${currentRole} On Behalf)`
        : `Awaiting Manager Review (${targetEmp.managerName})`,
      hrApprovedBy: canAutoApprove ? currentEmployee.fullName : undefined,
      hrApprovedAt: canAutoApprove ? nowFormatted : undefined,
      hrDecisionNote: canAutoApprove
        ? `Logged & Approved by ${currentEmployee.fullName}`
        : undefined,
      decidedBy: canAutoApprove ? currentEmployee.fullName : undefined,
      decidedAt: canAutoApprove ? new Date().toISOString() : undefined,
      approvalHistory: initialHistory,
      createdAt: new Date().toISOString(),
    };

    setLeaves((prev) => [newLeave, ...prev]);
    syncLeaveRequestToSupabase(newLeave);

    if (canAutoApprove) {
      setAllEmployees((prev) =>
        prev.map((emp) => {
          if (emp.id !== targetEmp.id) return emp;
          const bal = { ...emp.leaveBalance };
          const lt = String(payload.leaveType).toUpperCase();
          if (lt === 'CASUAL') bal.casualUsed += payload.days;
          if (lt === 'SICK') bal.sickUsed += payload.days;
          if (lt === 'EARNED') bal.earnedUsed += payload.days;
          return { ...emp, leaveBalance: bal };
        })
      );
    }

    // Notify relevant Manager and HR/Employee
    setNotifications((prev) => [
      {
        id: `NOTIF-${Date.now()}-MGR`,
        targetRoles: [UserRole.MANAGER, UserRole.HR, UserRole.ADMIN],
        targetEmployeeId: !isOnBehalf ? targetEmp.managerId : undefined,
        title: isOnBehalf
          ? `Leave Logged on Behalf: ${targetEmp.fullName}`
          : `Leave Request Awaiting Manager Review: ${targetEmp.fullName}`,
        message: isOnBehalf
          ? `${currentEmployee.fullName} logged ${payload.days}d ${payload.leaveType} Leave for ${targetEmp.fullName} (${payload.startDate}).`
          : `${targetEmp.fullName} applied for ${payload.days}d ${payload.leaveType} Leave (${payload.startDate} to ${payload.endDate}). Routed to ${targetEmp.managerName} for Manager Review.`,
        category: 'Leave',
        createdAt: 'Just now',
        isRead: false,
        linkModule: 'leave',
      },
      {
        id: `NOTIF-${Date.now()}-EMP`,
        targetRoles: [UserRole.EMPLOYEE, UserRole.MANAGER],
        targetEmployeeId: targetEmp.id,
        title: `Leave Request Submitted (${leaveId})`,
        message: canAutoApprove
          ? `Your ${payload.days}d ${payload.leaveType} leave (${payload.startDate}) has been logged and approved by HR.`
          : `Your ${payload.days}d ${payload.leaveType} leave request has been sent to ${targetEmp.managerName} for Manager Review.`,
        category: 'Leave',
        createdAt: 'Just now',
        isRead: false,
        linkModule: 'leave',
      },
      ...prev,
    ]);

    appendAuditLog(
      isOnBehalf
        ? `HR Applied${canAutoApprove ? ' & Approved' : ''} ${payload.days}d ${payload.leaveType} Leave on Behalf (${leaveId})`
        : `Submitted ${payload.days}d ${payload.leaveType} Leave (${leaveId}) -> Manager Review`,
      'Leave',
      `${targetEmp.fullName} (${targetEmp.id})`,
      targetEmp.id,
      'None',
      `${payload.startDate} to ${payload.endDate} (${newLeave.status})`
    );

    addToast(
      isOnBehalf
        ? `Leave Logged for ${targetEmp.fullName}`
        : 'Leave Request Submitted',
      isOnBehalf
        ? `Recorded ${payload.days}d ${payload.leaveType} leave on behalf of ${targetEmp.fullName} (${newLeave.status}).`
        : `Routed to ${targetEmp.managerName} for Stage 1 Manager Review.`
    );
  };

  const decideLeave = (
    leaveId: string,
    status: 'Approved' | 'Rejected',
    decisionNote: string
  ) => {
    const target = leaves.find((l) => l.id === leaveId);
    if (!target) return;

    if (status === 'Rejected' && !decisionNote.trim()) {
      addToast(
        'Rejection Reason Required',
        'Please provide a reason for rejecting this leave request.',
        'error'
      );
      return;
    }

    const nowFormatted = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const isManagerActor = currentRole === UserRole.MANAGER;
    const isHRAdminActor = currentRole === UserRole.HR || currentRole === UserRole.ADMIN;

    if (!isManagerActor && !isHRAdminActor) {
      addToast('Permission Denied', 'You are not authorized to review leave requests.', 'error');
      return;
    }

    if (isManagerActor) {
      if (target.managerId !== currentEmployee.id || target.employeeId === currentEmployee.id) {
        addToast(
          'Access Restricted',
          'Managers can only review leave requests for employees assigned to their team.',
          'error'
        );
        return;
      }
      if (
        target.status !== 'Pending' &&
        (target.status as string) !== 'Pending Manager' &&
        target.status !== 'PENDING_MANAGER'
      ) {
        addToast(
          'Already Reviewed',
          'This leave request has already completed the Manager Review stage.',
          'info'
        );
        return;
      }

      const nextStatus: LeaveRequest['status'] = status === 'Approved' ? 'PENDING_HR' : 'REJECTED';
      const noteText =
        decisionNote.trim() ||
        (status === 'Approved'
          ? `Approved by Manager (${currentEmployee.fullName}) and forwarded to HR for final approval.`
          : 'Rejected by Manager.');

      setLeaves((prev) =>
        prev.map((l) => {
          if (l.id !== leaveId) return l;
          const prevHist = l.approvalHistory || [
            {
              stage: 'SUBMITTED' as const,
              actorId: l.employeeId,
              actorName: l.employeeName,
              actorRole: UserRole.EMPLOYEE,
              action: 'SUBMITTED' as const,
              note: l.reason,
              timestamp: (l.createdAt || new Date().toISOString()).slice(0, 16).replace('T', ' '),
            },
          ];
          const updatedLeave: LeaveRequest = {
            ...l,
            status: nextStatus,
            managerApprovedBy: status === 'Approved' ? currentEmployee.fullName : l.managerApprovedBy,
            managerApprovedAt: status === 'Approved' ? nowFormatted : l.managerApprovedAt,
            managerDecisionNote: noteText,
            rejectedBy: status === 'Rejected' ? currentEmployee.fullName : undefined,
            rejectedByRole: status === 'Rejected' ? UserRole.MANAGER : undefined,
            rejectedAt: status === 'Rejected' ? nowFormatted : undefined,
            rejectionReason: status === 'Rejected' ? noteText : undefined,
            decisionNote: noteText,
            decidedBy: currentEmployee.fullName,
            decidedAt: new Date().toISOString(),
            approvalHistory: [
              ...prevHist,
              {
                stage: 'MANAGER_REVIEW' as const,
                actorId: currentEmployee.id,
                actorName: currentEmployee.fullName,
                actorRole: UserRole.MANAGER,
                action: (status === 'Approved' ? 'APPROVED' : 'REJECTED') as 'APPROVED' | 'REJECTED',
                note: noteText,
                timestamp: nowFormatted,
              },
            ],
          };
          syncLeaveRequestToSupabase(updatedLeave);
          return updatedLeave;
        })
      );

      // Notify Employee and HR (Do NOT deduct leave balance yet — wait for HR Final Review!)
      setNotifications((prev) => [
        {
          id: `NOTIF-${Date.now()}-EMP`,
          targetRoles: [UserRole.EMPLOYEE, UserRole.MANAGER],
          targetEmployeeId: target.employeeId,
          title:
            status === 'Approved'
              ? `Manager Approved Leave (${leaveId}) — Forwarded to HR`
              : `Leave Rejected by Manager (${leaveId})`,
          message:
            status === 'Approved'
              ? `${currentEmployee.fullName} approved your ${target.days}d ${target.leaveType} leave and forwarded it to HR for final approval.`
              : `${currentEmployee.fullName} rejected your ${target.days}d ${target.leaveType} leave. Reason: ${noteText}`,
          category: 'Leave',
          createdAt: 'Just now',
          isRead: false,
          linkModule: 'leave',
        },
        {
          id: `NOTIF-${Date.now()}-HR`,
          targetRoles: [UserRole.HR, UserRole.ADMIN],
          title:
            status === 'Approved'
              ? `Leave Awaiting HR Final Review: ${target.employeeName}`
              : `Manager Rejected Leave: ${target.employeeName}`,
          message:
            status === 'Approved'
              ? `Manager ${currentEmployee.fullName} approved ${target.employeeName}'s ${target.days}d ${target.leaveType} leave (${target.startDate}). Ready for HR Final Review.`
              : `Manager ${currentEmployee.fullName} rejected ${target.employeeName}'s leave (${leaveId}). Reason: ${noteText}`,
          category: 'Leave',
          createdAt: 'Just now',
          isRead: false,
          linkModule: 'leave',
        },
        ...prev,
      ]);

      appendAuditLog(
        status === 'Approved'
          ? `Manager Approved Leave (${leaveId}) -> Forwarded to HR`
          : `Manager Rejected Leave (${leaveId}) — Reason: ${noteText}`,
        'Leave',
        `${target.employeeName} (${target.employeeId})`,
        target.employeeId,
        'Status: PENDING_MANAGER',
        `Status: ${nextStatus}`
      );

      addToast(
        status === 'Approved'
          ? 'Manager Approved — Forwarded to HR'
          : 'Leave Request Rejected by Manager',
        status === 'Approved'
          ? `${target.employeeName}'s leave has been forwarded to HR for final approval.`
          : `Rejected with reason: "${noteText}". Employee notified.`
      );
      return;
    }

    // HR / Admin Final Review Stage
    const finalStatus: LeaveRequest['status'] = status === 'Approved' ? 'APPROVED' : 'REJECTED';
    const hrNote =
      decisionNote.trim() ||
      (status === 'Approved'
        ? `Final HR approval granted by ${currentEmployee.fullName}. Leave balance updated.`
        : 'Rejected by HR during final review.');

    setLeaves((prev) =>
      prev.map((l) => {
        if (l.id !== leaveId) return l;
        const prevHist = l.approvalHistory || [
          {
            stage: 'SUBMITTED' as const,
            actorId: l.employeeId,
            actorName: l.employeeName,
            actorRole: UserRole.EMPLOYEE,
            action: 'SUBMITTED' as const,
            note: l.reason,
            timestamp: (l.createdAt || new Date().toISOString()).slice(0, 16).replace('T', ' '),
          },
        ];
        const updatedLeave: LeaveRequest = {
          ...l,
          status: finalStatus,
          hrApprovedBy: status === 'Approved' ? currentEmployee.fullName : l.hrApprovedBy,
          hrApprovedAt: status === 'Approved' ? nowFormatted : l.hrApprovedAt,
          hrDecisionNote: hrNote,
          rejectedBy: status === 'Rejected' ? currentEmployee.fullName : l.rejectedBy,
          rejectedByRole: status === 'Rejected' ? currentRole : l.rejectedByRole,
          rejectedAt: status === 'Rejected' ? nowFormatted : l.rejectedAt,
          rejectionReason: status === 'Rejected' ? hrNote : l.rejectionReason,
          decisionNote: hrNote,
          decidedBy: currentEmployee.fullName,
          decidedAt: new Date().toISOString(),
          approvalHistory: [
            ...prevHist,
            {
              stage: 'HR_FINAL_REVIEW' as const,
              actorId: currentEmployee.id,
              actorName: currentEmployee.fullName,
              actorRole: currentRole,
              action: (status === 'Approved' ? 'APPROVED' : 'REJECTED') as 'APPROVED' | 'REJECTED',
              note: hrNote,
              timestamp: nowFormatted,
            },
          ],
        };
        syncLeaveRequestToSupabase(updatedLeave);
        return updatedLeave;
      })
    );

    // Update Leave Balances ONLY upon HR Final Approval!
    if (status === 'Approved') {
      setAllEmployees((prev) =>
        prev.map((emp) => {
          if (emp.id !== target.employeeId) return emp;
          const bal = { ...emp.leaveBalance };
          const lt = String(target.leaveType).toUpperCase();
          if (lt === 'CASUAL') bal.casualUsed += target.days;
          if (lt === 'SICK') bal.sickUsed += target.days;
          if (lt === 'EARNED') bal.earnedUsed += target.days;
          return { ...emp, leaveBalance: bal };
        })
      );
    }

    // Notify both Employee and relevant Manager
    setNotifications((prev) => [
      {
        id: `NOTIF-${Date.now()}-EMP`,
        targetRoles: [UserRole.EMPLOYEE, UserRole.MANAGER],
        targetEmployeeId: target.employeeId,
        title: `HR Final Review — Leave ${status}: ${target.leaveType} (${target.days}d)`,
        message:
          status === 'Approved'
            ? `HR (${currentEmployee.fullName}) finalized and approved your leave request ${leaveId}. Your leave balance has been updated.`
            : `HR (${currentEmployee.fullName}) rejected your leave request ${leaveId}. Reason: ${hrNote}`,
        category: 'Leave',
        createdAt: 'Just now',
        isRead: false,
        linkModule: 'leave',
      },
      {
        id: `NOTIF-${Date.now()}-MGR`,
        targetRoles: [UserRole.MANAGER],
        targetEmployeeId: target.managerId,
        title: `HR Final Decision on Team Leave (${target.employeeName})`,
        message: `HR (${currentEmployee.fullName}) ${status.toLowerCase()} ${target.employeeName}'s ${target.days}d ${target.leaveType} leave (${leaveId}). Note: ${hrNote}`,
        category: 'Leave',
        createdAt: 'Just now',
        isRead: false,
        linkModule: 'leave',
      },
      ...prev,
    ]);

    appendAuditLog(
      `HR Final ${status} Leave Request (${leaveId})`,
      'Leave',
      `${target.employeeName} (${target.employeeId})`,
      target.employeeId,
      `Status: ${target.status}`,
      `Status: ${finalStatus}`
    );
    addToast(
      `HR Final Review: Leave ${status}`,
      status === 'Approved'
        ? `${target.employeeName}'s ${target.leaveType} leave is now Final Approved and leave balance updated.`
        : `${target.employeeName}'s leave rejected. Employee and Manager notified.`
    );
  };

  // Workflow 4: Two-Stage Consideration Approval Workflow
  // (Employee or Manager submits -> Manager Review -> HR Final Review -> Final Status)
  const submitConsideration = (payload: {
    employeeId: string;
    date: string;
    type: ConsiderationRequest['type'];
    customType?: string;
    title?: string;
    category?: string;
    reason: string;
    supportingNote?: string;
    supportingDocument: string;
    forwardToHRImmediately?: boolean;
  }) => {
    const targetEmp =
      allEmployees.find((e) => e.id === payload.employeeId) || currentEmployee;

    // Enforce Team-Based Access Security for Consideration Submission
    if (currentRole === UserRole.EMPLOYEE && targetEmp.id !== currentEmployee.id) {
      addToast(
        'Access Restricted',
        'Employees can only submit consideration requests for themselves.',
        'error'
      );
      return;
    }
    if (
      currentRole === UserRole.MANAGER &&
      targetEmp.id !== currentEmployee.id &&
      targetEmp.managerId !== currentEmployee.id &&
      !isAssignedTeamMember(targetEmp, currentEmployee.id)
    ) {
      addToast(
        'Access Restricted',
        'Managers can only submit consideration requests for employees assigned to their team.',
        'error'
      );
      return;
    }

    const conId = `CON-${1000 + considerations.length + 1}`;
    const dailyBasicHalf = Math.round(targetEmp.salary.baseSalary / 44);
    const nowFormatted = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const isSubmittedByManagerForTeam =
      currentRole === UserRole.MANAGER && targetEmp.id !== currentEmployee.id;

    // A request submitted by an employee goes to Manager first (PENDING_MANAGER).
    // When a Manager submits on behalf of an assigned team member:
    // 1. Automatically complete the Manager approval stage.
    // 2. Forward it directly to HR for final review (PENDING_HR).
    // 3. Clearly identify origin as 'Submitted by Manager on behalf of Employee'.
    // 4. Record employee and Manager names, reason, timestamp and audit history.
    // 5. Does NOT bypass HR approval or deduct payroll before HR final decision.
    const autoEndorseByManager = isSubmittedByManagerForTeam;
    const initialStatus = autoEndorseByManager ? 'PENDING_HR' : 'PENDING_MANAGER';

    const initialHistory = [
      {
        stage: 'SUBMITTED' as const,
        actorId: currentEmployee.id,
        actorName: currentEmployee.fullName,
        actorRole: currentRole,
        action: 'SUBMITTED' as const,
        note: isSubmittedByManagerForTeam
          ? `Submitted by Manager on behalf of Employee (${targetEmp.fullName}): ${payload.reason}${payload.supportingNote ? ` | Supporting Note: ${payload.supportingNote}` : ''}`
          : `${payload.reason}${payload.supportingNote ? ` | Supporting Note: ${payload.supportingNote}` : ''}`,
        timestamp: nowFormatted,
      },
      ...(autoEndorseByManager
        ? [
            {
              stage: 'MANAGER_REVIEW' as const,
              actorId: currentEmployee.id,
              actorName: currentEmployee.fullName,
              actorRole: UserRole.MANAGER,
              action: 'APPROVED' as const,
              note:
                payload.supportingNote ||
                `Manager submission on behalf of ${targetEmp.fullName}. Stage 1 Manager Approval automatically completed. Forwarded directly to HR for final review.`,
              timestamp: nowFormatted,
            },
          ]
        : []),
    ];

    const resolvedType =
      payload.type === 'Other' && payload.customType?.trim()
        ? payload.customType.trim()
        : payload.type;

    const newCon: ConsiderationRequest = {
      id: conId,
      employeeId: targetEmp.id,
      employeeName: targetEmp.fullName,
      department: targetEmp.department,
      managerId: targetEmp.managerId,
      uid: targetEmp.uid,
      managerUid: targetEmp.managerUid,
      date: payload.date || TODAY_DATE,
      type: resolvedType,
      customType: payload.customType?.trim() || (payload.type === 'Other' ? resolvedType : undefined),
      category: payload.type === 'Other' ? 'Other' : (payload.category || payload.type),
      title: isSubmittedByManagerForTeam
        ? `[Submitted by Manager on behalf of Employee] ${resolvedType} — ${targetEmp.fullName}`
        : `${resolvedType} — ${targetEmp.fullName} (${payload.date || TODAY_DATE})`,
      description: payload.reason,
      reason: payload.reason,
      supportingNote:
        payload.supportingNote ||
        (isSubmittedByManagerForTeam
          ? `Submitted by Manager on behalf of Employee (${targetEmp.fullName}) by ${currentEmployee.fullName}`
          : 'Employee self-submission'),
      origin: isSubmittedByManagerForTeam ? 'MANAGER_ON_BEHALF' : 'EMPLOYEE_SUBMITTED',
      submittedById: currentEmployee.id,
      submittedByRole: currentRole,
      submittedByName: currentEmployee.fullName,
      submittedOnBehalfOfName: isSubmittedByManagerForTeam ? targetEmp.fullName : undefined,
      supportingDocument: payload.supportingDocument || 'Supporting_Attestation_Note.pdf',
      status: initialStatus,
      managerApprovedBy: autoEndorseByManager ? currentEmployee.fullName : undefined,
      managerApprovedAt: autoEndorseByManager ? nowFormatted : undefined,
      managerDecisionNote: autoEndorseByManager
        ? payload.supportingNote ||
          `Manager-submitted on behalf of ${targetEmp.fullName}. Stage 1 auto-completed. Forwarded to HR.`
        : undefined,
      decisionNote: autoEndorseByManager
        ? 'Manager-submitted on behalf of Employee. Stage 1 completed. Forwarded directly to HR for final review.'
        : `Awaiting Manager Review (${targetEmp.managerName})`,
      affectsAttendancePenalty: true,
      affectsSalaryDeduction: true,
      approvalHistory: initialHistory,
      deductionAmountSaved: dailyBasicHalf,
      createdAt: new Date().toISOString(),
    };

    setConsiderations((prev) => [newCon, ...prev]);
    setAttendance((prev) =>
      prev.map((a) =>
        a.employeeId === targetEmp.id && a.date === payload.date
          ? { ...a, considerationId: conId, considerationStatus: 'Pending' }
          : a
      )
    );

    setNotifications((prev) => [
      {
        id: `NOTIF-${Date.now()}-CON`,
        targetRoles: [UserRole.MANAGER, UserRole.HR, UserRole.ADMIN],
        targetEmployeeId:
          initialStatus === 'PENDING_MANAGER' ? targetEmp.managerId : undefined,
        title: isSubmittedByManagerForTeam
          ? `Manager Submitted Consideration (${conId}): ${targetEmp.fullName}`
          : `New Consideration Request (${conId}): ${targetEmp.fullName}`,
        message: isSubmittedByManagerForTeam
          ? `${currentEmployee.fullName} (Manager) submitted a ${payload.type} consideration on behalf of ${targetEmp.fullName}. Status: ${initialStatus}.`
          : `${targetEmp.fullName} submitted a ${payload.type} consideration for ${payload.date}. Routed to ${targetEmp.managerName} for Manager Review.`,
        category: 'Consideration',
        createdAt: 'Just now',
        isRead: false,
        linkModule: 'more',
        linkSubModule: 'considerations',
      },
      ...(isSubmittedByManagerForTeam
        ? [
            {
              id: `NOTIF-${Date.now()}-EMP-CON`,
              targetRoles: [UserRole.EMPLOYEE],
              targetEmployeeId: targetEmp.id,
              title: `Manager Submitted Consideration on Your Behalf (${conId})`,
              message: `${currentEmployee.fullName} submitted a ${payload.type} request for ${payload.date} on your behalf.`,
              category: 'Consideration' as const,
              createdAt: 'Just now',
              isRead: false,
              linkModule: 'more' as const,
              linkSubModule: 'considerations' as const,
            },
          ]
        : []),
      ...prev,
    ]);

    appendAuditLog(
      isSubmittedByManagerForTeam
        ? `Manager Submitted Consideration on Behalf (${conId}) — ${payload.type}`
        : `Submitted Consideration (${conId}) — ${payload.type}`,
      'Considerations',
      `${targetEmp.fullName} (${targetEmp.id})`,
      targetEmp.id,
      'Unwaived Attendance Exception',
      `Status: ${initialStatus}`
    );
    addToast(
      isSubmittedByManagerForTeam
        ? `Consideration Submitted for ${targetEmp.fullName}`
        : 'Consideration Request Submitted',
      initialStatus === 'PENDING_HR'
        ? `Request ${conId} endorsed by Manager and forwarded to HR for final review.`
        : `Request ${conId} routed to Manager Review before HR Final Review.`
    );
  };

  const decideConsideration = (
    considerationId: string,
    status: 'Approved' | 'Rejected',
    decisionNote: string,
    options?: {
      affectsAttendancePenalty?: boolean;
      affectsSalaryDeduction?: boolean;
    }
  ) => {
    const target = considerations.find((c) => c.id === considerationId);
    if (!target) return;

    if (status === 'Rejected' && !decisionNote.trim()) {
      addToast(
        'Rejection Reason Required',
        'Please provide a reason for rejecting this consideration request.',
        'error'
      );
      return;
    }

    const nowFormatted = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const isManagerActor = currentRole === UserRole.MANAGER;
    const isHRAdminActor = currentRole === UserRole.HR || currentRole === UserRole.ADMIN;

    if (!isManagerActor && !isHRAdminActor) {
      addToast(
        'Permission Denied',
        'Only assigned Managers or HR/Admin can review consideration requests.',
        'error'
      );
      return;
    }

    // Stage 1: Manager Review (Forwards to HR on approval, or rejects with reason)
    if (isManagerActor) {
      if (target.managerId !== currentEmployee.id) {
        addToast(
          'Access Restricted',
          'Managers can only review consideration requests for their assigned team members.',
          'error'
        );
        return;
      }
      if (
        target.status !== 'Pending' &&
        (target.status as string) !== 'Pending Manager' &&
        target.status !== 'PENDING_MANAGER'
      ) {
        addToast(
          'Already Reviewed by Manager',
          'This consideration has already been forwarded to HR or finalized.',
          'info'
        );
        return;
      }

      const nextStatus = status === 'Approved' ? 'PENDING_HR' : 'REJECTED';
      const mgrNote =
        decisionNote.trim() ||
        (status === 'Approved'
          ? `Approved by Manager (${currentEmployee.fullName}) and forwarded to HR for final review.`
          : 'Rejected by Manager.');

      setConsiderations((prev) =>
        prev.map((c) => {
          if (c.id !== considerationId) return c;
          const prevHist = c.approvalHistory || [
            {
              stage: 'SUBMITTED' as const,
              actorId: c.submittedById || c.employeeId,
              actorName: c.submittedByName,
              actorRole: c.submittedByRole,
              action: 'SUBMITTED' as const,
              note: c.reason,
              timestamp: (c.createdAt || new Date().toISOString()).slice(0, 16).replace('T', ' '),
            },
          ];
          return {
            ...c,
            status: nextStatus,
            managerApprovedBy: status === 'Approved' ? currentEmployee.fullName : c.managerApprovedBy,
            managerApprovedAt: status === 'Approved' ? nowFormatted : c.managerApprovedAt,
            managerDecisionNote: mgrNote,
            rejectedBy: status === 'Rejected' ? currentEmployee.fullName : undefined,
            rejectedByRole: status === 'Rejected' ? UserRole.MANAGER : undefined,
            rejectedAt: status === 'Rejected' ? nowFormatted : undefined,
            rejectionReason: status === 'Rejected' ? mgrNote : undefined,
            decisionNote: mgrNote,
            decidedBy: currentEmployee.fullName,
            decisionDate: TODAY_DATE,
            approvalHistory: [
              ...prevHist,
              {
                stage: 'MANAGER_REVIEW',
                actorId: currentEmployee.id,
                actorName: currentEmployee.fullName,
                actorRole: UserRole.MANAGER,
                action: status === 'Approved' ? 'APPROVED' : 'REJECTED',
                note: mgrNote,
                timestamp: nowFormatted,
              },
            ],
          };
        })
      );

      if (status === 'Rejected') {
        setAttendance((prev) =>
          prev.map((a) =>
            a.employeeId === target.employeeId && a.date === target.date
              ? { ...a, considerationStatus: 'Rejected' }
              : a
          )
        );
      }

      setNotifications((prev) => [
        {
          id: `NOTIF-${Date.now()}-EMP-CON`,
          targetRoles: [UserRole.EMPLOYEE, UserRole.MANAGER],
          targetEmployeeId: target.employeeId,
          title:
            status === 'Approved'
              ? `Manager Approved Consideration (${considerationId}) — Sent to HR`
              : `Consideration Rejected by Manager (${considerationId})`,
          message:
            status === 'Approved'
              ? `Manager ${currentEmployee.fullName} approved your consideration (${considerationId}) and forwarded it to HR for final review.`
              : `Manager ${currentEmployee.fullName} rejected your consideration (${considerationId}). Reason: ${mgrNote}`,
          category: 'Consideration',
          createdAt: 'Just now',
          isRead: false,
          linkModule: 'more',
          linkSubModule: 'considerations',
        },
        {
          id: `NOTIF-${Date.now()}-HR-CON`,
          targetRoles: [UserRole.HR, UserRole.ADMIN],
          title:
            status === 'Approved'
              ? `Consideration Awaiting HR Final Review (${considerationId})`
              : `Manager Rejected Consideration (${considerationId})`,
          message:
            status === 'Approved'
              ? `Manager ${currentEmployee.fullName} approved ${target.employeeName}'s ${target.type} consideration. Ready for HR Final Review.`
              : `Manager ${currentEmployee.fullName} rejected ${target.employeeName}'s consideration (${considerationId}).`,
          category: 'Consideration',
          createdAt: 'Just now',
          isRead: false,
          linkModule: 'more',
          linkSubModule: 'considerations',
        },
        ...prev,
      ]);

      appendAuditLog(
        status === 'Approved'
          ? `Manager Approved Consideration (${considerationId}) -> Forwarded to HR`
          : `Manager Rejected Consideration (${considerationId}) — Reason: ${mgrNote}`,
        'Considerations',
        `${target.employeeName} (${target.employeeId})`,
        target.employeeId,
        'Status: PENDING_MANAGER',
        `Status: ${nextStatus}`
      );

      addToast(
        status === 'Approved'
          ? 'Manager Approved — Forwarded to HR'
          : 'Consideration Rejected by Manager',
        status === 'Approved'
          ? `Forwarded ${considerationId} to HR for final review and payroll decision.`
          : `Rejected ${considerationId} with reason recorded in timeline.`
      );
      return;
    }

    // Stage 2: HR Final Review (HR decides approval AND whether it affects attendance penalties / salary deductions)
    const finalStatus = status === 'Approved' ? 'APPROVED' : 'REJECTED';
    const waiveAtt =
      status === 'Approved' ? (options?.affectsAttendancePenalty ?? true) : false;
    const waiveSal =
      status === 'Approved' ? (options?.affectsSalaryDeduction ?? true) : false;

    const hrNote =
      decisionNote.trim() ||
      (status === 'Approved'
        ? `Final HR approval granted.${
            waiveAtt ? ' Attendance penalty waived.' : ' Attendance penalty retained.'
          }${waiveSal ? ' Salary deduction waived.' : ' Salary deduction unchanged.'}`
        : 'Rejected by HR as per company attendance policy.');

    setConsiderations((prev) =>
      prev.map((c) => {
        if (c.id !== considerationId) return c;
        const prevHist = c.approvalHistory || [
          {
            stage: 'SUBMITTED' as const,
            actorId: c.submittedById || c.employeeId,
            actorName: c.submittedByName,
            actorRole: c.submittedByRole,
            action: 'SUBMITTED' as const,
            note: c.reason,
            timestamp: (c.createdAt || new Date().toISOString()).slice(0, 16).replace('T', ' '),
          },
        ];
        return {
          ...c,
          status: finalStatus,
          hrApprovedBy: status === 'Approved' ? currentEmployee.fullName : c.hrApprovedBy,
          hrApprovedAt: status === 'Approved' ? nowFormatted : c.hrApprovedAt,
          hrDecisionNote: hrNote,
          rejectedBy: status === 'Rejected' ? currentEmployee.fullName : c.rejectedBy,
          rejectedByRole: status === 'Rejected' ? currentRole : c.rejectedByRole,
          rejectedAt: status === 'Rejected' ? nowFormatted : c.rejectedAt,
          rejectionReason: status === 'Rejected' ? hrNote : c.rejectionReason,
          affectsAttendancePenalty: waiveAtt,
          affectsSalaryDeduction: waiveSal,
          decisionNote: hrNote,
          decidedBy: currentEmployee.fullName,
          decisionDate: TODAY_DATE,
          approvalHistory: [
            ...prevHist,
            {
              stage: 'HR_FINAL_REVIEW',
              actorId: currentEmployee.id,
              actorName: currentEmployee.fullName,
              actorRole: currentRole,
              action: status === 'Approved' ? 'APPROVED' : 'REJECTED',
              note: `${hrNote}${
                status === 'Approved'
                  ? ` [Attendance Penalty Waived: ${waiveAtt ? 'Yes' : 'No'} | Salary Deduction Waived: ${waiveSal ? 'Yes' : 'No'}]`
                  : ''
              }`,
              timestamp: nowFormatted,
            },
          ],
        };
      })
    );

    setAttendance((prev) =>
      prev.map((a) =>
        a.employeeId === target.employeeId && a.date === target.date
          ? {
              ...a,
              considerationStatus: status,
              status: status === 'Approved' && waiveAtt ? 'Present' : a.status,
              lateMinutes: status === 'Approved' && waiveAtt ? 0 : a.lateMinutes,
              notes:
                status === 'Approved' && waiveAtt
                  ? `${a.notes} · Waived via ${considerationId}`
                  : a.notes,
            }
          : a
      )
    );

    if (status === 'Approved' && waiveSal && (target.deductionAmountSaved ?? 0) > 0) {
      setPayrolls((prev) =>
        prev.map((p) => {
          if (p.employeeId !== target.employeeId) return p;
          const newWaiver = (p.considerationAdjustment ?? 0) + (target.deductionAmountSaved ?? 0);
          const newNet = (p.netSalary ?? 0) + (target.deductionAmountSaved ?? 0);
          return {
            ...p,
            considerationAdjustment: newWaiver,
            netSalary: newNet,
          };
        })
      );
    }

    setNotifications((prev) => [
      {
        id: `NOTIF-${Date.now()}-EMP-HRCON`,
        targetRoles: [UserRole.EMPLOYEE, UserRole.MANAGER],
        targetEmployeeId: target.employeeId,
        title: `HR Final Decision: Consideration ${status} (${considerationId})`,
        message:
          status === 'Approved'
            ? `HR (${currentEmployee.fullName}) approved your consideration ${considerationId}.${
                waiveSal ? ` Salary deduction of ₹${target.deductionAmountSaved} waived.` : ''
              }`
            : `HR (${currentEmployee.fullName}) rejected consideration ${considerationId}. Reason: ${hrNote}`,
        category: 'Consideration',
        createdAt: 'Just now',
        isRead: false,
        linkModule: 'more',
        linkSubModule: 'considerations',
      },
      {
        id: `NOTIF-${Date.now()}-MGR-HRCON`,
        targetRoles: [UserRole.MANAGER],
        targetEmployeeId: target.managerId,
        title: `HR Finalized Team Consideration (${target.employeeName})`,
        message: `HR (${currentEmployee.fullName}) ${status.toLowerCase()} consideration ${considerationId} for ${target.employeeName}. Note: ${hrNote}`,
        category: 'Consideration',
        createdAt: 'Just now',
        isRead: false,
        linkModule: 'more',
        linkSubModule: 'considerations',
      },
      ...prev,
    ]);

    appendAuditLog(
      `HR Final ${status} Consideration (${considerationId})`,
      'Considerations',
      `${target.employeeName} (${target.employeeId})`,
      target.employeeId,
      `Status: ${target.status}`,
      status === 'Approved'
        ? `Approved · Att Penalty Waived: ${waiveAtt ? 'Yes' : 'No'}, Salary Waiver: ${
            waiveSal ? `₹${(target.deductionAmountSaved ?? 0).toLocaleString('en-IN')}` : 'No'
          }`
        : `Status: REJECTED (${hrNote})`
    );
    addToast(
      `HR Final Review: Consideration ${status}`,
      status === 'Approved'
        ? `Finalized ${considerationId}.${
            waiveSal
              ? ` Waived ₹${(target.deductionAmountSaved ?? 0).toLocaleString('en-IN')} payroll deduction.`
              : ' Recorded without salary deduction override.'
          }`
        : `Consideration ${considerationId} rejected. Employee and Manager notified.`
    );
  };

  // Workflow 5: Policies & Acknowledgement
  const acknowledgePolicy = (policyId: string) => {
    const target = policies.find((p) => p.id === policyId);
    if (!target) return;
    const alreadyAcked = target.acknowledgements.some(
      (a) => a.employeeId === currentEmployee.id && a.version === target.version
    );
    if (alreadyAcked) return;

    setPolicies((prev) =>
      prev.map((p) =>
        p.id === policyId
          ? {
              ...p,
              acknowledgements: [
                ...p.acknowledgements,
                {
                  employeeId: currentEmployee.id,
                  employeeName: currentEmployee.fullName,
                  version: p.version,
                  acknowledgedAt: TODAY_DATE,
                },
              ],
            }
          : p
      )
    );

    appendAuditLog(
      `Acknowledged Policy ${target.title} (${target.version})`,
      'Policies',
      `${currentEmployee.fullName} (${currentEmployee.id})`,
      currentEmployee.id,
      'Unacknowledged',
      `Acknowledged ${target.version} on ${TODAY_DATE}`
    );
    addToast('Policy Acknowledged', `Recorded your acknowledgement for ${target.title} (${target.version}).`);
  };

  const createOrUpdatePolicy = (
    policyData: Omit<CompanyPolicy, 'id' | 'versions' | 'acknowledgements'>,
    existingId?: string
  ) => {
    if (currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
      addToast('Permission Denied', 'Only HR or Admin can create or modify company policies.', 'error');
      return;
    }
    if (existingId) {
      setPolicies((prev) =>
        prev.map((p) =>
          p.id === existingId
            ? {
                ...p,
                ...policyData,
                versions: [
                  {
                    version: policyData.version,
                    updatedAt: TODAY_DATE,
                    summary: policyData.summary,
                    updatedBy: currentEmployee.fullName,
                  },
                  ...p.versions,
                ],
              }
            : p
        )
      );
      appendAuditLog(
        `Updated Policy ${policyData.title} to ${policyData.version}`,
        'Policies',
        policyData.title,
        undefined,
        'Previous Version',
        `${policyData.version} (${policyData.status})`
      );
      addToast('Policy Updated', `${policyData.title} updated to ${policyData.version}.`);
    } else {
      const newPol: CompanyPolicy = {
        ...policyData,
        id: `POL-00${policies.length + 1}`,
        versions: [
          {
            version: policyData.version,
            updatedAt: TODAY_DATE,
            summary: 'Initial policy release',
            updatedBy: currentEmployee.fullName,
          },
        ],
        acknowledgements: [],
      };
      setPolicies((prev) => [newPol, ...prev]);
      appendAuditLog(
        `Created Policy ${newPol.title} (${newPol.version})`,
        'Policies',
        newPol.title,
        undefined,
        'Draft',
        newPol.status
      );
      addToast('Policy Created', `${newPol.title} has been added to company policies.`);
    }
  };

  const createAnnouncement = (ann: Omit<Announcement, 'id' | 'createdBy'>) => {
    if (currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
      addToast('Permission Denied', 'Only HR or Admin can publish company announcements.', 'error');
      return;
    }
    const newAnn: Announcement = {
      ...ann,
      id: `ANN-0${announcements.length + 1}`,
      createdBy: currentEmployee.fullName,
    };
    setAnnouncements((prev) => [newAnn, ...prev]);
    appendAuditLog(
      `Published Announcement: ${newAnn.title}`,
      'Policies',
      `Target: ${newAnn.targetAudience}`,
      undefined,
      'None',
      `Priority: ${newAnn.priority}`
    );
    addToast('Announcement Published', `Broadcasted to ${newAnn.targetAudience}.`);
  };

  // Workflow 6: Letter Generator (Strictly Admin / HR only)
  const generateAndSaveLetter = (payload: {
    employeeId: string;
    templateType: GeneratedLetter['templateType'];
    subject: string;
    content: string;
  }): GeneratedLetter => {
    if (currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
      addToast('Permission Denied', 'Only HR or Admin can generate official HR letters.', 'error');
      return letters[0];
    }
    const targetEmp =
      allEmployees.find((e) => e.id === payload.employeeId) || allEmployees[0] || DEFAULT_ADMIN_OPERATOR;
    const newLetter: GeneratedLetter = {
      id: `LTR-2026-0${letters.length + 1}`,
      employeeId: targetEmp.id,
      employeeName: targetEmp.fullName,
      department: targetEmp.department,
      designation: targetEmp.designation,
      templateType: payload.templateType,
      subject: payload.subject,
      content: payload.content,
      issuedDate: TODAY_DATE,
      issuedBy: currentEmployee.fullName,
    };
    setLetters((prev) => [newLetter, ...prev]);
    appendAuditLog(
      `Generated ${payload.templateType} (${newLetter.id})`,
      'Letters',
      `${targetEmp.fullName} (${targetEmp.id})`,
      targetEmp.id,
      'Template Draft',
      `Issued on ${TODAY_DATE}`
    );
    addToast(
      `${payload.templateType} Generated`,
      `Saved directly to ${targetEmp.fullName}'s profile under Letters.`
    );
    return newLetter;
  };

  // Workflow 7: Documents (Managers are strictly view-only; Employees can only upload for self; HR/Admin full access)
  const uploadEmployeeDocument = (payload: {
    employeeId: string;
    title: string;
    category: EmployeeDocument['category'];
    fileName: string;
    fileSize: string;
    expiryDate?: string;
  }) => {
    if (currentRole === UserRole.MANAGER) {
      addToast('Read-Only Access', 'Managers have view-only access to employee documents.', 'error');
      return;
    }
    if (currentRole === UserRole.EMPLOYEE && payload.employeeId && payload.employeeId !== currentEmployee.id) {
      addToast('Permission Denied', 'You can only upload documents to your own profile.', 'error');
      return;
    }
    const targetEmp =
      allEmployees.find((e) => e.id === payload.employeeId) || currentEmployee;
    const newDoc: EmployeeDocument = {
      id: `DOC-${100 + documents.length + 1}`,
      employeeId: targetEmp.id,
      employeeName: targetEmp.fullName,
      department: targetEmp.department,
      managerId: targetEmp.managerId,
      title: payload.title,
      category: payload.category,
      fileName: payload.fileName,
      fileSize: payload.fileSize,
      uploadedAt: TODAY_DATE,
      expiryDate: payload.expiryDate,
      status: currentRole === UserRole.ADMIN || currentRole === UserRole.HR ? 'Verified' : 'Pending Review',
      uploadedBy: currentEmployee.fullName,
    };
    setDocuments((prev) => [newDoc, ...prev]);
    appendAuditLog(
      `Uploaded Document: ${payload.title}`,
      'Documents',
      `${targetEmp.fullName} (${targetEmp.id})`,
      targetEmp.id,
      'None',
      payload.fileName
    );
    addToast('Document Uploaded', `${payload.title} added to ${targetEmp.fullName}'s dossier.`);
  };

  const deleteEmployeeDocument = (docId: string) => {
    if (currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
      addToast('Permission Denied', 'Only HR or Admin can delete employee documents.', 'error');
      return;
    }
    const target = documents.find((d) => d.id === docId);
    if (!target) return;
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
    appendAuditLog(
      `Removed Document: ${target.title}`,
      'Documents',
      `${target.employeeName} (${target.employeeId})`,
      target.employeeId,
      target.fileName,
      'Deleted'
    );
    addToast('Document Removed', `${target.title} has been deleted.`);
  };

  const addHoliday = (holiday: Omit<HolidayRecord, 'id'>) => {
    if (currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
      addToast('Permission Denied', 'Only HR or Admin can modify the holiday calendar.', 'error');
      return;
    }
    const created: HolidayRecord = {
      ...holiday,
      id: `HOL-0${holidays.length + 1}-${Date.now().toString().slice(-3)}`,
    };
    setHolidays((prev) => [...prev, created].sort((a, b) => a.date.localeCompare(b.date)));
    appendAuditLog(
      `Added Company Holiday: ${created.name} (${created.date})`,
      'Settings',
      created.name,
      undefined,
      'None',
      `${created.date} · ${created.type}`
    );
    addToast('Holiday Added', `${created.name} (${created.date}) added to company calendar.`);
  };

  const updateHoliday = (id: string, holiday: Omit<HolidayRecord, 'id'>) => {
    if (currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
      addToast('Permission Denied', 'Only HR or Admin can modify the holiday calendar.', 'error');
      return;
    }
    setHolidays((prev) =>
      prev
        .map((h) => (h.id === id ? { ...holiday, id } : h))
        .sort((a, b) => a.date.localeCompare(b.date))
    );
    appendAuditLog(
      `Updated Company Holiday: ${holiday.name}`,
      'Settings',
      holiday.name,
      undefined,
      'Previous Date/Type',
      `${holiday.date} · ${holiday.type}`
    );
    addToast('Holiday Updated', `${holiday.name} (${holiday.date}) has been updated.`);
  };

  const deleteHoliday = (id: string) => {
    if (currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
      addToast('Permission Denied', 'Only HR or Admin can modify the holiday calendar.', 'error');
      return;
    }
    const target = holidays.find((h) => h.id === id);
    if (!target) return;
    setHolidays((prev) => prev.filter((h) => h.id !== id));
    appendAuditLog(
      `Removed Company Holiday: ${target.name}`,
      'Settings',
      target.name,
      undefined,
      target.date,
      'Deleted'
    );
    addToast('Holiday Removed', `${target.name} removed from holiday calendar.`);
  };

  const addBirthdayCelebration = (
    payload: Omit<BirthdayCelebrationRecord, 'id' | 'updatedAt' | 'updatedBy'>
  ) => {
    if (currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
      addToast(
        'Permission Denied',
        'Only HR or Admin users can add birthday or celebration records.',
        'error'
      );
      return;
    }
    const created: BirthdayCelebrationRecord = {
      ...payload,
      id: `BDAY-${Date.now().toString().slice(-6)}`,
      updatedAt: TODAY_DATE,
      updatedBy: currentEmployee.fullName,
    };
    const nextList = [...birthdays, created].sort((a, b) =>
      a.date.slice(5).localeCompare(b.date.slice(5))
    );
    setBirthdays(nextList);
    localStorage.setItem('hrms_persisted_birthdays', JSON.stringify(nextList));

    if (firebaseUser && firebaseUser.emailVerified) {
      setDoc(doc(db, 'birthdays', created.id), {
        id: created.id,
        employeeId: created.employeeId,
        employeeName: created.employeeName.slice(0, 120),
        department: created.department.slice(0, 80),
        title: created.title.slice(0, 160),
        date: created.date.slice(0, 10),
        celebrationType: (created.celebrationType || 'Birthday').slice(0, 60),
        notes: (created.notes || '').slice(0, 500),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }).catch((err) => console.warn('Firestore birthday create warning:', err));
    }

    appendAuditLog(
      `Created Celebration Entry: ${created.title} (${created.date})`,
      'People',
      `${created.employeeName} (${created.employeeId})`,
      created.employeeId,
      'None',
      `${created.title} on ${created.date}`
    );
    addToast(
      'Celebration Added',
      `${created.title} (${created.date}) added to Team Birthdays & Celebrations.`
    );
  };

  const updateBirthdayCelebration = (
    id: string,
    updates: Partial<BirthdayCelebrationRecord>
  ) => {
    if (currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
      addToast(
        'Permission Denied',
        'Only HR or Admin users can edit birthday or celebration records.',
        'error'
      );
      return;
    }
    const existing = birthdays.find((b) => b.id === id);
    if (!existing) return;

    const updatedRecord: BirthdayCelebrationRecord = {
      ...existing,
      ...updates,
      id: existing.id,
      updatedAt: TODAY_DATE,
      updatedBy: currentEmployee.fullName,
    };

    const nextList = birthdays
      .map((b) => (b.id === id ? updatedRecord : b))
      .sort((a, b) => a.date.slice(5).localeCompare(b.date.slice(5)));
    setBirthdays(nextList);
    localStorage.setItem('hrms_persisted_birthdays', JSON.stringify(nextList));

    if (firebaseUser && firebaseUser.emailVerified) {
      setDoc(doc(db, 'birthdays', id), {
        id: updatedRecord.id,
        employeeId: updatedRecord.employeeId,
        employeeName: updatedRecord.employeeName.slice(0, 120),
        department: updatedRecord.department.slice(0, 80),
        title: updatedRecord.title.slice(0, 160),
        date: updatedRecord.date.slice(0, 10),
        celebrationType: (updatedRecord.celebrationType || 'Birthday').slice(0, 60),
        notes: (updatedRecord.notes || '').slice(0, 500),
        updatedAt: serverTimestamp(),
      }, { merge: true }).catch((err) => console.warn('Firestore birthday update warning:', err));
    }

    appendAuditLog(
      `Updated Celebration Entry: ${updatedRecord.title}`,
      'People',
      `${updatedRecord.employeeName} (${updatedRecord.employeeId})`,
      updatedRecord.employeeId,
      `${existing.title} · ${existing.date} · ${existing.notes || ''}`,
      `${updatedRecord.title} · ${updatedRecord.date} · ${updatedRecord.notes || ''}`
    );
    addToast(
      'Celebration Updated',
      `Updated "${updatedRecord.title}" (${updatedRecord.date}).`
    );
  };

  const deleteBirthdayCelebration = (id: string) => {
    if (currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
      addToast(
        'Permission Denied',
        'Only HR or Admin users can delete birthday or celebration records.',
        'error'
      );
      return;
    }
    const target = birthdays.find((b) => b.id === id);
    if (!target) return;

    // Delete ONLY the birthday celebration entry — never delete the employee record or employee DOB
    const nextList = birthdays.filter((b) => b.id !== id);
    setBirthdays(nextList);
    localStorage.setItem('hrms_persisted_birthdays', JSON.stringify(nextList));

    appendAuditLog(
      `Deleted Celebration Entry: ${target.title} (${target.date})`,
      'People',
      `${target.employeeName} (${target.employeeId})`,
      target.employeeId,
      `${target.title} (${target.date})`,
      'Deleted from Celebration Calendar (Employee Record & DOB Preserved)'
    );
    addToast(
      'Celebration Entry Removed',
      `"${target.title}" (${target.date}) removed. Employee profile and DOB remain intact.`
    );
  };

  const submitEmployeeReview = (payload: {
    targetEmployeeId: string;
    reviewType: ReviewType;
    starCount: number;
    category?: string;
    customCategory?: string;
    reason: string;
  }): { success: boolean; message: string } => {
    if (!payload.targetEmployeeId) {
      return { success: false, message: 'Please select an employee to review.' };
    }
    if (currentEmployee.id === payload.targetEmployeeId) {
      return { success: false, message: 'You cannot give stars to yourself. Please select another employee.' };
    }

    const stars = Math.round(Number(payload.starCount));
    if (!stars || stars < 1 || stars > 5) {
      return { success: false, message: 'Please select a star count between 1 and 5 stars.' };
    }

    const selectedCategory = (payload.category || '').trim();
    if (!selectedCategory) {
      return { success: false, message: 'Please select a review category.' };
    }

    const cleanCustomCategory = (payload.customCategory || '').trim();
    if (selectedCategory === 'Other' && cleanCustomCategory.length < 2) {
      return { success: false, message: 'Please enter a custom category description when "Other" is selected.' };
    }

    const cleanReason = payload.reason.trim();
    if (cleanReason.length < 10) {
      return {
        success: false,
        message: 'Please provide a meaningful description (at least 10 characters) explaining why you are giving these stars.',
      };
    }

    // Reject meaningless repeated characters (e.g., "aaaaaaaaaa")
    if (/^(.)\1{7,}$/.test(cleanReason.replace(/\s+/g, ''))) {
      return {
        success: false,
        message: 'Please enter a genuine, meaningful description rather than repeated characters.',
      };
    }

    // Prevent duplicate pending submission with identical text for the same target employee
    const hasDuplicatePending = reviews.some(
      (r) =>
        (r.reviewerId || r.reviewerEmployeeId) === currentEmployee.id &&
        r.targetEmployeeId === payload.targetEmployeeId &&
        r.status === 'PENDING' &&
        r.reason.trim().toLowerCase() === cleanReason.toLowerCase()
    );
    if (hasDuplicatePending) {
      return {
        success: false,
        message: 'A duplicate pending review for this employee with the same description already exists.',
      };
    }

    const targetEmp =
      allEmployees.find((e) => e.id === payload.targetEmployeeId) ||
      (payload.targetEmployeeId === DEFAULT_ADMIN_OPERATOR.id ? DEFAULT_ADMIN_OPERATOR : undefined);

    // Always use automatic server/system timestamp — never allow manual date overrides
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);

    const effectiveCategory =
      selectedCategory === 'Other' && cleanCustomCategory
        ? `Other: ${cleanCustomCategory}`
        : selectedCategory;

    const newReview: EmployeeReview = {
      id: `REV-${Date.now()}`,
      targetEmployeeId: payload.targetEmployeeId,
      targetEmployeeName: targetEmp?.fullName || payload.targetEmployeeId,
      targetEmployeeDepartment: targetEmp?.department || 'General',
      targetEmployeeDesignation: targetEmp?.designation || 'Employee',
      reviewerId: currentEmployee.id,
      reviewerEmployeeId: currentEmployee.id,
      reviewerName: currentEmployee.fullName,
      reviewerEmployeeName: currentEmployee.fullName,
      reviewerDepartment: currentEmployee.department,
      reviewerDesignation: currentEmployee.designation,
      reviewType: payload.reviewType,
      starCount: stars,
      category: effectiveCategory,
      customCategory: cleanCustomCategory || undefined,
      reason: cleanReason,
      status: 'PENDING',
      submittedAt: nowStr,
    };

    setReviews((prev) => [newReview, ...prev]);
    syncReviewToSupabase(newReview);

    appendAuditLog(
      `Review Submitted (${payload.reviewType === 'POSITIVE' ? `+${stars}` : `-${stars}`} Stars)`,
      'Employees',
      `${newReview.targetEmployeeName} (${payload.targetEmployeeId})`,
      payload.targetEmployeeId,
      'None',
      `Type: ${payload.reviewType} · Stars: ${stars} · Category: ${effectiveCategory} · Status: PENDING`
    );

    addToast(
      'Stars Submitted for Approval',
      `Your ${payload.reviewType === 'POSITIVE' ? `+${stars}` : `-${stars}`} star review for ${newReview.targetEmployeeName} has been sent to Owner/Admin for approval.`
    );

    return { success: true, message: 'Review submitted successfully.' };
  };

  const decideEmployeeReview = (
    reviewId: string,
    newStatus: ReviewStatus,
    decisionNote?: string
  ) => {
    if (currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
      addToast('Permission Denied', 'Only Admin or Owner users can approve or reject reviews.', 'error');
      return;
    }

    const targetReview = reviews.find((r) => r.id === reviewId);
    if (!targetReview) return;

    const previousStatus = targetReview.status;
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const updatedReview: EmployeeReview = {
      ...targetReview,
      status: newStatus,
      decidedAt: nowStr,
      decidedBy: currentEmployee.fullName,
      decisionNote: decisionNote !== undefined ? decisionNote : targetReview.decisionNote || '',
    };

    setReviews((prev) => prev.map((r) => (r.id === reviewId ? updatedReview : r)));
    syncReviewToSupabase(updatedReview);

    const stars = Math.min(5, Math.max(1, Number(targetReview.starCount) || 1));
    const actionText =
      newStatus === 'APPROVED'
        ? previousStatus === 'REJECTED'
          ? 'Review Approval Reversed to Approved'
          : 'Review Approved'
        : newStatus === 'REJECTED'
        ? previousStatus === 'APPROVED'
          ? 'Review Approval Reversed to Rejected'
          : 'Review Rejected'
        : 'Review Visibility Changed to Pending';

    appendAuditLog(
      actionText,
      'Employees',
      `Review ${reviewId} (${targetReview.reviewType === 'POSITIVE' ? `+${stars}` : `-${stars}`}★) for ${targetReview.targetEmployeeName || targetReview.targetEmployeeId}`,
      targetReview.targetEmployeeId,
      `Status: ${previousStatus}`,
      `Status: ${newStatus}${decisionNote ? ` · Note: ${decisionNote}` : ''}`
    );

    addToast(
      newStatus === 'APPROVED'
        ? 'Review Approved & Balance Updated'
        : newStatus === 'REJECTED'
        ? 'Review Rejected'
        : 'Review Returned to Pending',
      `Status updated to ${newStatus}. Employee star balance recalculated automatically.`
    );
  };

  const updateEmployeeReview = (
    reviewId: string,
    updates: Partial<Pick<EmployeeReview, 'reviewType' | 'starCount' | 'category' | 'customCategory' | 'reason' | 'status' | 'decisionNote'>>,
    reasonNote?: string
  ) => {
    if (currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
      addToast('Permission Denied', 'Only Admin or Owner users can modify review records.', 'error');
      return;
    }
    const existing = reviews.find((r) => r.id === reviewId);
    if (!existing) return;

    const updated: EmployeeReview = {
      ...existing,
      ...updates,
      starCount: updates.starCount
        ? Math.min(5, Math.max(1, Math.round(Number(updates.starCount))))
        : existing.starCount || 1,
      decidedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      decidedBy: currentEmployee.fullName,
    };

    setReviews((prev) => prev.map((r) => (r.id === reviewId ? updated : r)));
    syncReviewToSupabase(updated);

    appendAuditLog(
      'Review Record Modified by Authorized Administrator',
      'Employees',
      `Review ${reviewId} for ${existing.targetEmployeeName || existing.targetEmployeeId}`,
      existing.targetEmployeeId,
      `${existing.reviewType} (${existing.starCount || 1}★) · ${existing.status}`,
      `${updated.reviewType} (${updated.starCount}★) · ${updated.status}${reasonNote ? ` · Note: ${reasonNote}` : ''}`
    );

    addToast('Review Record Updated', `Review ${reviewId} has been updated and audited.`);
  };

  const deleteEmployeeReview = (reviewId: string, reasonNote?: string) => {
    if (currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
      addToast('Permission Denied', 'Only Admin or Owner users can delete review records.', 'error');
      return;
    }
    const existing = reviews.find((r) => r.id === reviewId);
    if (!existing) return;

    setReviews((prev) => prev.filter((r) => r.id !== reviewId));

    appendAuditLog(
      'Review Visibility Changed (Deleted by Administrator)',
      'Employees',
      `Review ${reviewId} for ${existing.targetEmployeeName || existing.targetEmployeeId}`,
      existing.targetEmployeeId,
      `${existing.reviewType} (${existing.starCount || 1}★, ${existing.status})`,
      `Removed${reasonNote ? ` · Reason: ${reasonNote}` : ''}`
    );

    addToast('Review Removed', `Review ${reviewId} has been removed and star balances updated.`, 'info');
  };

  const getEmployeeStarSummary = (employeeId: string): EmployeeStarSummary => {
    const approvedReviews = reviews.filter(
      (r) => r.targetEmployeeId === employeeId && r.status === 'APPROVED'
    );
    const posReviews = approvedReviews.filter((r) => r.reviewType === 'POSITIVE');
    const negReviews = approvedReviews.filter((r) => r.reviewType === 'NEGATIVE');

    const approvedPositive = posReviews.reduce(
      (sum, r) => sum + Math.min(5, Math.max(1, Number(r.starCount) || 1)),
      0
    );
    const approvedNegative = negReviews.reduce(
      (sum, r) => sum + Math.min(5, Math.max(1, Number(r.starCount) || 1)),
      0
    );
    const netScore = approvedPositive - approvedNegative;
    const currentTotalStars = approvedPositive + approvedNegative;

    return {
      employeeId,
      targetEmployeeId: employeeId,
      positiveStarsCount: approvedPositive,
      approvedPositive,
      negativeStarsCount: approvedNegative,
      approvedNegative,
      netScore,
      currentTotalStars,
      positiveReviewsCount: posReviews.length,
      negativeReviewsCount: negReviews.length,
      totalApprovedReviews: approvedReviews.length,
    };
  };

  const getPublicEmployeeReviews = (targetEmployeeId: string): PublicEmployeeReview[] => {
    const targetReviews = reviews.filter((r) => r.targetEmployeeId === targetEmployeeId);

    // Strictly return ONLY APPROVED reviews with all reviewer identity fields stripped
    return targetReviews
      .filter((r) => r.status === 'APPROVED')
      .map((r) => ({
        id: r.id,
        targetEmployeeId: r.targetEmployeeId,
        targetEmployeeName: r.targetEmployeeName,
        targetEmployeeDepartment: r.targetEmployeeDepartment,
        targetEmployeeDesignation: r.targetEmployeeDesignation,
        reviewType: r.reviewType,
        starCount: Math.min(5, Math.max(1, Number(r.starCount) || 1)),
        category: r.category || 'Other',
        customCategory: r.customCategory,
        reason: r.reason,
        submittedAt: r.submittedAt,
        status: r.status,
      }));
  };

  const addOrUpdateCustomRule = (
    ruleData: Omit<CustomCompanyRule, 'id' | 'updatedBy'>,
    existingId?: string
  ) => {
    if (currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
      addToast('Permission Denied', 'Only HR or Admin can modify company rules.', 'error');
      return;
    }
    if (existingId) {
      setSettings((prev) => ({
        ...prev,
        customRules: prev.customRules.map((r) =>
          r.id === existingId
            ? { ...ruleData, id: existingId, updatedBy: currentEmployee.fullName }
            : r
        ),
      }));
      appendAuditLog(
        `Updated Company Rule: ${ruleData.title}`,
        'Settings',
        ruleData.title,
        undefined,
        'Previous Rule',
        `${ruleData.category} · Effective ${ruleData.effectiveFrom}`
      );
      addToast('Company Rule Updated', `${ruleData.title} has been updated.`);
    } else {
      const newRule: CustomCompanyRule = {
        ...ruleData,
        id: `RULE-${Date.now().toString().slice(-4)}`,
        updatedBy: currentEmployee.fullName,
      };
      setSettings((prev) => ({
        ...prev,
        customRules: [newRule, ...prev.customRules],
      }));
      appendAuditLog(
        `Added New Company Rule: ${newRule.title}`,
        'Settings',
        newRule.title,
        undefined,
        'None',
        `${newRule.category} · Effective ${newRule.effectiveFrom}`
      );
      addToast('New Company Rule Added', `${newRule.title} is now live in Company & Rules.`);
    }
  };

  const deleteCustomRule = (ruleId: string) => {
    if (currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
      addToast('Permission Denied', 'Only HR or Admin can delete company rules.', 'error');
      return;
    }
    const target = settings.customRules.find((r) => r.id === ruleId);
    if (!target) return;
    setSettings((prev) => ({
      ...prev,
      customRules: prev.customRules.filter((r) => r.id !== ruleId),
    }));
    appendAuditLog(
      `Removed Company Rule: ${target.title}`,
      'Settings',
      target.title,
      undefined,
      target.category,
      'Deleted'
    );
    addToast('Company Rule Deleted', `${target.title} has been removed.`);
  };

  const addDepartment = (dept: Omit<Department, 'id'>) => {
    if (currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
      addToast('Permission Denied', 'Only HR or Admin can create departments.', 'error');
      return;
    }
    const created: Department = {
      ...dept,
      id: `DEPT-${dept.code.toUpperCase()}`,
    };
    setDepartments((prev) => [...prev, created]);
    syncDepartmentToSupabase(created);
    appendAuditLog(
      `Created Department: ${created.name}`,
      'People',
      `${created.name} (${created.code})`,
      undefined,
      'None',
      `Manager: ${created.managerName}`
    );
    addToast('Department Created', `${created.name} added to organization tree.`);
  };

  const updateDepartment = (deptId: string, updates: Partial<Department>) => {
    if (currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
      addToast('Permission Denied', 'Only HR or Admin can edit department configuration.', 'error');
      return;
    }
    const target = departments.find((d) => d.id === deptId);
    if (!target) return;
    const updatedDept = { ...target, ...updates };
    setDepartments((prev) =>
      prev.map((d) => (d.id === deptId ? updatedDept : d))
    );
    syncDepartmentToSupabase(updatedDept);
    appendAuditLog(
      `Updated Department Details: ${target.name}`,
      'Departments',
      target.name,
      undefined,
      target.description || 'Department Record',
      Object.keys(updates).join(', ')
    );
    addToast('Department Updated', `${target.name} configuration saved.`);
  };

  const deleteDepartmentSafely = (deptId: string): { success: boolean; message: string } => {
    if (currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
      addToast('Permission Denied', 'Only HR or Admin can remove departments.', 'error');
      return { success: false, message: 'Unauthorized: Admin or HR credentials required.' };
    }
    const target = departments.find((d) => d.id === deptId);
    if (!target) return { success: false, message: 'Department not found.' };

    const assignedCount = allEmployees.filter(
      (e) => e.department.toLowerCase() === target.name.toLowerCase()
    ).length;

    if (assignedCount > 0) {
      const msg = `Cannot delete department "${target.name}": ${assignedCount} employee(s) are currently assigned. Please reassign them to another department first.`;
      addToast('Deletion Blocked', msg, 'error');
      return { success: false, message: msg };
    }

    setDepartments((prev) => prev.filter((d) => d.id !== deptId));
    deleteDepartmentFromSupabase(deptId);
    appendAuditLog(
      `Archived/Deleted Department: ${target.name}`,
      'Departments',
      `${target.name} (${target.code})`,
      undefined,
      target.name,
      'Archived safely with 0 active dependencies'
    );
    addToast('Department Removed', `${target.name} has been removed from organization.`);
    return { success: true, message: `Department ${target.name} removed successfully.` };
  };

  const reassignDepartmentEmployees = (fromDeptName: string, toDeptName: string) => {
    if (currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
      addToast('Permission Denied', 'Only HR or Admin can reassign department personnel.', 'error');
      return;
    }
    const affected = allEmployees.filter((e) => e.department === fromDeptName);
    if (affected.length === 0) {
      addToast('No Employees Found', `No employees currently in ${fromDeptName}.`, 'info');
      return;
    }

    setAllEmployees((prev) =>
      prev.map((e) => (e.department === fromDeptName ? { ...e, department: toDeptName } : e))
    );
    setUserAccessList((prev) =>
      prev.map((u) => (u.department === fromDeptName ? { ...u, department: toDeptName } : u))
    );

    appendAuditLog(
      `Reassigned Department Personnel (${fromDeptName} → ${toDeptName})`,
      'Departments',
      `${affected.length} Employee(s) Migrated`,
      undefined,
      fromDeptName,
      toDeptName
    );
    addToast(
      'Personnel Reassigned',
      `${affected.length} team members moved from ${fromDeptName} to ${toDeptName}.`
    );
  };

  // --- DEPARTMENT MEMBER MANAGEMENT (ADD, REMOVE TO UNASSIGNED, TRANSFER) ---
  const addEmployeeToDepartment = (employeeId: string, departmentName: string, note = '') => {
    if (!hasPermission('departments.manage') && currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
      addToast('Permission Denied', 'You do not have permission to assign department members.', 'error');
      return;
    }
    const emp = allEmployees.find((e) => e.id === employeeId);
    if (!emp) return;
    const prevDept = emp.department || 'Unassigned';
    if (prevDept === departmentName) {
      addToast('Already in Department', `${emp.fullName} is already a member of ${departmentName}.`, 'info');
      return;
    }

    setAllEmployees((prev) =>
      prev.map((e) => (e.id === employeeId ? { ...e, department: departmentName } : e))
    );
    setUserAccessList((prev) =>
      prev.map((u) => (u.employeeId === employeeId ? { ...u, department: departmentName } : u))
    );
    setMobileAppUsers((prev) =>
      prev.map((m) => (m.employeeId === employeeId ? { ...m, department: departmentName } : m))
    );

    appendAuditLog(
      `Added Member to Department: ${emp.fullName} → ${departmentName}`,
      'Departments',
      `${emp.fullName} (${emp.id})`,
      emp.id,
      prevDept,
      departmentName,
      {
        fieldChanged: 'Employee Department',
        result: 'SUCCESS',
        reason: note || `Added to ${departmentName} by ${currentEmployee.fullName}`,
      }
    );
    addToast('Member Added to Department', `${emp.fullName} assigned to ${departmentName}.`);
  };

  const removeEmployeeFromDepartment = (employeeId: string, departmentName: string, reason = '') => {
    if (!hasPermission('departments.manage') && currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
      addToast('Permission Denied', 'You do not have permission to remove department members.', 'error');
      return;
    }
    const emp = allEmployees.find((e) => e.id === employeeId);
    if (!emp) return;
    const prevDept = emp.department || departmentName;
    const unassignedLabel = 'Unassigned';

    // Ensure "Unassigned" department bucket exists or employee record cleanly holds 'Unassigned' without deleting account
    setAllEmployees((prev) =>
      prev.map((e) => (e.id === employeeId ? { ...e, department: unassignedLabel } : e))
    );
    setUserAccessList((prev) =>
      prev.map((u) => (u.employeeId === employeeId ? { ...u, department: unassignedLabel } : u))
    );
    setMobileAppUsers((prev) =>
      prev.map((m) => (m.employeeId === employeeId ? { ...m, department: unassignedLabel } : m))
    );

    appendAuditLog(
      `Removed Member from Department: ${emp.fullName} (${prevDept} → Unassigned)`,
      'Departments',
      `${emp.fullName} (${emp.id})`,
      emp.id,
      prevDept,
      unassignedLabel,
      {
        fieldChanged: 'Employee Department',
        result: 'SUCCESS',
        reason: reason || `Removed from ${prevDept} without deleting employee account`,
      }
    );
    addToast(
      'Removed from Department',
      `${emp.fullName} removed from ${prevDept} and marked as Unassigned. Employee account preserved.`
    );
  };

  const transferEmployeeDepartment = (
    employeeId: string,
    toDepartmentName: string,
    reason = ''
  ) => {
    if (!hasPermission('departments.manage') && currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
      addToast('Permission Denied', 'You do not have permission to transfer department members.', 'error');
      return;
    }
    const emp = allEmployees.find((e) => e.id === employeeId);
    if (!emp) return;
    const fromDept = emp.department || 'Unassigned';
    if (fromDept === toDepartmentName) {
      addToast('Same Department', `${emp.fullName} is already in ${toDepartmentName}.`, 'info');
      return;
    }

    setAllEmployees((prev) =>
      prev.map((e) => (e.id === employeeId ? { ...e, department: toDepartmentName } : e))
    );
    setUserAccessList((prev) =>
      prev.map((u) => (u.employeeId === employeeId ? { ...u, department: toDepartmentName } : u))
    );
    setMobileAppUsers((prev) =>
      prev.map((m) => (m.employeeId === employeeId ? { ...m, department: toDepartmentName } : m))
    );

    appendAuditLog(
      `Transferred Employee Department: ${emp.fullName} (${fromDept} → ${toDepartmentName})`,
      'Departments',
      `${emp.fullName} (${emp.id})`,
      emp.id,
      fromDept,
      toDepartmentName,
      {
        fieldChanged: 'Department Transfer',
        result: 'SUCCESS',
        reason: reason || `Department transfer executed by ${currentEmployee.fullName}`,
      }
    );
    addToast(
      'Department Transfer Completed',
      `${emp.fullName} transferred from ${fromDept} to ${toDepartmentName}.`
    );
  };

  // --- LEAVE BALANCE ADJUSTMENT FOR HR & ADMIN ---
  const adjustEmployeeLeaveBalance = (
    employeeId: string,
    updates: {
      casualTotal?: number;
      casualUsed?: number;
      sickTotal?: number;
      sickUsed?: number;
      earnedTotal?: number;
      earnedUsed?: number;
    },
    reasonNote: string
  ) => {
    if (!hasPermission('leave.adjust_balance') && currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
      addToast('Permission Denied', 'You do not have permission to adjust employee leave balances.', 'error');
      return;
    }
    const emp = allEmployees.find((e) => e.id === employeeId);
    if (!emp) return;

    const prevBal = emp.leaveBalance || {
      casualTotal: settings.casualLeaveQuota ?? 12,
      casualUsed: 0,
      sickTotal: settings.sickLeaveQuota ?? 8,
      sickUsed: 0,
      earnedTotal: settings.earnedLeaveQuota ?? 15,
      earnedUsed: 0,
    };
    const nextBal = {
      casualTotal: updates.casualTotal !== undefined ? Math.max(0, Number(updates.casualTotal)) : prevBal.casualTotal,
      casualUsed: updates.casualUsed !== undefined ? Math.max(0, Number(updates.casualUsed)) : prevBal.casualUsed,
      sickTotal: updates.sickTotal !== undefined ? Math.max(0, Number(updates.sickTotal)) : prevBal.sickTotal,
      sickUsed: updates.sickUsed !== undefined ? Math.max(0, Number(updates.sickUsed)) : prevBal.sickUsed,
      earnedTotal: updates.earnedTotal !== undefined ? Math.max(0, Number(updates.earnedTotal)) : prevBal.earnedTotal,
      earnedUsed: updates.earnedUsed !== undefined ? Math.max(0, Number(updates.earnedUsed)) : prevBal.earnedUsed,
    };

    setAllEmployees((prev) =>
      prev.map((e) => (e.id === employeeId ? { ...e, leaveBalance: nextBal } : e))
    );

    appendAuditLog(
      `Adjusted Leave Balance: ${emp.fullName}`,
      'Leave',
      `${emp.fullName} (${emp.id})`,
      emp.id,
      `CL:${prevBal.casualTotal - prevBal.casualUsed}/${prevBal.casualTotal} · SL:${prevBal.sickTotal - prevBal.sickUsed}/${prevBal.sickTotal} · EL:${prevBal.earnedTotal - prevBal.earnedUsed}/${prevBal.earnedTotal}`,
      `CL:${nextBal.casualTotal - nextBal.casualUsed}/${nextBal.casualTotal} · SL:${nextBal.sickTotal - nextBal.sickUsed}/${nextBal.sickTotal} · EL:${nextBal.earnedTotal - nextBal.earnedUsed}/${nextBal.earnedTotal}`,
      {
        fieldChanged: 'Leave Balance Quota',
        result: 'SUCCESS',
        reason: reasonNote || `Leave balance adjusted by ${currentEmployee.fullName}`,
      }
    );
    addToast(
      'Leave Balance Updated',
      `Updated leave balances for ${emp.fullName}.`
    );
  };

  // --- MOBILE APP MANAGEMENT & ADMINISTRATION ---
  const sendMobileAppInvitation = (
    employeeId: string,
    channel: 'Email' | 'WhatsApp / Copy Link' | string = 'Email'
  ) => {
    if (!hasPermission('users.manage_mobile_app') && currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
      addToast('Permission Denied', 'You do not have permission to send mobile app invitations.', 'error');
      return;
    }
    const target = mobileAppUsers.find((m) => m.employeeId === employeeId);
    if (!target) return;

    const hasConfiguredStoreLinks =
      Boolean(mobileAppStoreConfig.androidPlayStoreUrl.trim()) ||
      Boolean(mobileAppStoreConfig.iosAppStoreUrl.trim()) ||
      Boolean(mobileAppStoreConfig.directDownloadLandingUrl.trim());

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    setMobileAppUsers((prev) =>
      prev.map((m) =>
        m.employeeId === employeeId
          ? {
              ...m,
              invitationSent: true,
              invitationSentAt: nowStr,
              invitationCount: (m.invitationCount || 0) + 1,
              invitationChannel: channel,
              accessStatus: m.accessStatus === 'NOT_INVITED' ? 'INVITED' : m.accessStatus,
            }
          : m
      )
    );

    appendAuditLog(
      `Sent Mobile App Download & Activation Link (${channel})`,
      'Mobile App Management',
      `${target.fullName} (${target.employeeId})`,
      target.employeeId,
      target.invitationSent ? `Previously Invited (${target.invitationSentAt})` : 'Not Invited',
      `Invitation Sent via ${channel} to ${target.email}`,
      {
        fieldChanged: 'Mobile App Onboarding',
        result: 'SUCCESS',
        reason: hasConfiguredStoreLinks
          ? `Sent configured store link (${mobileAppStoreConfig.androidPlayStoreUrl || mobileAppStoreConfig.iosAppStoreUrl || mobileAppStoreConfig.directDownloadLandingUrl})`
          : 'Sent onboarding activation invite (Store URLs pending configuration in Mobile App Settings)',
      }
    );

    addToast(
      'Mobile App Invite Dispatched',
      hasConfiguredStoreLinks
        ? `Download & registration link sent to ${target.fullName} (${target.email}) via ${channel}.`
        : `Onboarding invite recorded for ${target.fullName}. Configure official Android/iOS store URLs in Mobile App Settings to include live store links.`
    );
  };

  const sendBulkMobileInvitations = (employeeIds: string[]) => {
    if (!hasPermission('users.manage_mobile_app') && currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
      addToast('Permission Denied', 'You do not have permission to send bulk mobile app invitations.', 'error');
      return;
    }
    if (employeeIds.length === 0) return;
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);

    setMobileAppUsers((prev) =>
      prev.map((m) =>
        employeeIds.includes(m.employeeId)
          ? {
              ...m,
              invitationSent: true,
              invitationSentAt: nowStr,
              invitationCount: (m.invitationCount || 0) + 1,
              invitationChannel: 'Email',
              accessStatus: m.accessStatus === 'NOT_INVITED' ? 'INVITED' : m.accessStatus,
            }
          : m
      )
    );

    appendAuditLog(
      `Dispatched Bulk Mobile App Invitations (${employeeIds.length} Employees)`,
      'Mobile App Management',
      `${employeeIds.length} Employees`,
      undefined,
      'Bulk Selection',
      `Sent to: ${employeeIds.join(', ')}`,
      {
        fieldChanged: 'Bulk Mobile Onboarding',
        result: 'SUCCESS',
        reason: `Bulk invitation triggered by ${currentEmployee.fullName}`,
      }
    );

    addToast(
      'Bulk Mobile Invitations Sent',
      `Sent mobile app onboarding invitations to ${employeeIds.length} employee(s).`
    );
  };

  const sendMobilePasswordReset = (employeeId: string) => {
    if (!hasPermission('users.manage_mobile_app') && currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
      addToast('Permission Denied', 'You do not have permission to trigger password resets.', 'error');
      return;
    }
    const target = mobileAppUsers.find((m) => m.employeeId === employeeId);
    if (!target) return;
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);

    setMobileAppUsers((prev) =>
      prev.map((m) =>
        m.employeeId === employeeId
          ? {
              ...m,
              passwordResetCount: (m.passwordResetCount || 0) + 1,
              lastPasswordResetSentAt: nowStr,
              loginHistory: [
                {
                  id: `MLOG-RST-${Date.now()}`,
                  timestamp: nowStr,
                  deviceModel: m.deviceModel || 'System Dispatch',
                  osVersion: m.osPlatform,
                  appVersion: m.appVersion || 'v2.4.1',
                  ipAddress: '103.21.58.12',
                  action: 'PASSWORD_RESET',
                },
                ...(m.loginHistory || []),
              ],
            }
          : m
      )
    );

    appendAuditLog(
      `Sent Mobile App Password Reset Email: ${target.fullName}`,
      'Mobile App Management',
      `${target.fullName} (${target.employeeId})`,
      target.employeeId,
      `Reset Count: ${target.passwordResetCount || 0}`,
      `Password Reset Link Sent to ${target.email} at ${nowStr}`,
      {
        fieldChanged: 'Mobile Account Security',
        result: 'SUCCESS',
        reason: `Password reset initiated by ${currentEmployee.fullName}`,
      }
    );

    addToast(
      'Password Reset Dispatched',
      `Password reset link sent to ${target.fullName} (${target.email}).`
    );
  };

  const toggleMobileAccountSuspension = (
    employeeId: string,
    suspend: boolean,
    reason = ''
  ) => {
    if (!hasPermission('users.manage_mobile_app') && currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
      addToast('Permission Denied', 'You do not have permission to suspend or restore mobile accounts.', 'error');
      return;
    }
    if (employeeId === SUPER_ADMIN_EMP_ID && suspend) {
      addToast('Protected Super Admin', 'The Super Admin mobile account cannot be suspended.', 'error');
      return;
    }
    const target = mobileAppUsers.find((m) => m.employeeId === employeeId);
    if (!target) return;
    const prevStatus = target.accessStatus;
    const nextStatus: MobileAppAccessStatus = suspend
      ? 'SUSPENDED'
      : target.isRegistered
      ? 'ACTIVE'
      : target.invitationSent
      ? 'INVITED'
      : 'NOT_INVITED';

    setMobileAppUsers((prev) =>
      prev.map((m) =>
        m.employeeId === employeeId
          ? {
              ...m,
              accessStatus: nextStatus,
              activeSessionsCount: suspend ? 0 : m.activeSessionsCount,
            }
          : m
      )
    );

    appendAuditLog(
      `${suspend ? 'Suspended' : 'Restored'} Mobile App Access: ${target.fullName}`,
      'Mobile App Management',
      `${target.fullName} (${target.employeeId})`,
      target.employeeId,
      prevStatus,
      nextStatus,
      {
        fieldChanged: 'Mobile Access Status',
        result: 'SUCCESS',
        reason: reason || `Mobile access ${suspend ? 'suspended' : 'restored'} by ${currentEmployee.fullName}`,
      }
    );

    addToast(
      suspend ? 'Mobile Access Suspended' : 'Mobile Access Restored',
      `${target.fullName}'s mobile app access is now ${nextStatus}.`
    );
  };

  const revokeMobileSessions = (employeeId: string) => {
    if (!hasPermission('users.manage_mobile_app') && currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
      addToast('Permission Denied', 'You do not have permission to revoke mobile sessions.', 'error');
      return;
    }
    const target = mobileAppUsers.find((m) => m.employeeId === employeeId);
    if (!target) return;
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);

    setMobileAppUsers((prev) =>
      prev.map((m) =>
        m.employeeId === employeeId
          ? {
              ...m,
              activeSessionsCount: 0,
              loginHistory: [
                {
                  id: `MLOG-REV-${Date.now()}`,
                  timestamp: nowStr,
                  deviceModel: m.deviceModel || 'Active Mobile Device',
                  osVersion: m.osPlatform,
                  appVersion: m.appVersion || 'v2.4.1',
                  ipAddress: '103.21.58.12',
                  action: 'SESSION_REVOKED',
                },
                ...(m.loginHistory || []),
              ],
            }
          : m
      )
    );

    appendAuditLog(
      `Revoked Active Mobile App Sessions: ${target.fullName}`,
      'Mobile App Management',
      `${target.fullName} (${target.employeeId})`,
      target.employeeId,
      `${target.activeSessionsCount} Active Session(s)`,
      '0 Active Sessions (Force Logged Out)',
      {
        fieldChanged: 'Mobile Device Sessions',
        result: 'SUCCESS',
        reason: `Active mobile sessions revoked by ${currentEmployee.fullName}`,
      }
    );

    addToast('Mobile Sessions Revoked', `All active mobile sessions for ${target.fullName} have been terminated.`);
  };

  const updateMobileAttendancePermissions = (
    employeeId: string,
    updates: Partial<MobileAttendancePermissionConfig>,
    reason = ''
  ) => {
    if (!hasPermission('users.manage_mobile_app') && currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
      addToast('Permission Denied', 'You do not have permission to modify mobile attendance settings.', 'error');
      return;
    }
    const target = mobileAppUsers.find((m) => m.employeeId === employeeId);
    if (!target) return;
    const prevPerms = target.attendancePermissions;
    const nextPerms: MobileAttendancePermissionConfig = {
      ...prevPerms,
      ...updates,
    };

    setMobileAppUsers((prev) =>
      prev.map((m) =>
        m.employeeId === employeeId
          ? {
              ...m,
              attendancePermissions: nextPerms,
            }
          : m
      )
    );

    appendAuditLog(
      `Updated Mobile Attendance & GPS Permissions: ${target.fullName}`,
      'Mobile App Management',
      `${target.fullName} (${target.employeeId})`,
      target.employeeId,
      `In:${prevPerms.allowMobileCheckIn ? 'Yes' : 'No'} · Out:${prevPerms.allowMobileCheckOut ? 'Yes' : 'No'} · GPS:${prevPerms.requireGpsForPunch ? 'Req' : 'Opt'}`,
      `In:${nextPerms.allowMobileCheckIn ? 'Yes' : 'No'} · Out:${nextPerms.allowMobileCheckOut ? 'Yes' : 'No'} · GPS:${nextPerms.requireGpsForPunch ? 'Req' : 'Opt'}`,
      {
        fieldChanged: 'Mobile Attendance Policy',
        result: 'SUCCESS',
        reason: reason || `Updated by ${currentEmployee.fullName}`,
      }
    );

    addToast('Mobile Attendance Updated', `Saved mobile check-in/out settings for ${target.fullName}.`);
  };

  const updateBulkMobileAttendancePermissions = (
    filter: { department?: string; role?: UserRole },
    updates: Partial<MobileAttendancePermissionConfig>
  ) => {
    if (!hasPermission('users.manage_mobile_app') && currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
      addToast('Permission Denied', 'You do not have permission to modify bulk mobile attendance settings.', 'error');
      return;
    }
    const matching = mobileAppUsers.filter((m) => {
      if (filter.department && filter.department !== 'ALL' && m.department !== filter.department) return false;
      if (filter.role && m.role !== filter.role) return false;
      return true;
    });
    if (matching.length === 0) return;

    const matchingIds = new Set(matching.map((m) => m.employeeId));
    setMobileAppUsers((prev) =>
      prev.map((m) =>
        matchingIds.has(m.employeeId)
          ? {
              ...m,
              attendancePermissions: {
                ...m.attendancePermissions,
                ...updates,
              },
            }
          : m
      )
    );

    const scopeLabel = `${filter.department || 'All Departments'} / ${filter.role || 'All Roles'}`;
    appendAuditLog(
      `Updated Bulk Mobile Attendance Policy (${matching.length} Users)`,
      'Mobile App Management',
      scopeLabel,
      undefined,
      'Previous Policy',
      `Updated ${Object.keys(updates).join(', ')} for ${matching.length} employees`,
      {
        fieldChanged: 'Bulk Mobile Attendance Policy',
        result: 'SUCCESS',
        reason: `Applied to ${scopeLabel}`,
      }
    );

    addToast(
      'Bulk Policy Applied',
      `Updated mobile check-in/out permissions for ${matching.length} employee(s).`
    );
  };

  const updateMobileAppStoreConfig = (updates: Partial<MobileAppStoreConfig>) => {
    if (currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
      addToast('Permission Denied', 'Only Admin or HR can configure mobile app store links.', 'error');
      return;
    }
    const nowStr = new Date().toISOString().slice(0, 10);
    setMobileAppStoreConfig((prev) => ({
      ...prev,
      ...updates,
      updatedAt: nowStr,
      updatedBy: currentEmployee.fullName,
    }));

    appendAuditLog(
      'Updated Official Mobile App Store & Download Links',
      'Mobile App Management',
      'Mobile App Store Configuration',
      undefined,
      `Android: ${mobileAppStoreConfig.androidPlayStoreUrl || 'Unset'} | iOS: ${mobileAppStoreConfig.iosAppStoreUrl || 'Unset'}`,
      `Android: ${updates.androidPlayStoreUrl ?? mobileAppStoreConfig.androidPlayStoreUrl} | iOS: ${updates.iosAppStoreUrl ?? mobileAppStoreConfig.iosAppStoreUrl}`,
      {
        fieldChanged: 'Mobile Store URLs',
        result: 'SUCCESS',
        reason: `Configured by ${currentEmployee.fullName}`,
      }
    );

    addToast('Mobile Store Links Saved', 'Official Android & iOS download links updated.');
  };

  const confirmEmployeeProbation = (employeeId: string, note = '') => {
    if (currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
      addToast('Permission Denied', 'Only HR or Admin can confirm permanent employment.', 'error');
      return;
    }
    const emp = allEmployees.find((e) => e.id === employeeId);
    if (!emp) return;

    setAllEmployees((prev) =>
      prev.map((e) =>
        e.id === employeeId
          ? {
              ...e,
              employeeType: 'Permanent',
              status: 'Active',
            }
          : e
      )
    );

    appendAuditLog(
      `Confirmed Permanent Employment Status`,
      'People',
      `${emp.fullName} (${emp.id})`,
      emp.id,
      emp.employeeType || 'Probation',
      `Permanent (Confirmed by ${currentEmployee.fullName}${note ? `: ${note}` : ''})`
    );
    addToast(
      'Employment Confirmed',
      `${emp.fullName} successfully transitioned to Permanent status.`
    );
  };

  const updateUserAccess = (
    employeeId: string,
    updates: Partial<UserAccessRecord>,
    reasonNote = ''
  ) => {
    if (currentRole !== UserRole.ADMIN) {
      addToast('Permission Denied', 'Only Administrator can modify user roles and access control.', 'error');
      return;
    }

    const target = userAccessList.find((u) => u.employeeId === employeeId);
    if (!target) return;

    // Prevent self-lockout or accidental demotion of Super Admin (EMP-1000)
    if (
      (employeeId === SUPER_ADMIN_EMP_ID || employeeId === currentEmployee.id) &&
      ((updates.role && updates.role !== UserRole.ADMIN) ||
        (updates.accountStatus && updates.accountStatus !== 'Active'))
    ) {
      addToast(
        'Super Admin Protected',
        'Super Admin (Argos Watch) or your own active administrator account cannot be demoted or suspended.',
        'error'
      );
      return;
    }

    const previousRole = target.role;
    const newRole = updates.role || target.role;
    const previousLevel = target.accessLevel;
    const newLevel = updates.accessLevel || target.accessLevel;

    setUserAccessList((prev) =>
      prev.map((u) =>
        u.employeeId === employeeId
          ? {
              ...u,
              ...updates,
              updatedAt: `${TODAY_DATE} 12:00:00`,
              updatedBy: currentEmployee.fullName,
              adminNote: reasonNote || updates.adminNote || u.adminNote,
            }
          : u
      )
    );

    // Sync allEmployees role and status if changed
    if (updates.role || updates.accountStatus) {
      setAllEmployees((prev) =>
        prev.map((e) =>
          e.id === employeeId
            ? {
                ...e,
                role: (updates.role as UserRole) || e.role,
                status: updates.accountStatus === 'Active' ? 'Active' : ('Suspended' as any),
              }
            : e
        )
      );
    }

    appendAuditLog(
      `Updated User Access & Permissions: ${target.fullName}`,
      'Manage Access',
      `${target.fullName} (${target.employeeId})`,
      target.employeeId,
      `Role: ${previousRole} · Access: ${previousLevel}`,
      `Role: ${newRole} · Access: ${newLevel}${reasonNote ? ` (Reason: ${reasonNote})` : ''}`
    );

    addToast('Access Permissions Saved', `Permissions updated for ${target.fullName}.`);
  };

  const revokeUserAccess = (employeeId: string, reasonNote = '') => {
    if (currentRole !== UserRole.ADMIN) {
      addToast('Permission Denied', 'Only Administrator can suspend or revoke user access.', 'error');
      return;
    }
    if (employeeId === SUPER_ADMIN_EMP_ID || employeeId === currentEmployee.id) {
      addToast('Action Blocked', 'You cannot revoke the Super Admin account or your own administrator account.', 'error');
      return;
    }
    updateUserAccess(
      employeeId,
      {
        accountStatus: 'Suspended',
        accessLevel: 'Viewer',
      },
      reasonNote || 'Administrative suspension via Manage Access Center'
    );
  };

  // --- ADMIN ROLE & GRANULAR PERMISSION ENGINE ---
  const createCustomRole = (payload: {
    name: string;
    description: string;
    accessLevel: 'Viewer' | 'Controller';
    permissions: Record<string, boolean>;
    assignToEmployeeIds?: string[];
  }): CustomRoleDefinition | null => {
    if (currentRole !== UserRole.ADMIN) {
      appendAuditLog(
        `Unauthorized Attempt to Create Role: ${payload.name}`,
        'Role & Access',
        payload.name,
        undefined,
        'None',
        payload.name,
        { fieldChanged: 'Role Creation', result: 'FAILED', reason: 'Admin role required' }
      );
      addToast('Permission Denied', 'Only System Administrators can create roles.', 'error');
      return null;
    }
    const cleanName = payload.name.trim();
    if (!cleanName) {
      addToast('Validation Error', 'Role name is required.', 'error');
      return null;
    }
    if (rolesList.some((r) => r.name.toLowerCase() === cleanName.toLowerCase())) {
      addToast('Duplicate Role', `A role named "${cleanName}" already exists.`, 'error');
      return null;
    }

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const newRole: CustomRoleDefinition = {
      id: `ROLE-CUSTOM-${Date.now()}`,
      name: cleanName,
      description: payload.description.trim() || 'Custom organization role configured by Admin.',
      isSystemRole: false,
      baseRoleType: payload.accessLevel === 'Controller' ? UserRole.MANAGER : UserRole.EMPLOYEE,
      accessLevel: payload.accessLevel,
      permissions: payload.permissions,
      createdAt: nowStr,
      updatedAt: nowStr,
      createdBy: currentEmployee.fullName,
    };

    setRolesList((prev) => [...prev, newRole]);

    // Optionally assign to selected users (never overwrite Super Admin EMP-1000)
    if (payload.assignToEmployeeIds && payload.assignToEmployeeIds.length > 0) {
      const targetIds = payload.assignToEmployeeIds.filter((id) => id !== SUPER_ADMIN_EMP_ID);
      setUserAccessList((prev) =>
        prev.map((u) =>
          targetIds.includes(u.employeeId)
            ? {
                ...u,
                roleId: newRole.id,
                roleName: newRole.name,
                accessLevel: newRole.accessLevel,
                updatedAt: nowStr,
                updatedBy: currentEmployee.fullName,
              }
            : u
        )
      );
    }

    const grantedCount = Object.values(newRole.permissions).filter(Boolean).length;
    appendAuditLog(
      `Created Custom Role: ${newRole.name}`,
      'Role & Access',
      `${newRole.name} (${newRole.id})`,
      undefined,
      'None',
      `${newRole.name} · ${grantedCount} permissions granted · ${payload.assignToEmployeeIds?.length || 0} users assigned`,
      {
        fieldChanged: 'Role Catalog',
        result: 'SUCCESS',
        reason: newRole.description,
      }
    );

    addToast('Custom Role Created', `Role "${newRole.name}" is now active.`);
    return newRole;
  };

  const updateCustomRole = (
    roleId: string,
    updates: Partial<CustomRoleDefinition>,
    reasonNote = ''
  ) => {
    if (currentRole !== UserRole.ADMIN) {
      addToast('Permission Denied', 'Only System Administrators can edit roles.', 'error');
      return;
    }
    const target = rolesList.find((r) => r.id === roleId);
    if (!target) return;

    // Safeguard mandatory system ADMIN role from losing critical admin permissions
    let safePermissions = updates.permissions || target.permissions;
    if (target.id === 'ROLE-ADMIN') {
      safePermissions = {
        ...safePermissions,
        'dashboard.view_admin': true,
        'admin.manage_roles': true,
        'admin.assign_roles': true,
        'admin.manage_individual_permissions': true,
        'admin.view_activity_log': true,
      };
    }

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const updatedName = target.id === 'ROLE-ADMIN' ? target.name : updates.name?.trim() || target.name;

    setRolesList((prev) =>
      prev.map((r) =>
        r.id === roleId
          ? {
              ...r,
              ...updates,
              name: updatedName,
              permissions: safePermissions,
              updatedAt: nowStr,
            }
          : r
      )
    );

    // Sync roleName on users assigned to this role
    if (updatedName !== target.name || updates.accessLevel) {
      setUserAccessList((prev) =>
        prev.map((u) =>
          u.roleId === roleId
            ? {
                ...u,
                roleName: updatedName,
                accessLevel: updates.accessLevel || u.accessLevel,
                updatedAt: nowStr,
              }
            : u
        )
      );
    }

    const prevGranted = Object.values(target.permissions).filter(Boolean).length;
    const newGranted = Object.values(safePermissions).filter(Boolean).length;

    appendAuditLog(
      `Updated Role Configuration: ${updatedName}`,
      'Role & Access',
      `${updatedName} (${roleId})`,
      undefined,
      `${target.name} (${prevGranted} permissions, ${target.accessLevel})`,
      `${updatedName} (${newGranted} permissions, ${updates.accessLevel || target.accessLevel})`,
      {
        fieldChanged: 'Role Permissions & Metadata',
        result: 'SUCCESS',
        reason: reasonNote || 'Role updated by Admin',
      }
    );

    addToast('Role Updated', `Saved changes to "${updatedName}".`);
  };

  const deleteCustomRole = (
    roleId: string,
    reassignToRoleId?: string,
    reasonNote = ''
  ): { success: boolean; message: string } => {
    if (currentRole !== UserRole.ADMIN) {
      return { success: false, message: 'Only System Administrators can delete roles.' };
    }
    const target = rolesList.find((r) => r.id === roleId);
    if (!target) return { success: false, message: 'Role not found.' };

    if (target.isSystemRole || target.id === 'ROLE-ADMIN') {
      appendAuditLog(
        `Blocked Deletion of Protected System Role: ${target.name}`,
        'Role & Access',
        `${target.name} (${target.id})`,
        undefined,
        target.name,
        'Deletion Blocked',
        {
          fieldChanged: 'System Role Protection',
          result: 'FAILED',
          reason: 'Mandatory system roles cannot be deleted.',
        }
      );
      addToast('Protected System Role', `System role "${target.name}" cannot be deleted.`, 'error');
      return { success: false, message: `Protected system role "${target.name}" cannot be deleted.` };
    }

    const assignedUsers = userAccessList.filter((u) => u.roleId === roleId);
    if (assignedUsers.length > 0 && !reassignToRoleId) {
      return {
        success: false,
        message: `${assignedUsers.length} user(s) are assigned to "${target.name}". Please select a replacement role to reassign them before deleting.`,
      };
    }

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
    if (assignedUsers.length > 0 && reassignToRoleId) {
      const replacementRole =
        rolesList.find((r) => r.id === reassignToRoleId) ||
        rolesList.find((r) => r.id === 'ROLE-EMPLOYEE')!;
      const mappedBaseRole = replacementRole.baseRoleType || UserRole.EMPLOYEE;

      setUserAccessList((prev) =>
        prev.map((u) =>
          u.roleId === roleId
            ? {
                ...u,
                role: mappedBaseRole,
                roleId: replacementRole.id,
                roleName: replacementRole.name,
                accessLevel: replacementRole.accessLevel,
                updatedAt: nowStr,
                updatedBy: currentEmployee.fullName,
              }
            : u
        )
      );
      setAllEmployees((prev) =>
        prev.map((e) =>
          assignedUsers.some((u) => u.employeeId === e.id) ? { ...e, role: mappedBaseRole } : e
        )
      );
    }

    setRolesList((prev) => prev.filter((r) => r.id !== roleId));

    appendAuditLog(
      `Deleted Custom Role: ${target.name}`,
      'Role & Access',
      `${target.name} (${target.id})`,
      undefined,
      `${target.name} (${assignedUsers.length} assigned users)`,
      `Deleted${reassignToRoleId ? ` (Reassigned ${assignedUsers.length} user(s) to ${reassignToRoleId})` : ''}`,
      {
        fieldChanged: 'Role Catalog',
        result: 'SUCCESS',
        reason: reasonNote || 'Custom role deleted by Admin',
      }
    );

    addToast('Custom Role Deleted', `"${target.name}" was deleted and logged in Activity Log.`);
    return { success: true, message: `Role "${target.name}" deleted.` };
  };

  const assignRoleToUser = (employeeId: string, roleId: string, reasonNote = '') => {
    if (currentRole !== UserRole.ADMIN) {
      addToast('Permission Denied', 'Only System Administrators can assign roles.', 'error');
      return;
    }
    const targetUser = userAccessList.find((u) => u.employeeId === employeeId);
    const targetRole = rolesList.find((r) => r.id === roleId);
    if (!targetUser || !targetRole) return;

    // Protect Super Admin (EMP-1000 / Argos Watch)
    const activeAdmins = userAccessList.filter(
      (u) => (u.role === UserRole.ADMIN || u.roleId === 'ROLE-ADMIN') && u.accountStatus === 'Active'
    );
    if (
      (employeeId === SUPER_ADMIN_EMP_ID || (targetUser.role === UserRole.ADMIN && activeAdmins.length <= 1)) &&
      targetRole.id !== 'ROLE-ADMIN'
    ) {
      appendAuditLog(
        `Blocked Demotion of Protected Super Admin: ${targetUser.fullName}`,
        'Role & Access',
        `${targetUser.fullName} (${employeeId})`,
        employeeId,
        targetUser.roleName || targetUser.role,
        targetRole.name,
        {
          fieldChanged: 'Assigned Role',
          result: 'FAILED',
          reason: 'Cannot remove Admin role from the protected Super Admin (Argos Watch).',
        }
      );
      addToast(
        'Super Admin Protected',
        'Argos Watch is the protected Super Admin account and cannot be demoted from Admin.',
        'error'
      );
      return;
    }

    const mappedUserRole: UserRole =
      targetRole.id === 'ROLE-ADMIN'
        ? UserRole.ADMIN
        : targetRole.id === 'ROLE-HR'
        ? UserRole.HR
        : targetRole.id === 'ROLE-MANAGER'
        ? UserRole.MANAGER
        : targetRole.baseRoleType || UserRole.EMPLOYEE;

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const prevRoleLabel = targetUser.roleName || targetUser.role;

    const nextWorkspaces: WorkspaceMode[] =
      mappedUserRole === UserRole.ADMIN
        ? ['OWN', 'ADMIN']
        : mappedUserRole === UserRole.HR || targetRole.permissions['dashboard.view_hr']
        ? ['OWN', 'HR']
        : ['OWN'];

    setUserAccessList((prev) =>
      prev.map((u) =>
        u.employeeId === employeeId
          ? {
              ...u,
              role: mappedUserRole,
              roleId: targetRole.id,
              roleName: targetRole.name,
              accessLevel: targetRole.accessLevel,
              allowedWorkspaces: nextWorkspaces,
              modulePermissions: getDefaultPermissionsForRole(mappedUserRole, targetRole.accessLevel),
              updatedAt: nowStr,
              updatedBy: currentEmployee.fullName,
              adminNote: reasonNote || `Assigned role: ${targetRole.name}`,
            }
          : u
      )
    );

    // Update role on employee record and mobile app user record without duplicating account or erasing history
    setAllEmployees((prev) =>
      prev.map((e) => (e.id === employeeId ? { ...e, role: mappedUserRole } : e))
    );
    setMobileAppUsers((prev) =>
      prev.map((m) => (m.employeeId === employeeId ? { ...m, role: mappedUserRole } : m))
    );

    // Root-level immediate update if the target user is currently active
    if (employeeId === personaEmpId) {
      setCurrentRole(mappedUserRole);
      if (mappedUserRole === UserRole.ADMIN) {
        setActiveWorkspaceState('ADMIN');
        localStorage.setItem('hrms_active_workspace', 'ADMIN');
      } else if (mappedUserRole === UserRole.HR) {
        setActiveWorkspaceState('HR');
        localStorage.setItem('hrms_active_workspace', 'HR');
      } else {
        setActiveWorkspaceState('OWN');
        localStorage.setItem('hrms_active_workspace', 'OWN');
      }
    }

    appendAuditLog(
      `Assigned Role to User: ${targetUser.fullName}`,
      'Role & Access',
      `${targetUser.fullName} (${employeeId})`,
      employeeId,
      prevRoleLabel,
      `${targetRole.name} (${mappedUserRole})`,
      {
        fieldChanged: 'Assigned Role',
        result: 'SUCCESS',
        reason: reasonNote || `Role changed from ${prevRoleLabel} to ${targetRole.name}`,
      }
    );

    addToast(
      'Role Assigned',
      `${targetUser.fullName} is now assigned to "${targetRole.name}". Inherited permissions updated automatically.`
    );
  };

  const setUserPermissionOverride = (
    employeeId: string,
    permissionId: string,
    state: PermissionState,
    reasonNote = ''
  ) => {
    if (currentRole !== UserRole.ADMIN) {
      addToast('Permission Denied', 'Only System Administrators can modify individual permissions.', 'error');
      return;
    }
    const targetUser = userAccessList.find((u) => u.employeeId === employeeId);
    const permItem = permissionCatalog.find((p) => p.id === permissionId);
    if (!targetUser) return;

    // Safeguard Super Admin (EMP-1000) from denying critical system administration permissions
    if (
      employeeId === SUPER_ADMIN_EMP_ID &&
      state === 'DENIED' &&
      (permissionId.startsWith('admin.') || permissionId.startsWith('users.'))
    ) {
      addToast(
        'Protected Admin Permission',
        'System Administration permissions cannot be restricted on the Super Admin account (Argos Watch).',
        'error'
      );
      return;
    }

    const prevState: PermissionState = targetUser.permissionOverrides?.[permissionId] || 'INHERITED';
    if (prevState === state) return;

    const formatStateLabel = (s: PermissionState) =>
      s === 'ALLOWED'
        ? 'Individually Allowed'
        : s === 'DENIED'
        ? 'Individually Restricted'
        : 'Inherited from Role';

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
    setUserAccessList((prev) =>
      prev.map((u) => {
        if (u.employeeId !== employeeId) return u;
        const nextOverrides = { ...(u.permissionOverrides || {}) };
        if (state === 'INHERITED') {
          delete nextOverrides[permissionId];
        } else {
          nextOverrides[permissionId] = state;
        }
        return {
          ...u,
          permissionOverrides: nextOverrides,
          updatedAt: nowStr,
          updatedBy: currentEmployee.fullName,
        };
      })
    );

    appendAuditLog(
      `Modified Individual Permission: ${permItem?.name || permissionId}`,
      'Role & Access',
      `${targetUser.fullName} (${employeeId})`,
      employeeId,
      `${permItem?.name || permissionId}: ${formatStateLabel(prevState)}`,
      `${permItem?.name || permissionId}: ${formatStateLabel(state)}`,
      {
        fieldChanged: `Permission [${permItem?.category || 'Access'}: ${permItem?.name || permissionId}]`,
        result: 'SUCCESS',
        reason:
          reasonNote ||
          `Set to "${formatStateLabel(state)}" for ${targetUser.fullName} (${targetUser.roleName || targetUser.role})`,
      }
    );

    addToast(
      'Individual Permission Updated',
      `${permItem?.name || permissionId} set to "${formatStateLabel(state)}" for ${targetUser.fullName}.`
    );
  };

  const setBatchUserPermissionOverrides = (
    employeeId: string,
    overrides: Record<string, PermissionState>,
    reasonNote = ''
  ) => {
    if (currentRole !== UserRole.ADMIN) {
      addToast('Permission Denied', 'Only System Administrators can modify individual permissions.', 'error');
      return;
    }
    const targetUser = userAccessList.find((u) => u.employeeId === employeeId);
    if (!targetUser) return;

    const cleaned: Record<string, PermissionState> = {};
    Object.entries(overrides).forEach(([k, v]) => {
      if (
        employeeId === SUPER_ADMIN_EMP_ID &&
        v === 'DENIED' &&
        (k.startsWith('admin.') || k.startsWith('users.'))
      ) {
        return;
      }
      if (v === 'ALLOWED' || v === 'DENIED') {
        cleaned[k] = v;
      }
    });

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const prevCount = Object.keys(targetUser.permissionOverrides || {}).length;
    const newCount = Object.keys(cleaned).length;

    setUserAccessList((prev) =>
      prev.map((u) =>
        u.employeeId === employeeId
          ? {
              ...u,
              permissionOverrides: cleaned,
              updatedAt: nowStr,
              updatedBy: currentEmployee.fullName,
            }
          : u
      )
    );

    appendAuditLog(
      `Updated Individual Permission Control: ${targetUser.fullName}`,
      'Role & Access',
      `${targetUser.fullName} (${employeeId})`,
      employeeId,
      `${prevCount} individual override(s)`,
      `${newCount} individual override(s)`,
      {
        fieldChanged: 'Individual Permission Control',
        result: 'SUCCESS',
        reason: reasonNote || 'Batch permission update by Admin',
      }
    );

    addToast('Permissions Saved', `Updated individual permission settings for ${targetUser.fullName}.`);
  };

  const addCustomPermissionItem = (item: Omit<GranularPermissionItem, 'isCustom'>) => {
    if (currentRole !== UserRole.ADMIN) {
      addToast('Permission Denied', 'Only System Administrators can add permission definitions.', 'error');
      return;
    }
    const cleanId = item.id.trim().toLowerCase().replace(/\s+/g, '_');
    if (permissionCatalog.some((p) => p.id === cleanId)) {
      addToast('Duplicate Permission ID', `Permission "${cleanId}" already exists.`, 'error');
      return;
    }
    const created: GranularPermissionItem = {
      ...item,
      id: cleanId,
      isCustom: true,
    };
    setPermissionCatalog((prev) => [...prev, created]);

    // Default to true on ROLE-ADMIN
    setRolesList((prev) =>
      prev.map((r) =>
        r.id === 'ROLE-ADMIN'
          ? { ...r, permissions: { ...r.permissions, [cleanId]: true } }
          : r
      )
    );

    appendAuditLog(
      `Created Custom Permission Definition: ${created.name}`,
      'Role & Access',
      `${created.name} (${created.id})`,
      undefined,
      'None',
      `Category: ${created.category} · Module: ${created.controlsModule}`,
      {
        fieldChanged: 'Permission Catalog',
        result: 'SUCCESS',
        reason: created.whatItDoes,
      }
    );
    addToast('Permission Added', `"${created.name}" added to ${created.category}.`);
  };

  const createLetterTemplate = (
    template: Omit<MasterLetterTemplate, 'id' | 'version' | 'updatedAt'>
  ) => {
    if (currentRole !== UserRole.ADMIN) {
      addToast('Permission Denied', 'Only Administrator can configure official letter templates.', 'error');
      return;
    }
    const created: MasterLetterTemplate = {
      ...template,
      id: `TMPL-0${masterLetterTemplates.length + 1}`,
      version: 1,
      updatedAt: TODAY_DATE,
    };
    setMasterLetterTemplates((prev) => [created, ...prev]);
    appendAuditLog(
      `Created Letter Template: ${created.title}`,
      'Settings',
      created.title,
      undefined,
      'None',
      `Type: ${created.type} · Version: v1`
    );
    addToast('Template Created', `${created.title} added to master templates.`);
  };

  const updateLetterTemplate = (id: string, updates: Partial<MasterLetterTemplate>) => {
    if (currentRole !== UserRole.ADMIN) {
      addToast('Permission Denied', 'Only Administrator can modify letter templates.', 'error');
      return;
    }
    const target = masterLetterTemplates.find((t) => t.id === id);
    if (!target) return;

    setMasterLetterTemplates((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              ...updates,
              version: t.version + 1,
              updatedAt: TODAY_DATE,
            }
          : t
      )
    );
    appendAuditLog(
      `Updated Letter Template: ${target.title}`,
      'Settings',
      target.title,
      undefined,
      `v${target.version}`,
      `v${target.version + 1}`
    );
    addToast('Template Updated', `${target.title} updated to v${target.version + 1}.`);
  };

  const deleteLetterTemplate = (id: string) => {
    if (currentRole !== UserRole.ADMIN) {
      addToast('Permission Denied', 'Only Administrator can archive letter templates.', 'error');
      return;
    }
    const target = masterLetterTemplates.find((t) => t.id === id);
    if (!target) return;

    setMasterLetterTemplates((prev) => prev.filter((t) => t.id !== id));
    appendAuditLog(
      `Archived Letter Template: ${target.title}`,
      'Settings',
      target.title,
      undefined,
      target.title,
      'Archived'
    );
    addToast('Template Archived', `${target.title} removed from active templates.`);
  };

  const recordLetterHistory = (
    record: Omit<LetterHistoryRecord, 'id' | 'generatedAt' | 'exportCount'>
  ) => {
    const created: LetterHistoryRecord = {
      ...record,
      id: `LH-2026-00${letterHistory.length + 1}`,
      generatedAt: `${TODAY_DATE} ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
      exportCount: 1,
      lastExportedAt: TODAY_DATE,
    };
    setLetterHistory((prev) => [created, ...prev]);
  };

  const incrementLetterExportCount = (id: string) => {
    setLetterHistory((prev) =>
      prev.map((l) =>
        l.id === id
          ? {
              ...l,
              exportCount: l.exportCount + 1,
              lastExportedAt: `${TODAY_DATE} ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
            }
          : l
      )
    );
  };

  const addInternship = (intern: Omit<InternshipRecord, 'id'>) => {
    if (currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
      addToast('Permission Denied', 'Only HR or Admin can manage internship records.', 'error');
      return;
    }
    const created: InternshipRecord = {
      ...intern,
      id: `INT-2026-0${internships.length + 1}`,
    };
    setInternships((prev) => [created, ...prev]);
    appendAuditLog(
      `Added Intern Record: ${created.fullName}`,
      'People',
      `${created.fullName} (${created.internCode})`,
      undefined,
      'None',
      `${created.department} · Stipend ₹${created.stipend.toLocaleString('en-IN')}`
    );
    addToast('Internship Record Created', `${created.fullName} added to ${created.department}.`);
  };

  const processMonthlyPayroll = (payrollId: string) => {
    if (currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
      addToast('Permission Denied', 'Only HR or Admin can approve or disburse payroll.', 'error');
      return;
    }
    const target = payrolls.find((p) => p.id === payrollId);
    if (!target) return;
    setPayrolls((prev) =>
      prev.map((p) =>
        p.id === payrollId ? { ...p, status: 'Paid', paidDate: TODAY_DATE } : p
      )
    );
    appendAuditLog(
      `Disbursed Salary & Generated Payslip (${payrollId})`,
      'Payroll',
      `${target.employeeName} (${target.employeeId})`,
      target.employeeId,
      `Status: ${target.status}`,
      `Status: Paid (₹${(target.netSalary ?? target.netPayable ?? 0).toLocaleString('en-IN')})`
    );
    addToast('Salary Marked Paid', `Payslip finalized for ${target.employeeName}.`);
  };

  const updateCompanySettings = (newSettings: Partial<CompanySettings>) => {
    if (currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
      addToast('Permission Denied', 'Only HR or Admin can modify HR and company settings.', 'error');
      return;
    }
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      return updated;
    });
    appendAuditLog(
      'Updated Company Timings, Policies & HRMS Settings',
      'Settings',
      'Global Company Settings',
      undefined,
      'Previous Configuration',
      Object.keys(newSettings).join(', ')
    );
    addToast('Company Settings Updated', 'Working hours, policies, and rules updated immediately.');
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  // Purge all existing employee, department, attendance, leave, payroll, and review data locally + in Supabase
  const purgeAllHRMSData = async () => {
    setAllEmployees([]);
    setDepartments([]);
    setAttendance([]);
    setLeaves([]);
    setConsiderations([]);
    setPayrolls([]);
    setDocuments([]);
    setLetters([]);
    setLetterHistory([]);
    setInternships([]);
    setBirthdays([]);
    setReviews([]);
    setUserAccessList([]);
    setMobileAppUsers([]);

    const keysToPurge = [
      'hrms_persisted_employees',
      'hrms_persisted_departments',
      'hrms_persisted_user_access',
      'hrms_persisted_attendance',
      'hrms_persisted_leaves',
      'hrms_persisted_considerations',
      'hrms_persisted_payrolls',
      'hrms_persisted_documents',
      'hrms_persisted_letters',
      'hrms_persisted_letter_history',
      'hrms_persisted_internships',
      'hrms_persisted_birthdays',
      'hrms_persisted_reviews',
      'hrms_persisted_mobile_users',
    ];
    keysToPurge.forEach((k) => localStorage.removeItem(k));
    await purgeAllSupabaseHRMSData();
    addToast(
      'All HRMS Data Purged',
      'All employee, department, attendance, and leave records were cleared locally and in Supabase.',
      'info'
    );
  };

  // Import from bundled Zoho Backup ZIP (/assets/aistudio/data001_56b60b17.zip) or uploaded ZIP/CSV files and sync to Supabase
  const importZohoDataArchive = async (options?: {
    password?: string;
    customFiles?: FileList | File[];
  }): Promise<{
    success: boolean;
    message: string;
    summary?: ZohoImportSummary;
  }> => {
    try {
      const filesMap: Record<string, string> = {};
      const customFilesArr = options?.customFiles ? Array.from(options.customFiles) : [];

      if (customFilesArr.length > 0) {
        for (const file of customFilesArr) {
          if (file.name.toLowerCase().endsWith('.zip')) {
            const buf = await file.arrayBuffer();
            const extracted = await extractCsvFilesFromZipBuffer(buf, options?.password?.trim());
            Object.entries(extracted).forEach(([k, v]) => {
              filesMap[k] = v;
            });
          } else if (file.name.toLowerCase().endsWith('.csv')) {
            const text = await file.text();
            if (text.trim().length > 0) {
              filesMap[file.name] = text;
            }
          }
        }
      } else {
        // Fetch the user-provided ZIP file bundled at /assets/aistudio/data001_56b60b17.zip
        const res = await fetch('/assets/aistudio/data001_56b60b17.zip');
        if (!res.ok) {
          return {
            success: false,
            message: `Could not fetch bundled archive (/assets/aistudio/data001_56b60b17.zip): HTTP ${res.status}`,
          };
        }
        const zipBuf = await res.arrayBuffer();
        const extracted = await extractCsvFilesFromZipBuffer(zipBuf, options?.password?.trim());
        Object.entries(extracted).forEach(([k, v]) => {
          filesMap[k] = v;
        });
      }

      if (Object.keys(filesMap).length === 0) {
        return {
          success: false,
          message:
            'No readable CSV tables were extracted. Please verify the Zoho backup password or select extracted CSV files.',
        };
      }

      const imported = transformCsvMapToHRMSData(filesMap);

      // Replace existing state cleanly
      setDepartments(imported.departments);
      setAllEmployees(imported.employees);
      setLeaves(imported.leaves);
      setAttendance(imported.attendance);

      // Build corresponding user access records for all imported employees
      const importedAccess: UserAccessRecord[] = imported.employees.map((emp) => {
        const roleId =
          emp.role === UserRole.ADMIN
            ? 'ROLE-ADMIN'
            : emp.role === UserRole.HR
            ? 'ROLE-HR'
            : emp.role === UserRole.MANAGER
            ? 'ROLE-MANAGER'
            : 'ROLE-EMPLOYEE';
        return {
          employeeId: emp.id,
          fullName: emp.fullName,
          email: emp.email,
          role: emp.role,
          roleId,
          roleName:
            emp.role === UserRole.ADMIN
              ? 'Admin'
              : emp.role === UserRole.HR
              ? 'HR'
              : emp.role === UserRole.MANAGER
              ? 'Manager'
              : 'Employee',
          accessLevel:
            emp.role === UserRole.ADMIN || emp.role === UserRole.HR ? 'Controller' : 'Viewer',
          accountStatus: emp.status === 'Exited' || emp.status === 'Inactive' ? 'Suspended' : 'Active',
          department: emp.department,
          designation: emp.designation,
          managerId: emp.managerId,
          managerName: emp.managerName,
          lastLogin: 'Imported from Zoho Backup',
          invitationStatus: 'Accepted',
          modulePermissions: getDefaultPermissionsForRole(
            emp.role,
            emp.role === UserRole.ADMIN || emp.role === UserRole.HR ? 'Controller' : 'Viewer'
          ),
          permissionOverrides: {},
          allowedWorkspaces:
            emp.role === UserRole.ADMIN
              ? ['OWN', 'ADMIN', 'HR']
              : emp.role === UserRole.HR
              ? ['OWN', 'HR']
              : ['OWN'],
          updatedAt: TODAY_DATE,
          updatedBy: 'Zoho Backup Importer',
        };
      });
      setUserAccessList(importedAccess);

      // Persist to Supabase so both local and deployed apps show the exact same imported data
      await purgeAllSupabaseHRMSData();
      await syncAllDepartmentsToSupabase(imported.departments);
      await syncAllEmployeesToSupabase(imported.employees);
      await syncAllLeavesToSupabase(imported.leaves);
      await syncAllAttendanceToSupabase(imported.attendance);

      localStorage.setItem('hrms_zoho_archive_imported_v1', 'true');

      appendAuditLog(
        `Imported Zoho Backup Data & Synced to Supabase`,
        'Settings',
        `Departments: ${imported.departments.length} · Employees: ${imported.employees.length} · Leaves: ${imported.leaves.length} · Attendance: ${imported.attendance.length}`,
        undefined,
        'Empty Clean State',
        `Synced ${imported.employees.length} Employees & ${imported.departments.length} Departments to Supabase`
      );

      addToast(
        'Backup Data Imported & Synced to Supabase',
        `Imported ${imported.employees.length} employees, ${imported.departments.length} departments, ${imported.leaves.length} leave records, and ${imported.attendance.length} attendance logs.`,
        'success'
      );

      return {
        success: true,
        message: `Successfully imported ${imported.employees.length} employees, ${imported.departments.length} departments, ${imported.leaves.length} leaves, and ${imported.attendance.length} attendance records and synced to Supabase.`,
        summary: imported,
      };
    } catch (err: any) {
      if (err?.message === 'PASSWORD_REQUIRED') {
        return {
          success: false,
          message:
            'The provided data001.zip is encrypted with a Zoho People backup password. Please enter the ZIP password below to unlock and sync all 24 CSV tables to Supabase.',
        };
      }
      if (err?.message === 'INVALID_PASSWORD') {
        return {
          success: false,
          message:
            'Incorrect Zoho backup password for data001.zip. Please check the password from your Zoho People backup email and try again.',
        };
      }
      return {
        success: false,
        message: err?.message || 'Failed to import Zoho backup archive.',
      };
    }
  };

  // Normalized reactive view adapters for modules
  const currentUser = useMemo(
    () => ({
      id: currentEmployee.id,
      employeeId: currentEmployee.id,
      employeeCode: currentEmployee.id,
      fullName: currentEmployee.fullName,
      email: currentEmployee.email,
      role: effectiveRole as any,
      underlyingRole: currentRole as any,
      activeWorkspace,
      department: currentEmployee.department,
      designation: currentEmployee.designation,
    }),
    [currentEmployee, effectiveRole, currentRole, activeWorkspace]
  );

  const permissions = useMemo(() => {
    const isHRAdmin = effectiveRole === UserRole.HR || effectiveRole === UserRole.ADMIN;
    const isManager = effectiveRole === UserRole.MANAGER;
    return {
      People: {
        scope: isHRAdmin ? 'ALL' : isManager ? 'TEAM' : 'SELF',
        actions: isHRAdmin ? ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE'] : ['VIEW'],
      },
      Attendance: {
        scope: isHRAdmin ? 'ALL' : isManager ? 'TEAM' : 'SELF',
        actions: isHRAdmin ? ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE'] : ['VIEW'],
      },
      Leave: {
        scope: isHRAdmin ? 'ALL' : isManager ? 'TEAM' : 'SELF',
        actions: isHRAdmin
          ? ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE']
          : isManager
          ? ['VIEW', 'CREATE', 'APPROVE']
          : ['VIEW', 'CREATE'],
      },
      Payroll: {
        scope: isHRAdmin ? 'ALL' : isManager ? 'TEAM' : 'SELF',
        actions: isHRAdmin ? ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE'] : ['VIEW'],
      },
      Considerations: {
        scope: isHRAdmin ? 'ALL' : isManager ? 'TEAM' : 'SELF',
        actions: isHRAdmin
          ? ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE']
          : isManager
          ? ['VIEW', 'CREATE', 'APPROVE']
          : ['VIEW', 'CREATE'],
      },
      Documents: {
        scope: isHRAdmin ? 'ALL' : isManager ? 'TEAM' : 'SELF',
        actions: isHRAdmin
          ? ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE']
          : isManager
          ? ['VIEW']
          : ['VIEW', 'CREATE'],
      },
    };
  }, [effectiveRole]);

  const companyTiming = useMemo(() => {
    const [fhStart = '09:30', fhEnd = '14:00'] = (settings.firstHalfTiming || '09:30 - 14:00')
      .split('-')
      .map((s) => s.trim());
    const [shStart = '14:00', shEnd = '18:30'] = (settings.secondHalfTiming || '14:00 - 18:30')
      .split('-')
      .map((s) => s.trim());
    return {
      workingStartTime: settings.workStartTime || '09:30',
      workingEndTime: settings.workEndTime || '18:30',
      gracePeriodMinutes: settings.gracePeriodMinutes ?? 15,
      fullDayHours: settings.fullDayHoursThreshold ?? 8.5,
      minHalfDayHours: settings.halfDayHoursThreshold ?? 4.25,
      firstHalfStart: fhStart,
      firstHalfEnd: fhEnd,
      secondHalfStart: shStart,
      secondHalfEnd: shEnd,
      lunchBreakWindow: settings.lunchBreakWindow || '13:30 – 14:15 (45 Mins)',
      latePenaltyThresholdCount: settings.lateArrivalThresholdCount ?? 3,
      latePenaltyDeductionDays: 0.5,
      weeklyOffDays: 'Sunday (Fixed Weekly Off)',
      saturdayRule: 'Working Saturday (10:00 – 16:30 Atelier & Dispatch Schedule)',
    };
  }, [settings]);

  const normalizedEmployees = useMemo(
    () =>
      scopedEmployees.map((e) => {
        const grossMonthly =
          (e.salary?.baseSalary || 0) +
          (e.salary?.hra || 0) +
          (e.salary?.specialAllowance || 0);
        return {
          ...e,
          employeeCode: e.id,
          managerId: e.managerId,
          reportingManager: e.managerName || 'Chaitanya Katare',
          status:
            e.status === 'OnNotice'
              ? 'ON_NOTICE'
              : e.status === 'Inactive'
              ? 'ON_LEAVE'
              : 'ACTIVE',
          annualCTC: grossMonthly * 12,
          bankAccount: `${e.bankName} •••• ${(e.bankAccountNumber || '1001').slice(-4)}`,
        };
      }),
    [scopedEmployees]
  );

  const normalizedLeaves = useMemo(
    () =>
      scopedLeaves.map((l) => ({
        ...l,
        leaveType: (l.leaveType || 'CASUAL').toString().toUpperCase(),
        appliedOn: (l.createdAt || TODAY_DATE).slice(0, 10),
        halfDaySession: !l.isHalfDay
          ? 'FULL_DAY'
          : l.halfDaySession?.toString().includes('Second') || l.halfDaySession === 'SECOND_HALF'
          ? 'SECOND_HALF'
          : 'FIRST_HALF',
        status:
          l.status === 'Approved' || l.status === 'APPROVED'
            ? 'APPROVED'
            : l.status === 'Rejected' || l.status === 'REJECTED'
            ? 'REJECTED'
            : l.status === 'PENDING_HR' || (l.status as string) === 'Pending HR'
            ? 'PENDING_HR'
            : 'PENDING_MANAGER',
        hrApprovedBy:
          l.hrApprovedBy ||
          (l.status === 'Approved' || l.status === 'APPROVED' ? l.decidedBy : undefined),
      })),
    [scopedLeaves]
  );

  const normalizedAttendance = useMemo(
    () =>
      scopedAttendance.map((a) => ({
        ...a,
        punchIn: a.checkIn,
        punchOut: a.checkOut,
        workHours: a.workingHours,
        totalHours: a.workingHours,
        lateByMinutes: a.lateMinutes || 0,
        status:
          a.status === 'Late' || a.status === 'LATE'
            ? 'LATE'
            : a.status === 'Half Day' || a.status === 'HALF_DAY'
            ? 'HALF_DAY'
            : a.status === 'On Leave' || a.status === 'ON_LEAVE'
            ? 'ON_LEAVE'
            : a.status === 'Absent' || a.status === 'ABSENT'
            ? 'ABSENT'
            : 'PRESENT',
        regularizationStatus:
          a.considerationStatus === 'Pending'
            ? 'PENDING'
            : a.considerationStatus === 'Approved'
            ? 'APPROVED'
            : a.considerationStatus === 'Rejected'
            ? 'REJECTED'
            : 'NONE',
      })),
    [scopedAttendance]
  );

  const normalizedPayrolls = useMemo(
    () =>
      scopedPayrolls.map((p) => {
        const gross = (p.baseSalary || 0) + (p.hra || 0) + (p.specialAllowance || 0);
        return {
          ...p,
          employeeCode: p.employeeId,
          paidDays: (p.presentDays || 26) + (p.paidLeaveDays || 0),
          lopDays: p.unpaidLeaveDays || 0,
          basicPay: p.baseSalary || 0,
          grossMonthly: gross,
          tdsDeduction: p.taxDeduction || 0,
          latePenaltyDeduction: p.attendanceDeduction || 0,
          netPayable: p.netSalary || 0,
          status:
            p.status === 'Paid' || p.status === 'DISBURSED'
              ? 'DISBURSED'
              : p.status === 'Draft' || p.status === 'DRAFT'
              ? 'DRAFT'
              : 'PROCESSED',
        };
      }),
    [scopedPayrolls]
  );

  const normalizedConsiderations = useMemo(
    () =>
      scopedConsiderations.map((c: any) => ({
        ...c,
        type: c.type || 'Late Arrival Waiver',
        category: c.category || c.type || 'Late Arrival Waiver',
        title: c.title || `${c.type} — ${c.employeeName}`,
        description: c.description || c.reason || '',
        reason: c.reason || c.description || '',
        supportingNote: c.supportingNote || '',
        submittedAt: (c.createdAt || c.date || TODAY_DATE).slice(0, 10),
        raisedBy: c.raisedBy || c.submittedByName || 'Chaitanya Katare',
        raisedByRole: c.raisedByRole || c.submittedByRole || 'EMPLOYEE',
        severityOrImpact: c.severityOrImpact || 'HIGH',
        status:
          c.status === 'Approved' || c.status === 'APPROVED' || c.status === 'ACKNOWLEDGED'
            ? 'APPROVED'
            : c.status === 'Rejected' || c.status === 'REJECTED' || c.status === 'ARCHIVED'
            ? 'REJECTED'
            : c.status === 'PENDING_HR' || c.status === 'Pending HR'
            ? 'PENDING_HR'
            : 'PENDING_MANAGER',
      })),
    [scopedConsiderations]
  );

  const normalizedDocuments = useMemo(
    () =>
      scopedDocuments.map((d: any) => ({
        ...d,
        category: d.category ? d.category.toString().toUpperCase().replace(/\s+/g, '_') : 'KYC',
        uploadedOn: d.uploadedOn || d.uploadedAt || TODAY_DATE,
        verified: d.status === 'Verified' || d.status === 'VERIFIED',
        status:
          d.status === 'Verified' || d.status === 'VERIFIED'
            ? 'VERIFIED'
            : d.status === 'REJECTED'
            ? 'REJECTED'
            : 'PENDING_VERIFICATION',
      })),
    [scopedDocuments]
  );

  const normalizedHolidays = useMemo(
    () =>
      holidays.map((h: any) => ({
        ...h,
        day: h.day || h.dayOfWeek || 'Monday',
        type:
          h.type === 'National' || h.type === 'NATIONAL'
            ? 'NATIONAL'
            : h.type === 'Company Special' || h.type === 'COMPANY_SPECIAL'
            ? 'COMPANY_SPECIAL'
            : 'FESTIVAL',
        applicableBranches: h.applicableBranches || h.applicableLocations || 'All Argos Watch Locations',
        isPaid: h.isPaid ?? true,
      })),
    [holidays]
  );

  const normalizedPolicies = useMemo(
    () =>
      policies.map((p: any) => ({
        ...p,
        category: (p.category || 'ATTENDANCE').toString().toUpperCase(),
        mandatoryAck: p.requiresAcknowledgement ?? true,
        acknowledgedByMe:
          p.acknowledgedByMe ??
          (Array.isArray(p.acknowledgements) &&
            p.acknowledgements.some((a: any) => a.employeeId === currentEmployee.id)),
      })),
    [policies, currentEmployee.id]
  );

  const normalizedAnnouncements = useMemo(
    () =>
      announcements.map((a: any) => ({
        ...a,
        category: a.category || 'COMPANY_NEWS',
        date: a.date || a.publishDate || TODAY_DATE,
        author: a.author || a.createdBy || 'Chaitanya Katare',
        authorRole: a.authorRole || 'Head of People : Performance & Culture',
        content: a.content || a.description || '',
        pinned: a.pinned ?? a.priority === 'Important',
      })),
    [announcements]
  );

  const myTodayRecord = useMemo(
    () => attendance.find((a) => a.employeeId === currentEmployee.id && a.date === TODAY_DATE),
    [attendance, currentEmployee.id]
  );
  const isClockedIn = !!(myTodayRecord && myTodayRecord.checkIn && !myTodayRecord.checkOut);
  const clockInTime = myTodayRecord?.checkIn || '09:30';

  const toggleClockIn = () => {
    if (isClockedIn) {
      checkOutToday();
    } else {
      checkInToday();
    }
  };

  return (
    <HRMSContext.Provider
      value={{
        isAuthenticated,
        firebaseUser,
        authLoading,
        currentRole: effectiveRole,
        underlyingRole: currentRole,
        activeWorkspace,
        canSwitchWorkspace,
        switchWorkspace,
        currentEmployee,
        switchRolePersona,
        switchEmployeePersona,
        signInWithGoogle,
        signInWithEmailOrPhone,
        signOutUser,
        rolesList,
        permissionCatalog,
        hasPermission,
        createCustomRole,
        updateCustomRole,
        deleteCustomRole,
        assignRoleToUser,
        setUserPermissionOverride,
        setBatchUserPermissionOverrides,
        addCustomPermissionItem,
        allActivityLogs: activityLogs,
        activeModule,
        activeSubModule,
        selectedEmployeeId,
        reportPreset,
        navigateTo,
        openEmployeeProfile,
        allEmployees,
        scopedEmployees,
        departments,
        scopedAttendance,
        scopedLeaves,
        scopedConsiderations,
        scopedPayrolls,
        scopedDocuments,
        scopedLetters,
        scopedPolicies,
        scopedAnnouncements,
        internships,
        holidays: normalizedHolidays as any,
        notifications,
        scopedActivityLogs,
        settings,
        companySettings: settings,
        checkInToday,
        checkOutToday,
        logOrUpdateAttendanceForEmployee: (payload: any) => {
          logOrUpdateAttendanceForEmployee({
            employeeId: payload.employeeId,
            date: payload.date,
            checkIn: payload.checkIn || payload.punchIn || '09:30',
            checkOut: payload.checkOut || payload.punchOut || '18:30',
            status:
              payload.status === 'LATE'
                ? 'Late'
                : payload.status === 'HALF_DAY'
                ? 'Half Day'
                : payload.status === 'ON_LEAVE'
                ? 'On Leave'
                : payload.status === 'ABSENT'
                ? 'Absent'
                : payload.status || 'Present',
            notes: payload.notes || '',
          });
        },
        addNewEmployee,
        updateEmployeeStatus,
        archiveEmployee,
        deactivateEmployee,
        restoreEmployee,
        initiateFinalExit,
        updateNoticePeriod,
        applyLeave: (payload: any) => {
          const normType =
            payload.leaveType === 'SICK'
              ? 'Sick'
              : payload.leaveType === 'EARNED'
              ? 'Earned'
              : payload.leaveType === 'UNPAID'
              ? 'Unpaid'
              : 'Casual';
          const normSession =
            payload.halfDaySession === 'SECOND_HALF'
              ? 'Second Half (14:00 - 18:30)'
              : payload.halfDaySession === 'FIRST_HALF'
              ? 'First Half (09:30 - 14:00)'
              : payload.halfDaySession;
          applyLeave({
            ...payload,
            leaveType: normType,
            halfDaySession: normSession,
          });
        },
        decideLeave,
        adjustEmployeeLeaveBalance,
        submitConsideration,
        decideConsideration,
        acknowledgePolicy,
        createOrUpdatePolicy,
        createAnnouncement: (ann: any) => {
          createAnnouncement({
            title: ann.title,
            description: ann.description || ann.content || '',
            priority: ann.priority || (ann.pinned ? 'Important' : 'Normal'),
            publishDate: ann.publishDate || TODAY_DATE,
            expiryDate: ann.expiryDate || '2026-12-31',
            targetAudience: ann.targetAudience || 'Everyone',
          });
        },
        generateAndSaveLetter,
        uploadEmployeeDocument,
        deleteEmployeeDocument,
        addHoliday,
        updateHoliday: (id: string, hol: any) => {
          setHolidays((prev) =>
            prev.map((h) =>
              h.id === id
                ? {
                    ...h,
                    ...hol,
                    dayOfWeek: hol.dayOfWeek || hol.day || h.dayOfWeek,
                    applicableLocations:
                      hol.applicableLocations || hol.applicableBranches || h.applicableLocations,
                  }
                : h
            )
          );
          addToast('Holiday Updated', 'Company holiday calendar updated.');
        },
        deleteHoliday,
        birthdays,
        addBirthdayCelebration,
        updateBirthdayCelebration,
        deleteBirthdayCelebration,
        reviews,
        submitEmployeeReview,
        decideEmployeeReview,
        updateEmployeeReview,
        deleteEmployeeReview,
        getEmployeeStarSummary,
        getPublicEmployeeReviews,
        addOrUpdateCustomRule,
        deleteCustomRule,
        addDepartment,
        updateDepartment,
        deleteDepartmentSafely,
        reassignDepartmentEmployees,
        addEmployeeToDepartment,
        removeEmployeeFromDepartment,
        transferEmployeeDepartment,
        confirmEmployeeProbation,
        userAccessList,
        updateUserAccess,
        revokeUserAccess,
        mobileAppUsers,
        mobileLocationLogs,
        mobileAppStoreConfig,
        sendMobileAppInvitation,
        sendBulkMobileInvitations,
        sendMobilePasswordReset,
        toggleMobileAccountSuspension,
        revokeMobileSessions,
        updateMobileAttendancePermissions,
        updateBulkMobileAttendancePermissions,
        updateMobileAppStoreConfig,
        masterLetterTemplates,
        letterHistory,
        createLetterTemplate,
        updateLetterTemplate,
        deleteLetterTemplate,
        recordLetterHistory,
        incrementLetterExportCount,
        addInternship,
        processMonthlyPayroll: (id?: string) => {
          if (id) {
            processMonthlyPayroll(id);
          } else {
            setPayrolls((prev) =>
              prev.map((p) => ({ ...p, status: 'Paid', paidDate: TODAY_DATE }))
            );
            addToast('Monthly Payroll Disbursed', 'All Argos Watch payslips marked as Paid.');
          }
        },
        updateCompanySettings,
        markAllNotificationsRead,
        markNotificationRead,
        toasts,
        addToast,
        dismissToast,

        // Normalized properties for modules
        currentUser,
        permissions,
        companyTiming,
        employees: normalizedEmployees,
        leaves: normalizedLeaves,
        attendance: normalizedAttendance,
        payroll: normalizedPayrolls,
        considerations: normalizedConsiderations,
        documents: normalizedDocuments,
        policies: normalizedPolicies,
        announcements: normalizedAnnouncements,
        auditLogs: scopedActivityLogs,
        setActiveModule: (mod: PrimaryModuleId) => navigateTo(mod),
        activeSecondaryModule: activeSubModule,
        setActiveSecondaryModule: (sub: any) => setActiveSubModule(sub),
        isClockedIn,
        clockInTime,
        toggleClockIn,
        liveWorkingSeconds,
        liveWorkingDuration,
        myLeaves: leaves.filter((l) => l.employeeId === currentEmployee.id),
        myAttendance: attendance.filter((a) => a.employeeId === currentEmployee.id),
        myConsiderations: considerations.filter((c) => c.employeeId === currentEmployee.id),
        teamLeaves: leaves.filter((l) => l.managerId === currentEmployee.id),
        teamAttendance: attendance.filter((a) => a.managerId === currentEmployee.id),
        teamConsiderations: considerations.filter((c) => c.managerId === currentEmployee.id),

        // Normalized CRUD handlers (with Strict Read-Only Guards for Manager & Employee)
        createEmployee: (emp: any) => {
          if (currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
            addToast('Permission Denied', 'Only HR or Admin can create employee records.', 'error');
            return;
          }
          const monthlyGross = Math.round((Number(emp.annualCTC) || 900000) / 12);
          const empType = emp.employeeType || emp.employmentType || 'Probation';
          addNewEmployee(
            {
              fullName: emp.fullName,
              email: emp.officialEmail || emp.email,
              personalEmail: emp.personalEmail || emp.email,
              officialEmail: emp.officialEmail || emp.email,
              phone: emp.phone || emp.mobileNumber || '+91 98201 00000',
              role: (emp.role as UserRole) || UserRole.EMPLOYEE,
              designation: emp.designation || 'Staff',
              department: emp.department || 'Operations & Development',
              managerId: emp.managerId || 'EMP-1001',
              managerName: emp.reportingManager || 'Chaitanya Katare',
              status: emp.status || 'Active',
              employmentType: empType,
              employeeType: empType,
              location: emp.location || emp.workLocation || 'Main Atelier & HQ',
              joiningDate: emp.joiningDate || TODAY_DATE,
              probationEndDate: emp.probationEndDate || '2026-12-31',
              probationDurationMonths: emp.probationDurationMonths || 3,
              dob: emp.dob || '1995-06-15',
              gender: emp.gender || 'Male',
              address: emp.address || 'Surat, Gujarat',
              structuredAddress: emp.structuredAddress,
              permanentAddress: emp.permanentAddress,
              emergencyContactName: emp.emergencyContactName || 'Family Contact',
              emergencyContactPhone: emp.emergencyContactPhone || '+91 98201 11111',
              avatarUrl: emp.profilePhotoUrl || '',
              bankName: emp.bankName || 'HDFC Bank',
              bankAccountNumber: emp.bankAccount || emp.bankAccountNumber || '50100991122',
              ifscCode: emp.ifscCode || 'HDFC0001234',
              panNumber: emp.panNumber || 'ARGPK1000A',
              aadhaarNumber: emp.aadhaarNumber,
              uanNumber: emp.uanNumber,
              education: emp.education || [],
              experience: emp.experience || [],
              salary: {
                baseSalary: Math.round(monthlyGross * 0.5),
                hra: Math.round(monthlyGross * 0.3),
                specialAllowance: Math.round(monthlyGross * 0.2),
                pfDeduction: 1800,
                taxDeduction: 2500,
                professionalTax: 200,
              },
            },
            true
          );
        },
        updateEmployee: (id: string, updates: any) => {
          const isHRAdmin = currentRole === UserRole.ADMIN || currentRole === UserRole.HR;
          const isSelf = id === currentEmployee.id;

          if (!isHRAdmin && !isSelf) {
            addToast('Permission Denied', 'You can only view or update your own personal information.', 'error');
            return;
          }

          if (!isHRAdmin) {
            if (updates.role || updates.designation || updates.department || updates.salary || updates.annualCTC || updates.employeeType) {
              addToast('Permission Denied', 'Restricted employment fields can only be modified by HR or Admin.', 'error');
              return;
            }
          }

          const target = allEmployees.find((e) => e.id === id);
          const prevDesignation = target?.designation || '';
          const prevDept = target?.department || '';

          const updatedList = allEmployees.map((e) => {
            if (e.id !== id) return e;
            const monthlyGross = updates.annualCTC
              ? Math.round(Number(updates.annualCTC) / 12)
              : e.salary.baseSalary + e.salary.hra + e.salary.specialAllowance;
            return {
              ...e,
              fullName: isHRAdmin ? (updates.fullName ?? e.fullName) : e.fullName,
              email: isHRAdmin ? (updates.officialEmail ?? updates.email ?? e.email) : e.email,
              officialEmail: isHRAdmin ? (updates.officialEmail ?? updates.email ?? e.officialEmail) : e.officialEmail,
              personalEmail: updates.personalEmail ?? e.personalEmail,
              phone: updates.phone ?? updates.mobileNumber ?? e.phone,
              department: isHRAdmin ? (updates.department ?? e.department) : e.department,
              designation: isHRAdmin ? (updates.designation ?? e.designation) : e.designation,
              role: isHRAdmin ? ((updates.role as UserRole) ?? e.role) : e.role,
              status: isHRAdmin ? (updates.status ?? e.status) : e.status,
              employmentType: isHRAdmin ? (updates.employeeType ?? updates.employmentType ?? e.employmentType) : e.employmentType,
              employeeType: isHRAdmin ? (updates.employeeType ?? updates.employmentType ?? e.employeeType) : e.employeeType,
              address: updates.address ?? e.address,
              structuredAddress: updates.structuredAddress ?? e.structuredAddress,
              permanentAddress: updates.permanentAddress ?? e.permanentAddress,
              dob: updates.dob ?? e.dob,
              gender: updates.gender ?? e.gender,
              bankName: updates.bankName ?? e.bankName,
              bankAccountNumber: updates.bankAccount ?? updates.bankAccountNumber ?? e.bankAccountNumber,
              ifscCode: updates.ifscCode ?? e.ifscCode,
              panNumber: updates.panNumber ?? e.panNumber,
              aadhaarNumber: updates.aadhaarNumber ?? e.aadhaarNumber,
              uanNumber: updates.uanNumber ?? e.uanNumber,
              emergencyContactName: updates.emergencyContactName ?? e.emergencyContactName,
              emergencyContactPhone: updates.emergencyContactPhone ?? e.emergencyContactPhone,
              managerName: isHRAdmin ? (updates.reportingManager ?? updates.managerName ?? e.managerName) : e.managerName,
              managerId: isHRAdmin ? (updates.managerId ?? e.managerId) : e.managerId,
              joiningDate: isHRAdmin ? (updates.joiningDate ?? e.joiningDate) : e.joiningDate,
              probationEndDate: isHRAdmin ? (updates.probationEndDate ?? e.probationEndDate) : e.probationEndDate,
              salary: isHRAdmin && updates.salary
                ? { ...e.salary, ...updates.salary }
                : isHRAdmin && updates.annualCTC
                ? {
                    ...e.salary,
                    baseSalary: Math.round(monthlyGross * 0.5),
                    hra: Math.round(monthlyGross * 0.3),
                    specialAllowance: Math.round(monthlyGross * 0.2),
                  }
                : e.salary,
            };
          });

          setAllEmployees(updatedList);
          localStorage.setItem('hrms_persisted_employees', JSON.stringify(updatedList));
          const updatedEmpObj = updatedList.find((e) => e.id === id);
          if (updatedEmpObj) {
            syncEmployeeToSupabase(updatedEmpObj);
          }

          appendAuditLog(
            `Updated employee details: ${target?.fullName || id}`,
            'People',
            `${target?.fullName || id} (${id})`,
            id,
            `${prevDesignation} (${prevDept})`,
            `${updates.designation || prevDesignation} (${updates.department || prevDept})`
          );

          addToast('Employee Updated', `${target?.fullName || id} profile saved successfully.`);
        },
        deleteEmployee: (id: string) => {
          if (currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
            addToast('Permission Denied', 'Only HR or Admin can remove employee records.', 'error');
            return;
          }
          // Soft-delete/archival as requested by requirement 1 to preserve payroll, attendance & leave history
          archiveEmployee(id, 'Archived via People Directory');
        },
        logManualAttendance,
        approveLeave: (id: string, note = '') =>
          decideLeave(id, 'Approved', note || 'Approved via Leave Desk'),
        rejectLeave: (id: string, reason = '') =>
          decideLeave(id, 'Rejected', reason || 'Rejected due to operational shift requirements'),
        updateLeave: (id: string, updates: any) => {
          const target = leaves.find((l) => l.id === id);
          if (
            currentRole !== UserRole.ADMIN &&
            currentRole !== UserRole.HR &&
            (!target || target.employeeId !== currentEmployee.id)
          ) {
            addToast('Permission Denied', 'You cannot modify another employee’s leave.', 'error');
            return;
          }
          setLeaves((prev) =>
            prev.map((l) => (l.id === id ? { ...l, ...updates } : l))
          );
          addToast('Leave Updated', 'Leave request updated.');
        },
        deleteLeave: (id: string) => {
          const target = leaves.find((l) => l.id === id);
          if (
            currentRole !== UserRole.ADMIN &&
            currentRole !== UserRole.HR &&
            (!target || target.employeeId !== currentEmployee.id)
          ) {
            addToast('Permission Denied', 'You cannot delete another employee’s leave.', 'error');
            return;
          }
          setLeaves((prev) => prev.filter((l) => l.id !== id));
          addToast('Leave Deleted', 'Leave entry removed.');
        },
        updateAttendanceRecord: (id: string, updates: any) => {
          if (currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
            addToast('Permission Denied', 'Only HR or Admin can edit attendance records.', 'error');
            return;
          }
          setAttendance((prev) =>
            prev.map((a) =>
              a.id === id
                ? {
                    ...a,
                    ...updates,
                    checkIn: updates.punchIn !== undefined ? updates.punchIn : a.checkIn,
                    checkOut: updates.punchOut !== undefined ? updates.punchOut : a.checkOut,
                    lateMinutes:
                      updates.lateByMinutes !== undefined ? updates.lateByMinutes : a.lateMinutes,
                  }
                : a
            )
          );
          addToast('Attendance Log Updated', 'Shift log updated.');
        },
        deleteAttendanceRecord: (id: string) => {
          if (currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
            addToast('Permission Denied', 'Only HR or Admin can delete attendance records.', 'error');
            return;
          }
          setAttendance((prev) => prev.filter((a) => a.id !== id));
          addToast('Attendance Log Deleted', 'Shift log removed.');
        },
        submitRegularization: (id: string, reasonText: string) => {
          setAttendance((prev) =>
            prev.map((a) =>
              a.id === id
                ? { ...a, considerationStatus: 'Pending', notes: reasonText }
                : a
            )
          );
          addToast('Regularization Requested', 'Sent to Manager / HR for approval.');
        },
        approveRegularization: (id: string, approve: boolean) => {
          if (currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
            addToast('Permission Denied', 'Only HR or Admin can directly regularize attendance.', 'error');
            return;
          }
          setAttendance((prev) =>
            prev.map((a) =>
              a.id === id
                ? {
                    ...a,
                    considerationStatus: approve ? 'Approved' : 'Rejected',
                    status: approve ? 'Present' : a.status,
                    lateMinutes: approve ? 0 : a.lateMinutes,
                  }
                : a
            )
          );
          addToast(
            approve ? 'Regularization Approved' : 'Regularization Rejected',
            'Attendance log updated.'
          );
        },
        updatePayrollRecord: (id: string, updates: any) => {
          if (currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
            addToast('Permission Denied', 'Only HR or Admin can edit payroll records.', 'error');
            return;
          }
          setPayrolls((prev) =>
            prev.map((p) =>
              p.id === id
                ? {
                    ...p,
                    ...updates,
                    netSalary: updates.netPayable ?? p.netSalary,
                    taxDeduction: updates.tdsDeduction ?? p.taxDeduction,
                    attendanceDeduction: updates.latePenaltyDeduction ?? p.attendanceDeduction,
                  }
                : p
            )
          );
          addToast('Payroll Record Updated', 'Salary computation adjusted.');
        },
        deletePayrollRecord: (id: string) => {
          if (currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
            addToast('Permission Denied', 'Only HR or Admin can delete payroll records.', 'error');
            return;
          }
          setPayrolls((prev) => prev.filter((p) => p.id !== id));
          addToast('Payroll Entry Removed', 'Payroll record deleted.');
        },
        createConsideration: (c: any) => {
          submitConsideration({
            employeeId: c.employeeId || currentEmployee.id,
            date: c.date || TODAY_DATE,
            type: c.type || 'Late Arrival Waiver',
            title: c.title,
            category: c.category || c.type,
            reason: c.reason || c.description || '',
            supportingNote: c.supportingNote || '',
            supportingDocument: c.supportingDocument || 'Supporting_Attestation.pdf',
            forwardToHRImmediately: c.forwardToHRImmediately,
          });
        },
        updateConsideration: (id: string, updates: any) => {
          if (currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
            addToast('Permission Denied', 'Only HR or Admin can edit consideration records.', 'error');
            return;
          }
          setConsiderations((prev) =>
            prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
          );
          addToast('Consideration Updated', 'Case record updated.');
        },
        deleteConsideration: (id: string) => {
          if (currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
            addToast('Permission Denied', 'Only HR or Admin can delete consideration records.', 'error');
            return;
          }
          setConsiderations((prev) => prev.filter((c) => c.id !== id));
          addToast('Consideration Deleted', 'Case record removed.');
        },
        reviewConsideration: (
          id: string,
          status: string,
          note = '',
          options?: { affectsAttendancePenalty?: boolean; affectsSalaryDeduction?: boolean }
        ) => {
          const isApprove =
            status === 'ACKNOWLEDGED' || status === 'APPROVED' || status === 'Approved';
          decideConsideration(
            id,
            isApprove ? 'Approved' : 'Rejected',
            note || (isApprove ? `Reviewed & approved by ${currentEmployee.fullName}` : ''),
            options
          );
        },
        uploadDocument: (d: any) => {
          uploadEmployeeDocument({
            employeeId: d.employeeId,
            title: d.title,
            category: (d.category as any) || 'Identity',
            fileName: `${d.title.toLowerCase().replace(/\s+/g, '_')}.pdf`,
            fileSize: d.fileSize || '1.2 MB',
          });
        },
        updateDocument: (id: string, updates: any) => {
          if (currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
            addToast('Permission Denied', 'Only HR or Admin can modify document metadata.', 'error');
            return;
          }
          setDocuments((prev) =>
            prev.map((d) => (d.id === id ? { ...d, ...updates } : d))
          );
          addToast('Document Updated', 'Vault metadata saved.');
        },
        deleteDocument: (id: string) => deleteEmployeeDocument(id),
        verifyDocument: (id: string, status: string) => {
          if (currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
            addToast('Permission Denied', 'Only HR or Admin can verify documents.', 'error');
            return;
          }
          setDocuments((prev) =>
            prev.map((d) =>
              d.id === id
                ? { ...d, status: status === 'VERIFIED' ? 'Verified' : ('Rejected' as any) }
                : d
            )
          );
          addToast('Document Verification Updated', `Marked as ${status}.`);
        },
        createHoliday: (h: any) => {
          addHoliday({
            name: h.name,
            date: h.date,
            dayOfWeek: h.day || h.dayOfWeek || 'Friday',
            type:
              h.type === 'NATIONAL'
                ? 'National'
                : h.type === 'COMPANY_SPECIAL'
                ? 'Company Special'
                : 'Regional',
            applicableLocations: h.applicableBranches || 'All Argos Watch Locations',
          });
        },
        createPolicy: (p: any) => {
          createOrUpdatePolicy({
            title: p.title,
            category: (p.category as any) || 'Attendance',
            version: p.version || 'v1.0',
            status: 'Active',
            effectiveDate: p.effectiveDate || TODAY_DATE,
            targetDepartment: 'All Departments',
            requiresAcknowledgement: p.mandatoryAck ?? true,
            summary: p.summary,
            content: p.summary,
          });
        },
        updatePolicy: (id: string, updates: any) => {
          if (currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
            addToast('Permission Denied', 'Only HR or Admin can modify company policies.', 'error');
            return;
          }
          setPolicies((prev) =>
            prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
          );
          addToast('Policy Updated', 'Company policy charter updated.');
        },
        deletePolicy: (id: string) => {
          if (currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
            addToast('Permission Denied', 'Only HR or Admin can delete company policies.', 'error');
            return;
          }
          setPolicies((prev) => prev.filter((p) => p.id !== id));
          addToast('Policy Deleted', 'Policy removed.');
        },
        updateAnnouncement: (id: string, updates: any) => {
          if (currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
            addToast('Permission Denied', 'Only HR or Admin can modify announcements.', 'error');
            return;
          }
          setAnnouncements((prev) =>
            prev.map((a) =>
              a.id === id
                ? { ...a, ...updates, description: updates.content ?? a.description }
                : a
            )
          );
          addToast('Broadcast Updated', 'Announcement updated.');
        },
        deleteAnnouncement: (id: string) => {
          if (currentRole !== UserRole.ADMIN && currentRole !== UserRole.HR) {
            addToast('Permission Denied', 'Only HR or Admin can delete announcements.', 'error');
            return;
          }
          setAnnouncements((prev) => prev.filter((a) => a.id !== id));
          addToast('Broadcast Deleted', 'Announcement removed.');
        },
        theme,
        setTheme,
        language,
        setLanguage,
        t,
        appLockEnabled,
        isAppLocked,
        lockTimeoutMinutes,
        setLockTimeoutMinutes,
        setAppLockEnabled,
        changeAppLockPin,
        unlockApp,
        lockAppNow,
        resetAppLockWithIdentity,
        importZohoDataArchive,
        purgeAllHRMSData,
      }}
    >
      {children}
    </HRMSContext.Provider>
  );
};

export const useHRMS = (): HRMSContextValue => {
  const ctx = useContext(HRMSContext);
  if (!ctx) {
    throw new Error('useHRMS must be used within an HRMSProvider');
  }
  return ctx;
};
