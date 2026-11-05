import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Plus,
  Edit3,
  Trash2,
  Mail,
  Phone,
  MapPin,
  ArrowUpDown,
  UserPlus,
  Briefcase,
  ArrowLeft,
  FileText,
  Clock,
  Eye,
  EyeOff,
  Download,
  Lock,
  CheckCircle2,
  Award,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Archive,
  UserX,
  AlertTriangle,
  Printer,
  CalendarClock,
} from 'lucide-react';
import { useHRMS } from '../../context/HRMSContext';
import {
  StatusBadge,
  AvatarInitials,
  ExportDropdown,
  ModalShell,
  ConfirmDialog,
  ActionMenu,
} from '../ui/EnterpriseComponents';
import { EmployeeRecord, Role, LeaveType, NoticePeriodDetails, FinalExitDetails } from '../../types/hrms';
import { printOfficialLetter, printPayslipDocument } from '../../lib/exportUtils';
import { EmployeeOnboardingModal } from './EmployeeOnboardingModal';

type ProfileTabId =
  | 'overview'
  | 'attendance'
  | 'leave'
  | 'payroll'
  | 'documents'
  | 'letters'
  | 'considerations'
  | 'activity';

interface SalaryHistoryEntry {
  id: string;
  month: string;
  paidDate: string;
  status: string;
  basicSalary: number;
  hra: number;
  specialAllowance: number;
  commission: number;
  otherAdditions: number;
  lateComingDeduction: number;
  emiDeduction: number;
  pfDeduction: number;
  tdsDeduction: number;
  otherTaxDeduction: number;
  otherDeductions: number;
  netSalary: number;
}

export function PeopleModule() {
  const {
    currentUser,
    activeModule,
    selectedEmployeeId,
    openEmployeeProfile,
    navigateTo,
    permissions,
    employees,
    allEmployees,
    leaves,
    attendance,
    payroll,
    documents,
    scopedLetters,
    considerations,
    auditLogs,
    holidays,
    settings,
    companyTiming,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    deactivateEmployee,
    restoreEmployee,
    initiateFinalExit,
    updateNoticePeriod,
    masterLetterTemplates,
    applyLeave,
    decideLeave,
    submitConsideration,
    decideConsideration,
    generateAndSaveLetter,
    departments,
    confirmEmployeeProbation,
    addToast,
  } = useHRMS();

  // Top Section Tab (Active Employees vs Employee Archive)
  const [activeDirectoryTab, setActiveDirectoryTab] = useState<'ACTIVE' | 'ARCHIVE'>('ACTIVE');

  // Deactivate Employee Modal State
  const [deactivatingEmp, setDeactivatingEmp] = useState<EmployeeRecord | null>(null);
  const [deactivationReasonInput, setDeactivationReasonInput] = useState('');

  // Restore Employee Modal State
  const [restoringEmp, setRestoringEmp] = useState<any | null>(null);
  const [restoreReasonInput, setRestoreReasonInput] = useState('');

  // Final Exit Workflow Modal State
  const [exitModalEmp, setExitModalEmp] = useState<any | null>(null);
  const [exitType, setExitType] = useState<'Resignation' | 'Termination'>('Resignation');
  const [exitEffectiveDate, setExitEffectiveDate] = useState('2026-10-31');
  const [exitNoticeServed, setExitNoticeServed] = useState(true);
  const [exitNoticeStart, setExitNoticeStart] = useState('2026-10-01');
  const [exitNoticeEnd, setExitNoticeEnd] = useState('2026-10-31');
  const [exitReason, setExitReason] = useState('Personal Reasons / Career Growth');
  const [exitInternalNote, setExitInternalNote] = useState('');
  const [exitRemarks, setExitRemarks] = useState('');
  const [exitSelectedTemplateId, setExitSelectedTemplateId] = useState('');
  const [exitShowPreview, setExitShowPreview] = useState(false);

  // Notice Period Management Modal State
  const [noticeModalEmp, setNoticeModalEmp] = useState<any | null>(null);
  const [noticeApplicable, setNoticeApplicable] = useState(true);
  const [noticeDuration, setNoticeDuration] = useState(30);
  const [noticeUnit, setNoticeUnit] = useState<'Days' | 'Months'>('Days');
  const [noticeType, setNoticeType] = useState('Resignation Notice');
  const [noticeStartDate, setNoticeStartDate] = useState('2026-10-06');
  const [noticeExpectedDate, setNoticeExpectedDate] = useState('2026-11-05');
  const [noticeActualDate, setNoticeActualDate] = useState('');
  const [noticeStatus, setNoticeStatus] = useState<
    'Not Started' | 'Active' | 'Completed' | 'Waived' | 'Cancelled'
  >('Active');
  const [noticeInternalNotes, setNoticeInternalNotes] = useState('');

  // Helper to dynamically calculate expected last working date
  const computeExpectedLastWorkingDay = (
    start: string,
    durationVal: number,
    unitVal: 'Days' | 'Months'
  ): string => {
    if (!start) return '';
    const d = new Date(start);
    if (isNaN(d.getTime())) return '';
    if (unitVal === 'Days') {
      d.setDate(d.getDate() + Number(durationVal || 0));
    } else {
      d.setMonth(d.getMonth() + Number(durationVal || 0));
    }
    return d.toISOString().slice(0, 10);
  };

  const openNoticePeriodModal = (emp: any) => {
    setNoticeModalEmp(emp);
    const existing = emp.noticePeriod;
    if (existing) {
      setNoticeApplicable(existing.applicable ?? true);
      setNoticeDuration(existing.duration || 30);
      setNoticeUnit(existing.unit || 'Days');
      setNoticeType(existing.noticeType || 'Resignation Notice');
      setNoticeStartDate(existing.startDate || '2026-10-06');
      setNoticeExpectedDate(
        existing.expectedLastWorkingDate ||
          computeExpectedLastWorkingDay(existing.startDate || '2026-10-06', existing.duration || 30, existing.unit || 'Days')
      );
      setNoticeActualDate(existing.actualLastWorkingDate || '');
      setNoticeStatus(existing.status || 'Active');
      setNoticeInternalNotes(existing.internalNotes || '');
    } else {
      setNoticeApplicable(true);
      setNoticeDuration(30);
      setNoticeUnit('Days');
      setNoticeType('Resignation Notice');
      setNoticeStartDate('2026-10-06');
      setNoticeExpectedDate(computeExpectedLastWorkingDay('2026-10-06', 30, 'Days'));
      setNoticeActualDate('');
      setNoticeStatus('Active');
      setNoticeInternalNotes('');
    }
  };

  const handleSaveNoticePeriod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeModalEmp) return;
    const details: NoticePeriodDetails = {
      applicable: noticeApplicable,
      duration: Number(noticeDuration),
      unit: noticeUnit,
      noticeType,
      startDate: noticeStartDate,
      expectedLastWorkingDate: noticeExpectedDate,
      actualLastWorkingDate: noticeActualDate || undefined,
      status: noticeStatus,
      internalNotes: noticeInternalNotes,
    };
    updateNoticePeriod(noticeModalEmp.id, details);
    setNoticeModalEmp(null);
  };

  const openFinalExitModal = (emp: any) => {
    setExitModalEmp(emp);
    setExitType('Resignation');
    const todayStr = '2026-10-06';
    const expectedLast = emp.noticePeriod?.expectedLastWorkingDate || '2026-10-31';
    setExitEffectiveDate(expectedLast);
    setExitNoticeServed(emp.noticePeriod?.applicable ?? true);
    setExitNoticeStart(emp.noticePeriod?.startDate || todayStr);
    setExitNoticeEnd(expectedLast);
    setExitReason(emp.noticePeriod?.noticeType || 'Resignation / Career Growth');
    setExitInternalNote('');
    setExitRemarks('');
    const matchingTemplate = (masterLetterTemplates || []).find(
      (t) =>
        t.type?.toLowerCase().includes('resignation') ||
        t.type?.toLowerCase().includes('termination') ||
        t.type?.toLowerCase().includes('relieving') ||
        t.name?.toLowerCase().includes('resignation') ||
        t.name?.toLowerCase().includes('termination')
    );
    setExitSelectedTemplateId(matchingTemplate ? matchingTemplate.id : '');
    setExitShowPreview(false);
  };

  const handleConfirmFinalExit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!exitModalEmp) return;
    if (!exitInternalNote.trim()) {
      addToast('Internal Note Required', 'A mandatory internal note must be recorded for the exit file.', 'error');
      return;
    }

    const exitDetails: FinalExitDetails = {
      employeeId: exitModalEmp.id,
      employeeName: exitModalEmp.fullName,
      exitType,
      effectiveLastWorkingDate: exitEffectiveDate,
      noticePeriodServed: exitNoticeServed,
      noticeStartDate: exitNoticeStart,
      noticeEndDate: exitNoticeEnd,
      exitReason,
      mandatoryInternalNote: exitInternalNote.trim(),
      additionalRemarks: exitRemarks.trim() || undefined,
      selectedLetterTemplateId: exitSelectedTemplateId || undefined,
      finalizedBy: currentUser.fullName,
      finalizedAt: new Date().toISOString(),
    };

    initiateFinalExit(exitModalEmp.id, exitDetails);
    setExitModalEmp(null);
  };

  const handleConfirmRestore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restoringEmp) return;
    restoreEmployee(restoringEmp.id, restoreReasonInput.trim() || 'Restored by HR/Admin');
    setRestoringEmp(null);
    setRestoreReasonInput('');
  };

  const handleConfirmDeactivation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deactivatingEmp) return;
    deactivateEmployee(deactivatingEmp.id, deactivationReasonInput.trim() || 'Deactivated via Employee Roster');
    setDeactivatingEmp(null);
    setDeactivationReasonInput('');
  };

  // Filter & Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState<string>('ALL');
  const [filterManager, setFilterManager] = useState<string>('ALL');
  const [filterEmploymentType, setFilterEmploymentType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterLocation, setFilterLocation] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'fullName' | 'department' | 'joiningDate' | 'annualCTC'>('fullName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Selected Profile State
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);
  const [profileTab, setProfileTab] = useState<ProfileTabId>('overview');
  const [profileAttView, setProfileAttView] = useState<'normal' | 'calendar'>('normal');
  const [profCalYear, setProfCalYear] = useState<number>(2026);
  const [profCalMonth, setProfCalMonth] = useState<number>(9); // October (0-indexed)
  const [profSelectedDay, setProfSelectedDay] = useState<number>(6);

  // Payroll Eye Toggle & Opened Salary Entry Breakdown in Profile
  const [showSalaryAmounts, setShowSalaryAmounts] = useState<boolean>(false);
  const [openedSalaryEntry, setOpenedSalaryEntry] = useState<SalaryHistoryEntry | null>(null);

  // HR Add Letter Modal for Employee or Department
  const [showAddLetterModal, setShowAddLetterModal] = useState(false);
  const [letterTargetScope, setLetterTargetScope] = useState<'EMPLOYEE' | 'DEPARTMENT'>('EMPLOYEE');
  const [letterTitle, setLetterTitle] = useState('Letters');
  const [letterBody, setLetterBody] = useState('');

  // Manager Submit Consideration on Behalf of Assigned Team Member Modal
  const [showMgrConsiderationModal, setShowMgrConsiderationModal] = useState(false);
  const [mgrConsDate, setMgrConsDate] = useState('2026-10-06');
  const [mgrConsType, setMgrConsType] = useState<
    'Late Arrival Waiver' | 'Missed Punch Regularization' | 'Half-Day Waiver' | 'Work From Home' | 'Client Visit'
  >('Late Arrival Waiver');
  const [mgrConsReason, setMgrConsReason] = useState('');
  const [mgrConsNote, setMgrConsNote] = useState('');

  const isHRAdmin = currentUser.role === 'HR' || currentUser.role === 'ADMIN';
  const isManager = currentUser.role === 'MANAGER';

  // Confidential Information Show/Hide Toggle State (Hidden by default as per Requirement 8)
  const [revealedConfidential, setRevealedConfidential] = useState<Record<string, boolean>>({});
  const [showAllConfidential, setShowAllConfidential] = useState(false);

  // Address and Employee Type edit modal state (Requirement 7)
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addrLine1, setAddrLine1] = useState('');
  const [addrLine2, setAddrLine2] = useState('');
  const [addrCity, setAddrCity] = useState('');
  const [addrState, setAddrState] = useState('');
  const [addrPostal, setAddrPostal] = useState('');
  const [addrCountry, setAddrCountry] = useState('India');
  const [editEmployeeType, setEditEmployeeType] = useState<string>('Permanent');

  const isFieldRevealed = (key: string) => showAllConfidential || Boolean(revealedConfidential[key]);
  const toggleField = (key: string) => {
    setRevealedConfidential((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    // Reset confidential toggles whenever selected employee changes or profile reopens
    setRevealedConfidential({});
    setShowAllConfidential(false);

    if (currentUser.role === 'EMPLOYEE' || activeModule === 'my-profile') {
      setSelectedEmpId(currentUser.employeeId);
    } else if (currentUser.role === 'MANAGER' && activeModule === 'my-team') {
      if (
        selectedEmployeeId &&
        selectedEmployeeId !== currentUser.employeeId &&
        employees.some(
          (e) => e.id === selectedEmployeeId && e.managerId === currentUser.employeeId
        )
      ) {
        setSelectedEmpId(selectedEmployeeId);
      } else {
        setSelectedEmpId(null);
      }
    } else if (selectedEmployeeId) {
      setSelectedEmpId(selectedEmployeeId);
    } else {
      setSelectedEmpId(null);
    }
  }, [activeModule, selectedEmployeeId, currentUser.employeeId, currentUser.role, employees]);

  const effectiveEmpId =
    currentUser.role === 'EMPLOYEE' || activeModule === 'my-profile'
      ? currentUser.employeeId
      : selectedEmpId;

  const activeProfileEmp = useMemo(() => {
    if (!effectiveEmpId) return null;
    const found = employees.find((e) => e.id === effectiveEmpId) || null;
    if (!found) return null;
    // Enforce strict team-based access security for Manager
    if (
      currentUser.role === 'MANAGER' &&
      found.id !== currentUser.employeeId &&
      found.managerId !== currentUser.employeeId
    ) {
      return null;
    }
    return found;
  }, [effectiveEmpId, employees, currentUser.role, currentUser.employeeId]);

  const rawProfileEmp = useMemo(() => {
    if (!effectiveEmpId) return null;
    return allEmployees?.find((e: any) => e.id === effectiveEmpId) || null;
  }, [effectiveEmpId, allEmployees]);

  // 5-Step Onboarding / Edit Modal State
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [editingEmp, setEditingEmp] = useState<EmployeeRecord | null>(null);

  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('1995-08-15');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Non-binary'>('Male');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+91 98201 55000');
  const [address, setAddress] = useState('402 Horology Park, Dumas Road, Athwa Lines, Surat, Gujarat - 395007');
  const [emergencyContact, setEmergencyContact] = useState('+91 98201 11222 (Family)');

  const [empCode, setEmpCode] = useState('EMP-1008');
  const [joiningDate, setJoiningDate] = useState('2025-06-01');
  const [department, setDepartment] = useState('Inventory');
  const [designation, setDesignation] = useState('');
  const [reportingManager, setReportingManager] = useState('Chaitanya Katare');
  const [employmentType, setEmploymentType] = useState<'Full-Time' | 'Probation' | 'Contract' | 'Intern'>('Full-Time');
  const [location, setLocation] = useState('Surat Atelier HQ');
  const [probationEndDate, setProbationEndDate] = useState('2025-09-01');
  const [status, setStatus] = useState<EmployeeRecord['status']>('ACTIVE');

  const [annualCTC, setAnnualCTC] = useState(900000);
  const [panNumber, setPanNumber] = useState('ARGPK1008A');
  const [bankAccount, setBankAccount] = useState('HDFC •••• 9910');

  const [initialDocName, setInitialDocName] = useState('Identity_And_Address_Proof.pdf');
  const [role, setRole] = useState<Role>('EMPLOYEE');
  const [autoGenerateLetter, setAutoGenerateLetter] = useState(true);

  // Apply Leave On Behalf Modal
  const [leaveBehalfEmp, setLeaveBehalfEmp] = useState<EmployeeRecord | null>(null);
  const [leaveType, setLeaveType] = useState<LeaveType>('CASUAL');
  const [startDate, setStartDate] = useState('2026-10-12');
  const [endDate, setEndDate] = useState('2026-10-12');
  const [days, setDays] = useState(1);
  const [halfDaySession, setHalfDaySession] = useState<'FULL_DAY' | 'FIRST_HALF' | 'SECOND_HALF'>('FULL_DAY');
  const [leaveReason, setLeaveReason] = useState('');
  const [autoApprove, setAutoApprove] = useState(true);

  const [deletingEmp, setDeletingEmp] = useState<EmployeeRecord | null>(null);

  const departmentFilterOptions = useMemo<string[]>(() => {
    const set = new Set<string>(employees.map((e) => e.department));
    return ['ALL', ...Array.from(set)];
  }, [employees]);

  const managersList = useMemo<string[]>(() => {
    const set = new Set<string>(employees.map((e) => e.reportingManager).filter(Boolean));
    return ['ALL', ...Array.from(set)];
  }, [employees]);

  const locationsList = useMemo<string[]>(() => {
    const set = new Set<string>(employees.map((e) => e.location).filter(Boolean));
    return ['ALL', ...Array.from(set)];
  }, [employees]);

  const scopedEmployees = useMemo(() => {
    let base = employees;
    if (permissions.People?.scope === 'SELF' || activeModule === 'my-profile') {
      base = employees.filter((e) => e.id === currentUser.employeeId);
    } else if (
      currentUser.role === 'MANAGER' ||
      permissions.People?.scope === 'TEAM' ||
      activeModule === 'my-team'
    ) {
      // Strictly only employees assigned to this Manager's team
      base = employees.filter((e) => e.managerId === currentUser.employeeId);
    }

    const filtered = base.filter((e) => {
      const raw = allEmployees?.find((r: any) => r.id === e.id);
      const empType = raw?.employmentType || 'Full-Time';
      const matchDept = filterDept === 'ALL' || e.department === filterDept;
      const matchMgr = filterManager === 'ALL' || e.reportingManager === filterManager;
      const matchType = filterEmploymentType === 'ALL' || empType === filterEmploymentType;
      const matchStatus = filterStatus === 'ALL' || e.status === filterStatus;
      const matchLoc = filterLocation === 'ALL' || e.location === filterLocation;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        e.fullName.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q) ||
        (e.employeeCode && e.employeeCode.toLowerCase().includes(q)) ||
        e.email.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q) ||
        e.designation.toLowerCase().includes(q);
      if (activeModule === 'my-team') {
        return matchSearch;
      }
      return matchDept && matchMgr && matchType && matchStatus && matchLoc && matchSearch;
    });

    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'fullName') cmp = a.fullName.localeCompare(b.fullName);
      else if (sortBy === 'department') cmp = a.department.localeCompare(b.department);
      else if (sortBy === 'joiningDate') cmp = a.joiningDate.localeCompare(b.joiningDate);
      else if (sortBy === 'annualCTC') cmp = a.annualCTC - b.annualCTC;
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [
    employees,
    allEmployees,
    permissions,
    currentUser,
    activeModule,
    filterDept,
    filterManager,
    filterEmploymentType,
    filterStatus,
    filterLocation,
    searchQuery,
    sortBy,
    sortOrder,
  ]);

  // Archived & Exited Employees List for Employee Archive Tab
  const archivedEmployees = useMemo(() => {
    const list = (allEmployees || []).filter(
      (e: any) => e.isDeactivated || e.isExited || e.status === 'Exited' || e.status === 'Inactive'
    );
    const q = searchQuery.toLowerCase().trim();
    return list.filter((e: any) => {
      const matchDept = filterDept === 'ALL' || e.department === filterDept;
      const matchSearch =
        !q ||
        e.fullName?.toLowerCase().includes(q) ||
        e.id?.toLowerCase().includes(q) ||
        (e.employeeCode && e.employeeCode.toLowerCase().includes(q)) ||
        e.department?.toLowerCase().includes(q) ||
        e.designation?.toLowerCase().includes(q);
      return matchDept && matchSearch;
    });
  }, [allEmployees, searchQuery, filterDept]);

  const openAddModal = () => {
    setEditingEmp(null);
    setOnboardingStep(1);
    setEmpCode(`EMP-100${employees.length + 1}`);
    setFullName('');
    setEmail('');
    setPhone('+91 98201 55000');
    setDepartment('Inventory');
    setDesignation('');
    setRole('EMPLOYEE');
    setReportingManager('Chaitanya Katare');
    setJoiningDate('2025-06-01');
    setStatus('ACTIVE');
    setLocation('Surat Atelier HQ');
    setAnnualCTC(900000);
    setPanNumber('ARGPK1008A');
    setBankAccount('HDFC •••• 9910');
    setShowEmpModal(true);
  };

  const openEditModal = (emp: EmployeeRecord) => {
    setEditingEmp(emp);
    setOnboardingStep(1);
    setEmpCode(emp.employeeCode);
    setFullName(emp.fullName);
    setEmail(emp.email);
    setPhone(emp.phone);
    setDepartment(emp.department);
    setDesignation(emp.designation);
    setRole(emp.role);
    setReportingManager(emp.reportingManager);
    setJoiningDate(emp.joiningDate);
    setStatus(emp.status);
    setLocation(emp.location);
    setAnnualCTC(emp.annualCTC);
    setPanNumber(emp.panNumber);
    setBankAccount(emp.bankAccount);
    setShowEmpModal(true);
  };

  const handleSaveOnboardingEmployee = (payload: any, generateOffer: boolean) => {
    if (editingEmp) {
      updateEmployee(editingEmp.id, payload);
      addToast('Employee Profile Updated', `${payload.fullName} record updated.`);
    } else {
      createEmployee(payload);
      addToast('Employee Onboarded', `${payload.fullName} added with ID ${payload.employeeCode}.`);
    }
    if (generateOffer) {
      generateAndSaveLetter({
        employeeId: payload.employeeCode,
        templateType: 'Offer Letter' as any,
        subject: `Offer Letter — ${payload.fullName}`,
        content: `Official Executive Offer of Employment at Argos Watch Enterprise.\nDesignation: ${payload.designation}\nDepartment: ${payload.department}\nJoining Date: ${payload.joiningDate}\nAnnual CTC: ₹${payload.annualCTC?.toLocaleString('en-IN')}`,
      });
    }
    setShowEmpModal(false);
  };

  const handleApplyLeaveBehalf = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveBehalfEmp || !leaveReason.trim()) return;
    const isHalf = halfDaySession !== 'FULL_DAY';
    applyLeave({
      targetEmployeeId: leaveBehalfEmp.id,
      leaveType,
      startDate,
      endDate: isHalf ? startDate : endDate,
      days: isHalf ? 0.5 : Number(days),
      halfDaySession,
      reason: leaveReason,
      isHalfDay: isHalf,
      autoApprove,
    });
    setLeaveBehalfEmp(null);
    setLeaveReason('');
  };

  // ============================================================================
  // COMPREHENSIVE EMPLOYEE PROFILE VIEW
  // ============================================================================
  if (activeProfileEmp) {
    const empAtt = attendance.filter((a) => a.employeeId === activeProfileEmp.id);
    const empLeaves = leaves.filter((l) => l.employeeId === activeProfileEmp.id);
    const empDocs = documents.filter((d) => d.employeeId === activeProfileEmp.id);
    // Show letters added by HR specifically for that employee OR their department (and filter out Experience)
    const empLetters = (scopedLetters || []).filter(
      (l: any) =>
        (l.employeeId === activeProfileEmp.id ||
          l.department === activeProfileEmp.department ||
          l.subject?.toLowerCase().includes(activeProfileEmp.department.toLowerCase())) &&
        !String(l.templateType).toLowerCase().includes('experience')
    );
    const empCons = considerations.filter((c) => c.employeeId === activeProfileEmp.id);

    // Synthesize ALL activities related to this employee: Leave, Consideration, Attendance, Letters, and Audit Logs
    const combinedEmployeeActivities = [
      ...empLeaves.map((l) => ({
        id: `act-lv-${l.id}`,
        category: 'Leave',
        title: `${l.leaveType} Leave (${l.days} ${l.days === 1 ? 'Day' : 'Days'}) — ${l.status}`,
        detail: `${l.startDate} to ${l.endDate} · Reason: ${l.reason}`,
        date: l.appliedOn || l.startDate,
        badgeColor: 'bg-[#164C38]/10 text-[#164C38] border-[#164C38]/30',
      })),
      ...empCons.map((c) => ({
        id: `act-con-${c.id}`,
        category: 'Consideration',
        title: `${c.title} — ${c.status}`,
        detail: c.description,
        date: c.submittedAt,
        badgeColor: 'bg-[#4E1617]/10 text-[#4E1617] border-[#4E1617]/30',
      })),
      ...empAtt.slice(0, 6).map((a) => ({
        id: `act-att-${a.id}`,
        category: 'Attendance',
        title: `Shift Log: ${a.status} (${a.workHours}h logged)`,
        detail: `Punch In: ${a.punchIn || '—'} · Punch Out: ${a.punchOut || '—'}${
          a.lateByMinutes > 0 ? ` · Late by ${a.lateByMinutes}m` : ''
        }`,
        date: a.date,
        badgeColor: 'bg-[#F2F2F2] text-[#141A17] border-[#CBCBCB]',
      })),
      ...empLetters.map((ltr: any) => ({
        id: `act-ltr-${ltr.id}`,
        category: 'Letters',
        title: `Letter Issued: ${ltr.subject}`,
        detail: `Issued by ${ltr.issuedBy}`,
        date: ltr.issuedDate,
        badgeColor: 'bg-[#164C38]/10 text-[#164C38] border-[#164C38]/30',
      })),
      ...(auditLogs || [])
        .filter(
          (log: any) =>
            log.target?.toLowerCase().includes(activeProfileEmp.fullName.toLowerCase()) ||
            log.actorName?.toLowerCase().includes(activeProfileEmp.fullName.toLowerCase())
        )
        .map((log: any) => ({
          id: `act-log-${log.id}`,
          category: log.module || 'System',
          title: log.action,
          detail: `${log.target} · By ${log.actorName}`,
          date: log.timestamp,
          badgeColor: 'bg-[#F2F2F2] text-[#525854] border-[#CBCBCB]',
        })),
    ];

    // Leave Balance Box Calculations (live from rawProfileEmp.leaveBalance)
    const totalLeaveEntitlement =
      (rawProfileEmp?.leaveBalance?.casualTotal ?? settings?.casualLeaveQuota ?? 12) +
      (rawProfileEmp?.leaveBalance?.sickTotal ?? settings?.sickLeaveQuota ?? 8) +
      (rawProfileEmp?.leaveBalance?.earnedTotal ?? settings?.earnedLeaveQuota ?? 15);
    const remainingCasual = Math.max(
      0,
      (rawProfileEmp?.leaveBalance?.casualTotal ?? 12) -
        (rawProfileEmp?.leaveBalance?.casualUsed ?? 0)
    );
    const remainingSick = Math.max(
      0,
      (rawProfileEmp?.leaveBalance?.sickTotal ?? 8) -
        (rawProfileEmp?.leaveBalance?.sickUsed ?? 0)
    );
    const remainingEarned = Math.max(
      0,
      (rawProfileEmp?.leaveBalance?.earnedTotal ?? 15) -
        (rawProfileEmp?.leaveBalance?.earnedUsed ?? 0)
    );
    const totalRemainingBalance = remainingCasual + remainingSick + remainingEarned;
    const usedLeavesCount = Math.max(0, totalLeaveEntitlement - totalRemainingBalance);

    // Attendance & Productive Hours Summaries for Profile
    const totalLoggedWorkHours = Number(
      empAtt.reduce((sum, a) => sum + (a.workHours || 0), 0).toFixed(1)
    );
    const totalProductiveHours = Number(
      empAtt
        .reduce((sum, a: any) => sum + (a.productiveHours ?? Math.max(0, (a.workHours || 0) - 0.75)), 0)
        .toFixed(1)
    );
    const lateArrivalsCount = empAtt.filter((a) => a.status === 'LATE' || a.lateByMinutes > 0).length;
    const totalLateMinutes = empAtt.reduce((sum, a) => sum + (a.lateByMinutes || 0), 0);
    const presentDaysCount = empAtt.filter(
      (a) => a.status === 'PRESENT' || a.status === 'LATE' || a.status === 'HALF_DAY'
    ).length;

    // Salary & Salary History Calculations
    const monthlyGross = Math.round(activeProfileEmp.annualCTC / 12);
    const lpaFormatted = `${(activeProfileEmp.annualCTC / 100000).toFixed(2)} LPA`;
    const basePay = Math.round(monthlyGross * 0.5);
    const hraPay = Math.round(monthlyGross * 0.3);
    const specialPay = Math.round(monthlyGross * 0.2);

    const salaryHistoryList: SalaryHistoryEntry[] = [
      {
        id: `${activeProfileEmp.id}-OCT-2026`,
        month: 'October 2026',
        paidDate: '2026-10-31',
        status: 'PROCESSED',
        basicSalary: basePay,
        hra: hraPay,
        specialAllowance: specialPay,
        commission: 4500,
        otherAdditions: 1500,
        lateComingDeduction: 500,
        emiDeduction: 2000,
        pfDeduction: 1800,
        tdsDeduction: 2500,
        otherTaxDeduction: 200,
        otherDeductions: 300,
        netSalary:
          basePay + hraPay + specialPay + 4500 + 1500 - (500 + 2000 + 1800 + 2500 + 200 + 300),
      },
      {
        id: `${activeProfileEmp.id}-SEP-2026`,
        month: 'September 2026',
        paidDate: '2026-09-30',
        status: 'DISBURSED',
        basicSalary: basePay,
        hra: hraPay,
        specialAllowance: specialPay,
        commission: 3000,
        otherAdditions: 1000,
        lateComingDeduction: 0,
        emiDeduction: 2000,
        pfDeduction: 1800,
        tdsDeduction: 2500,
        otherTaxDeduction: 200,
        otherDeductions: 0,
        netSalary:
          basePay + hraPay + specialPay + 3000 + 1000 - (0 + 2000 + 1800 + 2500 + 200 + 0),
      },
      {
        id: `${activeProfileEmp.id}-AUG-2026`,
        month: 'August 2026',
        paidDate: '2026-08-31',
        status: 'DISBURSED',
        basicSalary: basePay,
        hra: hraPay,
        specialAllowance: specialPay,
        commission: 5000,
        otherAdditions: 2000,
        lateComingDeduction: 1000,
        emiDeduction: 2000,
        pfDeduction: 1800,
        tdsDeduction: 2500,
        otherTaxDeduction: 200,
        otherDeductions: 500,
        netSalary:
          basePay + hraPay + specialPay + 5000 + 2000 - (1000 + 2000 + 1800 + 2500 + 200 + 500),
      },
    ];

    const maskCurrency = (amount: number | string) => {
      if (!showSalaryAmounts) return '₹ ••••••';
      if (typeof amount === 'string') return amount;
      return `₹${amount.toLocaleString('en-IN')}`;
    };

    const PROFILE_TABS: { id: ProfileTabId; label: string; count?: number }[] = [
      { id: 'overview', label: 'Overview' },
      { id: 'attendance', label: 'Attendance', count: empAtt.length },
      { id: 'leave', label: 'Leave', count: empLeaves.length },
      { id: 'payroll', label: 'Payroll', count: salaryHistoryList.length },
      { id: 'documents', label: 'Documents', count: empDocs.length },
      { id: 'letters', label: 'Letters', count: empLetters.length },
      { id: 'considerations', label: 'Considerations', count: empCons.length },
      { id: 'activity', label: 'Activity', count: combinedEmployeeActivities.length },
    ];

    return (
      <div className="p-4 lg:p-6 max-w-[1440px] mx-auto space-y-6">
        {/* Top Back Navigation & Contextual Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {activeModule !== 'my-profile' && currentUser.role !== 'EMPLOYEE' ? (
            <button
              type="button"
              onClick={() => {
                setSelectedEmpId(null);
                navigateTo(
                  currentUser.role === 'MANAGER' || activeModule === 'my-team'
                    ? 'my-team'
                    : 'people',
                  null,
                  null
                );
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#CBCBCB] text-xs font-semibold text-[#141A17] hover:border-[#164C38] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#164C38]" />
              {currentUser.role === 'MANAGER' || activeModule === 'my-team'
                ? 'Back to My Assigned Team'
                : 'Back to Directory'}
            </button>
          ) : (
            <span className="px-2.5 py-1 rounded-md bg-[#164C38]/10 border border-[#164C38]/30 text-[#164C38] text-xs font-bold">
              My Employee Profile
            </span>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {isManager && activeProfileEmp.id !== currentUser.employeeId && (
              <>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F2F2F2] border border-[#CBCBCB] text-xs font-semibold text-[#525854]">
                  <Lock className="w-3.5 h-3.5 text-[#164C38]" />
                  <span>Read-Only Manager View</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setMgrConsReason('');
                    setMgrConsNote('');
                    setShowMgrConsiderationModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#4E1617] text-[#F2F2F2] text-xs font-semibold hover:bg-[#380F10] transition-colors cursor-pointer"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Submit Consideration on Behalf</span>
                </button>
              </>
            )}

            {isHRAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setLeaveBehalfEmp(activeProfileEmp);
                    setLeaveReason('');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#4E1617] text-[#F2F2F2] text-xs font-semibold hover:bg-[#380F10] transition-colors cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  File Leave on Behalf
                </button>
                {isHRAdmin && (rawProfileEmp?.employeeType === 'Probation' || (rawProfileEmp as any)?.status === 'In Probation') && (
                  <button
                    type="button"
                    onClick={() => confirmEmployeeProbation(activeProfileEmp.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#164C38] text-[#F2F2F2] text-xs font-bold hover:bg-[#0F3627] transition-colors cursor-pointer border border-[#F2F2F2]/30 shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#F2F2F2]" />
                    Confirm Permanent Status
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => openEditModal(activeProfileEmp)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#164C38] text-[#F2F2F2] text-xs font-semibold hover:bg-[#0F3627] transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Employee
                </button>
              </>
            )}
          </div>
        </div>

        {/* Profile Hero Header — Vertically Responsive on Mobile */}
        <div className="bg-[#164C38] text-[#F2F2F2] rounded-2xl p-4 sm:p-6 border border-[#0F3627] flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <AvatarInitials name={activeProfileEmp.fullName} size="lg" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-[#F2F2F2]">
                  {activeProfileEmp.fullName}
                </h1>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#4E1617] text-[#F2F2F2] font-semibold">
                  {activeProfileEmp.employeeCode}
                </span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#0C2B1F] text-[#F2F2F2] font-semibold border border-white/20">
                  {rawProfileEmp?.employeeType || 'Permanent'}
                </span>
                <StatusBadge status={activeProfileEmp.status} />
              </div>
              <p className="text-xs text-[#CBCBCB] mt-1">
                {activeProfileEmp.designation} · {activeProfileEmp.department}
              </p>
              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-1.5 sm:gap-4 mt-2.5 text-xs text-[#CBCBCB]">
                <span className="flex items-center gap-1.5 break-all">
                  <Mail className="w-3.5 h-3.5 shrink-0" /> {activeProfileEmp.email}
                </span>
                <span className="flex items-center gap-1.5 font-mono">
                  <Phone className="w-3.5 h-3.5 shrink-0" /> {activeProfileEmp.phone}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 shrink-0" /> {activeProfileEmp.location}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 bg-[#0F3627] p-3.5 rounded-xl border border-white/15 w-full lg:w-auto shrink-0">
            <div className="flex sm:block items-center justify-between py-1 sm:py-0 border-b sm:border-b-0 border-white/10">
              <span className="text-[10px] uppercase tracking-wider text-[#CBCBCB] block">
                Role Access
              </span>
              <span className="text-xs font-bold font-mono text-[#F2F2F2]">
                {activeProfileEmp.role === 'EMPLOYEE' || activeProfileEmp.role === 'MANAGER'
                  ? 'TEAM MEMBER'
                  : activeProfileEmp.role}
              </span>
            </div>
            <div className="flex sm:block items-center justify-between py-1 sm:py-0 border-b sm:border-b-0 border-white/10">
              <span className="text-[10px] uppercase tracking-wider text-[#CBCBCB] block">
                Reporting To
              </span>
              <span className="text-xs font-bold text-[#F2F2F2]">
                {activeProfileEmp.reportingManager}
              </span>
            </div>
            <div className="flex sm:block items-center justify-between pt-1 sm:pt-0">
              <span className="text-[10px] uppercase tracking-wider text-[#CBCBCB] block">
                Joined On
              </span>
              <span className="text-xs font-bold font-mono text-[#F2F2F2]">
                {activeProfileEmp.joiningDate}
              </span>
            </div>
          </div>
        </div>

        {/* Profile Tab Navigation Strip — Stacked Vertically on Mobile, Horizontal on Tablet/Desktop */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-1.5 bg-white border border-[#CBCBCB] p-2 rounded-xl">
          {PROFILE_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setProfileTab(t.id)}
              className={`w-full sm:w-auto px-3.5 py-2.5 sm:py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center justify-between sm:justify-start gap-2 min-h-[42px] sm:min-h-0 ${
                profileTab === t.id
                  ? 'bg-[#164C38] text-[#F2F2F2]'
                  : 'text-[#525854] hover:text-[#141A17] hover:bg-[#F2F2F2]'
              }`}
            >
              <span>{t.label}</span>
              {t.count !== undefined && (
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                    profileTab === t.id
                      ? 'bg-[#4E1617] text-[#F2F2F2]'
                      : 'bg-[#F2F2F2] text-[#525854]'
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* =================================================================== */}
        {/* TAB 1: OVERVIEW (WITH STRUCTURED ADDRESS + CONFIDENTIAL DETAILS BOX) */}
        {/* =================================================================== */}
        {profileTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Box 1: Personal & Employment Information (with Structured Address & Employee Type) */}
            <div className="bg-white border border-[#E5E5E5] rounded-xl p-5 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-2.5">
                <h3 className="text-sm font-bold text-[#0A0A0A]">
                  Personal & Employment Information
                </h3>
                {(isHRAdmin || activeProfileEmp.id === currentUser.employeeId) && (
                  <button
                    type="button"
                    onClick={() => {
                      const structured = rawProfileEmp?.structuredAddress;
                      setAddrLine1(structured?.addressLine1 || '402 Horology Park');
                      setAddrLine2(structured?.addressLine2 || 'Dumas Road, Athwa Lines');
                      setAddrCity(structured?.city || 'Surat');
                      setAddrState(structured?.state || 'Gujarat');
                      setAddrPostal(structured?.postalCode || '395007');
                      setAddrCountry(structured?.country || 'India');
                      setEditEmployeeType(rawProfileEmp?.employeeType || 'Permanent');
                      setShowAddressModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#F5F5F5] hover:bg-[#E5E5E5] text-[#0A0A0A] border border-[#D4D4D4] transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Address / Type</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div className="p-3 rounded-lg bg-[#FAFAFA] border border-[#E5E5E5]">
                  <span className="text-[#525252] block">Full Official Name</span>
                  <span className="font-bold text-[#0A0A0A] mt-0.5 block">
                    {activeProfileEmp.fullName}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-[#FAFAFA] border border-[#E5E5E5]">
                  <span className="text-[#525252] block">Employee ID</span>
                  <span className="font-mono font-bold text-[#0A0A0A] mt-0.5 block">
                    {activeProfileEmp.employeeCode}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-[#FAFAFA] border border-[#E5E5E5]">
                  <span className="text-[#525252] block">Department</span>
                  <span className="font-bold text-[#0A0A0A] mt-0.5 block">
                    {activeProfileEmp.department}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-[#FAFAFA] border border-[#E5E5E5]">
                  <span className="text-[#525252] block">Designation</span>
                  <span className="font-bold text-[#0A0A0A] mt-0.5 block">
                    {activeProfileEmp.designation}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-[#FAFAFA] border border-[#E5E5E5]">
                  <span className="text-[#525252] block">Reporting Manager</span>
                  <span className="font-bold text-[#0A0A0A] mt-0.5 block">
                    {activeProfileEmp.reportingManager}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-[#FAFAFA] border border-[#E5E5E5]">
                  <span className="text-[#525252] block">Employee Type</span>
                  <span className="inline-block mt-1 font-mono font-bold text-[11px] px-2 py-0.5 rounded bg-[#0A0A0A] text-white">
                    {rawProfileEmp?.employeeType || 'Permanent'}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-[#FAFAFA] border border-[#E5E5E5]">
                  <span className="text-[#525252] block">Date of Birth & Gender</span>
                  <span className="font-mono font-semibold text-[#0A0A0A] mt-0.5 block">
                    {rawProfileEmp?.dob || '1995-06-15'} · {rawProfileEmp?.gender || 'Specified'}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-[#FAFAFA] border border-[#E5E5E5]">
                  <span className="text-[#525252] block">City & State</span>
                  <span className="font-semibold text-[#0A0A0A] mt-0.5 block">
                    {rawProfileEmp?.structuredAddress?.city || 'Surat'}, {rawProfileEmp?.structuredAddress?.state || 'Gujarat'}
                  </span>
                </div>
                <div className="sm:col-span-2 p-3.5 rounded-lg bg-[#FAFAFA] border border-[#E5E5E5] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[#525252] font-semibold block">Residential Address</span>
                    <span className="text-[10px] text-[#737373] font-mono">
                      {rawProfileEmp?.structuredAddress?.postalCode || '395007'} • {rawProfileEmp?.structuredAddress?.country || 'India'}
                    </span>
                  </div>
                  <div className="font-bold text-[#0A0A0A] leading-relaxed">
                    <div>{rawProfileEmp?.structuredAddress?.addressLine1 || '402 Horology Park'}</div>
                    {rawProfileEmp?.structuredAddress?.addressLine2 && (
                      <div className="text-[#525252] font-normal">{rawProfileEmp.structuredAddress.addressLine2}</div>
                    )}
                    <div className="text-xs text-[#525252] font-normal mt-0.5">
                      {rawProfileEmp?.structuredAddress?.city || 'Surat'}, {rawProfileEmp?.structuredAddress?.state || 'Gujarat'} - {rawProfileEmp?.structuredAddress?.postalCode || '395007'}, {rawProfileEmp?.structuredAddress?.country || 'India'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Box 2: Confidential Details with Eye / Eye-Off Toggle (Hidden by Default) */}
            <div className="bg-white border border-[#E5E5E5] rounded-xl p-5 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-2.5">
                <div className="flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-[#0A0A0A]" />
                  <h3 className="text-sm font-bold text-[#0A0A0A]">Confidential Details</h3>
                </div>
                {/* Master Eye / Eye-Off Toggle Button */}
                <button
                  type="button"
                  onClick={() => setShowAllConfidential((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#FAFAFA] hover:bg-[#F5F5F5] border border-[#D4D4D4] text-[#0A0A0A] transition-colors cursor-pointer"
                  title={showAllConfidential ? 'Hide all confidential information' : 'Show all confidential information'}
                >
                  {showAllConfidential ? (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>Hide Confidential</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Reveal Confidential</span>
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                {/* Bank Name */}
                <div className="p-3 rounded-lg bg-[#FAFAFA] border border-[#E5E5E5]">
                  <span className="text-[#525252] block">Bank Name & Branch</span>
                  <span className="font-bold text-[#0A0A0A] mt-0.5 block">
                    {rawProfileEmp?.bankName || 'HDFC Bank · Surat Athwa Branch'}
                  </span>
                </div>

                {/* Bank Account Number & IFSC (Confidential) */}
                <div className="p-3 rounded-lg bg-[#FAFAFA] border border-[#E5E5E5]">
                  <div className="flex items-center justify-between">
                    <span className="text-[#525252] block">Bank Account & IFSC</span>
                    <button
                      type="button"
                      onClick={() => toggleField('bank')}
                      className="p-1 rounded text-[#525252] hover:text-[#0A0A0A] transition-colors cursor-pointer"
                      title={isFieldRevealed('bank') ? 'Hide bank details' : 'Show bank details'}
                    >
                      {isFieldRevealed('bank') ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <span className="font-mono font-bold text-[#0A0A0A] mt-0.5 block">
                    {isFieldRevealed('bank')
                      ? `${rawProfileEmp?.bankAccountNumber || activeProfileEmp.bankAccount} · ${rawProfileEmp?.ifscCode || 'HDFC0001234'}`
                      : '•••• •••• •••• 1001 · ••••••••'}
                  </span>
                </div>

                {/* Aadhaar Number (Confidential) */}
                <div className="p-3 rounded-lg bg-[#FAFAFA] border border-[#E5E5E5]">
                  <div className="flex items-center justify-between">
                    <span className="text-[#525252] block">Aadhaar Number</span>
                    <button
                      type="button"
                      onClick={() => toggleField('aadhaar')}
                      className="p-1 rounded text-[#525252] hover:text-[#0A0A0A] transition-colors cursor-pointer"
                      title={isFieldRevealed('aadhaar') ? 'Hide Aadhaar number' : 'Show Aadhaar number'}
                    >
                      {isFieldRevealed('aadhaar') ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <span className="font-mono font-bold text-[#0A0A0A] mt-0.5 block">
                    {isFieldRevealed('aadhaar')
                      ? (rawProfileEmp?.aadhaarNumber || '8492 7104 2901 4109')
                      : '8492 •••• •••• 4109'}
                  </span>
                </div>

                {/* PAN Number (Confidential) */}
                <div className="p-3 rounded-lg bg-[#FAFAFA] border border-[#E5E5E5]">
                  <div className="flex items-center justify-between">
                    <span className="text-[#525252] block">PAN Number</span>
                    <button
                      type="button"
                      onClick={() => toggleField('pan')}
                      className="p-1 rounded text-[#525252] hover:text-[#0A0A0A] transition-colors cursor-pointer"
                      title={isFieldRevealed('pan') ? 'Hide PAN number' : 'Show PAN number'}
                    >
                      {isFieldRevealed('pan') ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <span className="font-mono font-bold text-[#0A0A0A] mt-0.5 block">
                    {isFieldRevealed('pan')
                      ? (activeProfileEmp.panNumber || 'ARGPK1001F')
                      : 'ARGP••••••'}
                  </span>
                </div>

                {/* Document Numbers (UAN / PF) (Confidential) */}
                <div className="p-3 rounded-lg bg-[#FAFAFA] border border-[#E5E5E5]">
                  <div className="flex items-center justify-between">
                    <span className="text-[#525252] block">Document Numbers (UAN / PF)</span>
                    <button
                      type="button"
                      onClick={() => toggleField('uan')}
                      className="p-1 rounded text-[#525252] hover:text-[#0A0A0A] transition-colors cursor-pointer"
                      title={isFieldRevealed('uan') ? 'Hide UAN/PF' : 'Show UAN/PF'}
                    >
                      {isFieldRevealed('uan') ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <span className="font-mono font-bold text-[#0A0A0A] mt-0.5 block">
                    {isFieldRevealed('uan')
                      ? `UAN: ${rawProfileEmp?.uanNumber || '100948271904'} · PF: ${rawProfileEmp?.pfNumber || 'GJ/SRT/09412'}`
                      : 'UAN: •••••••••••• · PF: ••••••••••'}
                  </span>
                </div>

                {/* Emergency Contact Phone (Confidential) */}
                <div className="p-3 rounded-lg bg-[#FAFAFA] border border-[#E5E5E5]">
                  <div className="flex items-center justify-between">
                    <span className="text-[#525252] block">Emergency Contact & Tax</span>
                    <button
                      type="button"
                      onClick={() => toggleField('emergency')}
                      className="p-1 rounded text-[#525252] hover:text-[#0A0A0A] transition-colors cursor-pointer"
                      title={isFieldRevealed('emergency') ? 'Hide emergency contact' : 'Show emergency contact'}
                    >
                      {isFieldRevealed('emergency') ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <span className="font-mono font-semibold text-[#0A0A0A] mt-0.5 block">
                    {isFieldRevealed('emergency')
                      ? `${rawProfileEmp?.emergencyContactPhone || '+91 98201 00111'} · New Tax Regime`
                      : '+91 ••••• ••111 · New Tax Regime'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: ATTENDANCE (NORMAL VIEW & CALENDAR VIEW)                     */}
        {/* =================================================================== */}
        {profileTab === 'attendance' && (
          <div className="space-y-4">
            {/* Productive Hours, Working Hours & Attendance Summaries */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white border border-[#CBCBCB] rounded-xl p-4 flex sm:block items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#525854] block">
                  Present / Logged Days
                </span>
                <span className="text-lg sm:text-xl font-bold font-mono text-[#164C38] sm:mt-1 block">
                  {presentDaysCount} Days
                </span>
              </div>
              <div className="bg-white border border-[#CBCBCB] rounded-xl p-4 flex sm:block items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#525854] block">
                  Total Working Hours
                </span>
                <span className="text-lg sm:text-xl font-bold font-mono text-[#141A17] sm:mt-1 block">
                  {totalLoggedWorkHours}h
                </span>
              </div>
              <div className="bg-white border border-[#CBCBCB] rounded-xl p-4 flex sm:block items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#525854] block">
                  Productive Hours (Net)
                </span>
                <span className="text-lg sm:text-xl font-bold font-mono text-[#164C38] sm:mt-1 block">
                  {totalProductiveHours}h
                </span>
              </div>
              <div className="bg-white border border-[#CBCBCB] rounded-xl p-4 flex sm:block items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#525854] block">
                  Late Arrivals & Mins
                </span>
                <span className="text-lg sm:text-xl font-bold font-mono text-[#4E1617] sm:mt-1 block">
                  {lateArrivalsCount} ({totalLateMinutes}m)
                </span>
              </div>
            </div>

            {/* Two View Options Toggle: Normal View | Calendar View */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex flex-col sm:inline-flex sm:flex-row items-stretch sm:items-center gap-1.5 bg-white border border-[#CBCBCB] p-1.5 rounded-xl shadow-2xs w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setProfileAttView('normal')}
                  className={`w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[42px] sm:min-h-0 ${
                    profileAttView === 'normal'
                      ? 'bg-[#164C38] text-[#F2F2F2]'
                      : 'text-[#525854] hover:text-[#141A17]'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Normal View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setProfileAttView('calendar')}
                  className={`w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[42px] sm:min-h-0 ${
                    profileAttView === 'calendar'
                      ? 'bg-[#164C38] text-[#F2F2F2]'
                      : 'text-[#525854] hover:text-[#141A17]'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Calendar View</span>
                </button>
              </div>

              <ExportDropdown
                data={empAtt}
                filename={`${activeProfileEmp.employeeCode}_attendance`}
                title={`${activeProfileEmp.fullName} — Attendance History`}
              />
            </div>

            {profileAttView === 'normal' ? (
              <div className="space-y-2.5">
                {/* Mobile Cards — Vertically Stacked Fields */}
                <div className="space-y-2.5 md:hidden">
                  {empAtt.map((a) => (
                    <div
                      key={a.id}
                      className="bg-white border border-[#CBCBCB] rounded-2xl p-4 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-bold text-[#141A17]">
                          {a.date}
                        </span>
                        <StatusBadge status={a.status} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2.5 border-t border-[#F2F2F2] text-xs">
                        <div className="flex sm:block items-center justify-between px-3 py-2 rounded-xl bg-[#F2F2F2]/70">
                          <span className="text-[10px] font-bold uppercase text-[#525854] block">Punch In / Out</span>
                          <span className="font-mono font-semibold text-[#141A17]">
                            {a.punchIn || '—'} → {a.punchOut || '—'}
                          </span>
                        </div>
                        <div className="flex sm:block items-center justify-between px-3 py-2 rounded-xl bg-[#F2F2F2]/70">
                          <span className="text-[10px] font-bold uppercase text-[#525854] block">Working Hours</span>
                          <span className="font-mono font-bold text-[#164C38]">
                            {a.workHours}h
                          </span>
                        </div>
                        <div className="flex sm:block items-center justify-between px-3 py-2 rounded-xl bg-[#F2F2F2]/70">
                          <span className="text-[10px] font-bold uppercase text-[#525854] block">Late Arrival</span>
                          <span className="font-mono font-semibold text-[#4E1617]">
                            {a.lateByMinutes > 0 ? `+${a.lateByMinutes}m` : '0m'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block bg-white border border-[#CBCBCB] rounded-xl overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-[#CBCBCB] bg-[#F2F2F2] flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#164C38]">
                      Attendance History ({empAtt.length} Records)
                    </h3>
                  </div>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#CBCBCB] text-[10px] font-bold uppercase text-[#525854] bg-[#F2F2F2]">
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Check In</th>
                        <th className="py-3 px-4">Check Out</th>
                        <th className="py-3 px-4">Working Hours</th>
                        <th className="py-3 px-4">Late Minutes</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#CBCBCB]/60 text-xs">
                      {empAtt.map((a) => (
                        <tr key={a.id} className="hover:bg-[#F2F2F2]">
                          <td className="py-3 px-4 font-mono font-semibold">{a.date}</td>
                          <td className="py-3 px-4 font-mono">{a.punchIn || '—'}</td>
                          <td className="py-3 px-4 font-mono">{a.punchOut || '—'}</td>
                          <td className="py-3 px-4 font-mono">{a.workHours}h</td>
                          <td className="py-3 px-4 font-mono text-[#4E1617]">
                            {a.lateByMinutes > 0 ? `+${a.lateByMinutes}m` : '0m'}
                          </td>
                          <td className="py-3 px-4">
                            <StatusBadge status={a.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              (() => {
                const monthNames = [
                  'January',
                  'February',
                  'March',
                  'April',
                  'May',
                  'June',
                  'July',
                  'August',
                  'September',
                  'October',
                  'November',
                  'December',
                ];
                const totalDays = new Date(profCalYear, profCalMonth + 1, 0).getDate();
                const startOffset = new Date(profCalYear, profCalMonth, 1).getDay();
                const monthPrefix = `${profCalYear}-${String(profCalMonth + 1).padStart(2, '0')}`;

                return (
                  <div className="bg-white border border-[#CBCBCB] rounded-2xl p-4 sm:p-5 space-y-4">
                    {/* Month & Year Navigation Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#CBCBCB]">
                      <div className="flex items-center justify-between sm:justify-start gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (profCalMonth === 0) {
                              setProfCalMonth(11);
                              setProfCalYear((y) => y - 1);
                            } else {
                              setProfCalMonth((m) => m - 1);
                            }
                            setProfSelectedDay(1);
                          }}
                          className="w-10 h-10 rounded-xl bg-[#F2F2F2] hover:bg-[#CBCBCB]/60 border border-[#CBCBCB] flex items-center justify-center text-[#141A17] cursor-pointer"
                          aria-label="Previous Month"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-1.5">
                          <select
                            value={profCalMonth}
                            onChange={(e) => {
                              setProfCalMonth(Number(e.target.value));
                              setProfSelectedDay(1);
                            }}
                            className="px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-xl text-xs sm:text-sm font-bold text-[#141A17] cursor-pointer"
                          >
                            {monthNames.map((m, idx) => (
                              <option key={m} value={idx}>
                                {m}
                              </option>
                            ))}
                          </select>
                          <select
                            value={profCalYear}
                            onChange={(e) => {
                              setProfCalYear(Number(e.target.value));
                              setProfSelectedDay(1);
                            }}
                            className="px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-xl text-xs sm:text-sm font-mono font-bold text-[#164C38] cursor-pointer"
                          >
                            {[2024, 2025, 2026, 2027, 2028].map((yr) => (
                              <option key={yr} value={yr}>
                                {yr}
                              </option>
                            ))}
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (profCalMonth === 11) {
                              setProfCalMonth(0);
                              setProfCalYear((y) => y + 1);
                            } else {
                              setProfCalMonth((m) => m + 1);
                            }
                            setProfSelectedDay(1);
                          }}
                          className="w-10 h-10 rounded-xl bg-[#F2F2F2] hover:bg-[#CBCBCB]/60 border border-[#CBCBCB] flex items-center justify-center text-[#141A17] cursor-pointer"
                          aria-label="Next Month"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setProfCalYear(2026);
                            setProfCalMonth(9);
                            setProfSelectedDay(6);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-[#164C38] hover:bg-[#0F3627] text-[#F2F2F2] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Today</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                        <div
                          key={d}
                          className="py-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#525854] bg-[#F2F2F2] rounded-lg"
                        >
                          {d}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1 sm:gap-2">
                      {Array.from({ length: startOffset }).map((_, idx) => (
                        <div
                          key={`empty-${idx}`}
                          className="min-h-[56px] sm:min-h-[76px] rounded-xl bg-[#F2F2F2]/40 border border-dashed border-[#CBCBCB]/60"
                        />
                      ))}
                      {Array.from({ length: totalDays }, (_, i) => i + 1).map((dayNum) => {
                        const dateStr = `${monthPrefix}-${String(dayNum).padStart(2, '0')}`;
                        const dayOfWeek = new Date(profCalYear, profCalMonth, dayNum).getDay();
                        const hol = (holidays || []).find((h: any) => h.date === dateStr);
                        const lv = empLeaves.find(
                          (l) => dateStr >= l.startDate && dateStr <= l.endDate
                        );
                        const att = empAtt.find((a) => a.date === dateStr);

                        let status = 'Upcoming';
                        let badge = 'bg-[#F2F2F2] text-[#525854]';
                        let cellBg = 'bg-white border-[#CBCBCB]';
                        let detail = '09:30 – 18:30';

                        const isPastOrToday =
                          profCalYear < 2026 ||
                          (profCalYear === 2026 && profCalMonth < 9) ||
                          (profCalYear === 2026 && profCalMonth === 9 && dayNum <= 6);

                        if (hol) {
                          status = 'Holiday';
                          badge = 'bg-[#4E1617] text-white';
                          cellBg = 'bg-[#4E1617]/10 border-[#4E1617]/30';
                          detail = hol.name;
                        } else if (lv) {
                          status = 'Leave';
                          badge = 'bg-amber-600 text-white';
                          cellBg = 'bg-amber-50/70 border-amber-300';
                          detail = `${lv.leaveType} Leave`;
                        } else if (att) {
                          if (att.status === 'ABSENT') {
                            status = 'Absent';
                            badge = 'bg-red-600 text-white';
                            cellBg = 'bg-red-50/70 border-red-200';
                            detail = 'No Check-In';
                          } else if (att.status === 'LATE' || att.lateByMinutes > 0) {
                            status = 'Late';
                            badge = 'bg-[#4E1617] text-white';
                            cellBg = 'bg-[#4E1617]/5 border-[#4E1617]/30';
                            detail = `${att.punchIn || '09:46'} · +${att.lateByMinutes}m`;
                          } else {
                            status = 'Present';
                            badge = 'bg-[#164C38] text-white';
                            cellBg = 'bg-[#164C38]/10 border-[#164C38]/30';
                            detail = `${att.punchIn || '09:30'} – ${att.punchOut || '18:30'}`;
                          }
                        } else if (dayOfWeek === 0) {
                          status = 'Weekly Off';
                          badge = 'bg-[#CBCBCB] text-[#141A17]';
                          cellBg = 'bg-[#F2F2F2]/60 border-[#CBCBCB]';
                          detail = 'Sunday Off';
                        } else if (isPastOrToday) {
                          status = 'Present';
                          badge = 'bg-[#164C38] text-white';
                          cellBg = 'bg-[#164C38]/10 border-[#164C38]/30';
                          detail = '09:30 – 18:30';
                        }

                        return (
                          <button
                            key={dayNum}
                            type="button"
                            onClick={() => setProfSelectedDay(dayNum)}
                            className={`min-h-[56px] sm:min-h-[76px] p-1.5 sm:p-2.5 rounded-xl border text-left flex flex-col justify-between cursor-pointer ${cellBg} ${
                              profSelectedDay === dayNum ? 'ring-2 ring-[#164C38]' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 w-full">
                              <span className="text-xs font-mono font-bold text-[#141A17]">
                                {dayNum}
                              </span>
                              <span
                                className={`hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${badge}`}
                              >
                                {status}
                              </span>
                            </div>
                            <div className="text-[9px] sm:text-[10px] font-mono text-[#141A17] mt-1 truncate">
                              <span className="sm:hidden">{status}</span>
                              <span className="hidden sm:inline">{detail}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: LEAVE (WITH NEW "BALANCE" BOX)                               */}
        {/* =================================================================== */}
        {profileTab === 'leave' && (
          <div className="space-y-5">
            {/* Balance Box showing Total Leave Entitlement & Remaining Leave Balance */}
            <div className="bg-white border border-[#CBCBCB] rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#CBCBCB] pb-2.5">
                <h3 className="text-sm font-bold text-[#164C38]">
                  Balance — Leave Entitlement & Remaining Quota
                </h3>
                <span className="text-xs font-mono font-semibold text-[#525854]">
                  Annual Cycle 2026
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="p-4 rounded-xl bg-[#164C38] text-[#F2F2F2] flex sm:block items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#CBCBCB] block">
                    Total Leave Entitlement
                  </span>
                  <span className="text-xl sm:text-2xl font-bold font-mono sm:mt-1 block">
                    {totalLeaveEntitlement} Days
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-[#4E1617] text-[#F2F2F2] flex sm:block items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#CBCBCB] block">
                    Remaining Leave Balance
                  </span>
                  <span className="text-xl sm:text-2xl font-bold font-mono sm:mt-1 block">
                    {totalRemainingBalance} Days
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB] flex sm:block items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-[#525854] block">
                    Casual Balance
                  </span>
                  <span className="text-lg font-bold font-mono text-[#164C38] sm:mt-1 block">
                    {remainingCasual} / {settings?.casualLeaveQuota || 12}
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB] flex sm:block items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-[#525854] block">
                    Sick Balance
                  </span>
                  <span className="text-lg font-bold font-mono text-[#164C38] sm:mt-1 block">
                    {remainingSick} / {settings?.sickLeaveQuota || 8}
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB] flex sm:block items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-[#525854] block">
                    Earned Balance (Used: {usedLeavesCount}d)
                  </span>
                  <span className="text-lg font-bold font-mono text-[#4E1617] sm:mt-1 block">
                    {remainingEarned} / {settings?.earnedLeaveQuota || 15}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-[#CBCBCB] rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#CBCBCB] bg-[#F2F2F2] flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#164C38]">
                  Leave History & Pending Requests ({empLeaves.length})
                </h3>
              </div>
              {empLeaves.length === 0 ? (
                <p className="p-8 text-center text-xs text-[#525854]">
                  No leave requests found for {activeProfileEmp.fullName}.
                </p>
              ) : (
                <>
                  {/* Mobile Leave Cards */}
                  <div className="divide-y divide-[#CBCBCB]/60 md:hidden">
                    {empLeaves.map((l) => (
                      <div key={l.id} className="p-4 space-y-2.5 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-[#164C38] text-sm">{l.leaveType} Leave</span>
                          <StatusBadge status={l.status} />
                        </div>
                        <div className="grid grid-cols-1 gap-1.5 pt-1">
                          <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#F2F2F2]">
                            <span className="text-[10px] font-bold uppercase text-[#525854]">Period</span>
                            <span className="font-mono font-semibold text-[#141A17]">
                              {l.startDate} → {l.endDate} ({l.days}d)
                            </span>
                          </div>
                          <div className="px-3 py-2 rounded-lg bg-[#F2F2F2] text-[#525854]">
                            <span className="text-[10px] font-bold uppercase text-[#141A17] block mb-0.5">Reason</span>
                            {l.reason}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#CBCBCB] text-[10px] font-bold uppercase text-[#525854] bg-[#F2F2F2]">
                          <th className="py-3 px-4">Type</th>
                          <th className="py-3 px-4">Period</th>
                          <th className="py-3 px-4">Duration</th>
                          <th className="py-3 px-4">Reason</th>
                          <th className="py-3 px-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#CBCBCB]/60 text-xs">
                        {empLeaves.map((l) => (
                          <tr key={l.id} className="hover:bg-[#F2F2F2]">
                            <td className="py-3 px-4 font-bold text-[#164C38]">{l.leaveType}</td>
                            <td className="py-3 px-4 font-mono">
                              {l.startDate} → {l.endDate}
                            </td>
                            <td className="py-3 px-4 font-mono">{l.days}d</td>
                            <td className="py-3 px-4 text-[#525854]">{l.reason}</td>
                            <td className="py-3 px-4">
                              <StatusBadge status={l.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: PAYROLL (EYE ICON, LPA, MONTHLY, PAYSLIP DOWNLOAD, HISTORY)  */}
        {/* =================================================================== */}
        {profileTab === 'payroll' && (
          <div className="space-y-5">
            {/* Top Compensation Card with Eye Icon Toggle */}
            <div className="bg-white border border-[#CBCBCB] rounded-xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#CBCBCB] pb-3">
                <div>
                  <h3 className="text-sm font-bold text-[#164C38]">
                    Payroll & Compensation Overview
                  </h3>
                  <p className="text-xs text-[#525854]">
                    Click the eye icon to reveal or mask confidential salary figures
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setShowSalaryAmounts((v) => !v)}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-1.5 rounded-lg bg-[#F2F2F2] border border-[#CBCBCB] text-xs font-semibold text-[#141A17] hover:border-[#164C38] cursor-pointer"
                  >
                    {showSalaryAmounts ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5 text-[#4E1617]" />
                        <span>Hide Salary</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5 text-[#164C38]" />
                        <span>Show Salary</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const latest = salaryHistoryList[0];
                      printPayslipDocument({
                        id: latest.id,
                        employeeId: activeProfileEmp.id,
                        employeeName: activeProfileEmp.fullName,
                        employeeCode: activeProfileEmp.employeeCode,
                        department: activeProfileEmp.department,
                        designation: activeProfileEmp.designation,
                        month: latest.month,
                        basicPay: latest.basicSalary,
                        hra: latest.hra,
                        specialAllowance: latest.specialAllowance,
                        grossMonthly:
                          latest.basicSalary +
                          latest.hra +
                          latest.specialAllowance +
                          latest.commission +
                          latest.otherAdditions,
                        pfDeduction: latest.pfDeduction,
                        professionalTax: latest.otherTaxDeduction,
                        tds: latest.tdsDeduction,
                        tdsDeduction: latest.tdsDeduction,
                        lopDeduction: latest.lateComingDeduction,
                        latePenaltyDeduction: latest.lateComingDeduction,
                        netPayable: latest.netSalary,
                        status: 'DISBURSED',
                        paidDays: 30,
                        lopDays: 0,
                      } as any);
                    }}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-1.5 rounded-lg bg-[#164C38] text-[#F2F2F2] text-xs font-semibold hover:bg-[#0F3627] cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Salary Payslip</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="p-4 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB]">
                  <span className="text-[10px] font-bold uppercase text-[#525854] block">
                    Annual LPA Package
                  </span>
                  <span className="text-lg sm:text-xl font-bold font-mono text-[#164C38] mt-1 block">
                    {showSalaryAmounts
                      ? `${lpaFormatted} (₹${activeProfileEmp.annualCTC.toLocaleString('en-IN')})`
                      : '₹ •••••• LPA'}
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB]">
                  <span className="text-[10px] font-bold uppercase text-[#525854] block">
                    Monthly Gross Salary
                  </span>
                  <span className="text-lg sm:text-xl font-bold font-mono text-[#141A17] mt-1 block">
                    {maskCurrency(monthlyGross)} / mo
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-[#525854] block">
                      Latest Net Salary Payslip
                    </span>
                    <span className="text-lg sm:text-xl font-bold font-mono text-[#4E1617] mt-1 block">
                      {maskCurrency(salaryHistoryList[0].netSalary)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenedSalaryEntry(salaryHistoryList[0])}
                    className="w-full sm:w-auto px-3 py-2 sm:py-1.5 rounded-lg bg-white border border-[#CBCBCB] text-xs font-semibold text-[#164C38] hover:border-[#164C38] cursor-pointer text-center"
                  >
                    Open Breakdown
                  </button>
                </div>
              </div>
            </div>

            {/* Salary History — Mobile Cards + Desktop Table */}
            <div className="bg-white border border-[#CBCBCB] rounded-xl overflow-hidden">
              <div className="px-4 sm:px-5 py-3.5 border-b border-[#CBCBCB] bg-[#F2F2F2] flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#164C38]">
                  Salary History (Tap any entry for full Additions & Deductions breakdown)
                </h3>
              </div>

              {/* Mobile Salary Cards */}
              <div className="divide-y divide-[#CBCBCB]/60 md:hidden">
                {salaryHistoryList.map((entry) => {
                  const totalAdd = entry.commission + entry.otherAdditions;
                  const totalDed =
                    entry.lateComingDeduction +
                    entry.emiDeduction +
                    entry.pfDeduction +
                    entry.tdsDeduction +
                    entry.otherTaxDeduction +
                    entry.otherDeductions;
                  return (
                    <div
                      key={entry.id}
                      onClick={() => setOpenedSalaryEntry(entry)}
                      className="p-4 space-y-3 hover:bg-[#F2F2F2]/60 cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-[#141A17]">{entry.month}</span>
                        <StatusBadge status={entry.status} />
                      </div>
                      <div className="grid grid-cols-1 gap-1.5 text-xs">
                        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#F2F2F2]">
                          <span className="text-[10px] font-bold uppercase text-[#525854]">Net Salary</span>
                          <span className="font-mono font-bold text-[#141A17]">
                            {maskCurrency(entry.netSalary)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#F2F2F2]">
                          <span className="text-[10px] font-bold uppercase text-[#525854]">Additions</span>
                          <span className="font-mono font-semibold text-[#164C38]">
                            +{maskCurrency(totalAdd)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#F2F2F2]">
                          <span className="text-[10px] font-bold uppercase text-[#525854]">Deductions</span>
                          <span className="font-mono font-semibold text-[#4E1617]">
                            -{maskCurrency(totalDed)}
                          </span>
                        </div>
                      </div>
                      <div
                        className="flex flex-col gap-2 pt-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => setOpenedSalaryEntry(entry)}
                          className="w-full py-2.5 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB] text-xs font-bold text-[#164C38] cursor-pointer"
                        >
                          View Breakdown
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            printPayslipDocument({
                              id: entry.id,
                              employeeId: activeProfileEmp.id,
                              employeeName: activeProfileEmp.fullName,
                              employeeCode: activeProfileEmp.employeeCode,
                              department: activeProfileEmp.department,
                              designation: activeProfileEmp.designation,
                              month: entry.month,
                              basicPay: entry.basicSalary,
                              hra: entry.hra,
                              specialAllowance: entry.specialAllowance,
                              grossMonthly:
                                entry.basicSalary +
                                entry.hra +
                                entry.specialAllowance +
                                totalAdd,
                              pfDeduction: entry.pfDeduction,
                              professionalTax: entry.otherTaxDeduction,
                              tds: entry.tdsDeduction,
                              tdsDeduction: entry.tdsDeduction,
                              lopDeduction: entry.lateComingDeduction,
                              latePenaltyDeduction: entry.lateComingDeduction,
                              netPayable: entry.netSalary,
                              status: 'DISBURSED',
                              paidDays: 30,
                              lopDays: 0,
                            } as any)
                          }
                          className="w-full py-2.5 rounded-xl bg-[#164C38] text-[#F2F2F2] text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download Payslip
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#CBCBCB] text-[10px] font-bold uppercase text-[#525854] bg-[#F2F2F2]">
                    <th className="py-3.5 px-5">Salary Month</th>
                    <th className="py-3.5 px-4">Base + Allowances</th>
                    <th className="py-3.5 px-4">Additions (Commission & Other)</th>
                    <th className="py-3.5 px-4">Total Deductions</th>
                    <th className="py-3.5 px-4">Net Salary</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-5 text-right">Payslip & Breakdown</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#CBCBCB]/60 text-xs">
                  {salaryHistoryList.map((entry) => {
                    const totalAdd = entry.commission + entry.otherAdditions;
                    const totalDed =
                      entry.lateComingDeduction +
                      entry.emiDeduction +
                      entry.pfDeduction +
                      entry.tdsDeduction +
                      entry.otherTaxDeduction +
                      entry.otherDeductions;
                    return (
                      <tr
                        key={entry.id}
                        onClick={() => setOpenedSalaryEntry(entry)}
                        className="hover:bg-[#F2F2F2] cursor-pointer"
                      >
                        <td className="py-3.5 px-5 font-bold text-[#141A17]">
                          {entry.month}
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          {maskCurrency(
                            entry.basicSalary + entry.hra + entry.specialAllowance
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[#164C38] font-semibold">
                          +{maskCurrency(totalAdd)}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[#4E1617] font-semibold">
                          -{maskCurrency(totalDed)}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-[#141A17]">
                          {maskCurrency(entry.netSalary)}
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={entry.status} />
                        </td>
                        <td
                          className="py-3.5 px-5 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setOpenedSalaryEntry(entry)}
                              className="px-2.5 py-1 rounded bg-[#F2F2F2] border border-[#CBCBCB] text-xs font-semibold text-[#164C38] cursor-pointer"
                            >
                              View Breakdown
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                printPayslipDocument({
                                  id: entry.id,
                                  employeeId: activeProfileEmp.id,
                                  employeeName: activeProfileEmp.fullName,
                                  employeeCode: activeProfileEmp.employeeCode,
                                  department: activeProfileEmp.department,
                                  designation: activeProfileEmp.designation,
                                  month: entry.month,
                                  basicPay: entry.basicSalary,
                                  hra: entry.hra,
                                  specialAllowance: entry.specialAllowance,
                                  grossMonthly:
                                    entry.basicSalary +
                                    entry.hra +
                                    entry.specialAllowance +
                                    totalAdd,
                                  pfDeduction: entry.pfDeduction,
                                  professionalTax: entry.otherTaxDeduction,
                                  tds: entry.tdsDeduction,
                                  tdsDeduction: entry.tdsDeduction,
                                  lopDeduction: entry.lateComingDeduction,
                                  latePenaltyDeduction: entry.lateComingDeduction,
                                  netPayable: entry.netSalary,
                                  status: 'DISBURSED',
                                  paidDays: 30,
                                  lopDays: 0,
                                } as any)
                              }
                              className="px-2.5 py-1 rounded bg-[#164C38] text-[#F2F2F2] text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Download className="w-3 h-3" />
                              Payslip
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                </table>
              </div>
            </div>

            {/* Opened Salary Entry Complete Breakdown Modal */}
            <ModalShell
              isOpen={!!openedSalaryEntry}
              onClose={() => setOpenedSalaryEntry(null)}
              title={`Salary Breakdown — ${openedSalaryEntry?.month || ''}`}
              subtitle={`${activeProfileEmp.fullName} (${activeProfileEmp.employeeCode}) · ${activeProfileEmp.designation}`}
              maxWidth="max-w-2xl"
            >
              {openedSalaryEntry && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Additions Column */}
                    <div className="p-4 rounded-xl bg-[#164C38]/5 border border-[#164C38]/30 space-y-2.5">
                      <h4 className="font-bold uppercase tracking-wider text-[#164C38] border-b border-[#164C38]/20 pb-1.5">
                        Salary & Additions
                      </h4>
                      <div className="flex justify-between">
                        <span className="text-[#525854]">Basic Salary</span>
                        <span className="font-mono font-semibold">
                          ₹{openedSalaryEntry.basicSalary.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#525854]">House Rent Allowance (HRA)</span>
                        <span className="font-mono font-semibold">
                          ₹{openedSalaryEntry.hra.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#525854]">Special Allowance</span>
                        <span className="font-mono font-semibold">
                          ₹{openedSalaryEntry.specialAllowance.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between text-[#164C38] font-semibold">
                        <span>Commission</span>
                        <span className="font-mono">
                          +₹{openedSalaryEntry.commission.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between text-[#164C38] font-semibold">
                        <span>Other Additions / Bonus</span>
                        <span className="font-mono">
                          +₹{openedSalaryEntry.otherAdditions.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {/* Deductions Column */}
                    <div className="p-4 rounded-xl bg-[#4E1617]/5 border border-[#4E1617]/30 space-y-2.5">
                      <h4 className="font-bold uppercase tracking-wider text-[#4E1617] border-b border-[#4E1617]/20 pb-1.5">
                        Deductions Breakdown
                      </h4>
                      <div className="flex justify-between">
                        <span className="text-[#525854]">Late Coming Deduction</span>
                        <span className="font-mono font-semibold text-[#4E1617]">
                          -₹{openedSalaryEntry.lateComingDeduction.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#525854]">EMI / Advance Recovery</span>
                        <span className="font-mono font-semibold text-[#4E1617]">
                          -₹{openedSalaryEntry.emiDeduction.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#525854]">Provident Fund (PF)</span>
                        <span className="font-mono font-semibold text-[#4E1617]">
                          -₹{openedSalaryEntry.pfDeduction.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#525854]">TDS (Income Tax)</span>
                        <span className="font-mono font-semibold text-[#4E1617]">
                          -₹{openedSalaryEntry.tdsDeduction.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#525854]">Other Tax (Professional Tax)</span>
                        <span className="font-mono font-semibold text-[#4E1617]">
                          -₹{openedSalaryEntry.otherTaxDeduction.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#525854]">Other Deductions</span>
                        <span className="font-mono font-semibold text-[#4E1617]">
                          -₹{openedSalaryEntry.otherDeductions.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Net Salary Footer */}
                  <div className="p-4 rounded-xl bg-[#164C38] text-[#F2F2F2] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#CBCBCB] block">
                        Final Net Salary Disbursed
                      </span>
                      <span className="text-xl font-bold font-mono">
                        ₹{openedSalaryEntry.netSalary.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        printPayslipDocument({
                          id: openedSalaryEntry.id,
                          employeeId: activeProfileEmp.id,
                          employeeName: activeProfileEmp.fullName,
                          employeeCode: activeProfileEmp.employeeCode,
                          department: activeProfileEmp.department,
                          designation: activeProfileEmp.designation,
                          month: openedSalaryEntry.month,
                          basicPay: openedSalaryEntry.basicSalary,
                          hra: openedSalaryEntry.hra,
                          specialAllowance: openedSalaryEntry.specialAllowance,
                          grossMonthly:
                            openedSalaryEntry.basicSalary +
                            openedSalaryEntry.hra +
                            openedSalaryEntry.specialAllowance +
                            openedSalaryEntry.commission +
                            openedSalaryEntry.otherAdditions,
                          pfDeduction: openedSalaryEntry.pfDeduction,
                          professionalTax: openedSalaryEntry.otherTaxDeduction,
                          tds: openedSalaryEntry.tdsDeduction,
                          tdsDeduction: openedSalaryEntry.tdsDeduction,
                          lopDeduction: openedSalaryEntry.lateComingDeduction,
                          latePenaltyDeduction: openedSalaryEntry.lateComingDeduction,
                          netPayable: openedSalaryEntry.netSalary,
                          status: 'DISBURSED',
                          paidDays: 30,
                          lopDays: 0,
                        } as any)
                      }
                      className="px-4 py-2 rounded-lg bg-[#F2F2F2] text-[#164C38] font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download Payslip PDF
                    </button>
                  </div>
                </div>
              )}
            </ModalShell>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 5: DOCUMENTS (NO KYC)                                           */}
        {/* =================================================================== */}
        {profileTab === 'documents' && (
          <div className="bg-white border border-[#CBCBCB] rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-[#164C38] border-b border-[#CBCBCB] pb-2.5">
              Employee Documents ({empDocs.length})
            </h3>
            {empDocs.length === 0 ? (
              <p className="py-6 text-center text-xs text-[#525854]">
                No documents uploaded for this employee yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {empDocs.map((d) => (
                  <div
                    key={d.id}
                    className="p-3.5 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB] flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-[#141A17]">{d.title}</p>
                      <p className="text-[11px] text-[#525854]">
                        {d.category === 'KYC' ? 'IDENTITY' : d.category} · Uploaded {d.uploadedOn || d.uploadedAt} · {d.fileSize}
                      </p>
                    </div>
                    <StatusBadge status={d.verified ? 'VERIFIED' : 'PENDING'} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 6: LETTERS (EMPLOYEE & DEPARTMENT LETTERS, NO POLICY ACK)       */}
        {/* =================================================================== */}
        {profileTab === 'letters' && (
          <div className="bg-white border border-[#CBCBCB] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#CBCBCB] pb-2.5">
              <div>
                <h3 className="text-sm font-bold text-[#164C38]">
                  Letters ({empLetters.length})
                </h3>
                <p className="text-xs text-[#525854]">
                  Official letters added by HR for {activeProfileEmp.fullName} or the {activeProfileEmp.department} department
                </p>
              </div>
              {isHRAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setLetterTitle('Letters');
                    setLetterBody(
                      `Official letter issued by HR for ${activeProfileEmp.fullName} (${activeProfileEmp.department}).`
                    );
                    setShowAddLetterModal(true);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-[#164C38] text-[#F2F2F2] text-xs font-semibold cursor-pointer"
                >
                  + Add Letter
                </button>
              )}
            </div>

            {empLetters.length === 0 ? (
              <p className="py-6 text-center text-xs text-[#525854]">
                No letters issued for this employee or department yet.
              </p>
            ) : (
              <div className="space-y-2.5">
                {empLetters.map((ltr: any) => {
                  const displayType = String(ltr.templateType || 'Letters').replace(
                    /Offer Letter/gi,
                    'Letters'
                  );
                  return (
                    <div
                      key={ltr.id}
                      className="p-4 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#164C38]/10 text-[#164C38]">
                            {displayType}
                          </span>
                          <span className="text-[10px] font-mono text-[#525854]">
                            Dept: {activeProfileEmp.department}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-[#141A17] mt-1">
                          {String(ltr.subject).replace(/Offer Letter/gi, 'Letters')}
                        </p>
                        <p className="text-[11px] text-[#525854] font-mono mt-0.5">
                          Issued {ltr.issuedDate} by {ltr.issuedBy}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          printOfficialLetter({
                            recipientName: activeProfileEmp.fullName,
                            employeeCode: activeProfileEmp.employeeCode,
                            designation: activeProfileEmp.designation,
                            department: activeProfileEmp.department,
                            joiningDate: activeProfileEmp.joiningDate,
                            annualCTC: activeProfileEmp.annualCTC,
                            letterType: 'OFFER',
                            issuedBy: ltr.issuedBy,
                            customRemarks: ltr.content,
                          })
                        }
                        className="w-full sm:w-auto px-3.5 py-2 sm:py-1.5 rounded-lg bg-white border border-[#CBCBCB] text-xs font-semibold text-[#164C38] hover:border-[#164C38] cursor-pointer text-center"
                      >
                        Download / Print
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <ModalShell
              isOpen={showAddLetterModal}
              onClose={() => setShowAddLetterModal(false)}
              title="Add Letter for Employee / Department"
              subtitle="Letters added here appear directly in the employee's Letters section"
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  generateAndSaveLetter({
                    employeeId: activeProfileEmp.id,
                    templateType: 'Letters' as any,
                    subject:
                      letterTargetScope === 'DEPARTMENT'
                        ? `[${activeProfileEmp.department} Dept] ${letterTitle}`
                        : `${letterTitle} — ${activeProfileEmp.fullName}`,
                    content: letterBody,
                  });
                  setShowAddLetterModal(false);
                }}
                className="space-y-3.5 text-xs"
              >
                <div>
                  <label className="block font-bold uppercase text-[#525854] mb-1">
                    Target Scope
                  </label>
                  <select
                    value={letterTargetScope}
                    onChange={(e) => setLetterTargetScope(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg"
                  >
                    <option value="EMPLOYEE">
                      Specific Employee ({activeProfileEmp.fullName})
                    </option>
                    <option value="DEPARTMENT">
                      Entire Department ({activeProfileEmp.department})
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold uppercase text-[#525854] mb-1">
                    Letter Subject / Title
                  </label>
                  <input
                    type="text"
                    required
                    value={letterTitle}
                    onChange={(e) => setLetterTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase text-[#525854] mb-1">
                    Letter Content
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={letterBody}
                    onChange={(e) => setLetterBody(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-[#164C38] text-[#F2F2F2] font-semibold"
                  >
                    Save Letter
                  </button>
                </div>
              </form>
            </ModalShell>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 7: CONSIDERATIONS                                               */}
        {/* =================================================================== */}
        {profileTab === 'considerations' && (
          <div className="bg-white border border-[#CBCBCB] rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#CBCBCB] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#164C38]">
                  Late Arrival & Attendance Considerations ({empCons.length})
                </h3>
                <p className="text-xs text-[#525854] mt-0.5">
                  Two-stage approval workflow: Submitted → Manager Review → HR Final Review → Final Status
                </p>
              </div>
              {isManager && activeProfileEmp.id !== currentUser.employeeId && (
                <button
                  type="button"
                  onClick={() => {
                    setMgrConsReason('');
                    setMgrConsNote('');
                    setShowMgrConsiderationModal(true);
                  }}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#4E1617] hover:bg-[#380F10] text-[#F2F2F2] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>+ Submit Consideration for {activeProfileEmp.fullName}</span>
                </button>
              )}
            </div>
            {empCons.length === 0 ? (
              <p className="py-6 text-center text-xs text-[#525854]">
                No consideration requests recorded for this employee.
              </p>
            ) : (
              <div className="space-y-3">
                {empCons.map((c: any) => (
                  <div
                    key={c.id}
                    className="p-4 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB] space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white border border-[#CBCBCB] text-[#164C38]">
                            {c.id}
                          </span>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#4E1617]/10 text-[#4E1617]">
                            {c.category || c.type}
                          </span>
                          <span className="text-[11px] font-mono text-[#525854]">
                            Date: {c.date || c.submittedAt}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-[#141A17] mt-1.5">{c.title}</p>
                        <p className="text-xs text-[#525854] mt-0.5">
                          <strong className="text-[#141A17]">Reason:</strong> {c.reason || c.description}
                        </p>
                        {c.supportingNote && (
                          <p className="text-xs text-[#164C38] mt-1">
                            <strong>Supporting Note:</strong> {c.supportingNote}
                          </p>
                        )}
                        <p className="text-[11px] text-[#525854] mt-1">
                          Submitted by: <strong className="text-[#141A17]">{c.raisedBy}</strong> (
                          {c.raisedByRole || 'EMPLOYEE'})
                        </p>
                      </div>
                      <div className="flex flex-col items-start sm:items-end gap-1.5 shrink-0">
                        <StatusBadge status={c.status} />
                        {c.status === 'APPROVED' && (
                          <span className="text-[10px] font-mono text-[#164C38] font-semibold">
                            {c.affectsAttendancePenalty ? '✓ Penalty Waived' : 'No Penalty Change'} ·{' '}
                            {c.affectsSalaryDeduction ? '✓ Salary Adjusted' : 'No Salary Change'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Approval Timeline History */}
                    {Array.isArray(c.approvalHistory) && c.approvalHistory.length > 0 && (
                      <div className="pt-2.5 border-t border-[#CBCBCB]/70 space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#525854] block">
                          Approval History & Audit Trail
                        </span>
                        <div className="space-y-1">
                          {c.approvalHistory.map((step: any, sIdx: number) => (
                            <div
                              key={sIdx}
                              className="text-[11px] bg-white px-3 py-1.5 rounded-lg border border-[#CBCBCB] flex flex-col sm:flex-row sm:items-center justify-between gap-1"
                            >
                              <div>
                                <span className="font-bold text-[#164C38]">
                                  [{step.stage.replace(/_/g, ' ')}]
                                </span>{' '}
                                <span className="font-semibold text-[#141A17]">
                                  {step.actorName} ({step.actorRole})
                                </span>{' '}
                                — <span className="font-bold">{step.action}</span>:{' '}
                                <span className="text-[#525854]">{step.note}</span>
                              </div>
                              <span className="font-mono text-[10px] text-[#525854] shrink-0">
                                {step.timestamp}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 8: ACTIVITY (ALL LEAVE, CONSIDERATION & RELEVANT ACTIVITIES)    */}
        {/* =================================================================== */}
        {profileTab === 'activity' && (
          <div className="bg-white border border-[#CBCBCB] rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-[#164C38] border-b border-[#CBCBCB] pb-2.5">
              Complete Employee Activity Feed (Leave, Consideration, Attendance & Letters)
            </h3>
            {combinedEmployeeActivities.length === 0 ? (
              <p className="py-6 text-center text-xs text-[#525854]">
                No activities found for this employee.
              </p>
            ) : (
              <div className="space-y-2.5">
                {combinedEmployeeActivities.map((act) => (
                  <div
                    key={act.id}
                    className="p-3.5 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${act.badgeColor}`}
                        >
                          {act.category}
                        </span>
                        <span className="font-bold text-[#141A17]">{act.title}</span>
                      </div>
                      <p className="text-[11px] text-[#525854]">{act.detail}</p>
                    </div>
                    <span className="font-mono text-[11px] text-[#525854] shrink-0">
                      {act.date}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Manager Submit Consideration on Behalf Modal */}
        <ModalShell
          isOpen={showMgrConsiderationModal}
          onClose={() => setShowMgrConsiderationModal(false)}
          title={`Submit Consideration on Behalf — ${activeProfileEmp.fullName}`}
          subtitle="Managers can submit a consideration request on behalf of an assigned team member. It will be forwarded to HR for final review."
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!mgrConsReason.trim()) return;
              submitConsideration({
                employeeId: activeProfileEmp.id,
                date: mgrConsDate,
                type: mgrConsType as any,
                title: `${mgrConsType} — ${activeProfileEmp.fullName}`,
                category: mgrConsType,
                reason: mgrConsReason.trim(),
                supportingNote:
                  mgrConsNote.trim() ||
                  `Submitted and endorsed by Reporting Manager ${currentUser.fullName}.`,
                supportingDocument: 'Manager_Supporting_Endorsement.pdf',
              });
              setShowMgrConsiderationModal(false);
              setProfileTab('considerations');
            }}
            className="space-y-4 text-xs"
          >
            <div className="p-3 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#525854] block">
                  Team Member
                </span>
                <span className="font-bold text-[#141A17]">
                  {activeProfileEmp.fullName} ({activeProfileEmp.employeeCode})
                </span>
              </div>
              <span className="px-2.5 py-1 rounded bg-[#164C38]/10 text-[#164C38] font-semibold">
                Forwards to HR Final Review
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold uppercase text-[#525854] mb-1">
                  Attendance / Incident Date *
                </label>
                <input
                  type="date"
                  required
                  value={mgrConsDate}
                  onChange={(e) => setMgrConsDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-bold uppercase text-[#525854] mb-1">
                  Consideration Category *
                </label>
                <select
                  value={mgrConsType}
                  onChange={(e) => setMgrConsType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg font-semibold"
                >
                  <option value="Late Arrival Waiver">Late Arrival Waiver</option>
                  <option value="Missed Punch Regularization">Missed Punch Regularization</option>
                  <option value="Half-Day Waiver">Half-Day Waiver</option>
                  <option value="Work From Home">Work From Home</option>
                  <option value="Client Visit">Client Visit</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold uppercase text-[#525854] mb-1">
                Reason for Consideration *
              </label>
              <textarea
                rows={3}
                required
                value={mgrConsReason}
                onChange={(e) => setMgrConsReason(e.target.value)}
                placeholder="Describe why this attendance or shift exception should be considered..."
                className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg"
              />
            </div>

            <div>
              <label className="block font-bold uppercase text-[#525854] mb-1">
                Manager Supporting Note *
              </label>
              <textarea
                rows={2}
                required
                value={mgrConsNote}
                onChange={(e) => setMgrConsNote(e.target.value)}
                placeholder="Add your supporting verification note for HR final review..."
                className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#CBCBCB]">
              <button
                type="button"
                onClick={() => setShowMgrConsiderationModal(false)}
                className="px-3.5 py-2 rounded-lg font-semibold text-[#525854]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#164C38] hover:bg-[#0F3627] text-[#F2F2F2] font-semibold cursor-pointer"
              >
                Submit & Forward to HR
              </button>
            </div>
          </form>
        </ModalShell>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-[1440px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#CBCBCB]">
        <div>
          <span className="px-2.5 py-0.5 rounded-md bg-[#4E1617]/10 border border-[#4E1617]/30 text-[#4E1617] text-[10px] font-bold uppercase tracking-wider">
            {activeModule === 'my-team' ? 'Manager Team View' : 'Argos Watch Employees'}
          </span>
          <h1 className="text-xl font-bold text-[#141A17] tracking-tight mt-1.5">
            {activeModule === 'my-team'
              ? 'My Assigned Team Directory'
              : 'Employees'}
          </h1>
          <p className="text-xs text-[#525854] mt-0.5">
            Manage employee records, notice periods, profiles, and employee archive
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <ExportDropdown
            data={activeDirectoryTab === 'ACTIVE' ? scopedEmployees : archivedEmployees}
            filename={activeDirectoryTab === 'ACTIVE' ? 'argos_watch_employees' : 'argos_watch_employee_archive'}
            title={activeDirectoryTab === 'ACTIVE' ? 'Argos Watch — Official Employee Directory' : 'Argos Watch — Employee Archive'}
          />
          {permissions.People?.actions.includes('CREATE') && (
            <button
              onClick={openAddModal}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#164C38] hover:bg-[#0F3627] text-[#F2F2F2] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Onboard New Employee
            </button>
          )}
        </div>
      </div>

      {/* Admin / HR Segmented Tabs: Active Employees vs Employee Archive */}
      {isHRAdmin && activeModule !== 'my-team' && (
        <div className="flex items-center gap-2 border-b border-[#CBCBCB] pb-3">
          <button
            type="button"
            onClick={() => setActiveDirectoryTab('ACTIVE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeDirectoryTab === 'ACTIVE'
                ? 'bg-[#164C38] text-white shadow-xs'
                : 'bg-white border border-[#CBCBCB] text-[#525854] hover:text-[#141A17]'
            }`}
          >
            <span>Active Employees</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                activeDirectoryTab === 'ACTIVE' ? 'bg-white/20 text-white' : 'bg-[#F2F2F2] text-[#525854]'
              }`}
            >
              {scopedEmployees.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDirectoryTab('ARCHIVE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeDirectoryTab === 'ARCHIVE'
                ? 'bg-[#4E1617] text-white shadow-xs'
                : 'bg-white border border-[#CBCBCB] text-[#525854] hover:text-[#141A17]'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Employee Archive</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                activeDirectoryTab === 'ARCHIVE' ? 'bg-white/20 text-white' : 'bg-[#F2F2F2] text-[#525854]'
              }`}
            >
              {archivedEmployees.length}
            </span>
          </button>
        </div>
      )}

      {/* Search & Team View Bar */}
      <div className="bg-white border border-[#CBCBCB] rounded-xl p-3.5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-[#525854] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeModule === 'my-team'
                  ? "Search permitted team members by name or employee ID..."
                  : "Search by name, email, employee code, designation, or department..."
              }
              className="w-full pl-8 pr-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs text-[#141A17] focus:outline-none focus:border-[#0051d5]"
            />
          </div>

          {activeModule === 'my-team' ? (
            <div className="flex items-center gap-2 text-xs text-[#525854] shrink-0">
              <span className="font-semibold text-[#141A17]">{scopedEmployees.length}</span> team member{scopedEmployees.length === 1 ? '' : 's'}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="px-2.5 py-1.5 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs font-medium text-[#141A17]"
              >
                {departmentFilterOptions.map((d) => (
                  <option key={d} value={d}>
                    {d === 'ALL' ? 'All Departments' : d}
                  </option>
                ))}
              </select>

              <select
                value={filterManager}
                onChange={(e) => setFilterManager(e.target.value)}
                className="px-2.5 py-1.5 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs font-medium text-[#141A17]"
              >
                {managersList.map((m) => (
                  <option key={m} value={m}>
                    {m === 'ALL' ? 'All Managers' : `Mgr: ${m}`}
                  </option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-2.5 py-1.5 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs font-medium text-[#141A17]"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="ON_LEAVE">On Leave</option>
                <option value="PROBATION">Probation</option>
              </select>

              <select
                value={filterEmploymentType}
                onChange={(e) => setFilterEmploymentType(e.target.value)}
                className="px-2.5 py-1.5 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs font-medium text-[#141A17]"
              >
                <option value="ALL">All Employment Types</option>
                <option value="Permanent">Permanent</option>
                <option value="Probation">Probation</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
                <option value="Part-time">Part-time</option>
                <option value="Consultant">Consultant</option>
                <option value="Temporary">Temporary</option>
                <option value="Other">Other</option>
              </select>

              <div className="flex items-center gap-1 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg px-2 py-1">
                <ArrowUpDown className="w-3.5 h-3.5 text-[#525854]" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent text-xs font-medium text-[#141A17] focus:outline-none"
                >
                  <option value="fullName">Sort: Name</option>
                  <option value="department">Sort: Department</option>
                  <option value="joiningDate">Sort: Joining Date</option>
                </select>
                <button
                  onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
                  className="px-1.5 py-0.5 rounded bg-white text-[10px] font-mono font-bold text-[#141A17] border border-[#CBCBCB]"
                >
                  {sortOrder.toUpperCase()}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =================================================================== */}
      {/* ACTIVE EMPLOYEES VIEW                                               */}
      {/* =================================================================== */}
      {activeDirectoryTab === 'ACTIVE' && (
        <>
          {/* Mobile-First Active Employee Cards */}
          <div className="space-y-3 md:hidden">
            {scopedEmployees.map((emp) => {
              const isOnNotice =
                emp.status === 'On Notice' ||
                (emp.noticePeriod?.applicable && emp.noticePeriod?.status === 'Active');
              return (
                <div
                  key={emp.id}
                  onClick={() => {
                    setSelectedEmpId(emp.id);
                    setProfileTab('overview');
                  }}
                  className="bg-white border border-[#CBCBCB] rounded-2xl p-4 space-y-3 shadow-2xs cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <AvatarInitials name={emp.fullName} size="md" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-bold text-[#141A17] truncate">
                            {emp.fullName}
                          </span>
                          <span className="font-mono text-[10px] px-1.5 py-0.5 bg-[#F2F2F2] border border-[#CBCBCB] rounded text-[#164C38]">
                            {emp.employeeCode}
                          </span>
                          {isOnNotice && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-300">
                              On Notice
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#525854] truncate mt-0.5">
                          {emp.designation} · {emp.department}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={isOnNotice ? 'On Notice' : emp.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#F2F2F2] text-xs">
                    <div className="px-3 py-2 rounded-xl bg-[#F2F2F2]">
                      <span className="text-[10px] font-bold uppercase text-[#525854] block">
                        Reporting Manager
                      </span>
                      <span className="font-semibold text-[#141A17]">{emp.reportingManager}</span>
                    </div>
                    <div className="px-3 py-2 rounded-xl bg-[#F2F2F2]">
                      <span className="text-[10px] font-bold uppercase text-[#525854] block">
                        Joined On
                      </span>
                      <span className="font-mono font-semibold text-[#141A17]">{emp.joiningDate}</span>
                    </div>
                  </div>

                  <div
                    className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEmpId(emp.id);
                        setProfileTab('overview');
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-[#164C38] text-[#F2F2F2] text-xs font-bold text-center cursor-pointer"
                    >
                      View Profile
                    </button>
                    {isHRAdmin && (
                      <button
                        type="button"
                        onClick={() => openNoticePeriodModal(emp)}
                        className="w-full py-2 px-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 text-xs font-semibold text-center cursor-pointer"
                      >
                        Notice Period
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Active Employee Table */}
          <div className="hidden md:block bg-white border border-[#CBCBCB] rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#CBCBCB] text-[10px] font-bold uppercase tracking-wider text-[#525854] bg-[#F2F2F2]">
                    <th className="py-3.5 px-5">Employee & Contact</th>
                    <th className="py-3.5 px-4">Department & Designation</th>
                    <th className="py-3.5 px-4">Access Role</th>
                    <th className="py-3.5 px-4">Reporting To</th>
                    <th className="py-3.5 px-4">Joined</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#CBCBCB]/60 text-xs">
                  {scopedEmployees.map((emp) => {
                    const isOnNotice =
                      emp.status === 'On Notice' ||
                      (emp.noticePeriod?.applicable && emp.noticePeriod?.status === 'Active');
                    return (
                      <tr
                        key={emp.id}
                        onClick={() => {
                          setSelectedEmpId(emp.id);
                          setProfileTab('overview');
                        }}
                        className="hover:bg-[#F2F2F2] transition-colors cursor-pointer"
                      >
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <AvatarInitials name={emp.fullName} size="md" />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-[#141A17]">{emp.fullName}</span>
                                <span className="font-mono text-[10px] px-1.5 py-0.2 bg-[#F2F2F2] border border-[#CBCBCB] rounded text-[#164C38]">
                                  {emp.employeeCode}
                                </span>
                                {isOnNotice && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-800 border border-purple-300">
                                    Notice
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-[#525854] mt-0.5">{emp.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-[#141A17]">{emp.department}</div>
                          <div className="text-[11px] text-[#525854] mt-0.5">{emp.designation}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1 items-start">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                                emp.role === 'HR' || emp.role === 'ADMIN'
                                  ? 'bg-[#4E1617]/10 text-[#4E1617] border-[#4E1617]/30'
                                  : emp.role === 'MANAGER'
                                  ? 'bg-[#164C38]/10 text-[#164C38] border-[#164C38]/30'
                                  : 'bg-[#F2F2F2] text-[#525854] border-[#CBCBCB]'
                              }`}
                            >
                              {emp.role === 'EMPLOYEE' ? 'TEAM MEMBER' : emp.role}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-[#525854] font-medium">
                          {emp.reportingManager}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[#525854]">{emp.joiningDate}</td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={isOnNotice ? 'On Notice' : emp.status} />
                        </td>
                        <td
                          className="py-3.5 px-5 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            {/* ActionMenu without Leave button as required */}
                            <ActionMenu
                              items={[
                                {
                                  label: 'View Profile',
                                  icon: <Briefcase className="w-3.5 h-3.5" />,
                                  onClick: () => {
                                    setSelectedEmpId(emp.id);
                                    setProfileTab('overview');
                                  },
                                },
                                {
                                  label: 'Attendance',
                                  icon: <Clock className="w-3.5 h-3.5" />,
                                  onClick: () => {
                                    setSelectedEmpId(emp.id);
                                    setProfileTab('attendance');
                                  },
                                },
                                {
                                  label: 'Documents',
                                  icon: <FileText className="w-3.5 h-3.5" />,
                                  onClick: () => {
                                    setSelectedEmpId(emp.id);
                                    setProfileTab('documents');
                                  },
                                },
                                ...(isHRAdmin
                                  ? [
                                      {
                                        label: 'Notice Period',
                                        icon: <Clock className="w-3.5 h-3.5 text-purple-600" />,
                                        onClick: () => openNoticePeriodModal(emp),
                                      },
                                      {
                                        label: 'Edit Employee',
                                        icon: <Edit3 className="w-3.5 h-3.5" />,
                                        onClick: () => openEditModal(emp),
                                      },
                                      {
                                        label: 'Deactivate',
                                        icon: <Trash2 className="w-3.5 h-3.5" />,
                                        variant: 'danger' as const,
                                        onClick: () => {
                                          setDeactivatingEmp(emp);
                                          setDeactivationReasonInput('');
                                        },
                                      },
                                    ]
                                  : []),
                              ]}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* =================================================================== */}
      {/* EMPLOYEE ARCHIVE & FINAL EXIT MANAGEMENT VIEW                        */}
      {/* =================================================================== */}
      {activeDirectoryTab === 'ARCHIVE' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <div className="flex items-center gap-2">
                <Archive className="w-4 h-4 text-slate-700" />
                <h3 className="font-bold text-slate-800 text-sm">
                  Employee Archive & Exit Register
                </h3>
              </div>
              <p className="text-slate-600 mt-1">
                Deactivated employees reside here permanently. You can <strong>Restore</strong> employees deactivated by mistake, or <strong>Initiate Final Exit</strong> for completed separations. Historical attendance, payroll, and leave records are retained.
              </p>
            </div>
            <span className="font-mono px-3 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold shrink-0">
              {archivedEmployees.length} Record{archivedEmployees.length === 1 ? '' : 's'}
            </span>
          </div>

          {archivedEmployees.length === 0 ? (
            <div className="bg-white border border-[#CBCBCB] rounded-xl p-12 text-center text-xs text-[#525854]">
              <Archive className="w-8 h-8 text-[#525854] mx-auto mb-2 opacity-50" />
              <p className="font-semibold text-sm text-[#141A17]">No Archived Employees</p>
              <p className="mt-1">When an employee is deactivated, their profile moves here for recovery or final exit processing.</p>
            </div>
          ) : (
            <>
              {/* Mobile Archived Cards */}
              <div className="space-y-3 md:hidden">
                {archivedEmployees.map((emp: any) => {
                  const isExited = emp.isExited || emp.status === 'Exited';
                  const exitDate = emp.finalExit?.effectiveLastWorkingDate || emp.deactivatedAt?.slice(0, 10) || 'Archived';
                  return (
                    <div
                      key={emp.id}
                      className="bg-white border border-slate-300 rounded-2xl p-4 space-y-3 shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <AvatarInitials name={emp.fullName} size="md" />
                          <div className="min-w-0">
                            <span className="text-sm font-bold text-[#141A17] block truncate">
                              {emp.fullName}
                            </span>
                            <span className="font-mono text-[10px] text-[#525854]">
                              {emp.employeeCode || emp.id} · {emp.department}
                            </span>
                          </div>
                        </div>
                        <StatusBadge status={isExited ? 'Exited' : 'Inactive'} />
                      </div>

                      <div className="text-xs space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Joined:</span>
                          <span className="font-mono font-medium">{emp.joiningDate}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Separation / Archive Date:</span>
                          <span className="font-mono font-bold text-slate-800">{exitDate}</span>
                        </div>
                        {emp.finalExit ? (
                          <div className="pt-1 border-t border-slate-200 text-slate-700">
                            <span className="font-bold">[{emp.finalExit.exitType}]</span> {emp.finalExit.exitReason}
                          </div>
                        ) : emp.deactivationReason ? (
                          <div className="pt-1 border-t border-slate-200 text-slate-600 italic">
                            Reason: {emp.deactivationReason}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setRestoringEmp(emp);
                            setRestoreReasonInput('');
                          }}
                          className="flex-1 py-2 px-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-emerald-100"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Restore
                        </button>
                        {!isExited && (
                          <button
                            type="button"
                            onClick={() => openFinalExitModal(emp)}
                            className="flex-1 py-2 px-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-rose-100"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            Final Exit
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Archived Table */}
              <div className="hidden md:block bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100">
                        <th className="py-3.5 px-5">Employee & ID</th>
                        <th className="py-3.5 px-4">Department & Designation</th>
                        <th className="py-3.5 px-4">Joining Date</th>
                        <th className="py-3.5 px-4">Separation Date</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4">Exit / Archive Reason</th>
                        <th className="py-3.5 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs">
                      {archivedEmployees.map((emp: any) => {
                        const isExited = emp.isExited || emp.status === 'Exited';
                        const exitDate = emp.finalExit?.effectiveLastWorkingDate || emp.deactivatedAt?.slice(0, 10) || 'Archived';
                        return (
                          <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3.5 px-5">
                              <div className="flex items-center gap-3">
                                <AvatarInitials name={emp.fullName} size="md" />
                                <div>
                                  <div className="font-bold text-[#141A17]">{emp.fullName}</div>
                                  <div className="font-mono text-[11px] text-[#525854]">
                                    {emp.employeeCode || emp.id}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-medium text-[#141A17]">{emp.department}</div>
                              <div className="text-[11px] text-[#525854]">{emp.designation}</div>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-[#525854]">{emp.joiningDate}</td>
                            <td className="py-3.5 px-4 font-mono font-medium text-slate-800">{exitDate}</td>
                            <td className="py-3.5 px-4">
                              <StatusBadge status={isExited ? 'Exited' : 'Inactive'} />
                            </td>
                            <td className="py-3.5 px-4 max-w-xs">
                              {emp.finalExit ? (
                                <div>
                                  <span className="font-bold text-slate-800">
                                    [{emp.finalExit.exitType}]
                                  </span>{' '}
                                  <span className="text-slate-600">{emp.finalExit.exitReason}</span>
                                  {emp.finalExit.mandatoryInternalNote && (
                                    <p className="text-[11px] text-slate-500 italic mt-0.5 truncate">
                                      Note: {emp.finalExit.mandatoryInternalNote}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-600 italic">
                                  {emp.deactivationReason || 'Deactivated via HR Admin'}
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRestoringEmp(emp);
                                    setRestoreReasonInput('');
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
                                  title="Restore employee who was deactivated by mistake"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Restore</span>
                                </button>
                                {!isExited && (
                                  <button
                                    type="button"
                                    onClick={() => openFinalExitModal(emp)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-bold hover:bg-rose-100 transition-colors cursor-pointer"
                                    title="Initiate Resignation or Termination final exit"
                                  >
                                    <UserX className="w-3.5 h-3.5" />
                                    <span>Initiate Final Exit</span>
                                  </button>
                                )}
                                {isExited && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      printOfficialLetter({
                                        templateType:
                                          emp.finalExit?.exitType === 'Termination'
                                            ? 'Termination Letter'
                                            : 'Resignation Acceptance Letter',
                                        employeeName: emp.fullName,
                                        employeeId: emp.employeeCode || emp.id,
                                        designation: emp.designation,
                                        department: emp.department,
                                        joiningDate: emp.joiningDate,
                                        lastWorkingDate: emp.finalExit?.effectiveLastWorkingDate,
                                        date: emp.finalExit?.finalizedAt?.slice(0, 10) || '2026-10-06',
                                        subject: `Official ${emp.finalExit?.exitType || 'Exit'} Acceptance Letter`,
                                        content: `This official letter confirms the ${emp.finalExit?.exitType?.toLowerCase()} of ${emp.fullName} (${emp.employeeCode || emp.id}) from Argos Watch Enterprise.\n\nDesignation: ${emp.designation}\nDepartment: ${emp.department}\nEffective Last Working Date: ${emp.finalExit?.effectiveLastWorkingDate}\nExit Reason: ${emp.finalExit?.exitReason}\n\nInternal Exit Note: ${emp.finalExit?.mandatoryInternalNote || 'Exit formalities verified by HR'}\n\nAll historical statutory, attendance, and payroll records have been securely retained in the enterprise ledger.\n\nSigned by: ${emp.finalExit?.finalizedBy || 'HR Executive Operations'}`,
                                      })
                                    }
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-bold hover:bg-blue-100 transition-colors cursor-pointer"
                                    title="View & Print Official Exit Letter"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                    <span>Exit Letter</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* MODALS: ONBOARDING, DEACTIVATE, RESTORE, FINAL EXIT, NOTICE PERIOD  */}
      {/* =================================================================== */}

      {/* COMPLETE ZOHO PEOPLE-INSPIRED 7-STEP ONBOARDING & PROFILE EDIT MODAL */}
      <EmployeeOnboardingModal
        isOpen={showEmpModal}
        onClose={() => setShowEmpModal(false)}
        editingEmp={editingEmp}
        departments={departments}
        allEmployees={allEmployees}
        onSave={handleSaveOnboardingEmployee}
        addToast={addToast}
      />

      {/* Deactivate Employee Modal */}
      <ModalShell
        isOpen={!!deactivatingEmp}
        onClose={() => setDeactivatingEmp(null)}
        title={`Deactivate Employee — ${deactivatingEmp?.fullName || ''}`}
      >
        <form onSubmit={handleConfirmDeactivation} className="space-y-4 text-xs">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
              Moving to Employee Archive
            </p>
            <p className="text-[11px] text-amber-800">
              Deactivating will move this employee to the <strong>Employee Archive</strong>. Deactivation does not complete final exit. You can restore them if done by mistake, or initiate a formal resignation/termination workflow from the archive. Historical attendance, payroll, and leave records will remain preserved.
            </p>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Deactivation Reason / Note *
            </label>
            <textarea
              rows={3}
              required
              value={deactivationReasonInput}
              onChange={(e) => setDeactivationReasonInput(e.target.value)}
              placeholder="e.g. Employee requested leave of absence, pending exit formalization, or temporary deactivation..."
              className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setDeactivatingEmp(null)}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-xs font-bold bg-[#4E1617] text-white hover:bg-[#380F10] cursor-pointer"
            >
              Confirm Deactivation
            </button>
          </div>
        </form>
      </ModalShell>

      {/* Restore Employee Modal */}
      <ModalShell
        isOpen={!!restoringEmp}
        onClose={() => setRestoringEmp(null)}
        title={`Restore Employee — ${restoringEmp?.fullName || ''}`}
      >
        <form onSubmit={handleConfirmRestore} className="space-y-4 text-xs">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4 text-emerald-700" />
              Reactivate Employee Record
            </p>
            <p className="text-[11px] text-emerald-800">
              Restoring this employee returns them to Active status without duplicating their employee ID or historical records.
            </p>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Restoration Reason / Note (Optional)
            </label>
            <input
              type="text"
              value={restoreReasonInput}
              onChange={(e) => setRestoreReasonInput(e.target.value)}
              placeholder="e.g. Deactivated by mistake; Reinstatement approved"
              className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setRestoringEmp(null)}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-xs font-bold bg-[#164C38] text-white hover:bg-[#0F3627] cursor-pointer"
            >
              Confirm & Restore Employee
            </button>
          </div>
        </form>
      </ModalShell>

      {/* Final Exit Workflow Modal */}
      <ModalShell
        isOpen={!!exitModalEmp}
        onClose={() => setExitModalEmp(null)}
        title={`Initiate Final Exit — ${exitModalEmp?.fullName || ''} (${exitModalEmp?.employeeCode || exitModalEmp?.id || ''})`}
      >
        <form onSubmit={handleConfirmFinalExit} className="space-y-4 text-xs max-h-[75vh] overflow-y-auto pr-1">
          <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-xs">
            <span className="font-bold text-slate-900 block">{exitModalEmp?.fullName}</span>
            <span className="text-slate-600 text-[11px]">
              {exitModalEmp?.designation} · {exitModalEmp?.department} · Joined: {exitModalEmp?.joiningDate}
            </span>
          </div>

          {/* Exit Type */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Exit Type *</label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer font-semibold ${
                  exitType === 'Resignation'
                    ? 'bg-blue-50 border-blue-400 text-blue-900'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="exitType"
                  value="Resignation"
                  checked={exitType === 'Resignation'}
                  onChange={() => setExitType('Resignation')}
                  className="text-blue-600"
                />
                <span>Resignation</span>
              </label>

              <label
                className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer font-semibold ${
                  exitType === 'Termination'
                    ? 'bg-rose-50 border-rose-400 text-rose-900'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="exitType"
                  value="Termination"
                  checked={exitType === 'Termination'}
                  onChange={() => setExitType('Termination')}
                  className="text-rose-600"
                />
                <span>Termination</span>
              </label>
            </div>
          </div>

          {/* Effective Last Working Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Effective Last Working Date *
              </label>
              <input
                type="date"
                required
                value={exitEffectiveDate}
                onChange={(e) => setExitEffectiveDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg font-mono text-xs"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Exit Reason *</label>
              <select
                value={exitReason}
                onChange={(e) => setExitReason(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg text-xs font-medium"
              >
                <option value="Personal Reasons / Career Growth">Personal Reasons / Career Growth</option>
                <option value="Better Opportunity">Better Opportunity</option>
                <option value="Relocation">Relocation</option>
                <option value="Higher Studies">Higher Studies</option>
                <option value="Health / Medical Reasons">Health / Medical Reasons</option>
                <option value="Performance Separation">Performance Separation</option>
                <option value="Company Restructuring">Company Restructuring</option>
                <option value="Mutual Separation Agreement">Mutual Separation Agreement</option>
              </select>
            </div>
          </div>

          {/* Notice Period Details */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={exitNoticeServed}
                onChange={(e) => setExitNoticeServed(e.target.checked)}
                className="rounded text-[#164C38]"
              />
              <span>Notice Period Served</span>
            </label>

            {exitNoticeServed && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Notice Start Date</label>
                  <input
                    type="date"
                    value={exitNoticeStart}
                    onChange={(e) => setExitNoticeStart(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-[#CBCBCB] rounded-lg font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Notice End Date</label>
                  <input
                    type="date"
                    value={exitNoticeEnd}
                    onChange={(e) => setExitNoticeEnd(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-[#CBCBCB] rounded-lg font-mono text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Mandatory Internal Note */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Mandatory Internal Note *
            </label>
            <textarea
              rows={2}
              required
              value={exitInternalNote}
              onChange={(e) => setExitInternalNote(e.target.value)}
              placeholder="Record mandatory operational handover, asset return status, or administrative notes..."
              className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg text-xs"
            />
          </div>

          {/* Optional Additional Remarks */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Additional Remarks (Optional)
            </label>
            <textarea
              rows={2}
              value={exitRemarks}
              onChange={(e) => setExitRemarks(e.target.value)}
              placeholder="Any additional remarks for future reference..."
              className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg text-xs"
            />
          </div>

          {/* Exit Letter Selection */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Exit Letter Template Selection
            </label>
            {(masterLetterTemplates || []).length > 0 ? (
              <select
                value={exitSelectedTemplateId}
                onChange={(e) => setExitSelectedTemplateId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg text-xs"
              >
                <option value="">-- No letter generation (Record Exit Only) --</option>
                {masterLetterTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title || t.name} ({t.type})
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-xs">
                No configured exit letter template found in company letters. You can configure letter templates in Company Letters.
              </p>
            )}
          </div>

          {/* Preview Letter Step */}
          {exitSelectedTemplateId && (
            <div>
              <button
                type="button"
                onClick={() => setExitShowPreview((v) => !v)}
                className="text-xs font-semibold text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
              >
                {exitShowPreview ? 'Hide Letter Preview' : 'Preview Generated Exit Letter'}
              </button>

              {exitShowPreview && (
                <div className="mt-2 p-3 bg-slate-50 border border-slate-300 rounded-xl space-y-1.5 font-sans">
                  <div className="text-[11px] font-bold text-slate-900 border-b pb-1">
                    Preview: Official {exitType} Acceptance Letter
                  </div>
                  <p className="text-[11px] text-slate-700 leading-relaxed whitespace-pre-wrap">
                    This official letter confirms the {exitType.toLowerCase()} of {exitModalEmp?.fullName} ({exitModalEmp?.employeeCode || exitModalEmp?.id}) from Argos Watch Enterprise, effective {exitEffectiveDate}. Reason: {exitReason}. Handover and exit note: {exitInternalNote || '[Pending]'}.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setExitModalEmp(null)}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg text-xs font-bold bg-[#4E1617] text-white hover:bg-[#380F10] cursor-pointer"
            >
              Confirm & Finalize Exit
            </button>
          </div>
        </form>
      </ModalShell>

      {/* Notice Period Management Modal */}
      <ModalShell
        isOpen={!!noticeModalEmp}
        onClose={() => setNoticeModalEmp(null)}
        title={`Notice Period Management — ${noticeModalEmp?.fullName || ''} (${noticeModalEmp?.employeeCode || noticeModalEmp?.id || ''})`}
      >
        <form onSubmit={handleSaveNoticePeriod} className="space-y-4 text-xs">
          {/* Applicable toggle */}
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div>
              <span className="font-bold text-slate-800 block">Notice Period Applicable</span>
              <span className="text-[11px] text-slate-500">
                Is this employee required to serve a notice period?
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={noticeApplicable}
                onChange={(e) => setNoticeApplicable(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          {noticeApplicable && (
            <>
              {/* Duration & Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Notice Duration *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={noticeDuration}
                    onChange={(e) => {
                      const dur = Number(e.target.value);
                      setNoticeDuration(dur);
                      setNoticeExpectedDate(computeExpectedLastWorkingDay(noticeStartDate, dur, noticeUnit));
                    }}
                    className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Duration Unit</label>
                  <select
                    value={noticeUnit}
                    onChange={(e) => {
                      const u = e.target.value as 'Days' | 'Months';
                      setNoticeUnit(u);
                      setNoticeExpectedDate(computeExpectedLastWorkingDay(noticeStartDate, noticeDuration, u));
                    }}
                    className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg text-xs"
                  >
                    <option value="Days">Days</option>
                    <option value="Months">Months</option>
                  </select>
                </div>
              </div>

              {/* Notice Type / Reason */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Notice Type / Reason
                </label>
                <input
                  type="text"
                  value={noticeType}
                  onChange={(e) => setNoticeType(e.target.value)}
                  placeholder="e.g. Resignation Notice, Separation Notice, Company Reorganization"
                  className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg text-xs"
                />
              </div>

              {/* Start Date & Expected Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Notice Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={noticeStartDate}
                    onChange={(e) => {
                      const st = e.target.value;
                      setNoticeStartDate(st);
                      setNoticeExpectedDate(computeExpectedLastWorkingDay(st, noticeDuration, noticeUnit));
                    }}
                    className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Expected Last Working Date (Calculated) *
                  </label>
                  <input
                    type="date"
                    required
                    value={noticeExpectedDate}
                    onChange={(e) => setNoticeExpectedDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg font-mono text-xs font-bold text-purple-800"
                  />
                </div>
              </div>

              {/* Actual Last Working Date & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Actual Last Working Date (If different)
                  </label>
                  <input
                    type="date"
                    value={noticeActualDate}
                    onChange={(e) => setNoticeActualDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Notice Status *</label>
                  <select
                    value={noticeStatus}
                    onChange={(e) => setNoticeStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg text-xs font-bold"
                  >
                    <option value="Not Started">Not Started</option>
                    <option value="Active">Active (Serving Notice)</option>
                    <option value="Completed">Completed</option>
                    <option value="Waived">Waived</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Internal Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Internal Notes</label>
                <textarea
                  rows={2}
                  value={noticeInternalNotes}
                  onChange={(e) => setNoticeInternalNotes(e.target.value)}
                  placeholder="Operational handover timeline, manager agreements, or waivers..."
                  className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg text-xs"
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setNoticeModalEmp(null)}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg text-xs font-bold bg-[#164C38] text-white hover:bg-[#0F3627] cursor-pointer"
            >
              Save Notice Period
            </button>
          </div>
        </form>
      </ModalShell>
    </div>
  );
}
