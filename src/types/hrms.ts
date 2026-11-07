export enum UserRole {
  ADMIN = 'ADMIN',
  HR = 'HR',
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE',
}

export type Role = UserRole | 'ADMIN' | 'HR' | 'MANAGER' | 'EMPLOYEE';

export type PrimaryModuleId =
  | 'dashboard'
  | 'manage-access'
  | 'mobile-app'
  | 'people'
  | 'departments-mgmt'
  | 'my-team'
  | 'my-profile'
  | 'approvals'
  | 'org-tree'
  | 'attendance'
  | 'leave'
  | 'payroll'
  | 'company-info'
  | 'considerations'
  | 'documents'
  | 'calendar'
  | 'reports'
  | 'reviews'
  | 'more'
  | 'settings';

export type ModuleId = PrimaryModuleId;

export type AccessLevel = 'Viewer' | 'Controller';
export type AccountStatus = 'Active' | 'Suspended' | 'Invited' | 'Inactive';

export interface ModuleActionPermission {
  view: boolean;
  create: boolean;
  edit: boolean;
  approve: boolean;
  delete: boolean;
  export: boolean;
}

export type PermissionState = 'ALLOWED' | 'DENIED' | 'INHERITED';
export type WorkspaceMode = 'OWN' | 'HR' | 'ADMIN';

export type PermissionActionType = 'View' | 'Add' | 'Edit' | 'Delete' | 'Approve' | 'Export' | 'Manage';

export type PermissionCategory =
  | 'Dashboard'
  | 'Employees'
  | 'Attendance'
  | 'Leave'
  | 'Considerations'
  | 'Payroll'
  | 'Reports'
  | 'Departments'
  | 'Rules & Policies'
  | 'Organization Tree'
  | 'Settings'
  | 'User Management'
  | string;

export interface GranularPermissionItem {
  id: string;
  name: string;
  category: PermissionCategory;
  actionType?: PermissionActionType;
  whatItDoes: string;
  controlsModule: string;
  allowedActions: string;
  visibleData: string;
  doesNotAllow: string;
  isCustom?: boolean;
}

export interface CustomRoleDefinition {
  id: string;
  name: string;
  description: string;
  isSystemRole: boolean;
  baseRoleType?: UserRole;
  accessLevel: AccessLevel;
  permissions: Record<string, boolean>;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface UserAccessRecord {
  employeeId: string;
  fullName: string;
  email: string;
  role: UserRole;
  roleId?: string;
  roleName?: string;
  isSuperAdmin?: boolean;
  accessLevel: AccessLevel;
  accountStatus: AccountStatus;
  department: string;
  designation: string;
  managerId?: string;
  managerName?: string;
  lastLogin?: string;
  invitationStatus: 'Accepted' | 'Pending' | 'Invited';
  modulePermissions: Record<string, ModuleActionPermission>;
  permissionOverrides?: Record<string, PermissionState>;
  allowedWorkspaces?: WorkspaceMode[];
  updatedAt: string;
  updatedBy: string;
  adminNote?: string;
}

export interface EducationRecord {
  id: string;
  schoolName: string;
  degree: string;
  fieldOfStudy: string;
  completionDate: string;
  notes?: string;
}

export interface ExperienceRecord {
  id: string;
  occupation: string;
  company: string;
  workSummary: string;
  duration: string;
  currentlyWorking: boolean;
}

export interface MasterLetterTemplate {
  id: string;
  title: string;
  name?: string;
  type: 'Offer' | 'Internship' | 'Appointment' | 'Confirmation' | 'Experience' | 'Termination' | string;
  subject: string;
  bodyTemplate: string;
  placeholders: string[];
  version: number;
  status: 'Active' | 'Archived' | 'Draft';
  createdBy: string;
  updatedAt: string;
}

export interface LetterHistoryRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  letterType: string;
  templateName: string;
  templateVersion: number;
  content: string;
  generatedBy: string;
  generatedByName: string;
  generatedAt: string;
  sentBy?: string;
  sentByName?: string;
  sentAt?: string;
  deliveryStatus: 'Draft' | 'Generated' | 'Sent' | 'Delivered' | 'Failed';
  exportCount: number;
  lastExportedAt?: string;
  status: string;
  failureDetails?: string;
}

export type MoreSubModuleId =
  | 'departments'
  | 'org-tree'
  | 'policies'
  | 'announcements'
  | 'letters'
  | 'letter-templates'
  | 'letter-history'
  | 'documents'
  | 'internships'
  | 'holidays'
  | 'birthdays'
  | 'considerations'
  | 'reports'
  | 'activity-log'
  | 'mobile-app'
  | 'settings';

export type EmployeeType =
  | 'Permanent'
  | 'Probation'
  | 'Intern'
  | 'Intern / Internship'
  | 'Contract'
  | 'Temporary'
  | 'Part-time'
  | 'Consultant'
  | 'Other';

export const EMPLOYEE_TYPE_OPTIONS: EmployeeType[] = [
  'Permanent',
  'Probation',
  'Intern',
  'Intern / Internship',
  'Contract',
  'Temporary',
  'Part-time',
  'Consultant',
  'Other',
];

export interface EmployeeAddress {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface CustomCompanyRule {
  id: string;
  title: string;
  category: 'Timing & Shift' | 'Half-Day Rule' | 'Late Coming' | 'Leave Policy' | 'Payroll & Deductions' | 'General Conduct' | string;
  description: string;
  effectiveFrom: string;
  updatedBy: string;
}

export interface WeekdaySchedule {
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  isOpen: boolean;
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
  isHalfDay?: boolean;
  notes?: string;
}

export interface NoticePeriodDetails {
  applicable: boolean;
  duration?: number;
  durationValue?: number;
  durationUnit?: "Days" | "Months" | string;
  unit?: string;
  noticeType?: string;
  startDate: string;
  expectedLastWorkingDate: string;
  actualLastWorkingDate?: string;
  status: "Not Started" | "Active" | "Completed" | "Waived" | "Cancelled" | string;
  internalNotes?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface FinalExitDetails {
  employeeId?: string;
  employeeName?: string;
  exitType: "Resignation" | "Termination" | string;
  effectiveLastDate?: string;
  effectiveLastWorkingDate?: string;
  noticePeriodServed?: boolean;
  noticeStartDate?: string;
  noticeEndDate?: string;
  noticePeriodDays?: number;
  exitReason: string;
  internalNote?: string;
  mandatoryInternalNote?: string;
  additionalRemarks?: string;
  selectedLetterTemplateId?: string;
  selectedLetterTemplateTitle?: string;
  generatedLetterId?: string;
  initiatedBy?: string;
  initiatedAt?: string;
  finalizedBy?: string;
  finalizedAt?: string;
  handoverCompleted?: boolean;
  clearanceStatus?: "Pending" | "Completed" | string;
  status?: "EXIT_INITIATED" | "FINAL_EXIT_COMPLETED" | string;
}

export interface EmployeeDeactivationRecord {
  deactivatedAt: string;
  deactivatedBy: string;
  reason?: string;
  isRestored?: boolean;
  restoredAt?: string;
  restoredBy?: string;
  restoreReason?: string;
}

export interface CompanySettings {
  companyName: string;
  legalEntityName: string;
  registrationNumber: string;
  headquartersAddress: string;
  aboutCompany: string;
  workingDays: string[];
  workStartTime: string;
  workEndTime: string;
  lunchBreakWindow: string;
  firstHalfTiming: string;
  secondHalfTiming: string;
  gracePeriodMinutes: number;
  lateArrivalThresholdCount: number;
  lunchStartTime?: string;
  lunchEndTime?: string;
  lunchDurationMinutes?: number;
  fullDayWorkingHours?: number;
  firstHalfStartTime?: string;
  firstHalfEndTime?: string;
  firstHalfHours?: number;
  secondHalfStartTime?: string;
  secondHalfEndTime?: string;
  secondHalfHours?: number;
  annualLeaveEntitlement?: number;
  updatedAt?: string;
  updatedBy?: string;
  lateDeductionRule: string;
  halfDayHoursThreshold: number;
  fullDayHoursThreshold: number;
  casualLeaveQuota: number;
  sickLeaveQuota: number;
  earnedLeaveQuota: number;
  managerCanViewTeamSalary: boolean;
  managerCanViewTeamDocuments: boolean;
  autoDeductUnapprovedLate: boolean;
  currencySymbol: string;
  customRules: CustomCompanyRule[];
  weekdaySchedules?: WeekdaySchedule[];
  overtimeThresholdHours?: number;
  ipRestrictionEnabled?: boolean;
  allowedIpAddresses?: string[];
  probationDurationMonths?: number;
  probationAutoConfirmation?: boolean;
  letterNumberingPrefix?: string;
  designationsList?: string[];
  locationsList?: string[];
  lateDeductionSalaryBasis?: 'Monthly Gross' | 'Basic Salary' | 'Basic + HRA';
  lateDeductionGraceExempt?: boolean;
  lateDeductionEnabled?: boolean;
  lateDeductionDaysPerMonth?: number;
  lateDeductionDailyWorkingHours?: number;
  lateDeductionDailyWorkingMinutes?: number;
  lateDeductionGraceTreatment?:
    | 'After Grace Only'
    | 'From Shift Start'
    | 'Exempt Within Grace'
    | 'Deduct Excess Above Grace'
    | 'Deduct Full Late Minutes Past Grace'
    | string;
  lateDeductionRoundingRule?:
    | '2 Decimals'
    | 'Nearest Rupee'
    | 'Round Up'
    | 'Exact 2 Decimals'
    | 'Round Nearest Rupee'
    | 'Round Down (Floor)'
    | 'Round Up (Ceil)'
    | string;
  lateDeductionEffectiveFrom?: string;
  lateDeductionApplicableScope?:
    | 'All Employees'
    | 'Confirmed Staff Only'
    | 'Permanent Only'
    | 'Probation & Permanent'
    | 'Exclude Management'
    | string;
  lateDeductionHistory?: {
    id: string;
    updatedAt: string;
    updatedBy: string;
    summary?: string;
    [key: string]: any;
  }[];
}

export interface Department {
  id: string;
  name: string;
  code: string;
  managerId: string;
  managerName: string;
  parentDepartmentId?: string | null;
  location: string;
  description: string;
  annualBudget: number;
  headcount?: number;
  teams?: string[];
  subdepartments?: Department[];
  isArchived?: boolean;
}

export interface SalaryRevision {
  id: string;
  effectiveDate: string;
  previousGross: number;
  newGross: number;
  incrementPercent: number;
  reason: string;
  approvedBy: string;
}

export interface Employee {
  id: string;
  uid: string;
  managerUid: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  isSuperAdmin?: boolean;
  designation: string;
  department: string;
  managerId: string;
  managerName: string;
  status: 'Active' | 'Probation' | 'On Notice' | 'Inactive' | string;
  employmentType: 'Full-Time' | 'Probation' | 'Contract' | 'Intern' | string;
  employeeType?: EmployeeType;
  structuredAddress?: EmployeeAddress;
  location: string;
  joiningDate: string;
  probationEndDate: string;
  dob: string;
  gender: 'Male' | 'Female' | 'Non-binary' | string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  avatarUrl: string;
  bankName: string;
  bankAccountNumber: string;
  ifscCode: string;
  panNumber: string;
  aadhaarNumber?: string;
  uanNumber?: string;
  pfNumber?: string;
  salary: {
    baseSalary: number;
    hra: number;
    specialAllowance: number;
    pfDeduction: number;
    taxDeduction: number;
    professionalTax: number;
  };
  salaryHistory: SalaryRevision[];
  leaveBalance: {
    casualTotal: number;
    casualUsed: number;
    sickTotal: number;
    sickUsed: number;
    earnedTotal: number;
    earnedUsed: number;
  };
  employeeCode?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  personalEmail?: string;
  officialEmail?: string;
  experienceYears?: number;
  sourceOfHire?: string;
  skillSet?: string[];
  highestQualification?: string;
  additionalInformation?: string;
  tentativeJoiningDate?: string;
  offerLetterUrl?: string;
  workLocation?: string;
  workMode?: 'On-site' | 'Remote' | 'Hybrid' | string;
  shiftSchedule?: string;
  probationDurationMonths?: number;
  probationStatus?: 'In Probation' | 'Confirmed Permanent' | 'Extended' | 'Not Applicable' | string;
  probationReviewReminder?: boolean;
  presentAddress?: EmployeeAddress;
  permanentAddress?: EmployeeAddress;
  education?: EducationRecord[];
  experience?: ExperienceRecord[];
  accessLevel?: AccessLevel;
  accountStatus?: AccountStatus;
  lastLogin?: string;
  invitationStatus?: 'Accepted' | 'Pending' | 'Invited';
  modulePermissions?: Record<string, ModuleActionPermission>;
  isDeactivated?: boolean;
  deactivatedAt?: string;
  deactivatedBy?: string;
  deactivationReason?: string;
  isExited?: boolean;
  finalExit?: FinalExitDetails;
  deactivationHistory?: EmployeeDeactivationRecord[];
  noticePeriod?: NoticePeriodDetails;
}

export interface EmployeeRecord {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  role: Role;
  reportingManager: string;
  managerId?: string;
  joiningDate: string;
  status: 'ACTIVE' | 'ON_LEAVE' | 'PROBATION' | 'INACTIVE' | string;
  employeeType?: EmployeeType;
  structuredAddress?: EmployeeAddress;
  address?: string;
  location: string;
  annualCTC: number;
  panNumber: string;
  bankAccount: string;
  avatarInitials?: string;
}

export type PunchType = 'IN' | 'OUT';
export type PunchSource =
  | 'ESSL Biometric'
  | 'Mobile App'
  | 'Web Portal'
  | 'Manual Correction'
  | 'System Auto-Sync'
  | string;

export interface PunchEvent {
  id: string;
  employeeId: string;
  timestamp: string;
  time: string; // e.g. "09:25" or "09:25 AM"
  type: PunchType;
  source: PunchSource;
  sourceDeviceId?: string;
  isFirstIn?: boolean;
  isLastOut?: boolean;
  isIntermediate?: boolean;
  isManualCorrection?: boolean;
  manualCorrectionReason?: string;
  correctedBy?: string;
  correctedAt?: string;
  notes?: string;
  locationCapture?: MobileLocationCaptureRecord;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  department: string;
  managerId?: string;
  uid?: string;
  managerUid?: string;
  date: string;
  checkIn?: string | null;
  checkOut?: string | null;
  punchIn?: string | null;
  punchOut?: string | null;
  punchInTimestamp?: number | null;
  status: 'Present' | 'Late' | 'Half Day' | 'Absent' | 'On Leave' | 'PRESENT' | 'LATE' | 'HALF_DAY' | 'ABSENT' | 'ON_LEAVE' | string;
  isLate?: boolean;
  lateMinutes?: number;
  lateByMinutes?: number;
  earlyDepartureMinutes?: number;
  workingHours?: number;
  workHours?: number;
  totalHours?: number;
  productiveHours?: number;
  overtimeHours?: number;
  notes?: string;
  considerationId?: string;
  considerationStatus?: 'Pending' | 'Approved' | 'Rejected' | string;
  regularizationRequested?: boolean;
  regularizationReason?: string;
  regularizationStatus?: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  source?: 'BIOMETRIC' | 'MANUAL' | 'SYSTEM' | 'WEB' | 'MOBILE' | string;
  isManualCorrection?: boolean;
  manualCorrectionReason?: string;
  correctedBy?: string;
  correctedAt?: string;
  previousPunchIn?: string | null;
  previousPunchOut?: string | null;
  // Multi-punch tracking (Requirement 1)
  punches?: PunchEvent[];
  totalPunchIns?: number;
  totalPunchOuts?: number;
  firstInTime?: string | null;
  lastOutTime?: string | null;
  validPunchPairsCount?: number;
  hasUnmatchedPunch?: boolean;
  unmatchedPunchNote?: string;
  // Salary-based per-minute late deduction (Requirement 5)
  chargeableLateMinutes?: number;
  perMinuteDeductionRate?: number;
  dailySalaryUsed?: number;
  monthlySalaryUsed?: number;
  salaryBasisUsed?: string;
  lateSalaryDeduction?: number;
  payrollAdjustmentStatus?: 'Calculated - Pending Approval' | 'Approved' | 'Adjusted in Payroll' | 'Exempted';
  checkInLocation?: MobileLocationCaptureRecord;
  checkOutLocation?: MobileLocationCaptureRecord;
}

export type LeaveType = 'Casual' | 'Sick' | 'Earned' | 'Unpaid' | 'CASUAL' | 'SICK' | 'EARNED' | 'UNPAID' | 'COMP_OFF';

export type ApprovalWorkflowStatus =
  | 'PENDING_MANAGER'
  | 'PENDING_HR'
  | 'APPROVED'
  | 'REJECTED'
  | 'Pending'
  | 'Approved'
  | 'Rejected';

export interface ApprovalTimelineStep {
  stage: 'SUBMITTED' | 'MANAGER_REVIEW' | 'HR_FINAL_REVIEW';
  actorId?: string;
  actorName: string;
  actorRole: UserRole | Role;
  action: 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  note: string;
  timestamp: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  managerId?: string;
  uid?: string;
  managerUid?: string;
  leaveType: LeaveType | string;
  startDate: string;
  endDate: string;
  days: number;
  isHalfDay?: boolean;
  halfDaySession?: string;
  reason: string;
  appliedBy?: string;
  appliedOn?: string;
  status: ApprovalWorkflowStatus;
  decisionNote?: string;
  rejectionReason?: string;
  decidedBy?: string;
  decidedAt?: string;
  approvedBy?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectedByRole?: UserRole | Role | string;
  managerApprovedBy?: string;
  managerApprovedAt?: string;
  managerDecisionNote?: string;
  hrApprovedBy?: string;
  hrApprovedAt?: string;
  hrDecisionNote?: string;
  submittedByManager?: boolean;
  submittedByManagerName?: string;
  submittedByManagerId?: string;
  approvalHistory?: ApprovalTimelineStep[];
  createdAt?: string;
}

export interface ConsiderationRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode?: string;
  department: string;
  managerId?: string;
  uid?: string;
  managerUid?: string;
  date: string;
  type:
    | 'Late Arrival Waiver'
    | 'Missed Punch Regularization'
    | 'Half-Day Waiver'
    | 'Salary Deduction Waiver'
    | 'Work From Home'
    | 'Client Visit'
    | 'Attendance Regularization'
    | 'Other'
    | string;
  customType?: string;
  category?: string;
  title?: string;
  description?: string;
  reason: string;
  supportingNote?: string;
  supportingDocument?: string;
  origin?: 'EMPLOYEE_SUBMITTED' | 'MANAGER_ON_BEHALF' | 'HR_SUBMITTED';
  submittedById?: string;
  submittedByRole: UserRole | Role;
  submittedByName: string;
  submittedOnBehalfOfName?: string;
  submittedAt?: string;
  raisedBy?: string;
  raisedByRole?: Role;
  status: ApprovalWorkflowStatus;
  managerApprovedBy?: string;
  managerApprovedAt?: string;
  managerDecisionNote?: string;
  hrApprovedBy?: string;
  hrApprovedAt?: string;
  hrDecisionNote?: string;
  decisionNote?: string;
  rejectionReason?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectedByRole?: UserRole | Role | string;
  hrComment?: string;
  decidedBy?: string;
  decisionDate?: string;
  affectsAttendancePenalty?: boolean;
  affectsSalaryDeduction?: boolean;
  approvalHistory?: ApprovalTimelineStep[];
  deductionAmountSaved?: number;
  createdAt?: string;
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode?: string;
  designation: string;
  department: string;
  managerId?: string;
  uid?: string;
  managerUid?: string;
  month: string;
  workingDays?: number;
  presentDays?: number;
  paidDays?: number;
  paidLeaveDays?: number;
  unpaidLeaveDays?: number;
  lopDays?: number;
  lateOccurrences: number;
  baseSalary?: number;
  basicPay?: number;
  hra: number;
  specialAllowance: number;
  bonus?: number;
  overtimePay?: number;
  grossMonthly?: number;
  grossEarnings?: number;
  pfDeduction: number;
  taxDeduction?: number;
  tdsDeduction?: number;
  professionalTax: number;
  attendanceDeduction?: number;
  lopDeduction?: number;
  latePenaltyDeduction?: number;
  considerationAdjustment?: number;
  totalDeductions?: number;
  netSalary?: number;
  netPayable?: number;
  status: 'Processed' | 'Paid' | 'Pending' | 'PROCESSED' | 'DISBURSED' | 'DRAFT' | string;
  paidDate?: string;
  disbursedOn?: string;
}

export interface PolicyVersion {
  version: string;
  updatedAt: string;
  summary: string;
  updatedBy: string;
}

export interface PolicyAcknowledgement {
  employeeId: string;
  employeeName: string;
  version: string;
  acknowledgedAt: string;
}

export interface CompanyPolicy {
  id: string;
  title: string;
  category: 'Attendance' | 'Leave' | 'Payroll' | 'Code of Conduct' | 'IT & Security' | 'Benefits' | string;
  version: string;
  status: 'Active' | 'Draft' | 'Archived' | string;
  effectiveDate: string;
  targetDepartment: string;
  requiresAcknowledgement: boolean;
  summary: string;
  content: string;
  versions: PolicyVersion[];
  acknowledgements: PolicyAcknowledgement[];
}

export interface PolicyItem {
  id: string;
  code: string;
  title: string;
  category: string;
  version: string;
  effectiveDate: string;
  summary: string;
  clauses: string[];
  mandatoryAck?: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  description: string;
  priority: 'Normal' | 'Important' | 'Urgent' | string;
  publishDate: string;
  expiryDate: string;
  targetAudience: 'Everyone' | 'Department' | 'Managers Only' | string;
  targetDepartment?: string;
  attachmentName?: string;
  createdBy: string;
  category?: string;
  body?: string;
  publishedOn?: string;
  publishedAt?: string;
  audience?: string;
}

export interface AnnouncementItem {
  id: string;
  title: string;
  body: string;
  category: string;
  priority: string;
  publishedBy: string;
  publishedOn: string;
  audience: string;
}

export interface EmployeeDocument {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  managerId: string;
  title: string;
  category: 'Identity' | 'Contracts' | 'Certificates' | 'Tax & Bank' | 'Letters' | 'Payslip' | string;
  fileName: string;
  fileSize: string;
  uploadedAt: string;
  expiryDate?: string;
  status: 'Verified' | 'Pending Review' | 'Expiring Soon' | 'Rejected' | string;
  uploadedBy: string;
}

export interface DocumentVaultItem {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  title: string;
  category: string;
  fileSize: string;
  uploadedOn: string;
  uploadedAt?: string;
  status: string;
  verified?: boolean;
  verifiedBy?: string;
}

export interface GeneratedLetter {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  designation: string;
  templateType:
    | 'Offer Letter'
    | 'Appointment Letter'
    | 'Salary Revision Letter'
    | 'Experience Letter'
    | 'Warning / Show Cause Notice'
    | 'Internship Completion Certificate'
    | string;
  subject: string;
  content: string;
  issuedDate: string;
  issuedBy: string;
}

export interface InternshipRecord {
  id: string;
  internCode: string;
  fullName: string;
  internName?: string;
  email: string;
  phone: string;
  college: string;
  department: string;
  mentorId: string;
  mentorName: string;
  startDate: string;
  endDate: string;
  duration?: string;
  stipend: number;
  status: 'Active' | 'Completed' | 'Converted to FTE' | string;
  projectTitle: string;
  performanceScore?: number;
  joiningDate?: string;
}

export interface HolidayRecord {
  id: string;
  name: string;
  date: string;
  dayOfWeek: string;
  day?: string;
  type: 'National' | 'Regional' | 'Floating' | string;
  applicableLocations: string;
  applicableBranches?: string;
  isOptional?: boolean;
}

export interface HolidayItem {
  id: string;
  name: string;
  date: string;
  day: string;
  type: string;
  isOptional?: boolean;
}

export interface NotificationItem {
  id: string;
  targetRoles: UserRole[];
  targetEmployeeId?: string;
  title: string;
  message: string;
  category: 'Leave' | 'Consideration' | 'Payroll' | 'Document' | 'Announcement' | 'Birthday' | string;
  createdAt: string;
  isRead: boolean;
  linkModule: PrimaryModuleId;
  linkSubModule?: MoreSubModuleId;
}

export interface ActivityLogEntry {
  id: string;
  actorUid: string;
  actorName: string;
  actorRole: UserRole | string;
  workspace?: 'Own' | 'HR' | 'Admin' | 'Manager' | 'Employee' | string;
  action: string;
  module: 'People' | 'Attendance' | 'Leave' | 'Payroll' | 'Considerations' | 'Policies' | 'Documents' | 'Letters' | 'Settings' | 'Role & Access' | 'Birthdays' | 'Mobile App' | 'Departments' | string;
  targetRecord: string;
  targetEmployeeId?: string;
  fieldChanged?: string;
  previousValue: string;
  newValue: string;
  timestamp: string;
  ipDevice: string;
  result?: 'SUCCESS' | 'FAILED';
  reason?: string;
  source?: 'Web Portal' | 'Mobile App' | 'ESSL Biometric' | 'System Process' | string;
}

export interface BirthdayCelebrationRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  designation?: string;
  title: string;
  date: string; // YYYY-MM-DD
  celebrationType: 'Birthday' | 'Work Anniversary' | 'Milestone Celebration' | string;
  notes?: string;
  updatedAt?: string;
  updatedBy?: string;
}

// ==========================================
// MOBILE APP USER MANAGEMENT & ADMINISTRATION
// ==========================================

export type MobileAppAccessStatus =
  | 'ACTIVE'
  | 'INVITED'
  | 'NOT_INVITED'
  | 'SUSPENDED'
  | 'Invitation Not Sent'
  | 'Invitation Sent'
  | 'Signup Pending'
  | 'Account Activated'
  | 'Never Logged In'
  | 'Active'
  | 'Access Suspended';

export interface MobileAttendancePermissionConfig {
  allowMobileAttendance: boolean;
  allowMobileCheckIn: boolean;
  allowMobileCheckOut: boolean;
  restrictMobileAttendance?: boolean;
  requireGpsForPunch?: boolean;
  captureCheckInLocation?: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export type LocationCaptureStatus =
  | 'CAPTURED'
  | 'PERMISSION_DENIED'
  | 'UNAVAILABLE'
  | 'LOW_ACCURACY';

export interface MobileLocationCaptureRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  designation?: string;
  date: string;
  timestamp: string;
  action?: 'CHECK_IN' | 'CHECK_OUT';
  punchType?: 'CHECK_IN' | 'CHECK_OUT';
  punchTime?: string;
  latitude: number | null;
  longitude: number | null;
  accuracyMeters: number | null;
  addressLabel?: string;
  locationName?: string;
  deviceSource?: 'Mobile App (Android)' | 'Mobile App (iOS)' | 'Web Portal (Browser GPS)' | string;
  source?: string;
  deviceInfo?: string;
  permissionStatus?: LocationCaptureStatus;
  locationStatus?: LocationCaptureStatus;
  statusNote?: string;
  note?: string;
}

export interface MobileAppLoginEvent {
  id: string;
  timestamp: string;
  event?: 'INVITATION_SENT' | 'SIGNUP_COMPLETED' | 'LOGIN_SUCCESS' | 'PASSWORD_RESET_SENT' | 'SESSION_REVOKED' | 'ACCESS_SUSPENDED' | 'ACCESS_RESTORED' | string;
  action?: string;
  deviceInfo?: string;
  deviceModel?: string;
  osVersion?: string;
  appVersion?: string;
  ipAddress?: string;
  actorName?: string;
}

export interface MobileAppUserRecord {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  role: UserRole;
  managerId?: string;
  managerName?: string;
  accessStatus: MobileAppAccessStatus;
  isRegistered?: boolean;
  invitationSent: boolean;
  invitationSentAt?: string;
  invitationSentDate?: string;
  invitationSentBy?: string;
  invitationCount?: number;
  invitationChannel?: string;
  signupCompleted: boolean;
  signupCompletedDate?: string;
  accountActivated: boolean;
  firstLoginAt?: string;
  firstLoginDate?: string;
  lastLoginAt?: string;
  lastLoginDate?: string;
  lastAppActivity?: string;
  mobileDeviceInfo?: string;
  deviceModel?: string;
  osPlatform?: string;
  appVersion?: string;
  activeSessionCount: number;
  activeSessionsCount?: number;
  passwordResetCount?: number;
  lastPasswordResetSentAt?: string;
  passwordResetLastSentAt?: string;
  passwordResetLastSentBy?: string;
  attendancePermissions: MobileAttendancePermissionConfig;
  loginHistory: MobileAppLoginEvent[];
}

export interface MobileAppStoreConfig {
  appName?: string;
  androidPlayStoreUrl: string;
  iosAppStoreUrl: string;
  directDownloadUrl: string;
  directDownloadLandingUrl: string;
  registrationPortalUrl: string;
  supportEmail?: string;
  appVersionLabel: string;
  requireGpsForMobilePunch: boolean;
  updatedAt: string;
  updatedBy: string;
}

export type ReviewType = 'POSITIVE' | 'NEGATIVE';
export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface EmployeeReview {
  id: string;
  targetEmployeeId: string;
  targetEmployeeName?: string;
  targetEmployeeDepartment?: string;
  targetEmployeeDesignation?: string;
  reviewerEmployeeId?: string;
  reviewerEmployeeName?: string;
  reviewerId?: string;
  reviewerName?: string;
  reviewerDepartment?: string;
  reviewerDesignation?: string;
  reviewType: ReviewType; // POSITIVE or NEGATIVE
  starCount: number; // 1 to 5 stars
  category?: string;
  customCategory?: string;
  reason: string;
  status: ReviewStatus; // PENDING | APPROVED | REJECTED
  submittedAt: string; // ISO date format e.g. "2026-11-06 14:30"
  decidedAt?: string;
  decidedBy?: string;
  decisionNote?: string;
}

export interface PublicEmployeeReview {
  id: string;
  targetEmployeeId: string;
  targetEmployeeName?: string;
  targetEmployeeDepartment?: string;
  targetEmployeeDesignation?: string;
  reviewType: ReviewType;
  starCount: number; // 1 to 5 stars
  category?: string;
  customCategory?: string;
  reason: string;
  submittedAt: string;
  status?: ReviewStatus;
}

export interface EmployeeStarSummary {
  employeeId?: string;
  targetEmployeeId: string;
  positiveStarsCount?: number;
  approvedPositive: number; // Sum of approved positive stars (1-5 per review)
  negativeStarsCount?: number;
  approvedNegative: number; // Sum of approved negative stars (1-5 per review)
  netScore: number; // approvedPositive - approvedNegative
  currentTotalStars: number; // Total approved stars volume (approvedPositive + approvedNegative)
  positiveReviewsCount: number;
  negativeReviewsCount: number;
  totalApprovedReviews: number;
}



