import { AttendanceRecord, PunchEvent, PunchType, PunchSource, Employee, CompanySettings } from '../types/hrms';

/**
 * Parses time string (e.g. "09:25", "09:25 AM", "18:30") to minutes from midnight
 */
export function timeStringToMinutes(timeStr?: string | null): number | null {
  if (!timeStr || timeStr === '--:--' || timeStr === '—') return null;
  const cleaned = timeStr.trim().toUpperCase();
  const isPM = cleaned.includes('PM');
  const isAM = cleaned.includes('AM');
  const timePart = cleaned.replace(/[AP]M/, '').trim();
  const [hStr, mStr] = timePart.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr || '0', 10);
  if (isNaN(h) || isNaN(m)) return null;

  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;
  return h * 60 + m;
}

/**
 * Formats minutes from midnight to "HH:mm" 24h format
 */
export function minutesToTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Enriches and normalizes punch events for an AttendanceRecord
 * Identifies FIRST IN and LAST OUT, calculates worked duration strictly from valid punch pairs,
 * and detects unmatched punches.
 */
export function getNormalizedPunchesForRecord(
  record: AttendanceRecord,
  employeeId?: string
): {
  punches: PunchEvent[];
  firstIn: PunchEvent | null;
  lastOut: PunchEvent | null;
  totalPunchIns: number;
  totalPunchOuts: number;
  workedMinutes: number;
  workedHours: number;
  validPairsCount: number;
  hasUnmatchedPunch: boolean;
  unmatchedNote: string;
} {
  let rawPunches: PunchEvent[] = [];

  if (record.punches && record.punches.length > 0) {
    rawPunches = [...record.punches];
  } else {
    // Generate initial chronological punches from checkIn/checkOut or punchIn/punchOut
    const inTime = record.punchIn || record.checkIn;
    const outTime = record.punchOut || record.checkOut;
    const empId = employeeId || record.employeeId;

    if (inTime && inTime !== '--:--') {
      rawPunches.push({
        id: `PUNCH-${record.id}-1`,
        employeeId: empId,
        timestamp: `${record.date}T${inTime}:00`,
        time: inTime,
        type: 'IN',
        source: record.source === 'MANUAL' ? 'Manual Correction' : 'ESSL Biometric',
        isManualCorrection: record.isManualCorrection,
        manualCorrectionReason: record.manualCorrectionReason,
        correctedBy: record.correctedBy,
        correctedAt: record.correctedAt,
      });
    }

    if (outTime && outTime !== '--:--') {
      rawPunches.push({
        id: `PUNCH-${record.id}-2`,
        employeeId: empId,
        timestamp: `${record.date}T${outTime}:00`,
        time: outTime,
        type: 'OUT',
        source: record.source === 'MANUAL' ? 'Manual Correction' : 'ESSL Biometric',
        isManualCorrection: record.isManualCorrection,
        manualCorrectionReason: record.manualCorrectionReason,
        correctedBy: record.correctedBy,
        correctedAt: record.correctedAt,
      });
    }
  }

  // Sort chronological by time
  const sorted = rawPunches.sort((a, b) => {
    const minsA = timeStringToMinutes(a.time) ?? 0;
    const minsB = timeStringToMinutes(b.time) ?? 0;
    return minsA - minsB;
  });

  const ins = sorted.filter((p) => p.type === 'IN');
  const outs = sorted.filter((p) => p.type === 'OUT');

  const firstIn = ins.length > 0 ? ins[0] : null;
  const lastOut = outs.length > 0 ? outs[outs.length - 1] : null;

  // Mark flags on each punch
  const punches = sorted.map((p) => {
    const isFirstIn = firstIn?.id === p.id;
    const isLastOut = lastOut?.id === p.id;
    const isIntermediate = !isFirstIn && !isLastOut;
    return {
      ...p,
      isFirstIn,
      isLastOut,
      isIntermediate,
    };
  });

  // Calculate worked duration strictly from valid chronological (IN -> subsequent OUT) pairs
  let workedMinutes = 0;
  let validPairsCount = 0;
  let currentIn: PunchEvent | null = null;
  let hasUnmatchedPunch = false;
  let unmatchedNote = '';

  for (let i = 0; i < punches.length; i++) {
    const p = punches[i];
    if (p.type === 'IN') {
      if (currentIn) {
        // Previous IN was not paired with an OUT
        hasUnmatchedPunch = true;
        unmatchedNote = `Missing Punch-Out before ${p.time}`;
      }
      currentIn = p;
    } else if (p.type === 'OUT') {
      if (currentIn) {
        const inMins = timeStringToMinutes(currentIn.time);
        const outMins = timeStringToMinutes(p.time);
        if (inMins !== null && outMins !== null && outMins >= inMins) {
          workedMinutes += (outMins - inMins);
          validPairsCount++;
        }
        currentIn = null;
      } else {
        // OUT with no preceding IN
        hasUnmatchedPunch = true;
        unmatchedNote = `Missing Punch-In before ${p.time}`;
      }
    }
  }

  if (currentIn && !lastOut) {
    hasUnmatchedPunch = true;
    unmatchedNote = 'Active Shift (Missing Punch-Out)';
  }

  // Fallback to record.workingHours if record has precalculated hours and no multi-punch logs yet
  if (workedMinutes === 0 && (record.workingHours || record.workHours || record.totalHours)) {
    workedMinutes = Math.round(((record.workingHours || record.workHours || record.totalHours || 0) * 60));
  }

  const workedHours = Number((workedMinutes / 60).toFixed(1));

  return {
    punches,
    firstIn,
    lastOut,
    totalPunchIns: ins.length,
    totalPunchOuts: outs.length,
    workedMinutes,
    workedHours,
    validPairsCount,
    hasUnmatchedPunch,
    unmatchedNote,
  };
}

/**
 * Exact Salary-Based Per-Minute Late Deduction Calculation (Requirement 9)
 * Formula:
 * Step 1 — Daily Salary = Monthly Salary / Calculation Days (default 26)
 * Step 2 — Per-Minute Salary Deduction = Daily Salary / Daily Working Minutes (default 8 * 60 = 480)
 * Step 3 — Late Deduction = Chargeable Late Minutes × Per-Minute Deduction
 */
export function calculateLateDeduction(
  employee: Employee | undefined,
  record: AttendanceRecord,
  settings?: CompanySettings
): {
  monthlySalary: number;
  salaryBasis: string;
  calculationDays: number;
  dailySalary: number;
  dailyWorkingMinutes: number;
  perMinuteRate: number;
  scheduledShiftStart: string;
  actualFirstIn: string;
  actualLateMinutes: number;
  graceMinutes: number;
  chargeableLateMinutes: number;
  deductionAmount: number;
  status: 'Calculated - Pending Approval' | 'Approved' | 'Adjusted in Payroll' | 'Exempted';
} {
  const isEnabled = settings?.lateDeductionEnabled ?? true;
  const calculationDays = Math.max(1, Number(settings?.lateDeductionDaysPerMonth || 26));
  const dailyHours = Math.max(1, Number(settings?.lateDeductionDailyWorkingHours || 8));
  const dailyWorkingMinutes = Math.max(
    60,
    Number(settings?.lateDeductionDailyWorkingMinutes || Math.round(dailyHours * 60))
  );

  // Determine applicable salary basis
  const salaryBasis = settings?.lateDeductionSalaryBasis || 'Monthly Gross';
  let monthlySalary = 15000; // default benchmark

  if (employee?.salary) {
    if (salaryBasis === 'Basic Salary') {
      monthlySalary = employee.salary.baseSalary || 15000;
    } else if (salaryBasis === 'Basic + HRA') {
      monthlySalary = (employee.salary.baseSalary || 0) + (employee.salary.hra || 0);
      if (monthlySalary === 0) monthlySalary = employee.salary.baseSalary || 15000;
    } else {
      // Monthly Gross = baseSalary + hra + specialAllowance
      monthlySalary =
        (employee.salary.baseSalary || 0) +
        (employee.salary.hra || 0) +
        (employee.salary.specialAllowance || 0);
      if (monthlySalary === 0) monthlySalary = employee.salary.baseSalary || 15000;
    }
  }

  // Exact Step 1 & Step 2 calculations
  const dailySalary = monthlySalary / calculationDays;
  const perMinuteRate = dailySalary / dailyWorkingMinutes; // monthlySalary / (calculationDays * dailyWorkingMinutes)

  // Shift start & grace period
  const scheduledShiftStart = settings?.workStartTime || '09:30';
  const graceMinutes = settings?.gracePeriodMinutes ?? 15;

  // Actual First In
  const normalized = getNormalizedPunchesForRecord(record, employee?.id);
  const actualFirstIn = normalized.firstIn?.time || record.punchIn || record.checkIn || '--:--';

  const firstInMins = timeStringToMinutes(actualFirstIn);
  const shiftStartMins = timeStringToMinutes(scheduledShiftStart) ?? (9 * 60 + 30);

  let actualLateMinutes = 0;
  if (firstInMins !== null && firstInMins > shiftStartMins) {
    actualLateMinutes = firstInMins - shiftStartMins;
  } else if (record.lateMinutes || record.lateByMinutes) {
    actualLateMinutes = record.lateMinutes || record.lateByMinutes || 0;
  }

  // Chargeable late minutes calculation
  const graceTreatment =
    settings?.lateDeductionGraceTreatment ||
    (settings?.lateDeductionGraceExempt ? 'Exempt Within Grace' : 'Deduct Full Late Minutes Past Grace');

  let chargeableLateMinutes = 0;
  if (isEnabled && actualLateMinutes > 0) {
    if (graceTreatment === 'Deduct Excess Above Grace') {
      chargeableLateMinutes = actualLateMinutes > graceMinutes ? actualLateMinutes - graceMinutes : 0;
    } else if (graceTreatment === 'Exempt Within Grace') {
      chargeableLateMinutes = actualLateMinutes > graceMinutes ? actualLateMinutes : 0;
    } else {
      // Deduct Full Late Minutes Past Grace (or any late minutes if past grace)
      chargeableLateMinutes = actualLateMinutes > graceMinutes ? actualLateMinutes : actualLateMinutes;
    }
  }

  // Step 3: Deduction Amount with configurable monetary rounding
  const rawDeduction = chargeableLateMinutes * perMinuteRate;
  const roundingRule = settings?.lateDeductionRoundingRule || 'Exact 2 Decimals';
  let deductionAmount = Number(rawDeduction.toFixed(2));
  if (roundingRule === 'Round Nearest Rupee') {
    deductionAmount = Math.round(rawDeduction);
  } else if (roundingRule === 'Round Down (Floor)') {
    deductionAmount = Math.floor(rawDeduction);
  } else if (roundingRule === 'Round Up (Ceil)') {
    deductionAmount = Math.ceil(rawDeduction);
  }

  return {
    monthlySalary,
    salaryBasis:
      salaryBasis === 'Basic Salary'
        ? 'Basic Salary'
        : salaryBasis === 'Basic + HRA'
        ? 'Basic + HRA'
        : 'Monthly Gross Salary',
    calculationDays,
    dailySalary: Number(dailySalary.toFixed(4)),
    dailyWorkingMinutes,
    perMinuteRate: Number(perMinuteRate.toFixed(6)),
    scheduledShiftStart,
    actualFirstIn,
    actualLateMinutes,
    graceMinutes,
    chargeableLateMinutes,
    deductionAmount: isEnabled ? deductionAmount : 0,
    status: !isEnabled
      ? 'Exempted'
      : record.payrollAdjustmentStatus || 'Calculated - Pending Approval',
  };
}

