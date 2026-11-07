import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  Bell,
  ChevronRight,
  LogOut,
  Check,
  X,
  Clock,
  Watch,
  Menu,
  LayoutDashboard,
  UserCheck,
  Calendar,
  FileText,
  Wallet,
  User,
  Users,
  BookOpen,
  Award,
  Settings,
  Sliders,
  ShieldCheck,
  Building2,
  GitBranch,
  Scale,
  Sun,
  Moon,
  Laptop,
  Globe,
  Lock,
  ChevronDown,
  Smartphone,
} from 'lucide-react';
import { useHRMS } from '../../context/HRMSContext';
import { UserRole, PrimaryModuleId } from '../../types/hrms';
import { getPrimaryNavForRole } from '../../lib/rbac';
import { EmployeeAvatar, AvatarInitials, StatusBadge } from '../ui/EnterpriseComponents';
import { SUPPORTED_LANGUAGES } from '../../lib/i18n';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    firebaseUser,
    currentRole,
    underlyingRole,
    activeWorkspace,
    canSwitchWorkspace,
    switchWorkspace,
    hasPermission,
    currentEmployee,
    switchRolePersona,
    switchEmployeePersona,
    signOutUser,
    activeModule,
    activeSubModule,
    navigateTo,
    openEmployeeProfile,
    allEmployees,
    scopedEmployees,
    departments,
    scopedDocuments,
    scopedLetters,
    scopedPolicies,
    notifications,
    settings,
    markAllNotificationsRead,
    markNotificationRead,
    toasts,
    dismissToast,
    theme,
    setTheme,
    language,
    setLanguage,
    t,
    appLockEnabled,
    lockAppNow,
  } = useHRMS();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Primary navigation dynamically computed based on RBAC + Individual Permission Overrides
  const navItems = useMemo(() => {
    const baseItems = getPrimaryNavForRole(currentRole);
    return baseItems.filter((item) => {
      if (item.id === 'people') {
        return hasPermission('employees.view_all') || hasPermission('employees.view_team');
      }
      if (item.id === 'attendance') {
        return (
          hasPermission('attendance.view_own') ||
          hasPermission('attendance.view_team') ||
          hasPermission('attendance.view_all')
        );
      }
      if (item.id === 'leave') {
        return (
          hasPermission('leave.view_own') ||
          hasPermission('leave.view_team') ||
          hasPermission('leave.view_all')
        );
      }
      if (item.id === 'considerations') {
        return (
          hasPermission('considerations.view_own') ||
          hasPermission('considerations.view_team') ||
          hasPermission('considerations.view_all')
        );
      }
      if (item.id === 'payroll') {
        return (
          hasPermission('payroll.view_all') ||
          hasPermission('payroll.view_team') ||
          hasPermission('payroll.view_own')
        );
      }
      if (item.id === 'reports') {
        return (
          hasPermission('reports.view_attendance') ||
          hasPermission('reports.view_consideration') ||
          hasPermission('reports.view_late_coming') ||
          hasPermission('reports.view_late_deduction') ||
          hasPermission('reports.view_overtime') ||
          hasPermission('reports.view_leave') ||
          hasPermission('reports.view_final_combined')
        );
      }
      if (item.id === 'departments-mgmt') {
        return hasPermission('org.view_departments') || hasPermission('org.manage_departments');
      }
      if (item.id === 'org-tree') {
        return hasPermission('org.view_tree') || hasPermission('org.manage_tree');
      }
      if (item.id === 'company-info') {
        return hasPermission('org.view_policies') || hasPermission('org.manage_policies');
      }
      if (item.id === 'manage-access') {
        return underlyingRole === UserRole.ADMIN;
      }
      if (item.id === 'mobile-app') {
        return (
          underlyingRole === UserRole.ADMIN ||
          underlyingRole === UserRole.HR ||
          hasPermission('users.manage_mobile_app')
        );
      }
      return true;
    });
  }, [currentRole, underlyingRole, hasPermission]);

  // Notifications
  const roleNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (n.targetEmployeeId && n.targetEmployeeId !== currentEmployee.id) return false;
      return n.targetRoles.includes(currentRole);
    });
  }, [notifications, currentRole, currentEmployee.id]);

  const unreadCount = useMemo(
    () => roleNotifications.filter((n) => !n.isRead).length,
    [roleNotifications]
  );

  // Global Spotlight Search Results
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;

    const matchedEmployees = scopedEmployees
      .filter(
        (e) =>
          e.fullName.toLowerCase().includes(q) ||
          e.id.toLowerCase().includes(q) ||
          e.designation.toLowerCase().includes(q) ||
          e.department.toLowerCase().includes(q)
      )
      .slice(0, 4);

    const matchedDepartments = departments
      .filter((d) => d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q))
      .slice(0, 3);

    const matchedPolicies = scopedPolicies
      .filter((p) => p.title.toLowerCase().includes(q))
      .slice(0, 3);

    return { employees: matchedEmployees, departments: matchedDepartments, policies: matchedPolicies };
  }, [searchQuery, scopedEmployees, departments, scopedPolicies]);

  // Icon mapping
  const getNavIcon = (id: PrimaryModuleId) => {
    switch (id) {
      case 'dashboard':
        return <LayoutDashboard className="w-4 h-4" />;
      case 'my-team':
        return <Users className="w-4 h-4" />;
      case 'people':
        return <Users className="w-4 h-4" />;
      case 'reviews':
        return <Award className="w-4 h-4" />;
      case 'attendance':
        return <UserCheck className="w-4 h-4" />;
      case 'leave':
        return <Calendar className="w-4 h-4" />;
      case 'approvals':
        return <Check className="w-4 h-4" />;
      case 'payroll':
        return <Wallet className="w-4 h-4" />;
      case 'my-profile':
        return <User className="w-4 h-4" />;
      case 'considerations':
        return <Scale className="w-4 h-4" />;
      case 'calendar':
        return <Calendar className="w-4 h-4" />;
      case 'company-info':
        return <BookOpen className="w-4 h-4" />;
      case 'manage-access':
        return <ShieldCheck className="w-4 h-4" />;
      case 'mobile-app':
        return <Smartphone className="w-4 h-4" />;
      case 'departments-mgmt':
        return <Building2 className="w-4 h-4" />;
      case 'org-tree':
        return <GitBranch className="w-4 h-4" />;
      case 'reports':
        return <Award className="w-4 h-4" />;
      case 'settings':
        return <Settings className="w-4 h-4" />;
      default:
        return <Sliders className="w-4 h-4" />;
    }
  };

  const getTranslatedNavLabel = (id: PrimaryModuleId, defaultLabel: string) => {
    switch (id) {
      case 'dashboard':
        return t('nav.dashboard', defaultLabel);
      case 'people':
        return t('nav.people', defaultLabel);
      case 'attendance':
        return t('nav.attendance', defaultLabel);
      case 'leave':
        return t('nav.leave', defaultLabel);
      case 'considerations':
        return t('nav.considerations', 'Considerations');
      case 'approvals':
        return t('nav.approvals', defaultLabel);
      case 'payroll':
        return t('nav.payroll', defaultLabel);
      case 'departments-mgmt':
        return t('nav.departments', defaultLabel);
      case 'manage-access':
        return t('nav.manageAccess', defaultLabel);
      case 'org-tree':
        return t('nav.orgTree', defaultLabel);
      case 'calendar':
        return t('nav.calendar', defaultLabel);
      case 'company-info':
        return t('nav.rulesPolicies', defaultLabel);
      case 'reports':
        return t('nav.reports', defaultLabel);
      case 'more':
        return t('nav.more', defaultLabel);
      case 'settings':
        return t('nav.settings', defaultLabel);
      case 'my-team':
        return t('nav.myTeam', defaultLabel);
      case 'my-profile':
        return t('nav.myProfile', defaultLabel);
      default:
        return defaultLabel;
    }
  };

  return (
    <div className="min-h-screen flex bg-[#F5F5F7] dark:bg-[#000000] text-[#1D1D1F] dark:text-[#F5F5F7] overflow-x-hidden font-sans">
      {/* =================================================================== */}
      {/* DESKTOP PERMANENT SIDEBAR (Consistent Apple Minimalist Layout)      */}
      {/* =================================================================== */}
      <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:fixed lg:inset-y-0 bg-white dark:bg-[#121214] border-r border-[#E5E5EA] dark:border-[#2C2C2E] z-30 select-none">
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
          <button
            type="button"
            onClick={() => navigateTo('dashboard')}
            className="flex items-center gap-2.5 text-left cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-[#000000] dark:bg-white text-white dark:text-[#000000] flex items-center justify-center shrink-0">
              <Watch className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                {settings.companyName || 'Argos Watch'}
              </p>
              <p className="text-[10px] text-[#86868B] dark:text-[#6E6E73] truncate">
                Precision Horology
              </p>
            </div>
          </button>
        </div>

        {/* Role Switcher Pill */}
        <div className="p-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E] space-y-2.5">
          <div className="grid grid-cols-4 gap-1 p-1 bg-[#F0F0F2] dark:bg-[#202022] rounded-xl">
            {(
              [
                UserRole.ADMIN,
                UserRole.HR,
                UserRole.MANAGER,
                UserRole.EMPLOYEE,
              ] as UserRole[]
            ).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => switchRolePersona(r)}
                title={`Switch to ${r} View`}
                className={`py-1 text-[10px] font-semibold rounded-lg transition-all cursor-pointer text-center ${
                  underlyingRole === r
                    ? 'bg-white dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-xs'
                    : 'text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
                }`}
              >
                {r === UserRole.EMPLOYEE ? 'EMP' : r === UserRole.MANAGER ? 'MGR' : r}
              </button>
            ))}
          </div>

          {/* OWN / ROLE WORKSPACE SWITCHER FOR BOTH HR AND ADMIN (Requirement 9) */}
          {canSwitchWorkspace && (
            <div className="p-2 rounded-xl bg-[#F8FAFC] dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#2C2C2E]">
              <div className="flex items-center justify-between mb-1.5 px-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                  {t('workspace.label', 'Active Workspace')}
                </span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#0F172A] text-white dark:bg-white dark:text-[#0F172A]">
                  {activeWorkspace === 'OWN'
                    ? t('workspace.ownShort', 'Own')
                    : underlyingRole === UserRole.ADMIN
                    ? 'Admin'
                    : t('workspace.hrShort', 'HR')}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1 p-1 bg-[#E2E8F0]/70 dark:bg-[#27272A] rounded-lg">
                <button
                  type="button"
                  onClick={() => switchWorkspace('OWN')}
                  className={`py-1.5 px-2 rounded-md text-[11px] font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeWorkspace === 'OWN'
                      ? 'bg-[#0F172A] text-white dark:bg-white dark:text-[#0F172A] shadow-xs'
                      : 'text-[#475569] dark:text-[#A1A1AA] hover:text-[#0F172A] dark:hover:text-white'
                  }`}
                >
                  <User className="w-3 h-3" />
                  <span>{t('workspace.ownShort', 'Own')}</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    switchWorkspace(underlyingRole === UserRole.ADMIN ? 'ADMIN' : 'HR')
                  }
                  className={`py-1.5 px-2 rounded-md text-[11px] font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeWorkspace !== 'OWN'
                      ? 'bg-[#0F172A] text-white dark:bg-white dark:text-[#0F172A] shadow-xs'
                      : 'text-[#475569] dark:text-[#A1A1AA] hover:text-[#0F172A] dark:hover:text-white'
                  }`}
                >
                  <Users className="w-3 h-3" />
                  <span>{underlyingRole === UserRole.ADMIN ? 'Admin' : t('workspace.hrShort', 'HR')}</span>
                </button>
              </div>
              <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-1.5 px-0.5 leading-tight">
                {activeWorkspace === 'OWN'
                  ? t('workspace.ownDesc', 'Personal Employee View')
                  : underlyingRole === UserRole.ADMIN
                  ? 'System Admin Management View'
                  : t('workspace.hrDesc', 'HR Management View')}
              </p>
            </div>
          )}
        </div>

        {/* Navigation Items List */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = activeModule === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateTo(item.id, null, null)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-[#000000] text-white dark:bg-white dark:text-[#000000] font-semibold shadow-xs'
                    : 'text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] hover:bg-[#F0F0F2] dark:hover:bg-[#1C1C1E]'
                }`}
              >
                <span className="shrink-0">{getNavIcon(item.id)}</span>
                <span className="truncate">{getTranslatedNavLabel(item.id, item.label)}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer User Info */}
        <div className="p-3 border-t border-[#E5E5EA] dark:border-[#2C2C2E] flex items-center justify-between">
          <button
            type="button"
            onClick={() => openEmployeeProfile(currentEmployee.id)}
            className="flex items-center gap-2.5 text-left cursor-pointer min-w-0"
          >
            <AvatarInitials name={currentEmployee.fullName} size="sm" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                {currentEmployee.fullName}
              </p>
              <p className="text-[10px] text-[#86868B] dark:text-[#6E6E73] truncate">
                {currentEmployee.designation}
              </p>
            </div>
          </button>

          {appLockEnabled && (
            <button
              type="button"
              onClick={lockAppNow}
              title="Lock Application Now"
              className="p-1.5 rounded-lg text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] hover:bg-[#F0F0F2] dark:hover:bg-[#1C1C1E] transition-colors cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </aside>

      {/* =================================================================== */}
      {/* MOBILE NAVIGATION DRAWER (Apple iOS Sheet)                          */}
      {/* =================================================================== */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 bg-white dark:bg-[#121214] text-[#1D1D1F] dark:text-[#F5F5F7] h-full shadow-2xl flex flex-col border-r border-[#E5E5EA] dark:border-[#2C2C2E] animate-in slide-in-from-left duration-200">
            <div className="h-16 px-5 border-b border-[#E5E5EA] dark:border-[#2C2C2E] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Watch className="w-4 h-4 text-[#000000] dark:text-white" />
                <span className="font-semibold text-xs tracking-tight">
                  {settings.companyName || 'Argos Watch'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-[#6E6E73] hover:text-[#1D1D1F]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E] space-y-2">
              <div className="grid grid-cols-4 gap-1 p-1 bg-[#F0F0F2] dark:bg-[#202022] rounded-xl text-center">
                {([UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.EMPLOYEE] as UserRole[]).map(
                  (r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        switchRolePersona(r);
                        setMobileMenuOpen(false);
                      }}
                      className={`py-1 text-[10px] font-semibold rounded-lg ${
                        underlyingRole === r
                          ? 'bg-white dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-xs'
                          : 'text-[#6E6E73]'
                      }`}
                    >
                      {r === UserRole.EMPLOYEE ? 'EMP' : r === UserRole.MANAGER ? 'MGR' : r}
                    </button>
                  )
                )}
              </div>

              {canSwitchWorkspace && (
                <div className="grid grid-cols-2 gap-1 p-1 bg-[#F0F0F2] dark:bg-[#202022] rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      switchWorkspace('OWN');
                      setMobileMenuOpen(false);
                    }}
                    className={`py-1.5 text-[11px] font-semibold rounded-lg ${
                      activeWorkspace === 'OWN'
                        ? 'bg-[#0F172A] text-white dark:bg-white dark:text-[#0F172A]'
                        : 'text-[#6E6E73]'
                    }`}
                  >
                    {t('workspace.ownShort', 'Own')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      switchWorkspace(underlyingRole === UserRole.ADMIN ? 'ADMIN' : 'HR');
                      setMobileMenuOpen(false);
                    }}
                    className={`py-1.5 text-[11px] font-semibold rounded-lg ${
                      activeWorkspace !== 'OWN'
                        ? 'bg-[#0F172A] text-white dark:bg-white dark:text-[#0F172A]'
                        : 'text-[#6E6E73]'
                    }`}
                  >
                    {underlyingRole === UserRole.ADMIN ? 'Admin' : t('workspace.hrShort', 'HR')}
                  </button>
                </div>
              )}
            </div>

            <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
              {navItems.map((item) => {
                const isActive = activeModule === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      navigateTo(item.id, null, null);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium ${
                      isActive
                        ? 'bg-[#000000] text-white dark:bg-white dark:text-[#000000] font-semibold'
                        : 'text-[#6E6E73] dark:text-[#8E8E93] hover:bg-[#F0F0F2] dark:hover:bg-[#1C1C1E]'
                    }`}
                  >
                    <span>{getNavIcon(item.id)}</span>
                    <span>{getTranslatedNavLabel(item.id, item.label)}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* =================================================================== */}
      {/* MAIN VIEWPORT (Full Content Container)                             */}
      {/* =================================================================== */}
      <div className="flex-1 lg:pl-60 flex flex-col min-w-0 pb-16 lg:pb-0">
        {/* Apple Translucent Top Bar */}
        <header className="h-16 bg-white/90 dark:bg-[#121214]/90 backdrop-blur-md border-b border-[#E5E5EA] dark:border-[#2C2C2E] px-4 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-20">
          {/* Left: Mobile Menu Toggle + Breadcrumb */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-[#6E6E73] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] hover:bg-[#F0F0F2] dark:hover:bg-[#1C1C1E] transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-xs font-medium text-[#86868B] dark:text-[#6E6E73] truncate">
              <span className="font-semibold text-sm text-[#1D1D1F] dark:text-[#F5F5F7]">
                {getTranslatedNavLabel(activeModule, activeModule.replace('-', ' '))}
              </span>
              {activeSubModule && (
                <>
                  <span>/</span>
                  <span className="text-[#6E6E73] dark:text-[#A1A1A6] capitalize">
                    {activeSubModule.replace('-', ' ')}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Right Controls: Workspace Quick Switcher + Spotlight Search + Theme + Language + Notifications + Profile */}
          <div className="flex items-center gap-2">
            {/* Top Bar Own | HR / Admin Workspace Switcher for HR and Admin Users */}
            {canSwitchWorkspace && (
              <div className="flex items-center gap-1 p-1 rounded-xl bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E]">
                <button
                  type="button"
                  onClick={() => switchWorkspace('OWN')}
                  title="Switch to Personal Employee Workspace"
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                    activeWorkspace === 'OWN'
                      ? 'bg-[#0F172A] text-white dark:bg-white dark:text-[#0F172A] shadow-xs'
                      : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
                  }`}
                >
                  <User className="w-3 h-3" />
                  <span>{t('workspace.ownShort', 'Own')}</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    switchWorkspace(underlyingRole === UserRole.ADMIN ? 'ADMIN' : 'HR')
                  }
                  title={
                    underlyingRole === UserRole.ADMIN
                      ? 'Switch to System Admin Workspace'
                      : 'Switch to HR Management Workspace'
                  }
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                    activeWorkspace !== 'OWN'
                      ? 'bg-[#0F172A] text-white dark:bg-white dark:text-[#0F172A] shadow-xs'
                      : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
                  }`}
                >
                  <Users className="w-3 h-3" />
                  <span>{underlyingRole === UserRole.ADMIN ? 'Admin' : t('workspace.hrShort', 'HR')}</span>
                </button>
              </div>
            )}
            {/* Global Spotlight Search */}
            <div className="relative" ref={searchRef}>
              <button
                type="button"
                onClick={() => setSearchOpen((v) => !v)}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] text-xs text-[#86868B] dark:text-[#6E6E73] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] transition-all cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search...</span>
                <kbd className="text-[10px] font-mono px-1 rounded bg-white dark:bg-[#2C2C2E] text-[#86868B]">
                  ⌘K
                </kbd>
              </button>

              {searchOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-[#161618] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center gap-2 px-3 py-2 bg-[#F0F0F2] dark:bg-[#202022] rounded-xl mb-3">
                    <Search className="w-4 h-4 text-[#86868B]" />
                    <input
                      type="text"
                      autoFocus
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search employees, policies, depts..."
                      className="w-full text-xs bg-transparent outline-none text-[#1D1D1F] dark:text-[#F5F5F7]"
                    />
                  </div>

                  {searchResults && (
                    <div className="space-y-3 max-h-64 overflow-y-auto text-xs">
                      {searchResults.employees.length > 0 && (
                        <div>
                          <span className="text-[10px] font-bold uppercase text-[#86868B] px-2 block mb-1">
                            Employees
                          </span>
                          {searchResults.employees.map((emp) => (
                            <button
                              key={emp.id}
                              type="button"
                              onClick={() => {
                                openEmployeeProfile(emp.id);
                                setSearchOpen(false);
                                setSearchQuery('');
                              }}
                              className="w-full p-2 rounded-lg hover:bg-[#F0F0F2] dark:hover:bg-[#202022] flex items-center justify-between text-left"
                            >
                              <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                                {emp.fullName}
                              </span>
                              <span className="text-[11px] text-[#86868B]">{emp.department}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {searchResults.departments.length > 0 && (
                        <div>
                          <span className="text-[10px] font-bold uppercase text-[#86868B] px-2 block mb-1">
                            Departments
                          </span>
                          {searchResults.departments.map((dept) => (
                            <button
                              key={dept.id}
                              type="button"
                              onClick={() => {
                                navigateTo('departments-mgmt');
                                setSearchOpen(false);
                                setSearchQuery('');
                              }}
                              className="w-full p-2 rounded-lg hover:bg-[#F0F0F2] dark:hover:bg-[#202022] flex items-center justify-between text-left"
                            >
                              <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                                {dept.name}
                              </span>
                              <span className="text-[11px] text-[#86868B]">{dept.code}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick 1-Click Theme Toggle (Light <-> Dark) */}
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              className="p-2 rounded-xl text-[#6E6E73] dark:text-[#A1A1A6] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] hover:bg-[#F0F0F2] dark:hover:bg-[#202022] transition-colors cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Language Dropdown Selector */}
            <div className="relative" ref={langRef}>
              <button
                type="button"
                onClick={() => setLangMenuOpen((v) => !v)}
                className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-[#6E6E73] dark:text-[#A1A1A6] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] hover:bg-[#F0F0F2] dark:hover:bg-[#202022] transition-colors cursor-pointer flex items-center gap-1 font-mono uppercase"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{language}</span>
              </button>

              {langMenuOpen && (
                <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-[#161618] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl shadow-xl py-1 z-50">
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => {
                        setLanguage(l.code);
                        setLangMenuOpen(false);
                      }}
                      className={`w-full px-3 py-1.5 text-left text-xs font-medium flex items-center justify-between ${
                        language === l.code
                          ? 'bg-[#F0F0F2] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] font-semibold'
                          : 'text-[#6E6E73] dark:text-[#A1A1A6] hover:bg-[#F5F5F7] dark:hover:bg-[#202022]'
                      }`}
                    >
                      <span>{l.label}</span>
                      {language === l.code && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick App Lock Button */}
            {appLockEnabled && (
              <button
                type="button"
                onClick={lockAppNow}
                title="Lock Application Now"
                className="p-2 rounded-xl text-[#6E6E73] dark:text-[#A1A1A6] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] hover:bg-[#F0F0F2] dark:hover:bg-[#202022] transition-colors cursor-pointer"
              >
                <Lock className="w-4 h-4" />
              </button>
            )}

            {/* Notifications Bell */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setNotifOpen((v) => !v)}
                className="p-2 rounded-xl text-[#6E6E73] dark:text-[#A1A1A6] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] hover:bg-[#F0F0F2] dark:hover:bg-[#202022] transition-colors cursor-pointer relative"
                aria-label="View notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-[#1D1D1F] dark:bg-white absolute top-2 right-2 ring-2 ring-white dark:ring-[#121214]" />
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#161618] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-2xl shadow-xl p-3 z-50">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
                    <span className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                      Notifications
                    </span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllNotificationsRead}
                        className="text-[11px] text-[#86868B] hover:text-[#1D1D1F]"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {roleNotifications.length === 0 ? (
                      <p className="text-xs text-[#86868B] py-4 text-center">No notifications</p>
                    ) : (
                      roleNotifications.slice(0, 6).map((n) => (
                        <div
                          key={n.id}
                          onClick={() => markNotificationRead(n.id)}
                          className={`p-2.5 rounded-xl text-xs transition-colors cursor-pointer ${
                            n.isRead
                              ? 'text-[#86868B]'
                              : 'bg-[#F0F0F2] dark:bg-[#202022] text-[#1D1D1F] dark:text-[#F5F5F7]'
                          }`}
                        >
                          <div className="font-semibold">{n.title}</div>
                          <div className="text-[11px] mt-0.5 line-clamp-1">{n.message}</div>
                          <div className="text-[9px] text-[#86868B] mt-1 font-mono">{n.createdAt || ''}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Avatar Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileMenuOpen((v) => !v)}
                className="flex items-center gap-2 p-1 pl-2 rounded-xl hover:bg-[#F0F0F2] dark:hover:bg-[#202022] transition-colors cursor-pointer"
              >
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] leading-none">
                    {currentEmployee.fullName}
                  </div>
                  <div className="text-[10px] text-[#86868B] mt-0.5 leading-none">
                    {currentRole}
                  </div>
                </div>
                <AvatarInitials name={currentEmployee.fullName} size="sm" />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#161618] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-2xl shadow-xl py-1 z-50">
                  <div className="px-3.5 py-2.5 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
                    <div className="font-semibold text-xs text-[#1D1D1F] dark:text-[#F5F5F7]">
                      {currentEmployee.fullName}
                    </div>
                    <div className="text-[11px] text-[#86868B]">{currentEmployee.email}</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      openEmployeeProfile(currentEmployee.id);
                      setProfileMenuOpen(false);
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-medium text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-[#F0F0F2] dark:hover:bg-[#202022] flex items-center gap-2"
                  >
                    <User className="w-3.5 h-3.5 text-[#86868B]" />
                    <span>My Profile</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      navigateTo('settings');
                      setProfileMenuOpen(false);
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-medium text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-[#F0F0F2] dark:hover:bg-[#202022] flex items-center gap-2"
                  >
                    <Settings className="w-3.5 h-3.5 text-[#86868B]" />
                    <span>Settings & Preferences</span>
                  </button>

                  {appLockEnabled && (
                    <button
                      type="button"
                      onClick={() => {
                        lockAppNow();
                        setProfileMenuOpen(false);
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs font-medium text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-[#F0F0F2] dark:hover:bg-[#202022] flex items-center gap-2"
                    >
                      <Lock className="w-3.5 h-3.5 text-[#86868B]" />
                      <span>Lock Application</span>
                    </button>
                  )}

                  <div className="my-1 border-t border-[#E5E5EA] dark:border-[#2C2C2E]" />

                  <button
                    type="button"
                    onClick={() => {
                      signOutUser();
                      setProfileMenuOpen(false);
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>

      {/* Toast Notification Stream (Apple-style pill alerts) */}
      <div className="fixed bottom-5 right-5 z-9999 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto bg-white dark:bg-[#1C1C1E] text-[#1D1D1F] dark:text-[#F5F5F7] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-2xl p-4 shadow-xl max-w-sm flex items-start gap-3 animate-in slide-in-from-bottom duration-200"
          >
            <div className="w-5 h-5 rounded-full bg-[#1D1D1F] text-white dark:bg-white dark:text-[#1D1D1F] flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">
              ✓
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-semibold">{toast.title}</h4>
              {toast.description && (
                <p className="text-[11px] text-[#6E6E73] dark:text-[#A1A1A6] mt-0.5">
                  {toast.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
