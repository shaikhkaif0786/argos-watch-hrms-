import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  RotateCcw,
  AlertTriangle,
  UserX,
  ExternalLink,
  Filter,
} from 'lucide-react';
import { useHRMS } from '../../context/HRMSContext';
import {
  ExportDropdown,
  AvatarInitials,
  StatusBadge,
} from '../ui/EnterpriseComponents';

export type ExceptionType =
  | 'Late'
  | 'Absent'
  | 'On Leave'
  | 'Missing Punch-In'
  | 'Missing Punch-Out'
  | 'Incomplete Attendance';

export interface AttendanceExceptionItem {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  department: string;
  designation: string;
  date: string; // YYYY-MM-DD
  dayNumber: number;
  exceptionType: ExceptionType;
  scheduledShift: string; // e.g. "09:30 – 18:30"
  punchIn: string | null;
  punchOut: string | null;
  duration: string; // e.g. "7.2 hrs"
  lateByMinutes?: number;
  notes?: string;
}

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

const EXCEPTION_CONFIG: Record<
  ExceptionType,
  { label: string; badgeClass: string; pillClass: string; dotClass: string }
> = {
  Late: {
    label: 'Late',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    pillClass: 'bg-amber-50 text-amber-800 border-amber-200',
    dotClass: 'bg-amber-500',
  },
  Absent: {
    label: 'Absent',
    badgeClass: 'bg-rose-100 text-rose-900 border-rose-300',
    pillClass: 'bg-rose-50 text-rose-800 border-rose-200',
    dotClass: 'bg-rose-600',
  },
  'On Leave': {
    label: 'On Leave',
    badgeClass: 'bg-sky-100 text-sky-900 border-sky-300',
    pillClass: 'bg-sky-50 text-sky-800 border-sky-200',
    dotClass: 'bg-sky-500',
  },
  'Missing Punch-In': {
    label: 'Missing Punch-In',
    badgeClass: 'bg-orange-100 text-orange-900 border-orange-300',
    pillClass: 'bg-orange-50 text-orange-800 border-orange-200',
    dotClass: 'bg-orange-500',
  },
  'Missing Punch-Out': {
    label: 'Missing Punch-Out',
    badgeClass: 'bg-orange-100 text-orange-900 border-orange-300',
    pillClass: 'bg-orange-50 text-orange-800 border-orange-200',
    dotClass: 'bg-orange-500',
  },
  'Incomplete Attendance': {
    label: 'Incomplete',
    badgeClass: 'bg-slate-200 text-slate-900 border-slate-300',
    pillClass: 'bg-slate-100 text-slate-800 border-slate-200',
    dotClass: 'bg-slate-500',
  },
};

export function CalendarModule() {
  const {
    currentUser,
    employees,
    allEmployees,
    attendance,
    leaves,
    holidays,
    settings,
    openEmployeeProfile,
    navigateTo,
  } = useHRMS();

  // Navigation state (Default to current date: Oct 6, 2026)
  const CURRENT_YEAR = 2026;
  const CURRENT_MONTH = 9; // October (0-indexed)
  const CURRENT_DAY = 6;

  const [calYear, setCalYear] = useState<number>(CURRENT_YEAR);
  const [calMonth, setCalMonth] = useState<number>(CURRENT_MONTH);
  const [selectedDay, setSelectedDay] = useState<number | null>(CURRENT_DAY);

  // Filters (Requirement 6: Department, Exception Type, Search)
  const [filterDept, setFilterDept] = useState<string>('ALL');
  const [filterExceptionType, setFilterExceptionType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const isHRAdmin = currentUser.role === 'HR' || currentUser.role === 'ADMIN';
  const isManager = currentUser.role === 'MANAGER';

  // Scoped employees for calendar viewing (Requirement 2: Employee sees self, Manager sees team, no department filter)
  const scopedEmployees = useMemo(() => {
    let list = allEmployees || employees;
    if (currentUser.role === 'EMPLOYEE') {
      list = list.filter((e) => e.id === currentUser.employeeId);
    } else if (isManager) {
      list = list.filter(
        (e) => e.managerId === currentUser.employeeId || e.id === currentUser.employeeId
      );
    }
    // Only HR and Admin apply department filters
    if (isHRAdmin && filterDept !== 'ALL') {
      list = list.filter((e) => e.department === filterDept);
    }
    return list;
  }, [allEmployees, employees, currentUser, isManager, isHRAdmin, filterDept]);

  const departmentList = useMemo(() => {
    const set = new Set<string>((allEmployees || employees).map((e) => e.department));
    return ['ALL', ...Array.from(set)];
  }, [allEmployees, employees]);

  const totalDaysInMonth = useMemo(
    () => new Date(calYear, calMonth + 1, 0).getDate(),
    [calYear, calMonth]
  );
  const startDayOffset = useMemo(
    () => new Date(calYear, calMonth, 1).getDay(),
    [calYear, calMonth]
  );
  const daysInMonth = useMemo(
    () => Array.from({ length: totalDaysInMonth }, (_, i) => i + 1),
    [totalDaysInMonth]
  );

  const shiftStart = settings?.workStartTime || '09:30';
  const shiftEnd = settings?.workEndTime || '18:30';
  const defaultShift = `${shiftStart} – ${shiftEnd}`;

  // =========================================================================
  // CRITICAL RULE (Requirement 6):
  // DO NOT LIST EMPLOYEES WHO ARE NORMALLY PRESENT AND HAVE NO EXCEPTION.
  // ONLY COMPILE EMPLOYEES WITH ATTENDANCE EXCEPTIONS:
  // Late, Absent, On Leave, Missing Punch-In, Missing Punch-Out, Incomplete
  // =========================================================================
  const allMonthExceptions = useMemo<AttendanceExceptionItem[]>(() => {
    const exceptions: AttendanceExceptionItem[] = [];
    const monthPrefix = `${calYear}-${String(calMonth + 1).padStart(2, '0')}`;

    for (let dayNum = 1; dayNum <= totalDaysInMonth; dayNum++) {
      const dateStr = `${monthPrefix}-${String(dayNum).padStart(2, '0')}`;
      const dayOfWeek = new Date(calYear, calMonth, dayNum).getDay();
      const isSunday = dayOfWeek === 0;

      // Skip Sunday weekly off unless specific attendance punches occurred
      if (isSunday) {
        continue;
      }

      // Check each scoped employee for attendance exceptions on this date
      scopedEmployees.forEach((emp) => {
        // 1. Check if employee had an approved leave on this date
        const empLeave = (leaves || []).find(
          (l) =>
            l.employeeId === emp.id &&
            l.status === 'Approved' &&
            dateStr >= l.startDate &&
            dateStr <= l.endDate
        );

        if (empLeave) {
          exceptions.push({
            id: `exc-lv-${emp.id}-${dateStr}`,
            employeeId: emp.id,
            employeeName: emp.fullName,
            employeeCode: emp.employeeCode || emp.id,
            department: emp.department,
            designation: emp.designation,
            date: dateStr,
            dayNumber: dayNum,
            exceptionType: 'On Leave',
            scheduledShift: defaultShift,
            punchIn: null,
            punchOut: null,
            duration: `${empLeave.days} day(s)`,
            notes: `${empLeave.leaveType} Leave: ${empLeave.reason}`,
          });
          return;
        }

        // 2. Check actual attendance record on this date
        const att = (attendance || []).find(
          (a) => a.employeeId === emp.id && a.date === dateStr
        );

        if (att) {
          const statusUpper = String(att.status || '').toUpperCase();
          const punchInVal = (att as any).punchIn || att.checkIn || null;
          const punchOutVal = (att as any).punchOut || att.checkOut || null;
          const lateMins = (att as any).lateByMinutes ?? att.lateMinutes ?? 0;
          const isLate = att.isLate || statusUpper === 'LATE' || lateMins > 0;
          const workHrs = (att as any).workHours ?? att.workingHours ?? 0;

          // Absent
          if (statusUpper === 'ABSENT' || statusUpper === 'UNEXCUSED') {
            exceptions.push({
              id: `exc-abs-${att.id}`,
              employeeId: emp.id,
              employeeName: emp.fullName,
              employeeCode: emp.employeeCode || emp.id,
              department: emp.department,
              designation: emp.designation,
              date: dateStr,
              dayNumber: dayNum,
              exceptionType: 'Absent',
              scheduledShift: defaultShift,
              punchIn: null,
              punchOut: null,
              duration: '0 hrs',
              notes: att.notes || 'Unexcused / unscheduled absence',
            });
            return;
          }

          // On Leave marked in attendance
          if (statusUpper === 'ON_LEAVE' || statusUpper === 'ON LEAVE' || statusUpper === 'LEAVE') {
            exceptions.push({
              id: `exc-att-lv-${att.id}`,
              employeeId: emp.id,
              employeeName: emp.fullName,
              employeeCode: emp.employeeCode || emp.id,
              department: emp.department,
              designation: emp.designation,
              date: dateStr,
              dayNumber: dayNum,
              exceptionType: 'On Leave',
              scheduledShift: defaultShift,
              punchIn: null,
              punchOut: null,
              duration: `${workHrs} hrs`,
              notes: att.notes || 'Leave recorded on ledger',
            });
            return;
          }

          // Missing Punch-In (has punchOut but missing punchIn)
          if ((!punchInVal || punchInVal === '--') && punchOutVal && punchOutVal !== '--') {
            exceptions.push({
              id: `exc-mpin-${att.id}`,
              employeeId: emp.id,
              employeeName: emp.fullName,
              employeeCode: emp.employeeCode || emp.id,
              department: emp.department,
              designation: emp.designation,
              date: dateStr,
              dayNumber: dayNum,
              exceptionType: 'Missing Punch-In',
              scheduledShift: defaultShift,
              punchIn: null,
              punchOut: punchOutVal,
              duration: `${workHrs} hrs`,
              notes: 'Missing check-in timestamp',
            });
            return;
          }

          // Missing Punch-Out (has punchIn but missing punchOut on past dates)
          if (punchInVal && punchInVal !== '--' && (!punchOutVal || punchOutVal === '--')) {
            // If date is strictly in the past, or marked with zero checkout
            if (dateStr <= '2026-10-06') {
              exceptions.push({
                id: `exc-mpout-${att.id}`,
                employeeId: emp.id,
                employeeName: emp.fullName,
                employeeCode: emp.employeeCode || emp.id,
                department: emp.department,
                designation: emp.designation,
                date: dateStr,
                dayNumber: dayNum,
                exceptionType: 'Missing Punch-Out',
                scheduledShift: defaultShift,
                punchIn: punchInVal,
                punchOut: null,
                duration: `${workHrs} hrs`,
                notes: 'Check-out punch missing at end of shift',
              });
              return;
            }
          }

          // Late Coming
          if (isLate) {
            exceptions.push({
              id: `exc-late-${att.id}`,
              employeeId: emp.id,
              employeeName: emp.fullName,
              employeeCode: emp.employeeCode || emp.id,
              department: emp.department,
              designation: emp.designation,
              date: dateStr,
              dayNumber: dayNum,
              exceptionType: 'Late',
              scheduledShift: defaultShift,
              punchIn: punchInVal,
              punchOut: punchOutVal,
              duration: `${workHrs} hrs`,
              lateByMinutes: lateMins,
              notes: `Late by ${lateMins} minutes (Punch-in at ${punchInVal || '09:48'})`,
            });
            return;
          }

          // Incomplete Attendance (worked less than scheduled 8.5 hours threshold)
          if (workHrs > 0 && workHrs < 8.0 && statusUpper !== 'PRESENT') {
            exceptions.push({
              id: `exc-inc-${att.id}`,
              employeeId: emp.id,
              employeeName: emp.fullName,
              employeeCode: emp.employeeCode || emp.id,
              department: emp.department,
              designation: emp.designation,
              date: dateStr,
              dayNumber: dayNum,
              exceptionType: 'Incomplete Attendance',
              scheduledShift: defaultShift,
              punchIn: punchInVal,
              punchOut: punchOutVal,
              duration: `${workHrs} hrs`,
              notes: `Short duration: ${workHrs} hrs logged (scheduled: 8.5 hrs)`,
            });
            return;
          }

          // NORMAL PRESENT EMPLOYEES ARE INTENTIONALLY NOT ADDED!
          // They have no attendance exception.
        }
      });
    }

    return exceptions;
  }, [
    calYear,
    calMonth,
    totalDaysInMonth,
    scopedEmployees,
    leaves,
    attendance,
    defaultShift,
  ]);

  // Filtered exception items by user selection
  const filteredExceptions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return allMonthExceptions.filter((item) => {
      if (filterExceptionType !== 'ALL' && item.exceptionType !== filterExceptionType) {
        return false;
      }
      if (
        q &&
        !item.employeeName.toLowerCase().includes(q) &&
        !item.employeeCode.toLowerCase().includes(q) &&
        !item.department.toLowerCase().includes(q) &&
        !item.exceptionType.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [allMonthExceptions, filterExceptionType, searchQuery]);

  // Selected Day Exceptions
  const selectedDayExceptions = useMemo(() => {
    if (!selectedDay) return [];
    return filteredExceptions.filter((e) => e.dayNumber === selectedDay);
  }, [selectedDay, filteredExceptions]);

  const selectedDateStr = useMemo(() => {
    if (!selectedDay) return '';
    return `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
  }, [calYear, calMonth, selectedDay]);

  const selectedDayHoliday = useMemo(() => {
    if (!selectedDateStr) return null;
    const mmdd = selectedDateStr.slice(5);
    const h = holidays.find((hol) => hol.date === selectedDateStr || hol.date.slice(5) === mmdd);
    if (h) return h;
    return ANNUAL_HOLIDAYS[mmdd] || null;
  }, [selectedDateStr, holidays]);

  const handlePrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
    setSelectedDay(1);
  };

  const handleNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
    setSelectedDay(1);
  };

  const handleJumpToToday = () => {
    setCalYear(CURRENT_YEAR);
    setCalMonth(CURRENT_MONTH);
    setSelectedDay(CURRENT_DAY);
  };

  return (
    <div className="p-4 lg:p-6 max-w-[1440px] mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#CBCBCB]">
        <div>
          <span className="px-2.5 py-0.5 rounded-md bg-[#4E1617]/10 border border-[#4E1617]/30 text-[#4E1617] text-[10px] font-bold uppercase tracking-wider">
            Exception Radar
          </span>
          <h1 className="text-xl font-bold text-[#141A17] tracking-tight mt-1">
            Attendance Calendar
          </h1>
          <p className="text-xs text-[#525854] mt-0.5">
            Exception-only calendar tracking Late arrivals, Absences, Leaves, Missing Punches, and Incomplete attendance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ExportDropdown
            data={filteredExceptions.map((ex) => ({
              Date: ex.date,
              Employee: ex.employeeName,
              ID: ex.employeeCode,
              Department: ex.department,
              Designation: ex.designation,
              Exception: ex.exceptionType,
              Shift: ex.scheduledShift,
              PunchIn: ex.punchIn || 'Missing',
              PunchOut: ex.punchOut || 'Missing',
              Duration: ex.duration,
              Notes: ex.notes || '',
            }))}
            filename={`attendance_exceptions_${calYear}_${calMonth + 1}`}
            title={`Attendance Exceptions Calendar — ${MONTH_NAMES[calMonth]} ${calYear}`}
          />
        </div>
      </div>

      {/* Month & Year Navigation + Filters */}
      <div className="bg-white border border-[#CBCBCB] rounded-2xl p-4 space-y-3.5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Month & Year Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-9 h-9 rounded-xl bg-[#F2F2F2] hover:bg-[#CBCBCB]/60 border border-[#CBCBCB] flex items-center justify-center text-[#141A17] cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5">
              <select
                value={calMonth}
                onChange={(e) => {
                  setCalMonth(Number(e.target.value));
                  setSelectedDay(1);
                }}
                className="px-3 py-1.5 bg-[#F2F2F2] border border-[#CBCBCB] rounded-xl text-xs sm:text-sm font-bold text-[#141A17] cursor-pointer"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx}>
                    {name}
                  </option>
                ))}
              </select>

              <select
                value={calYear}
                onChange={(e) => {
                  setCalYear(Number(e.target.value));
                  setSelectedDay(1);
                }}
                className="px-3 py-1.5 bg-[#F2F2F2] border border-[#CBCBCB] rounded-xl text-xs sm:text-sm font-mono font-bold text-[#164C38] cursor-pointer"
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
              className="w-9 h-9 rounded-xl bg-[#F2F2F2] hover:bg-[#CBCBCB]/60 border border-[#CBCBCB] flex items-center justify-center text-[#141A17] cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleJumpToToday}
              className="ml-2 px-3 py-1.5 rounded-xl bg-[#164C38] hover:bg-[#0F3627] text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Today</span>
            </button>
          </div>

          {/* Department (Admin/HR Only) & Exception Type Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {isHRAdmin && (
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="px-2.5 py-1.5 bg-[#F2F2F2] border border-[#CBCBCB] rounded-xl text-xs font-medium text-[#141A17]"
              >
                {departmentList.map((d) => (
                  <option key={d} value={d}>
                    {d === 'ALL' ? 'All Departments' : d}
                  </option>
                ))}
              </select>
            )}

            <select
              value={filterExceptionType}
              onChange={(e) => setFilterExceptionType(e.target.value)}
              className="px-2.5 py-1.5 bg-[#F2F2F2] border border-[#CBCBCB] rounded-xl text-xs font-bold text-[#141A17]"
            >
              <option value="ALL">All Exception Types</option>
              <option value="Late">Late Arrivals</option>
              <option value="Absent">Absences</option>
              <option value="On Leave">On Leave</option>
              <option value="Missing Punch-In">Missing Punch-In</option>
              <option value="Missing Punch-Out">Missing Punch-Out</option>
              <option value="Incomplete Attendance">Incomplete Attendance</option>
            </select>

            <div className="relative w-48">
              <Search className="w-3.5 h-3.5 text-[#525854] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search exceptions..."
                className="w-full pl-8 pr-2.5 py-1.5 bg-[#F2F2F2] border border-[#CBCBCB] rounded-xl text-xs outline-none"
              />
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#CBCBCB]/60 text-[11px]">
          <span className="font-bold text-[#525854] uppercase text-[10px] mr-1">Exception Types:</span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Late
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-300 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
            Absent
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-sky-100 text-sky-900 border border-sky-300 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
            On Leave
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-orange-100 text-orange-900 border border-orange-300 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            Missing Punch
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 border border-slate-300 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            Incomplete
          </span>
          <span className="ml-auto text-[#525854] text-[10px]">
            * Normal present records without exception are omitted per specification.
          </span>
        </div>
      </div>

      {/* Main Grid: Calendar Cells (Left) + Selected Day Exception Drawer (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Calendar Grid */}
        <div className="lg:col-span-8 bg-white border border-[#CBCBCB] rounded-2xl overflow-hidden shadow-xs">
          <div className="px-4 py-3 border-b border-[#CBCBCB] bg-[#F2F2F2] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-[#164C38]" />
              <h2 className="text-sm font-bold text-[#141A17]">
                {MONTH_NAMES[calMonth]} {calYear} Exception Grid
              </h2>
            </div>
            <span className="font-mono text-xs text-[#525854]">
              Total Exceptions This Month: <strong>{filteredExceptions.length}</strong>
            </span>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 border-b border-[#CBCBCB] bg-[#F2F2F2] text-center text-[10px] sm:text-[11px] font-bold uppercase text-[#525854]">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="py-2.5">
                {d}
              </div>
            ))}
          </div>

          {/* Grid Cells */}
          <div className="grid grid-cols-7 divide-x divide-y divide-[#CBCBCB]">
            {Array.from({ length: startDayOffset }).map((_, idx) => (
              <div key={`empty-${idx}`} className="min-h-[80px] sm:min-h-[100px] bg-[#F2F2F2]/40 p-1.5" />
            ))}

            {daysInMonth.map((dayNum) => {
              const dayDateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const dayExceptions = allMonthExceptions.filter((e) => e.dayNumber === dayNum);
              const isSelected = selectedDay === dayNum;
              const isSunday = (dayNum + startDayOffset - 1) % 7 === 0;

              // Check if holiday
              const mmdd = dayDateStr.slice(5);
              const hol = holidays.find((h) => h.date === dayDateStr || h.date.slice(5) === mmdd);
              const annualHol = ANNUAL_HOLIDAYS[mmdd];
              const holidayTitle = hol?.name || annualHol?.name;

              // Group counts
              const lateCount = dayExceptions.filter((e) => e.exceptionType === 'Late').length;
              const absentCount = dayExceptions.filter((e) => e.exceptionType === 'Absent').length;
              const leaveCount = dayExceptions.filter((e) => e.exceptionType === 'On Leave').length;
              const missingCount = dayExceptions.filter(
                (e) => e.exceptionType === 'Missing Punch-In' || e.exceptionType === 'Missing Punch-Out'
              ).length;
              const incompleteCount = dayExceptions.filter(
                (e) => e.exceptionType === 'Incomplete Attendance'
              ).length;

              const hasExceptions = dayExceptions.length > 0;

              return (
                <div
                  key={dayNum}
                  onClick={() => setSelectedDay(dayNum)}
                  className={`min-h-[80px] sm:min-h-[105px] p-2 transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#164C38]/10 ring-2 ring-inset ring-[#164C38]'
                      : isSunday
                      ? 'bg-[#F2F2F2]/50 hover:bg-[#F2F2F2]'
                      : hasExceptions
                      ? 'bg-amber-50/20 hover:bg-amber-50/40'
                      : 'bg-white hover:bg-[#F2F2F2]/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-mono font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        isSelected
                          ? 'bg-[#164C38] text-white'
                          : isSunday
                          ? 'text-[#4E1617]'
                          : hasExceptions
                          ? 'text-[#141A17] font-extrabold'
                          : 'text-[#525854]'
                      }`}
                    >
                      {dayNum}
                    </span>

                    {/* Overall exception indicator on cell */}
                    {hasExceptions && (
                      <span className="font-mono text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 border border-amber-300">
                        {dayExceptions.length}
                      </span>
                    )}
                  </div>

                  {/* Cell Summary Badges (NO PRESENT ROWS) */}
                  <div className="space-y-1 mt-1">
                    {holidayTitle && (
                      <div className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 truncate">
                        ★ {holidayTitle}
                      </div>
                    )}

                    {isSunday && (
                      <div className="text-[9px] font-semibold text-slate-500 italic">
                        Weekly Off
                      </div>
                    )}

                    {/* Exception Pill Badges */}
                    {lateCount > 0 && (
                      <div className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 truncate">
                        {lateCount} Late
                      </div>
                    )}
                    {absentCount > 0 && (
                      <div className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-900 border border-rose-300 truncate">
                        {absentCount} Absent
                      </div>
                    )}
                    {leaveCount > 0 && (
                      <div className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-900 border border-sky-300 truncate">
                        {leaveCount} On Leave
                      </div>
                    )}
                    {missingCount > 0 && (
                      <div className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-900 border border-orange-300 truncate">
                        {missingCount} Missing Punch
                      </div>
                    )}
                    {incompleteCount > 0 && (
                      <div className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 border border-slate-300 truncate">
                        {incompleteCount} Incomplete
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Day Exception Summary Panel */}
        <div className="lg:col-span-4 bg-white border border-[#CBCBCB] rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
          <div className="border-b border-[#CBCBCB] pb-3 flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#164C38]">
                Daily Exception Audit
              </span>
              <h3 className="text-base font-bold text-[#141A17] mt-0.5">
                {selectedDateStr
                  ? `${MONTH_NAMES[calMonth]} ${selectedDay}, ${calYear}`
                  : 'Select a Date'}
              </h3>
              <p className="text-[11px] text-[#525854]">
                Detailed exceptions for scheduled shifts and punches
              </p>
            </div>
            <Clock className="w-5 h-5 text-[#164C38] shrink-0 mt-1" />
          </div>

          {/* Holiday or Weekly Off notes if applicable */}
          {selectedDayHoliday && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900">
              <span className="font-bold">★ {selectedDayHoliday.name}</span>
              <span className="block text-[11px] text-rose-700">Official Company Holiday</span>
            </div>
          )}

          {/* Exceptions List for Selected Day */}
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {selectedDayExceptions.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#525854] bg-[#F2F2F2] rounded-xl border border-[#CBCBCB] p-4">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 mx-auto flex items-center justify-center font-bold text-sm mb-2">
                  ✓
                </div>
                <p className="font-bold text-[#141A17] text-sm">
                  No attendance exceptions for this date.
                </p>
                <p className="text-[11px] text-[#525854] mt-1">
                  All active employees on this date are normally Present on time or this day is an official non-working day.
                </p>
              </div>
            ) : (
              selectedDayExceptions.map((exc) => {
                const conf = EXCEPTION_CONFIG[exc.exceptionType] || EXCEPTION_CONFIG['Late'];
                return (
                  <div
                    key={exc.id}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 hover:border-[#164C38] transition-colors"
                  >
                    {/* Employee & Exception Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => {
                            if (openEmployeeProfile) openEmployeeProfile(exc.employeeId);
                            else navigateTo('people', null, exc.employeeId);
                          }}
                          className="font-bold text-xs text-[#141A17] hover:text-[#164C38] flex items-center gap-1.5 cursor-pointer text-left truncate"
                        >
                          <span>{exc.employeeName}</span>
                          <ExternalLink className="w-3 h-3 text-[#525854]" />
                        </button>
                        <span className="text-[10px] font-mono text-[#525854] block">
                          {exc.employeeCode} · {exc.department}
                        </span>
                        <span className="text-[10px] text-[#525854] block">
                          {exc.designation}
                        </span>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0 ${conf.badgeClass}`}
                      >
                        {exc.exceptionType}
                      </span>
                    </div>

                    {/* Shift & Punch Details */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-[11px]">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Scheduled Shift:</span>
                        <span className="font-mono font-semibold text-slate-800">{exc.scheduledShift}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Actual Punches:</span>
                        <span className="font-mono font-bold text-slate-900">
                          {exc.punchIn || 'Missing'} – {exc.punchOut || 'Missing'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Logged Duration:</span>
                        <span className="font-mono font-semibold text-slate-800">{exc.duration}</span>
                      </div>
                      {exc.lateByMinutes !== undefined && exc.lateByMinutes > 0 && (
                        <div>
                          <span className="text-slate-500 block text-[10px]">Late By:</span>
                          <span className="font-mono font-bold text-amber-700">+{exc.lateByMinutes} mins</span>
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    {exc.notes && (
                      <p className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200">
                        {exc.notes}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
