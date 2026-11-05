import React, { useState, useMemo } from 'react';
import {
  Clock,
  Search,
  Edit3,
  Trash2,
  ArrowUpDown,
  Sliders,
  UserCheck,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { useHRMS } from '../../context/HRMSContext';
import {
  StatusBadge,
  AvatarInitials,
  ExportDropdown,
  ModalShell,
  ConfirmDialog,
  ActionMenu,
  SlideOverDrawer,
  TimePicker,
} from '../ui/EnterpriseComponents';
import { AttendanceRecord, PunchEvent } from '../../types/hrms';
import {
  getNormalizedPunchesForRecord,
  calculateLateDeduction,
} from '../../lib/attendanceCalculations';

const MONTH_NAMES = [
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

const YEAR_OPTIONS = [2024, 2025, 2026, 2027, 2028];

// Standard recurring company & national holidays across all months
const ANNUAL_HOLIDAYS: Record<string, { name: string; type: string }> = {
  '01-01': { name: "New Year's Day", type: 'Company Holiday' },
  '01-14': { name: 'Uttarayan / Makar Sankranti', type: 'Regional Festival' },
  '01-26': { name: 'Republic Day', type: 'National Holiday' },
  '03-14': { name: 'Holi / Dhuleti', type: 'Festival Holiday' },
  '04-14': { name: 'Dr. Ambedkar Jayanti', type: 'Gazetted Holiday' },
  '05-01': { name: 'Gujarat Foundation / May Day', type: 'State Holiday' },
  '08-15': { name: 'Independence Day', type: 'National Holiday' },
  '08-27': { name: 'Raksha Bandhan', type: 'Festival Holiday' },
  '10-02': { name: 'Gandhi Jayanti', type: 'National Holiday' },
  '10-20': { name: 'Dussehra / Vijayadashami', type: 'Festival Holiday' },
  '11-01': { name: 'Diwali / Deepavali', type: 'Festival Holiday' },
  '11-02': { name: 'Vikram Samvat New Year', type: 'Regional Festival' },
  '12-25': { name: 'Christmas Day', type: 'Gazetted Holiday' },
};

export function AttendanceModule() {
  const {
    currentUser,
    permissions,
    attendance,
    leaves,
    holidays,
    employees,
    companyTiming,
    isClockedIn,
    clockInTime,
    toggleClockIn,
    liveWorkingDuration,
    checkInToday,
    checkOutToday,
    logOrUpdateAttendanceForEmployee,
    logManualAttendance,
    allEmployees,
    addToast,
    updateAttendanceRecord,
    deleteAttendanceRecord,
    submitRegularization,
    setActiveModule,
  } = useHRMS();

  const isEmployeeRole =
    currentUser.role === 'EMPLOYEE' || currentUser.role === 'MANAGER';
  const isHRAdmin = currentUser.role === 'HR' || currentUser.role === 'ADMIN';

  // Employee Attendance View Switcher: 'normal' vs 'calendar'
  const [empViewMode, setEmpViewMode] = useState<'normal' | 'calendar'>('normal');

  // Employee Calendar Month & Year Navigation State (Default: October 2026, Today = Oct 6, 2026)
  const CURRENT_YEAR = 2026;
  const CURRENT_MONTH = 9; // 0-indexed: 9 = October
  const CURRENT_DAY = 6;

  const [calYear, setCalYear] = useState<number>(CURRENT_YEAR);
  const [calMonth, setCalMonth] = useState<number>(CURRENT_MONTH);
  const [selectedCalDay, setSelectedCalDay] = useState<number>(CURRENT_DAY);

  const handlePrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
    setSelectedCalDay(1);
  };

  const handleNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
    setSelectedCalDay(1);
  };

  const handleJumpToToday = () => {
    setCalYear(CURRENT_YEAR);
    setCalMonth(CURRENT_MONTH);
    setSelectedCalDay(CURRENT_DAY);
  };

  // Primary View Tab for Admin/HR/Manager: 'today' vs 'ledger'
  const [activeView, setActiveView] = useState<'today' | 'ledger'>(
    currentUser.role === 'EMPLOYEE' || currentUser.role === 'MANAGER'
      ? 'ledger'
      : 'today'
  );

  // Filter & Sort State
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterDept, setFilterDept] = useState<string>('ALL');
  const [filterManager, setFilterManager] = useState<string>('ALL');
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'employeeName' | 'totalHours' | 'lateByMinutes'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [regularizeModalId, setRegularizeModalId] = useState<string | null>(null);
  const [regReason, setRegReason] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);

  // HR Log / Update Attendance on Behalf Modal
  const [showLogModal, setShowLogModal] = useState(false);
  const [logEmpId, setLogEmpId] = useState(currentUser.employeeId);
  const [logDate, setLogDate] = useState('2026-10-06');
  const [logPunchIn, setLogPunchIn] = useState('09:30');
  const [logPunchOut, setLogPunchOut] = useState('18:30');
  const [logStatus, setLogStatus] = useState<AttendanceRecord['status']>('PRESENT');
  const [logLateMinutes, setLogLateMinutes] = useState(0);
  const [logNotes, setLogNotes] = useState('');
  const [logReason, setLogReason] = useState('');
  const [empSearchTerm, setEmpSearchTerm] = useState('');

  // Edit Attendance Modal
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editPunchIn, setEditPunchIn] = useState('');
  const [editPunchOut, setEditPunchOut] = useState('');
  const [editStatus, setEditStatus] = useState<AttendanceRecord['status']>('PRESENT');
  const [editLateMinutes, setEditLateMinutes] = useState(0);
  const [editNotes, setEditNotes] = useState('');

  // Delete Attendance Confirmation
  const [deletingRecord, setDeletingRecord] = useState<AttendanceRecord | null>(null);

  const departments = useMemo<string[]>(() => {
    const set = new Set<string>(employees.map((e) => e.department));
    return ['ALL', ...Array.from(set)];
  }, [employees]);

  const managersList = useMemo<string[]>(() => {
    const set = new Set<string>(employees.map((e) => e.reportingManager).filter(Boolean));
    return ['ALL', ...Array.from(set)];
  }, [employees]);

  const scopedEmployees = useMemo(() => {
    if (currentUser.role === 'EMPLOYEE' || permissions.Attendance?.scope === 'SELF') {
      return employees.filter((e) => e.id === currentUser.employeeId);
    }
    if (currentUser.role === 'MANAGER' || permissions.Attendance?.scope === 'TEAM') {
      return employees.filter(
        (e) => e.managerId === currentUser.employeeId || e.id === currentUser.employeeId
      );
    }
    return employees;
  }, [employees, permissions, currentUser]);

  // Dedicated "Today View" Computed Roster
  const latestDate = useMemo(() => {
    const dates = attendance.map((a) => a.date).sort();
    return dates[dates.length - 1] || '2026-10-06';
  }, [attendance]);

  const todayRoster = useMemo(() => {
    return scopedEmployees
      .map((emp) => {
        const rec = attendance.find(
          (a) => a.employeeId === emp.id && a.date === latestDate
        );
        return {
          employee: emp,
          record: rec,
          checkIn: rec?.punchIn || null,
          checkOut: rec?.punchOut || null,
          status: rec?.status || 'ABSENT',
          lateByMinutes: rec?.lateByMinutes || 0,
          workHours: rec?.totalHours || rec?.workHours || 0,
          checkedOut: Boolean(rec?.punchOut),
          notCheckedIn: !rec?.punchIn && rec?.status !== 'ON_LEAVE',
        };
      })
      .filter((row) => {
        const matchDept = filterDept === 'ALL' || row.employee.department === filterDept;
        const matchMgr =
          filterManager === 'ALL' || row.employee.reportingManager === filterManager;
        const matchStatus = filterStatus === 'ALL' || row.status === filterStatus;
        const q = searchQuery.toLowerCase().trim();
        const matchSearch =
          !q ||
          row.employee.fullName.toLowerCase().includes(q) ||
          row.employee.employeeCode.toLowerCase().includes(q) ||
          row.employee.department.toLowerCase().includes(q);
        return matchDept && matchMgr && matchStatus && matchSearch;
      });
  }, [
    scopedEmployees,
    attendance,
    latestDate,
    filterDept,
    filterManager,
    filterStatus,
    searchQuery,
  ]);

  const todayStats = useMemo(() => {
    return {
      total: todayRoster.length,
      present: todayRoster.filter(
        (r) => r.status === 'PRESENT' || r.status === 'LATE' || r.status === 'HALF_DAY'
      ).length,
      absent: todayRoster.filter((r) => r.status === 'ABSENT').length,
      onLeave: todayRoster.filter((r) => r.status === 'ON_LEAVE').length,
      late: todayRoster.filter((r) => r.status === 'LATE' || r.lateByMinutes > 0).length,
      notCheckedIn: todayRoster.filter((r) => r.notCheckedIn).length,
      checkedOut: todayRoster.filter((r) => r.checkedOut).length,
    };
  }, [todayRoster]);

  const scopedAttendance = useMemo(() => {
    let base = attendance;
    if (!isHRAdmin) {
      // Strict Personal Data Separation: Manager's and Employee's Attendance module shows ONLY their own data.
      // Team members' authorized attendance is accessible exclusively through "My Team".
      base = attendance.filter((a) => a.employeeId === currentUser.employeeId);
    }

    const filtered = base.filter((a) => {
      const empObj = employees.find((e) => e.id === a.employeeId);
      const matchDate = !filterDate || a.date === filterDate;
      const matchStatus = filterStatus === 'ALL' || a.status === filterStatus;
      const matchDept = filterDept === 'ALL' || a.department === filterDept;
      const matchMgr =
        filterManager === 'ALL' || empObj?.reportingManager === filterManager;
      const matchEmp = filterEmployeeId === 'ALL' || a.employeeId === filterEmployeeId;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        a.employeeName.toLowerCase().includes(q) ||
        a.employeeCode.toLowerCase().includes(q) ||
        a.department.toLowerCase().includes(q) ||
        (a.notes && a.notes.toLowerCase().includes(q));
      return matchDate && matchStatus && matchDept && matchMgr && matchEmp && matchSearch;
    });

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = a.date.localeCompare(b.date);
      } else if (sortBy === 'employeeName') {
        comparison = a.employeeName.localeCompare(b.employeeName);
      } else if (sortBy === 'totalHours') {
        comparison = (a.totalHours || 0) - (b.totalHours || 0);
      } else if (sortBy === 'lateByMinutes') {
        comparison = a.lateByMinutes - b.lateByMinutes;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [
    attendance,
    employees,
    permissions,
    currentUser,
    filterDate,
    filterStatus,
    filterDept,
    filterManager,
    filterEmployeeId,
    searchQuery,
    sortBy,
    sortOrder,
  ]);

  const openCorrectRecordModal = (record: AttendanceRecord) => {
    setEditingRecord(record);
    setLogEmpId(record.employeeId);
    setLogDate(record.date);
    setLogPunchIn(record.punchIn || record.checkIn || '09:30');
    setLogPunchOut(record.punchOut || record.checkOut || '18:30');
    setLogStatus(record.status || 'PRESENT');
    setLogLateMinutes(record.lateByMinutes || 0);
    setLogReason(record.manualCorrectionReason || '');
    setLogNotes(record.notes || '');
    setEmpSearchTerm('');
    setShowLogModal(true);
  };

  const openAddManualModal = () => {
    setEditingRecord(null);
    setLogEmpId(employees[0]?.id || currentUser.employeeId);
    setLogDate('2026-10-06');
    setLogPunchIn('09:30');
    setLogPunchOut('18:30');
    setLogStatus('PRESENT');
    setLogLateMinutes(0);
    setLogReason('');
    setLogNotes('');
    setEmpSearchTerm('');
    setShowLogModal(true);
  };

  const handleLogAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logReason.trim()) {
      addToast(
        'Reason Required',
        'Please provide a mandatory note explaining the attendance correction.',
        'error'
      );
      return;
    }
    logManualAttendance({
      employeeId: logEmpId,
      date: logDate,
      punchIn: logPunchIn || null,
      punchOut: logPunchOut || null,
      status: logStatus,
      reason: logReason.trim(),
      notes: logNotes.trim(),
      lateByMinutes: Number(logLateMinutes) || 0,
    });
    setShowLogModal(false);
    setEditingRecord(null);
    setLogReason('');
    setLogNotes('');
  };

  const handleRegularizeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regularizeModalId || !regReason.trim()) return;
    submitRegularization(regularizeModalId, regReason);
    setRegularizeModalId(null);
    setRegReason('');
  };

  const openEditRecord = openCorrectRecordModal;

  return (
    <div className={isEmployeeRole ? 'space-y-4 pb-6' : 'p-4 lg:p-6 max-w-[1440px] mx-auto space-y-6'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#CBCBCB]">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-[#141A17] tracking-tight">
            {isEmployeeRole ? 'My Attendance' : 'Attendance & Today Live View'}
          </h1>
          <p className="text-xs text-[#525854] mt-0.5">
            {isEmployeeRole
              ? 'Switch between Normal View and Calendar View to track your daily attendance'
              : `Real-time Today attendance board, grace period (${companyTiming.gracePeriodMinutes} mins), and historical timekeeping ledger`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ExportDropdown
            data={scopedAttendance}
            filename={`argos_attendance_${latestDate}`}
            title="Argos Watch — Attendance Ledger"
          />
          {isHRAdmin && (
            <button
              onClick={openAddManualModal}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#164C38] hover:bg-[#0F3627] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              <UserCheck className="w-3.5 h-3.5" />
              Add Manual Attendance / Correct Attendance
            </button>
          )}
          {!isEmployeeRole && (
            <div className="flex items-center gap-3 bg-white border border-[#CBCBCB] rounded-lg px-3.5 py-2">
              <div className="text-right">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#525854]">
                  Shift ({companyTiming.workingStartTime} – {companyTiming.workingEndTime})
                </div>
                <div className="text-xs font-mono font-bold text-[#141A17]">
                  {isClockedIn ? `Clocked In • ${clockInTime}` : 'Shift Concluded'}
                </div>
              </div>
              <button
                onClick={toggleClockIn}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  isClockedIn
                    ? 'bg-[#4E1617] text-[#F2F2F2]'
                    : 'bg-[#164C38] text-[#F2F2F2] hover:bg-[#0F3627]'
                }`}
              >
                {isClockedIn ? 'Check Out' : 'Check In'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Live Working-Duration Punch Timer Widget (Requirement 3) */}
      {isEmployeeRole && (
        <div className="bg-[#0A0A0A] text-white rounded-2xl p-5 sm:p-6 border border-[#262626] shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-white" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#A3A3A3]">
                  Live Attendance Clock & Working Timer
                </span>
                {isClockedIn && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white text-[#0A0A0A] text-[10px] font-mono font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0A0A0A] animate-ping" />
                    LIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-[#A3A3A3] mt-0.5">
                Shift: {companyTiming.workingStartTime} – {companyTiming.workingEndTime} • Grace: {companyTiming.gracePeriodMinutes} mins
              </p>
            </div>

            {/* Punch Action Buttons with duplicate prevention */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!isClockedIn) checkInToday();
                }}
                disabled={isClockedIn}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  !isClockedIn
                    ? 'bg-white text-[#0A0A0A] hover:bg-[#E5E5E5] shadow-xs cursor-pointer'
                    : 'bg-white/10 text-white/40 cursor-not-allowed border border-white/10'
                }`}
              >
                <span>Punch In</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isClockedIn) checkOutToday();
                }}
                disabled={!isClockedIn}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isClockedIn
                    ? 'bg-white text-[#0A0A0A] hover:bg-[#E5E5E5] shadow-xs cursor-pointer'
                    : 'bg-white/10 text-white/40 cursor-not-allowed border border-white/10'
                }`}
              >
                <span>Punch Out</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-[10px] font-bold uppercase text-[#A3A3A3] block">Punch In Time</span>
              <span className="text-base font-mono font-bold text-white mt-1 block">
                {isClockedIn ? clockInTime : '09:30 AM'}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-[10px] font-bold uppercase text-[#A3A3A3] block">Punch Out Time</span>
              <span className="text-base font-mono font-bold text-white mt-1 block">
                {isClockedIn ? 'Active Shift' : '06:30 PM'}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-[10px] font-bold uppercase text-[#A3A3A3] block">Live Working Duration (HH:MM:SS)</span>
              <span className="text-lg font-mono font-bold text-white mt-1 block tracking-wider">
                {isClockedIn ? (liveWorkingDuration || '00:00:00') : '09:00:00'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Employee Two-Option View Toggle: Normal View | Calendar View */}
      {isEmployeeRole && (
        <div className="grid grid-cols-2 gap-2 bg-white border border-[#CBCBCB] p-1.5 rounded-2xl shadow-2xs">
          <button
            type="button"
            onClick={() => setEmpViewMode('normal')}
            className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              empViewMode === 'normal'
                ? 'bg-[#164C38] text-[#F2F2F2] shadow-xs'
                : 'text-[#525854] hover:text-[#141A17]'
            }`}
          >
            <Clock className="w-4 h-4 shrink-0" />
            <span>Normal View</span>
          </button>
          <button
            type="button"
            onClick={() => setEmpViewMode('calendar')}
            className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              empViewMode === 'calendar'
                ? 'bg-[#164C38] text-[#F2F2F2] shadow-xs'
                : 'text-[#525854] hover:text-[#141A17]'
            }`}
          >
            <Calendar className="w-4 h-4 shrink-0" />
            <span>Calendar View</span>
          </button>
        </div>
      )}

      {/* Mode Switcher for Admin/HR/Manager */}
      {!isEmployeeRole && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-white border border-[#CBCBCB] p-1.5 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveView('today')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeView === 'today'
                  ? 'bg-[#164C38] text-[#F2F2F2]'
                  : 'text-[#525854] hover:text-[#141A17]'
              }`}
            >
              1. Today Live View ({latestDate})
            </button>
            <button
              type="button"
              onClick={() => setActiveView('ledger')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeView === 'ledger'
                  ? 'bg-[#164C38] text-[#F2F2F2]'
                  : 'text-[#525854] hover:text-[#141A17]'
              }`}
            >
              2. Attendance History & Regularization ({scopedAttendance.length})
            </button>
          </div>

          {isHRAdmin && (
            <button
              onClick={() => setActiveModule('company-info')}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#4E1617] hover:underline cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
              Configure Shift Timings ({companyTiming.workingStartTime}–{companyTiming.workingEndTime}) & Late Rules →
            </button>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* DEDICATED "TODAY" VIEW (ADMIN / HR / MANAGER)                         */}
      {/* ===================================================================== */}
      {!isEmployeeRole && activeView === 'today' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="bg-white border border-[#CBCBCB] rounded-xl p-3.5">
              <span className="text-[10px] font-bold uppercase text-[#525854] block">
                Total Employees
              </span>
              <span className="text-xl font-bold font-mono text-[#141A17] mt-1 block">
                {todayStats.total}
              </span>
            </div>
            <div className="bg-white border border-[#CBCBCB] rounded-xl p-3.5">
              <span className="text-[10px] font-bold uppercase text-[#164C38] block">
                Present Today
              </span>
              <span className="text-xl font-bold font-mono text-[#164C38] mt-1 block">
                {todayStats.present}
              </span>
            </div>
            <div className="bg-white border border-[#CBCBCB] rounded-xl p-3.5">
              <span className="text-[10px] font-bold uppercase text-[#4E1617] block">
                Absent
              </span>
              <span className="text-xl font-bold font-mono text-[#4E1617] mt-1 block">
                {todayStats.absent}
              </span>
            </div>
            <div className="bg-white border border-[#CBCBCB] rounded-xl p-3.5">
              <span className="text-[10px] font-bold uppercase text-[#525854] block">
                On Leave
              </span>
              <span className="text-xl font-bold font-mono text-[#141A17] mt-1 block">
                {todayStats.onLeave}
              </span>
            </div>
            <div className="bg-white border border-[#CBCBCB] rounded-xl p-3.5">
              <span className="text-[10px] font-bold uppercase text-[#4E1617] block">
                Late Arrivals
              </span>
              <span className="text-xl font-bold font-mono text-[#4E1617] mt-1 block">
                {todayStats.late}
              </span>
            </div>
            <div className="bg-white border border-[#CBCBCB] rounded-xl p-3.5">
              <span className="text-[10px] font-bold uppercase text-[#525854] block">
                Not Checked In
              </span>
              <span className="text-xl font-bold font-mono text-[#141A17] mt-1 block">
                {todayStats.notCheckedIn}
              </span>
            </div>
            <div className="bg-white border border-[#CBCBCB] rounded-xl p-3.5">
              <span className="text-[10px] font-bold uppercase text-[#164C38] block">
                Checked Out
              </span>
              <span className="text-xl font-bold font-mono text-[#164C38] mt-1 block">
                {todayStats.checkedOut}
              </span>
            </div>
          </div>

          <div className="bg-white border border-[#CBCBCB] rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#CBCBCB] bg-[#F2F2F2] flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#164C38]">
                  Today Attendance Status Board ({latestDate})
                </h2>
                <p className="text-[11px] text-[#525854]">
                  Check-in time, check-out time, late arrivals, and logged working hours
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={filterDept}
                  onChange={(e) => setFilterDept(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-[#CBCBCB] rounded-lg text-xs font-medium"
                >
                  {departments.map((d: string) => (
                    <option key={d} value={d}>
                      {d === 'ALL' ? 'All Departments' : d}
                    </option>
                  ))}
                </select>
                <select
                  value={filterManager}
                  onChange={(e) => setFilterManager(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-[#CBCBCB] rounded-lg text-xs font-medium"
                >
                  {managersList.map((m: string) => (
                    <option key={m} value={m}>
                      {m === 'ALL' ? 'All Managers' : `Mgr: ${m}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#CBCBCB] text-[10px] font-bold uppercase tracking-wider text-[#525854] bg-[#F2F2F2]">
                    <th className="py-3.5 px-5">Employee</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4">Check-In Time</th>
                    <th className="py-3.5 px-4">Check-Out Time</th>
                    <th className="py-3.5 px-4">Today Status</th>
                    <th className="py-3.5 px-4">Late By</th>
                    <th className="py-3.5 px-4">Working Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#CBCBCB]/60 text-xs">
                  {todayRoster.map((row) => (
                    <tr
                      key={row.employee.id}
                      onClick={() => {
                        const existing = attendance.find(
                          (a) => a.employeeId === row.employee.id && a.date === '2026-10-06'
                        );
                        setSelectedRecord(
                          existing || {
                            id: `ATT-TODAY-${row.employee.id}`,
                            employeeId: row.employee.id,
                            employeeName: row.employee.fullName,
                            employeeCode: row.employee.employeeCode,
                            department: row.employee.department,
                            date: '2026-10-06',
                            punchIn: row.checkIn || '—',
                            punchOut: row.checkOut || '—',
                            totalHours: row.workHours || 0,
                            status: row.status,
                            lateByMinutes: row.lateByMinutes || 0,
                            regularizationStatus: 'NONE',
                          }
                        );
                      }}
                      className="hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <AvatarInitials name={row.employee.fullName} size="sm" />
                          <div>
                            <div className="font-bold text-[#141A17]">
                              {row.employee.fullName}
                            </div>
                            <div className="text-[11px] font-mono text-[#525854]">
                              {row.employee.employeeCode}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-[#141A17]">
                        {row.employee.department}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-[#164C38]">
                        {row.checkIn || 'Not Checked In'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[#525854]">
                        {row.checkOut || 'Active / —'}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="py-3.5 px-4">
                        {row.lateByMinutes > 0 ? (
                          <span className="px-2 py-0.5 rounded bg-[#4E1617]/10 text-[#4E1617] font-mono font-bold text-[11px]">
                            Late +{row.lateByMinutes}m
                          </span>
                        ) : (
                          <span className="text-[#164C38] font-medium">On Time</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-[#141A17]">
                        {row.workHours ? `${row.workHours}h` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* EMPLOYEE CALENDAR VIEW (WITH FULL MONTH & YEAR NAVIGATION + TODAY)    */}
      {/* ===================================================================== */}
      {isEmployeeRole && empViewMode === 'calendar' && (() => {
        const totalDaysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
        const startOffset = new Date(calYear, calMonth, 1).getDay(); // 0 = Sun
        const daysInMonth = Array.from({ length: totalDaysInMonth }, (_, i) => i + 1);
        const monthPrefix = `${calYear}-${String(calMonth + 1).padStart(2, '0')}`;

        const getDayAttendanceInfo = (dayNum: number) => {
          const mmdd = `${String(calMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
          const dateStr = `${monthPrefix}-${String(dayNum).padStart(2, '0')}`;
          const dayOfWeek = new Date(calYear, calMonth, dayNum).getDay();

          // 1. Check Official Company Holiday or Annual Holiday
          const hol = holidays.find((h) => h.date === dateStr || h.date.slice(5) === mmdd);
          const annualHol = ANNUAL_HOLIDAYS[mmdd];
          if (hol || annualHol) {
            const hName = hol?.name || annualHol?.name || 'Holiday';
            const hType = hol?.type || annualHol?.type || 'Holiday';
            return {
              dateStr,
              status: 'Holiday',
              shortCode: 'HOL',
              dotColor: 'bg-[#4E1617]',
              badgeClass: 'bg-[#4E1617] text-white',
              cellBg: 'bg-[#4E1617]/10 border-[#4E1617]/30',
              timeText: hName,
              subText: `Official Holiday (${hType})`,
            };
          }

          // 2. Check Employee Leave (single or multi-day range)
          const lv = leaves.find(
            (l) =>
              l.employeeId === currentUser.employeeId &&
              dateStr >= l.startDate &&
              dateStr <= l.endDate
          );
          if (lv) {
            return {
              dateStr,
              status: 'Leave',
              shortCode: 'LV',
              dotColor: 'bg-amber-600',
              badgeClass: 'bg-amber-600 text-white',
              cellBg: 'bg-amber-50/80 border-amber-300',
              timeText: `${lv.leaveType} Leave (${lv.days}d)`,
              subText: `${lv.reason} · ${lv.status}`,
            };
          }

          // 3. Check Actual Attendance Record
          const att = scopedAttendance.find((a) => a.date === dateStr);
          if (att) {
            if (att.status === 'ABSENT') {
              return {
                dateStr,
                status: 'Absent',
                shortCode: 'ABS',
                dotColor: 'bg-red-600',
                badgeClass: 'bg-red-600 text-white',
                cellBg: 'bg-red-50/80 border-red-200',
                timeText: 'No Check-In',
                subText: att.notes || 'Unscheduled absence',
              };
            }
            if (att.status === 'ON_LEAVE') {
              return {
                dateStr,
                status: 'Leave',
                shortCode: 'LV',
                dotColor: 'bg-amber-600',
                badgeClass: 'bg-amber-600 text-white',
                cellBg: 'bg-amber-50/80 border-amber-300',
                timeText: 'Approved Leave',
                subText: att.notes || 'On Leave',
              };
            }
            if (att.status === 'LATE' || att.lateByMinutes > 0) {
              return {
                dateStr,
                status: 'Late',
                shortCode: 'LATE',
                dotColor: 'bg-[#4E1617]',
                badgeClass: 'bg-[#4E1617] text-white',
                cellBg: 'bg-[#4E1617]/5 border-[#4E1617]/30',
                timeText: `${att.punchIn || '09:48'} – ${att.punchOut || '18:35'}`,
                subText: `${att.workHours || att.totalHours || 8.8}h · Late +${att.lateByMinutes}m`,
              };
            }
            return {
              dateStr,
              status: 'Present',
              shortCode: 'PR',
              dotColor: 'bg-[#164C38]',
              badgeClass: 'bg-[#164C38] text-white',
              cellBg: 'bg-[#164C38]/10 border-[#164C38]/30',
              timeText: `${att.punchIn || '09:30'} – ${att.punchOut || '18:30'}`,
              subText: `${att.workHours || att.totalHours || 9.0}h · On Time`,
            };
          }

          // 4. Weekly Off (Sunday)
          if (dayOfWeek === 0) {
            return {
              dateStr,
              status: 'Weekly Off',
              shortCode: 'OFF',
              dotColor: 'bg-[#525854]',
              badgeClass: 'bg-[#CBCBCB] text-[#141A17]',
              cellBg: 'bg-[#F2F2F2]/70 border-[#CBCBCB]',
              timeText: 'Sunday Weekly Off',
              subText: 'Standard weekly rest day',
            };
          }

          // 5. Past dates vs Future dates relative to Oct 6, 2026
          const isPastOrToday =
            calYear < CURRENT_YEAR ||
            (calYear === CURRENT_YEAR && calMonth < CURRENT_MONTH) ||
            (calYear === CURRENT_YEAR && calMonth === CURRENT_MONTH && dayNum <= CURRENT_DAY);

          if (isPastOrToday) {
            // Deterministic realistic history for past months/days
            if (dayNum === 5 || dayNum === 19) {
              return {
                dateStr,
                status: 'Late',
                shortCode: 'LATE',
                dotColor: 'bg-[#4E1617]',
                badgeClass: 'bg-[#4E1617] text-white',
                cellBg: 'bg-[#4E1617]/5 border-[#4E1617]/30',
                timeText: '09:46 – 18:35',
                subText: '8.8h · Late +16m',
              };
            }
            if (dayNum === 12 && calMonth !== CURRENT_MONTH) {
              return {
                dateStr,
                status: 'Leave',
                shortCode: 'LV',
                dotColor: 'bg-amber-600',
                badgeClass: 'bg-amber-600 text-white',
                cellBg: 'bg-amber-50/80 border-amber-300',
                timeText: 'Casual Leave (1d)',
                subText: 'Approved Personal Leave',
              };
            }
            if (dayNum === 23 && calMonth !== CURRENT_MONTH) {
              return {
                dateStr,
                status: 'Absent',
                shortCode: 'ABS',
                dotColor: 'bg-red-600',
                badgeClass: 'bg-red-600 text-white',
                cellBg: 'bg-red-50/80 border-red-200',
                timeText: 'No Check-In',
                subText: 'Unscheduled absence',
              };
            }
            return {
              dateStr,
              status: 'Present',
              shortCode: 'PR',
              dotColor: 'bg-[#164C38]',
              badgeClass: 'bg-[#164C38] text-white',
              cellBg: 'bg-[#164C38]/10 border-[#164C38]/30',
              timeText: '09:28 – 18:30',
              subText: '9.0h · On Time',
            };
          }

          // Future Working Date
          return {
            dateStr,
            status: 'Upcoming',
            shortCode: 'SCH',
            dotColor: 'bg-[#CBCBCB]',
            badgeClass: 'bg-[#F2F2F2] text-[#525854]',
            cellBg: 'bg-white border-[#CBCBCB]',
            timeText: `${companyTiming.workingStartTime} – ${companyTiming.workingEndTime}`,
            subText: 'Scheduled Shift',
          };
        };

        const safeSelectedDay = Math.min(selectedCalDay, totalDaysInMonth);
        const selectedDayDetail = getDayAttendanceInfo(safeSelectedDay);
        const allMonthDaysInfo = daysInMonth.map((d) => getDayAttendanceInfo(d));

        const monthSummary = {
          present: allMonthDaysInfo.filter((d) => d.status === 'Present').length,
          late: allMonthDaysInfo.filter((d) => d.status === 'Late').length,
          leave: allMonthDaysInfo.filter((d) => d.status === 'Leave').length,
          absent: allMonthDaysInfo.filter((d) => d.status === 'Absent').length,
          holiday: allMonthDaysInfo.filter((d) => d.status === 'Holiday').length,
        };

        return (
          <div className="space-y-4">
            <div className="bg-white border border-[#CBCBCB] rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
              {/* Mobile-First Month & Year Navigation Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-[#CBCBCB]">
                <div className="flex items-center justify-between sm:justify-start gap-2">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="w-10 h-10 rounded-xl bg-[#F2F2F2] hover:bg-[#CBCBCB]/60 border border-[#CBCBCB] flex items-center justify-center text-[#141A17] cursor-pointer shrink-0"
                    aria-label="Previous Month"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="flex items-center gap-1.5 flex-1 sm:flex-initial justify-center">
                    <select
                      value={calMonth}
                      onChange={(e) => {
                        setCalMonth(Number(e.target.value));
                        setSelectedCalDay(1);
                      }}
                      aria-label="Select Month"
                      className="px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-xl text-xs sm:text-sm font-bold text-[#141A17] cursor-pointer focus:outline-none focus:border-[#164C38]"
                    >
                      {MONTH_NAMES.map((mName, idx) => (
                        <option key={mName} value={idx}>
                          {mName}
                        </option>
                      ))}
                    </select>

                    <select
                      value={calYear}
                      onChange={(e) => {
                        setCalYear(Number(e.target.value));
                        setSelectedCalDay(1);
                      }}
                      aria-label="Select Year"
                      className="px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-xl text-xs sm:text-sm font-mono font-bold text-[#164C38] cursor-pointer focus:outline-none focus:border-[#164C38]"
                    >
                      {YEAR_OPTIONS.map((yr) => (
                        <option key={yr} value={yr}>
                          {yr}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="w-10 h-10 rounded-xl bg-[#F2F2F2] hover:bg-[#CBCBCB]/60 border border-[#CBCBCB] flex items-center justify-center text-[#141A17] cursor-pointer shrink-0"
                    aria-label="Next Month"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2">
                  <span className="text-xs font-semibold text-[#525854]">
                    {MONTH_NAMES[calMonth]} {calYear}
                  </span>
                  <button
                    type="button"
                    onClick={handleJumpToToday}
                    className="px-3.5 py-2 rounded-xl bg-[#164C38] hover:bg-[#0F3627] text-[#F2F2F2] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Today</span>
                  </button>
                </div>
              </div>

              {/* Monthly Status Summary Strip — Stacked Vertically on Mobile, 5-Col on Tablet/Desktop */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 sm:gap-2.5 text-center">
                <div className="px-3.5 py-2.5 sm:p-2 rounded-xl bg-[#164C38]/10 border border-[#164C38]/25 flex sm:block items-center justify-between">
                  <span className="text-xs sm:text-[10px] font-bold text-[#164C38] block">
                    Present Days
                  </span>
                  <span className="text-sm font-mono font-bold text-[#164C38]">
                    {monthSummary.present}
                  </span>
                </div>
                <div className="px-3.5 py-2.5 sm:p-2 rounded-xl bg-[#4E1617]/10 border border-[#4E1617]/25 flex sm:block items-center justify-between">
                  <span className="text-xs sm:text-[10px] font-bold text-[#4E1617] block">
                    Late Coming
                  </span>
                  <span className="text-sm font-mono font-bold text-[#4E1617]">
                    {monthSummary.late}
                  </span>
                </div>
                <div className="px-3.5 py-2.5 sm:p-2 rounded-xl bg-amber-50 border border-amber-300 flex sm:block items-center justify-between">
                  <span className="text-xs sm:text-[10px] font-bold text-amber-800 block">
                    Leave Taken
                  </span>
                  <span className="text-sm font-mono font-bold text-amber-800">
                    {monthSummary.leave}
                  </span>
                </div>
                <div className="px-3.5 py-2.5 sm:p-2 rounded-xl bg-red-50 border border-red-200 flex sm:block items-center justify-between">
                  <span className="text-xs sm:text-[10px] font-bold text-red-700 block">
                    Absent Days
                  </span>
                  <span className="text-sm font-mono font-bold text-red-700">
                    {monthSummary.absent}
                  </span>
                </div>
                <div className="px-3.5 py-2.5 sm:p-2 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB] flex sm:block items-center justify-between">
                  <span className="text-xs sm:text-[10px] font-bold text-[#525854] block">
                    Holidays
                  </span>
                  <span className="text-sm font-mono font-bold text-[#141A17]">
                    {monthSummary.holiday}
                  </span>
                </div>
              </div>

              {/* 7-Day Weekday Header */}
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

              {/* Mobile-Friendly Calendar Grid (No Horizontal Overflow) */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {Array.from({ length: startOffset }).map((_, idx) => (
                  <div
                    key={`empty-${idx}`}
                    className="min-h-[56px] sm:min-h-[82px] rounded-xl bg-[#F2F2F2]/40 border border-dashed border-[#CBCBCB]/60"
                  />
                ))}

                {daysInMonth.map((dayNum) => {
                  const info = getDayAttendanceInfo(dayNum);
                  const isSelected = safeSelectedDay === dayNum;
                  const isTodayDate =
                    calYear === CURRENT_YEAR &&
                    calMonth === CURRENT_MONTH &&
                    dayNum === CURRENT_DAY;

                  return (
                    <button
                      key={dayNum}
                      type="button"
                      onClick={() => setSelectedCalDay(dayNum)}
                      className={`min-h-[56px] sm:min-h-[82px] p-1.5 sm:p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        info.cellBg
                      } ${
                        isSelected
                          ? 'ring-2 ring-[#164C38] border-[#164C38] shadow-xs'
                          : 'hover:border-[#164C38]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-0.5 w-full">
                        <span
                          className={`text-xs font-mono font-bold ${
                            isTodayDate
                              ? 'w-5 h-5 rounded-full bg-[#164C38] text-white flex items-center justify-center text-[10px]'
                              : 'text-[#141A17]'
                          }`}
                        >
                          {dayNum}
                        </span>
                        <span
                          className={`w-2 h-2 rounded-full sm:hidden shrink-0 ${info.dotColor}`}
                        />
                        <span
                          className={`hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${info.badgeClass}`}
                        >
                          {info.status}
                        </span>
                      </div>

                      {/* Compact Mobile Label + Full Desktop Label */}
                      <div className="mt-1">
                        <div className="sm:hidden text-[9px] font-bold text-[#141A17] truncate">
                          {info.status === 'Weekly Off' ? 'Off' : info.status}
                        </div>
                        <div className="hidden sm:block text-[10px] font-mono font-semibold text-[#141A17] truncate">
                          {info.timeText}
                        </div>
                        <div className="hidden md:block text-[10px] text-[#525854] truncate">
                          {info.subText}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Selected Date Detail Card (Tapping any day shows full details here) */}
              <div className="p-4 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs sm:text-sm font-mono font-bold text-[#141A17]">
                      {selectedDayDetail.dateStr}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase ${selectedDayDetail.badgeClass}`}
                    >
                      {selectedDayDetail.status}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-[#141A17]">
                    {selectedDayDetail.timeText}
                  </p>
                  <p className="text-xs text-[#525854]">{selectedDayDetail.subText}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEmpViewMode('normal')}
                  className="w-full sm:w-auto min-h-[40px] px-3.5 py-2 rounded-xl bg-white border border-[#CBCBCB] text-xs font-bold text-[#164C38] hover:border-[#164C38] cursor-pointer text-center"
                >
                  Switch to Normal View →
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ===================================================================== */}
      {/* FULL ATTENDANCE LEDGER & REGULARIZATION (NORMAL VIEW)                 */}
      {/* ===================================================================== */}
      {((isEmployeeRole && empViewMode === 'normal') || (!isEmployeeRole && activeView === 'ledger')) && (
        <div className="space-y-4">
          {/* Filter & Sort Controls — Vertically Stacked on Mobile */}
          <div className="bg-white border border-[#CBCBCB] rounded-2xl p-4 space-y-3.5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-1.5 bg-[#F2F2F2] p-1.5 rounded-xl w-full lg:w-auto">
                {['ALL', 'PRESENT', 'LATE', 'HALF_DAY', 'ON_LEAVE', 'ABSENT'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st)}
                    className={`w-full sm:w-auto px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-between sm:justify-center ${
                      filterStatus === st
                        ? 'bg-[#164C38] text-white'
                        : 'bg-white sm:bg-transparent text-[#525854] hover:text-[#141A17]'
                    }`}
                  >
                    <span>{st.replace('_', ' ')}</span>
                    {filterStatus === st && (
                      <span className="w-2 h-2 rounded-full bg-emerald-300 sm:hidden" />
                    )}
                  </button>
                ))}
              </div>

              <div className="relative w-full lg:max-w-md">
                <Search className="w-3.5 h-3.5 text-[#525854] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    isEmployeeRole
                      ? 'Search date or shift note...'
                      : 'Search employee name, code, department, or shift note...'
                  }
                  className="w-full pl-8 pr-3 py-2.5 bg-[#F2F2F2] border border-[#CBCBCB] rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-2.5 pt-2.5 border-t border-[#CBCBCB]/60">
              <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full sm:w-auto px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-xl text-xs font-mono"
                />
                {!isEmployeeRole && (
                  <>
                    <select
                      value={filterEmployeeId}
                      onChange={(e) => setFilterEmployeeId(e.target.value)}
                      className="w-full sm:w-auto px-2.5 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs font-medium"
                    >
                      <option value="ALL">All Employees</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.fullName}
                        </option>
                      ))}
                    </select>
                    <select
                      value={filterDept}
                      onChange={(e) => setFilterDept(e.target.value)}
                      className="w-full sm:w-auto px-2.5 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs font-medium"
                    >
                      {departments.map((d: string) => (
                        <option key={d} value={d}>
                          {d === 'ALL' ? 'All Departments' : d}
                        </option>
                      ))}
                    </select>
                    <select
                      value={filterManager}
                      onChange={(e) => setFilterManager(e.target.value)}
                      className="w-full sm:w-auto px-2.5 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs font-medium"
                    >
                      {managersList.map((m: string) => (
                        <option key={m} value={m}>
                          {m === 'ALL' ? 'All Managers' : `Mgr: ${m}`}
                        </option>
                      ))}
                    </select>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <ArrowUpDown className="w-3.5 h-3.5 text-[#525854] shrink-0" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="flex-1 sm:flex-initial px-2.5 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-xl text-xs font-medium"
                >
                  <option value="date">Sort: Date</option>
                  {!isEmployeeRole && <option value="employeeName">Sort: Employee Name</option>}
                  <option value="totalHours">Sort: Logged Hours</option>
                  <option value="lateByMinutes">Sort: Late Minutes</option>
                </select>
                <button
                  onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
                  className="px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-xl text-xs font-mono font-bold cursor-pointer shrink-0"
                >
                  {sortOrder === 'asc' ? '↑ ASC' : '↓ DESC'}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile-First Card List for Employee Role (Vertically Stacked Fields) */}
          {isEmployeeRole && (
            <div className="space-y-3 md:hidden">
              {scopedAttendance.map((record) => (
                <div
                  key={record.id}
                  onClick={() => setSelectedRecord(record)}
                  className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 space-y-3 shadow-2xs hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-neutral-100 dark:border-neutral-800">
                    <span className="text-sm font-mono font-bold text-neutral-900 dark:text-neutral-100">
                      {record.date}
                    </span>
                    <StatusBadge status={record.status} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div className="flex sm:block items-center justify-between p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-neutral-500">Punches</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-200 dark:bg-neutral-700 font-bold">
                          {(record.totalPunchIns ?? (record.punchIn ? 1 : 0))} IN · {(record.totalPunchOuts ?? (record.punchOut ? 1 : 0))} OUT
                        </span>
                      </div>
                      <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100 mt-1 block">
                        {record.firstInTime || record.punchIn || '—'} → {record.lastOutTime || record.punchOut || '—'}
                      </span>
                    </div>
                    <div className="flex sm:block items-center justify-between p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60">
                      <span className="text-[11px] text-neutral-500">Worked Hours</span>
                      <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">
                        {record.totalHours ? `${record.totalHours}h` : '—'}
                      </span>
                    </div>
                    <div className="flex sm:block items-center justify-between p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60">
                      <span className="text-[11px] text-neutral-500">Late / Deduction</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`font-mono font-semibold ${
                            record.lateByMinutes > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-500'
                          }`}
                        >
                          {record.lateByMinutes > 0 ? `+${record.lateByMinutes}m` : '0m'}
                        </span>
                        {record.lateSalaryDeduction && record.lateSalaryDeduction > 0 ? (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                            -₹{record.lateSalaryDeduction.toFixed(2)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {record.employeeId === currentUser.employeeId &&
                    (record.status === 'LATE' || record.status === 'HALF_DAY') &&
                    record.regularizationStatus === 'NONE' && (
                      <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setRegularizeModalId(record.id)}
                          className="w-full min-h-[40px] px-3.5 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold"
                        >
                          Request Regularization
                        </button>
                      </div>
                    )}
                </div>
              ))}
            </div>
          )}

          {/* Attendance Ledger Table (Desktop & Admin/HR/Manager) */}
          <div
            className={`bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden ${
              isEmployeeRole ? 'hidden md:block' : ''
            }`}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 text-[10px] font-bold uppercase tracking-wider text-neutral-500 bg-neutral-50 dark:bg-neutral-900/80">
                    <th className="py-3.5 px-5">Employee</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">First In / Last Out (Punches)</th>
                    <th className="py-3.5 px-4">Worked Hours</th>
                    <th className="py-3.5 px-4">Late / Deduction</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200/60 dark:divide-neutral-800/60 text-xs">
                  {scopedAttendance.map((record) => (
                    <tr
                      key={record.id}
                      onClick={() => setSelectedRecord(record)}
                      className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <AvatarInitials name={record.employeeName} size="sm" />
                          <div>
                            <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                              {record.employeeName}
                            </div>
                            <div className="text-[11px] text-neutral-500">
                              {record.employeeCode} • {record.department}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-neutral-900 dark:text-neutral-100">{record.date}</td>
                      <td className="py-3.5 px-4 font-mono">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-neutral-900 dark:text-neutral-100">
                            {record.firstInTime || record.punchIn || '—'}
                          </span>
                          <span className="text-neutral-400">→</span>
                          <span className="font-bold text-neutral-900 dark:text-neutral-100">
                            {record.lastOutTime || record.punchOut || '—'}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 font-semibold">
                            {(record.totalPunchIns ?? (record.punchIn ? 1 : 0))} IN · {(record.totalPunchOuts ?? (record.punchOut ? 1 : 0))} OUT
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                        {record.totalHours ? `${record.totalHours}h` : '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          {record.lateByMinutes > 0 ? (
                            <div className="font-mono font-semibold text-amber-600 dark:text-amber-400">
                              +{record.lateByMinutes}m
                            </div>
                          ) : (
                            <div className="font-mono text-neutral-500">0m</div>
                          )}
                          {record.lateSalaryDeduction && record.lateSalaryDeduction > 0 ? (
                            <div className="text-[10px] font-mono font-bold text-rose-600 dark:text-rose-400">
                              -₹{record.lateSalaryDeduction.toFixed(2)}
                            </div>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <StatusBadge status={record.status} />
                          {(record.isManualCorrection || record.source === 'MANUAL') && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60">
                              Manual
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {record.employeeId === currentUser.employeeId &&
                            (record.status === 'LATE' || record.status === 'HALF_DAY') &&
                            record.regularizationStatus === 'NONE' && (
                              <button
                                onClick={() => setRegularizeModalId(record.id)}
                                className="px-2.5 py-1 rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-[11px] font-semibold text-neutral-900 dark:text-neutral-100"
                              >
                                Regularize
                              </button>
                            )}
                          {isHRAdmin && (
                            <ActionMenu
                              items={[
                                {
                                  label: 'Correct Attendance',
                                  icon: <Edit3 className="w-3.5 h-3.5" />,
                                  onClick: () => openCorrectRecordModal(record),
                                },
                                {
                                  label: 'Delete Record',
                                  icon: <Trash2 className="w-3.5 h-3.5" />,
                                  variant: 'danger',
                                  onClick: () => setDeletingRecord(record),
                                },
                              ]}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Regularize Modal */}
      <ModalShell
        isOpen={!!regularizeModalId}
        onClose={() => setRegularizeModalId(null)}
        title="Request Attendance Regularization"
        subtitle="Submit a reason for late arrival or missed punch"
      >
        <form onSubmit={handleRegularizeSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#141A17] mb-1">
              Reason for Regularization
            </label>
            <textarea
              rows={3}
              required
              value={regReason}
              onChange={(e) => setRegReason(e.target.value)}
              placeholder="Explain shift timing variance..."
              className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-xl text-xs"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRegularizeModalId(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#525854]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#164C38] text-[#F2F2F2]"
            >
              Submit Request
            </button>
          </div>
        </form>
      </ModalShell>

      {/* Manual Attendance & Correction Modal (Requirement 2) */}
      <ModalShell
        isOpen={showLogModal}
        onClose={() => {
          setShowLogModal(false);
          setEditingRecord(null);
        }}
        title={
          editingRecord
            ? `Correct Attendance — ${editingRecord.employeeName}`
            : 'Add Manual Attendance'
        }
        subtitle="Authorized HR & Admin attendance entry for missed punches, device, or network issues"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleLogAttendance} className="space-y-4">
          {/* Previous Values Banner if Correcting Existing Record */}
          {editingRecord && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-amber-900 dark:text-amber-200">
                <span>Existing Attendance Record</span>
                <span className="font-mono text-[11px]">{editingRecord.date}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-neutral-600 dark:text-neutral-400">
                <div>
                  <span className="block text-[10px] uppercase font-bold text-neutral-400">Previous In</span>
                  <span>{editingRecord.punchIn || editingRecord.checkIn || '--'}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-neutral-400">Previous Out</span>
                  <span>{editingRecord.punchOut || editingRecord.checkOut || '--'}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-neutral-400">Previous Status</span>
                  <span>{editingRecord.status}</span>
                </div>
              </div>
            </div>
          )}

          {/* Searchable Employee Selector */}
          <div>
            <label className="block text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mb-1">
              Select Employee <span className="text-[#FF3B30]">*</span>
            </label>
            <div className="space-y-1.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Filter employees by name, ID, or department..."
                  value={empSearchTerm}
                  onChange={(e) => setEmpSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs"
                />
              </div>
              <select
                required
                value={logEmpId}
                onChange={(e) => setLogEmpId(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-medium text-neutral-900 dark:text-neutral-100"
              >
                {employees
                  .filter((emp) => {
                    if (!empSearchTerm.trim()) return true;
                    const q = empSearchTerm.toLowerCase();
                    return (
                      emp.fullName.toLowerCase().includes(q) ||
                      emp.id.toLowerCase().includes(q) ||
                      emp.department.toLowerCase().includes(q)
                    );
                  })
                  .map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.id}) — {emp.department}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Shift Date */}
          <div>
            <label className="block text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mb-1">
              Attendance Date <span className="text-[#FF3B30]">*</span>
            </label>
            <input
              type="date"
              required
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-mono"
            />
          </div>

          {/* Time Pickers for Punch In and Punch Out */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TimePicker
              label="Correct Punch In"
              required
              value={logPunchIn}
              onChange={setLogPunchIn}
            />
            <TimePicker
              label="Correct Punch Out"
              value={logPunchOut}
              onChange={setLogPunchOut}
            />
          </div>

          {/* Status Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mb-1">
                Attendance Status
              </label>
              <select
                value={logStatus}
                onChange={(e) => setLogStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-medium"
              >
                <option value="PRESENT">Present (Full Day)</option>
                <option value="LATE">Late Arrival</option>
                <option value="HALF_DAY">Half Day</option>
                <option value="ON_LEAVE">On Leave</option>
                <option value="ABSENT">Absent</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mb-1">
                Late Minutes
              </label>
              <input
                type="number"
                min={0}
                value={logLateMinutes}
                onChange={(e) => setLogLateMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-mono"
              />
            </div>
          </div>

          {/* Mandatory Reason Note */}
          <div>
            <label className="block text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mb-1">
              Manual Correction Reason <span className="text-[#FF3B30]">* (Mandatory for audit trail)</span>
            </label>
            <textarea
              required
              rows={3}
              value={logReason}
              onChange={(e) => setLogReason(e.target.value)}
              placeholder="Explain why this attendance record is being manually added or adjusted (e.g., Biometric device sensor offline, Network outage, Field duty dispatch)..."
              className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white"
            />
          </div>

          {/* Modal Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={() => {
                setShowLogModal(false);
                setEditingRecord(null);
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-[#164C38] text-white hover:bg-[#0F3627] transition-colors cursor-pointer shadow-xs"
            >
              {editingRecord ? 'Save Attendance Correction' : 'Save Manual Attendance'}
            </button>
          </div>
        </form>
      </ModalShell>

      <ConfirmDialog
        isOpen={!!deletingRecord}
        onClose={() => setDeletingRecord(null)}
        onConfirm={() => {
          if (deletingRecord) deleteAttendanceRecord(deletingRecord.id);
        }}
        title="Delete Attendance Record"
        message={`Are you sure you want to delete the attendance log for ${deletingRecord?.employeeName}?`}
        confirmLabel="Delete Log"
      />

      {/* Dedicated Attendance Record Detail Drawer (Summary First, Details on Click) */}
      <SlideOverDrawer
        open={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        title="Attendance Record Details"
        subtitle={selectedRecord ? `${selectedRecord.employeeName} · ${selectedRecord.date}` : undefined}
      >
        {selectedRecord && (
          <div className="space-y-6">
            {/* Header Identity Card */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60">
              <div className="flex items-center gap-3">
                <AvatarInitials name={selectedRecord.employeeName} size="md" />
                <div>
                  <div className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                    {selectedRecord.employeeName}
                  </div>
                  <div className="text-xs text-neutral-500 font-mono">
                    {selectedRecord.employeeCode} · {selectedRecord.department}
                  </div>
                </div>
              </div>
              <StatusBadge status={selectedRecord.status} />
            </div>

            {/* Time Card Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700/60">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block">
                  Punch In
                </span>
                <span className="text-lg font-mono font-bold text-neutral-900 dark:text-neutral-100 mt-1 block">
                  {selectedRecord.punchIn || 'Not Clocked In'}
                </span>
                <span className="text-[11px] text-neutral-500 mt-0.5 block">
                  Official shift starts 09:30
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700/60">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block">
                  Punch Out
                </span>
                <span className="text-lg font-mono font-bold text-neutral-900 dark:text-neutral-100 mt-1 block">
                  {selectedRecord.punchOut || 'Active / In Progress'}
                </span>
                <span className="text-[11px] text-neutral-500 mt-0.5 block">
                  Official shift ends 18:30
                </span>
              </div>
            </div>

            {/* Multiple Punch Audit Timeline & First/Last Highlights */}
            {(() => {
              const selectedEmp = employees.find((e) => e.id === selectedRecord.employeeId);
              const selectedNorm = getNormalizedPunchesForRecord(selectedRecord, selectedEmp?.id);
              const lateCalc = calculateLateDeduction(selectedEmp, selectedRecord, companyTiming as any);

              return (
                <div className="space-y-4">
                  {/* Punch Summary Bar */}
                  <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 space-y-3">
                    <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-700/60 pb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                        Chronological Punch Log
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                          Total IN: {selectedNorm.totalPunchIns}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300">
                          Total OUT: {selectedNorm.totalPunchOuts}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-neutral-500 block">Valid Punch Pairs</span>
                        <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">
                          {selectedNorm.validPairsCount} completed
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-500 block">Calculated Work Duration</span>
                        <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">
                          {selectedNorm.workedHours} hrs ({selectedNorm.workedMinutes} mins)
                        </span>
                      </div>
                    </div>

                    {selectedNorm.hasUnmatchedPunch && (
                      <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 text-[11px] text-rose-800 dark:text-rose-300 font-medium">
                        ⚠️ Exception: {selectedNorm.unmatchedNote}
                      </div>
                    )}
                  </div>

                  {/* Punch Events Timeline */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
                      Individual Punch Events
                    </span>

                    {selectedNorm.punches.map((punch, idx) => {
                      if (punch.isFirstIn) {
                        return (
                          <div
                            key={punch.id || idx}
                            className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500 dark:border-emerald-500 flex items-center justify-between shadow-xs transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                                IN
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-200">
                                    FIRST IN — Arrival Time
                                  </span>
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100 font-semibold font-mono">
                                    {punch.source || 'Biometric'}
                                  </span>
                                </div>
                                <div className="text-xl font-mono font-black text-emerald-950 dark:text-emerald-100 mt-0.5">
                                  {punch.time}
                                </div>
                              </div>
                            </div>
                            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-white dark:bg-neutral-900 px-2.5 py-1 rounded-md border border-emerald-300 dark:border-emerald-800">
                              Official Arrival
                            </span>
                          </div>
                        );
                      }

                      if (punch.isLastOut) {
                        return (
                          <div
                            key={punch.id || idx}
                            className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border-2 border-blue-500 dark:border-blue-500 flex items-center justify-between shadow-xs transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                                OUT
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-200">
                                    LAST OUT — Final Departure
                                  </span>
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-100 font-semibold font-mono">
                                    {punch.source || 'Biometric'}
                                  </span>
                                </div>
                                <div className="text-xl font-mono font-black text-blue-950 dark:text-blue-100 mt-0.5">
                                  {punch.time}
                                </div>
                              </div>
                            </div>
                            <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 bg-white dark:bg-neutral-900 px-2.5 py-1 rounded-md border border-blue-300 dark:border-blue-800">
                              Final Departure
                            </span>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={punch.id || idx}
                          className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-7 h-7 rounded-md flex items-center justify-center font-mono font-bold text-xs ${
                                punch.type === 'IN'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                                  : 'bg-neutral-200 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-300'
                              }`}
                            >
                              {punch.type}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                                  Intermediate {punch.type}
                                </span>
                                <span className="text-[10px] text-neutral-500 font-mono">
                                  {punch.source || 'Biometric'}
                                </span>
                              </div>
                              <div className="font-mono font-bold text-sm text-neutral-900 dark:text-neutral-100">
                                {punch.time}
                              </div>
                            </div>
                          </div>
                          {punch.isManualCorrection && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 font-medium">
                              Manual: {punch.manualCorrectionReason || 'Corrected'}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Salary-Based Per-Minute Late Deduction Breakdown (Requirement 5) */}
                  <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 space-y-3">
                    <div className="flex items-center justify-between border-b border-amber-200/80 dark:border-amber-800/60 pb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                        Salary-Based Late Deduction
                      </span>
                      <span className="text-xs font-mono font-bold text-amber-900 dark:text-amber-200">
                        ₹{lateCalc.deductionAmount.toFixed(2)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                      <div>
                        <span className="text-[10px] font-sans text-neutral-500 block">Monthly Salary</span>
                        <span className="font-bold text-neutral-900 dark:text-neutral-100">
                          ₹{lateCalc.monthlySalary.toLocaleString()}
                        </span>
                        <span className="text-[9px] font-sans text-neutral-400 block">{lateCalc.salaryBasis}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-sans text-neutral-500 block">Daily Salary (÷ 26)</span>
                        <span className="font-bold text-neutral-900 dark:text-neutral-100">
                          ₹{lateCalc.dailySalary.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-sans text-neutral-500 block">Per-Min Rate (÷ 480)</span>
                        <span className="font-bold text-neutral-900 dark:text-neutral-100">
                          ₹{lateCalc.perMinuteRate.toFixed(4)}/m
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-sans text-neutral-500 block">Arrival / Shift</span>
                        <span className="font-bold text-neutral-900 dark:text-neutral-100">
                          {lateCalc.actualFirstIn} vs {lateCalc.scheduledShiftStart}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-sans text-neutral-500 block">Chargeable Late</span>
                        <span className="font-bold text-amber-700 dark:text-amber-300">
                          {lateCalc.chargeableLateMinutes} mins
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-sans text-neutral-500 block">Adjustment Status</span>
                        <span className="text-[10px] font-bold text-neutral-700 dark:text-neutral-300 block truncate">
                          {lateCalc.status}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-amber-900 dark:text-amber-300 bg-amber-100/60 dark:bg-amber-900/30 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800/60 font-mono">
                      Formula: ₹{lateCalc.monthlySalary} ÷ 26 ÷ 480 × {lateCalc.chargeableLateMinutes}m = ₹{lateCalc.deductionAmount.toFixed(2)}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Regularization Section */}
            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-3">
              <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Regularization Status
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                  {selectedRecord.regularizationStatus || 'NONE'}
                </span>
              </div>
              {selectedRecord.regularizationReason && (
                <div className="text-xs text-neutral-700 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700/60">
                  <span className="font-semibold block text-[11px] text-neutral-500 mb-1">Employee Reason:</span>
                  {selectedRecord.regularizationReason}
                </div>
              )}
              {selectedRecord.employeeId === currentUser.employeeId &&
                (selectedRecord.status === 'LATE' || selectedRecord.status === 'HALF_DAY') &&
                (!selectedRecord.regularizationStatus || selectedRecord.regularizationStatus === 'NONE') && (
                  <button
                    type="button"
                    onClick={() => {
                      setRegularizeModalId(selectedRecord.id);
                      setSelectedRecord(null);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Request Attendance Regularization
                  </button>
              )}
            </div>

            {/* Admin/HR Actions */}
            {isHRAdmin && (
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const rec = selectedRecord;
                    setSelectedRecord(null);
                    openEditRecord(rec);
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-bold text-neutral-900 dark:text-neutral-100 transition-colors cursor-pointer"
                >
                  Edit Shift Record
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const rec = selectedRecord;
                    setSelectedRecord(null);
                    setDeletingRecord(rec);
                  }}
                  className="py-2.5 px-4 rounded-xl border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs font-bold transition-colors cursor-pointer"
                >
                  Delete
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setSelectedRecord(null)}
              className="w-full py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        )}
      </SlideOverDrawer>
    </div>
  );
}
