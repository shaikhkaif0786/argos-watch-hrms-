import avatarAdmin from '../assets/images/avatar_admin_director_1791198274026.jpg';
import avatarHr from '../assets/images/avatar_hr_lead_1791198298177.jpg';
import avatarMgr from '../assets/images/avatar_eng_manager_1791198322245.jpg';
import avatarEmp from '../assets/images/avatar_product_engineer_1791198334102.jpg';

import {
  UserRole,
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
  MasterLetterTemplate,
  LetterHistoryRecord,
  BirthdayCelebrationRecord,
  EmployeeReview,
} from '../types/hrms';

export const TODAY_DATE = '2026-10-05';

export const INITIAL_COMPANY_SETTINGS: CompanySettings = {
  companyName: 'Argos Watch',
  legalEntityName: 'Argos Watch Horology & Precision Pvt. Ltd.',
  registrationNumber: 'CIN-U33309GJ2020PTC114820',
  headquartersAddress: 'Argos Horology Atelier, Corporate House, India',
  aboutCompany:
    'Argos Watch crafts mechanical timepieces engineered for endurance, precision, and timeless design. Our in-house teams span Human Resource, Operations, Inventory, Accounts, Assembling-Packaging/Dispatch, and Strategic Growth.',
  workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  workStartTime: '09:30',
  workEndTime: '18:30',
  lunchBreakWindow: '13:30 – 14:15 (45 Mins)',
  firstHalfTiming: '09:30 – 14:00 (4.5 Hours)',
  secondHalfTiming: '14:00 – 18:30 (4.5 Hours)',
  lunchStartTime: '13:30',
  lunchEndTime: '14:15',
  lunchDurationMinutes: 45,
  fullDayWorkingHours: 8.5,
  firstHalfStartTime: '09:30',
  firstHalfEndTime: '14:00',
  firstHalfHours: 4.5,
  secondHalfStartTime: '14:00',
  secondHalfEndTime: '18:30',
  secondHalfHours: 4.5,
  annualLeaveEntitlement: 35,
  gracePeriodMinutes: 15,
  lateArrivalThresholdCount: 3,
  lateDeductionRule:
    'Check-in after 09:45 AM is marked Late. Every 3 unapproved late arrivals in a month result in a 0.5-day Basic Salary deduction unless waived via Consideration.',
  halfDayHoursThreshold: 4.5,
  fullDayHoursThreshold: 8.5,
  casualLeaveQuota: 12,
  sickLeaveQuota: 8,
  earnedLeaveQuota: 15,
  managerCanViewTeamSalary: true,
  managerCanViewTeamDocuments: true,
  autoDeductUnapprovedLate: true,
  currencySymbol: '₹',
  weekdaySchedules: [
    { day: 'Monday', isOpen: true, startTime: '09:30', endTime: '18:30', breakStart: '13:30', breakEnd: '14:15', isHalfDay: false, notes: 'Full Day Atelier Shift' },
    { day: 'Tuesday', isOpen: true, startTime: '09:30', endTime: '18:30', breakStart: '13:30', breakEnd: '14:15', isHalfDay: false, notes: 'Full Day Atelier Shift' },
    { day: 'Wednesday', isOpen: true, startTime: '09:30', endTime: '18:30', breakStart: '13:30', breakEnd: '14:15', isHalfDay: false, notes: 'Full Day Atelier Shift' },
    { day: 'Thursday', isOpen: true, startTime: '09:30', endTime: '18:30', breakStart: '13:30', breakEnd: '14:15', isHalfDay: false, notes: 'Full Day Atelier Shift' },
    { day: 'Friday', isOpen: true, startTime: '09:30', endTime: '18:30', breakStart: '13:30', breakEnd: '14:15', isHalfDay: false, notes: 'Full Day Atelier Shift' },
    { day: 'Saturday', isOpen: true, startTime: '10:00', endTime: '16:30', breakStart: '13:00', breakEnd: '13:45', isHalfDay: true, notes: 'Shorter Atelier & Dispatch Hours' },
    { day: 'Sunday', isOpen: false, startTime: '09:30', endTime: '18:30', breakStart: '13:30', breakEnd: '14:15', isHalfDay: false, notes: 'Weekly Off' },
  ],
  overtimeThresholdHours: 9.5,
  ipRestrictionEnabled: false,
  allowedIpAddresses: ['192.168.1.0/24', '10.0.0.1'],
  customRules: [
    {
      id: 'RULE-01',
      title: 'Full-Day Working Hours & Biometric/Web Check-In',
      category: 'Timing & Shift',
      description:
        'Standard shift runs from 09:30 AM to 06:30 PM (9.0 total hours including a 45-minute lunch break from 01:30 PM to 02:15 PM). Minimum 8.5 logged hours required for full-day credit.',
      effectiveFrom: '2026-04-01',
      updatedBy: 'Chaitanya Katare',
    },
    {
      id: 'RULE-02',
      title: 'Half-Day Session Timings & Leave Deduction',
      category: 'Half-Day Rule',
      description:
        'First-Half session is 09:30 AM – 02:00 PM; Second-Half session is 02:00 PM – 06:30 PM. Working less than 8.5 hours but at least 4.5 hours counts as a Half Day (0.5 day leave/attendance).',
      effectiveFrom: '2026-04-01',
      updatedBy: 'Chaitanya Katare',
    },
    {
      id: 'RULE-03',
      title: 'Late Arrival Grace Window & Consideration Override',
      category: 'Late Coming',
      description:
        'A 15-minute grace window applies until 09:45 AM. After 3 late marks in a calendar month, 0.5 day Basic Pay is deducted unless the Department Manager or HR approves a Consideration request.',
      effectiveFrom: '2026-04-01',
      updatedBy: 'Chaitanya Katare',
    },
    {
      id: 'RULE-04',
      title: 'Dispatch & Inventory Peak Season Attendance Rule',
      category: 'General Conduct',
      description:
        'During festive watch launch weeks, Assembling-Packaging/Dispatch and Inventory teams coordinate shift handovers with Husein Kakajiwala and Sohail Derolwala.',
      effectiveFrom: '2026-09-01',
      updatedBy: 'Chaitanya Katare',
    },
  ],
};

export const INITIAL_DEPARTMENTS: Department[] = [
  {
    id: 'DEPT-HR',
    name: 'Human Resource',
    code: 'HR',
    managerId: 'EMP-1001',
    managerName: 'Chaitanya Katare',
    parentDepartmentId: null,
    location: 'Main Atelier & HQ',
    description: 'People strategy, performance management, culture, recruitment, and payroll governance.',
    annualBudget: 12500000,
  },
  {
    id: 'DEPT-OPS',
    name: 'Operations',
    code: 'OPS',
    managerId: 'EMP-1003',
    managerName: 'Sohail Derolwala',
    parentDepartmentId: null,
    location: 'Main Atelier & HQ',
    description: 'Core business operations, vendor development, supply chain, and cross-functional execution.',
    annualBudget: 24000000,
  },
  {
    id: 'DEPT-INV',
    name: 'Inventory',
    code: 'INV',
    managerId: 'EMP-1003',
    managerName: 'Sohail Derolwala',
    parentDepartmentId: 'DEPT-OPS',
    location: 'Inventory Hub',
    description: 'Watch components, movement stock control, SKU tracking, and warehouse coordination.',
    annualBudget: 16500000,
  },
  {
    id: 'DEPT-ACC',
    name: 'Accounts',
    code: 'ACC',
    managerId: 'EMP-1001',
    managerName: 'Chaitanya Katare',
    parentDepartmentId: 'DEPT-HR',
    location: 'Main Atelier & HQ',
    description: 'Financial accounting, taxation, invoicing, ledger reconciliation, and payroll disbursement.',
    annualBudget: 9800000,
  },
  {
    id: 'DEPT-APD',
    name: 'Assembling-Packaging/Dispatch',
    code: 'APD',
    managerId: 'EMP-1002',
    managerName: 'Husein Kakajiwala',
    parentDepartmentId: 'DEPT-OPS',
    location: 'Production & Dispatch Unit',
    description: 'Watch assembly, quality inspection, luxury packaging, and nationwide order dispatch.',
    annualBudget: 28500000,
  },
  {
    id: 'DEPT-STR',
    name: 'Strategic Growth',
    code: 'STR',
    managerId: 'EMP-1004',
    managerName: 'Anoshi Khan',
    parentDepartmentId: null,
    location: 'Main Atelier & HQ',
    description: 'Brand partnerships, revenue expansion, market strategy, and collector community growth.',
    annualBudget: 19000000,
  },
];

export const INITIAL_EMPLOYEES: Employee[] = [];

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [];

export const INITIAL_LEAVES: LeaveRequest[] = [];

export const INITIAL_CONSIDERATIONS: ConsiderationRequest[] = [];

export const INITIAL_PAYROLLS: PayrollRecord[] = [];

export const INITIAL_POLICIES: CompanyPolicy[] = [
  {
    id: 'POL-001',
    title: 'Argos Watch Working Hours, Half-Day & Late Coming Policy',
    category: 'Attendance',
    version: 'v2.4',
    status: 'Active',
    effectiveDate: '2026-04-01',
    targetDepartment: 'All Departments',
    requiresAcknowledgement: true,
    summary:
      'Full-day shift (09:30 AM – 06:30 PM), Half-day sessions (09:30–14:00 & 14:00–18:30), 15m grace window, and Consideration waivers.',
    content:
      '1. Standard Working Hours: 09:30 AM to 06:30 PM (Monday to Saturday).\n2. Half-Day Timings: First Half is 09:30 AM – 02:00 PM (4.5 hrs); Second Half is 02:00 PM – 06:30 PM (4.5 hrs).\n3. Grace Window: Employees checking in up to 09:45 AM are marked On-Time.\n4. Late Arrival Rule: Every 3 unapproved late arrivals beyond 09:45 AM within a month trigger a 0.5-day Basic Salary deduction unless waived via an approved Consideration.',
    versions: [
      {
        version: 'v2.4',
        updatedAt: '2026-04-01',
        summary: 'Defined explicit First-Half and Second-Half timings and Consideration link.',
        updatedBy: 'Chaitanya Katare',
      },
    ],
    acknowledgements: [
      {
        employeeId: 'EMP-1001',
        employeeName: 'Chaitanya Katare',
        version: 'v2.4',
        acknowledgedAt: '2026-04-01',
      },
      {
        employeeId: 'EMP-1002',
        employeeName: 'Husein Kakajiwala',
        version: 'v2.4',
        acknowledgedAt: '2026-04-02',
      },
      {
        employeeId: 'EMP-1003',
        employeeName: 'Sohail Derolwala',
        version: 'v2.4',
        acknowledgedAt: '2026-04-02',
      },
    ],
  },
  {
    id: 'POL-002',
    title: 'Annual Leave, Half-Day Leave & Holiday Charter',
    category: 'Leave',
    version: 'v3.0',
    status: 'Active',
    effectiveDate: '2026-01-01',
    targetDepartment: 'All Departments',
    requiresAcknowledgement: true,
    summary:
      'Annual entitlement of 12 Casual, 8 Sick, and 15 Earned leaves. HR can also log leaves on behalf of employees during field/dispatch duties.',
    content:
      '1. Annual Quotas: 12 Casual Leaves (CL), 8 Sick Leaves (SL), and 15 Earned Leaves (EL).\n2. Half-Day Leave: Employees may apply for First-Half or Second-Half leave (0.5 day).\n3. On-Behalf Filing: Head of People (HR) may file or regularize leave on behalf of any team member when required.',
    versions: [
      {
        version: 'v3.0',
        updatedAt: '2026-01-01',
        summary: 'Enabled HR on-behalf leave filing and half-day session selection.',
        updatedBy: 'Chaitanya Katare',
      },
    ],
    acknowledgements: [
      {
        employeeId: 'EMP-1007',
        employeeName: 'Kavita Lelinwala',
        version: 'v3.0',
        acknowledgedAt: '2026-01-05',
      },
    ],
  },
  {
    id: 'POL-003',
    title: 'Atelier Watch Assembly, Inventory & Dispatch SOP',
    category: 'Code of Conduct',
    version: 'v1.5',
    status: 'Active',
    effectiveDate: '2026-06-01',
    targetDepartment: 'All Departments',
    requiresAcknowledgement: true,
    summary:
      'Security, dust-free assembly handling, and movement serial reconciliation guidelines across Inventory and Dispatch units.',
    content:
      'All watch movements, dials, and packaged timepieces must be logged by Inventory (Aliasger Channiwala & Mayur Israni) prior to handover to Assembling-Packaging/Dispatch (Husein Kakajiwala).',
    versions: [
      {
        version: 'v1.5',
        updatedAt: '2026-06-01',
        summary: 'Updated batch handover protocol.',
        updatedBy: 'Sohail Derolwala',
      },
    ],
    acknowledgements: [],
  },
];

export const INITIAL_ANNOUNCEMENTS: Announcement[] = [];

export const INITIAL_DOCUMENTS: EmployeeDocument[] = [];

export const INITIAL_LETTERS: GeneratedLetter[] = [];

export const INITIAL_LETTER_TEMPLATES: MasterLetterTemplate[] = [
  {
    id: 'TMPL-01',
    title: 'Standard Employment Offer Letter',
    type: 'Offer',
    subject: 'Offer of Employment — {{designation}} at Argos Watch',
    bodyTemplate: `Date: {{currentDate}}\nReference: ARG/HR/OFR/{{year}}/{{employeeCode}}\n\nTo,\n{{employeeName}}\nEmail: {{email}}\nPhone: {{phone}}\n\nDear {{employeeName}},\n\nOn behalf of Argos Watch Horology & Precision Pvt. Ltd., we are delighted to offer you the position of {{designation}} in the {{department}} department, reporting to {{managerName}}.\n\nKey Terms of Employment:\n- Expected Joining Date: {{joiningDate}}\n- Work Location: {{location}}\n- Annual Compensation (CTC): {{annualCTC}}\n- Initial Probation Period: {{probationDuration}} months\n\nYour appointment is subject to satisfactory reference and document verification.\n\nWarm regards,\nChaitanya Katare\nHead of People : Performance & Culture\nArgos Watch Precision Manufacturing Pvt. Ltd.`,
    placeholders: ['{{currentDate}}', '{{employeeCode}}', '{{employeeName}}', '{{email}}', '{{phone}}', '{{designation}}', '{{department}}', '{{managerName}}', '{{joiningDate}}', '{{location}}', '{{annualCTC}}', '{{probationDuration}}'],
    version: 1,
    status: 'Active',
    createdBy: 'Chaitanya Katare (Admin)',
    updatedAt: '2026-10-01',
  },
  {
    id: 'TMPL-02',
    title: 'Probation Confirmation Letter',
    type: 'Confirmation',
    subject: 'Confirmation of Employment — {{designation}}',
    bodyTemplate: `Date: {{currentDate}}\nReference: ARG/HR/CNF/{{year}}/{{employeeCode}}\n\nTo,\n{{employeeName}}\nEmployee ID: {{employeeId}}\nDepartment: {{department}}\n\nDear {{employeeName}},\n\nConsequent to your performance appraisal during your probation period ending {{probationEndDate}}, we are pleased to inform you that your services at Argos Watch have been confirmed as a Permanent employee with effect from {{confirmationDate}}.\n\nAll other terms and conditions of your original appointment letter remain in effect.\n\nWarm congratulations and best wishes for continued success at Argos Watch.\n\nWarm regards,\nChaitanya Katare\nHead of People : Performance & Culture\nArgos Watch Precision Manufacturing Pvt. Ltd.`,
    placeholders: ['{{currentDate}}', '{{employeeCode}}', '{{employeeId}}', '{{employeeName}}', '{{department}}', '{{designation}}', '{{probationEndDate}}', '{{confirmationDate}}'],
    version: 1,
    status: 'Active',
    createdBy: 'Chaitanya Katare (Admin)',
    updatedAt: '2026-10-01',
  },
  {
    id: 'TMPL-03',
    title: 'Internship Engagement Letter',
    type: 'Internship',
    subject: 'Internship Offer & Engagement — {{department}}',
    bodyTemplate: `Date: {{currentDate}}\nReference: ARG/HR/INT/{{year}}/{{employeeCode}}\n\nTo,\n{{employeeName}}\n\nDear {{employeeName}},\n\nWe are pleased to offer you an Internship appointment at Argos Watch in the {{department}} team under the mentorship of {{managerName}}.\n\nInternship Details:\n- Duration: {{internshipDuration}}\n- Start Date: {{joiningDate}}\n- Monthly Stipend: {{stipend}}\n\nSincerely,\nChaitanya Katare\nHead of People : Performance & Culture\nArgos Watch`,
    placeholders: ['{{currentDate}}', '{{employeeCode}}', '{{employeeName}}', '{{department}}', '{{managerName}}', '{{internshipDuration}}', '{{joiningDate}}', '{{stipend}}'],
    version: 1,
    status: 'Active',
    createdBy: 'Chaitanya Katare (Admin)',
    updatedAt: '2026-10-01',
  },
  {
    id: 'TMPL-04',
    title: 'Official Experience & Relieving Certificate',
    type: 'Experience',
    subject: 'Service & Relieving Certificate — {{employeeName}}',
    bodyTemplate: `Date: {{currentDate}}\nReference: ARG/HR/EXP/{{year}}/{{employeeCode}}\n\nTO WHOMSOEVER IT MAY CONCERN\n\nThis is to certify that {{employeeName}} (Employee ID: {{employeeId}}) was employed with Argos Watch Horology & Precision Pvt. Ltd. from {{joiningDate}} to {{relievingDate}} as {{designation}} in the {{department}} department.\n\nDuring their tenure with us, {{employeeName}} demonstrated exemplary dedication, professionalism, and horological precision. We wish them all success in their future endeavors.\n\nAuthorized Signatory,\nChaitanya Katare\nHead of People : Performance & Culture\nArgos Watch Precision Manufacturing Pvt. Ltd.`,
    placeholders: ['{{currentDate}}', '{{employeeCode}}', '{{employeeId}}', '{{employeeName}}', '{{joiningDate}}', '{{relievingDate}}', '{{designation}}', '{{department}}'],
    version: 1,
    status: 'Active',
    createdBy: 'Chaitanya Katare (Admin)',
    updatedAt: '2026-10-01',
  },
  {
    id: 'TMPL-05',
    title: 'Formal Appointment Letter',
    type: 'Appointment',
    subject: 'Letter of Appointment — {{designation}}',
    bodyTemplate: `Date: {{currentDate}}\nReference: ARG/HR/APT/{{year}}/{{employeeCode}}\n\nTo,\n{{employeeName}}\n\nDear {{employeeName}},\n\nWe are pleased to formalize your appointment as {{designation}} in the {{department}} team at Argos Watch Horology & Precision Pvt. Ltd. effective {{joiningDate}}.\n\nSincerely,\nChaitanya Katare\nHead of People : Performance & Culture\nArgos Watch`,
    placeholders: ['{{currentDate}}', '{{employeeCode}}', '{{employeeName}}', '{{designation}}', '{{department}}', '{{joiningDate}}'],
    version: 1,
    status: 'Active',
    createdBy: 'Chaitanya Katare (Admin)',
    updatedAt: '2026-10-01',
  },
];

export const INITIAL_LETTER_HISTORY: LetterHistoryRecord[] = [];

export const INITIAL_INTERNSHIPS: InternshipRecord[] = [];

export const INITIAL_HOLIDAYS: HolidayRecord[] = [
  {
    id: 'HOL-01',
    name: 'Mahatma Gandhi Jayanti',
    date: '2026-10-02',
    dayOfWeek: 'Friday',
    type: 'National',
    applicableLocations: 'All Units',
  },
  {
    id: 'HOL-02',
    name: 'Dussehra / Vijayadashami',
    date: '2026-10-20',
    dayOfWeek: 'Tuesday',
    type: 'National',
    applicableLocations: 'All Units',
  },
  {
    id: 'HOL-03',
    name: 'Diwali — Laxmi Pujan',
    date: '2026-11-08',
    dayOfWeek: 'Sunday',
    type: 'National',
    applicableLocations: 'All Units',
  },
  {
    id: 'HOL-04',
    name: 'Diwali — New Year / Bestu Varas',
    date: '2026-11-09',
    dayOfWeek: 'Monday',
    type: 'Regional',
    applicableLocations: 'All Units',
  },
  {
    id: 'HOL-05',
    name: 'Bhai Dooj',
    date: '2026-11-10',
    dayOfWeek: 'Tuesday',
    type: 'Floating',
    applicableLocations: 'All Units',
  },
  {
    id: 'HOL-06',
    name: 'Christmas Day',
    date: '2026-12-25',
    dayOfWeek: 'Friday',
    type: 'National',
    applicableLocations: 'All Units',
  },
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [];

export const INITIAL_ACTIVITY_LOGS: ActivityLogEntry[] = [
  {
    id: "LOG-INIT-001",
    actorUid: "uid_argos_admin",
    actorName: "Argos Administrator",
    actorRole: UserRole.ADMIN,
    action: "HRMS System Initialized (Clean Installation)",
    module: "System Governance",
    targetRecord: "Clean Workspace",
    targetEmployeeId: undefined,
    previousValue: "Uninitialized",
    newValue: "Active & Clean (0 Employees)",
    timestamp: "2026-10-05 09:00:00",
    ipDevice: "Argos Secure Cloud Engine",
  },
];

export const INITIAL_BIRTHDAYS: BirthdayCelebrationRecord[] = [];

export const INITIAL_REVIEWS: EmployeeReview[] = [
  {
    id: 'REV-1001',
    targetEmployeeId: 'EMP-ADMIN',
    targetEmployeeName: 'Argos Administrator',
    targetEmployeeDepartment: 'Administration',
    targetEmployeeDesignation: 'Super Administrator',
    reviewerId: 'EMP-1008',
    reviewerEmployeeId: 'EMP-1008',
    reviewerName: 'Rahul Sharma',
    reviewerEmployeeName: 'Rahul Sharma',
    reviewerDepartment: 'Assembling-Packaging/Dispatch',
    reviewerDesignation: 'Precision Assembly Technician',
    reviewType: 'POSITIVE',
    starCount: 5,
    category: 'Leadership',
    reason: 'Exemplary leadership during the high-volume Q3 atelier launch. Always supportive and approachable.',
    status: 'APPROVED',
    submittedAt: '2026-10-04 14:30',
    decidedAt: '2026-10-04 15:00',
    decidedBy: 'Argos Administrator',
    decisionNote: 'Verified and approved for publication.',
  },
];
