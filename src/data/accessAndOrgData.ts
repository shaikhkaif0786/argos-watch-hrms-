import {
  UserAccessRecord,
  UserRole,
  MasterLetterTemplate,
  LetterHistoryRecord,
  ModuleActionPermission,
  GranularPermissionItem,
  CustomRoleDefinition,
  PermissionState,
  MobileAppUserRecord,
  MobileLocationCaptureRecord,
  MobileAppStoreConfig,
} from '../types/hrms';
import { INITIAL_EMPLOYEES } from './seedData';

export const PERMISSION_CATEGORIES: string[] = [
  'Dashboard',
  'Employees',
  'Attendance',
  'Leave',
  'Considerations',
  'Payroll',
  'Reports',
  'Departments',
  'Rules & Policies',
  'Organization Tree',
  'Settings',
  'User Management',
];

export const GRANULAR_PERMISSION_CATALOG: GranularPermissionItem[] = [
  // 1. Dashboard
  {
    id: 'dashboard.view_own',
    name: 'View Own Dashboard',
    category: 'Dashboard',
    actionType: 'View',
    whatItDoes: 'Allows viewing personal attendance status, leave balances, and announcements in Own Workspace.',
    controlsModule: 'Dashboard (Own Workspace)',
    allowedActions: 'Clock in/out, view personal KPIs, check upcoming holidays and birthdays.',
    visibleData: 'Only the signed-in employee’s own attendance, leave balance, and net pay summary.',
    doesNotAllow: 'Cannot view team-wide or company-wide headcount, other employees’ punches, or HR analytics.',
  },
  {
    id: 'dashboard.view_team',
    name: 'View Team Dashboard',
    category: 'Dashboard',
    actionType: 'View',
    whatItDoes: 'Allows managers to view real-time attendance and pending requests for their direct reports.',
    controlsModule: 'Dashboard (Manager View)',
    allowedActions: 'Inspect team presence, review pending team approvals, monitor late arrivals.',
    visibleData: 'Direct reports’ daily attendance status, leave requests, and consideration appeals.',
    doesNotAllow: 'Cannot view employees outside the assigned reporting line or company-wide payroll totals.',
  },
  {
    id: 'dashboard.view_hr',
    name: 'View HR Dashboard',
    category: 'Dashboard',
    actionType: 'View',
    whatItDoes: 'Unlocks the HR Workspace dashboard with organization-wide workforce metrics and HR queues.',
    controlsModule: 'Dashboard (HR Workspace)',
    allowedActions: 'Switch to HR Workspace, monitor organization-wide attendance, process HR queue items.',
    visibleData: 'Organization-wide headcount, department distribution, attendance exceptions, and HR approval queues.',
    doesNotAllow: 'Does not grant User Management or Role & Access controls unless separately permitted.',
  },
  {
    id: 'dashboard.view_admin',
    name: 'View Admin Dashboard',
    category: 'Dashboard',
    actionType: 'Manage',
    whatItDoes: 'Provides executive and system-level visibility across all departments, financial disbursements, and security logs.',
    controlsModule: 'Dashboard (Admin Workspace)',
    allowedActions: 'View executive KPIs, audit trail summaries, payroll liability, and security posture.',
    visibleData: 'Complete company-wide workforce, financial, attendance, and compliance metrics.',
    doesNotAllow: 'Viewing the dashboard alone does not modify system rules without corresponding edit permissions.',
  },

  // 2. Employees
  {
    id: 'employees.view_own_profile',
    name: 'View Own Profile',
    category: 'Employees',
    actionType: 'View',
    whatItDoes: 'Allows viewing personal employment profile, reporting line, and emergency contact details.',
    controlsModule: 'My Profile / Employees',
    allowedActions: 'View personal dossier, qualification records, and assigned shift details.',
    visibleData: 'Personal contact info, ID numbers, reporting manager, and employment status.',
    doesNotAllow: 'Cannot view or browse other employees’ profiles or change official designation/salary.',
  },
  {
    id: 'employees.edit_own_profile',
    name: 'Edit Own Profile Details',
    category: 'Employees',
    actionType: 'Edit',
    whatItDoes: 'Allows updating self-service contact fields such as phone number, emergency contact, and address.',
    controlsModule: 'My Profile',
    allowedActions: 'Update personal phone, emergency contact details, and residential address.',
    visibleData: 'Editable personal contact and address fields on the user’s own profile.',
    doesNotAllow: 'Cannot alter Employee ID, role, department, joining date, or salary structure.',
  },
  {
    id: 'employees.view_team',
    name: 'View Team Employees',
    category: 'Employees',
    actionType: 'View',
    whatItDoes: 'Allows managers to view directory profiles of employees reporting directly to them.',
    controlsModule: 'My Team / People Directory',
    allowedActions: 'Browse direct reports, inspect contact details, and review probation status.',
    visibleData: 'Direct reports’ job profiles, work locations, and attendance summaries.',
    doesNotAllow: 'Cannot view confidential salary breakdowns (unless permitted) or employees in other teams.',
  },
  {
    id: 'employees.view_all',
    name: 'View All Employees',
    category: 'Employees',
    actionType: 'View',
    whatItDoes: 'Grants access to browse and search the complete organization-wide employee directory.',
    controlsModule: 'Employees (People Directory)',
    allowedActions: 'Search, filter, and inspect employee profiles across the entire organization.',
    visibleData: 'All active, probation, notice-period, and exited employee records.',
    doesNotAllow: 'Cannot create, edit, or deactivate employee records without Add/Edit permissions.',
  },
  {
    id: 'employees.create',
    name: 'Add New Employee',
    category: 'Employees',
    actionType: 'Add',
    whatItDoes: 'Allows onboarding and creating new employee records in the HRMS database.',
    controlsModule: 'Employees (Onboarding Modal)',
    allowedActions: 'Add new employee, assign employee code, set initial department, manager, and compensation.',
    visibleData: 'Employee onboarding wizard and master fields.',
    doesNotAllow: 'Cannot delete existing employees or elevate a user to Super Admin.',
  },
  {
    id: 'employees.edit',
    name: 'Edit Employee Details',
    category: 'Employees',
    actionType: 'Edit',
    whatItDoes: 'Allows modifying employee job titles, departments, reporting managers, and statutory details.',
    controlsModule: 'Employees (Profile Editor)',
    allowedActions: 'Edit job title, transfer department, update bank/PAN details, and modify work mode.',
    visibleData: 'Full employee profile editor form.',
    doesNotAllow: 'Cannot permanently purge employee audit history or bypass Super Admin safeguards.',
  },
  {
    id: 'employees.deactivate_reactivate',
    name: 'Deactivate or Reactivate Employee',
    category: 'Employees',
    actionType: 'Delete',
    whatItDoes: 'Allows suspending an employee account or restoring a previously deactivated employee.',
    controlsModule: 'Employees & Manage Access',
    allowedActions: 'Deactivate employee account with mandatory reason, or reactivate suspended accounts.',
    visibleData: 'Account status controls and deactivation history logs.',
    doesNotAllow: 'Cannot deactivate the protected Super Admin account (Argos Watch).',
  },
  {
    id: 'employees.manage_notice_exit',
    name: 'Manage Notice Period & Exit',
    category: 'Employees',
    actionType: 'Manage',
    whatItDoes: 'Allows initiating and completing formal employee resignation, notice period, and final exit clearance.',
    controlsModule: 'Employees (Exit & Notice Workflow)',
    allowedActions: 'Initiate notice period, record exit reason, generate relieving letter, and finalize separation.',
    visibleData: 'Notice period dates, exit clearance status, and separation notes.',
    doesNotAllow: 'Does not erase historical payroll or attendance records of exited staff.',
  },
  {
    id: 'employees.view_confidential',
    name: 'View Confidential Statutory & Bank Fields',
    category: 'Employees',
    actionType: 'View',
    whatItDoes: 'Unlocks sensitive employee identifiers including PAN, Aadhaar, UAN, Bank Account, and CTC history.',
    controlsModule: 'Employees (Statutory & Financial Tab)',
    allowedActions: 'View bank account numbers, IFSC, PAN, PF/UAN, and compensation history.',
    visibleData: 'Employee bank details, government IDs, and salary revision history.',
    doesNotAllow: 'Cannot disburse payroll or alter tax deductions without Payroll permissions.',
  },

  // 3. Attendance
  {
    id: 'attendance.view_own',
    name: 'View Own Attendance',
    category: 'Attendance',
    actionType: 'View',
    whatItDoes: 'Allows viewing personal daily punch-in/out logs, worked hours, and monthly attendance calendar.',
    controlsModule: 'Attendance & Calendar (Own Workspace)',
    allowedActions: 'View daily punch pairs, first-in/last-out times, and personal late/overtime flags.',
    visibleData: 'Only the user’s own biometric, web, and mobile attendance records.',
    doesNotAllow: 'Cannot manually edit punch times or view other employees’ attendance logs.',
  },
  {
    id: 'attendance.punch_own',
    name: 'Check In / Check Out (Punch)',
    category: 'Attendance',
    actionType: 'Add',
    whatItDoes: 'Allows recording live attendance check-in and check-out events from web or mobile app.',
    controlsModule: 'Dashboard & Attendance',
    allowedActions: 'Trigger Check-In and Check-Out events with timestamp and location verification.',
    visibleData: 'Live shift timer and current day punch sequence.',
    doesNotAllow: 'Cannot backdate punches or overwrite historical biometric logs.',
  },
  {
    id: 'attendance.view_team',
    name: 'View Team Attendance',
    category: 'Attendance',
    actionType: 'View',
    whatItDoes: 'Allows managers to monitor daily attendance, late arrivals, and missing punches for direct reports.',
    controlsModule: 'Attendance (Team View)',
    allowedActions: 'Filter team attendance by date, inspect punch pairs, and review late minutes.',
    visibleData: 'Attendance logs and shift adherence for direct reports.',
    doesNotAllow: 'Cannot view attendance of other departments or change company-wide shift timing rules.',
  },
  {
    id: 'attendance.view_all',
    name: 'View All Employee Attendance',
    category: 'Attendance',
    actionType: 'View',
    whatItDoes: 'Grants organization-wide visibility into every employee’s daily attendance and biometric punches.',
    controlsModule: 'Attendance (Enterprise View)',
    allowedActions: 'Search and audit attendance records across all departments, shifts, and dates.',
    visibleData: 'Complete company attendance register, biometric punch pairs, and exception flags.',
    doesNotAllow: 'Cannot alter punch timestamps unless Edit Attendance permission is also enabled.',
  },
  {
    id: 'attendance.edit_correct',
    name: 'Edit / Correct Attendance Punches',
    category: 'Attendance',
    actionType: 'Edit',
    whatItDoes: 'Allows manually regularizing or correcting missing or inaccurate punch-in and punch-out times.',
    controlsModule: 'Attendance (Manual Correction Modal)',
    allowedActions: 'Update First-In/Last-Out times, add missing punch pairs, and record mandatory correction reason.',
    visibleData: 'Attendance correction editor and original vs. corrected punch audit trail.',
    doesNotAllow: 'Cannot bypass the Activity Log; every manual correction is permanently audited.',
  },
  {
    id: 'attendance.approve_correction',
    name: 'Approve Attendance Regularization',
    category: 'Attendance',
    actionType: 'Approve',
    whatItDoes: 'Allows reviewing and approving employee-submitted attendance regularization requests.',
    controlsModule: 'Attendance & Approvals',
    allowedActions: 'Approve or reject missed-punch and shift regularization appeals.',
    visibleData: 'Pending regularization queue and supporting employee explanations.',
    doesNotAllow: 'Cannot approve one’s own attendance correction request.',
  },
  {
    id: 'attendance.export',
    name: 'Export Attendance Registers',
    category: 'Attendance',
    actionType: 'Export',
    whatItDoes: 'Allows downloading attendance registers and punch logs in Excel, CSV, or PDF formats.',
    controlsModule: 'Attendance & Reports',
    allowedActions: 'Export filtered attendance sheets with auto-filters and frozen headers.',
    visibleData: 'Exportable attendance datasets within the user’s permitted scope.',
    doesNotAllow: 'Cannot export records outside the user’s authorized workspace scope.',
  },

  // 4. Leave
  {
    id: 'leave.apply_own',
    name: 'Apply Personal Leave',
    category: 'Leave',
    actionType: 'Add',
    whatItDoes: 'Allows submitting personal leave requests (Casual, Sick, Earned, or Unpaid) in Own Workspace.',
    controlsModule: 'Leave Module (Own Workspace)',
    allowedActions: 'Submit new leave application, select full/half day, and attach reason.',
    visibleData: 'Personal leave submission form and available leave quota.',
    doesNotAllow: 'Cannot self-approve leave requests or alter entitlement quotas.',
  },
  {
    id: 'leave.view_own',
    name: 'View Own Leave Balance & History',
    category: 'Leave',
    actionType: 'View',
    whatItDoes: 'Allows tracking personal Casual, Sick, and Earned leave balances and past approval history.',
    controlsModule: 'Leave Module (Own Workspace)',
    allowedActions: 'View remaining leave days and inspect multi-stage approval history.',
    visibleData: 'Personal leave ledger and manager/HR decision notes.',
    doesNotAllow: 'Cannot view leave applications of colleagues unless in Manager/HR role.',
  },
  {
    id: 'leave.apply_on_behalf',
    name: 'Record Leave on Behalf of Employee',
    category: 'Leave',
    actionType: 'Add',
    whatItDoes: 'Allows managers or HR to record an official leave entry on behalf of a team member.',
    controlsModule: 'Leave Module (On-Behalf Form)',
    allowedActions: 'Select employee, specify leave dates and type, and submit into workflow.',
    visibleData: 'Employee selector and leave balance preview.',
    doesNotAllow: 'Cannot bypass mandatory audit logging of who submitted the on-behalf request.',
  },
  {
    id: 'leave.view_team',
    name: 'View Team Leave Requests',
    category: 'Leave',
    actionType: 'View',
    whatItDoes: 'Grants visibility into all pending, approved, and rejected leave requests for direct reports.',
    controlsModule: 'Leave & Approvals (Team Scope)',
    allowedActions: 'View team leave calendar overlaps and request history.',
    visibleData: 'Leave requests and balances of direct reports.',
    doesNotAllow: 'Cannot view or act on leave requests from unrelated departments.',
  },
  {
    id: 'leave.view_all',
    name: 'View All Employee Leave Records',
    category: 'Leave',
    actionType: 'View',
    whatItDoes: 'Provides organization-wide visibility into all employee leave applications, balances, and calendars.',
    controlsModule: 'Leave & Approvals (HR/Admin Workspace)',
    allowedActions: 'Search, filter, and audit leave requests across all departments.',
    visibleData: 'All employee leave balances, applications, and approval timelines.',
    doesNotAllow: 'Cannot finalize approvals unless Approve/Reject Leave permission is active.',
  },
  {
    id: 'leave.approve_reject',
    name: 'Approve or Reject Leave Requests',
    category: 'Leave',
    actionType: 'Approve',
    whatItDoes: 'Authorizes approving or rejecting pending leave requests at Manager or HR workflow stages.',
    controlsModule: 'Leave & Approvals Queue',
    allowedActions: 'Approve leave with comment or reject leave with mandatory rejection reason.',
    visibleData: 'Actionable Approve/Reject controls on pending leave cards.',
    doesNotAllow: 'Cannot approve one’s own personal leave request.',
  },
  {
    id: 'leave.edit_balance',
    name: 'Manage Leave Balances & Quotas',
    category: 'Leave',
    actionType: 'Manage',
    whatItDoes: 'Allows adjusting employee leave balances, annual entitlements, and leave corrections.',
    controlsModule: 'Leave Balance Management & Rules',
    allowedActions: 'Modify Casual, Sick, or Earned leave quotas and credit/debit employee balances.',
    visibleData: 'Leave balance adjustment controls and entitlement settings.',
    doesNotAllow: 'All adjustments require a reason and are permanently logged in the Activity Log.',
  },

  // 5. Considerations
  {
    id: 'considerations.create_own',
    name: 'Submit Own Consideration Request',
    category: 'Considerations',
    actionType: 'Add',
    whatItDoes: 'Allows submitting a personal appeal for late arrival waiver, missed punch, or deduction waiver.',
    controlsModule: 'Considerations & Waivers',
    allowedActions: 'Submit new consideration appeal with date, type, and supporting explanation.',
    visibleData: 'Personal consideration submission form.',
    doesNotAllow: 'Cannot self-approve consideration waivers.',
  },
  {
    id: 'considerations.view_own',
    name: 'View Own Considerations',
    category: 'Considerations',
    actionType: 'View',
    whatItDoes: 'Allows tracking the status and review notes of personal consideration appeals.',
    controlsModule: 'Considerations (Own Workspace)',
    allowedActions: 'Track approval stages and see whether late penalty/deduction was waived.',
    visibleData: 'Personal consideration history and decision timeline.',
    doesNotAllow: 'Cannot view consideration requests submitted by other employees.',
  },
  {
    id: 'considerations.create_team',
    name: 'Submit Consideration for Team Member',
    category: 'Considerations',
    actionType: 'Add',
    whatItDoes: 'Allows managers or HR to raise a consideration waiver on behalf of a team member.',
    controlsModule: 'Considerations (On-Behalf Mode)',
    allowedActions: 'Select direct report and submit late/half-day waiver request.',
    visibleData: 'Team member consideration form.',
    doesNotAllow: 'Cannot bypass HR final review when two-stage approval is required.',
  },
  {
    id: 'considerations.view_team',
    name: 'View Team Considerations',
    category: 'Considerations',
    actionType: 'View',
    whatItDoes: 'Allows managers to view consideration appeals raised by their direct reports.',
    controlsModule: 'Considerations & Approvals',
    allowedActions: 'Inspect team appeals, attendance context, and supporting notes.',
    visibleData: 'Consideration requests for direct reports.',
    doesNotAllow: 'Cannot view appeals from employees outside the manager’s reporting line.',
  },
  {
    id: 'considerations.view_all',
    name: 'View All Considerations',
    category: 'Considerations',
    actionType: 'View',
    whatItDoes: 'Grants company-wide access to view all employee consideration and penalty waiver requests.',
    controlsModule: 'Considerations (Enterprise View)',
    allowedActions: 'Filter and audit all pending, approved, and rejected considerations.',
    visibleData: 'All consideration appeals across every department.',
    doesNotAllow: 'Cannot approve or reject without the Approve/Reject Consideration permission.',
  },
  {
    id: 'considerations.approve_reject',
    name: 'Approve or Reject Considerations',
    category: 'Considerations',
    actionType: 'Approve',
    whatItDoes: 'Authorizes approving or rejecting consideration appeals and updating linked attendance deductions.',
    controlsModule: 'Considerations & Approvals',
    allowedActions: 'Approve waiver (exempting late deduction) or reject with mandatory reason.',
    visibleData: 'Decision buttons and waiver impact preview.',
    doesNotAllow: 'Cannot approve one’s own consideration appeal.',
  },

  // 6. Payroll
  {
    id: 'payroll.view_own',
    name: 'View Own Payslip & Salary Summary',
    category: 'Payroll',
    actionType: 'View',
    whatItDoes: 'Allows viewing and downloading personal monthly payslips and net salary breakdown.',
    controlsModule: 'Payroll & My Profile (Own Workspace)',
    allowedActions: 'View personal earnings, statutory deductions, and download PDF payslip.',
    visibleData: 'Only the signed-in user’s own salary structure and monthly payslips.',
    doesNotAllow: 'Cannot view any other employee’s salary or company payroll registers.',
  },
  {
    id: 'payroll.view_team',
    name: 'View Team Salary Summary',
    category: 'Payroll',
    actionType: 'View',
    whatItDoes: 'Allows managers to view compensation summaries of their direct reports when enabled by policy.',
    controlsModule: 'My Team / Payroll',
    allowedActions: 'View gross compensation and overtime payouts for direct reports.',
    visibleData: 'Team members’ salary summary cards.',
    doesNotAllow: 'Cannot run payroll cycles, edit base salaries, or view non-team salaries.',
  },
  {
    id: 'payroll.view_all',
    name: 'View All Payroll Records',
    category: 'Payroll',
    actionType: 'View',
    whatItDoes: 'Unlocks the complete enterprise payroll register across all employees and pay periods.',
    controlsModule: 'Payroll Module',
    allowedActions: 'Inspect monthly gross, PF, PT, TDS, LOP, late deductions, and net payable for all staff.',
    visibleData: 'Company-wide payroll ledger and statutory registers.',
    doesNotAllow: 'Cannot alter salary structures or process disbursements without edit/process permissions.',
  },
  {
    id: 'payroll.generate_process',
    name: 'Generate & Process Monthly Payroll',
    category: 'Payroll',
    actionType: 'Manage',
    whatItDoes: 'Allows running monthly payroll calculations and marking salaries as Processed or Disbursed.',
    controlsModule: 'Payroll (Run Payroll Engine)',
    allowedActions: 'Execute batch payroll run, apply approved waivers, and finalize disbursement status.',
    visibleData: 'Payroll processing controls and disbursement batch summary.',
    doesNotAllow: 'Cannot alter global late-deduction formulas without Late Salary Deduction Settings permission.',
  },
  {
    id: 'payroll.edit_salary',
    name: 'Edit Employee Salary Components',
    category: 'Payroll',
    actionType: 'Edit',
    whatItDoes: 'Allows revising employee base salary, HRA, special allowances, bonuses, and deductions.',
    controlsModule: 'Payroll & Employee Compensation',
    allowedActions: 'Update monthly salary structure and log formal salary revisions.',
    visibleData: 'Editable compensation breakdown fields.',
    doesNotAllow: 'Every change is permanently recorded with previous and new amounts in the Activity Log.',
  },
  {
    id: 'payroll.manage_late_deduction_settings',
    name: 'Manage Late Salary Deduction Formula',
    category: 'Payroll',
    actionType: 'Manage',
    whatItDoes: 'Allows configuring the per-minute late salary deduction formula (days/month, daily hours, rounding).',
    controlsModule: 'Rules & Policies / Settings (Late Salary Deduction Settings)',
    allowedActions: 'Enable/disable per-minute late deduction, set calculation days (e.g. 26), daily hours, and basis.',
    visibleData: 'Late Salary Deduction Settings panel, live formula preview, and rule change history.',
    doesNotAllow: 'Cannot delete historical payroll records already disbursed.',
  },
  {
    id: 'payroll.approve_late_deduction',
    name: 'Approve or Exempt Late Deductions',
    category: 'Payroll',
    actionType: 'Approve',
    whatItDoes: 'Allows reviewing, approving, or exempting calculated per-minute late salary deductions before payroll lock.',
    controlsModule: 'Payroll & Late Salary Deduction Report',
    allowedActions: 'Approve calculated late deduction, mark as Adjusted in Payroll, or grant exemption.',
    visibleData: 'Employee-wise chargeable late minutes, per-minute rate, and deduction status controls.',
    doesNotAllow: 'Cannot alter raw biometric punch timestamps from the payroll screen.',
  },
  {
    id: 'payroll.export',
    name: 'Export Payroll Registers',
    category: 'Payroll',
    actionType: 'Export',
    whatItDoes: 'Allows exporting bank disbursement sheets, PF/PT/TDS schedules, and payroll ledgers to Excel/CSV/PDF.',
    controlsModule: 'Payroll & Reports',
    allowedActions: 'Download formatted Excel/CSV/PDF payroll registers.',
    visibleData: 'Exportable financial and compensation tables.',
    doesNotAllow: 'Cannot export payroll if the user is operating in Own Workspace.',
  },

  // 7. Reports
  {
    id: 'reports.view_attendance',
    name: 'View Attendance Report',
    category: 'Reports',
    actionType: 'View',
    whatItDoes: 'Allows viewing the Attendance Report tab and drilling into employee punch compliance records.',
    controlsModule: 'Reports (Attendance Report)',
    allowedActions: 'Filter attendance analytics by date, department, or employee.',
    visibleData: 'Attendance report table and summary KPIs.',
    doesNotAllow: 'Does not expose salary or deduction figures unless payroll report permissions are granted.',
  },
  {
    id: 'reports.view_consideration',
    name: 'View Consideration Report',
    category: 'Reports',
    actionType: 'View',
    whatItDoes: 'Allows viewing the Consideration Report covering late waivers, missed punch appeals, and approvals.',
    controlsModule: 'Reports (Consideration Report)',
    allowedActions: 'Inspect consideration appeal metrics and approval audit trails.',
    visibleData: 'Consideration report table and waiver statistics.',
    doesNotAllow: 'Cannot approve or reject appeals directly from the read-only report view.',
  },
  {
    id: 'reports.view_late_coming',
    name: 'View Late Coming Report',
    category: 'Reports',
    actionType: 'View',
    whatItDoes: 'Allows viewing the Late Coming Report showing shift start, actual first-in, and chargeable late minutes.',
    controlsModule: 'Reports (Late Coming Report)',
    allowedActions: 'Analyze punctuality trends and chargeable late minutes across staff.',
    visibleData: 'Late arrival frequency and duration records.',
    doesNotAllow: 'Does not allow editing shift grace period rules.',
  },
  {
    id: 'reports.view_late_deduction',
    name: 'View Late Salary Deduction Report',
    category: 'Reports',
    actionType: 'View',
    whatItDoes: 'Allows viewing the Late Salary Deduction Report with Daily Rate, Per-Minute Rate, and ₹ deduction.',
    controlsModule: 'Reports (Late Salary Deduction)',
    allowedActions: 'Audit per-minute salary deduction calculations for all permitted employees.',
    visibleData: 'Monthly salary basis, daily rate, per-minute rate, chargeable minutes, and deduction amount.',
    doesNotAllow: 'Cannot change the underlying formula without Manage Late Salary Deduction Formula permission.',
  },
  {
    id: 'reports.view_overtime',
    name: 'View Overtime Report',
    category: 'Reports',
    actionType: 'View',
    whatItDoes: 'Allows viewing the Overtime Report detailing extra hours logged beyond scheduled shift hours.',
    controlsModule: 'Reports (Overtime Report)',
    allowedActions: 'Review overtime hours and estimated overtime compensation.',
    visibleData: 'Employee overtime logs and duration totals.',
    doesNotAllow: 'Cannot disburse overtime payouts without Payroll processing rights.',
  },
  {
    id: 'reports.view_leave',
    name: 'View Leave Report',
    category: 'Reports',
    actionType: 'View',
    whatItDoes: 'Allows viewing the Leave Report with quota utilization, LOP days, and approval stage history.',
    controlsModule: 'Reports (Leave Report)',
    allowedActions: 'Filter leave utilization by leave type, status, and date range.',
    visibleData: 'Comprehensive leave ledger and balance summaries.',
    doesNotAllow: 'Cannot alter leave balances from the report screen.',
  },
  {
    id: 'reports.view_final_combined',
    name: 'View Final Combined Master Report',
    category: 'Reports',
    actionType: 'View',
    whatItDoes: 'Allows viewing the Final Combined Report consolidating attendance, leaves, overtime, and net payroll.',
    controlsModule: 'Reports (Final Combined Report)',
    allowedActions: 'Review end-to-end monthly workforce and payroll reconciliation.',
    visibleData: 'Consolidated master metrics for each employee.',
    doesNotAllow: 'Read-only analytical view; does not modify source records.',
  },
  {
    id: 'reports.view_employee_details',
    name: 'View Employee-Wise Detailed Reports',
    category: 'Reports',
    actionType: 'View',
    whatItDoes: 'Allows opening the 8-tab Employee Report Details dossier for any employee in Reports.',
    controlsModule: 'Reports (Employee Report Details View)',
    allowedActions: 'Inspect individual employee overview, attendance, late coming, deduction, leave, and combined tabs.',
    visibleData: 'Complete single-employee historical report breakdown.',
    doesNotAllow: 'Cannot view employee-wise dossiers when restricted to Own Workspace.',
  },
  {
    id: 'reports.export',
    name: 'Export Reports (Excel / CSV / PDF)',
    category: 'Reports',
    actionType: 'Export',
    whatItDoes: 'Allows downloading any visible report or employee report tab as an Excel, CSV, or PDF file.',
    controlsModule: 'Reports Export Menu',
    allowedActions: 'Download multi-sheet workbooks or single-tab Excel files with auto-filters.',
    visibleData: 'All columns and rows currently visible in the user’s permitted report view.',
    doesNotAllow: 'Cannot export reports for modules the user is restricted from viewing.',
  },

  // 8. Departments
  {
    id: 'org.view_departments',
    name: 'View Departments & Members',
    category: 'Departments',
    actionType: 'View',
    whatItDoes: 'Allows viewing company departments, department heads, budgets, and assigned department members.',
    controlsModule: 'Departments & More Hub',
    allowedActions: 'Browse department cards and inspect assigned team members.',
    visibleData: 'Department directory, locations, reporting heads, and member roster.',
    doesNotAllow: 'Cannot create, edit, or transfer department members without Manage Departments permission.',
  },
  {
    id: 'org.manage_departments',
    name: 'Manage Departments & Transfer Members',
    category: 'Departments',
    actionType: 'Manage',
    whatItDoes: 'Allows creating/editing departments and adding, removing, or transferring employees between departments.',
    controlsModule: 'Department Management',
    allowedActions: 'Create/edit departments, add members, remove members to Unassigned, and transfer members.',
    visibleData: 'Department configuration forms, member management drawers, and budget allocations.',
    doesNotAllow: 'Removing a member from a department never deletes their employee account.',
  },

  // 9. Rules & Policies
  {
    id: 'org.view_policies',
    name: 'View Rules, Policies & Celebrations',
    category: 'Rules & Policies',
    actionType: 'View',
    whatItDoes: 'Allows reading company policies, shift schedules, holidays, and upcoming employee birthdays.',
    controlsModule: 'Rules & Policies / More Hub',
    allowedActions: 'Read active policies, view weekday shift schedules, and submit policy acknowledgement.',
    visibleData: 'Published company rules, shift hours, holiday calendar, and birthdays.',
    doesNotAllow: 'Cannot edit company rules, shift timings, or policy clauses.',
  },
  {
    id: 'org.manage_policies',
    name: 'Manage Rules & Company Policies',
    category: 'Rules & Policies',
    actionType: 'Manage',
    whatItDoes: 'Allows creating and updating company policies, shift timings, grace periods, and operational rules.',
    controlsModule: 'Rules & Policies (Company Info Editor)',
    allowedActions: 'Publish new policy versions, edit shift windows, and configure company-wide rules.',
    visibleData: 'Policy editor, version history, and employee acknowledgement tracker.',
    doesNotAllow: 'Cannot modify Role & Access security permissions.',
  },
  {
    id: 'letters.view',
    name: 'View HR Letters & Templates',
    category: 'Rules & Policies',
    actionType: 'View',
    whatItDoes: 'Allows viewing official HR letter templates and issued letter history.',
    controlsModule: 'More Hub (Letters & Templates)',
    allowedActions: 'Preview Offer, Confirmation, Internship, Experience, and Termination templates.',
    visibleData: 'Master letter templates and issued letter register.',
    doesNotAllow: 'Cannot generate, send, or edit master templates without corresponding permissions.',
  },
  {
    id: 'letters.generate_send',
    name: 'Generate & Send Official Letters',
    category: 'Rules & Policies',
    actionType: 'Add',
    whatItDoes: 'Allows generating personalized official HR letters for employees and exporting/sending them.',
    controlsModule: 'More Hub (HR Letters)',
    allowedActions: 'Generate letter from template, auto-fill employee placeholders, and send/download PDF.',
    visibleData: 'Letter generation wizard and delivery status controls.',
    doesNotAllow: 'Cannot modify master template placeholders without Manage Letter Templates permission.',
  },
  {
    id: 'letters.manage_templates',
    name: 'Manage Master Letter Templates',
    category: 'Rules & Policies',
    actionType: 'Edit',
    whatItDoes: 'Allows creating and editing Master Letter Templates with dynamic placeholders and versioning.',
    controlsModule: 'More Hub (Letter Templates)',
    allowedActions: 'Create new templates, edit body copy, and increment template versions.',
    visibleData: 'Template source editor and placeholder dictionary.',
    doesNotAllow: 'Does not delete historical letters already issued to employees.',
  },
  {
    id: 'celebrations.view_birthdays',
    name: 'View Birthdays & Milestones',
    category: 'Rules & Policies',
    actionType: 'View',
    whatItDoes: 'Allows viewing upcoming employee birthdays, work anniversaries, and milestone celebrations.',
    controlsModule: 'Dashboard & More Hub (Birthdays & Celebrations)',
    allowedActions: 'Browse monthly birthday calendar and celebration cards.',
    visibleData: 'Employee birthday dates (month/day), department, and celebration notes.',
    doesNotAllow: 'Cannot add, edit, or delete birthday records without Manage Birthdays permission.',
  },
  {
    id: 'celebrations.manage_birthdays',
    name: 'Add, Edit & Delete Birthdays',
    category: 'Rules & Policies',
    actionType: 'Manage',
    whatItDoes: 'Allows adding custom celebration entries, editing birthday dates/titles, and deleting entries.',
    controlsModule: 'More Hub (Birthdays & Celebrations)',
    allowedActions: 'Add celebration record, edit employee birthday/anniversary details, and delete entries.',
    visibleData: 'Full CRUD action buttons on Birthday & Celebration cards.',
    doesNotAllow: 'Deletions are logged in the Activity Log and require confirmation.',
  },

  // 10. Organization Tree
  {
    id: 'org.view_tree',
    name: 'View Organization Tree',
    category: 'Organization Tree',
    actionType: 'View',
    whatItDoes: 'Allows exploring the interactive Organization Tree showing reporting relationships across teams.',
    controlsModule: 'Organization Tree',
    allowedActions: 'Expand/collapse reporting nodes and search hierarchy.',
    visibleData: 'Organizational reporting chart and manager-team links.',
    doesNotAllow: 'Cannot reassign reporting managers without Manage Organization Hierarchy permission.',
  },
  {
    id: 'org.manage_tree',
    name: 'Manage Organization Hierarchy',
    category: 'Organization Tree',
    actionType: 'Manage',
    whatItDoes: 'Allows restructuring reporting lines and changing reporting managers in the organization tree.',
    controlsModule: 'Organization Tree & Employees',
    allowedActions: 'Update reporting managers and department parent-child relationships.',
    visibleData: 'Hierarchy management controls.',
    doesNotAllow: 'Cannot create circular reporting loops.',
  },

  // 11. Settings
  {
    id: 'admin.manage_company_settings',
    name: 'Manage Company & System Settings',
    category: 'Settings',
    actionType: 'Manage',
    whatItDoes: 'Allows updating legal entity details, IP restrictions, biometric sync rules, and system preferences.',
    controlsModule: 'Settings & Rules/Policies',
    allowedActions: 'Update legal entity name, registration number, allowed IPs, and global defaults.',
    visibleData: 'System-level organization configuration panels.',
    doesNotAllow: 'Every setting modification is recorded in the centralized Activity Log.',
  },

  // 12. User Management
  {
    id: 'admin.manage_roles',
    name: 'Create, Edit & Delete Roles',
    category: 'User Management',
    actionType: 'Manage',
    whatItDoes: 'Grants Admin authority to create custom roles, edit role default permissions, and delete custom roles.',
    controlsModule: 'Role & Access Management (Roles Tab)',
    allowedActions: 'Create custom role, modify role permissions, reassign users, and delete custom roles.',
    visibleData: 'Complete Role catalog and role-level permission settings.',
    doesNotAllow: 'Cannot delete mandatory system roles or lock out the Super Admin.',
  },
  {
    id: 'admin.assign_roles',
    name: 'Assign Roles to Employees',
    category: 'User Management',
    actionType: 'Edit',
    whatItDoes: 'Allows assigning or changing any system or custom role (Admin, HR, Manager, Employee) for any user.',
    controlsModule: 'Role & Access Management (User Access Tab)',
    allowedActions: 'Change user role and automatically update their workspace and inherited permissions.',
    visibleData: 'User role assignment controls and workspace eligibility settings.',
    doesNotAllow: 'Cannot demote the protected Super Admin account (Argos Watch).',
  },
  {
    id: 'admin.manage_individual_permissions',
    name: 'Manage Individual User Permissions',
    category: 'User Management',
    actionType: 'Manage',
    whatItDoes: 'Allows customizing individual employee permissions (Allowed or Restricted) in Activity Logs & Access Management.',
    controlsModule: 'Activity Logs (Individual Permission Control)',
    allowedActions: 'Grant individual permission overrides or restrict specific inherited permissions for a user.',
    visibleData: 'Individual Permission Control panel and Permission Change History.',
    doesNotAllow: 'Cannot strip mandatory system administration rights from the Super Admin.',
  },
  {
    id: 'admin.view_activity_log',
    name: 'View Activity Logs & Audit History',
    category: 'User Management',
    actionType: 'View',
    whatItDoes: 'Unlocks the centralized Activity Log recording every action, permission change, and before/after value.',
    controlsModule: 'Activity Logs & Role Management',
    allowedActions: 'Search, filter, and inspect field-level Before vs. After diffs for all system events.',
    visibleData: 'Complete audit trail across all users, roles, workspaces, and modules.',
    doesNotAllow: 'Activity Log entries are immutable and cannot be edited or deleted.',
  },
  {
    id: 'admin.manage_mobile_app',
    name: 'Manage Mobile App Users & GPS Attendance',
    category: 'User Management',
    actionType: 'Manage',
    whatItDoes: 'Allows sending mobile app invitations, resetting passwords, controlling mobile check-in/out, and auditing GPS logs.',
    controlsModule: 'Mobile App Management',
    allowedActions: 'Send app download/signup links, reset passwords, suspend mobile access, and configure mobile punch permissions.',
    visibleData: 'Mobile App user status table, login history, and check-in/out GPS location logs.',
    doesNotAllow: 'Does not fabricate GPS coordinates when employee device location permission is denied.',
  },
];

export const buildRoleDefaultPermissions = (role: UserRole | string): Record<string, boolean> => {
  const map: Record<string, boolean> = {};
  GRANULAR_PERMISSION_CATALOG.forEach((perm) => {
    if (role === UserRole.ADMIN) {
      map[perm.id] = true;
    } else if (role === UserRole.HR) {
      // HR gets all operational HR permissions by default, except strict Admin-only role/individual permission management
      const isStrictAdminOnly = [
        'dashboard.view_admin',
        'admin.manage_roles',
        'admin.assign_roles',
        'admin.manage_individual_permissions',
      ].includes(perm.id);
      map[perm.id] = !isStrictAdminOnly;
    } else if (role === UserRole.MANAGER) {
      const managerAllowed = [
        'dashboard.view_own',
        'dashboard.view_team',
        'employees.view_own_profile',
        'employees.edit_own_profile',
        'employees.view_team',
        'attendance.view_own',
        'attendance.punch_own',
        'attendance.view_team',
        'attendance.approve_correction',
        'attendance.export',
        'leave.apply_own',
        'leave.view_own',
        'leave.apply_on_behalf',
        'leave.view_team',
        'leave.approve_reject',
        'considerations.create_own',
        'considerations.view_own',
        'considerations.create_team',
        'considerations.view_team',
        'considerations.approve_reject',
        'payroll.view_own',
        'reports.view_attendance',
        'reports.view_consideration',
        'reports.view_late_coming',
        'reports.view_overtime',
        'reports.view_leave',
        'org.view_departments',
        'org.view_tree',
        'org.view_policies',
        'celebrations.view_birthdays',
      ];
      map[perm.id] = managerAllowed.includes(perm.id);
    } else if (role === 'PAYROLL_AUDITOR') {
      const auditorAllowed = [
        'dashboard.view_own',
        'employees.view_own_profile',
        'employees.edit_own_profile',
        'employees.view_all',
        'employees.view_confidential',
        'attendance.view_own',
        'attendance.punch_own',
        'attendance.view_all',
        'leave.apply_own',
        'leave.view_own',
        'considerations.create_own',
        'considerations.view_own',
        'payroll.view_own',
        'payroll.view_all',
        'payroll.export',
        'reports.view_attendance',
        'reports.view_late_coming',
        'reports.view_late_deduction',
        'reports.view_overtime',
        'reports.view_final_combined',
        'reports.view_employee_details',
        'reports.export',
        'org.view_departments',
        'org.view_tree',
        'org.view_policies',
        'celebrations.view_birthdays',
      ];
      map[perm.id] = auditorAllowed.includes(perm.id);
    } else {
      // EMPLOYEE default
      const empAllowed = [
        'dashboard.view_own',
        'employees.view_own_profile',
        'employees.edit_own_profile',
        'attendance.view_own',
        'attendance.punch_own',
        'leave.apply_own',
        'leave.view_own',
        'considerations.create_own',
        'considerations.view_own',
        'payroll.view_own',
        'org.view_departments',
        'org.view_tree',
        'org.view_policies',
        'celebrations.view_birthdays',
      ];
      map[perm.id] = empAllowed.includes(perm.id);
    }
  });
  return map;
};

export const INITIAL_ROLES: CustomRoleDefinition[] = [
  {
    id: 'ROLE-ADMIN',
    name: 'Admin',
    description: 'Highest executive & system authority. Full control over Role & Access Management, employee permissions, payroll rules, mobile app administration, and audit logs.',
    isSystemRole: true,
    baseRoleType: UserRole.ADMIN,
    accessLevel: 'Controller',
    permissions: buildRoleDefaultPermissions(UserRole.ADMIN),
    createdAt: '2026-01-01 09:00:00',
    updatedAt: '2026-10-01 10:00:00',
    createdBy: 'System',
  },
  {
    id: 'ROLE-HR',
    name: 'HR',
    description: 'Second-highest operational access across Workforce, Attendance, Leave, Considerations, Payroll, Departments, Mobile App Management, Letters, and Reports. Supports Own & HR Workspace switching.',
    isSystemRole: true,
    baseRoleType: UserRole.HR,
    accessLevel: 'Controller',
    permissions: buildRoleDefaultPermissions(UserRole.HR),
    createdAt: '2026-01-01 09:00:00',
    updatedAt: '2026-10-01 10:00:00',
    createdBy: 'System',
  },
  {
    id: 'ROLE-MANAGER',
    name: 'Manager',
    description: 'Department & team leadership role. Authorized to monitor team attendance, apply/approve team leaves and considerations, and inspect team reports.',
    isSystemRole: true,
    baseRoleType: UserRole.MANAGER,
    accessLevel: 'Controller',
    permissions: buildRoleDefaultPermissions(UserRole.MANAGER),
    createdAt: '2026-01-01 09:00:00',
    updatedAt: '2026-10-01 10:00:00',
    createdBy: 'System',
  },
  {
    id: 'ROLE-EMPLOYEE',
    name: 'Employee',
    description: 'Standard personal self-service access to own attendance, leave requests, considerations, payslips, and company policies.',
    isSystemRole: true,
    baseRoleType: UserRole.EMPLOYEE,
    accessLevel: 'Viewer',
    permissions: buildRoleDefaultPermissions(UserRole.EMPLOYEE),
    createdAt: '2026-01-01 09:00:00',
    updatedAt: '2026-10-01 10:00:00',
    createdBy: 'System',
  },
  {
    id: 'ROLE-PAYROLL-AUDITOR',
    name: 'Payroll & Compliance Auditor',
    description: 'Custom specialist role with read and export access to Attendance, Payroll, Late Salary Deductions, and Executive Reports without destructive edit privileges.',
    isSystemRole: false,
    baseRoleType: UserRole.HR,
    accessLevel: 'Viewer',
    permissions: buildRoleDefaultPermissions('PAYROLL_AUDITOR'),
    createdAt: '2026-09-15 11:00:00',
    updatedAt: '2026-10-01 10:00:00',
    createdBy: 'Argos Watch',
  },
];

export function resolveEffectivePermission(
  roleDef: CustomRoleDefinition | undefined,
  overrides: Record<string, PermissionState> | undefined,
  permissionId: string,
  isSuperAdmin?: boolean
): { allowed: boolean; source: 'ALLOWED_OVERRIDE' | 'DENIED_OVERRIDE' | 'INHERITED_ALLOW' | 'INHERITED_DENY' } {
  if (isSuperAdmin) {
    return { allowed: true, source: 'INHERITED_ALLOW' };
  }
  const overrideState = overrides?.[permissionId];
  if (overrideState === 'DENIED') {
    return { allowed: false, source: 'DENIED_OVERRIDE' };
  }
  if (overrideState === 'ALLOWED') {
    return { allowed: true, source: 'ALLOWED_OVERRIDE' };
  }
  // Fall back to roleDef permissions, or if roleDef is missing a newly added catalog key, check buildRoleDefaultPermissions
  const baseRole = roleDef?.baseRoleType || UserRole.EMPLOYEE;
  const roleDefault =
    roleDef?.permissions && permissionId in roleDef.permissions
      ? roleDef.permissions[permissionId]
      : buildRoleDefaultPermissions(baseRole)[permissionId] ?? false;
  return {
    allowed: Boolean(roleDefault),
    source: roleDefault ? 'INHERITED_ALLOW' : 'INHERITED_DENY',
  };
}

export const MODULE_LIST: { id: string; label: string }[] = [
  { id: 'people', label: 'People & Directory' },
  { id: 'attendance', label: 'Attendance Management' },
  { id: 'leave', label: 'Leave Requests & Balances' },
  { id: 'payroll', label: 'Payroll & Compensation' },
  { id: 'company-info', label: 'Company Settings & Rules' },
  { id: 'departments-mgmt', label: 'Department Management' },
  { id: 'org-tree', label: 'Organization Tree' },
  { id: 'considerations', label: 'Considerations & Waivers' },
  { id: 'documents', label: 'Document Vault & Letters' },
  { id: 'reports', label: 'Reports & Analytics' },
  { id: 'calendar', label: 'Calendar & Shifts' },
  { id: 'mobile-app', label: 'Mobile App Management' },
];

export const getDefaultPermissionsForRole = (
  role: UserRole,
  level: 'Viewer' | 'Controller'
): Record<string, ModuleActionPermission> => {
  const result: Record<string, ModuleActionPermission> = {};

  MODULE_LIST.forEach((m) => {
    if (role === UserRole.ADMIN) {
      result[m.id] = {
        view: true,
        create: true,
        edit: true,
        approve: true,
        delete: true,
        export: true,
      };
    } else if (role === UserRole.HR) {
      const isSensitiveAdminOnly = m.id === 'manage-access';
      result[m.id] = {
        view: true,
        create: level === 'Controller' && !isSensitiveAdminOnly,
        edit: level === 'Controller' && !isSensitiveAdminOnly,
        approve: level === 'Controller' && !isSensitiveAdminOnly,
        delete: false,
        export: true,
      };
    } else if (role === UserRole.MANAGER) {
      const isManagerOperational = ['attendance', 'leave', 'considerations', 'org-tree', 'people'].includes(m.id);
      result[m.id] = {
        view: true,
        create: isManagerOperational && level === 'Controller',
        edit: isManagerOperational && level === 'Controller',
        approve: isManagerOperational && level === 'Controller',
        delete: false,
        export: ['attendance', 'leave', 'reports'].includes(m.id),
      };
    } else {
      // EMPLOYEE
      result[m.id] = {
        view: ['attendance', 'leave', 'considerations', 'documents', 'company-info', 'calendar', 'org-tree'].includes(m.id),
        create: ['leave', 'considerations'].includes(m.id) && level === 'Controller',
        edit: false,
        approve: false,
        delete: false,
        export: ['attendance', 'documents'].includes(m.id),
      };
    }
  });

  return result;
};

export const INITIAL_USER_ACCESS: UserAccessRecord[] = [];

export const INITIAL_MOBILE_STORE_CONFIG: MobileAppStoreConfig = {
  appName: 'Argos Watch HRMS Companion',
  androidPlayStoreUrl: '',
  iosAppStoreUrl: '',
  directDownloadUrl: '',
  directDownloadLandingUrl: '',
  registrationPortalUrl: typeof window !== 'undefined' ? window.location.origin : 'https://argos-hrms.app',
  supportEmail: 'hr@argoswatch.in',
  appVersionLabel: 'Argos Watch Companion v2.4.0 (Android & iOS)',
  requireGpsForMobilePunch: true,
  updatedAt: '2026-10-05 09:00:00',
  updatedBy: 'Argos Watch',
};

export const INITIAL_MOBILE_APP_USERS: MobileAppUserRecord[] = [];

export const INITIAL_MOBILE_LOCATION_LOGS: MobileLocationCaptureRecord[] = [];

export const INITIAL_MASTER_LETTER_TEMPLATES: MasterLetterTemplate[] = [
  {
    id: 'TMPL-01',
    title: 'Executive Offer Letter',
    type: 'Offer',
    subject: 'Official Offer of Employment — {{companyName}}',
    bodyTemplate: `Date: {{date}}
Reference: ARG/HR/OFR/{{year}}/{{sequence}}

To,
{{fullName}}
{{address}}

Dear {{firstName}},

We are pleased to offer you the position of {{designation}} in the {{department}} Department at {{companyName}} ({{legalEntityName}}).

1. APPOINTMENT & COMMENCEMENT
Your joining date will be {{joiningDate}}. You will report to {{reportingManager}}.

2. COMPENSATION & BENEFITS
Your gross annual compensation will be {{currencySymbol}}{{annualCTC}} ({{currencySymbol}}{{grossMonthly}} per month), subject to standard statutory withholdings.

3. PROBATION & CONFIRMATION
You will be placed on a probation period of {{probationDurationMonths}} months starting {{joiningDate}} and expected to conclude on {{probationEndDate}}. Upon successful performance review, permanent confirmation will be issued.

Welcome to the Argos Watch Family.

Sincerely,
{{issuerName}}
{{issuerDesignation}}
{{companyName}}`,
    placeholders: [
      '{{fullName}}',
      '{{firstName}}',
      '{{designation}}',
      '{{department}}',
      '{{companyName}}',
      '{{legalEntityName}}',
      '{{joiningDate}}',
      '{{reportingManager}}',
      '{{annualCTC}}',
      '{{grossMonthly}}',
      '{{probationDurationMonths}}',
      '{{probationEndDate}}',
      '{{date}}',
    ],
    version: 1,
    status: 'Active',
    createdBy: 'Chaitanya Katare',
    updatedAt: '2026-10-01',
  },
  {
    id: 'TMPL-02',
    title: 'Horological Apprenticeship & Internship Letter',
    type: 'Internship',
    subject: 'Internship Engagement Letter — {{companyName}}',
    bodyTemplate: `Date: {{date}}
Ref: ARG/INT/{{year}}/{{sequence}}

To,
{{fullName}}

Dear {{firstName}},

We are pleased to confirm your Internship Engagement as {{designation}} in the {{department}} Department at {{companyName}} starting from {{joiningDate}} until {{internshipEndDate}}.

Your assigned industry mentor will be {{reportingManager}}. You will receive a monthly stipend of {{currencySymbol}}{{stipendAmount}}.

Warm regards,
{{issuerName}}
{{issuerDesignation}}
{{companyName}}`,
    placeholders: [
      '{{fullName}}',
      '{{firstName}}',
      '{{designation}}',
      '{{department}}',
      '{{joiningDate}}',
      '{{internshipEndDate}}',
      '{{reportingManager}}',
      '{{stipendAmount}}',
      '{{date}}',
    ],
    version: 1,
    status: 'Active',
    createdBy: 'Chaitanya Katare',
    updatedAt: '2026-10-01',
  },
  {
    id: 'TMPL-03',
    title: 'Probation Confirmation & Permanent Employment Letter',
    type: 'Confirmation',
    subject: 'Confirmation of Employment — {{companyName}}',
    bodyTemplate: `Date: {{date}}
Ref: ARG/CONF/{{year}}/{{sequence}}

To,
{{fullName}}
Employee ID: {{employeeId}}
{{designation}} · {{department}}

Dear {{firstName}},

Consequent to the successful completion of your probation period and recommendation from {{reportingManager}}, we take great pleasure in confirming your appointment as a Permanent Employee of {{companyName}}, effective {{confirmationDate}}.

All other terms and conditions of your employment contract remain unchanged.

Congratulations and best wishes for continued success.

Warm regards,
{{issuerName}}
{{issuerDesignation}}
{{companyName}}`,
    placeholders: [
      '{{fullName}}',
      '{{firstName}}',
      '{{employeeId}}',
      '{{designation}}',
      '{{department}}',
      '{{reportingManager}}',
      '{{confirmationDate}}',
      '{{date}}',
    ],
    version: 1,
    status: 'Active',
    createdBy: 'Chaitanya Katare',
    updatedAt: '2026-10-01',
  },
  {
    id: 'TMPL-04',
    title: 'Standard Experience & Relieving Certificate',
    type: 'Experience',
    subject: 'Experience & Relieving Certificate — {{fullName}}',
    bodyTemplate: `Date: {{date}}
TO WHOMSOEVER IT MAY CONCERN

This is to certify that {{fullName}} (Employee ID: {{employeeId}}) was employed with {{companyName}} from {{joiningDate}} to {{relievingDate}}.

During this tenure, {{firstName}} served as {{designation}} in the {{department}} Department. {{firstName}} demonstrated exemplary dedication, technical craftsmanship, and professionalism.

We relieve {{fullName}} of all official duties and wish them every success in their future endeavors.

Authorized Signatory,
{{issuerName}}
{{issuerDesignation}}
{{companyName}}`,
    placeholders: [
      '{{fullName}}',
      '{{firstName}}',
      '{{employeeId}}',
      '{{designation}}',
      '{{department}}',
      '{{joiningDate}}',
      '{{relievingDate}}',
      '{{date}}',
    ],
    version: 1,
    status: 'Active',
    createdBy: 'Chaitanya Katare',
    updatedAt: '2026-10-01',
  },
  {
    id: 'TMPL-05',
    title: 'Official Termination & Separation Notice',
    type: 'Termination',
    subject: 'Formal Separation Notice — {{companyName}}',
    bodyTemplate: `Date: {{date}}
STRICTLY CONFIDENTIAL

To,
{{fullName}}
Employee ID: {{employeeId}}
{{designation}} · {{department}}

Dear {{firstName}},

This letter serves as formal notification that your employment with {{companyName}} will terminate on {{terminationEffectiveDate}} in accordance with the terms of your contract.

Please ensure all company assets, intellectual property, movement components, and keys are surrendered to HR before your final day. Full and final settlement will be disbursed pursuant to company guidelines.

Sincerely,
{{issuerName}}
{{issuerDesignation}}
{{companyName}}`,
    placeholders: [
      '{{fullName}}',
      '{{firstName}}',
      '{{employeeId}}',
      '{{designation}}',
      '{{department}}',
      '{{terminationEffectiveDate}}',
      '{{date}}',
    ],
    version: 1,
    status: 'Active',
    createdBy: 'Chaitanya Katare',
    updatedAt: '2026-10-01',
  },
];

export const INITIAL_LETTER_HISTORY: LetterHistoryRecord[] = [
  {
    id: 'LH-2026-001',
    employeeId: 'EMP-1005',
    employeeName: 'Aliasger Channiwala',
    letterType: 'Offer',
    templateName: 'Executive Offer Letter',
    templateVersion: 1,
    content: 'Official Offer of Employment issued on onboarding. Gross compensation ₹35,000/mo.',
    generatedBy: 'EMP-1001',
    generatedByName: 'Chaitanya Katare',
    generatedAt: '2023-08-10 11:30 AM',
    sentBy: 'EMP-1001',
    sentByName: 'Chaitanya Katare',
    sentAt: '2023-08-10 11:35 AM',
    deliveryStatus: 'Delivered',
    exportCount: 2,
    lastExportedAt: '2026-09-12 04:10 PM',
    status: 'Active',
  },
  {
    id: 'LH-2026-002',
    employeeId: 'EMP-1006',
    employeeName: 'Mayur Israni',
    letterType: 'Confirmation',
    templateName: 'Probation Confirmation & Permanent Employment Letter',
    templateVersion: 1,
    content: 'Successful probation completion. Permanent employment status confirmed.',
    generatedBy: 'EMP-1001',
    generatedByName: 'Chaitanya Katare',
    generatedAt: '2024-02-15 03:00 PM',
    sentBy: 'EMP-1001',
    sentByName: 'Chaitanya Katare',
    sentAt: '2024-02-15 03:05 PM',
    deliveryStatus: 'Delivered',
    exportCount: 1,
    lastExportedAt: '2024-02-15 03:00 PM',
    status: 'Active',
  },
  {
    id: 'LH-2026-003',
    employeeId: 'EMP-1007',
    employeeName: 'Kavita Lelinwala',
    letterType: 'Offer',
    templateName: 'Executive Offer Letter',
    templateVersion: 1,
    content: 'Official Offer of Employment issued on joining. Gross compensation ₹32,000/mo.',
    generatedBy: 'EMP-1001',
    generatedByName: 'Chaitanya Katare',
    generatedAt: '2024-04-12 10:15 AM',
    sentBy: 'EMP-1001',
    sentByName: 'Chaitanya Katare',
    sentAt: '2024-04-12 10:20 AM',
    deliveryStatus: 'Delivered',
    exportCount: 3,
    lastExportedAt: '2026-08-01 02:45 PM',
    status: 'Active',
  },
];
