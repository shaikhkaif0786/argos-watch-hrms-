import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  CheckCircle2,
  XCircle,
  History,
  Sliders,
  Edit3,
  Trash2,
  Plus,
  ChevronDown,
  ChevronRight,
  X,
  Layers,
  UserCheck,
  Check,
  RotateCcw,
  Filter,
} from 'lucide-react';
import { useHRMS } from '../../context/HRMSContext';
import {
  UserRole,
  UserAccessRecord,
  AccessLevel,
  CustomRoleDefinition,
  GranularPermissionItem,
  PermissionState,
  ActivityLogEntry,
} from '../../types/hrms';
import {
  AvatarInitials,
  StatusBadge,
  ModalShell,
  ExportDropdown,
} from '../ui/EnterpriseComponents';
import {
  PERMISSION_CATEGORIES,
  resolveEffectivePermission,
} from '../../data/accessAndOrgData';

const SUPER_ADMIN_ID = 'EMP-1000';

/**
 * Action Badge helper for View, Add, Edit, Delete, Approve, Export, Manage
 */
const ActionTypeBadge: React.FC<{ actionType?: GranularPermissionItem['actionType'] }> = ({
  actionType = 'Manage',
}) => {
  const styles: Record<string, string> = {
    View: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    Add: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    Edit: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    Delete: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    Approve: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    Export: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    Manage: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
        styles[actionType] || styles.Manage
      }`}
    >
      {actionType}
    </span>
  );
};

/**
 * Simplified, Intuitive Individual Permission Control Component (Requirements 1, 1.1 & 2)
 * Embedded directly inside Activity Logs (and accessible from Role & Access Management)
 */
export const IndividualPermissionControlPanel: React.FC<{
  initialEmployeeId?: string;
}> = ({ initialEmployeeId }) => {
  const {
    underlyingRole,
    currentRole,
    userAccessList,
    rolesList,
    permissionCatalog,
    assignRoleToUser,
    setUserPermissionOverride,
    setBatchUserPermissionOverrides,
    allActivityLogs,
  } = useHRMS();

  const isAdmin = underlyingRole === UserRole.ADMIN || currentRole === UserRole.ADMIN;

  const [selectedEmpId, setSelectedEmpId] = useState<string>(
    initialEmployeeId || userAccessList.find((u) => u.employeeId === 'EMP-1001')?.employeeId || userAccessList[0]?.employeeId || 'EMP-1001'
  );
  const [searchPerm, setSearchPerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [reasonNote, setReasonNote] = useState('');

  // Expand first 3 categories by default so the interface is clean and minimal instead of showing everything at once
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    PERMISSION_CATEGORIES.forEach((cat, idx) => {
      initial[cat] = idx < 3;
    });
    return initial;
  });

  const selectedUser = useMemo(
    () => userAccessList.find((u) => u.employeeId === selectedEmpId) || userAccessList[0],
    [userAccessList, selectedEmpId]
  );

  const assignedRoleDef = useMemo(() => {
    if (!selectedUser) return undefined;
    return (
      rolesList.find((r) => r.id === selectedUser.roleId) ||
      rolesList.find((r) => r.baseRoleType === selectedUser.role)
    );
  }, [selectedUser, rolesList]);

  const categories = useMemo(() => {
    const set = new Set<string>(PERMISSION_CATEGORIES);
    permissionCatalog.forEach((p) => set.add(p.category));
    return Array.from(set);
  }, [permissionCatalog]);

  // Summary counts for the selected employee
  const summaryStats = useMemo(() => {
    if (!selectedUser) {
      return { totalEnabled: 0, inheritedEnabled: 0, customAllowed: 0, customRestricted: 0 };
    }
    let totalEnabled = 0;
    let inheritedEnabled = 0;
    let customAllowed = 0;
    let customRestricted = 0;

    permissionCatalog.forEach((perm) => {
      const overrideState: PermissionState =
        selectedUser.permissionOverrides?.[perm.id] || 'INHERITED';
      const resolved = resolveEffectivePermission(
        assignedRoleDef,
        selectedUser.permissionOverrides,
        perm.id,
        selectedUser.employeeId === SUPER_ADMIN_ID
      );
      if (resolved.allowed) totalEnabled++;
      if (overrideState === 'INHERITED' && resolved.allowed) inheritedEnabled++;
      if (overrideState === 'ALLOWED') customAllowed++;
      if (overrideState === 'DENIED') customRestricted++;
    });

    return { totalEnabled, inheritedEnabled, customAllowed, customRestricted };
  }, [selectedUser, assignedRoleDef, permissionCatalog]);

  // Recent permission audit history for this specific employee
  const userPermissionHistory = useMemo(() => {
    if (!selectedUser) return [];
    return (allActivityLogs || [])
      .filter(
        (l) =>
          (l.module === 'Role & Access' || l.module === 'Manage Access') &&
          (l.targetEmployeeId === selectedUser.employeeId ||
            l.targetRecord.includes(selectedUser.employeeId))
      )
      .slice(0, 6);
  }, [allActivityLogs, selectedUser]);

  if (!selectedUser) return null;

  const isSuperAdminUser = selectedUser.employeeId === SUPER_ADMIN_ID;

  return (
    <div className="space-y-5">
      {/* Top Employee Selector & Role Summary Card */}
      <div className="bg-white dark:bg-[#18181B] border border-[#E2E8F0] dark:border-[#27272A] rounded-2xl p-5 space-y-4 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E2E8F0] dark:border-[#27272A] pb-4">
          <div>
            <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
              Simplified Access Control
            </span>
            <h3 className="text-base font-bold text-[#0F172A] dark:text-white mt-1">
              Individual Permission Control & Role Inheritance
            </h3>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              All permissions included in the employee’s assigned role appear automatically enabled below. You can grant extra permissions or restrict specific actions for this individual.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const allOpen: Record<string, boolean> = {};
                categories.forEach((c) => (allOpen[c] = true));
                setExpandedCategories(allOpen);
              }}
              className="px-3 py-1.5 rounded-lg border border-[#CBD5E1] dark:border-[#3F3F46] text-xs font-semibold text-[#0F172A] dark:text-white hover:bg-[#F8FAFC] dark:hover:bg-[#27272A] cursor-pointer"
            >
              Expand All Categories
            </button>
            <button
              type="button"
              onClick={() => {
                const allClosed: Record<string, boolean> = {};
                categories.forEach((c) => (allClosed[c] = false));
                setExpandedCategories(allClosed);
              }}
              className="px-3 py-1.5 rounded-lg border border-[#CBD5E1] dark:border-[#3F3F46] text-xs font-semibold text-[#0F172A] dark:text-white hover:bg-[#F8FAFC] dark:hover:bg-[#27272A] cursor-pointer"
            >
              Collapse All
            </button>
            {isAdmin &&
              !isSuperAdminUser &&
              (summaryStats.customAllowed > 0 || summaryStats.customRestricted > 0) && (
                <button
                  type="button"
                  onClick={() =>
                    setBatchUserPermissionOverrides(
                      selectedUser.employeeId,
                      {},
                      'Reset all individual overrides to Inherited from Role'
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 hover:bg-amber-500/25 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset to Role Defaults
                </button>
              )}
          </div>
        </div>

        {/* Employee Picker + Assigned Role Selector + Audit Reason */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] block mb-1.5">
              1. Select Employee
            </label>
            <select
              value={selectedUser.employeeId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] dark:border-[#3F3F46] bg-[#F8FAFC] dark:bg-[#202024] text-xs font-bold text-[#0F172A] dark:text-white"
            >
              {userAccessList.map((u) => (
                <option key={u.employeeId} value={u.employeeId}>
                  {u.fullName} ({u.employeeId}) — {u.roleName || u.role}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] block mb-1.5">
              2. Assigned Role (Updates Inherited Permissions Automatically)
            </label>
            <select
              value={
                selectedUser.roleId ||
                (selectedUser.role === UserRole.ADMIN
                  ? 'ROLE-ADMIN'
                  : selectedUser.role === UserRole.HR
                  ? 'ROLE-HR'
                  : selectedUser.role === UserRole.MANAGER
                  ? 'ROLE-MANAGER'
                  : 'ROLE-EMPLOYEE')
              }
              disabled={!isAdmin || isSuperAdminUser}
              onChange={(e) =>
                assignRoleToUser(
                  selectedUser.employeeId,
                  e.target.value,
                  reasonNote || 'Role updated in Individual Permission Control'
                )
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] dark:border-[#3F3F46] bg-[#F8FAFC] dark:bg-[#202024] text-xs font-bold text-[#0F172A] dark:text-white disabled:opacity-60"
            >
              {rolesList.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.isSystemRole ? '(System Role)' : '(Custom Role)'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] block mb-1.5">
              3. Audit Note (Optional Reason for Change)
            </label>
            <input
              type="text"
              value={reasonNote}
              onChange={(e) => setReasonNote(e.target.value)}
              placeholder="e.g., Delegated leave approval authority..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] dark:border-[#3F3F46] bg-[#F8FAFC] dark:bg-[#202024] text-xs text-[#0F172A] dark:text-white"
            />
          </div>
        </div>

        {/* Visual Summary Pills for Selected Employee */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#202024] border border-[#E2E8F0] dark:border-[#27272A]">
            <span className="text-[10px] font-bold uppercase text-[#64748B] dark:text-[#94A3B8] block">
              Total Active Permissions
            </span>
            <span className="text-lg font-bold text-emerald-500 mt-0.5 block">
              {summaryStats.totalEnabled} / {permissionCatalog.length} Enabled
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#202024] border border-[#E2E8F0] dark:border-[#27272A]">
            <span className="text-[10px] font-bold uppercase text-[#64748B] dark:text-[#94A3B8] block">
              Inherited from Role ({assignedRoleDef?.name || selectedUser.role})
            </span>
            <span className="text-lg font-bold text-sky-400 mt-0.5 block">
              {summaryStats.inheritedEnabled} Enabled by Role
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#202024] border border-[#E2E8F0] dark:border-[#27272A]">
            <span className="text-[10px] font-bold uppercase text-[#64748B] dark:text-[#94A3B8] block">
              Individually Allowed
            </span>
            <span className="text-lg font-bold text-emerald-400 mt-0.5 block">
              +{summaryStats.customAllowed} Custom Allowed
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#202024] border border-[#E2E8F0] dark:border-[#27272A]">
            <span className="text-[10px] font-bold uppercase text-[#64748B] dark:text-[#94A3B8] block">
              Individually Restricted
            </span>
            <span className="text-lg font-bold text-rose-400 mt-0.5 block">
              -{summaryStats.customRestricted} Custom Restricted
            </span>
          </div>
        </div>

        {/* Search & Quick Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchPerm}
              onChange={(e) => setSearchPerm(e.target.value)}
              placeholder="Search permissions by name or description..."
              className="w-full pl-8 pr-3 py-2 rounded-xl border border-[#CBD5E1] dark:border-[#3F3F46] bg-[#F8FAFC] dark:bg-[#202024] text-xs text-[#0F172A] dark:text-white"
            />
          </div>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[#CBD5E1] dark:border-[#3F3F46] bg-[#F8FAFC] dark:bg-[#202024] text-xs text-[#0F172A] dark:text-white"
          >
            <option value="ALL">All Controls (View, Add, Edit, Delete, Approve, Export, Manage)</option>
            <option value="View">View Controls Only</option>
            <option value="Add">Add Controls Only</option>
            <option value="Edit">Edit Controls Only</option>
            <option value="Delete">Delete Controls Only</option>
            <option value="Approve">Approve Controls Only</option>
            <option value="Export">Export Controls Only</option>
            <option value="Manage">Manage Controls Only</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[#CBD5E1] dark:border-[#3F3F46] bg-[#F8FAFC] dark:bg-[#202024] text-xs text-[#0F172A] dark:text-white"
          >
            <option value="ALL">All Permission States</option>
            <option value="ENABLED">Currently Enabled (Inherited + Individually Allowed)</option>
            <option value="INHERITED_ENABLED">Inherited from Role (Enabled)</option>
            <option value="CUSTOM_ALLOWED">Individually Allowed Only</option>
            <option value="CUSTOM_RESTRICTED">Individually Restricted Only</option>
          </select>
        </div>
      </div>

      {/* Expandable 12 Permission Categories */}
      <div className="space-y-3">
        {categories.map((category) => {
          const categoryPerms = permissionCatalog.filter((perm) => {
            if (perm.category !== category) return false;
            if (actionFilter !== 'ALL' && perm.actionType !== actionFilter) return false;

            const overrideState: PermissionState =
              selectedUser.permissionOverrides?.[perm.id] || 'INHERITED';
            const resolved = resolveEffectivePermission(
              assignedRoleDef,
              selectedUser.permissionOverrides,
              perm.id,
              isSuperAdminUser
            );

            if (statusFilter === 'ENABLED' && !resolved.allowed) return false;
            if (statusFilter === 'INHERITED_ENABLED' && !(overrideState === 'INHERITED' && resolved.allowed))
              return false;
            if (statusFilter === 'CUSTOM_ALLOWED' && overrideState !== 'ALLOWED') return false;
            if (statusFilter === 'CUSTOM_RESTRICTED' && overrideState !== 'DENIED') return false;

            if (searchPerm.trim()) {
              const q = searchPerm.toLowerCase();
              return (
                perm.name.toLowerCase().includes(q) ||
                perm.whatItDoes.toLowerCase().includes(q) ||
                (perm.actionType || '').toLowerCase().includes(q)
              );
            }
            return true;
          });

          if (categoryPerms.length === 0) return null;

          const enabledInCat = categoryPerms.filter(
            (perm) =>
              resolveEffectivePermission(
                assignedRoleDef,
                selectedUser.permissionOverrides,
                perm.id,
                isSuperAdminUser
              ).allowed
          ).length;

          const isExpanded = Boolean(expandedCategories[category] || searchPerm.trim() || statusFilter !== 'ALL');

          return (
            <div
              key={category}
              className="bg-white dark:bg-[#18181B] border border-[#E2E8F0] dark:border-[#27272A] rounded-2xl overflow-hidden shadow-xs"
            >
              <button
                type="button"
                onClick={() =>
                  setExpandedCategories((prev) => ({
                    ...prev,
                    [category]: !isExpanded,
                  }))
                }
                className="w-full px-5 py-3.5 bg-[#F8FAFC] dark:bg-[#202024] flex items-center justify-between text-left cursor-pointer hover:bg-[#F1F5F9] dark:hover:bg-[#27272A] transition"
              >
                <div className="flex items-center gap-2.5">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-[#0F172A] dark:text-white" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-[#0F172A] dark:text-white" />
                  )}
                  <span className="text-sm font-bold text-[#0F172A] dark:text-white">{category}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    {enabledInCat} of {categoryPerms.length} Enabled
                  </span>
                </div>
              </button>

              {isExpanded && (
                <div className="divide-y divide-[#E2E8F0] dark:divide-[#27272A]">
                  {categoryPerms.map((perm) => {
                    const currentState: PermissionState =
                      selectedUser.permissionOverrides?.[perm.id] || 'INHERITED';
                    const roleGrantsIt =
                      isSuperAdminUser || Boolean(assignedRoleDef?.permissions?.[perm.id]);
                    const resolved = resolveEffectivePermission(
                      assignedRoleDef,
                      selectedUser.permissionOverrides,
                      perm.id,
                      isSuperAdminUser
                    );

                    // Requirement 1.1: Clearly label every permission as one of:
                    // - Inherited from Role
                    // - Individually Allowed
                    // - Individually Restricted
                    const sourceBadgeLabel =
                      currentState === 'ALLOWED'
                        ? 'Individually Allowed'
                        : currentState === 'DENIED'
                        ? 'Individually Restricted'
                        : 'Inherited from Role';

                    const sourceBadgeStyle =
                      currentState === 'ALLOWED'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : currentState === 'DENIED'
                        ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        : roleGrantsIt
                        ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                        : 'bg-slate-500/15 text-slate-400 border-slate-500/30';

                    return (
                      <div
                        key={perm.id}
                        className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 hover:bg-[#F8FAFC]/50 dark:hover:bg-[#202024]/40 transition"
                      >
                        {/* Left: Action Pill + Clear Permission Name + Short Explanation */}
                        <div className="space-y-1 max-w-2xl">
                          <div className="flex flex-wrap items-center gap-2">
                            <ActionTypeBadge actionType={perm.actionType} />
                            <span className="text-xs font-bold text-[#0F172A] dark:text-white">
                              {perm.name}
                            </span>

                            {/* Enabled / Restricted state indicator */}
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                resolved.allowed
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-slate-800 text-slate-400 border border-slate-700'
                              }`}
                            >
                              {resolved.allowed ? (
                                <>
                                  <Check className="w-3 h-3" /> Enabled
                                </>
                              ) : (
                                'Not Enabled'
                              )}
                            </span>

                            {/* Requirement 1.1 Source Badge */}
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${sourceBadgeStyle}`}
                            >
                              {sourceBadgeLabel}
                              {currentState === 'INHERITED'
                                ? roleGrantsIt
                                  ? ` (${assignedRoleDef?.name || selectedUser.role} Grants Access)`
                                  : ` (Not in ${assignedRoleDef?.name || selectedUser.role} Role)`
                                : ''}
                            </span>
                          </div>

                          {/* Short plain-English explanation beside every permission */}
                          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                            {perm.whatItDoes}
                          </p>
                        </div>

                        {/* Right: Simple 3-Option Selector */}
                        <div className="inline-flex flex-wrap items-center gap-1.5 bg-[#F1F5F9] dark:bg-[#202024] p-1 rounded-xl border border-[#E2E8F0] dark:border-[#27272A] shrink-0 self-start lg:self-center">
                          <button
                            type="button"
                            disabled={!isAdmin}
                            onClick={() =>
                              setUserPermissionOverride(
                                selectedUser.employeeId,
                                perm.id,
                                'INHERITED',
                                reasonNote
                              )
                            }
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                              currentState === 'INHERITED'
                                ? roleGrantsIt
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-slate-700 text-white shadow-xs'
                                : 'text-[#64748B] dark:text-[#A1A1AA] hover:text-[#0F172A] dark:hover:text-white'
                            }`}
                          >
                            Inherited from Role ({roleGrantsIt ? 'Enabled' : 'Off'})
                          </button>

                          <button
                            type="button"
                            disabled={!isAdmin}
                            onClick={() =>
                              setUserPermissionOverride(
                                selectedUser.employeeId,
                                perm.id,
                                'ALLOWED',
                                reasonNote
                              )
                            }
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                              currentState === 'ALLOWED'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-[#64748B] dark:text-[#A1A1AA] hover:text-[#0F172A] dark:hover:text-white'
                            }`}
                          >
                            Individually Allowed
                          </button>

                          <button
                            type="button"
                            disabled={!isAdmin || isSuperAdminUser}
                            onClick={() =>
                              setUserPermissionOverride(
                                selectedUser.employeeId,
                                perm.id,
                                'DENIED',
                                reasonNote
                              )
                            }
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition cursor-pointer disabled:opacity-40 ${
                              currentState === 'DENIED'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'text-[#64748B] dark:text-[#A1A1AA] hover:text-[#0F172A] dark:hover:text-white'
                            }`}
                          >
                            Individually Restricted
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Recent Permission Changes for Selected Employee */}
      {userPermissionHistory.length > 0 && (
        <div className="bg-white dark:bg-[#18181B] border border-[#E2E8F0] dark:border-[#27272A] rounded-2xl p-4 space-y-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
            Recent Role & Permission Changes for {selectedUser.fullName}
          </h4>
          <div className="divide-y divide-[#E2E8F0] dark:divide-[#27272A] text-xs">
            {userPermissionHistory.map((log) => (
              <div key={log.id} className="py-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-semibold text-[#0F172A] dark:text-white">{log.action}</span>
                  <span className="text-[#64748B] dark:text-[#94A3B8] ml-2">
                    by {log.actorName} ({log.timestamp})
                  </span>
                </div>
                <div className="font-mono text-[11px]">
                  <span className="text-rose-400">{log.previousValue || '—'}</span>
                  <span className="mx-1.5 text-slate-500">→</span>
                  <span className="text-emerald-400">{log.newValue || '—'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Reusable Centralized Activity Log & Individual Permission Control Component (Requirement 2)
 * Used in both Role & Access Management and More Hub -> Activity Log
 */
export const CentralizedActivityLogView: React.FC<{
  initialSubView?: 'LOGS' | 'INDIVIDUAL_PERMISSIONS' | 'PERMISSION_HISTORY';
  initialEmployeeId?: string;
}> = ({ initialSubView = 'LOGS', initialEmployeeId }) => {
  const {
    allActivityLogs,
    scopedActivityLogs,
    underlyingRole,
    currentRole,
    hasPermission,
    allEmployees,
    t,
  } = useHRMS();

  const isAdmin = underlyingRole === UserRole.ADMIN || currentRole === UserRole.ADMIN;
  const canViewLogs = isAdmin || hasPermission('admin.view_activity_log');

  const [subView, setSubView] = useState<'LOGS' | 'INDIVIDUAL_PERMISSIONS' | 'PERMISSION_HISTORY'>(
    initialSubView
  );

  const logsSource = useMemo(() => {
    const raw = allActivityLogs && allActivityLogs.length > 0 ? allActivityLogs : scopedActivityLogs;
    return raw;
  }, [allActivityLogs, scopedActivityLogs]);

  // General Activity Log filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [workspaceFilter, setWorkspaceFilter] = useState('ALL');
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [employeeFilter, setEmployeeFilter] = useState('ALL');
  const [resultFilter, setResultFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'OLDEST' | 'USER' | 'MODULE' | 'ACTION'>('NEWEST');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Permission History specific filters (Requirement 2: filter by employee, administrator, role, date, and permission category)
  const [permEmpFilter, setPermEmpFilter] = useState('ALL');
  const [permAdminFilter, setPermAdminFilter] = useState('ALL');
  const [permRoleFilter, setPermRoleFilter] = useState('ALL');
  const [permCategoryFilter, setPermCategoryFilter] = useState('ALL');
  const [permDateFilter, setPermDateFilter] = useState('');

  const [selectedLog, setSelectedLog] = useState<ActivityLogEntry | null>(null);

  const uniqueModules = useMemo(() => {
    const set = new Set<string>();
    logsSource.forEach((l) => {
      if (l.module) set.add(l.module);
    });
    return Array.from(set);
  }, [logsSource]);

  const filteredAndSortedLogs = useMemo(() => {
    const filtered = logsSource.filter((log) => {
      if (roleFilter !== 'ALL' && String(log.actorRole).toUpperCase() !== roleFilter) {
        return false;
      }
      const ws =
        log.workspace ||
        (log.actorRole === 'ADMIN' ? 'Admin' : log.actorRole === 'HR' ? 'HR' : 'Own');
      if (workspaceFilter !== 'ALL' && ws.toUpperCase() !== workspaceFilter) {
        return false;
      }
      if (moduleFilter !== 'ALL' && log.module !== moduleFilter) {
        return false;
      }
      if (actionFilter !== 'ALL') {
        const actUpper = log.action.toUpperCase();
        if (!actUpper.includes(actionFilter)) return false;
      }
      if (employeeFilter !== 'ALL') {
        const matchesActor = log.actorName.toLowerCase().includes(employeeFilter.toLowerCase());
        const matchesTarget =
          log.targetEmployeeId === employeeFilter ||
          log.targetRecord.toLowerCase().includes(employeeFilter.toLowerCase());
        if (!matchesActor && !matchesTarget) return false;
      }
      const res = log.result || 'SUCCESS';
      if (resultFilter !== 'ALL' && res !== resultFilter) {
        return false;
      }
      const logDate = (log.timestamp || '').slice(0, 10);
      if (dateFrom && logDate && logDate < dateFrom) return false;
      if (dateTo && logDate && logDate > dateTo) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = [
          log.id,
          log.actorName,
          log.actorRole,
          log.workspace,
          log.module,
          log.action,
          log.targetRecord,
          log.fieldChanged,
          log.previousValue,
          log.newValue,
          log.reason,
          log.source,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'OLDEST') return (a.timestamp || '').localeCompare(b.timestamp || '');
      if (sortBy === 'USER') return (a.actorName || '').localeCompare(b.actorName || '');
      if (sortBy === 'MODULE') return (a.module || '').localeCompare(b.module || '');
      if (sortBy === 'ACTION') return (a.action || '').localeCompare(b.action || '');
      return (b.timestamp || '').localeCompare(a.timestamp || '');
    });
  }, [
    logsSource,
    roleFilter,
    workspaceFilter,
    moduleFilter,
    actionFilter,
    employeeFilter,
    resultFilter,
    dateFrom,
    dateTo,
    searchQuery,
    sortBy,
  ]);

  // Filtered Permission Activity Logs (Requirement 2)
  const filteredPermissionLogs = useMemo(() => {
    return logsSource.filter((log) => {
      const isPermLog =
        log.module === 'Role & Access' ||
        log.module === 'Manage Access' ||
        (log.fieldChanged && log.fieldChanged.toLowerCase().includes('permission')) ||
        (log.action && log.action.toLowerCase().includes('permission')) ||
        (log.action && log.action.toLowerCase().includes('role'));

      if (!isPermLog) return false;

      if (permEmpFilter !== 'ALL') {
        const matchesEmp =
          log.targetEmployeeId === permEmpFilter ||
          log.targetRecord.includes(permEmpFilter);
        if (!matchesEmp) return false;
      }
      if (permAdminFilter !== 'ALL' && log.actorName !== permAdminFilter) return false;
      if (permRoleFilter !== 'ALL' && String(log.actorRole).toUpperCase() !== permRoleFilter)
        return false;
      if (permCategoryFilter !== 'ALL') {
        const hay = `${log.action} ${log.fieldChanged || ''} ${log.newValue || ''}`.toLowerCase();
        if (!hay.includes(permCategoryFilter.toLowerCase())) return false;
      }
      if (permDateFilter && !(log.timestamp || '').startsWith(permDateFilter)) return false;

      return true;
    });
  }, [
    logsSource,
    permEmpFilter,
    permAdminFilter,
    permRoleFilter,
    permCategoryFilter,
    permDateFilter,
  ]);

  const distinctAdmins = useMemo(() => {
    const set = new Set<string>();
    logsSource.forEach((l) => {
      if (l.actorName) set.add(l.actorName);
    });
    return Array.from(set);
  }, [logsSource]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedLogs.length / pageSize));
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedLogs.slice(start, start + pageSize);
  }, [filteredAndSortedLogs, currentPage]);

  if (!canViewLogs) {
    return (
      <div className="bg-white dark:bg-[#18181B] border border-[#E2E8F0] dark:border-[#27272A] rounded-2xl p-8 text-center">
        <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-[#0F172A] dark:text-white">
          Activity Log Access Restricted
        </h3>
        <p className="text-xs text-[#64748B] dark:text-[#A1A1AA] mt-1 max-w-md mx-auto">
          Only System Administrators or authorized users can inspect Activity Logs and Individual Permission Controls.
        </p>
      </div>
    );
  }

  const exportRows = filteredAndSortedLogs.map((l) => ({
    timestamp: l.timestamp,
    actorName: l.actorName,
    actorRole: l.actorRole,
    workspace: l.workspace || (l.actorRole === 'ADMIN' ? 'Admin' : l.actorRole === 'HR' ? 'HR' : 'Own'),
    module: l.module,
    action: l.action,
    targetRecord: l.targetRecord,
    fieldChanged: l.fieldChanged || 'Record State',
    previousValue: l.previousValue || '—',
    newValue: l.newValue || '—',
    result: l.result || 'SUCCESS',
    source: l.source || l.ipDevice || 'Web Portal',
  }));

  return (
    <div className="space-y-4">
      {/* Sub-navigation inside Activity Logs (Requirement 2: Individual Permission Control inside Activity Logs) */}
      <div className="bg-white dark:bg-[#18181B] border border-[#E2E8F0] dark:border-[#27272A] rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSubView('LOGS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              subView === 'LOGS'
                ? 'bg-[#0F172A] text-white dark:bg-white dark:text-[#0F172A]'
                : 'text-[#64748B] dark:text-[#A1A1AA] hover:bg-[#F8FAFC] dark:hover:bg-[#27272A]'
            }`}
          >
            <History className="w-4 h-4" />
            <span>1. All Activity Logs ({filteredAndSortedLogs.length})</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setSubView('INDIVIDUAL_PERMISSIONS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                subView === 'INDIVIDUAL_PERMISSIONS'
                  ? 'bg-emerald-600 text-white'
                  : 'text-[#64748B] dark:text-[#A1A1AA] hover:bg-[#F8FAFC] dark:hover:bg-[#27272A]'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>2. Individual Permission Control</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setSubView('PERMISSION_HISTORY')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              subView === 'PERMISSION_HISTORY'
                ? 'bg-[#0F172A] text-white dark:bg-white dark:text-[#0F172A]'
                : 'text-[#64748B] dark:text-[#A1A1AA] hover:bg-[#F8FAFC] dark:hover:bg-[#27272A]'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>3. Permission & Role Audit Trail ({filteredPermissionLogs.length})</span>
          </button>
        </div>

        <ExportDropdown
          data={exportRows}
          filename="Argos_Centralized_Activity_Log"
          title="Centralized Enterprise Activity Log"
        />
      </div>

      {/* SUBVIEW 2: INDIVIDUAL PERMISSION CONTROL INSIDE ACTIVITY LOGS */}
      {subView === 'INDIVIDUAL_PERMISSIONS' && isAdmin && (
        <IndividualPermissionControlPanel initialEmployeeId={initialEmployeeId} />
      )}

      {/* SUBVIEW 3: PERMISSION & ROLE CHANGE AUDIT TRAIL */}
      {subView === 'PERMISSION_HISTORY' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#18181B] border border-[#E2E8F0] dark:border-[#27272A] rounded-2xl p-4 space-y-3">
            <div>
              <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">
                Permission & Role Change Audit History
              </h3>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                Review who changed a permission or role, when it was modified, and exact Before vs. After permission values
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              <select
                value={permEmpFilter}
                onChange={(e) => setPermEmpFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-[#CBD5E1] dark:border-[#3F3F46] bg-[#F8FAFC] dark:bg-[#202024] text-xs text-[#0F172A] dark:text-white"
              >
                <option value="ALL">All Employees</option>
                {allEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} ({emp.id})
                  </option>
                ))}
              </select>

              <select
                value={permAdminFilter}
                onChange={(e) => setPermAdminFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-[#CBD5E1] dark:border-[#3F3F46] bg-[#F8FAFC] dark:bg-[#202024] text-xs text-[#0F172A] dark:text-white"
              >
                <option value="ALL">All Administrators / Actors</option>
                {distinctAdmins.map((actor) => (
                  <option key={actor} value={actor}>
                    {actor}
                  </option>
                ))}
              </select>

              <select
                value={permRoleFilter}
                onChange={(e) => setPermRoleFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-[#CBD5E1] dark:border-[#3F3F46] bg-[#F8FAFC] dark:bg-[#202024] text-xs text-[#0F172A] dark:text-white"
              >
                <option value="ALL">All Actor Roles</option>
                <option value="ADMIN">Admin</option>
                <option value="HR">HR</option>
              </select>

              <select
                value={permCategoryFilter}
                onChange={(e) => setPermCategoryFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-[#CBD5E1] dark:border-[#3F3F46] bg-[#F8FAFC] dark:bg-[#202024] text-xs text-[#0F172A] dark:text-white"
              >
                <option value="ALL">All Permission Categories</option>
                {PERMISSION_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={permDateFilter}
                onChange={(e) => setPermDateFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-[#CBD5E1] dark:border-[#3F3F46] bg-[#F8FAFC] dark:bg-[#202024] text-xs text-[#0F172A] dark:text-white"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-[#18181B] border border-[#E2E8F0] dark:border-[#27272A] rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] dark:bg-[#202024] border-b border-[#E2E8F0] dark:border-[#27272A] text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]">
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Changed By (Admin)</th>
                    <th className="py-3 px-4">Affected Employee / Role</th>
                    <th className="py-3 px-4">Permission / Action</th>
                    <th className="py-3 px-4">Before Value</th>
                    <th className="py-3 px-4">After Value</th>
                    <th className="py-3 px-4">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#27272A] text-xs">
                  {filteredPermissionLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[#64748B]">
                        No permission or role change events match your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredPermissionLogs.map((log) => (
                      <tr
                        key={log.id}
                        onClick={() => setSelectedLog(log)}
                        className="hover:bg-[#F8FAFC] dark:hover:bg-[#202024] cursor-pointer"
                      >
                        <td className="py-3 px-4 font-mono text-[11px] text-[#475569] dark:text-[#A1A1AA]">
                          {log.timestamp}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[#0F172A] dark:text-white">
                            {log.actorName}
                          </div>
                          <div className="text-[10px] text-[#64748B]">{log.actorRole}</div>
                        </td>
                        <td className="py-3 px-4 font-medium text-[#0F172A] dark:text-white">
                          {log.targetRecord}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[#0F172A] dark:text-white">
                            {log.action}
                          </div>
                          <div className="text-[10px] text-[#64748B]">
                            {log.fieldChanged || 'Permission Control'}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-rose-500">
                          {log.previousValue || '—'}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-emerald-500">
                          {log.newValue || '—'}
                        </td>
                        <td className="py-3 px-4 text-[#64748B] dark:text-[#94A3B8]">
                          {log.reason || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBVIEW 1: ALL ACTIVITY LOGS */}
      {subView === 'LOGS' && (
        <>
          <div className="bg-white dark:bg-[#18181B] border border-[#E2E8F0] dark:border-[#27272A] rounded-2xl p-4 space-y-3 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              <div className="relative lg:col-span-2">
                <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search user, employee ID, field, before/after value, action..."
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-[#CBD5E1] dark:border-[#3F3F46] bg-[#F8FAFC] dark:bg-[#202024] text-xs text-[#0F172A] dark:text-white outline-none"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 rounded-xl border border-[#CBD5E1] dark:border-[#3F3F46] bg-[#F8FAFC] dark:bg-[#202024] text-xs text-[#0F172A] dark:text-white"
              >
                <option value="ALL">All Roles</option>
                <option value="ADMIN">Admin</option>
                <option value="HR">HR</option>
                <option value="MANAGER">Manager</option>
                <option value="EMPLOYEE">Employee</option>
              </select>

              <select
                value={workspaceFilter}
                onChange={(e) => {
                  setWorkspaceFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 rounded-xl border border-[#CBD5E1] dark:border-[#3F3F46] bg-[#F8FAFC] dark:bg-[#202024] text-xs text-[#0F172A] dark:text-white"
              >
                <option value="ALL">All Workspaces</option>
                <option value="ADMIN">Admin Workspace</option>
                <option value="HR">HR Workspace</option>
                <option value="OWN">Own Workspace</option>
              </select>

              <select
                value={moduleFilter}
                onChange={(e) => {
                  setModuleFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 rounded-xl border border-[#CBD5E1] dark:border-[#3F3F46] bg-[#F8FAFC] dark:bg-[#202024] text-xs text-[#0F172A] dark:text-white"
              >
                <option value="ALL">All Modules</option>
                {uniqueModules.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 rounded-xl border border-[#CBD5E1] dark:border-[#3F3F46] bg-[#F8FAFC] dark:bg-[#202024] text-xs text-[#0F172A] dark:text-white"
              >
                <option value="ALL">All Action Types</option>
                <option value="CREATE">Create / Add</option>
                <option value="UPDATE">Update / Edit</option>
                <option value="DELETE">Delete / Archive</option>
                <option value="APPROVE">Approve / Confirm</option>
                <option value="ROLE">Role Change</option>
                <option value="PERMISSION">Permission Change</option>
              </select>

              <select
                value={employeeFilter}
                onChange={(e) => {
                  setEmployeeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 rounded-xl border border-[#CBD5E1] dark:border-[#3F3F46] bg-[#F8FAFC] dark:bg-[#202024] text-xs text-[#0F172A] dark:text-white"
              >
                <option value="ALL">All Affected Employees</option>
                {allEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} ({emp.id})
                  </option>
                ))}
              </select>

              <select
                value={resultFilter}
                onChange={(e) => {
                  setResultFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 rounded-xl border border-[#CBD5E1] dark:border-[#3F3F46] bg-[#F8FAFC] dark:bg-[#202024] text-xs text-[#0F172A] dark:text-white"
              >
                <option value="ALL">All Results</option>
                <option value="SUCCESS">Success Only</option>
                <option value="FAILED">Failed / Blocked Only</option>
              </select>

              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 rounded-xl border border-[#CBD5E1] dark:border-[#3F3F46] bg-[#F8FAFC] dark:bg-[#202024] text-xs text-[#0F172A] dark:text-white"
              />

              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 rounded-xl border border-[#CBD5E1] dark:border-[#3F3F46] bg-[#F8FAFC] dark:bg-[#202024] text-xs text-[#0F172A] dark:text-white"
              />

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 rounded-xl border border-[#CBD5E1] dark:border-[#3F3F46] bg-[#F8FAFC] dark:bg-[#202024] text-xs font-semibold text-[#0F172A] dark:text-white"
              >
                <option value="NEWEST">Sort: Newest First</option>
                <option value="OLDEST">Sort: Oldest First</option>
                <option value="USER">Sort: User-wise (A–Z)</option>
                <option value="MODULE">Sort: Module-wise</option>
              </select>
            </div>
          </div>

          <div className="bg-white dark:bg-[#18181B] border border-[#E2E8F0] dark:border-[#27272A] rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] dark:bg-[#202024] border-b border-[#E2E8F0] dark:border-[#27272A] text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]">
                    <th className="py-3 px-4">Date & Timestamp</th>
                    <th className="py-3 px-4">User / Actor</th>
                    <th className="py-3 px-4">Role & Workspace</th>
                    <th className="py-3 px-4">Module</th>
                    <th className="py-3 px-4">Action & Field</th>
                    <th className="py-3 px-4">Affected Record</th>
                    <th className="py-3 px-4">Previous Value</th>
                    <th className="py-3 px-4">New Value</th>
                    <th className="py-3 px-4">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#27272A] text-xs">
                  {paginatedLogs.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-[#64748B] dark:text-[#94A3B8]">
                        No activity log records match your current filter criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedLogs.map((log) => {
                      const res = log.result || 'SUCCESS';
                      const ws =
                        log.workspace ||
                        (log.actorRole === 'ADMIN'
                          ? 'Admin'
                          : log.actorRole === 'HR'
                          ? 'HR'
                          : 'Own');
                      return (
                        <tr
                          key={log.id}
                          onClick={() => setSelectedLog(log)}
                          className="hover:bg-[#F8FAFC] dark:hover:bg-[#202024] transition-colors cursor-pointer"
                        >
                          <td className="py-3 px-4 font-mono text-[11px] text-[#475569] dark:text-[#A1A1AA] whitespace-nowrap">
                            {log.timestamp}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-[#0F172A] dark:text-white">
                              {log.actorName}
                            </div>
                            <div className="text-[10px] font-mono text-[#64748B] dark:text-[#94A3B8]">
                              {log.actorUid}
                            </div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#F1F5F9] dark:bg-[#27272A] text-[#0F172A] dark:text-[#E2E8F0] mr-1">
                              {log.actorRole}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              {ws}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium text-[#0F172A] dark:text-[#E2E8F0] whitespace-nowrap">
                            {log.module}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-[#0F172A] dark:text-white">
                              {log.action}
                            </div>
                            <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                              Field: {log.fieldChanged || 'Record State'}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-medium text-[#0F172A] dark:text-[#E2E8F0]">
                            {log.targetRecord}
                          </td>
                          <td className="py-3 px-4 max-w-[160px] truncate text-rose-700 dark:text-rose-300 font-mono text-[11px]">
                            {log.previousValue || '—'}
                          </td>
                          <td className="py-3 px-4 max-w-[180px] truncate text-emerald-700 dark:text-emerald-300 font-mono text-[11px]">
                            {log.newValue || '—'}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                res === 'FAILED'
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              }`}
                            >
                              {res === 'FAILED' ? (
                                <XCircle className="w-3 h-3" />
                              ) : (
                                <CheckCircle2 className="w-3 h-3" />
                              )}
                              {res}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-3 border-t border-[#E2E8F0] dark:border-[#27272A] flex items-center justify-between text-xs text-[#64748B] dark:text-[#94A3B8]">
              <span>
                Showing {(currentPage - 1) * pageSize + (paginatedLogs.length > 0 ? 1 : 0)}–
                {(currentPage - 1) * pageSize + paginatedLogs.length} of{' '}
                {filteredAndSortedLogs.length} audit events
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1 rounded-lg border border-[#CBD5E1] dark:border-[#3F3F46] disabled:opacity-40 text-[#0F172A] dark:text-white font-semibold cursor-pointer"
                >
                  Prev
                </button>
                <span className="px-2 font-mono">
                  Page {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1 rounded-lg border border-[#CBD5E1] dark:border-[#3F3F46] disabled:opacity-40 text-[#0F172A] dark:text-white font-semibold cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Detailed Before / After Comparison Modal */}
      {selectedLog && (
        <ModalShell
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title={t('audit.comparisonTitle', 'Activity Log Field Comparison (Before vs. After)')}
          subtitle={`Audit Event ID: ${selectedLog.id} · ${selectedLog.timestamp}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#202024] border border-[#E2E8F0] dark:border-[#27272A]">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#64748B] block">
                  Actor / User
                </span>
                <span className="font-bold text-[#0F172A] dark:text-white">
                  {selectedLog.actorName} ({selectedLog.actorUid})
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-[#64748B] block">
                  Role & Active Workspace
                </span>
                <span className="font-bold text-[#0F172A] dark:text-white">
                  {selectedLog.actorRole} ·{' '}
                  {selectedLog.workspace ||
                    (selectedLog.actorRole === 'ADMIN' ? 'Admin' : 'HR')}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-[#64748B] block">
                  Module & Source
                </span>
                <span className="font-bold text-[#0F172A] dark:text-white">
                  {selectedLog.module} ({selectedLog.source || 'Web Portal'})
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-[#64748B] block">
                  Affected Record
                </span>
                <span className="font-bold text-[#0F172A] dark:text-white">
                  {selectedLog.targetRecord}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-[#64748B] block">
                  Exact Field Changed
                </span>
                <span className="font-bold text-[#0F172A] dark:text-white">
                  {selectedLog.fieldChanged || 'Record State'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-[#64748B] block">
                  Action Result
                </span>
                <span
                  className={`font-bold ${
                    selectedLog.result === 'FAILED' ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  {selectedLog.result || 'SUCCESS'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300 block mb-1">
                  Previous Value (Before)
                </span>
                <p className="font-mono text-xs text-rose-900 dark:text-rose-200 break-words">
                  {selectedLog.previousValue || '—'}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block mb-1">
                  New Value (After)
                </span>
                <p className="font-mono text-xs text-emerald-900 dark:text-emerald-200 break-words">
                  {selectedLog.newValue || '—'}
                </p>
              </div>
            </div>

            {selectedLog.reason && (
              <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#202024] border border-[#E2E8F0] dark:border-[#27272A]">
                <span className="text-[10px] font-bold uppercase text-[#64748B] block mb-0.5">
                  Reason / Audit Note
                </span>
                <p className="text-xs text-[#0F172A] dark:text-[#E2E8F0]">{selectedLog.reason}</p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-[#0F172A] text-white dark:bg-white dark:text-[#0F172A] text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
};

export function ManageAccessModule() {
  const {
    currentRole,
    underlyingRole,
    userAccessList,
    updateUserAccess,
    rolesList,
    permissionCatalog,
    createCustomRole,
    updateCustomRole,
    deleteCustomRole,
    assignRoleToUser,
    t,
  } = useHRMS();

  const isAdmin = underlyingRole === UserRole.ADMIN || currentRole === UserRole.ADMIN;

  // Main Tabs: 'users' | 'roles' | 'audit'
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'audit'>('users');
  const [auditInitialView, setAuditInitialView] = useState<
    'LOGS' | 'INDIVIDUAL_PERMISSIONS' | 'PERMISSION_HISTORY'
  >('LOGS');
  const [auditTargetEmpId, setAuditTargetEmpId] = useState<string | undefined>(undefined);

  // User list filters
  const [selectedRoleCategory, setSelectedRoleCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');

  // Create / Edit Role Modal State
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRoleDefinition | null>(null);
  const [roleFormName, setRoleFormName] = useState('');
  const [roleFormDesc, setRoleFormDesc] = useState('');
  const [roleFormLevel, setRoleFormLevel] = useState<AccessLevel>('Controller');
  const [roleFormPerms, setRoleFormPerms] = useState<Record<string, boolean>>({});
  const [roleFormAssignUserIds, setRoleFormAssignUserIds] = useState<string[]>([]);
  const [expandedRoleCat, setExpandedRoleCat] = useState<Record<string, boolean>>({
    Dashboard: true,
    Employees: true,
  });

  // Delete Custom Role Modal State
  const [deletingRole, setDeletingRole] = useState<CustomRoleDefinition | null>(null);
  const [reassignRoleId, setReassignRoleId] = useState<string>('ROLE-EMPLOYEE');
  const [deleteRoleReason, setDeleteRoleReason] = useState('');

  const allCategories = useMemo(() => {
    const set = new Set<string>(PERMISSION_CATEGORIES);
    permissionCatalog.forEach((p) => set.add(p.category));
    return Array.from(set);
  }, [permissionCatalog]);

  const filteredUsers = useMemo(() => {
    return userAccessList.filter((u) => {
      if (selectedRoleCategory !== 'ALL') {
        if (u.role !== selectedRoleCategory && u.roleId !== selectedRoleCategory) {
          return false;
        }
      }
      if (selectedStatusFilter !== 'ALL' && u.accountStatus !== selectedStatusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          u.fullName.toLowerCase().includes(q) ||
          u.employeeId.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.department.toLowerCase().includes(q) ||
          (u.roleName || u.role).toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [userAccessList, selectedRoleCategory, selectedStatusFilter, searchQuery]);

  if (!isAdmin) {
    return (
      <div className="bg-white dark:bg-[#18181B] border border-[#E2E8F0] dark:border-[#27272A] rounded-2xl p-10 text-center max-w-xl mx-auto my-8">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-[#0F172A] dark:text-white">
          Administrator Authority Required
        </h2>
        <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1.5 leading-relaxed">
          Role & Access Management is restricted to authorized System Administrators.
        </p>
      </div>
    );
  }

  const openCreateRoleModal = () => {
    setEditingRole(null);
    setRoleFormName('');
    setRoleFormDesc('');
    setRoleFormLevel('Controller');
    const defaultPerms: Record<string, boolean> = {};
    permissionCatalog.forEach((p) => {
      defaultPerms[p.id] = p.id.endsWith('.view_own') || p.id.includes('punch_own');
    });
    setRoleFormPerms(defaultPerms);
    setRoleFormAssignUserIds([]);
    setRoleModalOpen(true);
  };

  const openEditRoleModal = (role: CustomRoleDefinition) => {
    setEditingRole(role);
    setRoleFormName(role.name);
    setRoleFormDesc(role.description);
    setRoleFormLevel(role.accessLevel);
    setRoleFormPerms({ ...role.permissions });
    const assigned = userAccessList
      .filter((u) => u.roleId === role.id || (!u.roleId && u.role === role.baseRoleType))
      .map((u) => u.employeeId);
    setRoleFormAssignUserIds(assigned);
    setRoleModalOpen(true);
  };

  const handleSaveRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRole) {
      updateCustomRole(editingRole.id, {
        name: roleFormName,
        description: roleFormDesc,
        accessLevel: roleFormLevel,
        permissions: roleFormPerms,
      });
      roleFormAssignUserIds.forEach((empId) => {
        const u = userAccessList.find((x) => x.employeeId === empId);
        if (u && u.roleId !== editingRole.id) {
          assignRoleToUser(empId, editingRole.id, `Assigned via Role Editor (${roleFormName})`);
        }
      });
      setRoleModalOpen(false);
    } else {
      const created = createCustomRole({
        name: roleFormName,
        description: roleFormDesc,
        accessLevel: roleFormLevel,
        permissions: roleFormPerms,
        assignToEmployeeIds: roleFormAssignUserIds,
      });
      if (created) {
        setRoleModalOpen(false);
      }
    }
  };

  const handleConfirmDeleteRole = () => {
    if (!deletingRole) return;
    const res = deleteCustomRole(deletingRole.id, reassignRoleId, deleteRoleReason);
    if (res.success) {
      setDeletingRole(null);
      setDeleteRoleReason('');
    }
  };

  const openEmployeePermissionsInActivityLogs = (empId: string) => {
    setAuditTargetEmpId(empId);
    setAuditInitialView('INDIVIDUAL_PERMISSIONS');
    setActiveTab('audit');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#18181B] border border-[#E2E8F0] dark:border-[#27272A] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-[#0F172A] text-white dark:bg-white dark:text-[#0F172A] text-[10px] font-bold uppercase tracking-wider">
              Simplified Access Control
            </span>
            <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              Super Admin: Argos Watch (argos.subscription04@gmail.com)
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white mt-1">
            {t('access.title', 'Role & Access Management')}
          </h1>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
            Assign roles to employees, manage role defaults across 12 clear categories, and configure Individual Permission Control inside Activity Logs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openCreateRoleModal}
            className="px-3.5 py-2 rounded-xl bg-[#0F172A] text-white dark:bg-white dark:text-[#0F172A] text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('access.createRole', 'Create New Role')}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAuditInitialView('INDIVIDUAL_PERMISSIONS');
              setActiveTab('audit');
            }}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Open Individual Permission Control (Activity Logs)</span>
          </button>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E2E8F0] dark:border-[#27272A] pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'users'
              ? 'bg-[#0F172A] text-white dark:bg-white dark:text-[#0F172A] shadow-xs'
              : 'bg-white dark:bg-[#18181B] text-[#64748B] dark:text-[#A1A1AA] border border-[#E2E8F0] dark:border-[#27272A]'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>1. Employee Role Assignment</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-black/10 dark:bg-white/10">
            {userAccessList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('roles')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'roles'
              ? 'bg-[#0F172A] text-white dark:bg-white dark:text-[#0F172A] shadow-xs'
              : 'bg-white dark:bg-[#18181B] text-[#64748B] dark:text-[#A1A1AA] border border-[#E2E8F0] dark:border-[#27272A]'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>2. Roles & Default Permissions</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-black/10 dark:bg-white/10">
            {rolesList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-[#0F172A] text-white dark:bg-white dark:text-[#0F172A] shadow-xs'
              : 'bg-white dark:bg-[#18181B] text-[#64748B] dark:text-[#A1A1AA] border border-[#E2E8F0] dark:border-[#27272A]'
          }`}
        >
          <History className="w-4 h-4" />
          <span>3. Activity Logs & Individual Permission Control</span>
        </button>
      </div>

      {/* TAB 1: EMPLOYEE ROLE ASSIGNMENT */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#18181B] border border-[#E2E8F0] dark:border-[#27272A] rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by employee name, ID, email, role, or department..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#CBD5E1] dark:border-[#3F3F46] bg-[#F8FAFC] dark:bg-[#202024] text-xs text-[#0F172A] dark:text-white outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedRoleCategory}
                onChange={(e) => setSelectedRoleCategory(e.target.value)}
                className="px-3 py-2 rounded-xl border border-[#CBD5E1] dark:border-[#3F3F46] bg-[#F8FAFC] dark:bg-[#202024] text-xs font-semibold text-[#0F172A] dark:text-white"
              >
                <option value="ALL">All Roles ({userAccessList.length})</option>
                {rolesList.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-[#CBD5E1] dark:border-[#3F3F46] bg-[#F8FAFC] dark:bg-[#202024] text-xs font-semibold text-[#0F172A] dark:text-white"
              >
                <option value="ALL">All Account Statuses</option>
                <option value="Active">Active</option>
                <option value="Suspended">Suspended</option>
              </select>
            </div>
          </div>

          <div className="bg-white dark:bg-[#18181B] border border-[#E2E8F0] dark:border-[#27272A] rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] dark:bg-[#202024] border-b border-[#E2E8F0] dark:border-[#27272A] text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]">
                    <th className="py-3.5 px-4">Employee</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4">Assigned Role</th>
                    <th className="py-3.5 px-4">Permissions Summary</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#27272A] text-xs">
                  {filteredUsers.map((user) => {
                    const userRoleDef =
                      rolesList.find((r) => r.id === user.roleId) ||
                      rolesList.find((r) => r.baseRoleType === user.role);
                    const overrides = user.permissionOverrides || {};
                    const allowedOverridesCount = Object.values(overrides).filter(
                      (v) => v === 'ALLOWED'
                    ).length;
                    const deniedOverridesCount = Object.values(overrides).filter(
                      (v) => v === 'DENIED'
                    ).length;
                    const isSuperAdmin = user.employeeId === SUPER_ADMIN_ID;
                    const effectiveAllowedTotal = permissionCatalog.filter(
                      (p) =>
                        resolveEffectivePermission(
                          userRoleDef,
                          user.permissionOverrides,
                          p.id,
                          isSuperAdmin
                        ).allowed
                    ).length;

                    return (
                      <tr
                        key={user.employeeId}
                        className="hover:bg-[#F8FAFC] dark:hover:bg-[#202024] transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <AvatarInitials name={user.fullName} size="sm" />
                            <div>
                              <div className="font-bold text-[#0F172A] dark:text-white flex items-center gap-1.5">
                                <span>{user.fullName}</span>
                                {isSuperAdmin && (
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold">
                                    Super Admin
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                                {user.employeeId} · {user.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-medium text-[#0F172A] dark:text-white">
                            {user.department}
                          </div>
                          <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                            {user.designation}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <select
                            value={
                              user.roleId ||
                              (user.role === UserRole.ADMIN
                                ? 'ROLE-ADMIN'
                                : user.role === UserRole.HR
                                ? 'ROLE-HR'
                                : user.role === UserRole.MANAGER
                                ? 'ROLE-MANAGER'
                                : 'ROLE-EMPLOYEE')
                            }
                            disabled={isSuperAdmin}
                            onChange={(e) =>
                              assignRoleToUser(
                                user.employeeId,
                                e.target.value,
                                `Role assigned via Employee Role Assignment table`
                              )
                            }
                            className="px-2.5 py-1.5 rounded-lg border border-[#CBD5E1] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] text-xs font-semibold text-[#0F172A] dark:text-white disabled:opacity-60 cursor-pointer"
                          >
                            {rolesList.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name} {r.isSystemRole ? '' : '(Custom)'}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              {effectiveAllowedTotal} of {permissionCatalog.length} Enabled
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                              Inherited from {userRoleDef?.name || user.role}
                            </span>
                            {allowedOverridesCount > 0 && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                                +{allowedOverridesCount} Individually Allowed
                              </span>
                            )}
                            {deniedOverridesCount > 0 && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300">
                                -{deniedOverridesCount} Individually Restricted
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <StatusBadge status={user.accountStatus} />
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEmployeePermissionsInActivityLogs(user.employeeId)}
                              className="px-3 py-1.5 rounded-xl bg-[#0F172A] text-white dark:bg-white dark:text-[#0F172A] text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1.5"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                              <span>Individual Permissions</span>
                            </button>

                            {!isSuperAdmin && (
                              <button
                                type="button"
                                onClick={() =>
                                  updateUserAccess(
                                    user.employeeId,
                                    {
                                      accountStatus:
                                        user.accountStatus === 'Active' ? 'Suspended' : 'Active',
                                    },
                                    user.accountStatus === 'Active'
                                      ? 'Account suspended by Admin'
                                      : 'Account reactivated by Admin'
                                  )
                                }
                                className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer ${
                                  user.accountStatus === 'Active'
                                    ? 'border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400'
                                    : 'border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400'
                                }`}
                              >
                                {user.accountStatus === 'Active' ? 'Suspend' : 'Activate'}
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
        </div>
      )}

      {/* TAB 2: ROLES & DEFAULT PERMISSIONS */}
      {activeTab === 'roles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rolesList.map((role) => {
            const assignedUsers = userAccessList.filter(
              (u) =>
                u.roleId === role.id ||
                (!u.roleId && role.isSystemRole && u.role === role.baseRoleType)
            );
            const grantedCount = Object.values(role.permissions).filter(Boolean).length;

            return (
              <div
                key={role.id}
                className="bg-white dark:bg-[#18181B] border border-[#E2E8F0] dark:border-[#27272A] rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xs"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-[#0F172A] dark:text-white">
                          {role.name}
                        </h3>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            role.isSystemRole
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                              : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                          }`}
                        >
                          {role.isSystemRole ? 'System Role' : 'Custom Role'}
                        </span>
                      </div>
                      <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
                        {role.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditRoleModal(role)}
                        className="px-2.5 py-1.5 rounded-lg border border-[#CBD5E1] dark:border-[#3F3F46] text-xs font-semibold text-[#0F172A] dark:text-white hover:bg-[#F8FAFC] dark:hover:bg-[#27272A] flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Role Permissions</span>
                      </button>
                      {!role.isSystemRole && (
                        <button
                          type="button"
                          onClick={() => {
                            setDeletingRole(role);
                            setReassignRoleId('ROLE-EMPLOYEE');
                          }}
                          className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 cursor-pointer"
                          title="Delete Custom Role"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <div className="p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#202024] border border-[#E2E8F0] dark:border-[#27272A]">
                      <span className="text-[10px] font-bold uppercase text-[#64748B] block">
                        Access Tier
                      </span>
                      <span className="text-xs font-bold text-[#0F172A] dark:text-white">
                        {role.accessLevel}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#202024] border border-[#E2E8F0] dark:border-[#27272A]">
                      <span className="text-[10px] font-bold uppercase text-[#64748B] block">
                        Inherited Permissions
                      </span>
                      <span className="text-xs font-bold text-emerald-500">
                        {grantedCount} / {permissionCatalog.length} Enabled
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#202024] border border-[#E2E8F0] dark:border-[#27272A]">
                      <span className="text-[10px] font-bold uppercase text-[#64748B] block">
                        Assigned Users
                      </span>
                      <span className="text-xs font-bold text-[#0F172A] dark:text-white">
                        {assignedUsers.length} user(s)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E2E8F0] dark:border-[#27272A]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block mb-2">
                    Assigned Users ({assignedUsers.length}) — Click to view Individual Permissions
                  </span>
                  {assignedUsers.length === 0 ? (
                    <p className="text-xs text-[#64748B] italic">
                      No users currently assigned to this role.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {assignedUsers.map((u) => (
                        <button
                          key={u.employeeId}
                          type="button"
                          onClick={() => openEmployeePermissionsInActivityLogs(u.employeeId)}
                          className="px-2.5 py-1 rounded-lg bg-[#F1F5F9] dark:bg-[#27272A] hover:bg-[#E2E8F0] dark:hover:bg-[#3F3F46] text-[11px] font-medium text-[#0F172A] dark:text-[#E2E8F0] flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>{u.fullName}</span>
                          <span className="text-[10px] font-mono text-[#64748B]">
                            ({u.employeeId})
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 3: CENTRALIZED ACTIVITY LOG & INDIVIDUAL PERMISSION CONTROL */}
      {activeTab === 'audit' && (
        <CentralizedActivityLogView
          key={`${auditInitialView}-${auditTargetEmpId || 'default'}`}
          initialSubView={auditInitialView}
          initialEmployeeId={auditTargetEmpId}
        />
      )}

      {/* MODAL: CREATE / EDIT ROLE WITH EXPANDABLE 12 CATEGORIES */}
      {roleModalOpen && (
        <ModalShell
          isOpen={roleModalOpen}
          onClose={() => setRoleModalOpen(false)}
          title={editingRole ? `Edit Role — ${editingRole.name}` : 'Create New Role'}
          subtitle="Select default permissions across the 12 HRMS categories. Users assigned to this role automatically inherit these permissions."
          maxWidth="max-w-4xl"
        >
          <form onSubmit={handleSaveRole} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-[#0F172A] dark:text-white block mb-1">
                  Role Name *
                </label>
                <input
                  type="text"
                  required
                  disabled={editingRole?.id === 'ROLE-ADMIN'}
                  value={roleFormName}
                  onChange={(e) => setRoleFormName(e.target.value)}
                  placeholder="e.g. Regional HR Partner"
                  className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] dark:border-[#3F3F46] bg-[#F8FAFC] dark:bg-[#202024] text-xs text-[#0F172A] dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#0F172A] dark:text-white block mb-1">
                  Access Level
                </label>
                <select
                  value={roleFormLevel}
                  onChange={(e) => setRoleFormLevel(e.target.value as AccessLevel)}
                  className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] dark:border-[#3F3F46] bg-[#F8FAFC] dark:bg-[#202024] text-xs text-[#0F172A] dark:text-white"
                >
                  <option value="Controller">Controller (Operational & Action Access)</option>
                  <option value="Viewer">Viewer (Read & Inspection Access)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[#0F172A] dark:text-white block mb-1">
                  Quick Presets
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const allTrue: Record<string, boolean> = {};
                      permissionCatalog.forEach((p) => {
                        allTrue[p.id] = true;
                      });
                      setRoleFormPerms(allTrue);
                    }}
                    className="px-2.5 py-2 rounded-xl border border-[#CBD5E1] dark:border-[#3F3F46] text-[11px] font-semibold text-[#0F172A] dark:text-white cursor-pointer"
                  >
                    Enable All
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const selfOnly: Record<string, boolean> = {};
                      permissionCatalog.forEach((p) => {
                        selfOnly[p.id] = p.id.includes('_own') || p.id.includes('punch_own');
                      });
                      setRoleFormPerms(selfOnly);
                    }}
                    className="px-2.5 py-2 rounded-xl border border-[#CBD5E1] dark:border-[#3F3F46] text-[11px] font-semibold text-[#0F172A] dark:text-white cursor-pointer"
                  >
                    Employee Self-Service
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#0F172A] dark:text-white block mb-1">
                Role Description
              </label>
              <input
                type="text"
                value={roleFormDesc}
                onChange={(e) => setRoleFormDesc(e.target.value)}
                placeholder="Describe responsibilities for this role..."
                className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] dark:border-[#3F3F46] bg-[#F8FAFC] dark:bg-[#202024] text-xs text-[#0F172A] dark:text-white"
              />
            </div>

            {/* Expandable 12 Categories */}
            <div className="space-y-2 max-h-80 overflow-y-auto border border-[#E2E8F0] dark:border-[#27272A] rounded-2xl p-3">
              {allCategories.map((cat) => {
                const catPerms = permissionCatalog.filter((p) => p.category === cat);
                if (catPerms.length === 0) return null;
                const isOpen = Boolean(expandedRoleCat[cat]);
                const enabledCount = catPerms.filter((p) => roleFormPerms[p.id]).length;

                return (
                  <div
                    key={cat}
                    className="border border-[#E2E8F0] dark:border-[#27272A] rounded-xl overflow-hidden"
                  >
                    <div className="bg-[#F8FAFC] dark:bg-[#202024] px-3.5 py-2.5 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedRoleCat((prev) => ({ ...prev, [cat]: !isOpen }))
                        }
                        className="flex items-center gap-2 text-xs font-bold text-[#0F172A] dark:text-white cursor-pointer"
                      >
                        {isOpen ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                        <span>{cat}</span>
                        <span className="text-[10px] font-normal text-[#64748B]">
                          ({enabledCount}/{catPerms.length} enabled)
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const allChecked = catPerms.every((p) => roleFormPerms[p.id]);
                          const next = { ...roleFormPerms };
                          catPerms.forEach((p) => {
                            next[p.id] = !allChecked;
                          });
                          setRoleFormPerms(next);
                        }}
                        className="text-[11px] font-semibold text-emerald-500 hover:underline cursor-pointer"
                      >
                        Toggle All in {cat}
                      </button>
                    </div>

                    {isOpen && (
                      <div className="p-3 space-y-2 bg-white dark:bg-[#18181B]">
                        {catPerms.map((p) => (
                          <label
                            key={p.id}
                            className="flex items-start gap-2.5 text-xs text-[#0F172A] dark:text-[#E2E8F0] cursor-pointer py-1"
                          >
                            <input
                              type="checkbox"
                              checked={Boolean(roleFormPerms[p.id])}
                              onChange={(e) =>
                                setRoleFormPerms((prev) => ({
                                  ...prev,
                                  [p.id]: e.target.checked,
                                }))
                              }
                              className="mt-0.5 rounded border-[#CBD5E1] accent-emerald-600"
                            />
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <ActionTypeBadge actionType={p.actionType} />
                                <span className="font-semibold">{p.name}</span>
                              </div>
                              <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                                {p.whatItDoes}
                              </p>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Assign Role to Users */}
            <div>
              <label className="text-xs font-bold text-[#0F172A] dark:text-white block mb-1.5">
                Assign Role to Employees (Optional)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#27272A] bg-[#F8FAFC] dark:bg-[#202024]">
                {userAccessList
                  .filter((u) => u.employeeId !== SUPER_ADMIN_ID)
                  .map((u) => {
                    const checked = roleFormAssignUserIds.includes(u.employeeId);
                    return (
                      <label
                        key={u.employeeId}
                        className="flex items-center gap-2 text-xs text-[#0F172A] dark:text-white cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setRoleFormAssignUserIds((prev) => [...prev, u.employeeId]);
                            } else {
                              setRoleFormAssignUserIds((prev) =>
                                prev.filter((id) => id !== u.employeeId)
                              );
                            }
                          }}
                        />
                        <span className="truncate">
                          {u.fullName} ({u.employeeId})
                        </span>
                      </label>
                    );
                  })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRoleModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-[#CBD5E1] dark:border-[#3F3F46] text-xs font-semibold text-[#0F172A] dark:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#0F172A] text-white dark:bg-white dark:text-[#0F172A] text-xs font-bold cursor-pointer"
              >
                Save Role
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* MODAL: DELETE CUSTOM ROLE */}
      {deletingRole && (
        <ModalShell
          isOpen={!!deletingRole}
          onClose={() => setDeletingRole(null)}
          title={`Delete Custom Role — ${deletingRole.name}`}
          subtitle="Review assigned users and reassign them before confirming role deletion."
          maxWidth="max-w-lg"
        >
          {(() => {
            const assignedCount = userAccessList.filter(
              (u) => u.roleId === deletingRole.id
            ).length;
            return (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200">
                  <p className="font-bold">
                    Users currently assigned to &ldquo;{deletingRole.name}&rdquo;: {assignedCount}{' '}
                    user(s)
                  </p>
                </div>

                {assignedCount > 0 && (
                  <div>
                    <label className="text-xs font-bold text-[#0F172A] dark:text-white block mb-1">
                      Reassign {assignedCount} user(s) to replacement role *
                    </label>
                    <select
                      value={reassignRoleId}
                      onChange={(e) => setReassignRoleId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] dark:border-[#3F3F46] bg-[#F8FAFC] dark:bg-[#202024] text-xs font-semibold text-[#0F172A] dark:text-white"
                    >
                      {rolesList
                        .filter((r) => r.id !== deletingRole.id)
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeletingRole(null)}
                    className="px-4 py-2 rounded-xl border border-[#CBD5E1] dark:border-[#3F3F46] text-xs font-semibold text-[#0F172A] dark:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDeleteRole}
                    className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 cursor-pointer"
                  >
                    Confirm & Delete Role
                  </button>
                </div>
              </div>
            );
          })()}
        </ModalShell>
      )}
    </div>
  );
}
