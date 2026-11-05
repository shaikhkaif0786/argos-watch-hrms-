import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  BarChart3,
  Search,
  Filter,
  FileSpreadsheet,
  AlertTriangle,
  Clock,
  Calendar,
  FileText,
  HelpCircle,
  IndianRupee,
  User,
  ChevronDown,
  X,
  ArrowLeft,
  Download,
  Check,
  Layers,
  ExternalLink,
} from 'lucide-react';
import { useHRMS } from '../../context/HRMSContext';
import { ExportDropdown, AvatarInitials, StatusBadge } from '../ui/EnterpriseComponents';
import {
  exportDataToFormat,
  exportToExcelXLSX,
  exportMultiSheetExcelXLSX,
} from '../../lib/exportUtils';
import {
  calculateLateDeduction,
  getNormalizedPunchesForRecord,
} from '../../lib/attendanceCalculations';

export type ReportTypeId =
  | 'attendance'
  | 'consideration'
  | 'late-coming'
  | 'late-salary-deduction'
  | 'overtime'
  | 'leave'
  | 'final-combined';

export type EmployeeDetailTabId =
  | 'attendance'
  | 'multiple-punches'
  | 'late-coming'
  | 'late-salary-deduction'
  | 'overtime'
  | 'leave'
  | 'considerations'
  | 'punch-exceptions';

interface ReportMeta {
  id: ReportTypeId;
  label: string;
  badge: string;
  description: string;
  icon: React.ElementType;
}

const REPORT_TYPES: ReportMeta[] = [
  {
    id: 'attendance',
    label: 'Attendance Report',
    badge: 'Core Daily',
    description:
      'Daily shift attendance, punch in/out timestamps, effective working hours, and punch exceptions sub-view',
    icon: Calendar,
  },
  {
    id: 'consideration',
    label: 'Consideration Report',
    badge: 'Appeals',
    description:
      'Late arrival waivers, missed punch dispute requests, and HR/Manager decision audit trails',
    icon: HelpCircle,
  },
  {
    id: 'late-coming',
    label: 'Late Coming Report',
    badge: 'Compliance',
    description:
      'Arrivals past the 15-min grace window (09:45), minutes late, monthly count, and deduction threshold warnings',
    icon: Clock,
  },
  {
    id: 'late-salary-deduction',
    label: 'Late Salary Deduction',
    badge: 'Payroll Precision',
    description:
      'Per-minute salary deduction breakdown: Monthly Salary ÷ 26 ÷ 480 × Late Minutes across 20 audit parameters',
    icon: IndianRupee,
  },
  {
    id: 'overtime',
    label: 'Overtime Report',
    badge: 'Compensation',
    description:
      'Hours worked beyond 8.5h shift, overtime rates, approval status, and calculated payouts',
    icon: BarChart3,
  },
  {
    id: 'leave',
    label: 'Leave Report',
    badge: 'Time Off',
    description:
      'Leave applications, leave types, approved dates, session allocations, and employee balances',
    icon: FileText,
  },
  {
    id: 'final-combined',
    label: 'Final Combined Report',
    badge: 'Executive Master',
    description:
      'Consolidated master metrics across all modules with complete 8-sheet .xlsx workbook export',
    icon: FileSpreadsheet,
  },
];

const EMPLOYEE_DETAIL_TABS: { id: EmployeeDetailTabId; label: string }[] = [
  { id: 'attendance', label: '1. Attendance Details' },
  { id: 'multiple-punches', label: '2. Multiple Punch-In / Out' },
  { id: 'late-coming', label: '3. Late Coming Details' },
  { id: 'late-salary-deduction', label: '4. Late Salary Deduction' },
  { id: 'overtime', label: '5. Overtime Details' },
  { id: 'leave', label: '6. Leave Details' },
  { id: 'considerations', label: '7. Consideration Details' },
  { id: 'punch-exceptions', label: '8. Punch Exceptions' },
];

export function ReportsModule() {
  const {
    currentUser,
    employees,
    allEmployees,
    attendance,
    leaves,
    considerations,
    settings,
    companySettings,
    hasPermission,
    t,
  } = useHRMS();

  const activeSettings = companySettings || settings;

  const [activeReport, setActiveReport] = useState<ReportTypeId>('attendance');

  // Attendance Sub-view: All vs Punch Exceptions Only
  const [attendanceSubView, setAttendanceSubView] = useState<'ALL' | 'EXCEPTIONS'>('ALL');

  // Universal Report Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterEmpId, setFilterEmpId] = useState('ALL');
  const [filterDept, setFilterDept] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Searchable Employee Dropdown State (HR & Admin Only - Requirement 3)
  const [empDropdownOpen, setEmpDropdownOpen] = useState(false);
  const [empDropdownSearch, setEmpDropdownSearch] = useState('');
  const empDropdownRef = useRef<HTMLDivElement>(null);

  // Dedicated Employee-Wise Report Details View State (Requirement 2)
  const [detailEmployeeId, setDetailEmployeeId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<EmployeeDetailTabId>('attendance');

  const isHRAdmin = currentUser.role === 'HR' || currentUser.role === 'ADMIN';

  // Close employee dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (empDropdownRef.current && !empDropdownRef.current.contains(e.target as Node)) {
        setEmpDropdownOpen(false);
      }
    };
    if (empDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [empDropdownOpen]);

  // Role-Scoped Employees
  const sourceEmployees = useMemo(() => {
    return allEmployees && allEmployees.length > 0 ? allEmployees : employees;
  }, [allEmployees, employees]);

  const permittedEmployees = useMemo(() => {
    if (isHRAdmin) return sourceEmployees;
    if (currentUser.role === 'MANAGER') {
      return sourceEmployees.filter(
        (e) => e.managerId === currentUser.employeeId || e.id === currentUser.employeeId
      );
    }
    return sourceEmployees.filter((e) => e.id === currentUser.employeeId);
  }, [sourceEmployees, isHRAdmin, currentUser]);

  const permittedEmpIds = useMemo(
    () => new Set(permittedEmployees.map((e) => e.id)),
    [permittedEmployees]
  );

  const departments = useMemo<string[]>(() => {
    const set = new Set<string>(permittedEmployees.map((e) => e.department));
    return ['ALL', ...Array.from(set)];
  }, [permittedEmployees]);

  // Filtered Employee Options inside Searchable Dropdown
  const dropdownFilteredEmployees = useMemo(() => {
    if (!empDropdownSearch.trim()) return permittedEmployees;
    const q = empDropdownSearch.toLowerCase().trim();
    return permittedEmployees.filter(
      (e) =>
        e.fullName.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q) ||
        (e.employeeCode && e.employeeCode.toLowerCase().includes(q)) ||
        e.department.toLowerCase().includes(q)
    );
  }, [permittedEmployees, empDropdownSearch]);

  const selectedFilterEmployee = useMemo(() => {
    if (filterEmpId === 'ALL') return null;
    return permittedEmployees.find((e) => e.id === filterEmpId) || null;
  }, [filterEmpId, permittedEmployees]);

  // Universal Filter Check Helper
  const matchesCommon = (
    empId: string,
    dept: string,
    dateStr?: string,
    statusStr?: string,
    textBlob?: string
  ) => {
    if (!permittedEmpIds.has(empId)) return false;
    if (isHRAdmin && filterEmpId !== 'ALL' && empId !== filterEmpId) return false;
    if (filterDept !== 'ALL' && dept !== filterDept) return false;
    if (filterStatus !== 'ALL' && statusStr && statusStr !== filterStatus) return false;
    if (dateFrom && dateStr && dateStr < dateFrom) return false;
    if (dateTo && dateStr && dateStr > dateTo) return false;
    if (searchQuery && textBlob && !textBlob.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  };

  // Monthly Late Count Map for Late Coming Warning Flags
  const monthlyLateCounts = useMemo(() => {
    const map = new Map<string, number>();
    attendance.forEach((att) => {
      const lateMins = att.lateMinutes ?? att.lateByMinutes ?? 0;
      const st = String(att.status || '').toUpperCase();
      if (st === 'LATE' || att.isLate || lateMins > 0) {
        const monthKey = `${att.employeeId}-${att.date.slice(0, 7)}`;
        map.set(monthKey, (map.get(monthKey) || 0) + 1);
      }
    });
    return map;
  }, [attendance]);

  // Helper to resolve worked hours & punch details consistently
  const getAttMetrics = (a: any) => {
    const norm = getNormalizedPunchesForRecord(a, a.employeeId);
    const firstIn = norm.firstIn?.time || a.firstInTime || a.punchIn || a.checkIn || '--:--';
    const lastOut = norm.lastOut?.time || a.lastOutTime || a.punchOut || a.checkOut || '--:--';
    const workedHrs =
      norm.workedHours ||
      a.workingHours ||
      a.workHours ||
      a.totalHours ||
      (a.workMinutes ? Number((a.workMinutes / 60).toFixed(1)) : 0);
    const otHrs =
      a.overtimeHours ??
      (a.overtimeMinutes ? Number((a.overtimeMinutes / 60).toFixed(1)) : 0) ??
      Math.max(0, Number((workedHrs - (activeSettings?.fullDayWorkingHours || 8.5)).toFixed(1)));
    const lateMins = a.lateMinutes ?? a.lateByMinutes ?? 0;
    const hasMissingIn = !firstIn || firstIn === '--:--';
    const hasMissingOut = !lastOut || lastOut === '--:--';
    const stUpper = String(a.status || '').toUpperCase();
    const isException =
      norm.hasUnmatchedPunch ||
      stUpper === 'MISSING_PUNCH' ||
      ((hasMissingIn || hasMissingOut) && stUpper !== 'ABSENT' && stUpper !== 'ON_LEAVE' && stUpper !== 'ON LEAVE');
    const exceptionType = hasMissingIn
      ? 'Missing Punch-In'
      : hasMissingOut
      ? 'Missing Punch-Out'
      : norm.hasUnmatchedPunch
      ? norm.unmatchedNote || 'Incomplete Punch Pair'
      : 'None';

    return {
      norm,
      firstIn,
      lastOut,
      workedHrs,
      otHrs,
      lateMins,
      hasMissingIn,
      hasMissingOut,
      isException,
      exceptionType,
    };
  };

  // 1. Attendance Data (with Punch Exception Sub-view)
  const attendanceRows = useMemo(() => {
    return attendance
      .filter((a) => {
        const metrics = getAttMetrics(a);
        if (attendanceSubView === 'EXCEPTIONS' && !metrics.isException) return false;
        return matchesCommon(
          a.employeeId,
          a.department,
          a.date,
          a.status,
          `${a.employeeName} ${a.employeeCode} ${a.department} ${a.status}`
        );
      })
      .map((a) => {
        const emp = sourceEmployees.find((e) => e.id === a.employeeId);
        const metrics = getAttMetrics(a);

        return {
          Date: a.date,
          'Employee ID': a.employeeCode || emp?.id || a.employeeId,
          'Employee Name': a.employeeName,
          Shift: `${activeSettings?.workStartTime || '09:30'} - ${activeSettings?.workEndTime || '18:30'}`,
          'First In': metrics.firstIn,
          'Last Out': metrics.lastOut,
          'Work Hours': `${metrics.workedHrs.toFixed(1)}h`,
          'Overtime (Hrs)': `${metrics.otHrs.toFixed(1)}h`,
          'Attendance Status': a.status,
          'Punch Exception': metrics.exceptionType,
          Source: a.source || 'ESSL Biometric',
        };
      });
  }, [
    attendance,
    attendanceSubView,
    sourceEmployees,
    activeSettings,
    permittedEmpIds,
    filterEmpId,
    filterDept,
    filterStatus,
    dateFrom,
    dateTo,
    searchQuery,
  ]);

  // 2. Consideration Data
  const considerationRows = useMemo(() => {
    return considerations
      .filter((c) =>
        matchesCommon(
          c.employeeId,
          c.department,
          c.date,
          c.status,
          `${c.employeeName} ${c.employeeId} ${c.department} ${c.type} ${c.reason}`
        )
      )
      .map((c) => {
        const emp = sourceEmployees.find((e) => e.id === c.employeeId);
        return {
          'Applied Date': (c.createdAt || c.submittedAt || c.date || '').slice(0, 10),
          'Incident Date': c.date,
          'Employee ID': c.employeeCode || emp?.id || c.employeeId,
          'Employee Name': c.employeeName,
          Category: c.category || c.type,
          Reason: c.reason || c.description || '—',
          Status: c.status,
          'Manager Review Note': c.managerDecisionNote || c.supportingNote || '—',
          'Reviewed By':
            c.decidedBy || c.hrApprovedBy || c.managerApprovedBy || 'Pending Review',
          'Decision Note': c.hrDecisionNote || c.decisionNote || '—',
        };
      });
  }, [
    considerations,
    sourceEmployees,
    permittedEmpIds,
    filterEmpId,
    filterDept,
    filterStatus,
    dateFrom,
    dateTo,
    searchQuery,
  ]);

  // 3. Late Coming Data
  const lateComingRows = useMemo(() => {
    const shiftStart = activeSettings?.workStartTime || '09:30';
    const graceMinutes = activeSettings?.gracePeriodMinutes || 15;
    const thresholdCount = activeSettings?.lateArrivalThresholdCount || 3;

    return attendance
      .filter((a) => {
        const metrics = getAttMetrics(a);
        const stUpper = String(a.status || '').toUpperCase();
        const isLate = stUpper === 'LATE' || a.isLate || metrics.lateMins > 0;
        if (!isLate) return false;
        return matchesCommon(
          a.employeeId,
          a.department,
          a.date,
          a.status,
          `${a.employeeName} ${a.employeeCode} ${a.department}`
        );
      })
      .map((a) => {
        const emp = sourceEmployees.find((e) => e.id === a.employeeId);
        const metrics = getAttMetrics(a);
        const lateCalc = calculateLateDeduction(emp, a, activeSettings);
        const monthKey = `${a.employeeId}-${a.date.slice(0, 7)}`;
        const monthCount = monthlyLateCounts.get(monthKey) || 1;
        const thresholdExceeded = monthCount >= thresholdCount;

        return {
          Date: a.date,
          'Employee ID': a.employeeCode || emp?.id || a.employeeId,
          'Employee Name': a.employeeName,
          'Scheduled Start': shiftStart,
          'Grace Minutes': `${graceMinutes}m (09:45)`,
          'Actual First In': metrics.firstIn,
          'Minutes Late': lateCalc.actualLateMinutes || metrics.lateMins,
          'Chargeable Late Mins': lateCalc.chargeableLateMinutes,
          'Monthly Late Count': monthCount,
          'Threshold Policy': `Max ${thresholdCount}/mo`,
          'Limit Warning': thresholdExceeded ? 'EXCEEDED (LOP Deduction Risk)' : 'Within Limit',
        };
      });
  }, [
    attendance,
    activeSettings,
    monthlyLateCounts,
    sourceEmployees,
    permittedEmpIds,
    filterEmpId,
    filterDept,
    filterStatus,
    dateFrom,
    dateTo,
    searchQuery,
  ]);

  // 4. Dedicated Late Salary Deduction Dataset
  const lateSalaryDeductionRows = useMemo(() => {
    const empMonthTotals = new Map<string, { minutes: number; deduction: number }>();

    attendance.forEach((a) => {
      const emp = sourceEmployees.find((e) => e.id === a.employeeId);
      const stUpper = String(a.status || '').toUpperCase();
      const lateMins = a.lateMinutes ?? a.lateByMinutes ?? 0;
      const isLate = stUpper === 'LATE' || a.isLate || lateMins > 0;
      if (isLate) {
        const lateCalc = calculateLateDeduction(emp, a, activeSettings);
        const monthKey = `${a.employeeId}-${a.date.slice(0, 7)}`;
        const prev = empMonthTotals.get(monthKey) || { minutes: 0, deduction: 0 };
        empMonthTotals.set(monthKey, {
          minutes: prev.minutes + lateCalc.chargeableLateMinutes,
          deduction: Number((prev.deduction + lateCalc.deductionAmount).toFixed(2)),
        });
      }
    });

    return attendance
      .filter((a) => {
        const stUpper = String(a.status || '').toUpperCase();
        const lateMins = a.lateMinutes ?? a.lateByMinutes ?? 0;
        const isLate = stUpper === 'LATE' || a.isLate || lateMins > 0;
        if (!isLate) return false;
        return matchesCommon(
          a.employeeId,
          a.department,
          a.date,
          a.status,
          `${a.employeeName} ${a.employeeCode} ${a.department}`
        );
      })
      .map((a) => {
        const emp = sourceEmployees.find((e) => e.id === a.employeeId);
        const lateCalc = calculateLateDeduction(emp, a, activeSettings);
        const monthKey = `${a.employeeId}-${a.date.slice(0, 7)}`;
        const monthlyTotal = empMonthTotals.get(monthKey) || {
          minutes: lateCalc.chargeableLateMinutes,
          deduction: lateCalc.deductionAmount,
        };

        return {
          'Employee Name': a.employeeName,
          'Employee ID': a.employeeCode || emp?.id || a.employeeId,
          'Monthly Salary Used': `₹${lateCalc.monthlySalary.toLocaleString('en-IN')}`,
          'Salary Basis': lateCalc.salaryBasis,
          'Calculation Days': lateCalc.calculationDays,
          'Daily Salary': `₹${lateCalc.dailySalary.toFixed(2)}`,
          'Daily Working Minutes': lateCalc.dailyWorkingMinutes,
          'Per-Minute Deduction Rate': `₹${lateCalc.perMinuteRate.toFixed(4)}`,
          'Attendance Date': a.date,
          'Scheduled Shift Start': lateCalc.scheduledShiftStart,
          'Actual First In': lateCalc.actualFirstIn,
          'Actual Late Minutes': lateCalc.actualLateMinutes,
          'Grace Minutes': lateCalc.graceMinutes,
          'Chargeable Late Minutes': lateCalc.chargeableLateMinutes,
          'Deduction Amount': `₹${lateCalc.deductionAmount.toFixed(2)}`,
          'Monthly Total Late Minutes': monthlyTotal.minutes,
          'Monthly Total Late Deduction': `₹${monthlyTotal.deduction.toFixed(2)}`,
          'Payroll Adjustment Status': lateCalc.status,
        };
      });
  }, [
    attendance,
    sourceEmployees,
    activeSettings,
    permittedEmpIds,
    filterEmpId,
    filterDept,
    filterStatus,
    dateFrom,
    dateTo,
    searchQuery,
  ]);

  // 5. Overtime Data
  const overtimeRows = useMemo(() => {
    const standardDailyHours = activeSettings?.fullDayWorkingHours || 8.5;
    const hourlyRate = 250;

    return attendance
      .filter((a) => {
        const metrics = getAttMetrics(a);
        const hasOvertime = metrics.otHrs > 0 || metrics.workedHrs > standardDailyHours;
        if (!hasOvertime) return false;
        return matchesCommon(
          a.employeeId,
          a.department,
          a.date,
          a.status,
          `${a.employeeName} ${a.employeeCode} ${a.department}`
        );
      })
      .map((a) => {
        const emp = sourceEmployees.find((e) => e.id === a.employeeId);
        const metrics = getAttMetrics(a);
        const otHours = Number(
          (metrics.otHrs > 0
            ? metrics.otHrs
            : Math.max(0, metrics.workedHrs - standardDailyHours)
          ).toFixed(1)
        );
        const estimatedPayout = Math.round(otHours * hourlyRate);

        return {
          Date: a.date,
          'Employee ID': a.employeeCode || emp?.id || a.employeeId,
          'Employee Name': a.employeeName,
          'Scheduled Hours': `${standardDailyHours} hrs`,
          'Actual Worked (Hrs)': `${metrics.workedHrs.toFixed(1)} hrs`,
          'Overtime Hours': otHours,
          'Overtime Rate (INR/hr)': `₹${hourlyRate}`,
          'Estimated Payout (INR)': `₹${estimatedPayout.toLocaleString('en-IN')}`,
          'Approval Status': otHours > 0 ? 'Approved (Auto-Logged)' : 'Pending',
        };
      });
  }, [
    attendance,
    activeSettings,
    sourceEmployees,
    permittedEmpIds,
    filterEmpId,
    filterDept,
    filterStatus,
    dateFrom,
    dateTo,
    searchQuery,
  ]);

  // 6. Leave Data
  const leaveRows = useMemo(() => {
    return leaves
      .filter((l) =>
        matchesCommon(
          l.employeeId,
          l.department,
          l.startDate,
          l.status,
          `${l.employeeName} ${l.employeeId} ${l.department} ${l.leaveType} ${l.reason}`
        )
      )
      .map((l) => {
        const emp = sourceEmployees.find((e) => e.id === l.employeeId);
        const bal = emp?.leaveBalance;
        const remainingTotal = bal
          ? Math.max(
              0,
              bal.casualTotal -
                bal.casualUsed +
                (bal.sickTotal - bal.sickUsed) +
                (bal.earnedTotal - bal.earnedUsed)
            )
          : 30;
        const leaveDays = l.days ?? (l as any).daysCount ?? 1;

        return {
          'Applied Date': (l.createdAt || l.appliedOn || l.startDate || '').slice(0, 10),
          'Employee ID': emp?.id || l.employeeId,
          'Employee Name': l.employeeName,
          'Leave Type': l.leaveType,
          Session: l.isHalfDay ? l.halfDaySession || 'Half Day' : 'FULL_DAY',
          'Start Date': l.startDate,
          'End Date': l.endDate,
          'Total Days': leaveDays,
          Status: l.status,
          Reason: l.reason,
          'Approved / Actioned By':
            l.hrApprovedBy ||
            l.decidedBy ||
            l.managerApprovedBy ||
            (String(l.status).includes('PENDING') ? 'Pending Action' : 'HR System'),
          'Remaining Balance (Days)': remainingTotal,
        };
      });
  }, [
    leaves,
    sourceEmployees,
    permittedEmpIds,
    filterEmpId,
    filterDept,
    filterStatus,
    dateFrom,
    dateTo,
    searchQuery,
  ]);

  // 7. Punch Exceptions Dataset
  const punchExceptionRows = useMemo(() => {
    return attendance
      .filter((a) => {
        const metrics = getAttMetrics(a);
        if (!metrics.isException) return false;
        return matchesCommon(
          a.employeeId,
          a.department,
          a.date,
          a.status,
          `${a.employeeName} ${a.employeeCode} ${a.department}`
        );
      })
      .map((a) => {
        const emp = sourceEmployees.find((e) => e.id === a.employeeId);
        const metrics = getAttMetrics(a);
        return {
          Date: a.date,
          'Employee ID': a.employeeCode || emp?.id || a.employeeId,
          'Employee Name': a.employeeName,
          'Exception Category': metrics.exceptionType,
          'First In': metrics.firstIn,
          'Last Out': metrics.lastOut,
          'Recorded Duration': `${metrics.workedHrs.toFixed(1)} hrs`,
          Status: a.status,
          'Biometric Source': a.source || 'ESSL Biometric',
          'Review Status':
            a.considerationStatus === 'Approved' || a.isManualCorrection
              ? 'Resolved / Regularized'
              : 'Pending Review',
        };
      });
  }, [
    attendance,
    sourceEmployees,
    permittedEmpIds,
    filterEmpId,
    filterDept,
    filterStatus,
    dateFrom,
    dateTo,
    searchQuery,
  ]);

  // Consolidated Rollup for Final Combined Report
  const consolidatedRollupRows = useMemo(() => {
    return permittedEmployees
      .filter((emp) => {
        if (isHRAdmin && filterEmpId !== 'ALL' && emp.id !== filterEmpId) return false;
        if (filterDept !== 'ALL' && emp.department !== filterDept) return false;
        if (
          searchQuery &&
          !`${emp.fullName} ${emp.id} ${emp.department} ${emp.designation}`
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
        ) {
          return false;
        }
        return true;
      })
      .map((emp) => {
        const empAttendance = attendance.filter((a) => {
          if (a.employeeId !== emp.id) return false;
          if (dateFrom && a.date < dateFrom) return false;
          if (dateTo && a.date > dateTo) return false;
          return true;
        });

        const presentCount = empAttendance.filter((a) => {
          const st = String(a.status || '').toUpperCase();
          return st === 'PRESENT' || st === 'LATE' || st === 'HALF_DAY' || st === 'HALF DAY';
        }).length;

        const lateCount = empAttendance.filter((a) => {
          const st = String(a.status || '').toUpperCase();
          return st === 'LATE' || a.isLate || (a.lateMinutes ?? a.lateByMinutes ?? 0) > 0;
        }).length;

        const missedPunches = empAttendance.filter((a) => getAttMetrics(a).isException).length;

        const empConsiderations = considerations.filter(
          (c) =>
            c.employeeId === emp.id &&
            (c.status === 'APPROVED' || c.status === 'Approved')
        ).length;

        const otHours = empAttendance.reduce(
          (acc, a) => acc + getAttMetrics(a).otHrs,
          0
        );

        const leaveDays = leaves
          .filter(
            (l) =>
              l.employeeId === emp.id &&
              (l.status === 'APPROVED' || l.status === 'Approved')
          )
          .reduce((acc, l) => acc + (l.days ?? 0), 0);

        const totalLateDeduction = empAttendance.reduce((acc, a) => {
          const st = String(a.status || '').toUpperCase();
          const isLate = st === 'LATE' || a.isLate || (a.lateMinutes ?? a.lateByMinutes ?? 0) > 0;
          if (!isLate) return acc;
          return acc + calculateLateDeduction(emp, a, activeSettings).deductionAmount;
        }, 0);

        const totalRecordedDays = empAttendance.length;
        const complianceRate =
          totalRecordedDays > 0
            ? Math.min(100, Math.round(((presentCount + empConsiderations) / totalRecordedDays) * 100))
            : 100;

        return {
          'Employee ID': emp.id,
          'Employee Name': emp.fullName,
          'Present Days': presentCount,
          'Late Arrivals': lateCount,
          'Missed Punches': missedPunches,
          'Approved Considerations': empConsiderations,
          'Overtime (Hrs)': Number(otHours.toFixed(1)),
          'Approved Leaves (Days)': leaveDays,
          'Late Deduction (INR)': `₹${totalLateDeduction.toFixed(2)}`,
          'Compliance Rate (%)': `${complianceRate}%`,
          Status: emp.isExited ? 'Exited' : emp.isDeactivated ? 'Archived' : emp.status,
        };
      });
  }, [
    permittedEmployees,
    isHRAdmin,
    filterEmpId,
    filterDept,
    searchQuery,
    attendance,
    dateFrom,
    dateTo,
    considerations,
    leaves,
    activeSettings,
  ]);

  // Executive Summary KPI calculations
  const executiveSummary = useMemo(() => {
    const scopedStaffCount = consolidatedRollupRows.length;
    const totalAttRecords = attendanceRows.length;
    const totalLateMarks = lateComingRows.length;
    const totalApprovedConsiderations = considerationRows.filter(
      (c) => String(c.Status).toUpperCase() === 'APPROVED'
    ).length;
    const totalOtHours = overtimeRows.reduce(
      (acc, row) => acc + (Number(row['Overtime Hours']) || 0),
      0
    );
    const totalOtPayout = overtimeRows.reduce((acc, row) => {
      const val = parseFloat(String(row['Estimated Payout (INR)']).replace(/[₹,]/g, '')) || 0;
      return acc + val;
    }, 0);
    const totalLeavesDays = leaveRows
      .filter((l) => String(l.Status).toUpperCase() === 'APPROVED')
      .reduce((acc, l) => acc + (Number(l['Total Days']) || 0), 0);
    const totalExceptions = punchExceptionRows.length;

    const totalLateDeductions = lateSalaryDeductionRows.reduce((acc, row) => {
      const val = parseFloat(String(row['Deduction Amount']).replace(/[₹,]/g, '')) || 0;
      return acc + val;
    }, 0);
    const totalChargeableLateMinutes = lateSalaryDeductionRows.reduce((acc, row) => {
      return acc + (Number(row['Chargeable Late Minutes']) || 0);
    }, 0);

    return {
      totalStaff: scopedStaffCount,
      totalAttRecords,
      totalLateMarks,
      totalApprovedConsiderations,
      totalOtHours: Number(totalOtHours.toFixed(1)),
      totalOtPayout,
      totalLeavesDays,
      totalExceptions,
      totalLateDeductions: Number(totalLateDeductions.toFixed(2)),
      totalChargeableLateMinutes,
    };
  }, [
    consolidatedRollupRows,
    attendanceRows,
    lateComingRows,
    considerationRows,
    overtimeRows,
    leaveRows,
    punchExceptionRows,
    lateSalaryDeductionRows,
  ]);

  // Export Master Workbook (.xlsx) with 8 sheets
  const handleExportMasterWorkbook = () => {
    const scopeName = selectedFilterEmployee
      ? `${selectedFilterEmployee.fullName.replace(/\s+/g, '_')}_${selectedFilterEmployee.id}`
      : 'Argos_Organization';
    const summarySheetData = [
      { Metric: 'Report Generation Timestamp', Value: new Date().toLocaleString() },
      { Metric: 'Organization Name', Value: activeSettings?.companyName || 'Argos Watch HRMS' },
      {
        Metric: 'Report Scope',
        Value: selectedFilterEmployee
          ? `${selectedFilterEmployee.fullName} (${selectedFilterEmployee.id})`
          : 'Organization-Wide',
      },
      {
        Metric: 'Selected Date Range',
        Value: `${dateFrom || 'All Dates'} to ${dateTo || 'Present'}`,
      },
      { Metric: 'Total Employees In Scope', Value: executiveSummary.totalStaff },
      { Metric: 'Total Attendance Logs Analyzed', Value: executiveSummary.totalAttRecords },
      { Metric: 'Total Late Arrival Incidents', Value: executiveSummary.totalLateMarks },
      {
        Metric: 'Total Chargeable Late Minutes',
        Value: `${executiveSummary.totalChargeableLateMinutes} mins`,
      },
      {
        Metric: 'Total Late Salary Deduction (INR)',
        Value: `₹${executiveSummary.totalLateDeductions.toLocaleString('en-IN')}`,
      },
      { Metric: 'Total Considerations Approved', Value: executiveSummary.totalApprovedConsiderations },
      { Metric: 'Total Overtime Hours', Value: `${executiveSummary.totalOtHours} hrs` },
      {
        Metric: 'Total Estimated Overtime Payout (INR)',
        Value: `₹${executiveSummary.totalOtPayout.toLocaleString('en-IN')}`,
      },
      { Metric: 'Total Approved Leave Days', Value: `${executiveSummary.totalLeavesDays} days` },
      { Metric: 'Total Punch Exceptions / Anomalies', Value: executiveSummary.totalExceptions },
    ];

    const sheets = [
      { sheetName: 'Summary', data: summarySheetData },
      { sheetName: 'Attendance', data: attendanceRows },
      { sheetName: 'Considerations', data: considerationRows },
      { sheetName: 'Late Coming', data: lateComingRows },
      { sheetName: 'Overtime', data: overtimeRows },
      { sheetName: 'Leave', data: leaveRows },
      { sheetName: 'Punch Exceptions', data: punchExceptionRows },
      { sheetName: 'Late Salary Deduction', data: lateSalaryDeductionRows },
    ];

    const filename = `${scopeName}_Master_Combined_Report_${new Date().toISOString().slice(0, 10)}`;
    exportMultiSheetExcelXLSX(sheets, filename);
  };

  // Current active dataset & columns
  const currentDataset = useMemo(() => {
    switch (activeReport) {
      case 'attendance':
        return attendanceRows;
      case 'consideration':
        return considerationRows;
      case 'late-coming':
        return lateComingRows;
      case 'late-salary-deduction':
        return lateSalaryDeductionRows;
      case 'overtime':
        return overtimeRows;
      case 'leave':
        return leaveRows;
      case 'final-combined':
        return consolidatedRollupRows;
      default:
        return [];
    }
  }, [
    activeReport,
    attendanceRows,
    considerationRows,
    lateComingRows,
    lateSalaryDeductionRows,
    overtimeRows,
    leaveRows,
    consolidatedRollupRows,
  ]);

  const columns = useMemo(() => {
    if (!currentDataset || currentDataset.length === 0) return [];
    return Object.keys(currentDataset[0]);
  }, [currentDataset]);

  // Open Employee Report Details when HR/Admin clicks an employee row or name
  const openEmployeeReportDetails = (empIdOrCode?: string, empName?: string) => {
    if (!isHRAdmin) return;
    const found =
      permittedEmployees.find(
        (e) =>
          (empIdOrCode && (e.id === empIdOrCode || e.employeeCode === empIdOrCode)) ||
          (empName && e.fullName.toLowerCase() === empName.toLowerCase())
      ) || null;
    if (!found) return;

    setDetailEmployeeId(found.id);
    // Sync initial detail tab with the active report category
    if (activeReport === 'late-coming') setDetailTab('late-coming');
    else if (activeReport === 'late-salary-deduction') setDetailTab('late-salary-deduction');
    else if (activeReport === 'overtime') setDetailTab('overtime');
    else if (activeReport === 'leave') setDetailTab('leave');
    else if (activeReport === 'consideration') setDetailTab('considerations');
    else if (activeReport === 'attendance' && attendanceSubView === 'EXCEPTIONS')
      setDetailTab('punch-exceptions');
    else setDetailTab('attendance');
  };

  // ===========================================================================
  // REQUIREMENT 2: DEDICATED EMPLOYEE-WISE REPORT DETAILS VIEW (HR & ADMIN)
  // ===========================================================================
  const detailEmployee = useMemo(() => {
    if (!detailEmployeeId) return null;
    return permittedEmployees.find((e) => e.id === detailEmployeeId) || null;
  }, [detailEmployeeId, permittedEmployees]);

  if (isHRAdmin && detailEmployee) {
    const empId = detailEmployee.id;
    const empFilePrefix = `${detailEmployee.fullName.replace(/\s+/g, '_')}_${empId}`;
    const periodLabel =
      dateFrom || dateTo
        ? `${dateFrom || 'Inception'} to ${dateTo || 'Present'}`
        : 'All Recorded Dates (Full Period)';

    // Filter employee's records respecting selected dateFrom and dateTo
    const empAttendanceRecords = attendance
      .filter((a) => {
        if (a.employeeId !== empId) return false;
        if (dateFrom && a.date < dateFrom) return false;
        if (dateTo && a.date > dateTo) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));

    const empLeaveRecords = leaves
      .filter((l) => {
        if (l.employeeId !== empId) return false;
        if (dateFrom && l.endDate < dateFrom) return false;
        if (dateTo && l.startDate > dateTo) return false;
        return true;
      })
      .sort((a, b) => b.startDate.localeCompare(a.startDate));

    const empConsiderationRecords = considerations
      .filter((c) => {
        if (c.employeeId !== empId) return false;
        if (dateFrom && c.date < dateFrom) return false;
        if (dateTo && c.date > dateTo) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));

    // 1. Individual Attendance Details Table Data
    const indAttendanceData = empAttendanceRecords.map((a) => {
      const m = getAttMetrics(a);
      return {
        Date: a.date,
        'Employee ID': empId,
        'Employee Name': detailEmployee.fullName,
        'Attendance Status': a.status,
        'Scheduled Shift': `${activeSettings?.workStartTime || '09:30'} - ${activeSettings?.workEndTime || '18:30'}`,
        'First In': m.firstIn,
        'Last Out': m.lastOut,
        'Total Worked Hours': `${m.workedHrs.toFixed(2)} hrs`,
        'Punch Pairs': m.norm.validPairsCount,
        Notes: a.notes || '—',
      };
    });

    // 2. Individual Multiple Punch-In / Punch-Out Chronological Data
    const indMultiplePunchesData: Record<string, any>[] = [];
    empAttendanceRecords.forEach((a) => {
      const norm = getNormalizedPunchesForRecord(a, empId);
      norm.punches.forEach((p, idx) => {
        indMultiplePunchesData.push({
          Date: a.date,
          'Employee ID': empId,
          'Employee Name': detailEmployee.fullName,
          'Punch Sequence': `#${idx + 1}`,
          'Punch Type': p.type,
          'Punch Time': p.time,
          Highlight: p.isFirstIn
            ? 'FIRST IN (Official Arrival)'
            : p.isLastOut
            ? 'LAST OUT (Final Departure)'
            : `Intermediate ${p.type}`,
          'Total IN Count (Day)': norm.totalPunchIns,
          'Total OUT Count (Day)': norm.totalPunchOuts,
          'Punch Source': p.source || a.source || 'ESSL Biometric',
          'Correction Details': p.isManualCorrection
            ? p.manualCorrectionReason || a.manualCorrectionReason || 'Manual Correction'
            : 'Verified Automatic Punch',
        });
      });
    });

    // 3. Individual Late Coming Details Data
    const indLateComingData = empAttendanceRecords
      .filter((a) => {
        const st = String(a.status || '').toUpperCase();
        const lateMins = a.lateMinutes ?? a.lateByMinutes ?? 0;
        return st === 'LATE' || a.isLate || lateMins > 0;
      })
      .map((a) => {
        const lateCalc = calculateLateDeduction(detailEmployee, a, activeSettings);
        const monthKey = `${empId}-${a.date.slice(0, 7)}`;
        const monthLateCount = monthlyLateCounts.get(monthKey) || 1;
        return {
          Date: a.date,
          'Employee ID': empId,
          'Employee Name': detailEmployee.fullName,
          'Scheduled Shift Start': lateCalc.scheduledShiftStart,
          'Actual First In': lateCalc.actualFirstIn,
          'Late Minutes': lateCalc.actualLateMinutes,
          'Grace Minutes': lateCalc.graceMinutes,
          'Chargeable Late Minutes': lateCalc.chargeableLateMinutes,
          'Monthly Late-Mark Count': monthLateCount,
          Status: a.status,
        };
      });

    // 4. Individual Late Salary Deduction Details Data (Using Approved Formula)
    const monthlyDeductionTotal = empAttendanceRecords.reduce((acc, a) => {
      const st = String(a.status || '').toUpperCase();
      const isLate = st === 'LATE' || a.isLate || (a.lateMinutes ?? a.lateByMinutes ?? 0) > 0;
      if (!isLate) return acc;
      return acc + calculateLateDeduction(detailEmployee, a, activeSettings).deductionAmount;
    }, 0);

    const indLateSalaryDeductionData = empAttendanceRecords
      .filter((a) => {
        const st = String(a.status || '').toUpperCase();
        const lateMins = a.lateMinutes ?? a.lateByMinutes ?? 0;
        return st === 'LATE' || a.isLate || lateMins > 0;
      })
      .map((a) => {
        const lateCalc = calculateLateDeduction(detailEmployee, a, activeSettings);
        return {
          Date: a.date,
          'Employee ID': empId,
          'Employee Name': detailEmployee.fullName,
          'Applicable Monthly Salary': `₹${lateCalc.monthlySalary.toLocaleString('en-IN')}`,
          'Salary Basis': lateCalc.salaryBasis,
          'Calculation Days': lateCalc.calculationDays,
          'Daily Salary': `₹${lateCalc.dailySalary.toFixed(2)}`,
          'Per-Minute Deduction Rate': `₹${lateCalc.perMinuteRate.toFixed(4)}/min`,
          'Scheduled Shift Start': lateCalc.scheduledShiftStart,
          'Actual First In': lateCalc.actualFirstIn,
          'Chargeable Late Minutes': lateCalc.chargeableLateMinutes,
          'Deduction Amount': `₹${lateCalc.deductionAmount.toFixed(2)}`,
          'Monthly Total Deduction': `₹${monthlyDeductionTotal.toFixed(2)}`,
          'Payroll Adjustment Status': lateCalc.status,
        };
      });

    // 5. Individual Overtime Details Data
    const standardShiftHrs = activeSettings?.fullDayWorkingHours || 8.5;
    const indOvertimeData = empAttendanceRecords
      .filter((a) => {
        const m = getAttMetrics(a);
        return m.otHrs > 0 || m.workedHrs > standardShiftHrs;
      })
      .map((a) => {
        const m = getAttMetrics(a);
        const otDuration =
          m.otHrs > 0 ? m.otHrs : Math.max(0, Number((m.workedHrs - standardShiftHrs).toFixed(1)));
        return {
          Date: a.date,
          'Employee ID': empId,
          'Employee Name': detailEmployee.fullName,
          'Scheduled Shift Duration': `${standardShiftHrs} hrs`,
          'Worked Duration': `${m.workedHrs.toFixed(2)} hrs`,
          'Overtime Duration': `${otDuration.toFixed(2)} hrs`,
          'Approval Status': otDuration > 0 ? 'Approved (Verified Shift Log)' : 'Pending',
        };
      });

    // 6. Individual Leave Details Data
    const indLeaveData = empLeaveRecords.map((l) => ({
      'Leave ID': l.id,
      'Employee ID': empId,
      'Employee Name': detailEmployee.fullName,
      'Leave Type': l.leaveType,
      'Start Date': l.startDate,
      'End Date': l.endDate,
      Days: l.days ?? 1,
      Session: l.isHalfDay ? l.halfDaySession || 'Half Day' : 'Full Day',
      Reason: l.reason,
      'Approval Status': l.status,
      'Decision / Reviewer Note': l.hrDecisionNote || l.managerDecisionNote || l.decisionNote || '—',
    }));

    // 7. Individual Consideration Details Data
    const indConsiderationData = empConsiderationRecords.map((c) => ({
      'Consideration ID': c.id,
      'Employee ID': empId,
      'Employee Name': detailEmployee.fullName,
      'Request Type': c.customType || c.type,
      Description: c.reason || c.description || '—',
      'Incident Date': c.date,
      'Submission Date': (c.createdAt || c.submittedAt || c.date || '').slice(0, 10),
      'Approval Status': c.status,
      'Resolution Details':
        c.hrDecisionNote ||
        c.managerDecisionNote ||
        c.decisionNote ||
        'Awaiting review resolution',
      'Deduction Saved': c.deductionAmountSaved ? `₹${c.deductionAmountSaved}` : '₹0',
    }));

    // 8. Individual Punch Exceptions Data
    const indPunchExceptionsData = empAttendanceRecords
      .filter((a) => getAttMetrics(a).isException)
      .map((a) => {
        const m = getAttMetrics(a);
        return {
          Date: a.date,
          'Employee ID': empId,
          'Employee Name': detailEmployee.fullName,
          'Missing Punch-In': m.hasMissingIn ? 'Yes (Missing Check-In)' : 'No',
          'Missing Punch-Out': m.hasMissingOut ? 'Yes (Missing Check-Out)' : 'No',
          'Incomplete Punch Pairs': m.norm.hasUnmatchedPunch
            ? m.norm.unmatchedNote || 'Unmatched Punch Pair'
            : 'Valid Pairs',
          'First In': m.firstIn,
          'Last Out': m.lastOut,
          'Recorded Worked Duration': `${m.workedHrs.toFixed(1)} hrs`,
          'Review Status':
            a.considerationStatus === 'Approved' || a.isManualCorrection
              ? 'Resolved / Regularized'
              : 'Pending Exception Review',
        };
      });

    // Download Complete Individual Combined Report (.xlsx)
    const handleDownloadIndividualCombined = () => {
      const summaryRows = [
        { Field: 'Employee Name', Value: detailEmployee.fullName },
        { Field: 'Employee ID', Value: empId },
        {
          Field: 'Reporting Manager',
          Value: detailEmployee.managerName || (detailEmployee as any).reportingManager || '—',
        },
        { Field: 'Selected Report Period', Value: periodLabel },
        { Field: 'Total Attendance Days Logged', Value: indAttendanceData.length },
        { Field: 'Total Chronological Punch Events', Value: indMultiplePunchesData.length },
        { Field: 'Total Late Coming Incidents', Value: indLateComingData.length },
        {
          Field: 'Total Monthly Late Salary Deduction',
          Value: `₹${monthlyDeductionTotal.toFixed(2)}`,
        },
        { Field: 'Total Overtime Records', Value: indOvertimeData.length },
        { Field: 'Total Leave Applications', Value: indLeaveData.length },
        { Field: 'Total Consideration Requests', Value: indConsiderationData.length },
        { Field: 'Total Punch Exceptions', Value: indPunchExceptionsData.length },
      ];

      exportMultiSheetExcelXLSX(
        [
          { sheetName: 'Employee Summary', data: summaryRows },
          { sheetName: 'Attendance Details', data: indAttendanceData },
          { sheetName: 'Multiple Punches', data: indMultiplePunchesData },
          { sheetName: 'Late Coming', data: indLateComingData },
          { sheetName: 'Late Salary Deduction', data: indLateSalaryDeductionData },
          { sheetName: 'Overtime Details', data: indOvertimeData },
          { sheetName: 'Leave Details', data: indLeaveData },
          { sheetName: 'Considerations', data: indConsiderationData },
          { sheetName: 'Punch Exceptions', data: indPunchExceptionsData },
        ],
        `${empFilePrefix}_Complete_Combined_Report_${new Date().toISOString().slice(0, 10)}`
      );
    };

    const activeDetailDataset = (() => {
      switch (detailTab) {
        case 'attendance':
          return indAttendanceData;
        case 'multiple-punches':
          return indMultiplePunchesData;
        case 'late-coming':
          return indLateComingData;
        case 'late-salary-deduction':
          return indLateSalaryDeductionData;
        case 'overtime':
          return indOvertimeData;
        case 'leave':
          return indLeaveData;
        case 'considerations':
          return indConsiderationData;
        case 'punch-exceptions':
          return indPunchExceptionsData;
      }
    })();

    const activeDetailColumns =
      activeDetailDataset.length > 0 ? Object.keys(activeDetailDataset[0]) : [];

    return (
      <div className="space-y-6 animate-in fade-in duration-150">
        {/* Top Navigation & Individual Export Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#CBCBCB] dark:border-[#1E293B]">
          <button
            type="button"
            onClick={() => setDetailEmployeeId(null)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-[#111827] border border-[#CBCBCB] dark:border-[#1E293B] hover:border-[#2D5A27] text-xs font-semibold text-[#191C1E] dark:text-[#EFF1F3] transition-colors cursor-pointer self-start"
          >
            <ArrowLeft className="w-4 h-4 text-[#2D5A27]" />
            <span>Back to Reports</span>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <ExportDropdown
              data={activeDetailDataset}
              filename={`${empFilePrefix}_${detailTab}_Report_${new Date().toISOString().slice(0, 10)}`}
              title={`${detailEmployee.fullName} (${empId}) — ${detailTab.toUpperCase()} Report`}
              buttonLabel={`Export Current Section`}
            />
            <button
              type="button"
              onClick={handleDownloadIndividualCombined}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2D5A27] hover:bg-[#23461E] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Download Complete Individual Combined Report (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Employee Summary Header Card */}
        <div className="bg-white dark:bg-[#111827] border border-[#CBCBCB] dark:border-[#1E293B] rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#CBCBCB] dark:border-[#1E293B]">
            <div className="flex items-center gap-4">
              <AvatarInitials name={detailEmployee.fullName} size="lg" />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold text-[#191C1E] dark:text-[#EFF1F3]">
                    {detailEmployee.fullName}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-md bg-[#2D5A27] text-white font-mono text-xs font-semibold">
                    {empId}
                  </span>
                  <StatusBadge status={detailEmployee.status} />
                </div>
                <p className="text-xs sm:text-sm text-[#45464D] dark:text-[#94A3B8] mt-1">
                  {detailEmployee.designation} · {detailEmployee.department}
                </p>
              </div>
            </div>

            {/* Selected Period & Reporting Manager Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#F2F4F6] dark:bg-[#1E293B] p-3.5 rounded-xl border border-[#CBCBCB] dark:border-[#334155] text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#45464D] dark:text-[#94A3B8] block">
                  Department
                </span>
                <span className="font-semibold text-[#191C1E] dark:text-[#EFF1F3] mt-0.5 block">
                  {detailEmployee.department}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#45464D] dark:text-[#94A3B8] block">
                  Reporting Manager
                </span>
                <span className="font-semibold text-[#191C1E] dark:text-[#EFF1F3] mt-0.5 block">
                  {detailEmployee.managerName ||
                    (detailEmployee as any).reportingManager ||
                    'Argos Executive Board'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#45464D] dark:text-[#94A3B8] block">
                  Selected Date Range
                </span>
                <span className="font-mono font-semibold text-[#2D5A27] dark:text-[#4ADE80] mt-0.5 block">
                  {periodLabel}
                </span>
              </div>
            </div>
          </div>

          {/* 8-Metric Quick Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 text-xs">
            <div className="p-3 rounded-xl bg-[#F2F4F6] dark:bg-[#1E293B] border border-[#CBCBCB] dark:border-[#334155]">
              <span className="text-[10px] text-[#45464D] dark:text-[#94A3B8] block">
                Attendance Logs
              </span>
              <span className="text-base font-bold font-mono text-[#191C1E] dark:text-[#EFF1F3] mt-0.5 block">
                {indAttendanceData.length}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#F2F4F6] dark:bg-[#1E293B] border border-[#CBCBCB] dark:border-[#334155]">
              <span className="text-[10px] text-[#45464D] dark:text-[#94A3B8] block">
                Total Punches
              </span>
              <span className="text-base font-bold font-mono text-[#191C1E] dark:text-[#EFF1F3] mt-0.5 block">
                {indMultiplePunchesData.length}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#F2F4F6] dark:bg-[#1E293B] border border-[#CBCBCB] dark:border-[#334155]">
              <span className="text-[10px] text-[#45464D] dark:text-[#94A3B8] block">
                Late Arrivals
              </span>
              <span className="text-base font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5 block">
                {indLateComingData.length}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#F2F4F6] dark:bg-[#1E293B] border border-[#CBCBCB] dark:border-[#334155]">
              <span className="text-[10px] text-[#45464D] dark:text-[#94A3B8] block">
                Late Deduction
              </span>
              <span className="text-base font-bold font-mono text-rose-600 dark:text-rose-400 mt-0.5 block">
                ₹{monthlyDeductionTotal.toFixed(2)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#F2F4F6] dark:bg-[#1E293B] border border-[#CBCBCB] dark:border-[#334155]">
              <span className="text-[10px] text-[#45464D] dark:text-[#94A3B8] block">
                Overtime Logs
              </span>
              <span className="text-base font-bold font-mono text-[#191C1E] dark:text-[#EFF1F3] mt-0.5 block">
                {indOvertimeData.length}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#F2F4F6] dark:bg-[#1E293B] border border-[#CBCBCB] dark:border-[#334155]">
              <span className="text-[10px] text-[#45464D] dark:text-[#94A3B8] block">
                Leave Requests
              </span>
              <span className="text-base font-bold font-mono text-[#191C1E] dark:text-[#EFF1F3] mt-0.5 block">
                {indLeaveData.length}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#F2F4F6] dark:bg-[#1E293B] border border-[#CBCBCB] dark:border-[#334155]">
              <span className="text-[10px] text-[#45464D] dark:text-[#94A3B8] block">
                Considerations
              </span>
              <span className="text-base font-bold font-mono text-[#191C1E] dark:text-[#EFF1F3] mt-0.5 block">
                {indConsiderationData.length}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#F2F4F6] dark:bg-[#1E293B] border border-[#CBCBCB] dark:border-[#334155]">
              <span className="text-[10px] text-[#45464D] dark:text-[#94A3B8] block">
                Punch Exceptions
              </span>
              <span className="text-base font-bold font-mono text-orange-600 dark:text-orange-400 mt-0.5 block">
                {indPunchExceptionsData.length}
              </span>
            </div>
          </div>

          {/* Individual Excel Report Downloads Bar (8 Individual Downloads) */}
          <div className="pt-3 border-t border-[#CBCBCB] dark:border-[#1E293B]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#45464D] dark:text-[#94A3B8] block mb-2.5">
              Individual Employee Excel Downloads (.xlsx with Frozen Headers & Filters)
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  exportToExcelXLSX(
                    indAttendanceData,
                    `${empFilePrefix}_Attendance_Report`,
                    'Attendance Details'
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F2F4F6] dark:bg-[#1E293B] hover:border-[#2D5A27] border border-[#CBCBCB] dark:border-[#334155] text-xs font-medium text-[#191C1E] dark:text-[#EFF1F3] cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[#2D5A27] dark:text-[#4ADE80]" />
                <span>Attendance (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  exportToExcelXLSX(
                    indLateComingData,
                    `${empFilePrefix}_Late_Coming_Report`,
                    'Late Coming'
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F2F4F6] dark:bg-[#1E293B] hover:border-[#2D5A27] border border-[#CBCBCB] dark:border-[#334155] text-xs font-medium text-[#191C1E] dark:text-[#EFF1F3] cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[#2D5A27] dark:text-[#4ADE80]" />
                <span>Late Coming (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  exportToExcelXLSX(
                    indLateSalaryDeductionData,
                    `${empFilePrefix}_Late_Salary_Deduction_Report`,
                    'Late Salary Deduction'
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F2F4F6] dark:bg-[#1E293B] hover:border-[#2D5A27] border border-[#CBCBCB] dark:border-[#334155] text-xs font-medium text-[#191C1E] dark:text-[#EFF1F3] cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[#2D5A27] dark:text-[#4ADE80]" />
                <span>Late Salary Deduction (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  exportToExcelXLSX(
                    indOvertimeData,
                    `${empFilePrefix}_Overtime_Report`,
                    'Overtime'
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F2F4F6] dark:bg-[#1E293B] hover:border-[#2D5A27] border border-[#CBCBCB] dark:border-[#334155] text-xs font-medium text-[#191C1E] dark:text-[#EFF1F3] cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[#2D5A27] dark:text-[#4ADE80]" />
                <span>Overtime (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  exportToExcelXLSX(indLeaveData, `${empFilePrefix}_Leave_Report`, 'Leave')
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F2F4F6] dark:bg-[#1E293B] hover:border-[#2D5A27] border border-[#CBCBCB] dark:border-[#334155] text-xs font-medium text-[#191C1E] dark:text-[#EFF1F3] cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[#2D5A27] dark:text-[#4ADE80]" />
                <span>Leave (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  exportToExcelXLSX(
                    indConsiderationData,
                    `${empFilePrefix}_Consideration_Report`,
                    'Considerations'
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F2F4F6] dark:bg-[#1E293B] hover:border-[#2D5A27] border border-[#CBCBCB] dark:border-[#334155] text-xs font-medium text-[#191C1E] dark:text-[#EFF1F3] cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[#2D5A27] dark:text-[#4ADE80]" />
                <span>Consideration (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  exportToExcelXLSX(
                    indPunchExceptionsData,
                    `${empFilePrefix}_Punch_Exceptions_Report`,
                    'Punch Exceptions'
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F2F4F6] dark:bg-[#1E293B] hover:border-[#2D5A27] border border-[#CBCBCB] dark:border-[#334155] text-xs font-medium text-[#191C1E] dark:text-[#EFF1F3] cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[#2D5A27] dark:text-[#4ADE80]" />
                <span>Punch Exceptions (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadIndividualCombined}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2D5A27] text-white text-xs font-semibold hover:bg-[#23461E] cursor-pointer transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Complete Combined (.xlsx)</span>
              </button>
            </div>
          </div>
        </div>

        {/* 8 Section Tabs Navigation */}
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-white dark:bg-[#111827] border border-[#CBCBCB] dark:border-[#1E293B] rounded-xl">
          {EMPLOYEE_DETAIL_TABS.map((tab) => {
            const isTabActive = detailTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDetailTab(tab.id)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isTabActive
                    ? 'bg-[#2D5A27] text-white shadow-xs'
                    : 'text-[#45464D] dark:text-[#94A3B8] hover:text-[#191C1E] dark:hover:text-[#EFF1F3] hover:bg-[#F2F4F6] dark:hover:bg-[#1E293B]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Section Data Table */}
        <div className="bg-white dark:bg-[#111827] border border-[#CBCBCB] dark:border-[#1E293B] rounded-xl overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 border-b border-[#CBCBCB] dark:border-[#1E293B] bg-[#F2F4F6] dark:bg-[#161F30] flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#191C1E] dark:text-[#EFF1F3]">
                {EMPLOYEE_DETAIL_TABS.find((t) => t.id === detailTab)?.label} —{' '}
                {detailEmployee.fullName} ({empId})
              </h3>
              <p className="text-[11px] text-[#45464D] dark:text-[#94A3B8] mt-0.5">
                Showing {activeDetailDataset.length} record
                {activeDetailDataset.length === 1 ? '' : 's'} for period: {periodLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                exportToExcelXLSX(
                  activeDetailDataset,
                  `${empFilePrefix}_${detailTab}_${new Date().toISOString().slice(0, 10)}`,
                  EMPLOYEE_DETAIL_TABS.find((t) => t.id === detailTab)?.label || 'Details'
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F172A] dark:bg-[#1E293B] border border-[#334155] text-white text-xs font-semibold hover:opacity-90 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download This Tab (.xlsx)</span>
            </button>
          </div>

          {activeDetailDataset.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="w-8 h-8 text-[#76777D] mx-auto mb-2 opacity-60" />
              <p className="text-xs font-semibold text-[#191C1E] dark:text-[#EFF1F3]">
                No records found in this section for {detailEmployee.fullName}
              </p>
              <p className="text-[11px] text-[#45464D] dark:text-[#94A3B8] mt-0.5">
                Period: {periodLabel}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#F2F4F6] dark:bg-[#1E293B] border-b border-[#CBCBCB] dark:border-[#334155]">
                  <tr>
                    {activeDetailColumns.map((col) => (
                      <th
                        key={col}
                        className="px-4 py-3 whitespace-nowrap text-[11px] font-bold uppercase tracking-wider text-[#191C1E] dark:text-[#EFF1F3]"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B]">
                  {activeDetailDataset.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className="bg-white dark:bg-[#111827] hover:bg-[#F2F4F6] dark:hover:bg-[#1E293B]/70 transition-colors"
                    >
                      {activeDetailColumns.map((col) => {
                        const val = row[col];
                        if (
                          col === 'Attendance Status' ||
                          col === 'Approval Status' ||
                          col === 'Status'
                        ) {
                          return (
                            <td key={col} className="px-4 py-3 whitespace-nowrap">
                              <StatusBadge status={String(val)} />
                            </td>
                          );
                        }
                        if (col === 'Highlight') {
                          const isFirst = String(val).includes('FIRST IN');
                          const isLast = String(val).includes('LAST OUT');
                          return (
                            <td key={col} className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                                  isFirst
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                                    : isLast
                                    ? 'bg-blue-50 text-blue-800 border border-blue-300'
                                    : 'bg-[#F2F4F6] dark:bg-[#1E293B] text-[#45464D] dark:text-[#94A3B8]'
                                }`}
                              >
                                {val}
                              </span>
                            </td>
                          );
                        }
                        return (
                          <td
                            key={col}
                            className="px-4 py-3 whitespace-nowrap text-[#191C1E] dark:text-[#EFF1F3] font-mono"
                          >
                            {val ?? '—'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===========================================================================
  // MAIN REPORTS MODULE VIEW
  // ===========================================================================
  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#CBCBCB] dark:border-[#1E293B] pb-4">
        <div>
          <h2 className="text-xl font-semibold text-[#191C1E] dark:text-[#EFF1F3] tracking-tight">
            {t('reports.title', 'Reports & Operational Analytics')}
          </h2>
          <p className="text-xs text-[#45464D] dark:text-[#94A3B8] mt-0.5">
            {t('reports.subtitle', 'Seven enterprise audit reports with real-time biometric, payroll, and employee-wise drill-down')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {activeReport === 'final-combined' ? (
            <button
              onClick={handleExportMasterWorkbook}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#2D5A27] text-white hover:bg-[#23461E] rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Master Workbook (.xlsx)</span>
            </button>
          ) : (
            <ExportDropdown
              onExport={(fmt) =>
                exportDataToFormat(
                  currentDataset,
                  `${
                    selectedFilterEmployee
                      ? `${selectedFilterEmployee.fullName.replace(/\s+/g, '_')}_${selectedFilterEmployee.id}`
                      : 'Argos'
                  }_${activeReport}_Report_${new Date().toISOString().slice(0, 10)}`,
                  fmt,
                  `Argos Watch ${REPORT_TYPES.find((r) => r.id === activeReport)?.label}`
                )
              }
            />
          )}
        </div>
      </div>

      {/* Report Type Navigation Cards — Matches Reference Image Exactly */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {REPORT_TYPES.map((rep) => {
          const Icon = rep.icon;
          const isActive = activeReport === rep.id;
          return (
            <button
              key={rep.id}
              type="button"
              onClick={() => setActiveReport(rep.id)}
              className={`text-left p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between min-h-[104px] ${
                isActive
                  ? 'bg-white dark:bg-[#111827] border-[#2D5A27] shadow-sm ring-1 ring-[#2D5A27]'
                  : 'bg-white dark:bg-[#111827] border-[#CBCBCB] dark:border-[#1E293B] hover:border-[#2D5A27] dark:hover:border-[#334155]'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <span
                  className={`p-2 rounded-lg ${
                    isActive
                      ? 'bg-[#2D5A27]/15 text-[#2D5A27] dark:text-[#4ADE80]'
                      : 'bg-[#F2F4F6] dark:bg-[#1E293B] text-[#45464D] dark:text-[#94A3B8]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </span>
                <span
                  className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-md ${
                    isActive
                      ? 'bg-[#2D5A27] text-white'
                      : 'bg-[#F2F4F6] dark:bg-[#1E293B] text-[#45464D] dark:text-[#94A3B8]'
                  }`}
                >
                  {rep.badge}
                </span>
              </div>
              <div>
                <p
                  className={`text-xs sm:text-sm font-semibold ${
                    isActive
                      ? 'text-[#191C1E] dark:text-[#EFF1F3]'
                      : 'text-[#45464D] dark:text-[#94A3B8]'
                  }`}
                >
                  {t(rep.label)}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Attendance Report Specific Sub-view Selector */}
      {activeReport === 'attendance' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white dark:bg-[#111827] border border-[#CBCBCB] dark:border-[#1E293B] rounded-xl">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#45464D] dark:text-[#94A3B8]" />
            <span className="text-xs font-semibold text-[#191C1E] dark:text-[#EFF1F3]">
              Attendance View:
            </span>
          </div>
          <div className="flex items-center bg-[#F2F4F6] dark:bg-[#1E293B] p-1 rounded-lg border border-[#CBCBCB] dark:border-[#334155]">
            <button
              type="button"
              onClick={() => setAttendanceSubView('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                attendanceSubView === 'ALL'
                  ? 'bg-[#0F172A] dark:bg-[#111827] text-white dark:text-[#EFF1F3] shadow-xs'
                  : 'text-[#45464D] dark:text-[#94A3B8] hover:text-[#191C1E] dark:hover:text-[#EFF1F3]'
              }`}
            >
              All Attendance Records ({attendanceRows.length})
            </button>
            <button
              type="button"
              onClick={() => setAttendanceSubView('EXCEPTIONS')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                attendanceSubView === 'EXCEPTIONS'
                  ? 'bg-[#0F172A] dark:bg-[#111827] text-amber-400 shadow-xs'
                  : 'text-[#45464D] dark:text-[#94A3B8] hover:text-[#191C1E] dark:hover:text-[#EFF1F3]'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>Punch Exceptions Only ({punchExceptionRows.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Executive KPI Summary for Final Combined Report */}
      {activeReport === 'final-combined' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            <div className="p-3.5 bg-white dark:bg-[#111827] rounded-xl border border-[#CBCBCB] dark:border-[#1E293B]">
              <p className="text-[11px] font-medium text-[#45464D] dark:text-[#94A3B8]">
                Active In Scope
              </p>
              <p className="text-lg font-bold font-mono text-[#191C1E] dark:text-[#EFF1F3] mt-1">
                {executiveSummary.totalStaff}
              </p>
              <p className="text-[10px] text-[#45464D] dark:text-[#94A3B8] mt-0.5">Employees</p>
            </div>
            <div className="p-3.5 bg-white dark:bg-[#111827] rounded-xl border border-[#CBCBCB] dark:border-[#1E293B]">
              <p className="text-[11px] font-medium text-[#45464D] dark:text-[#94A3B8]">
                Attendance Logs
              </p>
              <p className="text-lg font-bold font-mono text-[#191C1E] dark:text-[#EFF1F3] mt-1">
                {executiveSummary.totalAttRecords}
              </p>
              <p className="text-[10px] text-[#45464D] dark:text-[#94A3B8] mt-0.5">Shift records</p>
            </div>
            <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200">
              <p className="text-[11px] font-medium text-amber-800">Late Arrivals</p>
              <p className="text-lg font-bold font-mono text-amber-900 mt-1">
                {executiveSummary.totalLateMarks}
              </p>
              <p className="text-[10px] text-amber-700 mt-0.5">&gt; 15m grace window</p>
            </div>
            <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200">
              <p className="text-[11px] font-medium text-rose-800">Late Deductions</p>
              <p className="text-lg font-bold font-mono text-rose-900 mt-1">
                ₹{executiveSummary.totalLateDeductions.toLocaleString('en-IN')}
              </p>
              <p className="text-[10px] text-rose-700 mt-0.5">
                {executiveSummary.totalChargeableLateMinutes}m chargeable
              </p>
            </div>
            <div className="p-3.5 bg-white dark:bg-[#111827] rounded-xl border border-[#CBCBCB] dark:border-[#1E293B]">
              <p className="text-[11px] font-medium text-[#45464D] dark:text-[#94A3B8]">
                Considerations
              </p>
              <p className="text-lg font-bold font-mono text-[#2D5A27] dark:text-[#4ADE80] mt-1">
                {executiveSummary.totalApprovedConsiderations}
              </p>
              <p className="text-[10px] text-[#45464D] dark:text-[#94A3B8] mt-0.5">
                Approved waivers
              </p>
            </div>
            <div className="p-3.5 bg-white dark:bg-[#111827] rounded-xl border border-[#CBCBCB] dark:border-[#1E293B]">
              <p className="text-[11px] font-medium text-[#45464D] dark:text-[#94A3B8]">
                Overtime Hours
              </p>
              <p className="text-lg font-bold font-mono text-[#191C1E] dark:text-[#EFF1F3] mt-1">
                {executiveSummary.totalOtHours}h
              </p>
              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                ₹{executiveSummary.totalOtPayout.toLocaleString('en-IN')} payout
              </p>
            </div>
            <div className="p-3.5 bg-white dark:bg-[#111827] rounded-xl border border-[#CBCBCB] dark:border-[#1E293B]">
              <p className="text-[11px] font-medium text-[#45464D] dark:text-[#94A3B8]">
                Leaves Taken
              </p>
              <p className="text-lg font-bold font-mono text-[#191C1E] dark:text-[#EFF1F3] mt-1">
                {executiveSummary.totalLeavesDays}
              </p>
              <p className="text-[10px] text-[#45464D] dark:text-[#94A3B8] mt-0.5">
                Approved days
              </p>
            </div>
            <div className="p-3.5 bg-orange-50 rounded-xl border border-orange-200">
              <p className="text-[11px] font-medium text-orange-800">Punch Exceptions</p>
              <p className="text-lg font-bold font-mono text-orange-900 mt-1">
                {executiveSummary.totalExceptions}
              </p>
              <p className="text-[10px] text-orange-700 mt-0.5">Missing In/Out</p>
            </div>
          </div>
        </div>
      )}

      {/* Universal Filter Toolbar + Searchable Employee Dropdown (Requirement 3) */}
      <div className="bg-white dark:bg-[#111827] p-4 rounded-xl border border-[#CBCBCB] dark:border-[#1E293B] space-y-3 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* 1. Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#45464D] dark:text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#F2F4F6] dark:bg-[#1E293B] border border-[#CBCBCB] dark:border-[#334155] rounded-lg text-xs text-[#191C1E] dark:text-[#EFF1F3] placeholder:text-[#76777D] dark:placeholder:text-[#94A3B8] focus:outline-none focus:border-[#2D5A27]"
            />
          </div>

          {/* 2. Searchable Employee Dropdown (HR & Admin Only — Requirement 3) */}
          {isHRAdmin && (
            <div className="relative" ref={empDropdownRef}>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => setEmpDropdownOpen((o) => !o)}
                  className="w-full px-3 py-2 bg-[#F2F4F6] dark:bg-[#1E293B] border border-[#CBCBCB] dark:border-[#334155] rounded-lg text-xs text-left text-[#191C1E] dark:text-[#EFF1F3] flex items-center justify-between gap-2 cursor-pointer hover:border-[#2D5A27]"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <User className="w-3.5 h-3.5 text-[#2D5A27] dark:text-[#4ADE80] shrink-0" />
                    <span className="truncate font-medium">
                      {selectedFilterEmployee
                        ? `${selectedFilterEmployee.fullName} (${selectedFilterEmployee.id})`
                        : 'All Employees (Search Name / ID)'}
                    </span>
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#45464D] dark:text-[#94A3B8] shrink-0" />
                </button>
                {filterEmpId !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => setFilterEmpId('ALL')}
                    title="Clear employee selection"
                    className="ml-1 p-1.5 rounded-lg bg-[#F2F4F6] dark:bg-[#1E293B] border border-[#CBCBCB] dark:border-[#334155] text-[#45464D] dark:text-[#94A3B8] hover:text-rose-500 cursor-pointer shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {empDropdownOpen && (
                <div className="absolute left-0 right-0 sm:w-80 mt-1.5 bg-white dark:bg-[#111827] border border-[#CBCBCB] dark:border-[#334155] rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="p-2 border-b border-[#CBCBCB] dark:border-[#1E293B]">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-[#45464D] dark:text-[#94A3B8] absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        autoFocus
                        value={empDropdownSearch}
                        onChange={(e) => setEmpDropdownSearch(e.target.value)}
                        placeholder="Search by Employee Name or ID..."
                        className="w-full pl-8 pr-7 py-1.5 bg-[#F2F4F6] dark:bg-[#1E293B] border border-[#CBCBCB] dark:border-[#334155] rounded-lg text-xs text-[#191C1E] dark:text-[#EFF1F3] focus:outline-none"
                      />
                      {empDropdownSearch && (
                        <button
                          type="button"
                          onClick={() => setEmpDropdownSearch('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-[#45464D] dark:text-[#94A3B8]"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="max-h-60 overflow-y-auto divide-y divide-[#E2E8F0] dark:divide-[#1E293B]">
                    <button
                      type="button"
                      onClick={() => {
                        setFilterEmpId('ALL');
                        setEmpDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2.5 text-left text-xs flex items-center justify-between cursor-pointer ${
                        filterEmpId === 'ALL'
                          ? 'bg-[#2D5A27]/15 text-[#2D5A27] dark:text-[#4ADE80] font-bold'
                          : 'text-[#191C1E] dark:text-[#EFF1F3] hover:bg-[#F2F4F6] dark:hover:bg-[#1E293B]'
                      }`}
                    >
                      <span>All Employees (Organization-Wide)</span>
                      {filterEmpId === 'ALL' && <Check className="w-3.5 h-3.5" />}
                    </button>

                    {dropdownFilteredEmployees.length === 0 ? (
                      <div className="p-4 text-center text-xs text-[#45464D] dark:text-[#94A3B8]">
                        No employees match "{empDropdownSearch}"
                      </div>
                    ) : (
                      dropdownFilteredEmployees.map((emp) => {
                        const isSelected = filterEmpId === emp.id;
                        return (
                          <button
                            key={emp.id}
                            type="button"
                            onClick={() => {
                              setFilterEmpId(emp.id);
                              setEmpDropdownOpen(false);
                            }}
                            className={`w-full px-3 py-2.5 text-left text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-[#2D5A27]/15 text-[#2D5A27] dark:text-[#4ADE80] font-semibold'
                                : 'text-[#191C1E] dark:text-[#EFF1F3] hover:bg-[#F2F4F6] dark:hover:bg-[#1E293B]'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="font-semibold truncate">{emp.fullName}</div>
                              <div className="text-[10px] text-[#45464D] dark:text-[#94A3B8] font-mono truncate">
                                {emp.id} · {emp.department}
                              </div>
                            </div>
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#F2F4F6] dark:bg-[#1E293B] text-[#191C1E] dark:text-[#EFF1F3] shrink-0">
                              {emp.id}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. Department Filter */}
          <div>
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="w-full px-3 py-2 bg-[#F2F4F6] dark:bg-[#1E293B] border border-[#CBCBCB] dark:border-[#334155] rounded-lg text-xs text-[#191C1E] dark:text-[#EFF1F3] focus:outline-none focus:border-[#2D5A27]"
            >
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept === 'ALL' ? 'All Departments' : dept}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Date Range From */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-[#45464D] dark:text-[#94A3B8] whitespace-nowrap">
              From:
            </span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-2.5 py-2 bg-[#F2F4F6] dark:bg-[#1E293B] border border-[#CBCBCB] dark:border-[#334155] rounded-lg text-xs text-[#191C1E] dark:text-[#EFF1F3] font-mono focus:outline-none focus:border-[#2D5A27]"
            />
          </div>

          {/* 5. Date Range To */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-[#45464D] dark:text-[#94A3B8] whitespace-nowrap">
              To:
            </span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-2.5 py-2 bg-[#F2F4F6] dark:bg-[#1E293B] border border-[#CBCBCB] dark:border-[#334155] rounded-lg text-xs text-[#191C1E] dark:text-[#EFF1F3] font-mono focus:outline-none focus:border-[#2D5A27]"
            />
          </div>
        </div>

        {/* Active Employee Filter Banner & Reset Controls */}
        {(selectedFilterEmployee ||
          dateFrom ||
          dateTo ||
          filterDept !== 'ALL' ||
          filterStatus !== 'ALL' ||
          searchQuery) && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-[#E2E8F0] dark:border-[#1E293B]">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {selectedFilterEmployee ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md bg-[#2D5A27]/15 text-[#2D5A27] dark:text-[#4ADE80] font-semibold">
                    Viewing Filtered Report: {selectedFilterEmployee.fullName} (
                    {selectedFilterEmployee.id})
                  </span>
                  <button
                    type="button"
                    onClick={() => openEmployeeReportDetails(selectedFilterEmployee.id)}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-[#2D5A27] text-white text-xs font-semibold hover:bg-[#23461E] cursor-pointer"
                  >
                    <span>Open Full Employee Report Details (8 Sections)</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <span className="text-[11px] text-[#45464D] dark:text-[#94A3B8]">
                  Active report filters applied
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setDateFrom('');
                setDateTo('');
                setFilterEmpId('ALL');
                setFilterDept('ALL');
                setFilterStatus('ALL');
                setSearchQuery('');
              }}
              className="text-xs text-[#2D5A27] dark:text-[#4ADE80] hover:underline cursor-pointer font-semibold"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* Report Records Table */}
      <div className="bg-white dark:bg-[#111827] rounded-xl border border-[#CBCBCB] dark:border-[#1E293B] overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 border-b border-[#CBCBCB] dark:border-[#1E293B] flex flex-wrap items-center justify-between gap-3 bg-[#F2F4F6] dark:bg-[#161F30]">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-bold text-[#191C1E] dark:text-[#EFF1F3]">
              {REPORT_TYPES.find((r) => r.id === activeReport)?.label}
            </span>
            <span className="text-xs font-medium text-[#45464D] dark:text-[#94A3B8]">
              ({currentDataset.length} {currentDataset.length === 1 ? 'record' : 'records'})
            </span>
            {isHRAdmin && (
              <span className="hidden md:inline-block text-[11px] text-[#2D5A27] dark:text-[#4ADE80] font-medium ml-2">
                • Click any employee row or name to open Employee Report Details
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ExportDropdown
              onExport={(fmt) =>
                exportDataToFormat(
                  currentDataset,
                  `${
                    selectedFilterEmployee
                      ? `${selectedFilterEmployee.fullName.replace(/\s+/g, '_')}_${selectedFilterEmployee.id}`
                      : 'Argos'
                  }_${activeReport}_Report_${new Date().toISOString().slice(0, 10)}`,
                  fmt,
                  `Argos Watch ${REPORT_TYPES.find((r) => r.id === activeReport)?.label}`
                )
              }
            />
          </div>
        </div>

        {currentDataset.length === 0 ? (
          <div className="py-12 text-center">
            <FileText className="w-8 h-8 text-[#76777D] mx-auto mb-2 opacity-60" />
            <p className="text-xs font-semibold text-[#191C1E] dark:text-[#EFF1F3]">
              No records match the selected criteria
            </p>
            <p className="text-[11px] text-[#45464D] dark:text-[#94A3B8] mt-0.5">
              Try clearing or adjusting date ranges and employee filters
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#F2F4F6] dark:bg-[#1E293B] border-b border-[#CBCBCB] dark:border-[#334155]">
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 whitespace-nowrap text-[11px] font-bold uppercase tracking-wider text-[#191C1E] dark:text-[#EFF1F3]"
                    >
                      {t(col)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B]">
                {currentDataset.slice(0, 100).map((row, idx) => {
                  const rowEmpId = row['Employee ID'];
                  const rowEmpName = row['Employee Name'];
                  return (
                    <tr
                      key={idx}
                      onClick={() => {
                        if (isHRAdmin && (rowEmpId || rowEmpName)) {
                          openEmployeeReportDetails(String(rowEmpId || ''), String(rowEmpName || ''));
                        }
                      }}
                      className={`bg-white dark:bg-[#111827] hover:bg-[#F2F4F6] dark:hover:bg-[#1E293B]/80 transition-colors ${
                        isHRAdmin ? 'cursor-pointer group' : ''
                      }`}
                    >
                      {columns.map((col) => {
                        const val = row[col];
                        if (col === 'Employee Name' && isHRAdmin) {
                          return (
                            <td key={col} className="px-4 py-3 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEmployeeReportDetails(
                                    String(rowEmpId || ''),
                                    String(rowEmpName || '')
                                  );
                                }}
                                className="font-semibold text-[#191C1E] dark:text-[#EFF1F3] group-hover:text-[#2D5A27] dark:group-hover:text-[#4ADE80] group-hover:underline inline-flex items-center gap-1.5 cursor-pointer text-left"
                              >
                                <span>{val}</span>
                                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                            </td>
                          );
                        }
                        if (col === 'Limit Warning') {
                          const isExceeded = String(val).includes('EXCEEDED');
                          return (
                            <td key={col} className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                                  isExceeded
                                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                }`}
                              >
                                {val}
                              </span>
                            </td>
                          );
                        }
                        if (col === 'Punch Exception') {
                          const isException = val !== 'None';
                          return (
                            <td key={col} className="px-4 py-3 whitespace-nowrap">
                              {isException ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100 text-amber-900 border border-amber-200">
                                  {val}
                                </span>
                              ) : (
                                <span className="text-[#45464D] dark:text-[#94A3B8]">—</span>
                              )}
                            </td>
                          );
                        }
                        if (col === 'Attendance Status' || col === 'Status') {
                          return (
                            <td key={col} className="px-4 py-3 whitespace-nowrap">
                              <StatusBadge status={String(val)} />
                            </td>
                          );
                        }
                        return (
                          <td
                            key={col}
                            className="px-4 py-3 whitespace-nowrap text-[#191C1E] dark:text-[#EFF1F3] font-mono"
                          >
                            {val ?? '—'}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {currentDataset.length > 100 && (
          <div className="p-3 bg-[#F2F4F6] dark:bg-[#1E293B] border-t border-[#CBCBCB] dark:border-[#334155] text-center text-xs text-[#45464D] dark:text-[#94A3B8]">
            Showing first 100 of {currentDataset.length} records. Export full report via .xlsx or .csv to view all rows.
          </div>
        )}
      </div>
    </div>
  );
}
