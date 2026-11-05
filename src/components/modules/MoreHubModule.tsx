import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Megaphone,
  FileSignature,
  Palmtree,
  Building2,
  History,
  Settings,
  ArrowLeft,
  Plus,
  Edit3,
  Trash2,
  Printer,
  Search,
  ArrowUpDown,
  CheckCircle2,
  Sliders,
  GraduationCap,
  Cake,
  FileText,
  Award,
  BarChart3,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Calendar,
  Filter,
  Smartphone,
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
import {
  PolicyItem,
  AnnouncementItem,
  HolidayItem,
  BirthdayCelebrationRecord,
} from '../../types/hrms';
import { printOfficialLetter } from '../../lib/exportUtils';
import { ConsiderationsModule } from './ConsiderationsModule';
import { ReportsModule } from './ReportsModule';
import { CentralizedActivityLogView } from './ManageAccessModule';
import { MobileAppManagementModule } from './MobileAppManagementModule';

type HubSubId =
  | 'departments'
  | 'policies'
  | 'announcements'
  | 'letters'
  | 'internships'
  | 'holidays'
  | 'birthdays'
  | 'considerations'
  | 'reports'
  | 'mobile-app'
  | 'activity-log'
  | 'settings';

const HUB_TILES: {
  id: HubSubId;
  label: string;
  description: string;
  icon: React.FC<{ className?: string }>;
  badgeColor: string;
  roles: string[];
}[] = [
  {
    id: 'departments',
    label: 'Departments & Org Tree',
    description: 'Visual hierarchy (Company → Department → Manager → Employees) & unit drill-down',
    icon: Building2,
    badgeColor: 'bg-[#164C38]/10 text-[#164C38] border-[#164C38]/30',
    roles: ['ADMIN', 'HR'],
  },
  {
    id: 'birthdays',
    label: 'Birthdays',
    description: 'Today, this week, and upcoming team birthdays across Argos Watch',
    icon: Cake,
    badgeColor: 'bg-[#164C38]/10 text-[#164C38] border-[#164C38]/30',
    roles: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'],
  },
  {
    id: 'reports',
    label: 'Reports & Analytics',
    description: '10 standard enterprise reports with custom filters, preview & export',
    icon: BarChart3,
    badgeColor: 'bg-[#164C38]/10 text-[#164C38] border-[#164C38]/30',
    roles: ['ADMIN', 'HR'],
  },
  {
    id: 'mobile-app',
    label: 'Mobile App Management',
    description: 'Employee mobile app invitations, password resets, check-in/out permissions & GPS location audit',
    icon: Smartphone,
    badgeColor: 'bg-[#164C38]/10 text-[#164C38] border-[#164C38]/30',
    roles: ['ADMIN', 'HR'],
  },
  {
    id: 'activity-log',
    label: 'Activity / Audit Log & Permissions',
    description: 'Immutable system audit trail, individual permission control & permission change history',
    icon: History,
    badgeColor: 'bg-[#F2F2F2] text-[#141A17] border-[#CBCBCB]',
    roles: ['ADMIN', 'HR'],
  },
  {
    id: 'settings',
    label: 'Settings',
    description: 'Account preferences, shift timings, leave quotas, and notification settings',
    icon: Settings,
    badgeColor: 'bg-[#164C38]/10 text-[#164C38] border-[#164C38]/30',
    roles: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'],
  },
];

export function MoreHubModule() {
  const {
    currentUser,
    activeSubModule,
    activeSecondaryModule,
    navigateTo,
    setActiveSecondaryModule,
    setActiveModule,
    employees,
    allEmployees,
    attendance,
    leaves,
    policies,
    announcements,
    holidays,
    internships,
    addInternship,
    scopedLetters,
    generateAndSaveLetter,
    auditLogs,
    settings,
    updateCompanySettings,
    acknowledgePolicy,
    createPolicy,
    updatePolicy,
    deletePolicy,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    createHoliday,
    updateHoliday,
    deleteHoliday,
    birthdays,
    addBirthdayCelebration,
    updateBirthdayCelebration,
    deleteBirthdayCelebration,
    masterLetterTemplates,
    letterHistory,
    createLetterTemplate,
    updateLetterTemplate,
    deleteLetterTemplate,
    recordLetterHistory,
    incrementLetterExportCount,
    addToast,
    hasPermission,
    t,
  } = useHRMS();

  const setSubModule = (sub: HubSubId | null) => {
    setActiveSecondaryModule(sub as any);
    navigateTo('more', sub as any, null);
  };

  // Shared Filter & Sort State inside sub-modules
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Selected Department in Org Tree (Section 19)
  const [selectedOrgDept, setSelectedOrgDept] = useState<string | null>(null);

  // Settings Category Tab (Section 27)
  const [settingsCategory, setSettingsCategory] = useState<
    'company' | 'attendance' | 'leave' | 'payroll' | 'roles' | 'notifications' | 'templates'
  >('company');

  // Letter Generator State (Section 16)
  const [letterEmpId, setLetterEmpId] = useState(employees[0]?.id || 'EMP-1001');
  const [letterTemplate, setLetterTemplate] = useState<
    | 'Offer Letter'
    | 'Internship Letter'
    | 'Experience Letter'
    | 'Employment Letter'
    | 'Promotion Letter'
    | 'Salary Revision Letter'
    | 'Warning Letter'
    | 'Termination Letter'
  >('Offer Letter');
  const [letterRemarks, setLetterRemarks] = useState(
    'In recognition of exemplary horological precision and departmental leadership at Argos Watch.'
  );

  const [letterSubTab, setLetterSubTab] = useState<'generate' | 'history' | 'templates'>('generate');
  const [showTmplModal, setShowTmplModal] = useState(false);
  const [editingTmpl, setEditingTmpl] = useState<any>(null);
  const [tmplTitle, setTmplTitle] = useState('');
  const [tmplType, setTmplType] = useState('Offer');
  const [tmplSubject, setTmplSubject] = useState('');
  const [tmplBody, setTmplBody] = useState('');
  const [letterHistorySearch, setLetterHistorySearch] = useState('');
  const [letterHistoryFilter, setLetterHistoryFilter] = useState('ALL');

  // Internship Modal State (Section 17)
  const [showInternModal, setShowInternModal] = useState(false);
  const [internName, setInternName] = useState('');
  const [internDept, setInternDept] = useState('Assembling-Packaging/Dispatch');
  const [internMentor, setInternMentor] = useState('Husein Kakajiwala');
  const [internStart, setInternStart] = useState('2026-09-01');
  const [internEnd, setInternEnd] = useState('2026-12-01');
  const [internStipend, setInternStipend] = useState(18000);
  const [internType, setInternType] = useState<'Paid Stipend' | 'Academic Credit' | 'Pre-Placement'>('Paid Stipend');
  const [internStatus, setInternStatus] = useState<'Upcoming' | 'Active' | 'Completed' | 'Terminated'>('Active');

  // Policy Modal
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<PolicyItem | null>(null);
  const [polTitle, setPolTitle] = useState('');
  const [polCategory, setPolCategory] = useState<PolicyItem['category']>('ATTENDANCE');
  const [polVersion, setPolVersion] = useState('v2.5');
  const [polSummary, setPolSummary] = useState('');
  const [deletingPolicy, setDeletingPolicy] = useState<PolicyItem | null>(null);

  // Announcement Modal
  const [showAnnModal, setShowAnnModal] = useState(false);
  const [editingAnn, setEditingAnn] = useState<AnnouncementItem | null>(null);
  const [annTitle, setAnnTitle] = useState('');
  const [annCategory, setAnnCategory] = useState<AnnouncementItem['category']>('GENERAL');
  const [annBody, setAnnBody] = useState('');
  const [deletingAnn, setDeletingAnn] = useState<AnnouncementItem | null>(null);

  // Holiday Modal
  const [showHolModal, setShowHolModal] = useState(false);
  const [editingHol, setEditingHol] = useState<HolidayItem | null>(null);
  const [holName, setHolName] = useState('');
  const [holDate, setHolDate] = useState('2026-11-01');
  const [holType, setHolType] = useState<HolidayItem['type']>('FESTIVAL');
  const [deletingHol, setDeletingHol] = useState<HolidayItem | null>(null);

  // Team Birthdays & Celebrations State (Requirement 4)
  const [showBdayModal, setShowBdayModal] = useState(false);
  const [editingBday, setEditingBday] = useState<BirthdayCelebrationRecord | null>(null);
  const [bdayEmployeeId, setBdayEmployeeId] = useState(employees[0]?.id || 'EMP-1001');
  const [bdayTitle, setBdayTitle] = useState('');
  const [bdayDate, setBdayDate] = useState('2026-10-05');
  const [bdayType, setBdayType] = useState<string>('Birthday');
  const [bdayNotes, setBdayNotes] = useState('');
  const [deletingBday, setDeletingBday] = useState<BirthdayCelebrationRecord | null>(null);
  const [bdaySearch, setBdaySearch] = useState('');
  const [bdayDeptFilter, setBdayDeptFilter] = useState('ALL');

  // Activity Log Filter & Diff State
  const [logSearch, setLogSearch] = useState('');
  const [logModule, setLogModule] = useState('ALL');
  const [logActor, setLogActor] = useState('ALL');
  const [logStartDate, setLogStartDate] = useState('');
  const [logEndDate, setLogEndDate] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const distinctLogModules = useMemo(() => {
    const set = new Set<string>();
    auditLogs.forEach((l: any) => {
      if (l.module) set.add(l.module);
    });
    return ['ALL', ...Array.from(set)];
  }, [auditLogs]);

  const distinctLogActors = useMemo(() => {
    const set = new Set<string>();
    auditLogs.forEach((l: any) => {
      if (l.actorName) set.add(l.actorName);
    });
    return ['ALL', ...Array.from(set)];
  }, [auditLogs]);

  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((log: any) => {
      const q = logSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        log.action?.toLowerCase().includes(q) ||
        log.actorName?.toLowerCase().includes(q) ||
        log.actorRole?.toLowerCase().includes(q) ||
        log.target?.toLowerCase().includes(q) ||
        log.previousValue?.toLowerCase().includes(q) ||
        log.newValue?.toLowerCase().includes(q);

      const matchModule = logModule === 'ALL' || log.module === logModule;
      const matchActor = logActor === 'ALL' || log.actorName === logActor;

      let matchDate = true;
      if (logStartDate) {
        matchDate = matchDate && log.timestamp >= logStartDate;
      }
      if (logEndDate) {
        matchDate = matchDate && log.timestamp <= logEndDate + ' 23:59:59';
      }

      return matchSearch && matchModule && matchActor && matchDate;
    });
  }, [auditLogs, logSearch, logModule, logActor, logStartDate, logEndDate]);

  const isHRAdmin = currentUser.role === 'HR' || currentUser.role === 'ADMIN';
  const canManageBirthdays = isHRAdmin && hasPermission('celebrations.manage_birthdays');
  const selectedLetterEmp =
    employees.find((e) => e.id === letterEmpId) || employees[0];

  const visibleTiles = useMemo(
    () =>
      HUB_TILES.filter((tile) => {
        if (!tile.roles.includes(currentUser.role)) return false;
        if (tile.id === 'activity-log' && !hasPermission('admin.view_activity_log')) return false;
        if (tile.id === 'reports' && !hasPermission('reports.view')) return false;
        if (tile.id === 'birthdays' && !hasPermission('celebrations.view_birthdays')) return false;
        if (tile.id === 'departments' && !hasPermission('org.view_departments')) return false;
        return true;
      }),
    [currentUser.role, hasPermission]
  );

  // Prevent Employee from accessing Generate Letter ('letters') or any unauthorized sub-module via route state
  const rawSub: HubSubId | null =
    (activeSubModule as HubSubId) || (activeSecondaryModule as HubSubId) || null;
  const currentSub: HubSubId | null =
    rawSub &&
    (visibleTiles.some((t) => t.id === rawSub) ||
      (rawSub === 'letters' && isHRAdmin))
      ? rawSub
      : null;

  // Delegate sub-modules that have dedicated full modules
  if (currentSub === 'considerations') {
    return (
      <div className="space-y-2">
        <div className="px-6 pt-4">
          <button
            onClick={() => setSubModule(null)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#164C38] hover:underline cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to More Hub
          </button>
        </div>
        <ConsiderationsModule />
      </div>
    );
  }

  if (currentSub === 'reports') {
    return (
      <div className="space-y-2">
        <div className="px-6 pt-4">
          <button
            onClick={() => setSubModule(null)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#164C38] hover:underline cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to More Hub
          </button>
        </div>
        <ReportsModule />
      </div>
    );
  }

  if (currentSub === 'mobile-app') {
    return (
      <div className="space-y-2">
        <div className="px-6 pt-4">
          <button
            onClick={() => setSubModule(null)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#164C38] hover:underline cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to More Hub
          </button>
        </div>
        <MobileAppManagementModule />
      </div>
    );
  }

  // Hub Landing Grid
  if (!currentSub) {
    return (
      <div className="p-4 lg:p-6 max-w-[1440px] mx-auto space-y-6">
        <div className="pb-5 border-b border-[#CBCBCB] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="px-2.5 py-0.5 rounded-md bg-[#4E1617]/10 border border-[#4E1617]/30 text-[#4E1617] text-[10px] font-bold uppercase tracking-wider">
              Governance, Compliance & Organization Hub
            </span>
            <h1 className="text-xl font-bold text-[#141A17] tracking-tight mt-1.5">
              More Enterprise Modules
            </h1>
            <p className="text-xs text-[#525854] mt-0.5">
              Departments & Org Tree, Policies, Announcements, Letters, Documents, Internships, Holidays, Birthdays, Considerations, Audit Log & Settings
            </p>
          </div>
          {isHRAdmin && (
            <button
              onClick={() => setActiveModule('company-info')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#164C38] hover:bg-[#0F3627] text-[#F2F2F2] text-xs font-semibold transition-colors cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
              Open Company Timings & Policy Control Center
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleTiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <div
                key={tile.id}
                onClick={() => {
                  setSearchQuery('');
                  setFilterCategory('ALL');
                  setSubModule(tile.id);
                }}
                className="bg-white border border-[#CBCBCB] hover:border-[#164C38] rounded-xl p-5 cursor-pointer transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className={`w-9 h-9 rounded-lg border flex items-center justify-center ${tile.badgeColor}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-bold text-[#525854] group-hover:text-[#164C38]">
                      Open Module →
                    </span>
                  </div>
                  <h2 className="text-sm font-bold text-[#141A17]">{tile.label}</h2>
                  <p className="text-xs text-[#525854] mt-1 leading-relaxed">
                    {tile.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-[1440px] mx-auto space-y-6">
      <button
        onClick={() => setSubModule(null)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#164C38] hover:underline cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to More Hub
      </button>

      {/* ===================================================================== */}
      {/* SECTION 19: DEPARTMENTS & VISUAL ORGANIZATION TREE                    */}
      {/* ===================================================================== */}
      {currentSub === 'departments' && (
        <div className="space-y-6">
          <div className="pb-4 border-b border-[#CBCBCB]">
            <h1 className="text-lg font-bold text-[#141A17]">
              Departments & Visual Organization Tree
            </h1>
            <p className="text-xs text-[#525854]">
              Company → Department → Manager → Employees hierarchy. Click any department to inspect headcount, attendance & leave.
            </p>
          </div>

          {/* Root Node: Company */}
          <div className="bg-[#164C38] text-[#F2F2F2] rounded-2xl p-5 border border-[#0F3627] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-[#4E1617] text-[#F2F2F2]">
                Organization Root
              </span>
              <h2 className="text-lg font-bold mt-1">{settings.companyName}</h2>
              <p className="text-xs text-[#CBCBCB]">
                Head of People & Culture: Chaitanya Katare · Total Roster: {employees.length} Members
              </p>
            </div>
            {selectedOrgDept && (
              <button
                onClick={() => setSelectedOrgDept(null)}
                className="px-3 py-1.5 rounded-lg bg-[#F2F2F2] text-[#164C38] text-xs font-bold cursor-pointer"
              >
                Show All Departments
              </button>
            )}
          </div>

          {/* Department Branches */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from(new Set<string>(employees.map((e) => e.department))).map((deptName: string) => {
              const deptMembers = employees.filter((e) => e.department === deptName);
              const lead =
                deptMembers.find((m) => m.role === 'MANAGER' || m.role === 'HR') ||
                deptMembers[0];
              const isSelected = selectedOrgDept === deptName;
              const deptAttPresent = attendance.filter(
                (a) => a.department === deptName && a.status === 'PRESENT'
              ).length;
              const deptLeaves = leaves.filter((l) => l.department === deptName).length;

              return (
                <div
                  key={deptName}
                  onClick={() =>
                    setSelectedOrgDept(isSelected ? null : deptName)
                  }
                  className={`bg-white border rounded-xl p-5 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[#164C38] ring-2 ring-[#164C38]/20'
                      : 'border-[#CBCBCB] hover:border-[#164C38]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#164C38] uppercase tracking-wider">
                      {deptName}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#4E1617] text-[#F2F2F2] text-[10px] font-mono font-bold">
                      {deptMembers.length} {deptMembers.length === 1 ? 'Member' : 'Members'}
                    </span>
                  </div>

                  {/* Manager Node */}
                  {lead && (
                    <div className="p-2.5 rounded-lg bg-[#F2F2F2] border border-[#CBCBCB] mb-3">
                      <span className="text-[10px] font-bold uppercase text-[#4E1617] block">
                        Department Head / Manager
                      </span>
                      <span className="text-xs font-bold text-[#141A17]">
                        {lead.fullName}
                      </span>
                      <span className="text-[11px] text-[#525854] block">
                        {lead.designation}
                      </span>
                    </div>
                  )}

                  {/* Team Tree Nodes */}
                  <div className="space-y-1.5 pl-3 border-l-2 border-[#164C38]">
                    {deptMembers.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between text-xs py-1"
                      >
                        <span className="font-semibold text-[#141A17]">
                          ↳ {m.fullName}
                        </span>
                        <span className="text-[10px] font-mono text-[#525854]">
                          {m.role === 'EMPLOYEE' ? 'Team' : m.role}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#CBCBCB] flex items-center justify-between text-[11px] text-[#525854]">
                    <span>Present Logs: {deptAttPresent}</span>
                    <span>Leaves: {deptLeaves}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION 16: AUTOMATED HR LETTER GENERATOR (8 TEMPLATES)               */}
      {/* ===================================================================== */}
      {currentSub === 'letters' && isHRAdmin && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#CBCBCB]">
            <div>
              <h1 className="text-lg font-bold text-[#141A17]">
                Official HR Letter Center
              </h1>
              <p className="text-xs text-[#525854]">
                Strict separation between master template administration, operational issuance, and audit history.
              </p>
            </div>

            {/* Sub Tabs */}
            <div className="flex items-center gap-1.5 bg-[#F2F2F2] p-1 rounded-xl border border-[#CBCBCB]">
              <button
                type="button"
                onClick={() => setLetterSubTab('generate')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  letterSubTab === 'generate'
                    ? 'bg-[#164C38] text-[#F2F2F2] shadow-xs'
                    : 'text-[#525854] hover:text-[#141A17]'
                }`}
              >
                Generate Letter
              </button>
              <button
                type="button"
                onClick={() => setLetterSubTab('history')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  letterSubTab === 'history'
                    ? 'bg-[#164C38] text-[#F2F2F2] shadow-xs'
                    : 'text-[#525854] hover:text-[#141A17]'
                }`}
              >
                Letter History ({letterHistory.length})
              </button>
              {currentUser.role === 'ADMIN' && (
                <button
                  type="button"
                  onClick={() => setLetterSubTab('templates')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                    letterSubTab === 'templates'
                      ? 'bg-[#164C38] text-[#F2F2F2] shadow-xs'
                      : 'text-[#525854] hover:text-[#141A17]'
                  }`}
                >
                  Master Templates ({masterLetterTemplates.length})
                </button>
              )}
            </div>
          </div>

          {/* SUB-TAB 1: GENERATE LETTER */}
          {letterSubTab === 'generate' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 bg-white border border-[#CBCBCB] rounded-xl p-5 space-y-4 shadow-xs">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                    Select Employee
                  </label>
                  <select
                    value={letterEmpId}
                    onChange={(e) => setLetterEmpId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs font-medium"
                  >
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.fullName} ({e.employeeCode} • {e.designation})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                    Select Official Letter Template (Approved Master Templates)
                  </label>
                  <select
                    value={letterTemplate}
                    onChange={(e) => setLetterTemplate(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs font-semibold text-[#164C38]"
                  >
                    <option value="Offer Letter">1. Offer Letter</option>
                    <option value="Internship Letter">2. Internship Letter</option>
                    <option value="Experience Letter">3. Experience Letter</option>
                    <option value="Employment Letter">4. Employment Verification / NOC Letter</option>
                    <option value="Promotion Letter">5. Promotion Letter</option>
                    <option value="Salary Revision Letter">6. Salary Revision Letter</option>
                    <option value="Warning Letter">7. Warning Letter</option>
                    <option value="Termination Letter">8. Termination Letter</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                    Executive Remarks / Custom Clause
                  </label>
                  <textarea
                    rows={3}
                    value={letterRemarks}
                    onChange={(e) => setLetterRemarks(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedLetterEmp) return;
                      generateAndSaveLetter({
                        employeeId: selectedLetterEmp.id,
                        templateType: letterTemplate as any,
                        subject: `${letterTemplate} — ${selectedLetterEmp.fullName}`,
                        content: letterRemarks,
                      });
                      recordLetterHistory({
                        employeeId: selectedLetterEmp.id,
                        employeeName: selectedLetterEmp.fullName,
                        letterType: letterTemplate,
                        templateName: letterTemplate,
                        templateVersion: 1,
                        content: letterRemarks,
                        generatedBy: currentUser.id,
                        generatedByName: currentUser.fullName,
                        deliveryStatus: 'Generated',
                        status: 'Active',
                      });
                      addToast('Letter Saved', `Saved to ${selectedLetterEmp.fullName}'s profile and recorded in history.`);
                    }}
                    className="py-2.5 bg-[#164C38] hover:bg-[#0F3627] text-[#F2F2F2] text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    Save to Profile & Log
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedLetterEmp) return;
                      printOfficialLetter({
                        recipientName: selectedLetterEmp.fullName,
                        employeeCode: selectedLetterEmp.employeeCode,
                        designation: selectedLetterEmp.designation,
                        department: selectedLetterEmp.department,
                        joiningDate: selectedLetterEmp.joiningDate,
                        annualCTC: selectedLetterEmp.annualCTC,
                        letterType: 'OFFER',
                        issuedBy: currentUser.fullName,
                        customRemarks: `[${letterTemplate}] ${letterRemarks}`,
                      });
                      recordLetterHistory({
                        employeeId: selectedLetterEmp.id,
                        employeeName: selectedLetterEmp.fullName,
                        letterType: letterTemplate,
                        templateName: letterTemplate,
                        templateVersion: 1,
                        content: letterRemarks,
                        generatedBy: currentUser.id,
                        generatedByName: currentUser.fullName,
                        deliveryStatus: 'Delivered',
                        status: 'Active',
                      });
                    }}
                    className="py-2.5 bg-[#4E1617] hover:bg-[#380F10] text-[#F2F2F2] text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print / Download PDF
                  </button>
                </div>
              </div>

              {/* Live Letter Preview */}
              <div className="lg:col-span-7 bg-white border border-[#CBCBCB] rounded-xl p-6 space-y-4 shadow-xs">
                <div className="border-b-2 border-[#164C38] pb-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold uppercase tracking-wider text-[#164C38]">
                      ARGOS WATCH — PEOPLE & CULTURE DIRECTORATE
                    </div>
                    <div className="text-[11px] text-[#525854]">
                      Official HR Correspondence • Template: {letterTemplate}
                    </div>
                  </div>
                  <span className="font-mono text-xs text-[#4E1617] font-bold">
                    REF/{new Date().getFullYear()}/{selectedLetterEmp?.employeeCode}
                  </span>
                </div>

                {selectedLetterEmp && (
                  <div className="text-xs text-[#141A17] space-y-3 leading-relaxed">
                    <p>
                      <strong>To:</strong> {selectedLetterEmp.fullName} ({selectedLetterEmp.employeeCode})<br />
                      <strong>Designation:</strong> {selectedLetterEmp.designation} · {selectedLetterEmp.department}
                    </p>
                    <p className="font-bold text-[#164C38] underline">
                      SUBJECT: {letterTemplate.toUpperCase()}
                    </p>
                    <p>Dear {selectedLetterEmp.fullName},</p>
                    <p>{letterRemarks}</p>
                    <p>
                      Your annual compensation structure on record is{' '}
                      <strong className="font-mono">
                        ₹{selectedLetterEmp.annualCTC.toLocaleString('en-IN')}
                      </strong>{' '}
                      per annum, governed by Argos Watch company policies.
                    </p>
                    <div className="pt-4 border-t border-[#CBCBCB] flex justify-between text-[11px] text-[#525854]">
                      <span>Authorized Signatory: {currentUser.fullName}</span>
                      <span>Argos Watch Pvt. Ltd.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SUB-TAB 2: HR LETTER HISTORY (IMMUTABLE AUDIT TRAIL) */}
          {letterSubTab === 'history' && (
            <div className="space-y-4">
              <div className="bg-white border border-[#CBCBCB] rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-[#525854] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search history by employee name, ID, or letter type..."
                    value={letterHistorySearch}
                    onChange={(e) => setLetterHistorySearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#164C38]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={letterHistoryFilter}
                    onChange={(e) => setLetterHistoryFilter(e.target.value)}
                    className="px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs font-medium"
                  >
                    <option value="ALL">All Delivery Statuses</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Generated">Generated</option>
                    <option value="Sent">Sent</option>
                    <option value="Draft">Draft</option>
                  </select>
                </div>
              </div>

              <div className="bg-white border border-[#CBCBCB] rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F2F2F2] border-b border-[#CBCBCB] text-[10px] font-bold uppercase text-[#525854]">
                      <th className="py-3 px-4">Letter ID & Date</th>
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Letter Type & Template</th>
                      <th className="py-3 px-4">Issued By</th>
                      <th className="py-3 px-4">Delivery Status</th>
                      <th className="py-3 px-4 text-center">Export Count</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#CBCBCB]">
                    {letterHistory
                      .filter((lh) => {
                        if (letterHistoryFilter !== 'ALL' && lh.deliveryStatus !== letterHistoryFilter) return false;
                        if (letterHistorySearch.trim()) {
                          const q = letterHistorySearch.toLowerCase();
                          return (
                            lh.employeeName.toLowerCase().includes(q) ||
                            lh.employeeId.toLowerCase().includes(q) ||
                            lh.letterType.toLowerCase().includes(q)
                          );
                        }
                        return true;
                      })
                      .map((lh) => (
                        <tr key={lh.id} className="hover:bg-[#F2F2F2]/60">
                          <td className="py-3 px-4">
                            <span className="font-mono font-bold text-[#141A17] block">{lh.id}</span>
                            <span className="text-[10px] text-[#525854]">{lh.generatedAt}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-[#141A17] block">{lh.employeeName}</span>
                            <span className="text-[10px] font-mono text-[#525854]">{lh.employeeId}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-[#164C38] block">{lh.letterType}</span>
                            <span className="text-[10px] text-[#525854]">{lh.templateName} (v{lh.templateVersion})</span>
                          </td>
                          <td className="py-3 px-4 text-[#525854]">
                            {lh.generatedByName}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#164C38]/10 text-[#164C38] border border-[#164C38]/30">
                              {lh.deliveryStatus}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-[#141A17]">
                            {lh.exportCount}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                incrementLetterExportCount(lh.id);
                                printOfficialLetter({
                                  recipientName: lh.employeeName,
                                  employeeCode: lh.employeeId,
                                  designation: 'Enterprise Staff',
                                  department: 'Argos Watch',
                                  joiningDate: '2026-10-06',
                                  annualCTC: 750000,
                                  letterType: 'OFFER',
                                  issuedBy: lh.generatedByName,
                                  customRemarks: lh.content,
                                });
                              }}
                              className="px-2.5 py-1 bg-[#164C38] text-[#F2F2F2] rounded-md text-[11px] font-semibold hover:bg-[#0F3627] cursor-pointer inline-flex items-center gap-1"
                            >
                              <Printer className="w-3 h-3" /> Re-Download
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUB-TAB 3: MASTER TEMPLATES (ADMIN ONLY) */}
          {letterSubTab === 'templates' && currentUser.role === 'ADMIN' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#CBCBCB]">
                <div>
                  <h2 className="text-sm font-bold text-[#141A17]">
                    Master Template Governance & Formatting
                  </h2>
                  <p className="text-xs text-[#525854]">
                    Configure reusable template standards, variable placeholders, and numbering conventions.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditingTmpl(null);
                    setTmplTitle('');
                    setTmplType('Offer');
                    setTmplSubject('');
                    setTmplBody('');
                    setShowTmplModal(true);
                  }}
                  className="px-3.5 py-2 bg-[#164C38] hover:bg-[#0F3627] text-[#F2F2F2] rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create Template
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {masterLetterTemplates.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    className="p-4 bg-white border border-[#CBCBCB] hover:border-[#164C38] rounded-xl shadow-xs space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#164C38]/10 text-[#164C38] border border-[#164C38]/30">
                          {tmpl.type}
                        </span>
                        <span className="text-[10px] font-mono text-[#525854]">
                          v{tmpl.version} • {tmpl.status}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-[#141A17]">{tmpl.title}</h3>
                      <p className="text-[11px] text-[#525854] mt-1 font-mono truncate">
                        Subject: {tmpl.subject}
                      </p>

                      <div className="mt-3 pt-2 border-t border-[#CBCBCB]">
                        <span className="text-[10px] font-bold uppercase text-[#525854] block mb-1">
                          Configured Placeholders:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {(tmpl.placeholders || []).slice(0, 5).map((ph) => (
                            <span key={ph} className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#F2F2F2] text-[#141A17] border border-[#CBCBCB]">
                              {ph}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-[#CBCBCB]">
                      <span className="text-[10px] text-[#525854]">
                        Updated: {tmpl.updatedAt}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTmpl(tmpl);
                            setTmplTitle(tmpl.title);
                            setTmplType(tmpl.type);
                            setTmplSubject(tmpl.subject);
                            setTmplBody(tmpl.bodyTemplate);
                            setShowTmplModal(true);
                          }}
                          className="p-1.5 rounded hover:bg-[#F2F2F2] text-[#164C38] cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteLetterTemplate(tmpl.id)}
                          className="p-1.5 rounded hover:bg-[#4E1617]/10 text-[#4E1617] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add/Edit Template Modal */}
              {showTmplModal && (
                <ModalShell
                  title={editingTmpl ? `Edit Template — ${editingTmpl.title}` : 'Create Master Letter Template'}
                  subtitle="Configure reusable format, authorized placeholders, and numbering conventions"
                  maxWidth="max-w-xl"
                >
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!tmplTitle.trim() || !tmplBody.trim()) return;
                      if (editingTmpl) {
                        updateLetterTemplate(editingTmpl.id, {
                          title: tmplTitle,
                          type: tmplType,
                          subject: tmplSubject,
                          bodyTemplate: tmplBody,
                        });
                      } else {
                        createLetterTemplate({
                          title: tmplTitle,
                          type: tmplType,
                          subject: tmplSubject,
                          bodyTemplate: tmplBody,
                          placeholders: ['{{fullName}}', '{{designation}}', '{{department}}', '{{joiningDate}}', '{{date}}'],
                          status: 'Active',
                          createdBy: currentUser.fullName,
                        });
                      }
                      setShowTmplModal(false);
                    }}
                    className="space-y-3.5"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                          Template Title *
                        </label>
                        <input
                          type="text"
                          required
                          value={tmplTitle}
                          onChange={(e) => setTmplTitle(e.target.value)}
                          className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                          Letter Type *
                        </label>
                        <select
                          value={tmplType}
                          onChange={(e) => setTmplType(e.target.value)}
                          className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs"
                        >
                          <option value="Offer">Offer Letter</option>
                          <option value="Internship">Internship Letter</option>
                          <option value="Appointment">Appointment Letter</option>
                          <option value="Confirmation">Confirmation Letter</option>
                          <option value="Experience">Experience Letter</option>
                          <option value="Termination">Termination Letter</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                        Default Email / Document Subject
                      </label>
                      <input
                        type="text"
                        value={tmplSubject}
                        onChange={(e) => setTmplSubject(e.target.value)}
                        className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                        Body Template (With Placeholders) *
                      </label>
                      <textarea
                        rows={6}
                        required
                        value={tmplBody}
                        onChange={(e) => setTmplBody(e.target.value)}
                        className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs font-mono"
                        placeholder="Dear {{fullName}}, Consequent to your performance in {{department}}..."
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#CBCBCB]">
                      <button
                        type="button"
                        onClick={() => setShowTmplModal(false)}
                        className="px-4 py-2 text-xs font-semibold text-[#525854]"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-[#164C38] text-[#F2F2F2] rounded-lg text-xs font-semibold"
                      >
                        {editingTmpl ? 'Save Updates' : 'Save Template'}
                      </button>
                    </div>
                  </form>
                </ModalShell>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION 17: INTERNSHIP MANAGEMENT                                     */}
      {/* ===================================================================== */}
      {currentSub === 'internships' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-[#CBCBCB]">
            <div>
              <h1 className="text-lg font-bold text-[#141A17]">
                Internship Cohort Management
              </h1>
              <p className="text-xs text-[#525854]">
                Track interns, mentors, stipends, durations, and upcoming completion dates
              </p>
            </div>
            {isHRAdmin && (
              <button
                onClick={() => setShowInternModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#164C38] text-[#F2F2F2] text-xs font-semibold rounded-lg cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Intern
              </button>
            )}
          </div>

          <div className="bg-white border border-[#CBCBCB] rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#CBCBCB] text-[10px] font-bold uppercase text-[#525854] bg-[#F2F2F2]">
                  <th className="py-3.5 px-4">Intern Name & ID</th>
                  <th className="py-3.5 px-4">Department & Mentor</th>
                  <th className="py-3.5 px-4">Period & Duration</th>
                  <th className="py-3.5 px-4">Type & Stipend</th>
                  <th className="py-3.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#CBCBCB]/60 text-xs">
                {(internships || []).map((i: any) => (
                  <tr key={i.id} className="hover:bg-[#F2F2F2]">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#141A17]">{i.internName}</div>
                      <div className="text-[11px] font-mono text-[#164C38]">{i.id}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#141A17]">{i.department}</div>
                      <div className="text-[11px] text-[#525854]">Mentor: {i.mentorName}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#525854]">
                      {i.startDate} → {i.endDate} ({i.duration})
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-[#164C38]">
                        ₹{Number(i.stipend).toLocaleString('en-IN')}/mo
                      </div>
                      <div className="text-[11px] text-[#525854]">{i.internshipType}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={i.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ModalShell
            isOpen={showInternModal}
            onClose={() => setShowInternModal(false)}
            title="Add New Intern Record"
            subtitle="Track intern assignment, mentor, stipend, and end-date reminder"
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!internName.trim()) return;
                addInternship({
                  internName,
                  email: `${internName.toLowerCase().replace(/\s+/g, '.')}@argos.watch`,
                  department: internDept,
                  mentorId: 'EMP-1002',
                  mentorName: internMentor,
                  joiningDate: internStart,
                  startDate: internStart,
                  endDate: internEnd,
                  duration: '3 Months',
                  internshipType: internType,
                  stipend: Number(internStipend),
                  status: internStatus,
                  documentsSubmitted: true,
                  letterIssued: true,
                  notes: 'Onboarded via Internship Management',
                });
                setShowInternModal(false);
                setInternName('');
              }}
              className="space-y-3.5"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                    Intern Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={internName}
                    onChange={(e) => setInternName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={internDept}
                    onChange={(e) => setInternDept(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                    Assigned Mentor
                  </label>
                  <input
                    type="text"
                    value={internMentor}
                    onChange={(e) => setInternMentor(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                    Monthly Stipend (₹)
                  </label>
                  <input
                    type="number"
                    value={internStipend}
                    onChange={(e) => setInternStipend(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={internStart}
                    onChange={(e) => setInternStart(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={internEnd}
                    onChange={(e) => setInternEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#CBCBCB]">
                <button
                  type="button"
                  onClick={() => setShowInternModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-[#525854]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#164C38] text-[#F2F2F2]"
                >
                  Save Intern
                </button>
              </div>
            </form>
          </ModalShell>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION 21: TEAM BIRTHDAYS & CELEBRATIONS (EDIT & DELETE FOR HR/ADMIN) */}
      {/* ===================================================================== */}
      {currentSub === 'birthdays' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#CBCBCB] dark:border-[#1E293B]">
            <div>
              <h1 className="text-lg font-bold text-[#141A17] dark:text-[#EFF1F3]">
                Team Birthdays & Celebrations
              </h1>
              <p className="text-xs text-[#525854] dark:text-[#94A3B8]">
                Upcoming birthdays, work anniversaries, and milestone celebrations across Argos Watch departments
              </p>
            </div>

            {canManageBirthdays && (
              <button
                type="button"
                onClick={() => {
                  const defaultEmp = (allEmployees || employees)[0];
                  setEditingBday(null);
                  setBdayEmployeeId(defaultEmp?.id || 'EMP-1001');
                  setBdayTitle(`${defaultEmp?.fullName || 'Team Member'}'s Birthday`);
                  setBdayDate(
                    defaultEmp?.dob ? `2026-${defaultEmp.dob.slice(5)}` : '2026-10-18'
                  );
                  setBdayType('Birthday');
                  setBdayNotes(
                    `Annual team celebration for ${defaultEmp?.fullName || 'Team Member'}.`
                  );
                  setShowBdayModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#2D5A27] hover:bg-[#23461E] text-white text-xs font-semibold cursor-pointer shadow-xs self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('Add Celebration')}</span>
              </button>
            )}
          </div>

          {/* Search & Department Filter Toolbar */}
          <div className="bg-white dark:bg-[#111827] border border-[#CBCBCB] dark:border-[#1E293B] rounded-xl p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-[#525854] dark:text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={bdaySearch}
                onChange={(e) => setBdaySearch(e.target.value)}
                placeholder="Search by employee name, event title, date, or department..."
                className="w-full pl-9 pr-3 py-2 bg-[#F2F4F6] dark:bg-[#1E293B] border border-[#CBCBCB] dark:border-[#334155] rounded-lg text-xs text-[#191C1E] dark:text-[#EFF1F3] focus:outline-none focus:border-[#2D5A27]"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={bdayDeptFilter}
                onChange={(e) => setBdayDeptFilter(e.target.value)}
                className="px-3 py-2 bg-[#F2F4F6] dark:bg-[#1E293B] border border-[#CBCBCB] dark:border-[#334155] rounded-lg text-xs text-[#191C1E] dark:text-[#EFF1F3] font-medium"
              >
                <option value="ALL">All Departments</option>
                {Array.from(
                  new Set((allEmployees || employees).map((e: any) => e.department))
                ).map((dept: any) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Celebration Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(birthdays || [])
              .filter((item) => {
                if (bdayDeptFilter !== 'ALL' && item.department !== bdayDeptFilter) {
                  return false;
                }
                if (bdaySearch.trim()) {
                  const q = bdaySearch.toLowerCase().trim();
                  return (
                    item.title.toLowerCase().includes(q) ||
                    item.employeeName.toLowerCase().includes(q) ||
                    item.employeeId.toLowerCase().includes(q) ||
                    item.department.toLowerCase().includes(q) ||
                    item.date.includes(q) ||
                    (item.notes && item.notes.toLowerCase().includes(q))
                  );
                }
                return true;
              })
              .map((bday) => (
                <div
                  key={bday.id}
                  className="bg-white dark:bg-[#111827] border border-[#CBCBCB] dark:border-[#1E293B] hover:border-[#2D5A27] rounded-xl p-4 flex flex-col justify-between gap-3 transition-all shadow-2xs"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <AvatarInitials name={bday.employeeName} size="md" />
                        <div className="min-w-0">
                          <h3 className="text-xs sm:text-sm font-bold text-[#191C1E] dark:text-[#EFF1F3] truncate">
                            {bday.title}
                          </h3>
                          <p className="text-[11px] text-[#45464D] dark:text-[#94A3B8] truncate">
                            {bday.employeeName} ({bday.employeeId}) · {bday.department}
                          </p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-[#2D5A27]/15 border border-[#2D5A27]/30 text-[#2D5A27] dark:text-[#4ADE80] font-mono text-xs font-bold shrink-0">
                        {bday.date}
                      </span>
                    </div>

                    {bday.notes && (
                      <p className="text-xs text-[#45464D] dark:text-[#94A3B8] leading-relaxed bg-[#F2F4F6] dark:bg-[#1E293B] p-2.5 rounded-lg border border-[#CBCBCB] dark:border-[#334155]">
                        {bday.notes}
                      </p>
                    )}
                  </div>

                  <div className="pt-2.5 border-t border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-[#F2F4F6] dark:bg-[#1E293B] text-[#45464D] dark:text-[#94A3B8]">
                      {bday.celebrationType || 'Birthday'}
                    </span>

                    {canManageBirthdays && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingBday(bday);
                            setBdayEmployeeId(bday.employeeId);
                            setBdayTitle(bday.title);
                            setBdayDate(bday.date);
                            setBdayType(bday.celebrationType || 'Birthday');
                            setBdayNotes(bday.notes || '');
                            setShowBdayModal(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F2F4F6] dark:bg-[#1E293B] hover:border-[#2D5A27] border border-[#CBCBCB] dark:border-[#334155] text-xs font-semibold text-[#191C1E] dark:text-[#EFF1F3] cursor-pointer transition-colors"
                          title="Edit birthday or celebration record"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-[#2D5A27] dark:text-[#4ADE80]" />
                          <span>{t('common.edit', 'Edit')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingBday(bday)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-semibold text-rose-700 cursor-pointer transition-colors"
                          title="Delete celebration entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{t('common.delete', 'Delete')}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>

          {/* Add / Edit Birthday Celebration Modal (HR & Admin Only) */}
          <ModalShell
            isOpen={showBdayModal && isHRAdmin}
            onClose={() => {
              setShowBdayModal(false);
              setEditingBday(null);
            }}
            title={
              editingBday
                ? `Edit Celebration — ${editingBday.title}`
                : 'Add Team Birthday / Celebration'
            }
            subtitle="Update celebration date, event title, associated employee, and notes"
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!bdayTitle.trim() || !bdayDate.trim()) return;
                const empObj =
                  (allEmployees || employees).find((emp: any) => emp.id === bdayEmployeeId) ||
                  (allEmployees || employees)[0];

                if (editingBday) {
                  updateBirthdayCelebration(editingBday.id, {
                    employeeId: empObj?.id || bdayEmployeeId,
                    employeeName: empObj?.fullName || editingBday.employeeName,
                    department: empObj?.department || editingBday.department,
                    designation: empObj?.designation || editingBday.designation,
                    title: bdayTitle.trim(),
                    date: bdayDate,
                    celebrationType: bdayType,
                    notes: bdayNotes.trim(),
                  });
                } else {
                  addBirthdayCelebration({
                    employeeId: empObj?.id || bdayEmployeeId,
                    employeeName: empObj?.fullName || 'Team Member',
                    department: empObj?.department || 'Operations',
                    designation: empObj?.designation || 'Staff',
                    title: bdayTitle.trim(),
                    date: bdayDate,
                    celebrationType: bdayType,
                    notes: bdayNotes.trim(),
                  });
                }
                setShowBdayModal(false);
                setEditingBday(null);
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#525854] dark:text-[#94A3B8] mb-1">
                  Associated Employee *
                </label>
                <select
                  value={bdayEmployeeId}
                  onChange={(e) => {
                    const newEmpId = e.target.value;
                    setBdayEmployeeId(newEmpId);
                    const empObj = (allEmployees || employees).find(
                      (emp: any) => emp.id === newEmpId
                    );
                    if (empObj && !editingBday) {
                      setBdayTitle(`${empObj.fullName}'s ${bdayType}`);
                      if (empObj.dob) {
                        setBdayDate(`2026-${empObj.dob.slice(5)}`);
                      }
                    }
                  }}
                  className="w-full px-3 py-2 bg-[#F2F4F6] dark:bg-[#1E293B] border border-[#CBCBCB] dark:border-[#334155] rounded-lg text-xs font-semibold text-[#191C1E] dark:text-[#EFF1F3]"
                >
                  {(allEmployees || employees).map((emp: any) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.id} · {emp.department})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#525854] dark:text-[#94A3B8] mb-1">
                    Event Title / Celebration Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={bdayTitle}
                    onChange={(e) => setBdayTitle(e.target.value)}
                    placeholder="e.g., Chaitanya Katare's Birthday"
                    className="w-full px-3 py-2 bg-[#F2F4F6] dark:bg-[#1E293B] border border-[#CBCBCB] dark:border-[#334155] rounded-lg text-xs text-[#191C1E] dark:text-[#EFF1F3]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#525854] dark:text-[#94A3B8] mb-1">
                    Celebration Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={bdayDate}
                    onChange={(e) => setBdayDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F2F4F6] dark:bg-[#1E293B] border border-[#CBCBCB] dark:border-[#334155] rounded-lg text-xs font-mono text-[#191C1E] dark:text-[#EFF1F3]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#525854] dark:text-[#94A3B8] mb-1">
                  Celebration Category
                </label>
                <select
                  value={bdayType}
                  onChange={(e) => setBdayType(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F2F4F6] dark:bg-[#1E293B] border border-[#CBCBCB] dark:border-[#334155] rounded-lg text-xs text-[#191C1E] dark:text-[#EFF1F3]"
                >
                  <option value="Birthday">Birthday</option>
                  <option value="Work Anniversary">Work Anniversary</option>
                  <option value="Milestone Celebration">Milestone Celebration</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#525854] dark:text-[#94A3B8] mb-1">
                  Description / Notes
                </label>
                <textarea
                  rows={3}
                  value={bdayNotes}
                  onChange={(e) => setBdayNotes(e.target.value)}
                  placeholder="Enter celebration notes or team greetings..."
                  className="w-full px-3 py-2 bg-[#F2F4F6] dark:bg-[#1E293B] border border-[#CBCBCB] dark:border-[#334155] rounded-lg text-xs text-[#191C1E] dark:text-[#EFF1F3]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#CBCBCB] dark:border-[#1E293B]">
                <button
                  type="button"
                  onClick={() => {
                    setShowBdayModal(false);
                    setEditingBday(null);
                  }}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-[#525854] dark:text-[#94A3B8] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#2D5A27] hover:bg-[#23461E] text-white cursor-pointer"
                >
                  {editingBday ? 'Save Changes' : 'Add Celebration'}
                </button>
              </div>
            </form>
          </ModalShell>

          {/* Delete Celebration Confirmation Dialog (Displays Event Name & Date, Preserves Employee Record & DOB) */}
          <ConfirmDialog
            isOpen={!!deletingBday && isHRAdmin}
            onClose={() => setDeletingBday(null)}
            onConfirm={() => {
              if (deletingBday) {
                deleteBirthdayCelebration(deletingBday.id);
                setDeletingBday(null);
              }
            }}
            title="Delete Celebration Entry"
            message={
              deletingBday
                ? `Are you sure you want to delete "${deletingBday.title}" scheduled on ${deletingBday.date} for ${deletingBday.employeeName}? This only removes the celebration calendar entry and will not delete the employee record or their date-of-birth information.`
                : ''
            }
            confirmLabel="Delete Celebration Entry"
          />
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION 14: POLICIES                                                  */}
      {/* ===================================================================== */}
      {currentSub === 'policies' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-[#CBCBCB]">
            <div>
              <h1 className="text-lg font-bold text-[#141A17]">
                Company Policies & Employee Acknowledgements
              </h1>
              <p className="text-xs text-[#525854]">
                Lifecycle: Draft → Published → Active → Updated → Archived
              </p>
            </div>
            {isHRAdmin && (
              <button
                onClick={() => {
                  setEditingPolicy(null);
                  setPolTitle('');
                  setPolSummary('');
                  setShowPolicyModal(true);
                }}
                className="px-3.5 py-2 bg-[#164C38] text-[#F2F2F2] text-xs font-semibold rounded-lg cursor-pointer"
              >
                + Publish Policy
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {policies.map((pol) => (
              <div
                key={pol.id}
                className="bg-white border border-[#CBCBCB] rounded-xl p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded bg-[#4E1617]/10 text-[#4E1617] text-[10px] font-bold uppercase">
                      {pol.category} • {pol.version}
                    </span>
                    <span className="text-[11px] font-mono text-[#525854]">
                      Updated {pol.lastUpdated}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-[#141A17]">{pol.title}</h3>
                  <p className="text-xs text-[#525854] mt-1.5 leading-relaxed">
                    {pol.summary}
                  </p>
                </div>
                <div className="pt-4 mt-4 border-t border-[#CBCBCB] flex items-center justify-between">
                  {pol.acknowledgedByMe ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#164C38]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Acknowledged
                    </span>
                  ) : (
                    <button
                      onClick={() => acknowledgePolicy(pol.id)}
                      className="px-3 py-1.5 bg-[#164C38] text-[#F2F2F2] text-xs font-semibold rounded-lg cursor-pointer"
                    >
                      Acknowledge Policy
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION 15: ANNOUNCEMENTS                                             */}
      {/* ===================================================================== */}
      {currentSub === 'announcements' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-[#CBCBCB]">
            <div>
              <h1 className="text-lg font-bold text-[#141A17]">
                Company Announcements & Circulars
              </h1>
              <p className="text-xs text-[#525854]">
                Official broadcasts targeted to Everyone or specific Departments
              </p>
            </div>
            {isHRAdmin && (
              <button
                onClick={() => {
                  setEditingAnn(null);
                  setAnnTitle('');
                  setAnnBody('');
                  setShowAnnModal(true);
                }}
                className="px-3.5 py-2 bg-[#164C38] text-[#F2F2F2] text-xs font-semibold rounded-lg cursor-pointer"
              >
                + Post Announcement
              </button>
            )}
          </div>

          <div className="space-y-3">
            {announcements.map((ann) => (
              <div
                key={ann.id}
                className="bg-white border border-[#CBCBCB] rounded-xl p-5"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="px-2 py-0.5 rounded bg-[#164C38]/10 text-[#164C38] text-[10px] font-bold uppercase">
                    {ann.category}
                  </span>
                  <span className="text-[11px] font-mono text-[#525854]">
                    {ann.publishedAt} • By {ann.author}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-[#141A17]">{ann.title}</h3>
                <p className="text-xs text-[#525854] mt-1">{ann.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* HOLIDAYS                                                              */}
      {/* ===================================================================== */}
      {currentSub === 'holidays' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-[#CBCBCB]">
            <div>
              <h1 className="text-lg font-bold text-[#141A17]">
                Official Holiday Calendar
              </h1>
              <p className="text-xs text-[#525854]">
                National, Festival & Company holidays
              </p>
            </div>
          </div>
          <div className="bg-white border border-[#CBCBCB] rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#CBCBCB] text-[10px] font-bold uppercase text-[#525854] bg-[#F2F2F2]">
                  <th className="py-3.5 px-5">Holiday Name</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Day</th>
                  <th className="py-3.5 px-4">Category</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#CBCBCB]/60 text-xs">
                {holidays.map((h) => (
                  <tr key={h.id} className="hover:bg-[#F2F2F2]">
                    <td className="py-3.5 px-5 font-bold text-[#141A17]">{h.name}</td>
                    <td className="py-3.5 px-4 font-mono text-[#164C38] font-semibold">
                      {h.date}
                    </td>
                    <td className="py-3.5 px-4 text-[#525854]">{h.day}</td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={h.type} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION 23: CENTRALIZED ACTIVITY LOG / AUDIT LOG                      */}
      {/* ===================================================================== */}
      {currentSub === 'activity-log' && <CentralizedActivityLogView />}

      {/* ===================================================================== */}
      {/* SECTION 27: CATEGORIZED SETTINGS                                      */}
      {/* ===================================================================== */}
      {currentSub === 'settings' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#CBCBCB]">
            <div>
              <h1 className="text-lg font-bold text-[#141A17]">
                {currentUser.role === 'EMPLOYEE' || currentUser.role === 'MANAGER'
                  ? 'Settings & Preferences'
                  : 'Enterprise System Settings'}
              </h1>
              <p className="text-xs text-[#525854]">
                {currentUser.role === 'EMPLOYEE' || currentUser.role === 'MANAGER'
                  ? 'Personal account details, shift timing rules, leave quotas, and notification preferences'
                  : 'Organized into Company, Attendance, Leave, Payroll, Users & Roles, Notifications, and Letter Templates'}
              </p>
            </div>
            <button
              onClick={() => setActiveModule('company-info')}
              className="w-full sm:w-auto px-3.5 py-2.5 sm:py-2 rounded-lg bg-[#4E1617] text-[#F2F2F2] text-xs font-semibold cursor-pointer text-center"
            >
              {currentUser.role === 'EMPLOYEE' || currentUser.role === 'MANAGER'
                ? 'View Company Rules & Policies →'
                : 'Open Full Company Policy & Timing Control Center →'}
            </button>
          </div>

          {currentUser.role === 'EMPLOYEE' || currentUser.role === 'MANAGER' ? (
            /* Vertically Stacked Mobile-First Employee Settings Sections */
            <div className="space-y-4">
              {/* Section 1: Account & Work Profile */}
              <div className="bg-white border border-[#CBCBCB] rounded-2xl p-4 sm:p-5 space-y-3">
                <h2 className="text-sm font-bold text-[#164C38] border-b border-[#CBCBCB] pb-2">
                  1. My Account & Work Assignment
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB] flex items-center justify-between">
                    <span className="text-[#525854]">Employee Name</span>
                    <span className="font-bold text-[#141A17]">{currentUser.fullName}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB] flex items-center justify-between">
                    <span className="text-[#525854]">Department</span>
                    <span className="font-bold text-[#164C38]">{currentUser.department}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB] flex items-center justify-between">
                    <span className="text-[#525854]">Designation</span>
                    <span className="font-bold text-[#141A17]">{currentUser.designation}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB] flex items-center justify-between">
                    <span className="text-[#525854]">Official Email</span>
                    <span className="font-mono font-semibold text-[#141A17]">{currentUser.email}</span>
                  </div>
                </div>
              </div>

              {/* Section 2: Shift & Attendance Rules */}
              <div className="bg-white border border-[#CBCBCB] rounded-2xl p-4 sm:p-5 space-y-3">
                <h2 className="text-sm font-bold text-[#164C38] border-b border-[#CBCBCB] pb-2">
                  2. Shift Timings & Attendance Rules
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB] flex items-center justify-between">
                    <span className="text-[#525854]">Standard Shift Hours</span>
                    <span className="font-mono font-bold text-[#141A17]">
                      {settings.workStartTime} – {settings.workEndTime}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB] flex items-center justify-between">
                    <span className="text-[#525854]">Grace Window</span>
                    <span className="font-mono font-bold text-[#4E1617]">
                      {settings.gracePeriodMinutes} mins ({settings.lateArrivalThresholdCount} lates/mo max)
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB] flex items-center justify-between">
                    <span className="text-[#525854]">First Half Slot</span>
                    <span className="font-mono font-semibold text-[#164C38]">
                      {settings.firstHalfTiming}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB] flex items-center justify-between">
                    <span className="text-[#525854]">Second Half Slot</span>
                    <span className="font-mono font-semibold text-[#164C38]">
                      {settings.secondHalfTiming}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 3: Annual Leave Quotas */}
              <div className="bg-white border border-[#CBCBCB] rounded-2xl p-4 sm:p-5 space-y-3">
                <h2 className="text-sm font-bold text-[#164C38] border-b border-[#CBCBCB] pb-2">
                  3. Annual Leave Entitlements
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB] flex items-center justify-between sm:block">
                    <span className="text-[#525854] block">Casual Leave Quota</span>
                    <span className="text-base font-mono font-bold text-[#164C38] sm:mt-1 block">
                      {settings.casualLeaveQuota} Days / Year
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB] flex items-center justify-between sm:block">
                    <span className="text-[#525854] block">Sick Leave Quota</span>
                    <span className="text-base font-mono font-bold text-[#164C38] sm:mt-1 block">
                      {settings.sickLeaveQuota} Days / Year
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB] flex items-center justify-between sm:block">
                    <span className="text-[#525854] block">Earned Leave Quota</span>
                    <span className="text-base font-mono font-bold text-[#4E1617] sm:mt-1 block">
                      {settings.earnedLeaveQuota} Days / Year
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 4: App Notification Preferences */}
              <div className="bg-white border border-[#CBCBCB] rounded-2xl p-4 sm:p-5 space-y-3">
                <h2 className="text-sm font-bold text-[#164C38] border-b border-[#CBCBCB] pb-2">
                  4. Notification Preferences
                </h2>
                <div className="space-y-2.5 text-xs">
                  <div className="p-3.5 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB] flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[#141A17] block">Leave & Consideration Updates</span>
                      <span className="text-[11px] text-[#525854]">Instant alerts when requests are approved or reviewed</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-[#164C38] text-[#F2F2F2] text-[10px] font-bold uppercase">
                      Active
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB] flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[#141A17] block">Payslip & Salary Disbursement Alerts</span>
                      <span className="text-[11px] text-[#525854]">Monthly notification when salary payslip is ready</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-[#164C38] text-[#F2F2F2] text-[10px] font-bold uppercase">
                      Active
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB] flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[#141A17] block">Company Announcements & Holiday Reminders</span>
                      <span className="text-[11px] text-[#525854]">Official broadcasts from Argos Watch HR</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-[#164C38] text-[#F2F2F2] text-[10px] font-bold uppercase">
                      Active
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-1.5 bg-white border border-[#CBCBCB] p-2 rounded-xl">
                {[
                  { id: 'company', label: '1. Company' },
                  { id: 'attendance', label: '2. Attendance' },
                  { id: 'leave', label: '3. Leave' },
                  { id: 'payroll', label: '4. Payroll' },
                  { id: 'roles', label: '5. Users & Roles' },
                  { id: 'notifications', label: '6. Notifications' },
                  { id: 'templates', label: '7. Letter Templates' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSettingsCategory(cat.id as any)}
                    className={`w-full sm:w-auto px-3.5 py-2.5 sm:py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer text-left sm:text-center ${
                      settingsCategory === cat.id
                        ? 'bg-[#164C38] text-[#F2F2F2]'
                        : 'text-[#525854] hover:text-[#141A17]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="bg-white border border-[#CBCBCB] rounded-xl p-6 space-y-4">
                {settingsCategory === 'company' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-3.5 rounded-lg bg-[#F2F2F2] border border-[#CBCBCB]">
                      <span className="text-[#525854] block">Company Name & Entity</span>
                      <span className="font-bold text-[#141A17] mt-1 block">
                        {settings.companyName} ({settings.legalEntityName})
                      </span>
                    </div>
                    <div className="p-3.5 rounded-lg bg-[#F2F2F2] border border-[#CBCBCB]">
                      <span className="text-[#525854] block">Headquarters Address</span>
                      <span className="font-bold text-[#141A17] mt-1 block">
                        {settings.headquartersAddress}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-lg bg-[#F2F2F2] border border-[#CBCBCB]">
                      <span className="text-[#525854] block">Working Days</span>
                      <span className="font-bold text-[#164C38] mt-1 block">
                        {settings.workingDays.join(', ')}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-lg bg-[#F2F2F2] border border-[#CBCBCB]">
                      <span className="text-[#525854] block">Standard Shift Hours</span>
                      <span className="font-mono font-bold text-[#141A17] mt-1 block">
                        {settings.workStartTime} – {settings.workEndTime}
                      </span>
                    </div>
                  </div>
                )}

                {settingsCategory === 'attendance' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-3.5 rounded-lg bg-[#F2F2F2] border border-[#CBCBCB]">
                      <span className="text-[#525854] block">Grace Window & Late Rule</span>
                      <span className="font-bold text-[#4E1617] mt-1 block">
                        {settings.gracePeriodMinutes} mins grace · Max {settings.lateArrivalThresholdCount} lates/month
                      </span>
                    </div>
                    <div className="p-3.5 rounded-lg bg-[#F2F2F2] border border-[#CBCBCB]">
                      <span className="text-[#525854] block">Half-Day Session Windows</span>
                      <span className="font-mono font-bold text-[#164C38] mt-1 block">
                        1st: {settings.firstHalfTiming} | 2nd: {settings.secondHalfTiming}
                      </span>
                    </div>
                  </div>
                )}

                {settingsCategory === 'leave' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="p-3.5 rounded-lg bg-[#F2F2F2] border border-[#CBCBCB]">
                      <span className="text-[#525854] block">Casual Leave Quota</span>
                      <span className="text-lg font-mono font-bold text-[#164C38]">
                        {settings.casualLeaveQuota} Days/Yr
                      </span>
                    </div>
                    <div className="p-3.5 rounded-lg bg-[#F2F2F2] border border-[#CBCBCB]">
                      <span className="text-[#525854] block">Sick Leave Quota</span>
                      <span className="text-lg font-mono font-bold text-[#164C38]">
                        {settings.sickLeaveQuota} Days/Yr
                      </span>
                    </div>
                    <div className="p-3.5 rounded-lg bg-[#F2F2F2] border border-[#CBCBCB]">
                      <span className="text-[#525854] block">Earned Leave Quota</span>
                      <span className="text-lg font-mono font-bold text-[#4E1617]">
                        {settings.earnedLeaveQuota} Days/Yr
                      </span>
                    </div>
                  </div>
                )}

                {settingsCategory === 'payroll' && (
                  <div className="space-y-3 text-xs">
                    <label className="flex items-center justify-between p-3.5 rounded-lg bg-[#F2F2F2] border border-[#CBCBCB]">
                      <span className="font-semibold text-[#141A17]">
                        Allow Managers to View Team Salary Structure
                      </span>
                      <input
                        type="checkbox"
                        checked={settings.managerCanViewTeamSalary}
                        onChange={(e) =>
                          updateCompanySettings({ managerCanViewTeamSalary: e.target.checked })
                        }
                      />
                    </label>
                    <label className="flex items-center justify-between p-3.5 rounded-lg bg-[#F2F2F2] border border-[#CBCBCB]">
                      <span className="font-semibold text-[#141A17]">
                        Auto-Deduct Unapproved Late Arrivals in Payroll Run
                      </span>
                      <input
                        type="checkbox"
                        checked={settings.autoDeductUnapprovedLate}
                        onChange={(e) =>
                          updateCompanySettings({ autoDeductUnapprovedLate: e.target.checked })
                        }
                      />
                    </label>
                  </div>
                )}

                {settingsCategory === 'roles' && (
                  <div className="text-xs space-y-2">
                    <p className="font-bold text-[#164C38]">
                      Strict 4-Tier RBAC Matrix Enforced:
                    </p>
                    <p className="text-[#525854]">
                      • <strong>ADMIN / HR:</strong> Full organization-wide visibility, policy & timing configuration, and on-behalf workflows.
                    </p>
                    <p className="text-[#525854]">
                      • <strong>MANAGER:</strong> Scoped strictly to assigned department/team members + own records.
                    </p>
                    <p className="text-[#525854]">
                      • <strong>EMPLOYEE:</strong> Scoped strictly to self-service records + company policies & holidays.
                    </p>
                  </div>
                )}

                {settingsCategory === 'notifications' && (
                  <div className="text-xs text-[#525854]">
                    Real-time header notification bell enabled for Leave Approvals, Announcements, Policy Updates, Document Expiries, Birthdays, and Considerations.
                  </div>
                )}

                {settingsCategory === 'templates' && (
                  <div className="text-xs text-[#525854]">
                    8 Official Argos Watch letterhead templates active: Offer Letter, Internship Letter, Experience Letter, Employment Letter, Promotion Letter, Salary Revision Letter, Warning Letter, and Termination Letter.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Policy Modal */}
      <ModalShell
        isOpen={showPolicyModal}
        onClose={() => setShowPolicyModal(false)}
        title="Publish Company Policy"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!polTitle.trim()) return;
            createPolicy({
              title: polTitle,
              category: polCategory,
              version: polVersion,
              lastUpdated: new Date().toISOString().slice(0, 10),
              summary: polSummary,
              acknowledgedByMe: true,
            });
            setShowPolicyModal(false);
          }}
          className="space-y-3.5"
        >
          <div>
            <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
              Policy Title
            </label>
            <input
              type="text"
              required
              value={polTitle}
              onChange={(e) => setPolTitle(e.target.value)}
              className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
              Policy Summary & Rules
            </label>
            <textarea
              rows={3}
              required
              value={polSummary}
              onChange={(e) => setPolSummary(e.target.value)}
              className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#164C38] text-[#F2F2F2]"
            >
              Publish Policy
            </button>
          </div>
        </form>
      </ModalShell>

      {/* Announcement Modal */}
      <ModalShell
        isOpen={showAnnModal}
        onClose={() => setShowAnnModal(false)}
        title="Post Company Announcement"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!annTitle.trim()) return;
            createAnnouncement({
              title: annTitle,
              category: annCategory,
              publishedAt: new Date().toISOString().slice(0, 10),
              author: `${currentUser.fullName} (${currentUser.role})`,
              body: annBody,
            });
            setShowAnnModal(false);
          }}
          className="space-y-3.5"
        >
          <div>
            <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
              Headline
            </label>
            <input
              type="text"
              required
              value={annTitle}
              onChange={(e) => setAnnTitle(e.target.value)}
              className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
              Message Body
            </label>
            <textarea
              rows={3}
              required
              value={annBody}
              onChange={(e) => setAnnBody(e.target.value)}
              className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#164C38] text-[#F2F2F2]"
            >
              Publish Broadcast
            </button>
          </div>
        </form>
      </ModalShell>
    </div>
  );
}
