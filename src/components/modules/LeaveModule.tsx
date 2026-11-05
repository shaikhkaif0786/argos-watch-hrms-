import React, { useState, useMemo } from 'react';
import {
  Plus,
  Check,
  X,
  AlertCircle,
  Clock,
  Filter,
  Calendar,
  User,
  ChevronRight,
  Shield,
  FileText,
  UserPlus,
  AlertTriangle,
} from 'lucide-react';
import { useHRMS } from '../../context/HRMSContext';
import {
  StatusBadge,
  AvatarInitials,
  ExportDropdown,
  ModalShell,
  ConfirmDialog,
  ActionMenu,
  SegmentedControl,
  SearchInput,
  KPICard,
  SlideOverDrawer,
} from '../ui/EnterpriseComponents';
import { LeaveType, LeaveRequest, UserRole } from '../../types/hrms';

type FilterStatusType = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

export function LeaveModule() {
  const {
    currentUser,
    currentEmployee,
    settings,
    leaves,
    employees,
    companyTiming,
    applyLeave,
    decideLeave,
    updateLeave,
    deleteLeave,
    approveLeave,
    rejectLeave,
    adjustEmployeeLeaveBalance,
    updateCompanySettings,
    hasPermission,
    switchWorkspace,
    canSwitchWorkspace,
    setActiveModule,
    t,
    addToast,
  } = useHRMS();

  // Simplified List Filters (Requirement 4: ALL, PENDING, APPROVED, REJECTED)
  const [filterStatus, setFilterStatus] = useState<FilterStatusType>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterDept, setFilterDept] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFiltersPopover, setShowFiltersPopover] = useState(false);

  // HR & Admin Organizational Leave Sub-Tab (Requirement 6)
  type AdminLeaveTab = 'REQUESTS' | 'DEPARTMENTS' | 'BALANCES' | 'CALENDAR_POLICY' | 'REPORTS';
  const [adminLeaveTab, setAdminLeaveTab] = useState<AdminLeaveTab>('REQUESTS');

  // Leave Balance Adjustment Modal State (HR / Admin)
  const [adjustingEmpId, setAdjustingEmpId] = useState<string | null>(null);
  const [adjCasualTotal, setAdjCasualTotal] = useState(12);
  const [adjCasualUsed, setAdjCasualUsed] = useState(0);
  const [adjSickTotal, setAdjSickTotal] = useState(8);
  const [adjSickUsed, setAdjSickUsed] = useState(0);
  const [adjEarnedTotal, setAdjEarnedTotal] = useState(15);
  const [adjEarnedUsed, setAdjEarnedUsed] = useState(0);
  const [adjReason, setAdjReason] = useState('');
  const [balanceSearch, setBalanceSearch] = useState('');

  // Policy Quota Form State (HR / Admin)
  const [policyCasualQuota, setPolicyCasualQuota] = useState(settings?.casualLeaveQuota ?? 12);
  const [policySickQuota, setPolicySickQuota] = useState(settings?.sickLeaveQuota ?? 8);
  const [policyEarnedQuota, setPolicyEarnedQuota] = useState(settings?.earnedLeaveQuota ?? 15);

  // Selected Record for Dedicated Detail Drawer (Requirement 3)
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);

  // Apply Leave Modal State
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [targetEmpId, setTargetEmpId] = useState<string>(currentUser.employeeId);
  const [onBehalfMode, setOnBehalfMode] = useState(false);
  const [employeeSearchFilter, setEmployeeSearchFilter] = useState('');
  const [leaveType, setLeaveType] = useState<LeaveType>('CASUAL');
  const [startDate, setStartDate] = useState('2026-10-12');
  const [endDate, setEndDate] = useState('2026-10-13');
  const [days, setDays] = useState(2);
  const [halfDaySession, setHalfDaySession] = useState<'FULL_DAY' | 'FIRST_HALF' | 'SECOND_HALF'>('FULL_DAY');
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [autoApprove, setAutoApprove] = useState(false);
  const [reason, setReason] = useState('');

  // Decision Modal State (Approve / Reject)
  const [reviewingLeave, setReviewingLeave] = useState<LeaveRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<'Approved' | 'Rejected'>('Approved');
  const [reviewNote, setReviewNote] = useState('');
  const [reviewError, setReviewError] = useState('');

  // Edit Leave Modal State
  const [editingLeave, setEditingLeave] = useState<LeaveRequest | null>(null);
  const [editLeaveType, setEditLeaveType] = useState<LeaveType>('CASUAL');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editDays, setEditDays] = useState(1);
  const [editReason, setEditReason] = useState('');

  // Delete Confirmation State
  const [deletingLeave, setDeletingLeave] = useState<LeaveRequest | null>(null);

  const isHRAdmin = currentUser.role === 'HR' || currentUser.role === 'ADMIN';
  const isManager = currentUser.role === 'MANAGER';
  const canAdjustBalance = isHRAdmin && hasPermission('leave.adjust_balance');

  const assignedTeamEmployees = useMemo(() => {
    if (isHRAdmin) return employees;
    if (isManager) {
      return employees.filter(
        (e) =>
          (e.managerId === currentUser.employeeId || e.reportingManager === currentUser.fullName) &&
          e.id !== currentUser.employeeId
      );
    }
    return [];
  }, [employees, isHRAdmin, isManager, currentUser.employeeId, currentUser.fullName]);

  const calculateDaysDuration = (start: string, end: string, isHalf: boolean) => {
    if (isHalf) return 0.5;
    if (!start || !end) return 1;
    const d1 = new Date(start);
    const d2 = new Date(end);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime()) || d2 < d1) return 1;
    const diffTime = d2.getTime() - d1.getTime();
    const diffDays = Math.round(diffTime / (1000 * 3600 * 24)) + 1;
    return diffDays > 0 ? diffDays : 1;
  };

  const departments = useMemo<string[]>(() => {
    const set = new Set<string>(employees.map((e) => e.department));
    return ['ALL', ...Array.from(set)];
  }, [employees]);

  // Scoped list based on RBAC
  const scopedLeaves = useMemo(() => {
    let base = leaves;
    if (isHRAdmin) {
      base = leaves;
    } else if (isManager) {
      base = leaves.filter(
        (l) =>
          l.employeeId === currentUser.employeeId ||
          (l as any).managerId === currentUser.employeeId ||
          assignedTeamEmployees.some((e) => e.id === l.employeeId)
      );
    } else {
      base = leaves.filter((l) => l.employeeId === currentUser.employeeId);
    }

    const filtered = base.filter((l) => {
      const matchStatus =
        filterStatus === 'ALL' ||
        (filterStatus === 'PENDING' &&
          (l.status === 'PENDING_MANAGER' ||
            l.status === 'PENDING_HR' ||
            l.status === 'Pending' ||
            l.status === 'PENDING')) ||
        (filterStatus === 'APPROVED' &&
          (l.status === 'APPROVED' || l.status === 'Approved')) ||
        (filterStatus === 'REJECTED' &&
          (l.status === 'REJECTED' || l.status === 'Rejected'));

      const matchType = filterType === 'ALL' || l.leaveType === filterType;
      const matchDept = filterDept === 'ALL' || l.department === filterDept;

      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        l.employeeName.toLowerCase().includes(q) ||
        l.leaveType.toLowerCase().includes(q) ||
        l.reason.toLowerCase().includes(q) ||
        l.department.toLowerCase().includes(q) ||
        (l.appliedBy && l.appliedBy.toLowerCase().includes(q));

      return matchStatus && matchType && matchDept && matchSearch;
    });

    return [...filtered].sort((a, b) => {
      const dateA = a.appliedOn || a.startDate;
      const dateB = b.appliedOn || b.startDate;
      return dateB.localeCompare(dateA);
    });
  }, [leaves, isHRAdmin, currentUser.employeeId, filterStatus, filterType, filterDept, searchQuery]);

  // Status counts for segmented control
  const statusCounts = useMemo(() => {
    const base = isHRAdmin
      ? leaves
      : isManager
      ? leaves.filter(
          (l) =>
            l.employeeId === currentUser.employeeId ||
            (l as any).managerId === currentUser.employeeId ||
            assignedTeamEmployees.some((e) => e.id === l.employeeId)
        )
      : leaves.filter((l) => l.employeeId === currentUser.employeeId);
    return {
      all: base.length,
      pending: base.filter(
        (l) =>
          l.status === 'PENDING_MANAGER' ||
          l.status === 'PENDING_HR' ||
          l.status === 'Pending' ||
          l.status === 'PENDING'
      ).length,
      approved: base.filter((l) => l.status === 'APPROVED' || l.status === 'Approved').length,
      rejected: base.filter((l) => l.status === 'REJECTED' || l.status === 'Rejected').length,
    };
  }, [leaves, isHRAdmin, currentUser.employeeId]);

  // Leave Entitlement calculations
  const casualQuota =
    currentEmployee?.leaveBalance?.casualTotal ?? settings?.casualLeaveQuota ?? 12;
  const sickQuota =
    currentEmployee?.leaveBalance?.sickTotal ?? settings?.sickLeaveQuota ?? 8;
  const earnedQuota =
    currentEmployee?.leaveBalance?.earnedTotal ?? settings?.earnedLeaveQuota ?? 15;
  const totalQuota = casualQuota + sickQuota + earnedQuota;

  const remCasual = Math.max(
    0,
    casualQuota - (currentEmployee?.leaveBalance?.casualUsed ?? 0)
  );
  const remSick = Math.max(
    0,
    sickQuota - (currentEmployee?.leaveBalance?.sickUsed ?? 0)
  );
  const remEarned = Math.max(
    0,
    earnedQuota - (currentEmployee?.leaveBalance?.earnedUsed ?? 0)
  );
  const totalRemaining = remCasual + remSick + remEarned;
  const totalUtilized = Math.max(0, totalQuota - totalRemaining);

  const openApplyModal = (behalf = false) => {
    setOnBehalfMode(behalf);
    setEmployeeSearchFilter('');
    if (behalf) {
      const pool = isManager ? assignedTeamEmployees : employees;
      const otherEmp = pool.find((e) => e.id !== currentUser.employeeId) || pool[0];
      setTargetEmpId(otherEmp?.id || currentUser.employeeId);
      setAutoApprove(isHRAdmin);
    } else {
      setTargetEmpId(currentUser.employeeId);
      setAutoApprove(isHRAdmin);
    }
    setLeaveType('CASUAL');
    setStartDate('2026-10-12');
    setEndDate('2026-10-12');
    setDays(1);
    setHalfDaySession('FULL_DAY');
    setIsHalfDay(false);
    setReason('');
    setShowApplyModal(true);
  };

  const handleSessionChange = (session: 'FULL_DAY' | 'FIRST_HALF' | 'SECOND_HALF') => {
    setHalfDaySession(session);
    if (session !== 'FULL_DAY') {
      setIsHalfDay(true);
      setDays(0.5);
      setEndDate(startDate);
    } else {
      setIsHalfDay(false);
      setDays(calculateDaysDuration(startDate, endDate, false));
    }
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    const isBehalf = onBehalfMode && (isHRAdmin || isManager);
    applyLeave({
      targetEmployeeId: isBehalf ? targetEmpId : currentUser.employeeId,
      leaveType,
      startDate,
      endDate: isHalfDay ? startDate : endDate,
      days: isHalfDay ? 0.5 : Number(days),
      halfDaySession,
      reason,
      isHalfDay,
      autoApprove: isHRAdmin ? autoApprove : false,
    });
    setShowApplyModal(false);
    setReason('');
  };

  const canActOnLeave = (l: LeaveRequest) => {
    if (l.status === 'APPROVED' || l.status === 'REJECTED') return false;
    if (isManager) {
      return (
        l.employeeId !== currentUser.employeeId &&
        (l as any).managerId === currentUser.employeeId &&
        l.status === 'PENDING_MANAGER'
      );
    }
    if (isHRAdmin) return true;
    return false;
  };

  const openReviewModal = (l: LeaveRequest, action: 'Approved' | 'Rejected') => {
    setReviewingLeave(l);
    setReviewAction(action);
    setReviewNote(
      action === 'Approved'
        ? isManager
          ? `Approved by Manager ${currentUser.fullName} and forwarded to HR for final review.`
          : `Final HR approval granted by ${currentUser.fullName}.`
        : ''
    );
    setReviewError('');
  };

  const handleConfirmReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingLeave) return;
    if (reviewAction === 'Rejected' && !reviewNote.trim()) {
      setReviewError('Please provide a mandatory reason when rejecting this leave request.');
      return;
    }
    decideLeave(
      reviewingLeave.id,
      reviewAction,
      reviewNote.trim() ||
        (reviewAction === 'Approved'
          ? isManager
            ? `Approved by Manager ${currentUser.fullName} and forwarded to HR.`
            : `Approved by HR (${currentUser.fullName}).`
          : 'Rejected')
    );
    if (selectedLeave?.id === reviewingLeave.id) {
      setSelectedLeave(null);
    }
    setReviewingLeave(null);
    setReviewNote('');
    setReviewError('');
  };

  const canModifyLeave = (l: LeaveRequest) => {
    if (isHRAdmin) return true;
    if (l.employeeId === currentUser.employeeId && l.status === 'PENDING_MANAGER') return true;
    return false;
  };

  const openEditLeave = (l: LeaveRequest) => {
    setEditingLeave(l);
    setEditLeaveType(l.leaveType as LeaveType);
    setEditStartDate(l.startDate);
    setEditEndDate(l.endDate);
    setEditDays(l.days);
    setEditReason(l.reason);
  };

  const handleSaveEditLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLeave) return;
    updateLeave(editingLeave.id, {
      leaveType: editLeaveType,
      startDate: editStartDate,
      endDate: editEndDate,
      days: Number(editDays),
      reason: editReason,
    });
    if (selectedLeave?.id === editingLeave.id) {
      setSelectedLeave({
        ...selectedLeave,
        leaveType: editLeaveType,
        startDate: editStartDate,
        endDate: editEndDate,
        days: Number(editDays),
        reason: editReason,
      });
    }
    setEditingLeave(null);
  };

  // Find employee record for detail view
  const selectedEmp = useMemo(() => {
    if (!selectedLeave) return null;
    return (
      employees.find((e) => e.id === selectedLeave.employeeId) || {
        fullName: selectedLeave.employeeName,
        designation: 'Enterprise Staff',
        department: selectedLeave.department,
        reportingManager: 'Operations Head',
        leaveBalance: {
          casualTotal: 12,
          casualUsed: 2,
          sickTotal: 8,
          sickUsed: 1,
          earnedTotal: 15,
          earnedUsed: 3,
        },
      }
    );
  }, [selectedLeave, employees]);

  // Organization-wide Leave Stats for HR & Admin
  const orgLeaveStats = useMemo(() => {
    const approvedDays = leaves
      .filter((l) => l.status === 'APPROVED' || l.status === 'Approved')
      .reduce((acc, l) => acc + (Number(l.days) || 0), 0);
    const uniqueEmpsWithLeave = new Set(leaves.map((l) => l.employeeId)).size;

    const deptNames: string[] = Array.from(new Set<string>(employees.map((e) => String(e.department))));
    const deptSummary = deptNames.map((dept: string) => {
      const deptEmps = employees.filter((e) => e.department === dept);
      const deptLeaves = leaves.filter((l) => l.department === dept);
      const pending = deptLeaves.filter(
        (l) =>
          l.status === 'PENDING_MANAGER' ||
          l.status === 'PENDING_HR' ||
          l.status === 'Pending' ||
          l.status === 'PENDING'
      ).length;
      const approved = deptLeaves.filter(
        (l) => l.status === 'APPROVED' || l.status === 'Approved'
      ).length;
      const totalDays = deptLeaves
        .filter((l) => l.status === 'APPROVED' || l.status === 'Approved')
        .reduce((s, r) => s + (Number(r.days) || 0), 0);
      return {
        department: dept,
        headcount: deptEmps.length,
        totalRequests: deptLeaves.length,
        pending,
        approved,
        totalDays,
      };
    });

    return {
      approvedDays,
      uniqueEmpsWithLeave,
      deptSummary,
    };
  }, [leaves, employees]);

  const openAdjustBalanceModal = (emp: typeof employees[0]) => {
    setAdjustingEmpId(emp.id);
    setAdjCasualTotal(emp.leaveBalance?.casualTotal ?? settings?.casualLeaveQuota ?? 12);
    setAdjCasualUsed(emp.leaveBalance?.casualUsed ?? 0);
    setAdjSickTotal(emp.leaveBalance?.sickTotal ?? settings?.sickLeaveQuota ?? 8);
    setAdjSickUsed(emp.leaveBalance?.sickUsed ?? 0);
    setAdjEarnedTotal(emp.leaveBalance?.earnedTotal ?? settings?.earnedLeaveQuota ?? 15);
    setAdjEarnedUsed(emp.leaveBalance?.earnedUsed ?? 0);
    setAdjReason('');
  };

  const handleSaveBalanceAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingEmpId) return;
    if (!adjReason.trim()) {
      addToast('Reason Required', 'Please provide an audit reason for this leave balance adjustment.', 'error');
      return;
    }
    adjustEmployeeLeaveBalance(
      adjustingEmpId,
      {
        casualTotal: Number(adjCasualTotal),
        casualUsed: Number(adjCasualUsed),
        sickTotal: Number(adjSickTotal),
        sickUsed: Number(adjSickUsed),
        earnedTotal: Number(adjEarnedTotal),
        earnedUsed: Number(adjEarnedUsed),
      },
      adjReason.trim()
    );
    setAdjustingEmpId(null);
  };

  const handleSavePolicyQuotas = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompanySettings({
      casualLeaveQuota: Number(policyCasualQuota),
      sickLeaveQuota: Number(policySickQuota),
      earnedLeaveQuota: Number(policyEarnedQuota),
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
            {isHRAdmin
              ? 'Organizational Leave Administration'
              : t('leave.title', 'Leave')}
          </h1>
          <p className="text-xs sm:text-sm text-[#6E6E73] dark:text-[#A1A1A6] mt-0.5">
            {isHRAdmin
              ? 'Oversee company-wide leave approvals, employee balances, department leave schedules, and leave policies'
              : t('leave.subtitle', 'Manage employee leaves, balances, request submissions, and approval status')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <ExportDropdown
            data={scopedLeaves}
            filename={`argos_leaves_${new Date().toISOString().slice(0, 10)}`}
            title="Leave Ledger"
          />

          {isHRAdmin ? (
            <>
              {canAdjustBalance && (
                <button
                  type="button"
                  onClick={() => openApplyModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#164C38] hover:bg-[#0F3627] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Record Employee Leave</span>
                </button>
              )}
              {canSwitchWorkspace && (
                <button
                  type="button"
                  onClick={() => switchWorkspace('OWN')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#F0F0F2] dark:bg-[#242426] hover:bg-[#E5E5EA] text-[#1D1D1F] dark:text-[#F5F5F7] border border-[#E5E5EA] dark:border-[#3A3A3C] text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  title="Switch to Own Workspace to apply for personal leave"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>My Personal Leave (Own View)</span>
                </button>
              )}
            </>
          ) : (
            <>
              {isManager && (
                <button
                  type="button"
                  onClick={() => openApplyModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#F0F0F2] dark:bg-[#242426] hover:bg-[#E5E5EA] dark:hover:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] border border-[#E5E5EA] dark:border-[#3A3A3C] text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Submit Leave for Team Member</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => openApplyModal(false)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#000000] hover:bg-[#1C1C1E] dark:bg-white dark:hover:bg-[#E5E5EA] text-white dark:text-[#000000] text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('leave.applyLeave', 'Apply Leave')}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Summary Cards: Organizational for HR/Admin vs Personal for Employee/Own */}
      {isHRAdmin ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <KPICard
            label="Pending Leave Approvals"
            value={statusCounts.pending}
            subtext="Awaiting Manager / HR sign-off"
            accent="primary"
            onClick={() => {
              setAdminLeaveTab('REQUESTS');
              setFilterStatus('PENDING');
            }}
          />
          <KPICard
            label="Total Leave Records"
            value={statusCounts.all}
            subtext={`${orgLeaveStats.uniqueEmpsWithLeave} employees in ledger`}
            onClick={() => {
              setAdminLeaveTab('REQUESTS');
              setFilterStatus('ALL');
            }}
          />
          <KPICard
            label="Approved Leave Days"
            value={`${orgLeaveStats.approvedDays} d`}
            subtext={`${statusCounts.approved} approved requests`}
            onClick={() => {
              setAdminLeaveTab('REQUESTS');
              setFilterStatus('APPROVED');
            }}
          />
          <KPICard
            label="Standard Annual Quota"
            value={`${(settings?.casualLeaveQuota ?? 12) + (settings?.sickLeaveQuota ?? 8) + (settings?.earnedLeaveQuota ?? 15)} d`}
            subtext={`${settings?.casualLeaveQuota ?? 12} CL · ${settings?.sickLeaveQuota ?? 8} SL · ${settings?.earnedLeaveQuota ?? 15} EL`}
            onClick={() => setAdminLeaveTab('CALENDAR_POLICY')}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <KPICard
            label={t('leave.remaining', 'Remaining Balance')}
            value={`${totalRemaining} d`}
            subtext={`${remCasual} CL · ${remSick} SL · ${remEarned} EL`}
            accent="primary"
          />
          <KPICard
            label={t('leave.entitlement', 'Total Entitlement')}
            value={`${totalQuota} d`}
            subtext="Annual allotted quota"
          />
          <KPICard
            label={t('leave.used', 'Leaves Utilized')}
            value={`${totalUtilized} d`}
            subtext="Approved leave days"
          />
          <KPICard
            label="Pending Approvals"
            value={statusCounts.pending}
            subtext="Awaiting review"
            onClick={() => setFilterStatus('PENDING')}
          />
        </div>
      )}

      {/* HR & Admin Organizational Leave Navigation Bar */}
      {isHRAdmin && (
        <div className="flex flex-wrap items-center gap-1.5 bg-white dark:bg-[#161618] border border-[#E5E5EA] dark:border-[#2C2C2E] p-1.5 rounded-2xl">
          {[
            { id: 'REQUESTS', label: 'Approvals & Employee Records', badge: statusCounts.pending },
            { id: 'DEPARTMENTS', label: 'Department Leave Overview' },
            { id: 'BALANCES', label: 'Leave Balance & Adjustments' },
            { id: 'CALENDAR_POLICY', label: 'Leave Calendar & Policy' },
            { id: 'REPORTS', label: 'Leave Reports' },
          ].map((tab) => {
            const active = adminLeaveTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setAdminLeaveTab(tab.id as AdminLeaveTab)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  active
                    ? 'bg-[#164C38] text-white shadow-xs'
                    : 'text-[#525854] hover:text-[#141A17] hover:bg-[#F2F2F2]'
                }`}
              >
                <span>{tab.label}</span>
                {typeof tab.badge === 'number' && tab.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      active ? 'bg-white/20 text-white' : 'bg-[#164C38]/10 text-[#164C38]'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* HR/Admin Tab 2: Department Leave Overview */}
      {isHRAdmin && adminLeaveTab === 'DEPARTMENTS' && (
        <div className="bg-white border border-[#E5E5EA] rounded-2xl overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-[#E5E5EA] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#141A17]">
                Team & Department Leave Overview
              </h3>
              <p className="text-xs text-[#525854]">
                Compare leave volume, pending approvals, and total utilized leave days across departments.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAFAFC] border-b border-[#E5E5EA] text-[11px] font-semibold text-[#525854]">
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Active Staff</th>
                  <th className="py-3 px-4">Total Requests</th>
                  <th className="py-3 px-4">Pending Approvals</th>
                  <th className="py-3 px-4">Approved Requests</th>
                  <th className="py-3 px-4">Utilized Leave Days</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5EA]">
                {orgLeaveStats.deptSummary.map((row) => (
                  <tr key={row.department} className="hover:bg-[#F5F5F7]">
                    <td className="py-3 px-4 font-bold text-[#141A17]">{row.department}</td>
                    <td className="py-3 px-4 font-mono">{row.headcount}</td>
                    <td className="py-3 px-4 font-mono">{row.totalRequests}</td>
                    <td className="py-3 px-4">
                      {row.pending > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold text-[11px]">
                          {row.pending} Pending
                        </span>
                      ) : (
                        <span className="text-[#525854]">0</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono">{row.approved}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-[#164C38]">
                      {row.totalDays} days
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setFilterDept(row.department);
                          setAdminLeaveTab('REQUESTS');
                        }}
                        className="text-xs font-semibold text-[#164C38] hover:underline cursor-pointer"
                      >
                        View Records →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* HR/Admin Tab 3: Leave Balance Management & Adjustments */}
      {isHRAdmin && adminLeaveTab === 'BALANCES' && (
        <div className="bg-white border border-[#E5E5EA] rounded-2xl overflow-hidden shadow-2xs space-y-4 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#141A17]">
                Employee Leave Balance & Adjustment Ledger
              </h3>
              <p className="text-xs text-[#525854]">
                Inspect casual, sick, and earned leave balances for every employee and make audited balance adjustments.
              </p>
            </div>
            <SearchInput
              value={balanceSearch}
              onChange={setBalanceSearch}
              placeholder="Search employee name, ID, or department..."
              className="w-full sm:w-72"
            />
          </div>

          <div className="overflow-x-auto border border-[#E5E5EA] rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAFAFC] border-b border-[#E5E5EA] text-[11px] font-semibold text-[#525854]">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Casual (Rem / Total)</th>
                  <th className="py-3 px-4">Sick (Rem / Total)</th>
                  <th className="py-3 px-4">Earned (Rem / Total)</th>
                  <th className="py-3 px-4">Total Available</th>
                  <th className="py-3 px-4 text-right">Balance Correction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5EA]">
                {employees
                  .filter((e) => {
                    if (!balanceSearch.trim()) return true;
                    const q = balanceSearch.toLowerCase();
                    return (
                      e.fullName.toLowerCase().includes(q) ||
                      e.id.toLowerCase().includes(q) ||
                      e.department.toLowerCase().includes(q)
                    );
                  })
                  .map((emp) => {
                    const cTot = emp.leaveBalance?.casualTotal ?? settings?.casualLeaveQuota ?? 12;
                    const cUsed = emp.leaveBalance?.casualUsed ?? 0;
                    const sTot = emp.leaveBalance?.sickTotal ?? settings?.sickLeaveQuota ?? 8;
                    const sUsed = emp.leaveBalance?.sickUsed ?? 0;
                    const eTot = emp.leaveBalance?.earnedTotal ?? settings?.earnedLeaveQuota ?? 15;
                    const eUsed = emp.leaveBalance?.earnedUsed ?? 0;
                    const remC = Math.max(0, cTot - cUsed);
                    const remS = Math.max(0, sTot - sUsed);
                    const remE = Math.max(0, eTot - eUsed);

                    return (
                      <tr key={emp.id} className="hover:bg-[#F5F5F7]">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[#141A17]">{emp.fullName}</div>
                          <div className="text-[11px] text-[#525854] font-mono">{emp.id} · {emp.designation}</div>
                        </td>
                        <td className="py-3 px-4 text-[#525854]">{emp.department}</td>
                        <td className="py-3 px-4 font-mono">
                          <span className="font-bold text-[#141A17]">{remC}</span> / {cTot} d
                        </td>
                        <td className="py-3 px-4 font-mono">
                          <span className="font-bold text-[#141A17]">{remS}</span> / {sTot} d
                        </td>
                        <td className="py-3 px-4 font-mono">
                          <span className="font-bold text-[#141A17]">{remE}</span> / {eTot} d
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-[#164C38]">
                          {remC + remS + remE} days
                        </td>
                        <td className="py-3 px-4 text-right">
                          {canAdjustBalance ? (
                            <button
                              type="button"
                              onClick={() => openAdjustBalanceModal(emp)}
                              className="px-3 py-1.5 rounded-lg bg-[#F2F2F2] hover:bg-[#164C38] hover:text-white text-[#141A17] font-semibold text-xs transition-colors cursor-pointer"
                            >
                              Adjust Balance
                            </button>
                          ) : (
                            <span className="text-[11px] text-[#525854]">View Only</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* HR/Admin Tab 4: Leave Calendar & Policy Management */}
      {isHRAdmin && adminLeaveTab === 'CALENDAR_POLICY' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white border border-[#E5E5EA] rounded-2xl p-4 space-y-3">
            <div>
              <h3 className="text-sm font-bold text-[#141A17]">
                Organizational Leave Calendar
              </h3>
              <p className="text-xs text-[#525854]">
                Chronological schedule of approved and pending employee absences across departments.
              </p>
            </div>
            <div className="divide-y divide-[#E5E5EA]">
              {leaves.length === 0 ? (
                <p className="text-xs text-[#525854] py-6 text-center">No scheduled leaves recorded.</p>
              ) : (
                leaves.slice(0, 12).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedLeave(item)}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-[#F5F5F7] px-2 rounded-lg cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#164C38]/10 text-[#164C38] flex flex-col items-center justify-center font-mono text-[10px] font-bold">
                        <span>{item.startDate.slice(5, 7)}/{item.startDate.slice(8, 10)}</span>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#141A17]">{item.employeeName}</div>
                        <div className="text-[11px] text-[#525854]">
                          {item.department} · {item.leaveType} ({item.days} d)
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-[#525854]">
                        {item.startDate === item.endDate ? item.startDate : `${item.startDate} → ${item.endDate}`}
                      </span>
                      <StatusBadge status={item.status} size="sm" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white border border-[#E5E5EA] rounded-2xl p-4 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-[#141A17]">
                Leave Policy Quotas
              </h3>
              <p className="text-xs text-[#525854]">
                Configure default annual leave entitlements for Casual, Sick, and Earned leaves.
              </p>
            </div>
            <form onSubmit={handleSavePolicyQuotas} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#141A17] mb-1">
                  Annual Casual Leave (CL) Quota
                </label>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={policyCasualQuota}
                  onChange={(e) => setPolicyCasualQuota(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-xl text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#141A17] mb-1">
                  Annual Sick Leave (SL) Quota
                </label>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={policySickQuota}
                  onChange={(e) => setPolicySickQuota(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-xl text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#141A17] mb-1">
                  Annual Earned / Privilege Leave (EL) Quota
                </label>
                <input
                  type="number"
                  min={0}
                  max={90}
                  value={policyEarnedQuota}
                  onChange={(e) => setPolicyEarnedQuota(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-xl text-xs font-mono"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-[#164C38] hover:bg-[#0F3627] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Save Leave Policy Quotas
              </button>
            </form>
          </div>
        </div>
      )}

      {/* HR/Admin Tab 5: Leave Reports */}
      {isHRAdmin && adminLeaveTab === 'REPORTS' && (
        <div className="bg-white border border-[#E5E5EA] rounded-2xl p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#141A17]">
                Organizational Leave Utilization Report
              </h3>
              <p className="text-xs text-[#525854]">
                Complete audit report of leave requests, approval statuses, and utilized leave days across all employees.
              </p>
            </div>
            <ExportDropdown
              data={leaves}
              filename={`argos_org_leave_report_${new Date().toISOString().slice(0, 10)}`}
              title="Organizational Leave Report"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB]">
              <span className="text-[10px] font-bold uppercase text-[#525854] block">Casual Leave Requests</span>
              <span className="text-lg font-bold font-mono text-[#141A17]">
                {leaves.filter((l) => l.leaveType === 'CASUAL').length}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB]">
              <span className="text-[10px] font-bold uppercase text-[#525854] block">Sick Leave Requests</span>
              <span className="text-lg font-bold font-mono text-[#141A17]">
                {leaves.filter((l) => l.leaveType === 'SICK').length}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB]">
              <span className="text-[10px] font-bold uppercase text-[#525854] block">Earned Leave Requests</span>
              <span className="text-lg font-bold font-mono text-[#141A17]">
                {leaves.filter((l) => l.leaveType === 'EARNED').length}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB]">
              <span className="text-[10px] font-bold uppercase text-[#525854] block">Unpaid / LOP Requests</span>
              <span className="text-lg font-bold font-mono text-[#141A17]">
                {leaves.filter((l) => l.leaveType === 'UNPAID').length}
              </span>
            </div>
          </div>
        </div>
      )}

      {(!isHRAdmin || adminLeaveTab === 'REQUESTS' || adminLeaveTab === 'REPORTS') && (
      <>
      {/* Clean Filter Bar (Requirement 4: Scannable, fits screen without horizontal scroll) */}
      <div className="bg-white dark:bg-[#161618] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-2xl p-3.5 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Simple Clean Status Tabs: All, Pending, Approved, Rejected */}
          <SegmentedControl<FilterStatusType>
            value={filterStatus}
            onChange={(val) => setFilterStatus(val)}
            items={[
              { id: 'ALL', label: t('status.all', 'All'), count: statusCounts.all },
              { id: 'PENDING', label: t('status.pending', 'Pending'), count: statusCounts.pending },
              { id: 'APPROVED', label: t('status.approved', 'Approved'), count: statusCounts.approved },
              { id: 'REJECTED', label: t('status.rejected', 'Rejected'), count: statusCounts.rejected },
            ]}
          />

          {/* Search Field & Filter Toggle */}
          <div className="flex items-center gap-2">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search employee, reason, department..."
              className="flex-1 sm:w-72"
            />

            <button
              type="button"
              onClick={() => setShowFiltersPopover(!showFiltersPopover)}
              className={`p-2 rounded-xl border text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                filterType !== 'ALL' || filterDept !== 'ALL'
                  ? 'border-[#1D1D1F] dark:border-[#F5F5F7] bg-[#F0F0F2] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7]'
                  : 'border-[#E5E5EA] dark:border-[#2C2C2E] text-[#6E6E73] dark:text-[#A1A1A6] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
              }`}
              title="More filters"
            >
              <Filter className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filters</span>
            </button>
          </div>
        </div>

        {/* Collapsible Secondary Filters */}
        {showFiltersPopover && (
          <div className="pt-3 border-t border-[#E5E5EA] dark:border-[#2C2C2E] flex flex-wrap items-center gap-3 animate-in fade-in duration-100">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#6E6E73] dark:text-[#A1A1A6]">Type:</span>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-2.5 py-1.5 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl text-xs text-[#1D1D1F] dark:text-[#F5F5F7] outline-none"
              >
                <option value="ALL">All Types</option>
                <option value="CASUAL">Casual Leave</option>
                <option value="SICK">Sick Leave</option>
                <option value="EARNED">Earned Leave</option>
                <option value="UNPAID">Loss of Pay</option>
              </select>
            </div>

            {isHRAdmin && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#6E6E73] dark:text-[#A1A1A6]">Department:</span>
                <select
                  value={filterDept}
                  onChange={(e) => setFilterDept(e.target.value)}
                  className="px-2.5 py-1.5 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl text-xs text-[#1D1D1F] dark:text-[#F5F5F7] outline-none"
                >
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d === 'ALL' ? 'All Departments' : d}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(filterType !== 'ALL' || filterDept !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setFilterType('ALL');
                  setFilterDept('ALL');
                }}
                className="text-xs text-[#6E6E73] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] underline cursor-pointer"
              >
                Reset filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Leave Request List — Scannable, Responsive, and Clickable (Requirement 3 & 4) */}
      <div className="bg-white dark:bg-[#161618] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-2xl overflow-hidden shadow-2xs">
        {scopedLeaves.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#F0F0F2] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#2C2C2E] flex items-center justify-center text-[#6E6E73] mb-3">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
              No leave requests found
            </h3>
            <p className="text-xs text-[#6E6E73] dark:text-[#A1A1A6] mt-1">
              {filterStatus !== 'ALL'
                ? `No requests match the ${filterStatus.toLowerCase()} status filter.`
                : 'No leave applications on record.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop / Tablet Table View (Fits viewport without horizontal scroll) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E5EA] dark:border-[#2C2C2E] text-[11px] font-medium tracking-tight text-[#6E6E73] dark:text-[#A1A1A6] bg-[#FAFAFC] dark:bg-[#1A1A1C]">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Leave Type</th>
                    <th className="py-3 px-4">Dates</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E] text-xs">
                  {scopedLeaves.map((l) => (
                    <tr
                      key={l.id}
                      onClick={() => setSelectedLeave(l)}
                      className="hover:bg-[#F5F5F7] dark:hover:bg-[#1C1C1E] transition-colors cursor-pointer group"
                    >
                      {/* Employee name and designation */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <AvatarInitials name={l.employeeName} size="sm" />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] group-hover:underline">
                              <span>{l.employeeName}</span>
                              {(l.appliedBy?.includes('Submitted by Manager on behalf of Employee') || (l as any).submittedByManager) && (
                                <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[10px] font-semibold">
                                  Submitted by Manager on behalf of Employee
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#6E6E73] dark:text-[#A1A1A6] truncate">
                              {l.department} · {l.employeeId}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Leave Type */}
                      <td className="py-3.5 px-4 font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                        {l.leaveType}
                      </td>

                      {/* Date Range */}
                      <td className="py-3.5 px-4 font-mono text-xs text-[#6E6E73] dark:text-[#A1A1A6]">
                        {l.startDate === l.endDate ? l.startDate : `${l.startDate} → ${l.endDate}`}
                      </td>

                      {/* Duration */}
                      <td className="py-3.5 px-4 font-mono font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                        {l.days} {l.days === 1 ? 'day' : 'days'}
                        {l.isHalfDay && (
                          <span className="text-[10px] text-[#86868B] block font-sans">
                            {l.halfDaySession === 'FIRST_HALF' ? '1st Half' : '2nd Half'}
                          </span>
                        )}
                      </td>

                      {/* Compact Status */}
                      <td className="py-3.5 px-4">
                        <StatusBadge status={l.status} size="sm" />
                      </td>

                      {/* Actions */}
                      <td
                        className="py-3.5 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          {canActOnLeave(l) && (
                            <>
                              <button
                                type="button"
                                onClick={() => openReviewModal(l, 'Approved')}
                                className="px-2.5 py-1 bg-[#000000] dark:bg-white text-white dark:text-[#000000] text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity cursor-pointer inline-flex items-center gap-1"
                              >
                                <Check className="w-3 h-3" />
                                <span>Approve</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => openReviewModal(l, 'Rejected')}
                                className="px-2.5 py-1 bg-[#F0F0F2] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] text-[#1D1D1F] dark:text-[#F5F5F7] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          <ActionMenu
                            items={[
                              {
                                label: 'View Full Details',
                                icon: <FileText className="w-3.5 h-3.5" />,
                                onClick: () => setSelectedLeave(l),
                              },
                              {
                                label: 'Edit Request',
                                disabled: !canModifyLeave(l),
                                onClick: () => openEditLeave(l),
                              },
                              {
                                label: 'Delete Request',
                                variant: 'danger',
                                disabled: !canModifyLeave(l),
                                onClick: () => setDeletingLeave(l),
                              },
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards (Requirement 4: Vertical scannable layout) */}
            <div className="sm:hidden divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E]">
              {scopedLeaves.map((l) => (
                <div
                  key={l.id}
                  onClick={() => setSelectedLeave(l)}
                  className="p-4 space-y-2.5 active:bg-[#F5F5F7] dark:active:bg-[#1C1C1E] transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-sm text-[#1D1D1F] dark:text-[#F5F5F7] flex flex-wrap items-center gap-1.5">
                        <span>{l.employeeName}</span>
                        {(l.appliedBy?.includes('Submitted by Manager on behalf of Employee') || (l as any).submittedByManager) && (
                          <span className="px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[9px] font-semibold">
                            Submitted by Manager on behalf of Employee
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#6E6E73] dark:text-[#A1A1A6]">
                        {l.department} · {l.leaveType}
                      </div>
                    </div>
                    <StatusBadge status={l.status} size="sm" />
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono text-[#6E6E73] dark:text-[#A1A1A6] pt-1">
                    <span>{l.startDate === l.endDate ? l.startDate : `${l.startDate} – ${l.endDate}`}</span>
                    <span className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                      {l.days} {l.days === 1 ? 'day' : 'days'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-[#86868B] line-clamp-1 italic">
                      "{l.reason}"
                    </span>
                    <ChevronRight className="w-4 h-4 text-[#86868B] shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      </>
      )}

      {/* ===================================================================== */}
      {/* REQUIREMENT 3: DEDICATED LEAVE DETAIL DRAWER                           */}
      {/* ===================================================================== */}
      <SlideOverDrawer
        open={!!selectedLeave}
        onClose={() => setSelectedLeave(null)}
        title="Leave Request Details"
        subtitle={selectedLeave ? `ID: ${selectedLeave.id}` : ''}
        footer={
          selectedLeave && canActOnLeave(selectedLeave) ? (
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => openReviewModal(selectedLeave, 'Rejected')}
                className="px-4 py-2 bg-[#F0F0F2] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] text-[#1D1D1F] dark:text-[#F5F5F7] rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Reject Request
              </button>
              <button
                type="button"
                onClick={() => openReviewModal(selectedLeave, 'Approved')}
                className="px-4 py-2 bg-[#000000] dark:bg-white text-white dark:text-[#000000] rounded-xl text-xs font-semibold transition-opacity hover:opacity-90 cursor-pointer"
              >
                Approve Request
              </button>
            </div>
          ) : undefined
        }
      >
        {selectedLeave && (
          <div className="space-y-6">
            {/* Status & Type Bar */}
            <div className="p-4 rounded-2xl bg-[#F0F0F2] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-medium uppercase tracking-wider text-[#6E6E73] dark:text-[#A1A1A6] block">
                  Current Status
                </span>
                <div className="mt-1">
                  <StatusBadge status={selectedLeave.status} size="md" />
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-medium uppercase tracking-wider text-[#6E6E73] dark:text-[#A1A1A6] block">
                  Leave Type
                </span>
                <span className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                  {selectedLeave.leaveType}
                </span>
              </div>
            </div>

            {/* Employee Details & Reporting Manager */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#86868B] mb-2.5">
                Employee Information
              </h4>
              <div className="p-4 rounded-2xl bg-white dark:bg-[#161618] border border-[#E5E5EA] dark:border-[#2C2C2E] space-y-3">
                <div className="flex items-center gap-3">
                  <AvatarInitials name={selectedLeave.employeeName} size="md" />
                  <div>
                    <div className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                      {selectedLeave.employeeName}
                    </div>
                    <div className="text-xs text-[#6E6E73] dark:text-[#A1A1A6]">
                      {selectedLeave.department} · {selectedLeave.employeeId}
                    </div>
                  </div>
                </div>

                {(selectedLeave.appliedBy?.includes('Submitted by Manager on behalf of Employee') || (selectedLeave as any).submittedByManager) && (
                  <div className="mt-2 pt-2 border-t border-[#E5E5EA] dark:border-[#2C2C2E] flex items-center justify-between text-xs text-blue-700 dark:text-blue-300 bg-blue-50/50 dark:bg-blue-950/20 p-2 rounded-lg">
                    <span className="font-semibold">Submitted by Manager on behalf of Employee</span>
                    {(selectedLeave as any).submittedByManagerName && (
                      <span className="text-[11px] font-mono">By {(selectedLeave as any).submittedByManagerName}</span>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E5E5EA] dark:border-[#2C2C2E] text-xs">
                  <div>
                    <span className="text-[#86868B] block">Reporting Manager</span>
                    <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                      {selectedEmp?.reportingManager || 'Sohail Derolwala'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#86868B] block">Designation</span>
                    <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                      {selectedEmp?.designation || 'Specialist'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Dates & Duration */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#86868B] mb-2.5">
                Dates & Duration
              </h4>
              <div className="p-4 rounded-2xl bg-white dark:bg-[#161618] border border-[#E5E5EA] dark:border-[#2C2C2E] grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[#86868B] block">Start Date</span>
                  <span className="font-mono font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                    {selectedLeave.startDate}
                  </span>
                </div>
                <div>
                  <span className="text-[#86868B] block">End Date</span>
                  <span className="font-mono font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                    {selectedLeave.endDate}
                  </span>
                </div>
                <div>
                  <span className="text-[#86868B] block">Total Duration</span>
                  <span className="font-mono font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">
                    {selectedLeave.days} {selectedLeave.days === 1 ? 'day' : 'days'}
                  </span>
                </div>
                <div>
                  <span className="text-[#86868B] block">Schedule Slot</span>
                  <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                    {selectedLeave.isHalfDay
                      ? selectedLeave.halfDaySession === 'FIRST_HALF'
                        ? '1st Half'
                        : '2nd Half'
                      : 'Full Working Day'}
                  </span>
                </div>
              </div>
            </div>

            {/* Reason & Submitter Details */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#86868B] mb-2.5">
                Application Statement
              </h4>
              <div className="p-4 rounded-2xl bg-white dark:bg-[#161618] border border-[#E5E5EA] dark:border-[#2C2C2E] space-y-2.5 text-xs">
                <div>
                  <span className="text-[#86868B] block mb-1">Reason for Leave</span>
                  <p className="text-[#1D1D1F] dark:text-[#F5F5F7] leading-relaxed">
                    "{selectedLeave.reason}"
                  </p>
                </div>
                <div className="pt-2 border-t border-[#E5E5EA] dark:border-[#2C2C2E] flex items-center justify-between text-[11px] text-[#6E6E73] dark:text-[#A1A1A6]">
                  <span>Applied On: {selectedLeave.appliedOn || selectedLeave.startDate}</span>
                  <span>Applied By: {selectedLeave.appliedBy || selectedLeave.employeeName}</span>
                </div>
              </div>
            </div>

            {/* Employee Leave Balance Summary */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#86868B] mb-2.5">
                Current Leave Balance
              </h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 rounded-xl bg-white dark:bg-[#161618] border border-[#E5E5EA] dark:border-[#2C2C2E] text-center">
                  <span className="text-[10px] text-[#86868B] block">Casual (CL)</span>
                  <span className="text-sm font-bold font-mono text-[#1D1D1F] dark:text-[#F5F5F7]">
                    {selectedEmp?.leaveBalance?.casualTotal
                      ? selectedEmp.leaveBalance.casualTotal - (selectedEmp.leaveBalance.casualUsed || 0)
                      : remCasual} d
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-[#161618] border border-[#E5E5EA] dark:border-[#2C2C2E] text-center">
                  <span className="text-[10px] text-[#86868B] block">Sick (SL)</span>
                  <span className="text-sm font-bold font-mono text-[#1D1D1F] dark:text-[#F5F5F7]">
                    {selectedEmp?.leaveBalance?.sickTotal
                      ? selectedEmp.leaveBalance.sickTotal - (selectedEmp.leaveBalance.sickUsed || 0)
                      : remSick} d
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-[#161618] border border-[#E5E5EA] dark:border-[#2C2C2E] text-center">
                  <span className="text-[10px] text-[#86868B] block">Earned (EL)</span>
                  <span className="text-sm font-bold font-mono text-[#1D1D1F] dark:text-[#F5F5F7]">
                    {selectedEmp?.leaveBalance?.earnedTotal
                      ? selectedEmp.leaveBalance.earnedTotal - (selectedEmp.leaveBalance.earnedUsed || 0)
                      : remEarned} d
                  </span>
                </div>
              </div>
            </div>

            {/* 2-Stage Approval Timeline & History */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#86868B] mb-2.5">
                Approval Workflow Timeline
              </h4>
              <div className="p-4 rounded-2xl bg-white dark:bg-[#161618] border border-[#E5E5EA] dark:border-[#2C2C2E] space-y-4">
                {/* Stage 0: Submitted */}
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#1D1D1F] text-white dark:bg-white dark:text-[#1D1D1F] flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                    ✓
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                      Request Submitted
                    </div>
                    <div className="text-[11px] text-[#86868B]">
                      {selectedLeave.appliedOn || selectedLeave.startDate} · Initiated by{' '}
                      {selectedLeave.appliedBy || selectedLeave.employeeName}
                    </div>
                  </div>
                </div>

                {/* Stage 1: Manager Review */}
                <div className="flex items-start gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold ${
                      selectedLeave.status === 'PENDING_MANAGER'
                        ? 'bg-[#F0F0F2] dark:bg-[#2C2C2E] text-[#86868B] border border-[#D1D1D6]'
                        : selectedLeave.status === 'REJECTED' && !selectedLeave.managerApprovedBy
                        ? 'border border-red-500 text-red-500'
                        : 'bg-[#1D1D1F] text-white dark:bg-white dark:text-[#1D1D1F]'
                    }`}
                  >
                    1
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                      Stage 1: Reporting Manager Review
                    </div>
                    <div className="text-[11px] text-[#86868B]">
                      {selectedLeave.status === 'PENDING_MANAGER'
                        ? 'Pending manager review & concurrence'
                        : selectedLeave.managerApprovedBy
                        ? `Concurred by ${selectedLeave.managerApprovedBy} on ${selectedLeave.managerApprovedAt || 'Recorded'}`
                        : 'Reviewed in workflow'}
                    </div>
                    {selectedLeave.managerDecisionNote && (
                      <p className="text-xs text-[#6E6E73] dark:text-[#A1A1A6] mt-1 italic">
                        "{selectedLeave.managerDecisionNote}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Stage 2: HR Final Review */}
                <div className="flex items-start gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold ${
                      selectedLeave.status === 'APPROVED'
                        ? 'bg-[#1D1D1F] text-white dark:bg-white dark:text-[#1D1D1F]'
                        : selectedLeave.status === 'REJECTED'
                        ? 'border border-red-500 text-red-500'
                        : 'bg-[#F0F0F2] dark:bg-[#2C2C2E] text-[#86868B] border border-[#D1D1D6]'
                    }`}
                  >
                    2
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                      Stage 2: HR Final Approval
                    </div>
                    <div className="text-[11px] text-[#86868B]">
                      {selectedLeave.status === 'APPROVED'
                        ? `Approved by HR (${selectedLeave.hrApprovedBy || 'Admin'}) · Quota Deducted`
                        : selectedLeave.status === 'REJECTED'
                        ? `Rejected: ${selectedLeave.decisionNote || selectedLeave.rejectionReason || 'No reason specified'}`
                        : 'Pending final HR sign-off'}
                    </div>
                    {selectedLeave.hrDecisionNote && (
                      <p className="text-xs text-[#6E6E73] dark:text-[#A1A1A6] mt-1 italic">
                        "{selectedLeave.hrDecisionNote}"
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </SlideOverDrawer>

      {/* Apply Leave Modal */}
      <ModalShell
        isOpen={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        title={onBehalfMode ? (isManager ? 'Submit Leave for Team Member' : 'Apply Leave (On Behalf)') : 'Apply for Leave'}
        subtitle={onBehalfMode ? 'Submit leave on behalf of permitted team member with manager endorsement' : 'Submit a formal leave request with duration and policy selection.'}
      >
        <form onSubmit={handleApply} className="space-y-4">
          {onBehalfMode && (
            <div>
              <label className="block text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mb-1">
                Select Team Member <span className="text-red-500">*</span>
              </label>
              <div className="space-y-1.5">
                <input
                  type="text"
                  value={employeeSearchFilter}
                  onChange={(e) => setEmployeeSearchFilter(e.target.value)}
                  placeholder="Filter team member by name, code, or department..."
                  className="w-full px-3 py-1.5 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg text-xs text-[#1D1D1F] dark:text-[#F5F5F7] outline-none"
                />
                <select
                  value={targetEmpId}
                  onChange={(e) => setTargetEmpId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl text-xs text-[#1D1D1F] dark:text-[#F5F5F7] outline-none font-medium"
                >
                  {(isManager ? assignedTeamEmployees : employees)
                    .filter((emp) => {
                      if (!employeeSearchFilter.trim()) return true;
                      const q = employeeSearchFilter.toLowerCase();
                      return (
                        emp.fullName.toLowerCase().includes(q) ||
                        emp.id.toLowerCase().includes(q) ||
                        emp.department.toLowerCase().includes(q)
                      );
                    })
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.fullName} ({emp.department} · {emp.id})
                      </option>
                    ))}
                </select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#6E6E73] dark:text-[#A1A1A6] mb-1">
                Leave Type
              </label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                className="w-full px-3 py-2 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl text-xs text-[#1D1D1F] dark:text-[#F5F5F7] outline-none"
              >
                <option value="CASUAL">Casual Leave (CL)</option>
                <option value="SICK">Sick Leave (SL)</option>
                <option value="EARNED">Earned Leave (EL)</option>
                <option value="COMP_OFF">Compensatory Off</option>
                <option value="UNPAID">Loss of Pay (Unpaid)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#6E6E73] dark:text-[#A1A1A6] mb-1">
                Day Slot
              </label>
              <select
                value={halfDaySession}
                onChange={(e) => handleSessionChange(e.target.value as any)}
                className="w-full px-3 py-2 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl text-xs text-[#1D1D1F] dark:text-[#F5F5F7] outline-none"
              >
                <option value="FULL_DAY">Full Working Day</option>
                <option value="FIRST_HALF">First Half (Morning)</option>
                <option value="SECOND_HALF">Second Half (Afternoon)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#6E6E73] dark:text-[#A1A1A6] mb-1">
                Start Date
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => {
                  const s = e.target.value;
                  setStartDate(s);
                  const end = isHalfDay ? s : endDate;
                  if (isHalfDay) setEndDate(s);
                  setDays(calculateDaysDuration(s, end, isHalfDay));
                }}
                className="w-full px-3 py-2 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl text-xs font-mono text-[#1D1D1F] dark:text-[#F5F5F7] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#6E6E73] dark:text-[#A1A1A6] mb-1">
                End Date
              </label>
              <input
                type="date"
                disabled={isHalfDay}
                required
                value={endDate}
                onChange={(e) => {
                  const ed = e.target.value;
                  setEndDate(ed);
                  setDays(calculateDaysDuration(startDate, ed, isHalfDay));
                }}
                className="w-full px-3 py-2 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl text-xs font-mono text-[#1D1D1F] dark:text-[#F5F5F7] disabled:opacity-50 outline-none"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] flex items-center justify-between text-xs">
            <span className="text-[#6E6E73] dark:text-[#A1A1A6]">Calculated Duration</span>
            <span className="font-mono font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">
              {days} {days === 1 ? 'day' : 'days'}
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6E6E73] dark:text-[#A1A1A6] mb-1">
              Reason / Justification
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State the clear reason for this leave application..."
              className="w-full px-3 py-2 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl text-xs text-[#1D1D1F] dark:text-[#F5F5F7] outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
            <button
              type="button"
              onClick={() => setShowApplyModal(false)}
              className="px-4 py-2 text-xs font-medium text-[#6E6E73] dark:text-[#A1A1A6] hover:text-[#1D1D1F]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-[#000000] dark:bg-white dark:text-[#000000] rounded-xl hover:opacity-90"
            >
              Submit Application
            </button>
          </div>
        </form>
      </ModalShell>

      {/* Review / Decision Modal (Approve or Reject with Mandatory Reason) */}
      <ModalShell
        isOpen={!!reviewingLeave}
        onClose={() => setReviewingLeave(null)}
        title={reviewAction === 'Approved' ? 'Confirm Approval' : 'Reject Leave Request'}
        subtitle={
          reviewingLeave
            ? `${reviewingLeave.employeeName} · ${reviewingLeave.leaveType} (${reviewingLeave.days} days)`
            : ''
        }
      >
        <form onSubmit={handleConfirmReview} className="space-y-4">
          {reviewError && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{reviewError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#6E6E73] dark:text-[#A1A1A6] mb-1">
              {reviewAction === 'Approved'
                ? 'Approval Note / Remarks (Optional)'
                : 'Mandatory Rejection Reason'}
            </label>
            <textarea
              required={reviewAction === 'Rejected'}
              rows={3}
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder={
                reviewAction === 'Approved'
                  ? 'Add administrative remarks or concurrence notes...'
                  : 'State the specific operational or policy reason for rejecting this leave...'
              }
              className="w-full px-3 py-2 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl text-xs text-[#1D1D1F] dark:text-[#F5F5F7] outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
            <button
              type="button"
              onClick={() => setReviewingLeave(null)}
              className="px-4 py-2 text-xs font-medium text-[#6E6E73] dark:text-[#A1A1A6] hover:text-[#1D1D1F]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 text-xs font-semibold rounded-xl ${
                reviewAction === 'Approved'
                  ? 'bg-[#000000] dark:bg-white text-white dark:text-[#000000] hover:opacity-90'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {reviewAction === 'Approved' ? 'Confirm Approval' : 'Confirm Rejection'}
            </button>
          </div>
        </form>
      </ModalShell>

      {/* Edit Leave Modal */}
      <ModalShell
        isOpen={!!editingLeave}
        onClose={() => setEditingLeave(null)}
        title="Edit Leave Request"
        subtitle="Modify duration, dates, or reason."
      >
        <form onSubmit={handleSaveEditLeave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#6E6E73] dark:text-[#A1A1A6] mb-1">
                Start Date
              </label>
              <input
                type="date"
                required
                value={editStartDate}
                onChange={(e) => setEditStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl text-xs font-mono text-[#1D1D1F] dark:text-[#F5F5F7] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6E6E73] dark:text-[#A1A1A6] mb-1">
                End Date
              </label>
              <input
                type="date"
                required
                value={editEndDate}
                onChange={(e) => setEditEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl text-xs font-mono text-[#1D1D1F] dark:text-[#F5F5F7] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6E6E73] dark:text-[#A1A1A6] mb-1">
              Reason
            </label>
            <textarea
              required
              rows={3}
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              className="w-full px-3 py-2 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl text-xs text-[#1D1D1F] dark:text-[#F5F5F7] outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
            <button
              type="button"
              onClick={() => setEditingLeave(null)}
              className="px-4 py-2 text-xs font-medium text-[#6E6E73]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-[#000000] dark:bg-white dark:text-[#000000] rounded-xl hover:opacity-90"
            >
              Save Changes
            </button>
          </div>
        </form>
      </ModalShell>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingLeave}
        onClose={() => setDeletingLeave(null)}
        onConfirm={() => {
          if (deletingLeave) {
            deleteLeave(deletingLeave.id);
            if (selectedLeave?.id === deletingLeave.id) {
              setSelectedLeave(null);
            }
            setDeletingLeave(null);
          }
        }}
        title="Delete Leave Application"
        message="Are you sure you want to withdraw or delete this leave request? This action will remove the request and restore any held balances."
        confirmLabel="Delete Request"
      />

      {/* Leave Balance Adjustment Modal (HR / Admin) */}
      <ModalShell
        isOpen={!!adjustingEmpId}
        onClose={() => setAdjustingEmpId(null)}
        title="Adjust Employee Leave Balance"
        subtitle={
          adjustingEmpId
            ? `${employees.find((e) => e.id === adjustingEmpId)?.fullName || adjustingEmpId} · Audited Balance Correction`
            : ''
        }
      >
        <form onSubmit={handleSaveBalanceAdjustment} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#141A17] mb-1">
                Casual Quota Total
              </label>
              <input
                type="number"
                min={0}
                value={adjCasualTotal}
                onChange={(e) => setAdjCasualTotal(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-xl text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#141A17] mb-1">
                Casual Used
              </label>
              <input
                type="number"
                min={0}
                step="0.5"
                value={adjCasualUsed}
                onChange={(e) => setAdjCasualUsed(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#141A17] mb-1">
                Sick Quota Total
              </label>
              <input
                type="number"
                min={0}
                value={adjSickTotal}
                onChange={(e) => setAdjSickTotal(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-xl text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#141A17] mb-1">
                Sick Used
              </label>
              <input
                type="number"
                min={0}
                step="0.5"
                value={adjSickUsed}
                onChange={(e) => setAdjSickUsed(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#141A17] mb-1">
                Earned Quota Total
              </label>
              <input
                type="number"
                min={0}
                value={adjEarnedTotal}
                onChange={(e) => setAdjEarnedTotal(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-xl text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#141A17] mb-1">
                Earned Used
              </label>
              <input
                type="number"
                min={0}
                step="0.5"
                value={adjEarnedUsed}
                onChange={(e) => setAdjEarnedUsed(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-xl text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#141A17] mb-1">
              Mandatory Audit Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={2}
              value={adjReason}
              onChange={(e) => setAdjReason(e.target.value)}
              placeholder="Explain why this leave balance is being adjusted (logged in Activity Logs)..."
              className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-xl text-xs outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E5EA]">
            <button
              type="button"
              onClick={() => setAdjustingEmpId(null)}
              className="px-4 py-2 text-xs font-semibold text-[#525854]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#164C38] hover:bg-[#0F3627] text-white text-xs font-semibold rounded-xl cursor-pointer"
            >
              Save Balance Adjustment
            </button>
          </div>
        </form>
      </ModalShell>
    </div>
  );
}
