import React, { useState, useMemo } from 'react';
import {
  Clock,
  Calendar,
  Users,
  ArrowUpRight,
  Sliders,
  UserPlus,
  Search,
  Building2,
  PartyPopper,
  BarChart3,
  LogIn,
  LogOut,
  Timer,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Award,
} from 'lucide-react';
import { useHRMS } from '../../context/HRMSContext';
import {
  StatusBadge,
  AvatarInitials,
  ModalShell,
} from '../ui/EnterpriseComponents';
import { LeaveType } from '../../types/hrms';
import { ApprovalRequestsModule } from './ApprovalRequestsModule';

type AnalyticsComboId =
  | 'attendance_hours'
  | 'attendance_late'
  | 'leave_attendance'
  | 'late_hours'
  | 'considerations_attendance';

type DateRangePreset = 'weekly' | 'monthly' | 'custom';
type ChartVisualType = 'bar' | 'line';

const ANALYTICS_COMBOS: {
  id: AnalyticsComboId;
  label: string;
  primaryLabel: string;
  secondaryLabel: string;
  primaryUnit: string;
  secondaryUnit: string;
}[] = [
  {
    id: 'attendance_hours',
    label: 'Attendance + Working Hours',
    primaryLabel: 'Attendance Days',
    secondaryLabel: 'Working Hours',
    primaryUnit: 'd',
    secondaryUnit: 'h',
  },
  {
    id: 'attendance_late',
    label: 'Attendance + Late',
    primaryLabel: 'Present Days',
    secondaryLabel: 'Late Arrivals',
    primaryUnit: 'd',
    secondaryUnit: '',
  },
  {
    id: 'leave_attendance',
    label: 'Leave + Attendance',
    primaryLabel: 'Present Days',
    secondaryLabel: 'Leave Days',
    primaryUnit: 'd',
    secondaryUnit: 'd',
  },
  {
    id: 'late_hours',
    label: 'Late + Working Hours',
    primaryLabel: 'Working Hours',
    secondaryLabel: 'Late Minutes',
    primaryUnit: 'h',
    secondaryUnit: 'm',
  },
  {
    id: 'considerations_attendance',
    label: 'Considerations + Attendance',
    primaryLabel: 'Present Days',
    secondaryLabel: 'Considerations',
    primaryUnit: 'd',
    secondaryUnit: '',
  },
];

export function DashboardModule() {
  const {
    currentUser,
    employees,
    attendance,
    leaves,
    considerations,
    companyTiming,
    holidays,
    isClockedIn,
    clockInTime,
    toggleClockIn,
    liveWorkingDuration,
    checkInToday,
    checkOutToday,
    approveLeave,
    rejectLeave,
    applyLeave,
    setActiveModule,
    navigateTo,
    openEmployeeProfile,
  } = useHRMS();

  const isEmployeeRole =
    currentUser.role === 'EMPLOYEE' || currentUser.role === 'MANAGER';
  const isManagerRole = currentUser.role === 'MANAGER';
  const isHRAdmin = currentUser.role === 'HR' || currentUser.role === 'ADMIN';
  const isManager = false;

  // Employee-side Punch State Enhancement (tracks punch-out timestamp & live duration)
  const [lastPunchOutTime, setLastPunchOutTime] = useState<string | null>(null);

  const handleEmployeePunchToggle = () => {
    if (isClockedIn) {
      checkOutToday();
      const now = new Date();
      setLastPunchOutTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    } else {
      checkInToday();
      setLastPunchOutTime(null);
    }
  };

  // Employee Combined Personal Analytics State
  const [selectedCombo, setSelectedCombo] = useState<AnalyticsComboId>('attendance_hours');
  const [datePreset, setDatePreset] = useState<DateRangePreset>('monthly');
  const [customStartDate, setCustomStartDate] = useState('2026-10-01');
  const [customEndDate, setCustomEndDate] = useState('2026-10-07');
  const [chartType, setChartType] = useState<ChartVisualType>('bar');

  // Admin/HR/Manager Dashboard States
  const [activeChart, setActiveChart] = useState<'attendance' | 'departments' | 'leave'>('attendance');
  const [filterDept, setFilterDept] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'fullName' | 'department' | 'role'>('fullName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Quick HR Apply Leave on Behalf Modal
  const [showLeaveOnBehalfModal, setShowLeaveOnBehalfModal] = useState(false);
  const [targetEmpId, setTargetEmpId] = useState(employees[1]?.id || employees[0]?.id || 'EMP-1002');
  const [leaveType, setLeaveType] = useState<LeaveType>('CASUAL');
  const [startDate, setStartDate] = useState('2026-10-12');
  const [endDate, setEndDate] = useState('2026-10-12');
  const [days, setDays] = useState(1);
  const [halfDaySession, setHalfDaySession] = useState<'FULL_DAY' | 'FIRST_HALF' | 'SECOND_HALF'>('FULL_DAY');
  const [reason, setReason] = useState('');
  const [autoApprove, setAutoApprove] = useState(true);

  // Scoped personal data for Employee Dashboard
  const myEmployeeRecord = useMemo(
    () => employees.find((e) => e.id === currentUser.employeeId) || employees[0],
    [employees, currentUser.employeeId]
  );

  const myAttendance = useMemo(
    () => attendance.filter((a) => a.employeeId === currentUser.employeeId),
    [attendance, currentUser.employeeId]
  );

  const myLeaves = useMemo(
    () => leaves.filter((l) => l.employeeId === currentUser.employeeId),
    [leaves, currentUser.employeeId]
  );

  const myConsiderations = useMemo(
    () => considerations.filter((c) => c.employeeId === currentUser.employeeId),
    [considerations, currentUser.employeeId]
  );

  // Manager Assigned Team & Two-Stage Approval Queue
  const assignedTeamMembers = useMemo(
    () =>
      isManagerRole
        ? employees.filter(
            (e) =>
              e.managerId === currentUser.employeeId && e.id !== currentUser.employeeId
          )
        : [],
    [employees, currentUser.employeeId, isManagerRole]
  );

  const pendingTeamLeaves = useMemo(
    () =>
      isManagerRole
        ? leaves.filter(
            (l) =>
              l.employeeId !== currentUser.employeeId &&
              l.status === 'PENDING_MANAGER'
          )
        : [],
    [leaves, currentUser.employeeId, isManagerRole]
  );

  const pendingTeamConsiderations = useMemo(
    () =>
      isManagerRole
        ? considerations.filter(
            (c) =>
              c.employeeId !== currentUser.employeeId &&
              c.status === 'PENDING_MANAGER'
          )
        : [],
    [considerations, currentUser.employeeId, isManagerRole]
  );

  // Today's attendance entry for the logged-in employee
  const todayAttendance = useMemo(() => {
    const sorted = [...myAttendance].sort((a, b) => b.date.localeCompare(a.date));
    return sorted[0] || null;
  }, [myAttendance]);

  const punchInDisplay = isClockedIn
    ? clockInTime || todayAttendance?.punchIn || '09:30 AM'
    : todayAttendance?.punchIn || '09:30 AM';

  const punchOutDisplay = isClockedIn
    ? 'Active Shift'
    : lastPunchOutTime || todayAttendance?.punchOut || '06:30 PM';

  const workingDurationDisplay = useMemo(() => {
    if (isClockedIn) {
      return liveWorkingDuration || '00:00:00';
    }
    const hrs = todayAttendance?.workHours || todayAttendance?.totalHours || 9.0;
    const wholeHrs = Math.floor(hrs);
    const mins = Math.round((hrs - wholeHrs) * 60);
    const secs = Math.max(0, Math.round(((hrs - wholeHrs) * 60 - mins) * 60));
    return `${String(wholeHrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, [isClockedIn, liveWorkingDuration, todayAttendance]);

  // Build Unified Personal Analytics Dataset based on Date Preset & Selected Combo
  const personalAnalyticsData = useMemo(() => {
    const scale = datePreset === 'weekly' ? 1 : datePreset === 'monthly' ? 4 : 2;

    const presentCount = Math.max(
      1,
      myAttendance.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length * scale
    );
    const lateCount =
      myAttendance.filter((a) => a.status === 'LATE' || a.lateByMinutes > 0).length * scale;
    const totalLateMins =
      myAttendance.reduce((acc, a) => acc + (a.lateByMinutes || 0), 0) * scale;
    const leaveDaysCount = myLeaves.reduce((acc, l) => acc + l.days, 0);
    const considerationsCount = myConsiderations.length;
    const totalWorkingHours = Math.round(
      myAttendance.reduce((acc, a) => acc + (a.workHours || a.totalHours || 8.8), 0) * scale
    );

    const seriesLabels =
      datePreset === 'weekly'
        ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        : datePreset === 'monthly'
        ? ['Week 1', 'Week 2', 'Week 3', 'Week 4']
        : ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5'];

    const points = seriesLabels.map((label, idx) => {
      const isWeekly = datePreset === 'weekly';
      const attVal = isWeekly ? 1 : 5 + (idx % 2);
      const hrsVal = isWeekly ? (idx === 5 ? 4.5 : 8.8 + (idx % 2) * 0.4) : 44 + idx * 2;
      const lateVal = idx === 1 || idx === 3 ? 1 : 0;
      const lateMinsVal = idx === 1 ? 14 : idx === 3 ? 9 : 0;
      const leaveVal = idx === 2 ? 1 : 0;
      const consVal = idx === 1 ? 1 : 0;

      switch (selectedCombo) {
        case 'attendance_hours':
          return { label, primary: attVal, secondary: Number(hrsVal.toFixed(1)) };
        case 'attendance_late':
          return { label, primary: attVal, secondary: lateVal };
        case 'leave_attendance':
          return { label, primary: attVal, secondary: leaveVal };
        case 'late_hours':
          return { label, primary: Number(hrsVal.toFixed(1)), secondary: lateMinsVal };
        case 'considerations_attendance':
          return { label, primary: attVal, secondary: consVal };
      }
    });

    // Donut segments based on selected combination
    let donutSegments: { label: string; value: number; color: string }[] = [];
    if (selectedCombo === 'attendance_hours') {
      donutSegments = [
        { label: 'Regular Hours', value: Math.max(8, totalWorkingHours - 4), color: '#164C38' },
        { label: 'Extra / Peak Hours', value: 4, color: '#4E1617' },
        { label: 'Break / Grace', value: 2, color: '#CBCBCB' },
      ];
    } else if (selectedCombo === 'attendance_late') {
      donutSegments = [
        { label: 'On-Time Present', value: Math.max(1, presentCount - lateCount), color: '#164C38' },
        { label: 'Late Arrivals', value: Math.max(1, lateCount), color: '#4E1617' },
      ];
    } else if (selectedCombo === 'leave_attendance') {
      donutSegments = [
        { label: 'Present Days', value: presentCount, color: '#164C38' },
        { label: 'Leave Taken', value: Math.max(1, leaveDaysCount), color: '#4E1617' },
        { label: 'Remaining Quota', value: 18, color: '#CBCBCB' },
      ];
    } else if (selectedCombo === 'late_hours') {
      donutSegments = [
        { label: 'Productive Hours', value: totalWorkingHours, color: '#164C38' },
        { label: 'Late Mins Impact', value: Math.max(1, Math.round(totalLateMins / 10)), color: '#4E1617' },
      ];
    } else {
      donutSegments = [
        { label: 'Verified Attendance', value: presentCount, color: '#164C38' },
        { label: 'Considerations Filed', value: Math.max(1, considerationsCount), color: '#4E1617' },
      ];
    }

    return {
      presentCount,
      lateCount,
      totalLateMins,
      leaveDaysCount,
      considerationsCount,
      totalWorkingHours,
      points,
      donutSegments,
    };
  }, [myAttendance, myLeaves, myConsiderations, datePreset, selectedCombo]);

  const activeComboConfig = useMemo(
    () => ANALYTICS_COMBOS.find((c) => c.id === selectedCombo) || ANALYTICS_COMBOS[0],
    [selectedCombo]
  );

  // ============================================================================
  // EMPLOYEE-ONLY DASHBOARD UI (SIMPLE, PREMIUM, PERSONAL-FOCUSED)
  // Structure:
  // 1. Employee Header / Big Card (Name + Designation + Avatar ONLY)
  // 2. Punch In / Punch Out (Status, Punch-in, Punch-out, Working Duration)
  // 3. Combined Personal Analytics (Attendance, Leave, Late, Considerations, Working Hours)
  // 4. Existing Relevant Personal Information (Personal Leave & Upcoming Holidays)
  // ============================================================================
  if (isEmployeeRole) {
    const maxPrimary = Math.max(...personalAnalyticsData.points.map((p) => p.primary), 1);
    const maxSecondary = Math.max(...personalAnalyticsData.points.map((p) => p.secondary), 1);
    const donutTotal = personalAnalyticsData.donutSegments.reduce((s, d) => s + d.value, 0) || 1;

    return (
      <div className="max-w-5xl mx-auto space-y-6 pb-8">
        {/* 1. EMPLOYEE HEADER / BIG CARD (Only Name, Designation, Optional Small Avatar) */}
        <section className="bg-white border border-[#CBCBCB] rounded-2xl p-6 sm:p-8 shadow-2xs flex items-center gap-5">
          <AvatarInitials name={currentUser.fullName} size="lg" />
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#141A17] tracking-tight truncate">
              {currentUser.fullName}
            </h1>
            <p className="text-sm sm:text-base font-medium text-[#525854] mt-1 truncate">
              {currentUser.designation}
            </p>
          </div>
        </section>

        {/* 2. PUNCH IN / PUNCH OUT SECTION */}
        <section className="bg-neutral-900 dark:bg-neutral-950 text-white rounded-2xl p-5 sm:p-6 border border-neutral-800 shadow-xs">
          <div className="space-y-5">
            {/* Top Bar: Current Punch Status + Distinct Punch In & Punch Out Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-neutral-800">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      isClockedIn ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-500'
                    }`}
                  />
                  <span className="text-xs uppercase tracking-wider font-semibold text-neutral-400">
                    Current Punch Status
                  </span>
                </div>
                <div className="text-lg sm:text-xl font-bold text-white leading-snug">
                  {isClockedIn ? 'Punched In — Shift Active' : 'Punched Out — Shift Completed'}
                </div>
              </div>

              {/* Distinct Punch In and Punch Out Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full md:w-auto shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (!isClockedIn) handleEmployeePunchToggle();
                  }}
                  disabled={isClockedIn}
                  className={`w-full sm:w-auto px-5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                    !isClockedIn
                      ? 'bg-white hover:bg-neutral-100 text-black shadow-sm cursor-pointer'
                      : 'bg-neutral-800/80 text-neutral-500 border border-neutral-700/50 cursor-not-allowed'
                  }`}
                >
                  <LogIn className="w-4 h-4 shrink-0" />
                  <span>Punch In</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (isClockedIn) handleEmployeePunchToggle();
                  }}
                  disabled={!isClockedIn}
                  className={`w-full sm:w-auto px-5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                    isClockedIn
                      ? 'bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 shadow-sm cursor-pointer'
                      : 'bg-neutral-800/80 text-neutral-500 border border-neutral-700/50 cursor-not-allowed'
                  }`}
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span>Punch Out</span>
                </button>
              </div>
            </div>

            {/* Bottom 3-Card Row: Punch-In Time, Punch-Out Time, Working Duration */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Punch-In Time */}
              <div className="bg-neutral-800/50 dark:bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5 flex items-center justify-between gap-4 min-h-[88px]">
                <div className="space-y-1.5 min-w-0">
                  <span className="text-xs font-medium text-neutral-400 block leading-normal">
                    Punch-In Time
                  </span>
                  <span className="text-lg sm:text-xl font-mono font-bold text-white block leading-tight">
                    {punchInDisplay}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-neutral-300 shrink-0">
                  <LogIn className="w-4 h-4" />
                </div>
              </div>

              {/* Card 2: Punch-Out Time */}
              <div className="bg-neutral-800/50 dark:bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5 flex items-center justify-between gap-4 min-h-[88px]">
                <div className="space-y-1.5 min-w-0">
                  <span className="text-xs font-medium text-neutral-400 block leading-normal">
                    Punch-Out Time
                  </span>
                  <span className="text-lg sm:text-xl font-mono font-bold text-white block leading-tight">
                    {punchOutDisplay}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-neutral-300 shrink-0">
                  <LogOut className="w-4 h-4" />
                </div>
              </div>

              {/* Card 3: Working Duration */}
              <div className="bg-neutral-800/50 dark:bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5 flex items-center justify-between gap-4 min-h-[88px]">
                <div className="space-y-1.5 min-w-0">
                  <span className="text-xs font-medium text-neutral-400 block leading-normal">
                    Working Duration
                  </span>
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-lg sm:text-xl font-mono font-bold text-white leading-tight">
                      {workingDurationDisplay}
                    </span>
                    <span className="text-xs font-medium text-neutral-400">
                      {isClockedIn ? '(Active Shift)' : '(Today Total)'}
                    </span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-neutral-300 shrink-0">
                  <Timer className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. COMBINED PERSONAL ANALYTICS (UNIFIED SECTION) */}
        <section className="bg-white border border-[#CBCBCB] rounded-2xl p-5 sm:p-6 space-y-5 sm:space-y-6 shadow-2xs">
          {/* Header & Date Filter Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#CBCBCB]">
            <div>
              <h2 className="text-base font-bold text-[#141A17]">
                Personal Analytics Overview
              </h2>
              <p className="text-xs text-[#525854] mt-0.5">
                Unified insights across your attendance, working hours, leave, late coming, and considerations
              </p>
            </div>

            {/* Date Filter: Weekly | Monthly | Custom Range + Chart Type Switcher (Vertically Responsive on Mobile) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
              <div className="grid grid-cols-3 sm:flex items-center gap-1 p-1 bg-[#F2F2F2] border border-[#CBCBCB] rounded-xl sm:rounded-lg w-full sm:w-auto">
                {(
                  [
                    { id: 'weekly', label: 'Weekly' },
                    { id: 'monthly', label: 'Monthly' },
                    { id: 'custom', label: 'Custom Range' },
                  ] as const
                ).map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setDatePreset(preset.id)}
                    className={`px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-lg sm:rounded-md text-xs font-semibold transition-colors cursor-pointer text-center ${
                      datePreset === preset.id
                        ? 'bg-[#164C38] text-[#F2F2F2]'
                        : 'text-[#525854] hover:text-[#141A17]'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:flex items-center gap-1 p-1 bg-[#F2F2F2] border border-[#CBCBCB] rounded-xl sm:rounded-lg w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setChartType('bar')}
                  className={`px-3 py-2 sm:py-1.5 rounded-lg sm:rounded-md text-xs font-semibold transition-colors cursor-pointer text-center ${
                    chartType === 'bar'
                      ? 'bg-white text-[#141A17] shadow-2xs'
                      : 'text-[#525854] hover:text-[#141A17]'
                  }`}
                >
                  Bar Chart
                </button>
                <button
                  type="button"
                  onClick={() => setChartType('line')}
                  className={`px-3 py-2 sm:py-1.5 rounded-lg sm:rounded-md text-xs font-semibold transition-colors cursor-pointer text-center ${
                    chartType === 'line'
                      ? 'bg-white text-[#141A17] shadow-2xs'
                      : 'text-[#525854] hover:text-[#141A17]'
                  }`}
                >
                  Line Chart
                </button>
              </div>
            </div>
          </div>

          {/* Custom Date Range Picker (Visible when Custom Range is active — Stacked Vertically on Mobile) */}
          {datePreset === 'custom' && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 p-3.5 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB] text-xs">
              <span className="font-semibold text-[#141A17]">Custom Period:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg font-mono text-xs"
              />
              <span className="text-[#525854] text-center sm:text-left">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg font-mono text-xs"
              />
            </div>
          )}

          {/* Unified Summary Counters — Vertically Stacked on Mobile, Grid on Tablet/Desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="p-3.5 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB] flex sm:block items-center justify-between">
              <div className="flex items-center justify-between gap-2 text-[#525854]">
                <CheckCircle2 className="w-4 h-4 text-[#164C38] sm:order-2" />
                <span className="text-xs font-semibold sm:text-[11px] sm:font-medium text-[#141A17] sm:text-[#525854]">
                  Attendance
                </span>
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono text-[#164C38] sm:mt-1">
                {personalAnalyticsData.presentCount} Days
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB] flex sm:block items-center justify-between">
              <div className="flex items-center justify-between gap-2 text-[#525854]">
                <Clock className="w-4 h-4 text-[#164C38] sm:order-2" />
                <span className="text-xs font-semibold sm:text-[11px] sm:font-medium text-[#141A17] sm:text-[#525854]">
                  Working Hours
                </span>
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono text-[#141A17] sm:mt-1">
                {personalAnalyticsData.totalWorkingHours}h
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB] flex sm:block items-center justify-between">
              <div className="flex items-center justify-between gap-2 text-[#525854]">
                <Calendar className="w-4 h-4 text-[#4E1617] sm:order-2" />
                <span className="text-xs font-semibold sm:text-[11px] sm:font-medium text-[#141A17] sm:text-[#525854]">
                  Leave Taken
                </span>
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono text-[#141A17] sm:mt-1">
                {personalAnalyticsData.leaveDaysCount} Days
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB] flex sm:block items-center justify-between">
              <div className="flex items-center justify-between gap-2 text-[#525854]">
                <AlertCircle className="w-4 h-4 text-[#4E1617] sm:order-2" />
                <span className="text-xs font-semibold sm:text-[11px] sm:font-medium text-[#141A17] sm:text-[#525854]">
                  Late Coming
                </span>
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono text-[#4E1617] sm:mt-1">
                {personalAnalyticsData.lateCount} ({personalAnalyticsData.totalLateMins}m)
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB] flex sm:block items-center justify-between sm:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between gap-2 text-[#525854]">
                <Award className="w-4 h-4 text-[#164C38] sm:order-2" />
                <span className="text-xs font-semibold sm:text-[11px] sm:font-medium text-[#141A17] sm:text-[#525854]">
                  Considerations
                </span>
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono text-[#141A17] sm:mt-1">
                {personalAnalyticsData.considerationsCount}
              </div>
            </div>
          </div>

          {/* Combination Selector Options — Stacked Vertically on Mobile, Wrapped on Tablet/Desktop */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 pt-1">
            {ANALYTICS_COMBOS.map((combo) => (
              <button
                key={combo.id}
                type="button"
                onClick={() => setSelectedCombo(combo.id)}
                className={`w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-between sm:justify-center gap-2 ${
                  selectedCombo === combo.id
                    ? 'bg-[#164C38] text-[#F2F2F2] shadow-2xs'
                    : 'bg-[#F2F2F2] text-[#525854] hover:text-[#141A17] border border-[#CBCBCB]'
                }`}
              >
                <span>{combo.label}</span>
                {selectedCombo === combo.id && (
                  <span className="w-2 h-2 rounded-full bg-emerald-300 sm:hidden" />
                )}
              </button>
            ))}
          </div>

          {/* Charts Area: Bar/Line Trend Chart + Donut Breakdown Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
            {/* Left 8 Cols: Bar or Line Chart */}
            <div className="lg:col-span-8 bg-[#F2F2F2] border border-[#CBCBCB] rounded-xl p-4 sm:p-5 flex flex-col justify-between">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-xs font-bold text-[#141A17] uppercase tracking-wider">
                    {activeComboConfig.label} ({datePreset.toUpperCase()})
                  </h3>
                  <p className="text-[11px] text-[#525854]">
                    Comparing {activeComboConfig.primaryLabel} vs {activeComboConfig.secondaryLabel}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-[#141A17]">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#164C38]" />
                    {activeComboConfig.primaryLabel}
                  </span>
                  <span className="flex items-center gap-1.5 font-medium text-[#141A17]">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#4E1617]" />
                    {activeComboConfig.secondaryLabel}
                  </span>
                </div>
              </div>

              {chartType === 'bar' ? (
                <div className="flex items-end justify-between gap-1.5 sm:gap-3 h-44 pt-4 px-1 sm:px-2">
                  {personalAnalyticsData.points.map((pt) => {
                    const pHeight = Math.max(12, Math.round((pt.primary / maxPrimary) * 120));
                    const sHeight = Math.max(8, Math.round((pt.secondary / maxSecondary) * 120));
                    return (
                      <div key={pt.label} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                        <div className="flex items-end gap-1 sm:gap-1.5 h-32">
                          <div
                            className="w-3 sm:w-5 bg-[#164C38] rounded-t-md transition-all"
                            style={{ height: `${pHeight}px` }}
                            title={`${activeComboConfig.primaryLabel}: ${pt.primary}${activeComboConfig.primaryUnit}`}
                          />
                          <div
                            className="w-3 sm:w-5 bg-[#4E1617] rounded-t-md transition-all"
                            style={{ height: `${sHeight}px` }}
                            title={`${activeComboConfig.secondaryLabel}: ${pt.secondary}${activeComboConfig.secondaryUnit}`}
                          />
                        </div>
                        <div className="text-[10px] sm:text-[11px] font-mono text-[#525854] font-semibold truncate">
                          {pt.label}
                        </div>
                        <div className="text-[9px] sm:text-[10px] font-mono text-[#141A17] truncate">
                          {pt.primary}
                          {activeComboConfig.primaryUnit}/{pt.secondary}
                          {activeComboConfig.secondaryUnit}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-44 flex flex-col justify-between pt-2">
                  <svg viewBox="0 0 420 120" className="w-full h-32 overflow-visible">
                    {/* Horizontal reference lines */}
                    <line x1="20" y1="20" x2="400" y2="20" stroke="#CBCBCB" strokeDasharray="3 3" />
                    <line x1="20" y1="60" x2="400" y2="60" stroke="#CBCBCB" strokeDasharray="3 3" />
                    <line x1="20" y1="100" x2="400" y2="100" stroke="#CBCBCB" />

                    {/* Primary Polyline */}
                    <polyline
                      fill="none"
                      stroke="#164C38"
                      strokeWidth="3"
                      points={personalAnalyticsData.points
                        .map((pt, idx) => {
                          const x =
                            30 +
                            (idx * 360) / Math.max(1, personalAnalyticsData.points.length - 1);
                          const y = 100 - (pt.primary / maxPrimary) * 75;
                          return `${x},${y}`;
                        })
                        .join(' ')}
                    />

                    {/* Secondary Polyline */}
                    <polyline
                      fill="none"
                      stroke="#4E1617"
                      strokeWidth="2.5"
                      strokeDasharray="4 2"
                      points={personalAnalyticsData.points
                        .map((pt, idx) => {
                          const x =
                            30 +
                            (idx * 360) / Math.max(1, personalAnalyticsData.points.length - 1);
                          const y = 100 - (pt.secondary / maxSecondary) * 75;
                          return `${x},${y}`;
                        })
                        .join(' ')}
                    />

                    {/* Data Dots */}
                    {personalAnalyticsData.points.map((pt, idx) => {
                      const x =
                        30 +
                        (idx * 360) / Math.max(1, personalAnalyticsData.points.length - 1);
                      const y1 = 100 - (pt.primary / maxPrimary) * 75;
                      const y2 = 100 - (pt.secondary / maxSecondary) * 75;
                      return (
                        <g key={pt.label}>
                          <circle cx={x} cy={y1} r="4" fill="#164C38" />
                          <circle cx={x} cy={y2} r="3.5" fill="#4E1617" />
                        </g>
                      );
                    })}
                  </svg>

                  <div className="flex justify-between px-4 text-[11px] font-mono text-[#525854]">
                    {personalAnalyticsData.points.map((pt) => (
                      <span key={pt.label}>
                        {pt.label}: {pt.primary}
                        {activeComboConfig.primaryUnit}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right 4 Cols: Donut Chart Distribution */}
            <div className="lg:col-span-4 bg-[#F2F2F2] border border-[#CBCBCB] rounded-xl p-5 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-[#141A17] uppercase tracking-wider">
                  Ratio Breakdown
                </h3>
                <p className="text-[11px] text-[#525854]">
                  Proportional split for selected filter
                </p>
              </div>

              <div className="flex items-center justify-center my-3">
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <svg viewBox="0 0 36 36" className="w-32 h-32 -rotate-90">
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="transparent"
                      stroke="#CBCBCB"
                      strokeWidth="4.5"
                    />
                    {(() => {
                      let cumulativePercent = 0;
                      return personalAnalyticsData.donutSegments.map((seg) => {
                        const pct = (seg.value / donutTotal) * 100;
                        const dashArray = `${pct} ${100 - pct}`;
                        const dashOffset = 100 - cumulativePercent;
                        cumulativePercent += pct;
                        return (
                          <circle
                            key={seg.label}
                            cx="18"
                            cy="18"
                            r="14"
                            fill="transparent"
                            stroke={seg.color}
                            strokeWidth="4.5"
                            strokeDasharray={dashArray}
                            strokeDashoffset={dashOffset}
                            pathLength="100"
                          />
                        );
                      });
                    })()}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-sm font-bold font-mono text-[#141A17]">
                      {personalAnalyticsData.presentCount}d
                    </span>
                    <span className="text-[10px] text-[#525854]">Logged</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                {personalAnalyticsData.donutSegments.map((seg) => (
                  <div
                    key={seg.label}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="flex items-center gap-2 text-[#141A17]">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: seg.color }}
                      />
                      {seg.label}
                    </span>
                    <span className="font-mono font-semibold text-[#141A17]">
                      {seg.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* MANAGER CENTRALIZED APPROVAL REQUESTS SECTION */}
        {isManagerRole && (
          <div className="pt-2">
            <ApprovalRequestsModule />
          </div>
        )}

        {/* 4. RELEVANT PERSONAL INFORMATION (My Recent Leave, Considerations & Upcoming Holidays) */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Personal Leave Summary */}
          <div className="bg-white border border-[#CBCBCB] rounded-2xl p-6 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-[#CBCBCB] pb-3">
              <div>
                <h2 className="text-sm font-bold text-[#141A17]">My Leave</h2>
                <p className="text-xs text-[#525854]">
                  Your personal leave applications and status
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModule('leave')}
                className="text-xs font-semibold text-[#0051d5] hover:underline cursor-pointer"
              >
                View Leave →
              </button>
            </div>

            {myLeaves.length === 0 ? (
              <p className="text-xs text-[#525854] py-6 text-center">
                You have no recent leave applications.
              </p>
            ) : (
              <div className="space-y-2.5">
                {myLeaves.slice(0, 3).map((lv) => (
                  <div
                    key={lv.id}
                    className="p-3.5 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB] flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-xs font-bold text-[#141A17]">
                        {lv.leaveType} Leave ({lv.days}d)
                      </div>
                      <div className="text-[11px] font-mono text-[#525854] mt-0.5">
                        {lv.startDate} → {lv.endDate}
                      </div>
                    </div>
                    <StatusBadge status={lv.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Personal Considerations Summary */}
          <div className="bg-white border border-[#CBCBCB] rounded-2xl p-6 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-[#CBCBCB] pb-3">
              <div>
                <h2 className="text-sm font-bold text-[#141A17]">My Considerations</h2>
                <p className="text-xs text-[#525854]">
                  Attendance waivers and penalty relief requests
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModule('considerations')}
                className="text-xs font-semibold text-[#0051d5] hover:underline cursor-pointer"
              >
                Open Considerations →
              </button>
            </div>

            {myConsiderations.length === 0 ? (
              <div className="py-6 text-center space-y-2">
                <p className="text-xs text-[#525854]">
                  You have not submitted any consideration requests yet.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveModule('considerations')}
                  className="px-3 py-1.5 rounded-lg bg-[#0051d5] text-white text-xs font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  Submit Consideration
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {myConsiderations.slice(0, 3).map((con) => (
                  <div
                    key={con.id}
                    onClick={() => setActiveModule('considerations')}
                    className="p-3 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB] flex items-center justify-between gap-3 cursor-pointer hover:border-[#0051d5] transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#141A17] truncate">
                        {con.customType || con.type}
                      </div>
                      <div className="text-[11px] font-mono text-[#525854] mt-0.5">
                        {con.date}
                      </div>
                    </div>
                    <StatusBadge status={con.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Official Holidays */}
          <div className="bg-white border border-[#CBCBCB] rounded-2xl p-6 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-[#CBCBCB] pb-3">
              <div>
                <h2 className="text-sm font-bold text-[#141A17]">
                  Upcoming Holidays
                </h2>
                <p className="text-xs text-[#525854]">
                  Scheduled company holidays and observances
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModule('calendar')}
                className="text-xs font-semibold text-[#0051d5] hover:underline cursor-pointer"
              >
                Open Calendar →
              </button>
            </div>

            <div className="space-y-2.5">
              {holidays.slice(0, 3).map((h) => (
                <div
                  key={h.id}
                  className="p-3.5 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB] flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-[#141A17]">{h.name}</div>
                    <div className="text-[11px] text-[#525854]">{h.day}</div>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#164C38]">
                    {h.date}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    );
  }

  // ============================================================================
  // ADMIN / HR / MANAGER DASHBOARD (EXISTING ORGANIZATION & TEAM MANAGEMENT)
  // ============================================================================
  const departments: string[] = ['ALL', ...Array.from(new Set<string>(employees.map((e) => e.department)))];

  const roleScopedEmployees = isHRAdmin
    ? employees
    : isManager
    ? employees.filter(
        (e) => e.department === currentUser.department || e.id === currentUser.employeeId
      )
    : employees.filter((e) => e.id === currentUser.employeeId);

  const filteredRoster = roleScopedEmployees
    .filter((e) => {
      const matchDept = filterDept === 'ALL' || e.department === filterDept;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        e.fullName.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q) ||
        e.designation.toLowerCase().includes(q);
      return matchDept && matchSearch;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'fullName') cmp = a.fullName.localeCompare(b.fullName);
      else if (sortBy === 'department') cmp = a.department.localeCompare(b.department);
      else cmp = a.role.localeCompare(b.role);
      return sortOrder === 'asc' ? cmp : -cmp;
    });

  const pendingLeaves = leaves.filter(
    (l) => l.status === 'PENDING_MANAGER' || l.status === 'PENDING_HR'
  );

  const presentTodayCount = attendance.filter(
    (a) => a.status === 'PRESENT' || a.status === 'LATE'
  ).length;
  const lateTodayCount = attendance.filter((a) => a.status === 'LATE').length;
  const onLeaveTodayCount = attendance.filter((a) => a.status === 'ON_LEAVE').length;

  const deptBreakdown = (() => {
    const map: Record<string, number> = {};
    employees.forEach((e) => {
      map[e.department] = (map[e.department] || 0) + 1;
    });
    return Object.entries(map).map(([dept, count]) => ({
      dept,
      count,
      pct: Math.round((count / Math.max(1, employees.length)) * 100),
    }));
  })();

  const handleQuickLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    const isHalf = halfDaySession !== 'FULL_DAY';
    applyLeave({
      targetEmployeeId: isHRAdmin ? targetEmpId : currentUser.employeeId,
      leaveType,
      startDate,
      endDate: isHalf ? startDate : endDate,
      days: isHalf ? 0.5 : Number(days),
      halfDaySession,
      reason,
      isHalfDay: isHalf,
      autoApprove: isHRAdmin ? autoApprove : false,
    });
    setShowLeaveOnBehalfModal(false);
    setReason('');
  };

  return (
    <div className="space-y-6">
      {/* Clean, Minimal Executive Welcome Panel (Requirement 5) */}
      <div className="bg-neutral-900 dark:bg-neutral-950 text-white rounded-2xl p-6 shadow-sm border border-neutral-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400">
            <span>Argos Watch Precision Manufacturing Pvt. Ltd.</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-emerald-400 font-semibold uppercase">
              {currentUser.role === 'ADMIN' ? 'SYSTEM ADMIN WORKSPACE' : 'HR MANAGEMENT WORKSPACE'}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Welcome, {currentUser.fullName}
          </h1>
          <p className="text-xs text-neutral-400">
            {currentUser.designation} · {currentUser.department}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="px-3.5 py-2 rounded-xl bg-neutral-800/70 border border-neutral-800">
            <span className="text-[10px] uppercase tracking-wider text-neutral-400 block">
              Active Workforce
            </span>
            <span className="font-mono font-bold text-white">
              {roleScopedEmployees.length} Employees
            </span>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-neutral-800/70 border border-neutral-800">
            <span className="text-[10px] uppercase tracking-wider text-neutral-400 block">
              Today Attendance
            </span>
            <span className="font-mono font-bold text-emerald-400">
              {presentTodayCount} Present · {lateTodayCount} Late
            </span>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-neutral-800/70 border border-neutral-800">
            <span className="text-[10px] uppercase tracking-wider text-neutral-400 block">
              Pending Approvals
            </span>
            <span className="font-mono font-bold text-amber-300">
              {pendingLeaves.length} Leave Requests
            </span>
          </div>
        </div>
      </div>

      {/* Key Metric Strip (5 Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div
          onClick={() => setActiveModule('people')}
          className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 rounded-2xl p-4 cursor-pointer transition-all shadow-2xs group"
        >
          <div className="flex items-center justify-between text-neutral-500 mb-1.5">
            <span className="text-xs font-semibold">
              {isHRAdmin ? 'Total Employees' : 'Team Size'}
            </span>
            <Users className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
          </div>
          <div className="text-2xl font-bold font-mono text-neutral-900 dark:text-neutral-100">
            {roleScopedEmployees.length}
          </div>
          <div className="text-[11px] text-neutral-500 mt-1 flex items-center gap-1">
            Active Roster <ArrowUpRight className="w-3 h-3 text-neutral-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </div>

        <div
          onClick={() => setActiveModule('attendance')}
          className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 rounded-2xl p-4 cursor-pointer transition-all shadow-2xs"
        >
          <div className="flex items-center justify-between text-neutral-500 mb-1.5">
            <span className="text-xs font-semibold">Present / Late Logs</span>
            <Clock className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
          </div>
          <div className="text-2xl font-bold font-mono text-neutral-900 dark:text-neutral-100">
            {presentTodayCount}{' '}
            <span className="text-xs font-normal text-amber-600 dark:text-amber-400">
              ({lateTodayCount} Late)
            </span>
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">
            {onLeaveTodayCount} on leave · View Today Status
          </div>
        </div>

        <div
          onClick={() => setActiveModule('leave')}
          className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 rounded-2xl p-4 cursor-pointer transition-all shadow-2xs"
        >
          <div className="flex items-center justify-between text-neutral-500 mb-1.5">
            <span className="text-xs font-semibold">Pending Leaves</span>
            <Calendar className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
          </div>
          <div className="text-2xl font-bold font-mono text-neutral-900 dark:text-neutral-100">
            {pendingLeaves.length}
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">
            Click to review or file on behalf
          </div>
        </div>

        <div
          onClick={() => setActiveModule('considerations')}
          className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 rounded-2xl p-4 cursor-pointer transition-all shadow-2xs"
        >
          <div className="flex items-center justify-between text-neutral-500 mb-1.5">
            <span className="text-xs font-semibold">Pending Considerations</span>
            <BarChart3 className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
          </div>
          <div className="text-2xl font-bold font-mono text-neutral-900 dark:text-neutral-100">
            {considerations.filter((c) => c.status === 'UNDER_REVIEW' || c.status === 'PENDING_MANAGER' || c.status === 'PENDING_HR').length}
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">
            Waivers & corrections pending
          </div>
        </div>

        <div
          onClick={() => setActiveModule('calendar')}
          className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 rounded-2xl p-4 cursor-pointer transition-all shadow-2xs"
        >
          <div className="flex items-center justify-between text-neutral-500 mb-1.5">
            <span className="text-xs font-semibold">Official Holidays</span>
            <PartyPopper className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
          </div>
          <div className="text-2xl font-bold font-mono text-neutral-900 dark:text-neutral-100">
            {holidays.length}
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">
            {companyTiming.workingStartTime}–{companyTiming.workingEndTime} Shift
          </div>
        </div>
      </div>

      {/* Interactive Analytics Charts */}
      <div className="bg-white border border-[#CBCBCB] rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#CBCBCB]">
          <div>
            <h2 className="text-sm font-bold text-[#164C38]">
              Workforce & Attendance Telemetry
            </h2>
            <p className="text-xs text-[#525854]">
              Click any bar or metric to open the detailed filtered report
            </p>
          </div>
          <div className="flex items-center gap-1 p-1 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg">
            {(
              [
                { id: 'attendance', label: 'Attendance & Late Trend' },
                { id: 'departments', label: 'Department Distribution' },
                { id: 'leave', label: 'Leave Utilization' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveChart(tab.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  activeChart === tab.id
                    ? 'bg-[#164C38] text-[#F2F2F2]'
                    : 'text-[#525854] hover:text-[#141A17]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeChart === 'departments' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
            {deptBreakdown.map((item) => (
              <button
                key={item.dept}
                type="button"
                onClick={() => setActiveModule('reports')}
                className="p-3.5 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB] hover:border-[#164C38] text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs font-bold text-[#141A17] mb-1.5">
                  <span className="truncate">{item.dept}</span>
                  <span className="font-mono text-[#164C38]">
                    {item.count} ({item.pct}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-[#CBCBCB] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#164C38] rounded-full"
                    style={{ width: `${Math.max(item.pct, 12)}%` }}
                  />
                </div>
              </button>
            ))}
          </div>
        )}

        {activeChart === 'attendance' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
            <button
              type="button"
              onClick={() => setActiveModule('reports')}
              className="p-4 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB] hover:border-[#164C38] text-left cursor-pointer"
            >
              <div className="text-xs text-[#525854]">On-Time Present Logs</div>
              <div className="text-xl font-bold font-mono text-[#164C38] mt-1">
                {attendance.filter((a) => a.status === 'PRESENT').length} Shifts
              </div>
              <div className="w-full h-2 bg-[#CBCBCB] rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-[#164C38] w-4/5" />
              </div>
            </button>
            <button
              type="button"
              onClick={() => setActiveModule('reports')}
              className="p-4 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB] hover:border-[#4E1617] text-left cursor-pointer"
            >
              <div className="text-xs text-[#525854]">Late Arrivals Recorded</div>
              <div className="text-xl font-bold font-mono text-[#4E1617] mt-1">
                {lateTodayCount} Shifts
              </div>
              <div className="w-full h-2 bg-[#CBCBCB] rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-[#4E1617] w-1/4" />
              </div>
            </button>
            <button
              type="button"
              onClick={() => setActiveModule('reports')}
              className="p-4 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB] hover:border-[#164C38] text-left cursor-pointer"
            >
              <div className="text-xs text-[#525854]">Approved Leaves / Half-Days</div>
              <div className="text-xl font-bold font-mono text-[#141A17] mt-1">
                {leaves.filter((l) => l.status === 'APPROVED').length} Requests
              </div>
              <div className="w-full h-2 bg-[#CBCBCB] rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-[#164C38] w-2/5" />
              </div>
            </button>
          </div>
        )}

        {activeChart === 'leave' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
            {(['CASUAL', 'SICK', 'EARNED'] as const).map((lt) => {
              const count = leaves.filter((l) => l.leaveType === lt).length;
              return (
                <button
                  key={lt}
                  type="button"
                  onClick={() => setActiveModule('leave')}
                  className="p-4 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB] hover:border-[#164C38] text-left cursor-pointer"
                >
                  <div className="text-xs font-semibold text-[#525854]">
                    {lt} LEAVE REQUESTS
                  </div>
                  <div className="text-xl font-bold font-mono text-[#164C38] mt-1">
                    {count} Filed
                  </div>
                  <div className="text-[11px] text-[#525854] mt-1">
                    Click to open Leave Ledger →
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Company Timings, Half-Day & Late Policy Snapshot */}
      <div className="bg-white border border-[#CBCBCB] rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#CBCBCB]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#164C38] text-[#F2F2F2] flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#164C38]">
                Argos Watch — Company Timings, Half-Day Slots & Policy Rules
              </h2>
              <p className="text-[11px] text-[#525854]">
                Live schedule & attendance rules enforced across all 6 departments
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveModule('company-info')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F2F2F2] hover:bg-[#CBCBCB]/40 text-[#4E1617] border border-[#CBCBCB] rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            {isHRAdmin
              ? 'Open HR Policy & Timing Control Center →'
              : 'View Full Company Rules & Holidays →'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
          <div className="p-3.5 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB]">
            <div className="text-xs font-semibold text-[#525854]">
              Full Working Shift
            </div>
            <div className="text-sm font-mono font-bold text-[#164C38] mt-1">
              {companyTiming.workingStartTime} – {companyTiming.workingEndTime}
            </div>
            <div className="text-[11px] text-[#525854] mt-1">
              {companyTiming.fullDayHours} Hours · Grace: +{companyTiming.gracePeriodMinutes} mins
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB]">
            <div className="text-xs font-semibold text-[#525854]">
              First Half / Second Half Timings
            </div>
            <div className="text-xs font-mono font-bold text-[#164C38] mt-1">
              1st: {companyTiming.firstHalfStart} – {companyTiming.firstHalfEnd}
            </div>
            <div className="text-xs font-mono font-bold text-[#4E1617] mt-0.5">
              2nd: {companyTiming.secondHalfStart} – {companyTiming.secondHalfEnd}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB]">
            <div className="text-xs font-semibold text-[#525854]">
              Late Arrival Policy Rule
            </div>
            <div className="text-sm font-mono font-bold text-[#4E1617] mt-1">
              {companyTiming.latePenaltyThresholdCount} Lates = {companyTiming.latePenaltyDeductionDays} Day Deduction
            </div>
            <div className="text-[11px] text-[#525854] mt-1">
              Editable anytime by HR & Admin
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB]">
            <div className="text-xs font-semibold text-[#525854]">
              Weekly Off & Saturday Rule
            </div>
            <div className="text-xs font-semibold text-[#164C38] mt-1">
              {companyTiming.weeklyOffDays}
            </div>
            <div className="text-[11px] text-[#525854] mt-0.5 line-clamp-1">
              {companyTiming.saturdayRule}
            </div>
          </div>
        </div>
      </div>

      {/* Argos Watch Team Roster with Filter & Sort */}
      <div className="bg-white border border-[#CBCBCB] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#CBCBCB] bg-[#F2F2F2] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-[#164C38]">
              Argos Watch Official Team Roster ({filteredRoster.length})
            </h2>
            <p className="text-[11px] text-[#525854]">
              Filter by department, search by name/email, sort roster, or file leave on behalf of any member
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#525854] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Argos Watch member..."
                className="pl-8 pr-3 py-1.5 bg-white border border-[#CBCBCB] rounded-lg text-xs text-[#141A17] focus:outline-none focus:border-[#164C38]"
              />
            </div>

            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-[#CBCBCB] rounded-lg text-xs text-[#141A17] font-medium"
            >
              {departments.map((d: string) => (
                <option key={d} value={d}>
                  {d === 'ALL' ? 'All Departments' : d}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-1.5 bg-white border border-[#CBCBCB] rounded-lg text-xs text-[#141A17] font-semibold"
            >
              <option value="fullName">Sort: Name</option>
              <option value="department">Sort: Department</option>
              <option value="role">Sort: Role</option>
            </select>

            <button
              onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              className="px-2.5 py-1.5 bg-[#164C38] text-[#F2F2F2] rounded-lg text-xs font-mono font-bold cursor-pointer"
            >
              {sortOrder === 'asc' ? 'ASC ↑' : 'DESC ↓'}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#CBCBCB] bg-[#F2F2F2]">
                <th className="py-3 px-4 text-xs font-bold text-[#164C38]">
                  Employee / Manager
                </th>
                <th className="py-3 px-4 text-xs font-bold text-[#164C38]">
                  Email
                </th>
                <th className="py-3 px-4 text-xs font-bold text-[#164C38]">
                  Department
                </th>
                <th className="py-3 px-4 text-xs font-bold text-[#164C38]">
                  Designation
                </th>
                <th className="py-3 px-4 text-xs font-bold text-[#164C38]">
                  Role
                </th>
                <th className="py-3 px-4 text-right text-xs font-bold text-[#164C38]">
                  Quick Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#CBCBCB]/60 text-xs">
              {filteredRoster.map((emp) => (
                <tr key={emp.id} className="hover:bg-[#F2F2F2]/60 transition-colors">
                  <td className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => openEmployeeProfile(emp.id)}
                      className="flex items-center gap-2.5 text-left cursor-pointer group"
                    >
                      <AvatarInitials name={emp.fullName} size="sm" />
                      <div>
                        <div className="font-bold text-[#141A17] group-hover:text-[#164C38]">
                          {emp.fullName}
                        </div>
                        <div className="text-[10px] font-mono text-[#525854]">
                          {emp.employeeCode}
                        </div>
                      </div>
                    </button>
                  </td>
                  <td className="py-3 px-4 font-mono text-[#164C38] font-medium">{emp.email}</td>
                  <td className="py-3 px-4 font-semibold text-[#141A17]">{emp.department}</td>
                  <td className="py-3 px-4 text-[#525854]">{emp.designation}</td>
                  <td className="py-3 px-4">
                    <StatusBadge status={emp.role} />
                  </td>
                  <td className="py-3 px-4 text-right">
                    {isHRAdmin ? (
                      <button
                        onClick={() => {
                          setTargetEmpId(emp.id);
                          setAutoApprove(true);
                          setShowLeaveOnBehalfModal(true);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#4E1617] hover:bg-[#380F10] text-[#F2F2F2] text-[11px] font-semibold transition-colors cursor-pointer"
                      >
                        <UserPlus className="w-3 h-3" />
                        File Leave on Behalf
                      </button>
                    ) : (
                      <StatusBadge status={emp.status} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Approvals & Upcoming Holidays Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-[#CBCBCB] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-[#164C38]">
              Pending Leave Approvals ({pendingLeaves.length})
            </h2>
            <button
              onClick={() => setActiveModule('leave')}
              className="text-xs font-semibold text-[#4E1617] hover:underline cursor-pointer"
            >
              Open Leave Desk →
            </button>
          </div>
          <div className="space-y-2.5">
            {pendingLeaves.map((l) => (
              <div
                key={l.id}
                className="p-3.5 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB] flex items-center justify-between gap-3"
              >
                <div>
                  <div className="text-xs font-bold text-[#141A17]">
                    {l.employeeName} · <span className="font-mono text-[#164C38]">{l.leaveType}</span> ({l.days}d)
                  </div>
                  <div className="text-[11px] text-[#525854] mt-0.5">
                    {l.startDate} to {l.endDate} — {l.reason}
                  </div>
                </div>
                {(isHRAdmin || currentUser.role === 'MANAGER') && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => approveLeave(l.id)}
                      className="px-2.5 py-1 bg-[#164C38] hover:bg-[#0F3627] text-white text-[11px] font-semibold rounded-md cursor-pointer"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => rejectLeave(l.id)}
                      className="px-2.5 py-1 bg-[#4E1617] hover:bg-[#380F10] text-white text-[11px] font-semibold rounded-md cursor-pointer"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
            {pendingLeaves.length === 0 && (
              <div className="text-xs text-[#525854] py-6 text-center">
                All leave requests are processed.
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border border-[#CBCBCB] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-[#164C38]">
              Upcoming Official Holidays ({holidays.length})
            </h2>
            <button
              onClick={() => setActiveModule('company-info')}
              className="text-xs font-semibold text-[#4E1617] hover:underline cursor-pointer"
            >
              Manage Holidays →
            </button>
          </div>
          <div className="space-y-2.5">
            {holidays.slice(0, 5).map((h) => (
              <div
                key={h.id}
                className="p-3 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB] flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold text-[#141A17]">{h.name}</div>
                  <div className="text-[11px] text-[#525854]">
                    {h.day} · {h.applicableBranches}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-[#164C38]">{h.date}</div>
                  <span className="text-[10px] font-mono text-[#4E1617] font-semibold">
                    {h.type.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick HR Apply Leave on Behalf Modal */}
      <ModalShell
        isOpen={showLeaveOnBehalfModal}
        onClose={() => setShowLeaveOnBehalfModal(false)}
        title="Apply Leave on Behalf of Employee"
        subtitle="HR & Admin can file full-day or half-day leave for any Argos Watch employee or manager"
      >
        <form onSubmit={handleQuickLeaveSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#141A17] mb-1">
              Select Argos Watch Team Member
            </label>
            <select
              value={targetEmpId}
              onChange={(e) => setTargetEmpId(e.target.value)}
              className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs font-semibold text-[#141A17]"
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName} — {emp.designation} ({emp.department})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#141A17] mb-1">Leave Type</label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs"
              >
                <option value="CASUAL">Casual Leave (CL)</option>
                <option value="SICK">Sick Leave (SL)</option>
                <option value="EARNED">Earned Leave (EL)</option>
                <option value="COMP_OFF">Comp-Off</option>
                <option value="UNPAID">Unpaid / LOP</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#141A17] mb-1">
                Session / Half-Day
              </label>
              <select
                value={halfDaySession}
                onChange={(e) => setHalfDaySession(e.target.value as any)}
                className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs"
              >
                <option value="FULL_DAY">Full Working Day (1.0d)</option>
                <option value="FIRST_HALF">
                  1st Half ({companyTiming.firstHalfStart}-{companyTiming.firstHalfEnd})
                </option>
                <option value="SECOND_HALF">
                  2nd Half ({companyTiming.secondHalfStart}-{companyTiming.secondHalfEnd})
                </option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#141A17] mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#141A17] mb-1">End Date</label>
              <input
                type="date"
                value={halfDaySession !== 'FULL_DAY' ? startDate : endDate}
                disabled={halfDaySession !== 'FULL_DAY'}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs font-mono disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#141A17] mb-1">Days</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={halfDaySession !== 'FULL_DAY' ? 0.5 : days}
                disabled={halfDaySession !== 'FULL_DAY'}
                onChange={(e) => setDays(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs font-mono disabled:opacity-60"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#141A17] mb-1">
              Reason & Coverage Note
            </label>
            <textarea
              rows={2}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter leave reason filed by HR..."
              className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoApprove}
              onChange={(e) => setAutoApprove(e.target.checked)}
              className="rounded border-[#CBCBCB] text-[#164C38]"
            />
            <span className="text-xs font-semibold text-[#141A17]">
              Immediately Auto-Approve as HR ({currentUser.fullName})
            </span>
          </label>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#CBCBCB]">
            <button
              type="button"
              onClick={() => setShowLeaveOnBehalfModal(false)}
              className="px-3.5 py-2 text-xs font-semibold text-[#525854]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#164C38] hover:bg-[#0F3627] text-[#F2F2F2] text-xs font-semibold rounded-lg"
            >
              Submit Leave on Behalf
            </button>
          </div>
        </form>
      </ModalShell>
    </div>
  );
}
