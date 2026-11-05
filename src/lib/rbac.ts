import {
  UserRole,
  PrimaryModuleId,
  MoreSubModuleId,
  Employee,
  AttendanceRecord,
  LeaveRequest,
  ConsiderationRequest,
  PayrollRecord,
  EmployeeDocument,
  GeneratedLetter,
  CompanyPolicy,
  Announcement,
  ActivityLogEntry,
  CompanySettings,
} from '../types/hrms';

export interface NavItemConfig {
  id: PrimaryModuleId;
  label: string;
}

export interface MoreNavItemConfig {
  id: MoreSubModuleId;
  label: string;
  description: string;
  category: 'Organization & People' | 'Compliance & Communications' | 'Governance & System';
}

/**
 * Role-specific primary navigation items (with Company Hub for timings, half-day, holidays & policies)
 */
export function getPrimaryNavForRole(role: UserRole): NavItemConfig[] {
  switch (role) {
    case UserRole.ADMIN:
      return [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'people', label: 'Employees' },
        { id: 'approvals', label: 'Approval Requests' },
        { id: 'attendance', label: 'Attendance' },
        { id: 'leave', label: 'Leave' },
        { id: 'considerations', label: 'Considerations' },
        { id: 'company-info', label: 'Rules & Policies' },
        { id: 'calendar', label: 'Attendance Calendar' },
        { id: 'payroll', label: 'Payroll' },
        { id: 'reports', label: 'Reports' },
        { id: 'manage-access', label: 'Manage Access' },
        { id: 'mobile-app', label: 'Mobile App Management' },
        { id: 'departments-mgmt', label: 'Departments' },
        { id: 'org-tree', label: 'Organization Tree' },
        { id: 'settings', label: 'Settings' },
        { id: 'more', label: 'More' },
      ];
    case UserRole.HR:
      return [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'people', label: 'Employees' },
        { id: 'approvals', label: 'Approval Requests' },
        { id: 'attendance', label: 'Attendance' },
        { id: 'leave', label: 'Leave' },
        { id: 'considerations', label: 'Considerations' },
        { id: 'company-info', label: 'Rules & Policies' },
        { id: 'calendar', label: 'Attendance Calendar' },
        { id: 'payroll', label: 'Payroll' },
        { id: 'reports', label: 'Reports' },
        { id: 'mobile-app', label: 'Mobile App Management' },
        { id: 'departments-mgmt', label: 'Departments' },
        { id: 'org-tree', label: 'Organization Tree' },
        { id: 'settings', label: 'Settings' },
        { id: 'more', label: 'More' },
      ];
    case UserRole.MANAGER:
      return [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'my-team', label: 'My Team' },
        { id: 'approvals', label: 'Approval Requests' },
        { id: 'attendance', label: 'Attendance' },
        { id: 'leave', label: 'Leave' },
        { id: 'considerations', label: 'Considerations' },
        { id: 'company-info', label: 'Rules & Policies' },
        { id: 'calendar', label: 'Attendance Calendar' },
        { id: 'payroll', label: 'Payroll' },
        { id: 'my-profile', label: 'My Profile' },
        { id: 'org-tree', label: 'Organization Tree' },
        { id: 'settings', label: 'Settings' },
        { id: 'more', label: 'More' },
      ];
    case UserRole.EMPLOYEE:
      return [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'attendance', label: 'Attendance' },
        { id: 'leave', label: 'Leave' },
        { id: 'considerations', label: 'Considerations' },
        { id: 'company-info', label: 'Rules & Policies' },
        { id: 'calendar', label: 'Attendance Calendar' },
        { id: 'payroll', label: 'Payroll' },
        { id: 'my-profile', label: 'My Profile' },
        { id: 'org-tree', label: 'Organization Tree' },
        { id: 'settings', label: 'Settings' },
        { id: 'more', label: 'More' },
      ];
  }
}

/**
 * Role-specific items inside "More" module
 * Note: HR has complete operational control alongside Admin!
 */
export function getMoreModulesForRole(role: UserRole, _settings: CompanySettings): MoreNavItemConfig[] {
  const all: (MoreNavItemConfig & { allowedRoles: UserRole[] })[] = [
    {
      id: 'departments',
      label: 'Departments Management',
      description: 'Manage Argos Watch departments, heads, members, transfers, and headcounts.',
      category: 'Organization & People',
      allowedRoles: [UserRole.ADMIN, UserRole.HR],
    },
    {
      id: 'org-tree',
      label: 'Department & Employee Tree',
      description: 'Interactive connected hierarchy of departments and reporting lines.',
      category: 'Organization & People',
      allowedRoles: [UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.EMPLOYEE],
    },
    {
      id: 'birthdays',
      label: 'Birthdays',
      description: 'Today, this week, and upcoming team birthdays across Argos Watch.',
      category: 'Organization & People',
      allowedRoles: [UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.EMPLOYEE],
    },
    {
      id: 'letter-templates',
      label: 'Letter Template Center (Admin)',
      description: 'Create, format, and maintain master letter templates and placeholders.',
      category: 'Compliance & Communications',
      allowedRoles: [UserRole.ADMIN],
    },
    {
      id: 'letters',
      label: 'HR Letter Generator',
      description: 'Generate, preview, verify, print, and issue official employee letters.',
      category: 'Compliance & Communications',
      allowedRoles: [UserRole.ADMIN, UserRole.HR],
    },
    {
      id: 'letter-history',
      label: 'Letter Generation History',
      description: 'Audit history of generated, dispatched, exported, and delivered letters.',
      category: 'Compliance & Communications',
      allowedRoles: [UserRole.ADMIN, UserRole.HR],
    },
    {
      id: 'mobile-app',
      label: 'Mobile App Management',
      description: 'Manage employee mobile app access, invitations, password resets, check-in permissions, and GPS tracking.',
      category: 'Governance & System',
      allowedRoles: [UserRole.ADMIN, UserRole.HR],
    },
    {
      id: 'activity-log',
      label: 'Activity & Audit Log',
      description: 'Complete system audit trail, Individual Permission Control, and permission change history.',
      category: 'Governance & System',
      allowedRoles: [UserRole.ADMIN, UserRole.HR],
    },
    {
      id: 'settings',
      label: 'Settings',
      description:
        role === UserRole.EMPLOYEE || role === UserRole.MANAGER
          ? 'Personal notification preferences, shift timings, and leave quota settings.'
          : 'Update shift timings, half-day rules, late policies, probation rules, and permissions.',
      category: 'Governance & System',
      allowedRoles: [UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.EMPLOYEE],
    },
  ];

  return all.filter((item) => item.allowedRoles.includes(role));
}

/**
 * STRICT RBAC DATA SCOPING FUNCTIONS
 * Admin & HR -> Complete access to all employees, managers, leaves, attendance, payroll, and settings
 * Manager -> Strictly only employees assigned to their team (e.managerId === actorEmployeeId) + their own data
 * Employee -> Only their own data
 */
export function isAssignedTeamMember(
  targetEmployee: { id: string; managerId?: string },
  managerEmployeeId: string
): boolean {
  return targetEmployee.managerId === managerEmployeeId && targetEmployee.id !== managerEmployeeId;
}

export function scopeEmployees(
  employees: Employee[],
  actorRole: UserRole,
  actorEmployeeId: string
): Employee[] {
  if (actorRole === UserRole.ADMIN || actorRole === UserRole.HR) {
    return employees;
  }
  if (actorRole === UserRole.MANAGER) {
    return employees.filter(
      (e) => e.id === actorEmployeeId || e.managerId === actorEmployeeId
    );
  }
  return employees.filter((e) => e.id === actorEmployeeId);
}

export function canViewEmployeeProfile(
  targetEmployee: Employee,
  actorRole: UserRole,
  actorEmployeeId: string
): boolean {
  if (actorRole === UserRole.ADMIN || actorRole === UserRole.HR) return true;
  if (actorRole === UserRole.MANAGER) {
    return (
      targetEmployee.id === actorEmployeeId ||
      targetEmployee.managerId === actorEmployeeId
    );
  }
  return targetEmployee.id === actorEmployeeId;
}

export function canViewEmployeePayroll(
  targetEmployee: Employee,
  actorRole: UserRole,
  actorEmployeeId: string,
  _settings: CompanySettings
): boolean {
  if (actorRole === UserRole.ADMIN || actorRole === UserRole.HR) return true;
  if (actorRole === UserRole.MANAGER) {
    return (
      targetEmployee.id === actorEmployeeId ||
      targetEmployee.managerId === actorEmployeeId
    );
  }
  if (targetEmployee.id === actorEmployeeId) return true;
  return false;
}

export function scopeAttendance(
  records: AttendanceRecord[],
  actorRole: UserRole,
  actorEmployeeId: string,
  activeModule?: string
): AttendanceRecord[] {
  if (actorRole === UserRole.ADMIN || actorRole === UserRole.HR) return records;
  if (actorRole === UserRole.MANAGER) {
    // Strict separation: in personal attendance module or personal dashboard, show ONLY Manager's own records.
    // Team records are accessible only through 'my-team'
    if (activeModule === 'my-team') {
      return records.filter(
        (r) => r.employeeId === actorEmployeeId || r.managerId === actorEmployeeId
      );
    }
    return records.filter((r) => r.employeeId === actorEmployeeId);
  }
  return records.filter((r) => r.employeeId === actorEmployeeId);
}

export function scopeLeaves(
  leaves: LeaveRequest[],
  actorRole: UserRole,
  actorEmployeeId: string,
  activeModule?: string
): LeaveRequest[] {
  if (actorRole === UserRole.ADMIN || actorRole === UserRole.HR) return leaves;
  if (actorRole === UserRole.MANAGER) {
    // Strict separation: Manager's Leave module must show ONLY Manager's own data.
    // Team members' requests are accessible strictly through 'approvals'
    if (activeModule === 'approvals') {
      return leaves.filter((l) => l.managerId === actorEmployeeId);
    }
    return leaves.filter((l) => l.employeeId === actorEmployeeId);
  }
  return leaves.filter((l) => l.employeeId === actorEmployeeId);
}

export function canApproveLeave(
  leave: LeaveRequest,
  actorRole: UserRole,
  actorEmployeeId: string
): boolean {
  const st = leave.status;
  if (st === 'Approved' || st === 'APPROVED' || st === 'Rejected' || st === 'REJECTED') {
    return false;
  }
  if (actorRole === UserRole.MANAGER) {
    return (
      leave.managerId === actorEmployeeId &&
      leave.employeeId !== actorEmployeeId &&
      (st === 'Pending' || (st as string) === 'Pending Manager' || st === 'PENDING_MANAGER')
    );
  }
  if (actorRole === UserRole.ADMIN || actorRole === UserRole.HR) {
    return true;
  }
  return false;
}

export function scopeConsiderations(
  considerations: ConsiderationRequest[],
  actorRole: UserRole,
  actorEmployeeId: string,
  activeModule?: string
): ConsiderationRequest[] {
  if (actorRole === UserRole.ADMIN || actorRole === UserRole.HR) return considerations;
  if (actorRole === UserRole.MANAGER) {
    // In personal module or dashboard, show only manager's own considerations.
    // In 'approvals', show team members' considerations.
    if (activeModule === 'approvals') {
      return considerations.filter((c) => c.managerId === actorEmployeeId);
    }
    return considerations.filter((c) => c.employeeId === actorEmployeeId);
  }
  return considerations.filter((c) => c.employeeId === actorEmployeeId);
}

export function canDecideConsideration(
  actorRole: UserRole,
  consideration?: ConsiderationRequest,
  actorEmployeeId?: string
): boolean {
  if (actorRole === UserRole.ADMIN || actorRole === UserRole.HR) return true;
  if (actorRole === UserRole.MANAGER) {
    if (!consideration || !actorEmployeeId) return true;
    const st = consideration.status;
    return (
      consideration.managerId === actorEmployeeId &&
      (st === 'Pending' || (st as string) === 'Pending Manager' || st === 'PENDING_MANAGER')
    );
  }
  return false;
}

export function scopePayrolls(
  payrolls: PayrollRecord[],
  actorRole: UserRole,
  actorEmployeeId: string,
  _settings: CompanySettings
): PayrollRecord[] {
  if (actorRole === UserRole.ADMIN || actorRole === UserRole.HR) return payrolls;
  if (actorRole === UserRole.MANAGER) {
    return payrolls.filter(
      (p) => p.employeeId === actorEmployeeId || p.managerId === actorEmployeeId
    );
  }
  return payrolls.filter((p) => p.employeeId === actorEmployeeId);
}

export function scopeDocuments(
  docs: EmployeeDocument[],
  actorRole: UserRole,
  actorEmployeeId: string,
  _settings: CompanySettings
): EmployeeDocument[] {
  if (actorRole === UserRole.ADMIN || actorRole === UserRole.HR) return docs;
  if (actorRole === UserRole.MANAGER) {
    return docs.filter(
      (d) => d.employeeId === actorEmployeeId || d.managerId === actorEmployeeId
    );
  }
  return docs.filter((d) => d.employeeId === actorEmployeeId);
}

export function scopeLetters(
  letters: GeneratedLetter[],
  actorRole: UserRole,
  actorEmployeeId: string,
  teamEmployeeIds: string[] = []
): GeneratedLetter[] {
  if (actorRole === UserRole.ADMIN || actorRole === UserRole.HR) return letters;
  if (actorRole === UserRole.MANAGER) {
    return letters.filter(
      (l) =>
        l.employeeId === actorEmployeeId || teamEmployeeIds.includes(l.employeeId)
    );
  }
  return letters.filter((l) => l.employeeId === actorEmployeeId);
}

export function scopePolicies(
  policies: CompanyPolicy[],
  actorRole: UserRole,
  actorDepartment: string
): CompanyPolicy[] {
  if (actorRole === UserRole.ADMIN || actorRole === UserRole.HR) return policies;
  return policies.filter(
    (p) =>
      (p.status === 'Active' || p.status === 'Published' || p.status === 'Updated') &&
      (p.targetDepartment === 'All Departments' || p.targetDepartment === actorDepartment)
  );
}

export function scopeAnnouncements(
  announcements: Announcement[],
  actorRole: UserRole,
  actorDepartment: string
): Announcement[] {
  if (actorRole === UserRole.ADMIN || actorRole === UserRole.HR) return announcements;
  return announcements.filter((a) => {
    if (a.targetAudience === 'Everyone') return true;
    return a.targetAudience === actorDepartment;
  });
}

export function scopeActivityLogs(
  logs: ActivityLogEntry[],
  actorRole: UserRole,
  targetEmployeeId?: string
): ActivityLogEntry[] {
  if (targetEmployeeId) {
    return logs.filter((l) => l.targetEmployeeId === targetEmployeeId);
  }
  if (actorRole === UserRole.ADMIN || actorRole === UserRole.HR) return logs;
  return [];
}
