import React, { useState } from 'react';
import {
  Building2,
  Sun,
  Moon,
  Laptop,
  Globe,
  Shield,
  Lock,
  User,
  Check,
  AlertCircle,
  Eye,
  LogOut,
  Clock,
  KeyRound,
  FileText,
  Sliders,
  IndianRupee,
  Calculator,
  Database,
  RefreshCw,
  Trash2,
  Copy,
  Code,
  Mail,
  Phone,
} from 'lucide-react';
import { useHRMS } from '../../context/HRMSContext';
import { UserRole, WeekdaySchedule } from '../../types/hrms';
import {
  SectionCard,
  SectionHeader,
  StatusBadge,
  AvatarInitials,
  ModalShell,
  TimePicker,
} from '../ui/EnterpriseComponents';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '../../lib/i18n';
import {
  getSupabaseConfig,
  isSupabaseConfigured,
  saveSupabaseCredentials,
  clearSupabaseCredentials,
  SUPABASE_EMAIL_OTP_TEMPLATE,
  SUPABASE_SMS_OTP_TEMPLATE,
  SUPABASE_LOGIN_ACTIVITY_SQL,
} from '../../lib/supabase';
import { SUPABASE_FULL_HRMS_SCHEMA_SQL } from '../../lib/supabaseSync';

type SettingsTab =
  | 'organization'
  | 'lateDeduction'
  | 'appearance'
  | 'language'
  | 'privacy'
  | 'appLock'
  | 'account'
  | 'supabase';

export const SettingsModule: React.FC = () => {
  const {
    currentUser,
    currentRole,
    settings,
    updateCompanySettings,
    theme,
    setTheme,
    language,
    setLanguage,
    t,
    appLockEnabled,
    setAppLockEnabled,
    changeAppLockPin,
    lockTimeoutMinutes,
    setLockTimeoutMinutes,
    lockAppNow,
    policies,
    signOutUser,
    addToast,
    openEmployeeProfile,
    allEmployees,
    hasPermission,
  } = useHRMS();

  const isAdmin = currentRole === UserRole.ADMIN;
  const isHRAdmin = currentRole === UserRole.ADMIN || currentRole === UserRole.HR;
  const canManageLateDeduction =
    isHRAdmin && hasPermission('payroll.manage_late_deduction_settings');

  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');

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

  // Organization Edit Form (Admin Only)
  const [orgForm, setOrgForm] = useState({
    companyName: settings.companyName,
    legalEntityName: settings.legalEntityName,
    registrationNumber: settings.registrationNumber,
    headquartersAddress: settings.headquartersAddress,
    aboutCompany: settings.aboutCompany,
    workStartTime: settings.workStartTime,
    workEndTime: settings.workEndTime,
    gracePeriodMinutes: settings.gracePeriodMinutes,
    halfDayHoursThreshold: settings.halfDayHoursThreshold || 4.25,
    overtimeThresholdHours: settings.overtimeThresholdHours || 9.5,
    ipRestrictionEnabled: Boolean(settings.ipRestrictionEnabled),
    probationDurationMonths: settings.probationDurationMonths || 3,
    weekdaySchedules: settings.weekdaySchedules || [
      { day: 'Monday', isOpen: true, startTime: '09:30', endTime: '18:30', isHalfDay: false, notes: 'Full Day Atelier Shift' },
      { day: 'Tuesday', isOpen: true, startTime: '09:30', endTime: '18:30', isHalfDay: false, notes: 'Full Day Atelier Shift' },
      { day: 'Wednesday', isOpen: true, startTime: '09:30', endTime: '18:30', isHalfDay: false, notes: 'Full Day Atelier Shift' },
      { day: 'Thursday', isOpen: true, startTime: '09:30', endTime: '18:30', isHalfDay: false, notes: 'Full Day Atelier Shift' },
      { day: 'Friday', isOpen: true, startTime: '09:30', endTime: '18:30', isHalfDay: false, notes: 'Full Day Atelier Shift' },
      { day: 'Saturday', isOpen: true, startTime: '10:00', endTime: '16:30', isHalfDay: true, notes: 'Shorter Atelier & Dispatch Hours' },
      { day: 'Sunday', isOpen: false, startTime: '09:30', endTime: '18:30', isHalfDay: false, notes: 'Weekly Off' },
    ],
  });
  const [orgSaveSuccess, setOrgSaveSuccess] = useState(false);

  // App Lock Pin modal / form
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinMode, setPinMode] = useState<'enable' | 'change'>('enable');
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  const handleOrgSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      addToast('Unauthorized', 'Only Administrators can modify organization profiles.', 'error');
      return;
    }
    updateCompanySettings(orgForm);
    setOrgSaveSuccess(true);
    addToast('Organization Updated', 'Company profile and parameters saved.', 'success');
    setTimeout(() => setOrgSaveSuccess(false), 3000);
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');

    if (pinInput.length !== 4) {
      setPinError('Passcode must be exactly 4 digits.');
      return;
    }

    if (pinInput !== confirmPinInput) {
      setPinError('Passcodes do not match.');
      return;
    }

    if (pinMode === 'enable') {
      const ok = await setAppLockEnabled(true, pinInput);
      if (ok) {
        setShowPinModal(false);
        setPinInput('');
        setConfirmPinInput('');
      } else {
        setPinError('Failed to enable app lock.');
      }
    } else {
      const res = await changeAppLockPin(currentPinInput, pinInput);
      if (!res.success) {
        setPinError(res.error || 'Failed to change passcode.');
      } else {
        setShowPinModal(false);
        setCurrentPinInput('');
        setPinInput('');
        setConfirmPinInput('');
      }
    }
  };

  // Supabase Configuration State
  const initialSbConfig = getSupabaseConfig();
  const [sbUrlInput, setSbUrlInput] = useState(initialSbConfig.url);
  const [sbKeyInput, setSbKeyInput] = useState(initialSbConfig.key);

  const TABS = [
    { id: 'organization' as const, label: t('settings.organization', 'Organization'), icon: Building2 },
    ...(canManageLateDeduction
      ? [
          {
            id: 'lateDeduction' as const,
            label: t('lateDeduction.title', 'Late Salary Deduction Settings'),
            icon: IndianRupee,
          },
        ]
      : []),
    { id: 'appearance' as const, label: t('settings.appearance', 'Appearance'), icon: Sun },
    { id: 'language' as const, label: t('settings.language', 'Language'), icon: Globe },
    { id: 'privacy' as const, label: t('settings.privacy', 'Privacy & Policy'), icon: Shield },
    { id: 'appLock' as const, label: t('settings.appLock', 'App Lock'), icon: Lock },
    { id: 'supabase' as const, label: 'Supabase Database', icon: Database },
    { id: 'account' as const, label: t('settings.account', 'Account'), icon: User },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 sm:px-6 py-6 animate-in fade-in duration-150">
      {/* Header */}
      <SectionHeader
        title={t('settings.title', 'Settings')}
        subtitle={t('settings.subtitle', 'Manage preferences, appearance, security, and policies')}
      />

      <div className="flex flex-col md:flex-row gap-6">
        {/* Apple-style Vertical Tab Navigation */}
        <div className="w-full md:w-56 shrink-0">
          <nav className="flex md:flex-col gap-1 p-1 bg-[#F0F0F2] dark:bg-[#1C1C1E] rounded-2xl overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-xs font-semibold'
                      : 'text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content Panels */}
        <div className="flex-1 space-y-6">
          {/* ================================================================= */}
          {/* TAB: ORGANIZATION                                                 */}
          {/* ================================================================= */}
          {activeTab === 'organization' && (
            <SectionCard
              title="Organization Profile"
              subtitle={
                isAdmin
                  ? 'Manage company identity, registered address, and default working schedule.'
                  : 'Company identity, official working schedule, and enterprise parameters.'
              }
            >
              <form onSubmit={handleOrgSave} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#6E6E73] dark:text-[#A1A1A6] mb-1">
                      Company Brand Name
                    </label>
                    <input
                      type="text"
                      disabled={!isAdmin}
                      value={orgForm.companyName}
                      onChange={(e) =>
                        setOrgForm({ ...orgForm, companyName: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl text-xs text-[#1D1D1F] dark:text-[#F5F5F7] disabled:opacity-75 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#6E6E73] dark:text-[#A1A1A6] mb-1">
                      Legal Entity Name
                    </label>
                    <input
                      type="text"
                      disabled={!isAdmin}
                      value={orgForm.legalEntityName}
                      onChange={(e) =>
                        setOrgForm({ ...orgForm, legalEntityName: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl text-xs text-[#1D1D1F] dark:text-[#F5F5F7] disabled:opacity-75 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#6E6E73] dark:text-[#A1A1A6] mb-1">
                      Registration / CIN Number
                    </label>
                    <input
                      type="text"
                      disabled={!isAdmin}
                      value={orgForm.registrationNumber}
                      onChange={(e) =>
                        setOrgForm({ ...orgForm, registrationNumber: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl text-xs text-[#1D1D1F] dark:text-[#F5F5F7] disabled:opacity-75 font-mono outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#6E6E73] dark:text-[#A1A1A6] mb-1">
                      Default Probation Duration
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={12}
                        disabled={!isAdmin}
                        value={orgForm.probationDurationMonths}
                        onChange={(e) =>
                          setOrgForm({
                            ...orgForm,
                            probationDurationMonths: Number(e.target.value),
                          })
                        }
                        className="w-24 px-3 py-2 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl text-xs text-[#1D1D1F] dark:text-[#F5F5F7] disabled:opacity-75 font-mono outline-none"
                      />
                      <span className="text-xs text-[#6E6E73] dark:text-[#A1A1A6]">Months</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#6E6E73] dark:text-[#A1A1A6] mb-1">
                    Headquarters / Registered Atelier
                  </label>
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={orgForm.headquartersAddress}
                    onChange={(e) =>
                      setOrgForm({ ...orgForm, headquartersAddress: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl text-xs text-[#1D1D1F] dark:text-[#F5F5F7] disabled:opacity-75 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
                  <div>
                    <label className="block text-xs font-medium text-[#6E6E73] dark:text-[#A1A1A6] mb-1">
                      Work Start Time
                    </label>
                    <TimePicker
                      value={orgForm.workStartTime}
                      onChange={(val) => setOrgForm({ ...orgForm, workStartTime: val })}
                      disabled={!isAdmin}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#6E6E73] dark:text-[#A1A1A6] mb-1">
                      Work End Time
                    </label>
                    <TimePicker
                      value={orgForm.workEndTime}
                      onChange={(val) => setOrgForm({ ...orgForm, workEndTime: val })}
                      disabled={!isAdmin}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#6E6E73] dark:text-[#A1A1A6] mb-1">
                      Grace Period (Minutes)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={120}
                      disabled={!isAdmin}
                      value={orgForm.gracePeriodMinutes}
                      onChange={(e) =>
                        setOrgForm({
                          ...orgForm,
                          gracePeriodMinutes: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl text-xs font-mono text-[#1D1D1F] dark:text-[#F5F5F7] disabled:opacity-75 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#6E6E73] dark:text-[#A1A1A6] mb-1">
                      Overtime Threshold (Hours)
                    </label>
                    <input
                      type="number"
                      step="0.25"
                      min={5}
                      max={18}
                      disabled={!isAdmin}
                      value={orgForm.overtimeThresholdHours}
                      onChange={(e) =>
                        setOrgForm({
                          ...orgForm,
                          overtimeThresholdHours: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl text-xs font-mono text-[#1D1D1F] dark:text-[#F5F5F7] disabled:opacity-75 outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E5E5EA] dark:border-[#2C2C2E] flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                      Attendance Network IP Restriction
                    </p>
                    <p className="text-[11px] text-[#86868B]">
                      Restrict punch-ins to company authorized networks and static IPs.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={!isAdmin}
                      checked={orgForm.ipRestrictionEnabled}
                      onChange={(e) =>
                        setOrgForm({ ...orgForm, ipRestrictionEnabled: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#E5E5EA] peer-focus:outline-none rounded-full peer dark:bg-[#3A3A3C] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#000000] dark:peer-checked:bg-white dark:peer-checked:after:bg-[#000000]"></div>
                  </label>
                </div>

                {isAdmin ? (
                  <div className="flex items-center justify-between pt-4 border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
                    {orgSaveSuccess ? (
                      <span className="text-xs text-emerald-600 font-medium flex items-center gap-1.5">
                        <Check className="w-4 h-4" /> Parameters saved successfully.
                      </span>
                    ) : (
                      <span className="text-xs text-[#86868B]">
                        Changes apply immediately to enterprise operations.
                      </span>
                    )}
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-semibold text-white bg-[#000000] dark:bg-white dark:text-[#000000] rounded-xl hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      Save Organization Settings
                    </button>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] text-xs text-[#6E6E73] dark:text-[#A1A1A6]">
                    Organization-wide operational rules can only be edited by authorized Administrators.
                  </div>
                )}
              </form>
            </SectionCard>
          )}

          {/* ================================================================= */}
          {/* TAB: LATE SALARY DEDUCTION SETTINGS (REQUIREMENT 9)               */}
          {/* ================================================================= */}
          {activeTab === 'lateDeduction' && canManageLateDeduction && (
            <SectionCard
              title={t('lateDeduction.title', 'Late Salary Deduction Settings')}
              subtitle={t(
                'lateDeduction.subtitle',
                'Configure per-minute salary deduction formula (Monthly Salary ÷ Calculation Days ÷ Daily Working Minutes × Chargeable Late Minutes)'
              )}
            >
              <div className="space-y-5 text-xs">
                <label className="flex items-center justify-between p-4 rounded-xl bg-[#F0F0F2] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] cursor-pointer">
                  <div>
                    <div className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                      {t('lateDeduction.enabled', 'Enable Per-Minute Late Salary Deduction')}
                    </div>
                    <div className="text-[11px] text-[#6E6E73] dark:text-[#A1A1A6] mt-0.5">
                      Automatically calculate late arrival salary deductions across Attendance, Payroll, and Reports.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={ldEnabled}
                    onChange={(e) => setLdEnabled(e.target.checked)}
                    className="w-4 h-4 rounded accent-[#2D5A27]"
                  />
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-medium text-[#6E6E73] dark:text-[#A1A1A6] mb-1">
                      {t('lateDeduction.daysPerMonth', 'Calculation Days per Month')}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={ldDaysPerMonth}
                      onChange={(e) => setLdDaysPerMonth(Number(e.target.value) || 26)}
                      className="w-full px-3 py-2 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl font-mono font-bold text-[#1D1D1F] dark:text-[#F5F5F7]"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-[#6E6E73] dark:text-[#A1A1A6] mb-1">
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
                      className="w-full px-3 py-2 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl font-mono font-bold text-[#1D1D1F] dark:text-[#F5F5F7]"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-[#6E6E73] dark:text-[#A1A1A6] mb-1">
                      {t('lateDeduction.dailyMinutes', 'Daily Working Minutes')}
                    </label>
                    <input
                      type="number"
                      min={60}
                      max={1440}
                      value={ldDailyMinutes}
                      onChange={(e) => setLdDailyMinutes(Number(e.target.value) || 480)}
                      className="w-full px-3 py-2 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl font-mono font-bold text-[#1D1D1F] dark:text-[#F5F5F7]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium text-[#6E6E73] dark:text-[#A1A1A6] mb-1">
                      {t('lateDeduction.salaryBasis', 'Salary Basis')}
                    </label>
                    <select
                      value={ldSalaryBasis}
                      onChange={(e) => setLdSalaryBasis(e.target.value as any)}
                      className="w-full px-3 py-2 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl text-[#1D1D1F] dark:text-[#F5F5F7]"
                    >
                      <option value="Monthly Gross">Monthly Gross</option>
                      <option value="Basic Salary">Basic Salary</option>
                      <option value="Basic + HRA">Basic + HRA</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-[#6E6E73] dark:text-[#A1A1A6] mb-1">
                      {t('lateDeduction.graceTreatment', 'Grace-Period Treatment')}
                    </label>
                    <select
                      value={ldGraceTreatment}
                      onChange={(e) => setLdGraceTreatment(e.target.value as any)}
                      className="w-full px-3 py-2 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl text-[#1D1D1F] dark:text-[#F5F5F7]"
                    >
                      <option value="After Grace Only">After Grace Only</option>
                      <option value="From Shift Start">From Shift Start</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-[#6E6E73] dark:text-[#A1A1A6] mb-1">
                      {t('lateDeduction.roundingRule', 'Monetary Rounding Rule')}
                    </label>
                    <select
                      value={ldRoundingRule}
                      onChange={(e) => setLdRoundingRule(e.target.value as any)}
                      className="w-full px-3 py-2 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl text-[#1D1D1F] dark:text-[#F5F5F7]"
                    >
                      <option value="2 Decimals">2 Decimals</option>
                      <option value="Nearest Rupee">Nearest Rupee</option>
                      <option value="Round Up">Round Up</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-[#6E6E73] dark:text-[#A1A1A6] mb-1">
                      {t('lateDeduction.effectiveFrom', 'Effective From Date')}
                    </label>
                    <input
                      type="date"
                      value={ldEffectiveFrom}
                      onChange={(e) => setLdEffectiveFrom(e.target.value)}
                      className="w-full px-3 py-2 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl font-mono text-[#1D1D1F] dark:text-[#F5F5F7]"
                    />
                  </div>
                </div>

                {/* Live Calculation Preview */}
                {(() => {
                  const days = Math.max(1, Number(ldDaysPerMonth) || 26);
                  const mins = Math.max(1, Number(ldDailyMinutes) || 480);
                  const dailySal = previewMonthlySalary / days;
                  const perMin = dailySal / mins;
                  const rawDed = ldEnabled ? previewLateMinutes * perMin : 0;
                  const finalDed =
                    ldRoundingRule === 'Nearest Rupee'
                      ? Math.round(rawDed)
                      : ldRoundingRule === 'Round Up'
                      ? Math.ceil(rawDed)
                      : Number(rawDed.toFixed(2));
                  return (
                    <div className="p-4 rounded-2xl bg-[#164C38] text-white space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1.5">
                          <Calculator className="w-4 h-4 text-emerald-300" />
                          {t('lateDeduction.previewTitle', 'Live Calculation Preview')}
                        </span>
                        <span className="text-[11px] font-mono text-emerald-200">
                          Daily = Salary/{days} · Rate = Daily/{mins}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] uppercase text-emerald-200 mb-1">
                            Test Monthly Salary (₹)
                          </label>
                          <input
                            type="number"
                            value={previewMonthlySalary}
                            onChange={(e) => setPreviewMonthlySalary(Number(e.target.value) || 0)}
                            className="w-full px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase text-emerald-200 mb-1">
                            Test Late Minutes
                          </label>
                          <input
                            type="number"
                            value={previewLateMinutes}
                            onChange={(e) => setPreviewLateMinutes(Number(e.target.value) || 0)}
                            className="w-full px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white font-mono"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/15 font-mono text-[11px]">
                        <div>
                          <span className="text-emerald-200 block">Daily Salary</span>
                          <span className="font-bold">₹{dailySal.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-emerald-200 block">Per-Minute Rate</span>
                          <span className="font-bold text-emerald-300">₹{perMin.toFixed(6)}</span>
                        </div>
                        <div>
                          <span className="text-emerald-200 block">Late Deduction</span>
                          <span className="font-bold text-amber-300 text-sm">₹{finalDed.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
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
                      });
                      addToast(
                        'Late Salary Deduction Saved',
                        `Updated per-minute deduction formula (${ldSalaryBasis} ÷ ${ldDaysPerMonth}d ÷ ${ldDailyMinutes}m).`,
                        'success'
                      );
                    }}
                    className="px-5 py-2.5 rounded-xl bg-[#2D5A27] hover:bg-[#23461E] text-white font-semibold cursor-pointer"
                  >
                    {t('common.save', 'Save Changes')}
                  </button>
                </div>
              </div>
            </SectionCard>
          )}

          {/* ================================================================= */}
          {/* TAB: APPEARANCE                                                   */}
          {/* ================================================================= */}
          {activeTab === 'appearance' && (
            <SectionCard
              title={t('settings.appearance', 'Appearance')}
              subtitle="Choose how the application looks. Select light, dark, or sync with your system."
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Light Option */}
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    theme === 'light'
                      ? 'border-[#1D1D1F] dark:border-[#F5F5F7] bg-white dark:bg-[#161618] ring-2 ring-[#1D1D1F] dark:ring-[#F5F5F7]'
                      : 'border-[#E5E5EA] dark:border-[#2C2C2E] bg-[#FAFAFC] dark:bg-[#1A1A1C] hover:border-[#86868B]'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-[#F0F0F2] flex items-center justify-center text-[#1D1D1F] mb-3">
                    <Sun className="w-4 h-4" />
                  </div>
                  <div className="font-semibold text-xs text-[#1D1D1F] dark:text-[#F5F5F7]">
                    {t('settings.theme.light', 'Light Mode')}
                  </div>
                  <div className="text-[11px] text-[#6E6E73] dark:text-[#A1A1A6] mt-0.5">
                    Clean crisp white canvas with subtle neutral grey dividers
                  </div>
                </button>

                {/* Dark Option */}
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    theme === 'dark'
                      ? 'border-[#1D1D1F] dark:border-[#F5F5F7] bg-white dark:bg-[#161618] ring-2 ring-[#1D1D1F] dark:ring-[#F5F5F7]'
                      : 'border-[#E5E5EA] dark:border-[#2C2C2E] bg-[#FAFAFC] dark:bg-[#1A1A1C] hover:border-[#86868B]'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-[#1C1C1E] flex items-center justify-center text-white mb-3">
                    <Moon className="w-4 h-4" />
                  </div>
                  <div className="font-semibold text-xs text-[#1D1D1F] dark:text-[#F5F5F7]">
                    {t('settings.theme.dark', 'Dark Mode')}
                  </div>
                  <div className="text-[11px] text-[#6E6E73] dark:text-[#A1A1A6] mt-0.5">
                    Near-black OLED surfaces with soft monochrome contrast
                  </div>
                </button>

                {/* System Option */}
                <button
                  type="button"
                  onClick={() => setTheme('system')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    theme === 'system'
                      ? 'border-[#1D1D1F] dark:border-[#F5F5F7] bg-white dark:bg-[#161618] ring-2 ring-[#1D1D1F] dark:ring-[#F5F5F7]'
                      : 'border-[#E5E5EA] dark:border-[#2C2C2E] bg-[#FAFAFC] dark:bg-[#1A1A1C] hover:border-[#86868B]'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-[#F0F0F2] dark:bg-[#2C2C2E] flex items-center justify-center text-[#1D1D1F] dark:text-[#F5F5F7] mb-3">
                    <Laptop className="w-4 h-4" />
                  </div>
                  <div className="font-semibold text-xs text-[#1D1D1F] dark:text-[#F5F5F7]">
                    {t('settings.theme.system', 'System Default')}
                  </div>
                  <div className="text-[11px] text-[#6E6E73] dark:text-[#A1A1A6] mt-0.5">
                    Automatically matches your macOS, iOS, or OS display settings
                  </div>
                </button>
              </div>
            </SectionCard>
          )}

          {/* ================================================================= */}
          {/* TAB: LANGUAGE                                                     */}
          {/* ================================================================= */}
          {activeTab === 'language' && (
            <SectionCard
              title={t('settings.language', 'Language')}
              subtitle="Select your preferred application language. All supported languages have complete translations."
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {SUPPORTED_LANGUAGES.map((lang) => {
                  const isSelected = language === lang.code;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => {
                        setLanguage(lang.code);
                        addToast('Language Updated', `Switched interface to ${lang.label}.`, 'info');
                      }}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'border-[#1D1D1F] dark:border-[#F5F5F7] bg-white dark:bg-[#161618] shadow-xs'
                          : 'border-[#E5E5EA] dark:border-[#2C2C2E] bg-[#FAFAFC] dark:bg-[#1A1A1C] hover:border-[#86868B]'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-xs text-[#1D1D1F] dark:text-[#F5F5F7]">
                          {lang.label}
                        </div>
                        <div className="text-[11px] text-[#6E6E73] dark:text-[#A1A1A6]">
                          {lang.nativeLabel}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-[#1D1D1F] dark:bg-[#F5F5F7] text-white dark:text-[#1D1D1F] flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </SectionCard>
          )}

          {/* ================================================================= */}
          {/* TAB: PRIVACY & POLICY                                             */}
          {/* ================================================================= */}
          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <SectionCard
                title="Applicable Enterprise Policies"
                subtitle="Published institutional policies and compliance governance charters."
              >
                <div className="divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E]">
                  {policies.map((pol) => (
                    <div key={pol.id} className="py-3 flex items-start justify-between gap-4">
                      <div>
                        <div className="font-semibold text-xs text-[#1D1D1F] dark:text-[#F5F5F7]">
                          {pol.title}
                        </div>
                        <div className="text-[11px] text-[#6E6E73] dark:text-[#A1A1A6] mt-0.5">
                          {pol.category} • Effective from {pol.effectiveDate}
                        </div>
                        <p className="text-xs text-[#6E6E73] dark:text-[#A1A1A6] mt-1 line-clamp-2">
                          {pol.description}
                        </p>
                      </div>
                      <StatusBadge status={pol.status} size="sm" />
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard
                title="Data Privacy & Storage Standards"
                subtitle="Enterprise security protections applied to your employee records."
              >
                <div className="space-y-2 text-xs text-[#6E6E73] dark:text-[#A1A1A6] leading-relaxed">
                  <p>
                    • <strong>Role-Based Access Control:</strong> Strict separation of duties prevents unauthorized cross-employee data exposure.
                  </p>
                  <p>
                    • <strong>Salary & Bank Masking:</strong> Sensitive financial records remain hidden behind explicit authorization checks.
                  </p>
                  <p>
                    • <strong>Audit Logs:</strong> All permission and record revisions are immutably logged with actor identification and timestamps.
                  </p>
                </div>
              </SectionCard>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB: APP LOCK & PASSCODE                                          */}
          {/* ================================================================= */}
          {activeTab === 'appLock' && (
            <SectionCard
              title={t('settings.appLock', 'Application Passcode Lock')}
              subtitle="Secure your session with an optional 4-digit PIN. Protects sensitive employee and payroll records during inactivity."
            >
              <div className="space-y-5">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-[#F0F0F2] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E]">
                  <div>
                    <div className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                      {t('settings.appLock.enable', 'Enable Passcode Lock')}
                    </div>
                    <div className="text-[11px] text-[#6E6E73] dark:text-[#A1A1A6] mt-0.5">
                      {appLockEnabled
                        ? 'Passcode protection is currently active on this device.'
                        : 'No passcode is required on inactivity.'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (appLockEnabled) {
                        setAppLockEnabled(false);
                      } else {
                        setPinMode('enable');
                        setPinInput('');
                        setConfirmPinInput('');
                        setPinError('');
                        setShowPinModal(true);
                      }
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      appLockEnabled
                        ? 'bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20'
                        : 'bg-[#000000] dark:bg-white text-white dark:text-[#000000]'
                    }`}
                  >
                    {appLockEnabled ? 'Disable Lock' : 'Enable Lock'}
                  </button>
                </div>

                {appLockEnabled && (
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-[#6E6E73] dark:text-[#A1A1A6] mb-1">
                          {t('settings.appLock.timeout', 'Auto-Lock Timeout')}
                        </label>
                        <select
                          value={lockTimeoutMinutes}
                          onChange={(e) => setLockTimeoutMinutes(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl text-xs text-[#1D1D1F] dark:text-[#F5F5F7] outline-none"
                        >
                          <option value={1}>1 Minute</option>
                          <option value={5}>5 Minutes</option>
                          <option value={15}>15 Minutes</option>
                          <option value={30}>30 Minutes</option>
                        </select>
                      </div>

                      <div className="flex items-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setPinMode('change');
                            setCurrentPinInput('');
                            setPinInput('');
                            setConfirmPinInput('');
                            setPinError('');
                            setShowPinModal(true);
                          }}
                          className="px-3.5 py-2 text-xs font-medium text-[#1D1D1F] dark:text-[#F5F5F7] bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-xl hover:border-[#1D1D1F] transition-colors cursor-pointer"
                        >
                          {t('settings.appLock.changePin', 'Change Passcode')}
                        </button>
                        <button
                          type="button"
                          onClick={lockAppNow}
                          className="px-3.5 py-2 text-xs font-medium text-white bg-[#000000] dark:bg-white dark:text-[#000000] rounded-xl hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1.5"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Lock Now</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          {/* ================================================================= */}
          {/* TAB: SUPABASE DATABASE                                            */}
          {/* ================================================================= */}
          {activeTab === 'supabase' && (
            <div className="space-y-6">
              <SectionCard
                title="Supabase Integration Status & Credentials"
                subtitle="View backend connection status and configure your Supabase Project URL and Anon Key."
              >
                <div className="space-y-5">
                  {/* Status Indicator */}
                  <div
                    className={`p-4 rounded-2xl border flex items-center justify-between ${
                      isSupabaseConfigured()
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full animate-pulse ${
                          isSupabaseConfigured() ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                      />
                      <div>
                        <div className="font-semibold text-xs">
                          {isSupabaseConfigured()
                            ? 'Supabase Credentials Configured'
                            : 'Pending Supabase Credentials'}
                        </div>
                        <div className="text-[11px] opacity-80 mt-0.5">
                          {isSupabaseConfigured()
                            ? `Connected using credentials from ${getSupabaseConfig().source}.`
                            : 'Please enter your Supabase Project URL & Anon Key below or set environment variables.'}
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg bg-white/40 dark:bg-black/40">
                      {isSupabaseConfigured() ? 'READY' : 'PENDING'}
                    </span>
                  </div>

                  {/* Form to enter/update credentials */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!sbUrlInput.trim() || !sbKeyInput.trim()) {
                        addToast('Missing Credentials', 'Please enter both URL and Anon Key.', 'error');
                        return;
                      }
                      saveSupabaseCredentials(sbUrlInput, sbKeyInput);
                      addToast('Supabase Saved', 'Saved Supabase credentials in local configuration.', 'success');
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-xs font-medium text-[#6E6E73] dark:text-[#A1A1A6] mb-1">
                        Supabase Project URL
                      </label>
                      <input
                        type="url"
                        placeholder="https://xyzcompany.supabase.co"
                        value={sbUrlInput}
                        onChange={(e) => setSbUrlInput(e.target.value)}
                        className="w-full px-3 py-2 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl text-xs font-mono text-[#1D1D1F] dark:text-[#F5F5F7] outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#6E6E73] dark:text-[#A1A1A6] mb-1">
                        Supabase Anon (Public) Key
                      </label>
                      <input
                        type="password"
                        placeholder="eyJhYmdj... (your anon key)"
                        value={sbKeyInput}
                        onChange={(e) => setSbKeyInput(e.target.value)}
                        className="w-full px-3 py-2 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl text-xs font-mono text-[#1D1D1F] dark:text-[#F5F5F7] outline-none"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      {getSupabaseConfig().source === 'localStorage' && (
                        <button
                          type="button"
                          onClick={() => {
                            clearSupabaseCredentials();
                            const newConfig = getSupabaseConfig();
                            setSbUrlInput(newConfig.url);
                            setSbKeyInput(newConfig.key);
                            addToast('Credentials Cleared', 'Removed local Supabase keys.', 'info');
                          }}
                          className="px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Clear Saved Keys</span>
                        </button>
                      )}
                      <div className="flex items-center gap-2 ml-auto">
                        <button
                          type="submit"
                          className="px-4 py-2 text-xs font-semibold text-white bg-[#2D5A27] hover:bg-[#23461E] rounded-xl transition-colors cursor-pointer"
                        >
                          Save & Apply Credentials
                        </button>
                      </div>
                    </div>
                  </form>

                  {/* Instructions Box */}
                  <div className="p-4 rounded-2xl bg-[#F0F0F2] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] text-xs space-y-2 text-[#6E6E73] dark:text-[#A1A1A6]">
                    <div className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] text-xs">
                      How to get your Supabase keys:
                    </div>
                    <ol className="list-decimal list-inside space-y-1 text-[11px]">
                      <li>
                        Log into your <strong className="text-[#1D1D1F] dark:text-[#F5F5F7]">Supabase Dashboard</strong> at supabase.com
                      </li>
                      <li>Select your project (or create a new project)</li>
                      <li>Go to <strong>Project Settings → API</strong></li>
                      <li>Copy your <strong>Project URL</strong> and <strong>anon / public key</strong></li>
                      <li>Paste them into the fields above or put them into your <code className="font-mono">.env</code> file as <code className="font-mono">VITE_SUPABASE_URL</code> &amp; <code className="font-mono">VITE_SUPABASE_ANON_KEY</code>.</li>
                    </ol>
                  </div>
                </div>
              </SectionCard>

              {/* OTP Templates Card */}
              <SectionCard
                title="OTP Authentication Templates (Email & SMS)"
                subtitle="Copy these professionally designed OTP templates into your Supabase Dashboard under Authentication → Email / SMS Templates."
              >
                <div className="space-y-4 text-xs">
                  {/* Email Template */}
                  <div className="p-4 rounded-2xl bg-[#F0F0F2] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                        <Mail className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>HTML Email OTP Template</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(SUPABASE_EMAIL_OTP_TEMPLATE);
                          addToast('Email Template Copied', 'Copied HTML email template to clipboard.', 'success');
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#3A3A3C] hover:border-[#1D1D1F] rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy HTML</span>
                      </button>
                    </div>
                    <pre className="p-3 rounded-xl bg-white dark:bg-[#000000] border border-[#E5E5EA] dark:border-[#2C2C2E] text-[11px] font-mono text-[#6E6E73] dark:text-[#A1A1A6] max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                      {SUPABASE_EMAIL_OTP_TEMPLATE}
                    </pre>
                  </div>

                  {/* SMS Template */}
                  <div className="p-4 rounded-2xl bg-[#F0F0F2] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                        <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>SMS OTP Message Template</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(SUPABASE_SMS_OTP_TEMPLATE);
                          addToast('SMS Template Copied', 'Copied SMS OTP template to clipboard.', 'success');
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#3A3A3C] hover:border-[#1D1D1F] rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Text</span>
                      </button>
                    </div>
                    <div className="p-3 rounded-xl bg-white dark:bg-[#000000] border border-[#E5E5EA] dark:border-[#2C2C2E] text-xs font-mono text-[#1D1D1F] dark:text-[#F5F5F7]">
                      {SUPABASE_SMS_OTP_TEMPLATE}
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* Supabase Full HRMS Database Schema Setup Script */}
              <SectionCard
                title="Full HRMS Database Schema (All Application Tables)"
                subtitle="Run this SQL script in Supabase Dashboard → SQL Editor to create all 8 primary application tables (employees, attendance_records, leave_requests, consideration_requests, payroll_records, departments, company_policies, activity_logs)."
              >
                <div className="space-y-3 text-xs">
                  <div className="p-4 rounded-2xl bg-[#F0F0F2] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                        <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>SQL Script for All HRMS Application Tables</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(SUPABASE_FULL_HRMS_SCHEMA_SQL);
                          addToast('Full SQL Schema Copied', 'Paste this into Supabase SQL Editor and click Run.', 'success');
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-[#000000] dark:bg-white dark:text-[#000000] rounded-xl hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy All Tables SQL</span>
                      </button>
                    </div>
                    <pre className="p-3.5 rounded-xl bg-white dark:bg-[#000000] border border-[#E5E5EA] dark:border-[#2C2C2E] text-[11px] font-mono text-[#1D1D1F] dark:text-[#F5F5F7] max-h-56 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                      {SUPABASE_FULL_HRMS_SCHEMA_SQL}
                    </pre>
                  </div>
                </div>
              </SectionCard>

              {/* Supabase User Login Activity Tracking Table Schema */}
              <SectionCard
                title="User Login Activity Tracking (Supabase Table Setup)"
                subtitle="Run this SQL script in Supabase Dashboard → SQL Editor to create the 'user_login_activity' table. Supabase will record every user login with timestamp, auth method, email, phone, and employee role."
              >
                <div className="space-y-3 text-xs">
                  <div className="p-4 rounded-2xl bg-[#F0F0F2] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                        <Code className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>SQL Setup Script for public.user_login_activity</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(SUPABASE_LOGIN_ACTIVITY_SQL);
                          addToast('SQL Script Copied', 'Paste this into Supabase SQL Editor and click Run.', 'success');
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-[#000000] dark:bg-white dark:text-[#000000] rounded-xl hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy SQL Script</span>
                      </button>
                    </div>
                    <pre className="p-3.5 rounded-xl bg-white dark:bg-[#000000] border border-[#E5E5EA] dark:border-[#2C2C2E] text-[11px] font-mono text-[#1D1D1F] dark:text-[#F5F5F7] max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                      {SUPABASE_LOGIN_ACTIVITY_SQL}
                    </pre>
                  </div>
                </div>
              </SectionCard>

              {/* OTP Delivery Troubleshooting & Setup Guide */}
              <SectionCard
                title="Supabase Email & Mobile OTP Setup Guide"
                subtitle="Fixing email/mobile OTP dispatch errors in Supabase Dashboard."
              >
                <div className="p-4 rounded-2xl bg-[#F0F0F2] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] text-xs space-y-3 text-[#6E6E73] dark:text-[#A1A1A6]">
                  <div className="font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">
                    Why OTPs are not delivered by default in new Supabase projects:
                  </div>

                  <div className="space-y-2">
                    <p className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                      1. Email OTP Delivery (Custom SMTP Required):
                    </p>
                    <p className="text-[11px] leading-relaxed">
                      Supabase’s default email service is rate-limited to 3 emails/hour and blocks external custom domains. To send real OTP emails, open Supabase Dashboard → <strong>Authentication → Email Settings</strong> → enable <strong>Custom SMTP</strong> (e.g. Resend, SendGrid, Mailgun, Brevo, or Gmail SMTP).
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
                    <p className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                      2. Mobile SMS OTP Delivery (SMS Gateway Required):
                    </p>
                    <p className="text-[11px] leading-relaxed">
                      Supabase does <strong>not</strong> include a default built-in SMS gateway. To deliver SMS OTPs to mobile phones, open Supabase Dashboard → <strong>Authentication → Phone Auth</strong> → select a Provider (e.g. <strong>Twilio</strong>, <strong>Vonage</strong>, <strong>MessageBird</strong>, or <strong>AWS SNS</strong>) and paste your Account SID &amp; Auth Token.
                    </p>
                  </div>
                </div>
              </SectionCard>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB: ACCOUNT                                                      */}
          {/* ================================================================= */}
          {activeTab === 'account' && (
            <SectionCard
              title={t('settings.account', 'Account & Session')}
              subtitle="Personal profile credentials, role permissions, and session actions."
            >
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#F0F0F2] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E]">
                  <AvatarInitials name={currentUser.fullName} size="lg" />
                  <div>
                    <h3 className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                      {currentUser.fullName}
                    </h3>
                    <p className="text-xs text-[#6E6E73] dark:text-[#A1A1A6]">
                      {currentUser.designation} · {currentUser.department}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <StatusBadge status={currentUser.role} size="sm" />
                      <span className="text-[11px] font-mono text-[#86868B]">
                        {currentUser.employeeId}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-white dark:bg-[#161618] border border-[#E5E5EA] dark:border-[#2C2C2E]">
                    <span className="text-[#6E6E73] dark:text-[#8E8E93] block">Official Email</span>
                    <span className="font-mono font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                      {currentUser.email}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-[#161618] border border-[#E5E5EA] dark:border-[#2C2C2E]">
                    <span className="text-[#6E6E73] dark:text-[#8E8E93] block">Access Level</span>
                    <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                      Controller (Authorized Operations)
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
                  <button
                    type="button"
                    onClick={() => openEmployeeProfile(currentUser.employeeId)}
                    className="px-4 py-2 text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] bg-[#F0F0F2] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C] rounded-xl transition-colors cursor-pointer"
                  >
                    View My Full Profile →
                  </button>
                  <button
                    type="button"
                    onClick={signOutUser}
                    className="px-4 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </SectionCard>
          )}
        </div>
      </div>

      {/* Passcode Configuration Modal */}
      <ModalShell
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        title={pinMode === 'enable' ? 'Set 4-Digit Passcode' : 'Change Passcode'}
        subtitle="This passcode will be required to unlock the application after an inactivity timeout."
      >
        <form onSubmit={handlePinSubmit} className="space-y-4">
          {pinError && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{pinError}</span>
            </div>
          )}

          {pinMode === 'change' && (
            <div>
              <label className="block text-xs font-medium text-[#6E6E73] dark:text-[#A1A1A6] mb-1">
                Current Passcode
              </label>
              <input
                type="password"
                maxLength={4}
                required
                value={currentPinInput}
                onChange={(e) => setCurrentPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full px-3 py-2 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl text-center font-mono tracking-widest text-[#1D1D1F] dark:text-[#F5F5F7] outline-none"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#6E6E73] dark:text-[#A1A1A6] mb-1">
                {pinMode === 'change' ? 'New Passcode' : '4-Digit Passcode'}
              </label>
              <input
                type="password"
                maxLength={4}
                required
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full px-3 py-2 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl text-center font-mono tracking-widest text-[#1D1D1F] dark:text-[#F5F5F7] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#6E6E73] dark:text-[#A1A1A6] mb-1">
                Confirm Passcode
              </label>
              <input
                type="password"
                maxLength={4}
                required
                value={confirmPinInput}
                onChange={(e) => setConfirmPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full px-3 py-2 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl text-center font-mono tracking-widest text-[#1D1D1F] dark:text-[#F5F5F7] outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
            <button
              type="button"
              onClick={() => setShowPinModal(false)}
              className="px-4 py-2 text-xs font-medium text-[#6E6E73] dark:text-[#A1A1A6] hover:text-[#1D1D1F]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-[#000000] dark:bg-white dark:text-[#000000] rounded-xl hover:opacity-90"
            >
              {pinMode === 'enable' ? 'Save & Enable Lock' : 'Update Passcode'}
            </button>
          </div>
        </form>
      </ModalShell>
    </div>
  );
};
