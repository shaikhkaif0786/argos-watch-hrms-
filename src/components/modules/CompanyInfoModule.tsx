import React, { useState, useMemo } from 'react';
import {
  Clock,
  Calendar,
  BookOpen,
  Plus,
  Edit3,
  Trash2,
  Search,
  ArrowUpDown,
  Sliders,
  AlertCircle,
  Megaphone,
  IndianRupee,
  Calculator,
  CheckCircle2,
} from 'lucide-react';
import { useHRMS } from '../../context/HRMSContext';
import {
  UserRole,
  HolidayRecord,
  CustomCompanyRule,
  CompanyPolicy,
  WeekdaySchedule,
} from '../../types/hrms';
import {
  StatusIndicator,
  ExportDropdown,
  SlideOverDrawer,
  EmptyState,
  TimePicker,
} from '../ui/EnterpriseComponents';

const TODAY_DATE = '2026-10-06';

export const CompanyInfoModule: React.FC = () => {
  const {
    currentRole,
    currentEmployee,
    settings,
    holidays,
    scopedPolicies,
    announcements,
    updateCompanySettings,
    addHoliday,
    updateHoliday,
    deleteHoliday,
    addOrUpdateCustomRule,
    deleteCustomRule,
    createOrUpdatePolicy,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    addToast,
    hasPermission,
    t,
  } = useHRMS();

  const canManage =
    currentRole === UserRole.ADMIN || currentRole === UserRole.HR;
  const canManageLateDeduction =
    canManage && hasPermission('payroll.manage_late_deduction_settings');

  // Main Section Tabs inside Company Rules & Policies
  const [activeTab, setActiveTab] = useState<
    'policies-rules' | 'announcements' | 'holidays' | 'manage-updates' | 'late-deduction-settings'
  >('policies-rules');

  // Policy Category Tab ("All" + Category Tabs)
  const [selectedPolicyCategory, setSelectedPolicyCategory] = useState<string>('All');
  const [polSearch, setPolSearch] = useState('');
  const [polSort, setPolSort] = useState<'newest' | 'title-asc'>('newest');

  // Holiday Filter & Sort
  const [holSearch, setHolSearch] = useState('');
  const [holTypeFilter, setHolTypeFilter] = useState('All');
  const [holSort, setHolSort] = useState<'date-asc' | 'date-desc' | 'name-asc'>('date-asc');

  // Drawers for Add/Edit Rule, Policy, Holiday, Announcement
  const [holidayDrawerOpen, setHolidayDrawerOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<HolidayRecord | null>(null);
  const [holName, setHolName] = useState('');
  const [holDate, setHolDate] = useState('2026-11-15');
  const [holDay, setHolDay] = useState('Sunday');
  const [holType, setHolType] = useState<HolidayRecord['type']>('National');
  const [holLocations, setHolLocations] = useState('All Units');

  const [ruleDrawerOpen, setRuleDrawerOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<CustomCompanyRule | null>(null);
  const [ruleTitle, setRuleTitle] = useState('');
  const [ruleCategory, setRuleCategory] =
    useState<CustomCompanyRule['category']>('Timing & Shift');
  const [ruleDesc, setRuleDesc] = useState('');
  const [ruleEffective, setRuleEffective] = useState(TODAY_DATE);

  const [policyDrawerOpen, setPolicyDrawerOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<CompanyPolicy | null>(null);
  const [polTitle, setPolTitle] = useState('');
  const [polCategory, setPolCategory] =
    useState<CompanyPolicy['category']>('Attendance');
  const [polVersion, setPolVersion] = useState('v1.0');
  const [polSummary, setPolSummary] = useState('');
  const [polContent, setPolContent] = useState('');

  const [annDrawerOpen, setAnnDrawerOpen] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annCategory, setAnnCategory] = useState('COMPANY_NEWS');
  const [annContent, setAnnContent] = useState('');

  // Local Form State for HR/Admin Update Control Center
  const [workStart, setWorkStart] = useState(settings.workStartTime || '09:30');
  const [workEnd, setWorkEnd] = useState(settings.workEndTime || '18:30');
  const [lunchStartTime, setLunchStartTime] = useState(settings.lunchStartTime || '13:30');
  const [lunchEndTime, setLunchEndTime] = useState(settings.lunchEndTime || '14:15');
  const [lunchDurationMins, setLunchDurationMins] = useState(settings.lunchDurationMinutes || 45);
  const [fullDayWorkingHours, setFullDayWorkingHours] = useState(settings.fullDayWorkingHours || 8.5);
  const [firstHalfStart, setFirstHalfStart] = useState(settings.firstHalfStartTime || '09:30');
  const [firstHalfEnd, setFirstHalfEnd] = useState(settings.firstHalfEndTime || '14:00');
  const [firstHalfHours, setFirstHalfHours] = useState(settings.firstHalfHours || 4.5);
  const [secondHalfStart, setSecondHalfStart] = useState(settings.secondHalfStartTime || '14:00');
  const [secondHalfEnd, setSecondHalfEnd] = useState(settings.secondHalfEndTime || '18:30');
  const [secondHalfHours, setSecondHalfHours] = useState(settings.secondHalfHours || 4.5);
  const [annualLeaveEntitlement, setAnnualLeaveEntitlement] = useState(settings.annualLeaveEntitlement || 35);
  const [graceMins, setGraceMins] = useState(settings.gracePeriodMinutes || 15);
  const [lateCount, setLateCount] = useState(settings.lateArrivalThresholdCount || 3);
  const [lateRuleText, setLateRuleText] = useState(
    settings.lateDeductionRule || '15 minutes grace window (starts after 09:45). Maximum 3 late arrivals allowed per calendar month before disciplinary penalty or wage deduction.'
  );
  const [casualQuota, setCasualQuota] = useState(settings.casualLeaveQuota || 12);
  const [sickQuota, setSickQuota] = useState(settings.sickLeaveQuota || 8);
  const [earnedQuota, setEarnedQuota] = useState(settings.earnedLeaveQuota || 15);
  const [overtimeThreshold, setOvertimeThreshold] = useState<number>(settings.overtimeThresholdHours || 9.5);
  const [ipRestriction, setIpRestriction] = useState<boolean>(Boolean(settings.ipRestrictionEnabled));
  const [weekdaySchedules, setWeekdaySchedules] = useState<WeekdaySchedule[]>(
    settings.weekdaySchedules || [
      { day: 'Monday', isOpen: true, startTime: '09:30', endTime: '18:30', isHalfDay: false, notes: 'Full Day Atelier Shift' },
      { day: 'Tuesday', isOpen: true, startTime: '09:30', endTime: '18:30', isHalfDay: false, notes: 'Full Day Atelier Shift' },
      { day: 'Wednesday', isOpen: true, startTime: '09:30', endTime: '18:30', isHalfDay: false, notes: 'Full Day Atelier Shift' },
      { day: 'Thursday', isOpen: true, startTime: '09:30', endTime: '18:30', isHalfDay: false, notes: 'Full Day Atelier Shift' },
      { day: 'Friday', isOpen: true, startTime: '09:30', endTime: '18:30', isHalfDay: false, notes: 'Full Day Atelier Shift' },
      { day: 'Saturday', isOpen: true, startTime: '10:00', endTime: '16:30', isHalfDay: true, notes: 'Shorter Atelier & Dispatch Hours' },
      { day: 'Sunday', isOpen: false, startTime: '09:30', endTime: '18:30', isHalfDay: false, notes: 'Weekly Off' },
    ]
  );

  // Late Salary Deduction Settings State (Requirement 9)
  const [ldEnabled, setLdEnabled] = useState<boolean>(settings.lateDeductionEnabled !== false);
  const [ldDaysPerMonth, setLdDaysPerMonth] = useState<number>(settings.lateDeductionDaysPerMonth || 26);
  const [ldDailyHours, setLdDailyHours] = useState<number>(settings.lateDeductionDailyWorkingHours || 8);
  const [ldDailyMinutes, setLdDailyMinutes] = useState<number>(
    settings.lateDeductionDailyWorkingMinutes || (settings.lateDeductionDailyWorkingHours || 8) * 60
  );
  const [ldSalaryBasis, setLdSalaryBasis] = useState<'Monthly Gross' | 'Basic Salary' | 'Basic + HRA'>(
    settings.lateDeductionSalaryBasis || 'Monthly Gross'
  );
  const [ldGraceTreatment, setLdGraceTreatment] = useState<string>(
    settings.lateDeductionGraceTreatment || 'After Grace Only'
  );
  const [ldRoundingRule, setLdRoundingRule] = useState<string>(
    settings.lateDeductionRoundingRule || '2 Decimals'
  );
  const [ldEffectiveFrom, setLdEffectiveFrom] = useState<string>(
    settings.lateDeductionEffectiveFrom || '2026-10-01'
  );
  const [ldApplicableScope, setLdApplicableScope] = useState<string>(
    settings.lateDeductionApplicableScope || 'All Employees'
  );
  const [previewMonthlySalary, setPreviewMonthlySalary] = useState<number>(15000);
  const [previewLateMinutes, setPreviewLateMinutes] = useState<number>(20);

  const previewCalc = useMemo(() => {
    const days = Math.max(1, Number(ldDaysPerMonth) || 26);
    const mins = Math.max(1, Number(ldDailyMinutes) || 480);
    const dailySalary = previewMonthlySalary / days;
    const perMinuteRate = dailySalary / mins;
    const rawDeduction = ldEnabled ? previewLateMinutes * perMinuteRate : 0;
    let finalDeduction = Number(rawDeduction.toFixed(2));
    if (ldRoundingRule === 'Nearest Rupee') {
      finalDeduction = Math.round(rawDeduction);
    } else if (ldRoundingRule === 'Round Up') {
      finalDeduction = Math.ceil(rawDeduction);
    }
    return {
      days,
      mins,
      dailySalary,
      perMinuteRate,
      rawDeduction,
      finalDeduction,
    };
  }, [ldDaysPerMonth, ldDailyMinutes, previewMonthlySalary, previewLateMinutes, ldEnabled, ldRoundingRule]);

  // Unified Policies & Rules List with Category Tabs
  const unifiedPoliciesAndRules = useMemo(() => {
    const ruleItems = settings.customRules.map((r) => ({
      id: r.id,
      kind: 'RULE' as const,
      title: r.title,
      category: r.category,
      description: r.description,
      detailContent: '',
      effectiveDate: r.effectiveFrom,
      version: 'Rule',
      rawRule: r,
      rawPolicy: null as CompanyPolicy | null,
    }));

    const policyItems = scopedPolicies.map((p) => ({
      id: p.id,
      kind: 'POLICY' as const,
      title: p.title,
      category: p.category,
      description: p.summary,
      detailContent: p.content,
      effectiveDate: p.effectiveDate,
      version: p.version,
      rawRule: null as CustomCompanyRule | null,
      rawPolicy: p,
    }));

    return [...policyItems, ...ruleItems];
  }, [settings.customRules, scopedPolicies]);

  const policyCategories = useMemo(() => {
    const set = new Set<string>();
    unifiedPoliciesAndRules.forEach((item) => set.add(item.category));
    return ['All', ...Array.from(set)];
  }, [unifiedPoliciesAndRules]);

  const filteredUnifiedPolicies = useMemo(() => {
    const q = polSearch.trim().toLowerCase();
    return unifiedPoliciesAndRules
      .filter((item) => {
        if (
          selectedPolicyCategory !== 'All' &&
          item.category !== selectedPolicyCategory
        ) {
          return false;
        }
        if (
          q &&
          !item.title.toLowerCase().includes(q) &&
          !item.description.toLowerCase().includes(q) &&
          !item.category.toLowerCase().includes(q)
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (polSort === 'title-asc') return a.title.localeCompare(b.title);
        return b.effectiveDate.localeCompare(a.effectiveDate);
      });
  }, [unifiedPoliciesAndRules, selectedPolicyCategory, polSearch, polSort]);

  // Filtered & Sorted Holidays
  const filteredHolidays = useMemo(() => {
    const q = holSearch.trim().toLowerCase();
    return holidays
      .filter((h) => {
        if (holTypeFilter !== 'All' && h.type !== holTypeFilter) return false;
        if (
          q &&
          !h.name.toLowerCase().includes(q) &&
          !h.dayOfWeek.toLowerCase().includes(q) &&
          !h.date.includes(q)
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (holSort === 'date-desc') return b.date.localeCompare(a.date);
        if (holSort === 'name-asc') return a.name.localeCompare(b.name);
        return a.date.localeCompare(b.date);
      });
  }, [holidays, holSearch, holTypeFilter, holSort]);

  const openHolidayModal = (h?: HolidayRecord) => {
    if (h) {
      setEditingHoliday(h);
      setHolName(h.name);
      setHolDate(h.date);
      setHolDay(h.dayOfWeek);
      setHolType(h.type);
      setHolLocations(h.applicableLocations);
    } else {
      setEditingHoliday(null);
      setHolName('');
      setHolDate('2026-11-15');
      setHolDay('Sunday');
      setHolType('National');
      setHolLocations('All Units');
    }
    setHolidayDrawerOpen(true);
  };

  const openRuleModal = (rule?: CustomCompanyRule) => {
    if (rule) {
      setEditingRule(rule);
      setRuleTitle(rule.title);
      setRuleCategory(rule.category);
      setRuleDesc(rule.description);
      setRuleEffective(rule.effectiveFrom);
    } else {
      setEditingRule(null);
      setRuleTitle('');
      setRuleCategory('Timing & Shift');
      setRuleDesc('');
      setRuleEffective(TODAY_DATE);
    }
    setRuleDrawerOpen(true);
  };

  const openPolicyModal = (pol?: CompanyPolicy) => {
    if (pol) {
      setEditingPolicy(pol);
      setPolTitle(pol.title);
      setPolCategory(pol.category);
      setPolVersion(pol.version);
      setPolSummary(pol.summary);
      setPolContent(pol.content);
    } else {
      setEditingPolicy(null);
      setPolTitle('');
      setPolCategory('Attendance');
      setPolVersion('v1.0');
      setPolSummary('');
      setPolContent('');
    }
    setPolicyDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Clean Single Box Heading: "Rules & Policies" */}
      <div className="bg-white border border-[#CBCBCB] rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-md bg-[#4E1617]/10 border border-[#4E1617]/30 text-[#4E1617] text-[10px] font-bold uppercase tracking-wider">
            Enterprise Operations
          </span>
          <h1 className="text-xl font-bold text-[#141A17] tracking-tight mt-1">
            Rules & Policies
          </h1>
          <p className="text-xs text-[#525854] mt-0.5">
            Configure shifts, timings, lunch breaks, late grace rules, and annual leave quotas
          </p>
        </div>

        {canManage && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => openPolicyModal()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#164C38] rounded-lg hover:bg-[#0F3627] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Policy</span>
            </button>
            <button
              type="button"
              onClick={() => openRuleModal()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#141A17] bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg hover:bg-[#CBCBCB] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Rule</span>
            </button>
            <button
              type="button"
              onClick={() => setAnnDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#4E1617] bg-[#4E1617]/10 border border-[#4E1617]/30 rounded-lg hover:bg-[#4E1617]/20 cursor-pointer"
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>Post Announcement</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Section Switcher: Policies & Rules | Announcements | Holidays | HR Control Center */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 p-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-xl w-full sm:w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('policies-rules')}
          className={`w-full sm:w-auto px-4 py-2.5 sm:py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-between sm:justify-center gap-2 ${
            activeTab === 'policies-rules'
              ? 'bg-[#164C38] text-[#F2F2F2]'
              : 'bg-white sm:bg-transparent text-[#141A17] hover:text-[#164C38]'
          }`}
        >
          <span>Policies & Rules</span>
          <span className="font-mono text-[11px] opacity-90">({unifiedPoliciesAndRules.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('announcements')}
          className={`w-full sm:w-auto px-4 py-2.5 sm:py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-between sm:justify-center gap-2 ${
            activeTab === 'announcements'
              ? 'bg-[#164C38] text-[#F2F2F2]'
              : 'bg-white sm:bg-transparent text-[#141A17] hover:text-[#164C38]'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Megaphone className="w-3.5 h-3.5" />
            <span>Announcements</span>
          </span>
          <span className="font-mono text-[11px] opacity-90">({announcements.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('holidays')}
          className={`w-full sm:w-auto px-4 py-2.5 sm:py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-between sm:justify-center gap-2 ${
            activeTab === 'holidays'
              ? 'bg-[#164C38] text-[#F2F2F2]'
              : 'bg-white sm:bg-transparent text-[#141A17] hover:text-[#164C38]'
          }`}
        >
          <span>Holidays</span>
          <span className="font-mono text-[11px] opacity-90">({holidays.length})</span>
        </button>
        {canManage && (
          <button
            type="button"
            onClick={() => setActiveTab('manage-updates')}
            className={`w-full sm:w-auto px-4 py-2.5 sm:py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-between sm:justify-center gap-1.5 ${
              activeTab === 'manage-updates'
                ? 'bg-[#4E1617] text-white'
                : 'bg-white sm:bg-transparent text-[#4E1617] hover:bg-[#CBCBCB]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Rules & Policies Settings</span>
          </button>
        )}
        {canManageLateDeduction && (
          <button
            type="button"
            onClick={() => setActiveTab('late-deduction-settings')}
            className={`w-full sm:w-auto px-4 py-2.5 sm:py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-between sm:justify-center gap-1.5 ${
              activeTab === 'late-deduction-settings'
                ? 'bg-[#164C38] text-[#F2F2F2]'
                : 'bg-white sm:bg-transparent text-[#164C38] hover:bg-[#CBCBCB]'
            }`}
          >
            <IndianRupee className="w-3.5 h-3.5" />
            <span>{t('lateDeduction.title', 'Late Salary Deduction Settings')}</span>
          </button>
        )}
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: POLICIES & RULES WITH CATEGORY TABS ("All" + Categories)       */}
      {/* ===================================================================== */}
      {activeTab === 'policies-rules' && (
        <div className="space-y-5">
          {/* Quick Summary Strip of Shift Timings & Quotas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            <div className="bg-white border border-[#CBCBCB] rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#164C38]">
                  Full-Day Shift Timing
                </span>
                <Clock className="w-4 h-4 text-[#164C38]" />
              </div>
              <p className="text-xl font-bold font-mono text-[#141A17] mt-1.5">
                {settings.workStartTime} – {settings.workEndTime}
              </p>
              <p className="text-[11px] text-[#525854] mt-1">
                Lunch: {settings.lunchBreakWindow} · {settings.fullDayHoursThreshold}h Full Day
              </p>
            </div>

            <div className="bg-white border border-[#CBCBCB] rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#164C38]">
                  Half-Day Timings
                </span>
                <Clock className="w-4 h-4 text-[#164C38]" />
              </div>
              <p className="text-xs font-mono font-bold text-[#141A17] mt-2">
                1st Half: {settings.firstHalfTiming}
              </p>
              <p className="text-xs font-mono font-bold text-[#141A17] mt-0.5">
                2nd Half: {settings.secondHalfTiming}
              </p>
            </div>

            <div className="bg-white border border-[#CBCBCB] rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#4E1617]">
                  Late Coming Rule
                </span>
                <AlertCircle className="w-4 h-4 text-[#4E1617]" />
              </div>
              <p className="text-xl font-bold font-mono text-[#141A17] mt-1.5">
                {settings.gracePeriodMinutes}m Grace
              </p>
              <p className="text-[11px] text-[#525854] mt-1">
                Max {settings.lateArrivalThresholdCount} late marks/mo
              </p>
            </div>

            <div className="bg-white border border-[#CBCBCB] rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#164C38]">
                  Annual Leave Entitlement
                </span>
                <Calendar className="w-4 h-4 text-[#164C38]" />
              </div>
              <p className="text-xl font-bold font-mono text-[#141A17] mt-1.5">
                {settings.casualLeaveQuota +
                  settings.sickLeaveQuota +
                  settings.earnedLeaveQuota}{' '}
                Days / Yr
              </p>
              <p className="text-[11px] text-[#525854] mt-1">
                CL: {settings.casualLeaveQuota} · SL: {settings.sickLeaveQuota} · EL: {settings.earnedLeaveQuota}
              </p>
            </div>
          </div>

          {/* Weekly Working Days & Hours Preview */}
          <div className="bg-white border border-[#CBCBCB] rounded-xl p-4">
            <div className="flex items-center justify-between border-b border-[#CBCBCB] pb-2 mb-3">
              <span className="text-xs font-bold text-[#141A17] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#164C38]" />
                Official Argos Weekly Schedule
              </span>
              <span className="text-[11px] font-mono font-bold text-[#164C38]">
                Mon–Fri Full Days · Sat Shorter Hours · Sun Off
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-7 gap-2 text-center text-xs">
              {(settings.weekdaySchedules || [
                { day: 'Monday', isOpen: true, startTime: '09:30', endTime: '18:30', isHalfDay: false },
                { day: 'Tuesday', isOpen: true, startTime: '09:30', endTime: '18:30', isHalfDay: false },
                { day: 'Wednesday', isOpen: true, startTime: '09:30', endTime: '18:30', isHalfDay: false },
                { day: 'Thursday', isOpen: true, startTime: '09:30', endTime: '18:30', isHalfDay: false },
                { day: 'Friday', isOpen: true, startTime: '09:30', endTime: '18:30', isHalfDay: false },
                { day: 'Saturday', isOpen: true, startTime: '10:00', endTime: '16:30', isHalfDay: true },
                { day: 'Sunday', isOpen: false, startTime: '09:30', endTime: '18:30', isHalfDay: false },
              ]).map((ws) => (
                <div
                  key={ws.day}
                  className={`p-2.5 rounded-lg border ${
                    ws.isOpen
                      ? ws.isHalfDay
                        ? 'bg-amber-50/50 border-amber-200'
                        : 'bg-[#F2F2F2] border-[#CBCBCB]'
                      : 'bg-white border-[#CBCBCB]/60 text-[#86868B]'
                  }`}
                >
                  <span className="font-bold text-[11px] block text-[#141A17]">{ws.day}</span>
                  {ws.isOpen ? (
                    <span className="font-mono text-[10px] font-bold text-[#164C38] block mt-0.5">
                      {ws.startTime}–{ws.endTime}
                    </span>
                  ) : (
                    <span className="text-[10px] text-[#86868B] block mt-0.5">Off</span>
                  )}
                  <span className="text-[9px] uppercase tracking-wider block text-[#525854] mt-0.5">
                    {ws.isOpen ? (ws.isHalfDay ? 'Half Day' : 'Working') : 'Closed'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Policy Tabs by Category + "All" Tab (Stacked Vertically on Mobile) */}
          <div className="bg-white border border-[#CBCBCB] rounded-xl p-4 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 border-b border-[#CBCBCB] pb-4">
              {/* Category Tabs — Vertically Stacked on Mobile, Horizontal Wrap on Tablet/Desktop */}
              <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 w-full lg:w-auto">
                {policyCategories.map((cat) => {
                  const catCount =
                    cat === 'All'
                      ? unifiedPoliciesAndRules.length
                      : unifiedPoliciesAndRules.filter((i) => i.category === cat).length;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedPolicyCategory(cat)}
                      className={`w-full sm:w-auto px-3.5 py-2.5 sm:py-1.5 rounded-xl sm:rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-between sm:justify-center gap-2 ${
                        selectedPolicyCategory === cat
                          ? 'bg-[#164C38] text-[#F2F2F2]'
                          : 'bg-[#F2F2F2] text-[#525854] hover:text-[#141A17] border border-[#CBCBCB]/60'
                      }`}
                    >
                      <span>{cat}</span>
                      <span
                        className={`px-2 py-0.5 rounded-md font-mono text-[10px] ${
                          selectedPolicyCategory === cat
                            ? 'bg-white/20 text-white'
                            : 'bg-white text-[#141A17]'
                        }`}
                      >
                        {catCount}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Search & Sort — Full-Width Stacked on Mobile */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
                <div className="relative w-full sm:w-56">
                  <Search className="w-3.5 h-3.5 text-[#525854] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={polSearch}
                    onChange={(e) => setPolSearch(e.target.value)}
                    placeholder="Search policies & rules..."
                    className="w-full pl-8 pr-3 py-2 text-xs bg-[#F2F2F2] border border-[#CBCBCB] rounded-xl sm:rounded-lg"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-xl sm:rounded-lg text-xs w-full sm:w-auto">
                  <ArrowUpDown className="w-3.5 h-3.5 text-[#525854] shrink-0" />
                  <select
                    value={polSort}
                    onChange={(e) => setPolSort(e.target.value as any)}
                    className="w-full sm:w-auto bg-transparent text-xs font-medium text-[#141A17] focus:outline-none"
                  >
                    <option value="newest">Sort: Newest</option>
                    <option value="title-asc">Sort: Title (A–Z)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Unified Policy & Rule Cards (Vertically Stacked One Below Another) */}
            {filteredUnifiedPolicies.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#525854]">
                No policies or rules found in this category.
              </div>
            ) : (
              <div
                className={
                  !canManage
                    ? 'grid grid-cols-1 gap-3.5'
                    : 'grid grid-cols-1 md:grid-cols-2 gap-4'
                }
              >
                {filteredUnifiedPolicies.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 sm:p-5 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB] flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="px-2.5 py-0.5 rounded bg-[#164C38]/10 text-[#164C38] border border-[#164C38]/30 text-[10px] font-bold uppercase">
                          {item.category}
                        </span>
                        <span className="font-mono text-[11px] text-[#525854]">
                          Effective: {item.effectiveDate}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-[#141A17]">
                        {item.title}
                      </h3>
                      <p className="text-xs text-[#525854] leading-relaxed">
                        {item.description}
                      </p>
                      {item.detailContent &&
                        item.detailContent !== item.description && (
                          <div className="p-3 rounded-lg bg-white border border-[#CBCBCB] text-xs text-[#141A17] leading-relaxed">
                            {item.detailContent}
                          </div>
                        )}
                    </div>

                    {canManage && (
                      <div className="pt-2.5 border-t border-[#CBCBCB] flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (item.kind === 'RULE' && item.rawRule) {
                              openRuleModal(item.rawRule);
                            } else if (item.kind === 'POLICY' && item.rawPolicy) {
                              openPolicyModal(item.rawPolicy);
                            }
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#141A17] bg-white border border-[#CBCBCB] rounded-lg hover:bg-[#CBCBCB] cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        {item.kind === 'RULE' && (
                          <button
                            type="button"
                            onClick={() => deleteCustomRule(item.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#4E1617] bg-[#4E1617]/10 border border-[#4E1617]/30 rounded-lg hover:bg-[#4E1617]/20 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: ANNOUNCEMENTS (UNDER COMPANY RULES & POLICIES)                 */}
      {/* ===================================================================== */}
      {activeTab === 'announcements' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#CBCBCB] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-[#141A17]">
                Argos Watch Company Announcements ({announcements.length})
              </h2>
              <p className="text-xs text-[#525854]">
                Official company notices, schedule updates, and circulars
              </p>
            </div>
            {canManage && (
              <button
                type="button"
                onClick={() => {
                  setAnnTitle('');
                  setAnnContent('');
                  setAnnDrawerOpen(true);
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#164C38] rounded-lg hover:bg-[#0F3627] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Announcement</span>
              </button>
            )}
          </div>

          <div className="space-y-3">
            {announcements.map((ann: any) => (
              <div
                key={ann.id}
                className="bg-white border border-[#CBCBCB] rounded-xl p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-[#4E1617]/10 text-[#4E1617] border border-[#4E1617]/30 text-[10px] font-bold uppercase">
                      {ann.category || 'ANNOUNCEMENT'}
                    </span>
                    <span className="text-[11px] font-mono text-[#525854]">
                      {ann.date || ann.publishDate} · By {ann.author}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-[#141A17]">{ann.title}</h3>
                  <p className="text-xs text-[#525854] leading-relaxed">
                    {ann.content || ann.description || ann.body}
                  </p>
                </div>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => deleteAnnouncement(ann.id)}
                    className="px-2.5 py-1 text-xs font-medium text-[#4E1617] bg-[#4E1617]/10 border border-[#4E1617]/30 rounded-lg hover:bg-[#4E1617]/20 shrink-0 cursor-pointer"
                  >
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: OFFICIAL HOLIDAY CALENDAR                                      */}
      {/* ===================================================================== */}
      {activeTab === 'holidays' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#CBCBCB] rounded-xl p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 text-[#525854] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={holSearch}
                  onChange={(e) => setHolSearch(e.target.value)}
                  placeholder="Search holiday or date..."
                  className="w-full pl-8 pr-3 py-2 text-xs bg-[#F2F2F2] border border-[#CBCBCB] rounded-xl sm:rounded-lg"
                />
              </div>
              <select
                value={holTypeFilter}
                onChange={(e) => setHolTypeFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 text-xs bg-[#F2F2F2] border border-[#CBCBCB] rounded-xl sm:rounded-lg text-[#141A17]"
              >
                <option value="All">All Holiday Types</option>
                <option value="National">National</option>
                <option value="Regional">Regional</option>
                <option value="Company Special">Company Special</option>
              </select>
            </div>

            {canManage && (
              <button
                type="button"
                onClick={() => openHolidayModal()}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#164C38] rounded-lg hover:bg-[#0F3627] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add New Holiday</span>
              </button>
            )}
          </div>

          <div className="bg-white border border-[#CBCBCB] rounded-xl overflow-hidden">
            {/* Mobile Vertical Card List for Holidays */}
            <div className="md:hidden divide-y divide-[#CBCBCB]/60">
              {filteredHolidays.map((h) => (
                <div key={h.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-[#141A17]">{h.name}</p>
                      <p className="text-xs font-mono font-semibold text-[#164C38] mt-0.5">
                        {h.date} · {h.dayOfWeek}
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-md bg-[#F2F2F2] border border-[#CBCBCB] text-[#141A17] font-medium text-[11px] shrink-0">
                      {h.type}
                    </span>
                  </div>
                  {canManage && (
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => openHolidayModal(h)}
                        className="px-3 py-1.5 text-xs font-medium text-[#141A17] bg-white border border-[#CBCBCB] rounded-lg"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteHoliday(h.id)}
                        className="px-3 py-1.5 text-xs font-medium text-[#4E1617] bg-[#4E1617]/10 border border-[#4E1617]/30 rounded-lg"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#CBCBCB] text-[11px] font-semibold text-[#525854] bg-[#F2F2F2]">
                    <th className="py-3 px-6">Holiday Occasion</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Day</th>
                    <th className="py-3 px-4">Category</th>
                    {canManage && <th className="py-3 px-6 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#CBCBCB] text-xs">
                  {filteredHolidays.map((h) => (
                    <tr key={h.id} className="hover:bg-[#F2F2F2]">
                      <td className="py-3.5 px-6 font-semibold text-[#141A17]">{h.name}</td>
                      <td className="py-3.5 px-4 font-mono font-medium text-[#164C38]">{h.date}</td>
                      <td className="py-3.5 px-4 text-[#525854]">{h.dayOfWeek}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-md bg-[#F2F2F2] text-[#141A17] font-medium text-[11px]">
                          {h.type}
                        </span>
                      </td>
                      {canManage && (
                        <td className="py-3.5 px-6 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openHolidayModal(h)}
                              className="px-2.5 py-1 text-xs font-medium text-[#141A17] bg-white border border-[#CBCBCB] rounded-lg"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteHoliday(h.id)}
                              className="px-2.5 py-1 text-xs font-medium text-[#4E1617] bg-[#4E1617]/10 border border-[#4E1617]/30 rounded-lg"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: HR & ADMIN TIMING & POLICY UPDATE CONTROL CENTER               */}
      {/* ===================================================================== */}
      {activeTab === 'manage-updates' && canManage && (
        <div className="space-y-6">
          {/* Weekday Working Schedule (Mon-Sun) */}
          <div className="bg-white border border-[#CBCBCB] rounded-xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#CBCBCB] pb-3">
              <div>
                <h2 className="text-sm font-bold text-[#141A17]">
                  1. Weekly Working Schedules (Per-Day Working Hours & Time Pickers)
                </h2>
                <p className="text-xs text-[#525854] mt-0.5">
                  Monday–Friday regular atelier hours, Saturday shorter half-day schedule, and Sunday weekly off.
                </p>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 bg-[#164C38]/10 text-[#164C38] rounded-md font-bold">
                Mon–Fri (09:30–18:30) · Sat (10:00–16:30) · Sun (Off)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
              {weekdaySchedules.map((ws, idx) => (
                <div
                  key={ws.day}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-3 transition-colors ${
                    ws.isOpen
                      ? ws.isHalfDay
                        ? 'bg-amber-50/50 border-amber-200'
                        : 'bg-white border-[#CBCBCB]'
                      : 'bg-[#F2F2F2] border-[#CBCBCB]/60 opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#141A17]">{ws.day}</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ws.isOpen}
                        onChange={(e) => {
                          const updated = [...weekdaySchedules];
                          updated[idx] = { ...updated[idx], isOpen: e.target.checked };
                          setWeekdaySchedules(updated);
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-[#CBCBCB] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#164C38]"></div>
                    </label>
                  </div>

                  {ws.isOpen ? (
                    <div className="space-y-2 text-xs">
                      <TimePicker
                        label="Punch In"
                        value={ws.startTime}
                        onChange={(val) => {
                          const updated = [...weekdaySchedules];
                          updated[idx] = { ...updated[idx], startTime: val };
                          setWeekdaySchedules(updated);
                        }}
                      />
                      <TimePicker
                        label="Punch Out"
                        value={ws.endTime}
                        onChange={(val) => {
                          const updated = [...weekdaySchedules];
                          updated[idx] = { ...updated[idx], endTime: val };
                          setWeekdaySchedules(updated);
                        }}
                      />
                      <label className="flex items-center gap-1.5 text-[11px] font-medium text-[#525854] cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={Boolean(ws.isHalfDay)}
                          onChange={(e) => {
                            const updated = [...weekdaySchedules];
                            updated[idx] = { ...updated[idx], isHalfDay: e.target.checked };
                            setWeekdaySchedules(updated);
                          }}
                          className="rounded text-[#164C38]"
                        />
                        <span>Shorter / Half Day</span>
                      </label>
                    </div>
                  ) : (
                    <div className="py-6 text-center text-xs font-semibold text-[#525854]">
                      Weekly Off
                    </div>
                  )}

                  <span className="text-[10px] text-[#525854] block truncate">
                    {ws.notes || (ws.isOpen ? (ws.isHalfDay ? 'Shorter Shift' : 'Regular Shift') : 'Closed')}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  updateCompanySettings({
                    weekdaySchedules,
                    workStartTime: weekdaySchedules[0]?.startTime || '09:30',
                    workEndTime: weekdaySchedules[0]?.endTime || '18:30',
                  });
                  addToast('Weekly Schedule Saved', 'Updated working hours and day schedules.', 'success');
                }}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-[#164C38] rounded-lg hover:bg-[#0F3627] cursor-pointer"
              >
                Save Weekly Working Schedules
              </button>
            </div>
          </div>

          {/* Comprehensive Enterprise Rules & Policies Configuration Panel */}
          <div className="bg-white border border-[#CBCBCB] rounded-xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#CBCBCB] pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#164C38]/10 text-[#164C38] border border-[#164C38]/30">
                  Mandatory Enterprise Configuration
                </span>
                <h2 className="text-base font-bold text-[#141A17] mt-1">
                  Working Hours, Lunch Break, Late Coming & Leave Policy Settings
                </h2>
                <p className="text-xs text-[#525854] mt-0.5">
                  Configure real enterprise thresholds that govern daily attendance calculations, penalty deductions, and leave quotas.
                </p>
              </div>
              {settings.updatedAt && (
                <div className="text-right text-[11px] text-[#525854] shrink-0 font-mono">
                  <span>Last Saved: {settings.updatedAt.slice(0, 10)}</span>
                  {settings.updatedBy && <span className="block text-[#141A17] font-sans font-semibold">By {settings.updatedBy}</span>}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* SECTION A: Full-Day Working Hours */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    A. Full-Day Working Hours & Lunch Break
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                    Effective: {fullDayWorkingHours} hrs
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Full-Day Shift Start
                    </label>
                    <input
                      type="text"
                      value={workStart}
                      onChange={(e) => setWorkStart(e.target.value)}
                      placeholder="09:30"
                      className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg font-mono text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Full-Day Shift End
                    </label>
                    <input
                      type="text"
                      value={workEnd}
                      onChange={(e) => setWorkEnd(e.target.value)}
                      placeholder="18:30"
                      className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg font-mono text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Lunch Break Window
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={lunchStartTime}
                        onChange={(e) => setLunchStartTime(e.target.value)}
                        placeholder="13:30"
                        className="w-full px-2 py-1.5 bg-white border border-[#CBCBCB] rounded-lg font-mono text-xs"
                      />
                      <span className="text-slate-400">to</span>
                      <input
                        type="text"
                        value={lunchEndTime}
                        onChange={(e) => setLunchEndTime(e.target.value)}
                        placeholder="14:15"
                        className="w-full px-2 py-1.5 bg-white border border-[#CBCBCB] rounded-lg font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Lunch Duration (Mins)
                    </label>
                    <input
                      type="number"
                      value={lunchDurationMins}
                      onChange={(e) => setLunchDurationMins(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg font-mono text-xs"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Unpaid non-working break
                    </span>
                  </div>

                  <div className="col-span-2">
                    <label className="block font-medium text-slate-700 mb-1">
                      Effective Full-Day Working Hours
                    </label>
                    <input
                      type="number"
                      step="0.25"
                      value={fullDayWorkingHours}
                      onChange={(e) => setFullDayWorkingHours(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg font-mono text-xs font-bold text-slate-900"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      09:30 to 18:30 (9.0 hrs total duration) minus 45 mins lunch = 8.5 effective working hours.
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION B: Half-Day Working Hours */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    B. Half-Day Working Hours
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">
                    4.5 hrs / Session
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      First Half Shift Timing (09:30 – 14:00)
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={firstHalfStart}
                        onChange={(e) => setFirstHalfStart(e.target.value)}
                        placeholder="09:30"
                        className="px-2.5 py-1.5 bg-white border border-[#CBCBCB] rounded-lg font-mono text-xs"
                      />
                      <input
                        type="text"
                        value={firstHalfEnd}
                        onChange={(e) => setFirstHalfEnd(e.target.value)}
                        placeholder="14:00"
                        className="px-2.5 py-1.5 bg-white border border-[#CBCBCB] rounded-lg font-mono text-xs"
                      />
                      <div className="flex items-center gap-1 font-mono text-[11px] text-slate-700 font-semibold px-2 py-1 bg-white rounded-lg border border-slate-200">
                        <span>{firstHalfHours} hrs</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Second Half Shift Timing (14:00 – 18:30)
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={secondHalfStart}
                        onChange={(e) => setSecondHalfStart(e.target.value)}
                        placeholder="14:00"
                        className="px-2.5 py-1.5 bg-white border border-[#CBCBCB] rounded-lg font-mono text-xs"
                      />
                      <input
                        type="text"
                        value={secondHalfEnd}
                        onChange={(e) => setSecondHalfEnd(e.target.value)}
                        placeholder="18:30"
                        className="px-2.5 py-1.5 bg-white border border-[#CBCBCB] rounded-lg font-mono text-xs"
                      />
                      <div className="flex items-center gap-1 font-mono text-[11px] text-slate-700 font-semibold px-2 py-1 bg-white rounded-lg border border-slate-200">
                        <span>{secondHalfHours} hrs</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-200">
                    Half-day leave or late arrival past second half deducts accordingly from shift duration.
                  </p>
                </div>
              </div>

              {/* SECTION C: Late Coming Rules */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    C. Late Coming Rules & Threshold
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                    Grace: {graceMins}m · Max: {lateCount}/mo
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Grace Period (Minutes) *
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={60}
                      value={graceMins}
                      onChange={(e) => setGraceMins(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg font-mono text-xs font-bold text-slate-900"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Late mark starts after 09:45
                    </span>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Monthly Late Threshold *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={lateCount}
                      onChange={(e) => setLateCount(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg font-mono text-xs font-bold text-slate-900"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Maximum 3 late marks allowed per month
                    </span>
                  </div>

                  <div className="col-span-2">
                    <label className="block font-medium text-slate-700 mb-1">
                      Late Policy Statement
                    </label>
                    <textarea
                      rows={2}
                      value={lateRuleText}
                      onChange={(e) => setLateRuleText(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION D: Annual Leave Entitlement */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    D. Annual Leave Entitlement
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold">
                    Total: {annualLeaveEntitlement} Days/Yr
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Configurable Annual Leave Entitlement (Days / Year) *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={annualLeaveEntitlement}
                      onChange={(e) => setAnnualLeaveEntitlement(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg font-mono text-xs font-bold text-purple-900"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Standard enterprise annual leave entitlement is configured to 35 days per calendar year.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Casual (CL)</label>
                      <input
                        type="number"
                        value={casualQuota}
                        onChange={(e) => setCasualQuota(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-white border border-[#CBCBCB] rounded-lg font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Sick (SL)</label>
                      <input
                        type="number"
                        value={sickQuota}
                        onChange={(e) => setSickQuota(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-white border border-[#CBCBCB] rounded-lg font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Earned (EL)</label>
                      <input
                        type="number"
                        value={earnedQuota}
                        onChange={(e) => setEarnedQuota(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-white border border-[#CBCBCB] rounded-lg font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Save All Rules Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-[#CBCBCB]">
              <span className="text-xs text-[#525854]">
                Changes take effect immediately across all shifts, attendance logs, penalty calculations, and leave registers.
              </span>
              <button
                type="button"
                onClick={() => {
                  updateCompanySettings({
                    workStartTime: workStart,
                    workEndTime: workEnd,
                    lunchStartTime,
                    lunchEndTime,
                    lunchDurationMinutes: Number(lunchDurationMins),
                    fullDayWorkingHours: Number(fullDayWorkingHours),
                    fullDayHoursThreshold: Number(fullDayWorkingHours),
                    firstHalfStartTime: firstHalfStart,
                    firstHalfEndTime: firstHalfEnd,
                    firstHalfHours: Number(firstHalfHours),
                    secondHalfStartTime: secondHalfStart,
                    secondHalfEndTime: secondHalfEnd,
                    secondHalfHours: Number(secondHalfHours),
                    gracePeriodMinutes: Number(graceMins),
                    lateArrivalThresholdCount: Number(lateCount),
                    lateDeductionRule: lateRuleText,
                    annualLeaveEntitlement: Number(annualLeaveEntitlement),
                    casualLeaveQuota: Number(casualQuota),
                    sickLeaveQuota: Number(sickQuota),
                    earnedLeaveQuota: Number(earnedQuota),
                    overtimeThresholdHours: Number(overtimeThreshold),
                    ipRestrictionEnabled: ipRestriction,
                    updatedAt: new Date().toISOString(),
                    updatedBy: currentEmployee.fullName,
                  });
                  addToast(
                    'Rules & Policies Saved',
                    `Shift timings (09:30–18:30), Lunch (13:30–14:15, 45m), Grace (${graceMins}m), and Annual Leave (${annualLeaveEntitlement}d) persisted.`,
                    'success'
                  );
                }}
                className="px-6 py-2.5 text-xs font-bold text-white bg-[#164C38] rounded-xl hover:bg-[#0F3627] cursor-pointer shadow-xs transition-colors shrink-0"
              >
                Save Rules & Policies Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 5: LATE SALARY DEDUCTION SETTINGS (REQUIREMENT 9)                 */}
      {/* ===================================================================== */}
      {activeTab === 'late-deduction-settings' && canManageLateDeduction && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-white border border-[#CBCBCB] rounded-2xl p-6 space-y-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#CBCBCB] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-[#164C38]/10 border border-[#164C38]/30 text-[#164C38] text-[10px] font-bold uppercase tracking-wider">
                    Payroll Precision Formula
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      ldEnabled
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}
                  >
                    {ldEnabled ? 'Active' : 'Disabled'}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-[#141A17] mt-1">
                  {t('lateDeduction.title', 'Late Salary Deduction Settings')}
                </h2>
                <p className="text-xs text-[#525854] mt-0.5">
                  {t(
                    'lateDeduction.subtitle',
                    'Configure per-minute salary deduction formula (Monthly Salary ÷ Calculation Days ÷ Daily Working Minutes × Chargeable Late Minutes)'
                  )}
                </p>
              </div>

              <label className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB] cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={ldEnabled}
                  onChange={(e) => setLdEnabled(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#164C38]"
                />
                <span className="text-xs font-bold text-[#141A17]">
                  {t('lateDeduction.enabled', 'Enable Per-Minute Late Salary Deduction')}
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left 7 Columns: Formula Configuration Controls */}
              <div className="lg:col-span-7 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-[#141A17] mb-1">
                      {t('lateDeduction.daysPerMonth', 'Calculation Days per Month')}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={ldDaysPerMonth}
                      onChange={(e) => setLdDaysPerMonth(Number(e.target.value) || 26)}
                      className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg font-mono text-sm font-bold text-[#164C38]"
                    />
                    <span className="text-[10px] text-[#525854] mt-0.5 block">
                      Default: 26 working days
                    </span>
                  </div>

                  <div>
                    <label className="block font-bold text-[#141A17] mb-1">
                      {t('lateDeduction.dailyHours', 'Daily Working Hours')}
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min={1}
                      max={24}
                      value={ldDailyHours}
                      onChange={(e) => {
                        const hrs = Number(e.target.value) || 8;
                        setLdDailyHours(hrs);
                        setLdDailyMinutes(Math.round(hrs * 60));
                      }}
                      className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg font-mono text-sm font-bold text-[#164C38]"
                    />
                    <span className="text-[10px] text-[#525854] mt-0.5 block">
                      Default: 8 hours / day
                    </span>
                  </div>

                  <div>
                    <label className="block font-bold text-[#141A17] mb-1">
                      {t('lateDeduction.dailyMinutes', 'Daily Working Minutes')}
                    </label>
                    <input
                      type="number"
                      min={60}
                      max={1440}
                      value={ldDailyMinutes}
                      onChange={(e) => setLdDailyMinutes(Number(e.target.value) || 480)}
                      className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg font-mono text-sm font-bold text-[#141A17]"
                    />
                    <span className="text-[10px] text-[#525854] mt-0.5 block">
                      Auto-calculated ({ldDailyHours}h × 60 = {ldDailyHours * 60}m)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
                  <div>
                    <label className="block font-bold text-[#141A17] mb-1">
                      {t('lateDeduction.salaryBasis', 'Salary Basis')}
                    </label>
                    <select
                      value={ldSalaryBasis}
                      onChange={(e) => setLdSalaryBasis(e.target.value as any)}
                      className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg font-semibold text-[#141A17]"
                    >
                      <option value="Monthly Gross">Monthly Gross Salary</option>
                      <option value="Basic Salary">Basic Salary Only</option>
                      <option value="Basic + HRA">Basic + HRA</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-[#141A17] mb-1">
                      {t('lateDeduction.graceTreatment', 'Grace-Period Treatment')}
                    </label>
                    <select
                      value={ldGraceTreatment}
                      onChange={(e) => setLdGraceTreatment(e.target.value as any)}
                      className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg font-semibold text-[#141A17]"
                    >
                      <option value="After Grace Only">
                        Deduct Only Minutes Beyond Grace Window ({settings.gracePeriodMinutes}m)
                      </option>
                      <option value="From Shift Start">
                        Deduct Total Minutes From Scheduled Shift Start ({settings.workStartTime})
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-[#141A17] mb-1">
                      {t('lateDeduction.roundingRule', 'Monetary Rounding Rule')}
                    </label>
                    <select
                      value={ldRoundingRule}
                      onChange={(e) => setLdRoundingRule(e.target.value as any)}
                      className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg font-semibold text-[#141A17]"
                    >
                      <option value="2 Decimals">Exact 2 Decimal Places (e.g., ₹24.04)</option>
                      <option value="Nearest Rupee">Round to Nearest Rupee (₹24)</option>
                      <option value="Round Up">Ceiling / Round Up to Next Rupee (₹25)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-[#141A17] mb-1">
                      {t('lateDeduction.effectiveFrom', 'Effective From Date')}
                    </label>
                    <input
                      type="date"
                      value={ldEffectiveFrom}
                      onChange={(e) => setLdEffectiveFrom(e.target.value)}
                      className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg font-mono text-xs font-semibold text-[#141A17]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-[#141A17] mb-1">
                      {t('lateDeduction.scope', 'Applicable Employee Scope')}
                    </label>
                    <select
                      value={ldApplicableScope}
                      onChange={(e) => setLdApplicableScope(e.target.value as any)}
                      className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg font-semibold text-[#141A17]"
                    >
                      <option value="All Employees">All Employees</option>
                      <option value="Confirmed Staff Only">Confirmed Staff Only</option>
                      <option value="Exclude Management">Exclude Management & Directors</option>
                    </select>
                  </div>
                </div>

                {/* Formula Reference Box */}
                <div className="p-4 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB] space-y-2 text-xs">
                  <div className="font-bold text-[#164C38] uppercase tracking-wider text-[11px]">
                    Active Formula Definition
                  </div>
                  <div className="font-mono text-[11px] space-y-1 text-[#141A17]">
                    <div>1. Daily Salary = Monthly Salary ({ldSalaryBasis}) ÷ {ldDaysPerMonth} Days</div>
                    <div>2. Per-Minute Rate = Daily Salary ÷ {ldDailyMinutes} Minutes ({ldDailyHours} Hours × 60)</div>
                    <div>3. Late Deduction = Chargeable Late Minutes × Per-Minute Rate</div>
                  </div>
                </div>
              </div>

              {/* Right 5 Columns: Live Interactive Calculation Preview */}
              <div className="lg:col-span-5 bg-[#164C38] text-[#F2F2F2] rounded-2xl p-5 space-y-4 flex flex-col justify-between shadow-sm">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/15 pb-3">
                    <div className="flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-emerald-300" />
                      <h3 className="text-sm font-bold">
                        {t('lateDeduction.previewTitle', 'Live Calculation Preview')}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewMonthlySalary(15000);
                        setPreviewLateMinutes(20);
                      }}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/15 hover:bg-white/25 text-white cursor-pointer"
                    >
                      Reset to ₹15,000 / 20m Example
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-emerald-200 mb-1">
                        Sample Monthly Salary (₹)
                      </label>
                      <input
                        type="number"
                        min={1000}
                        step={500}
                        value={previewMonthlySalary}
                        onChange={(e) => setPreviewMonthlySalary(Number(e.target.value) || 0)}
                        className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white font-mono text-xs font-bold focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-emerald-200 mb-1">
                        Chargeable Late Minutes
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={480}
                        value={previewLateMinutes}
                        onChange={(e) => setPreviewLateMinutes(Number(e.target.value) || 0)}
                        className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white font-mono text-xs font-bold focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2.5 bg-black/20 rounded-xl p-4 border border-white/10 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-200">Monthly Salary ({ldSalaryBasis}):</span>
                      <span className="font-bold">₹{previewMonthlySalary.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-200">
                        Daily Salary (÷ {previewCalc.days} days):
                      </span>
                      <span className="font-bold">₹{previewCalc.dailySalary.toFixed(4)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-200">
                        Per-Minute Rate (÷ {previewCalc.mins} mins):
                      </span>
                      <span className="font-bold text-emerald-300">
                        ₹{previewCalc.perMinuteRate.toFixed(6)} / min
                      </span>
                    </div>
                    <div className="pt-2.5 border-t border-white/15 flex items-center justify-between text-sm">
                      <span className="font-sans font-bold text-white">
                        Deduction for {previewLateMinutes} mins:
                      </span>
                      <span className="text-lg font-bold text-amber-300">
                        ₹{previewCalc.finalDeduction.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-emerald-100/90 leading-relaxed pt-2 border-t border-white/15">
                  Note: Saving new Late Salary Deduction Settings logs a field-level entry in the centralized Activity Log and applies to live attendance & payroll calculations without altering locked historical payroll runs.
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-[#CBCBCB]">
              <span className="text-xs text-[#525854]">
                Effective from <strong className="font-mono text-[#141A17]">{ldEffectiveFrom}</strong> for <strong className="text-[#141A17]">{ldApplicableScope}</strong>.
              </span>
              <button
                type="button"
                onClick={() => {
                  const historyEntry = {
                    id: `LDH-${Date.now()}`,
                    updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
                    updatedBy: currentEmployee.fullName,
                    updatedByRole: currentRole,
                    effectiveFrom: ldEffectiveFrom,
                    daysPerMonth: Number(ldDaysPerMonth),
                    dailyWorkingHours: Number(ldDailyHours),
                    dailyWorkingMinutes: Number(ldDailyMinutes),
                    salaryBasis: ldSalaryBasis,
                    graceTreatment: ldGraceTreatment,
                    roundingRule: ldRoundingRule,
                    enabled: ldEnabled,
                  };
                  updateCompanySettings({
                    lateDeductionEnabled: ldEnabled,
                    lateDeductionDaysPerMonth: Number(ldDaysPerMonth),
                    lateDeductionDailyWorkingHours: Number(ldDailyHours),
                    lateDeductionDailyWorkingMinutes: Number(ldDailyMinutes),
                    lateDeductionSalaryBasis: ldSalaryBasis,
                    lateDeductionGraceTreatment: ldGraceTreatment,
                    lateDeductionRoundingRule: ldRoundingRule,
                    lateDeductionEffectiveFrom: ldEffectiveFrom,
                    lateDeductionApplicableScope: ldApplicableScope,
                    lateDeductionHistory: [
                      historyEntry,
                      ...(settings.lateDeductionHistory || []),
                    ],
                    updatedAt: new Date().toISOString(),
                    updatedBy: currentEmployee.fullName,
                  });
                  addToast(
                    'Late Salary Deduction Settings Saved',
                    `Formula (${ldSalaryBasis} ÷ ${ldDaysPerMonth}d ÷ ${ldDailyMinutes}m) saved and logged in Activity Log.`,
                    'success'
                  );
                }}
                className="px-6 py-2.5 text-xs font-bold text-white bg-[#164C38] rounded-xl hover:bg-[#0F3627] cursor-pointer shadow-xs transition-colors"
              >
                Save Late Salary Deduction Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drawers */}
      <SlideOverDrawer
        open={ruleDrawerOpen}
        onClose={() => setRuleDrawerOpen(false)}
        title={editingRule ? 'Edit Company Rule' : 'Add Company Rule'}
        subtitle="Add or update a company operational rule"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-[#141A17] mb-1">Rule Title *</label>
            <input
              type="text"
              value={ruleTitle}
              onChange={(e) => setRuleTitle(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg"
            />
          </div>
          <div>
            <label className="block font-medium text-[#141A17] mb-1">Category</label>
            <select
              value={ruleCategory}
              onChange={(e) => setRuleCategory(e.target.value as any)}
              className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg"
            >
              <option value="Timing & Shift">Timing & Shift</option>
              <option value="Half-Day Rule">Half-Day Rule</option>
              <option value="Late Coming">Late Coming</option>
              <option value="Leave & Holiday">Leave & Holiday</option>
              <option value="General Conduct">General Conduct</option>
            </select>
          </div>
          <div>
            <label className="block font-medium text-[#141A17] mb-1">Description *</label>
            <textarea
              rows={4}
              value={ruleDesc}
              onChange={(e) => setRuleDesc(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              if (!ruleTitle.trim() || !ruleDesc.trim()) return;
              addOrUpdateCustomRule(
                {
                  title: ruleTitle.trim(),
                  category: ruleCategory,
                  description: ruleDesc.trim(),
                  effectiveFrom: ruleEffective,
                },
                editingRule?.id
              );
              setRuleDrawerOpen(false);
            }}
            className="w-full py-2.5 text-xs font-semibold text-white bg-[#164C38] rounded-lg cursor-pointer"
          >
            Save Rule
          </button>
        </div>
      </SlideOverDrawer>

      <SlideOverDrawer
        open={policyDrawerOpen}
        onClose={() => setPolicyDrawerOpen(false)}
        title={editingPolicy ? 'Edit Policy' : 'Add Company Policy'}
        subtitle="Publish or update a formal company policy"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-[#141A17] mb-1">Policy Title *</label>
            <input
              type="text"
              value={polTitle}
              onChange={(e) => setPolTitle(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg"
            />
          </div>
          <div>
            <label className="block font-medium text-[#141A17] mb-1">Category</label>
            <select
              value={polCategory}
              onChange={(e) => setPolCategory(e.target.value as any)}
              className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg"
            >
              <option value="Attendance">Attendance</option>
              <option value="Leave">Leave</option>
              <option value="Late Coming">Late Coming</option>
              <option value="Code of Conduct">Code of Conduct</option>
              <option value="Payroll">Payroll</option>
              <option value="Remote Work">Remote Work</option>
            </select>
          </div>
          <div>
            <label className="block font-medium text-[#141A17] mb-1">Summary *</label>
            <input
              type="text"
              value={polSummary}
              onChange={(e) => setPolSummary(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg"
            />
          </div>
          <div>
            <label className="block font-medium text-[#141A17] mb-1">Full Policy Text *</label>
            <textarea
              rows={4}
              value={polContent}
              onChange={(e) => setPolContent(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              if (!polTitle.trim()) return;
              createOrUpdatePolicy(
                {
                  title: polTitle.trim(),
                  category: polCategory,
                  version: polVersion.trim() || 'v1.0',
                  status: 'Active',
                  effectiveDate: TODAY_DATE,
                  targetDepartment: 'All',
                  requiresAcknowledgement: false,
                  summary: polSummary.trim(),
                  content: polContent.trim() || polSummary.trim(),
                },
                editingPolicy?.id
              );
              setPolicyDrawerOpen(false);
            }}
            className="w-full py-2.5 text-xs font-semibold text-white bg-[#164C38] rounded-lg cursor-pointer"
          >
            Save Policy
          </button>
        </div>
      </SlideOverDrawer>

      <SlideOverDrawer
        open={annDrawerOpen}
        onClose={() => setAnnDrawerOpen(false)}
        title="Post Company Announcement"
        subtitle="Broadcast an official announcement under Company Rules & Policies"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-[#141A17] mb-1">Headline *</label>
            <input
              type="text"
              value={annTitle}
              onChange={(e) => setAnnTitle(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg"
            />
          </div>
          <div>
            <label className="block font-medium text-[#141A17] mb-1">Message *</label>
            <textarea
              rows={4}
              value={annContent}
              onChange={(e) => setAnnContent(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              if (!annTitle.trim()) return;
              createAnnouncement({
                title: annTitle.trim(),
                description: annContent.trim(),
                priority: 'Important',
                publishDate: TODAY_DATE,
                expiryDate: '2026-12-31',
                targetAudience: 'Everyone',
              } as any);
              setAnnDrawerOpen(false);
            }}
            className="w-full py-2.5 text-xs font-semibold text-white bg-[#164C38] rounded-lg cursor-pointer"
          >
            Publish Announcement
          </button>
        </div>
      </SlideOverDrawer>

      <SlideOverDrawer
        open={holidayDrawerOpen}
        onClose={() => setHolidayDrawerOpen(false)}
        title={editingHoliday ? 'Edit Holiday' : 'Add Holiday'}
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-[#141A17] mb-1">Holiday Name *</label>
            <input
              type="text"
              value={holName}
              onChange={(e) => setHolName(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg"
            />
          </div>
          <div>
            <label className="block font-medium text-[#141A17] mb-1">Date</label>
            <input
              type="date"
              value={holDate}
              onChange={(e) => setHolDate(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg font-mono"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              if (!holName.trim()) return;
              if (editingHoliday) {
                updateHoliday(editingHoliday.id, {
                  name: holName.trim(),
                  date: holDate,
                  dayOfWeek: holDay,
                  type: holType,
                  applicableLocations: holLocations,
                });
              } else {
                addHoliday({
                  name: holName.trim(),
                  date: holDate,
                  dayOfWeek: holDay,
                  type: holType,
                  applicableLocations: holLocations,
                });
              }
              setHolidayDrawerOpen(false);
            }}
            className="w-full py-2.5 text-xs font-semibold text-white bg-[#164C38] rounded-lg cursor-pointer"
          >
            Save Holiday
          </button>
        </div>
      </SlideOverDrawer>
    </div>
  );
};
