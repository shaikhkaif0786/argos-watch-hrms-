import React, { useMemo, useState } from 'react';
import {
  Smartphone,
  Send,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  MapPin,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  LogOut,
  History,
  Settings,
  Copy,
  Mail,
  MessageSquare,
  Navigation,
  ExternalLink,
  Users,
  UserCheck,
  AlertTriangle,
  Lock,
  Unlock,
  CheckSquare,
  Square,
  X,
} from 'lucide-react';
import { useHRMS } from '../../context/HRMSContext';
import { MobileAppUserRecord, UserRole } from '../../types/hrms';

type MobileSubTab = 'DIRECTORY' | 'ATTENDANCE_PERMISSIONS' | 'LOCATION_TRACKING' | 'STORE_SETTINGS';

export const MobileAppManagementModule: React.FC = () => {
  const {
    currentRole,
    hasPermission,
    departments,
    mobileAppUsers,
    mobileLocationLogs,
    mobileAppStoreConfig,
    sendMobileAppInvitation,
    sendBulkMobileInvitations,
    sendMobilePasswordReset,
    toggleMobileAccountSuspension,
    revokeMobileSessions,
    updateMobileAttendancePermissions,
    updateBulkMobileAttendancePermissions,
    updateMobileAppStoreConfig,
    checkInToday,
    checkOutToday,
    isClockedIn,
    addToast,
  } = useHRMS();

  const [activeTab, setActiveTab] = useState<MobileSubTab>('DIRECTORY');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [inviteFilter, setInviteFilter] = useState<string>('ALL');
  const [checkInFilter, setCheckInFilter] = useState<string>('ALL');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals
  const [historyUser, setHistoryUser] = useState<MobileAppUserRecord | null>(null);
  const [suspendModalUser, setSuspendModalUser] = useState<MobileAppUserRecord | null>(null);
  const [suspendReason, setSuspendReason] = useState('');

  // Bulk policy state
  const [bulkDept, setBulkDept] = useState<string>('ALL');
  const [bulkRole, setBulkRole] = useState<string>('ALL');

  // Location filters
  const [locSearch, setLocSearch] = useState('');
  const [locDeptFilter, setLocDeptFilter] = useState('ALL');
  const [locStatusFilter, setLocStatusFilter] = useState('ALL');
  const [locDateFilter, setLocDateFilter] = useState('');

  // Store link form state
  const [androidUrl, setAndroidUrl] = useState(mobileAppStoreConfig.androidPlayStoreUrl || '');
  const [iosUrl, setIosUrl] = useState(mobileAppStoreConfig.iosAppStoreUrl || '');
  const [landingUrl, setLandingUrl] = useState(mobileAppStoreConfig.directDownloadLandingUrl || '');
  const [supportEmail, setSupportEmail] = useState(mobileAppStoreConfig.supportEmail || 'hr@argoswatch.in');

  const canManageMobile =
    currentRole === UserRole.ADMIN ||
    currentRole === UserRole.HR ||
    hasPermission('users.manage_mobile_app');

  // Dashboard Summary KPIs (Requirement 8.6)
  const kpis = useMemo(() => {
    const total = mobileAppUsers.length;
    const invited = mobileAppUsers.filter((u) => u.invitationSent).length;
    const registered = mobileAppUsers.filter((u) => u.isRegistered).length;
    const pendingActivation = mobileAppUsers.filter((u) => u.invitationSent && !u.isRegistered).length;
    const mobileCheckInEnabled = mobileAppUsers.filter(
      (u) =>
        u.attendancePermissions.allowMobileAttendance &&
        u.attendancePermissions.allowMobileCheckIn &&
        u.accessStatus !== 'SUSPENDED'
    ).length;
    const suspended = mobileAppUsers.filter((u) => u.accessStatus === 'SUSPENDED').length;

    return {
      total,
      invited,
      registered,
      pendingActivation,
      mobileCheckInEnabled,
      suspended,
    };
  }, [mobileAppUsers]);

  // Filtered Mobile Users
  const filteredUsers = useMemo(() => {
    return mobileAppUsers.filter((u) => {
      const q = searchQuery.trim().toLowerCase();
      if (
        q &&
        !u.fullName.toLowerCase().includes(q) &&
        !u.employeeId.toLowerCase().includes(q) &&
        !u.email.toLowerCase().includes(q) &&
        !u.department.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (statusFilter !== 'ALL' && u.accessStatus !== statusFilter) return false;
      if (inviteFilter === 'INVITED' && !u.invitationSent) return false;
      if (inviteFilter === 'NOT_INVITED' && u.invitationSent) return false;
      if (inviteFilter === 'PENDING_ACTIVATION' && (!u.invitationSent || u.isRegistered)) return false;
      if (
        checkInFilter === 'ENABLED' &&
        (!u.attendancePermissions.allowMobileAttendance || !u.attendancePermissions.allowMobileCheckIn)
      ) {
        return false;
      }
      if (
        checkInFilter === 'DISABLED' &&
        u.attendancePermissions.allowMobileAttendance &&
        u.attendancePermissions.allowMobileCheckIn
      ) {
        return false;
      }
      if (deptFilter !== 'ALL' && u.department !== deptFilter) return false;
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
      return true;
    });
  }, [mobileAppUsers, searchQuery, statusFilter, inviteFilter, checkInFilter, deptFilter, roleFilter]);

  // Filtered Location Logs
  const filteredLocations = useMemo(() => {
    return mobileLocationLogs.filter((loc) => {
      const q = locSearch.trim().toLowerCase();
      if (
        q &&
        !loc.employeeName.toLowerCase().includes(q) &&
        !loc.employeeId.toLowerCase().includes(q) &&
        !loc.department.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (locDeptFilter !== 'ALL' && loc.department !== locDeptFilter) return false;
      if (locStatusFilter !== 'ALL' && loc.locationStatus !== locStatusFilter) return false;
      if (locDateFilter && loc.date !== locDateFilter) return false;
      return true;
    });
  }, [mobileLocationLogs, locSearch, locDeptFilter, locStatusFilter, locDateFilter]);

  const toggleSelectUser = (empId: string) => {
    setSelectedIds((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    );
  };

  const toggleSelectAllFiltered = () => {
    const allFilteredIds = filteredUsers.map((u) => u.employeeId);
    const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      setSelectedIds(Array.from(new Set([...selectedIds, ...allFilteredIds])));
    }
  };

  const handleCopyInviteLink = (user: MobileAppUserRecord) => {
    const configuredUrl =
      mobileAppStoreConfig.directDownloadLandingUrl.trim() ||
      mobileAppStoreConfig.androidPlayStoreUrl.trim() ||
      mobileAppStoreConfig.iosAppStoreUrl.trim();

    if (!configuredUrl) {
      addToast(
        'Store URL Not Configured',
        'Please configure your official Android Play Store, iOS App Store, or Direct Download URL in the Store Links tab first.',
        'info'
      );
      setActiveTab('STORE_SETTINGS');
      return;
    }

    const inviteText = `Hello ${user.fullName}, download the official ${mobileAppStoreConfig.appName} mobile app here: ${configuredUrl} (Employee ID: ${user.employeeId})`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(inviteText);
    }
    sendMobileAppInvitation(user.employeeId, 'WhatsApp / Copy Link');
  };

  const renderStatusBadge = (status: MobileAppUserRecord['accessStatus']) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Active
          </span>
        );
      case 'INVITED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" />
            Invited
          </span>
        );
      case 'SUSPENDED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5" />
            Suspended
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-500/15 text-slate-300 border border-slate-500/30">
            Not Invited
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-[#0F172A] border border-slate-800 rounded-xl p-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Mobile App User Management & Administration
              </h1>
              <p className="text-xs text-slate-400">
                Manage employee mobile app onboarding, invitations, password resets, check-in/out permissions, and live GPS attendance verification
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              if (isClockedIn) {
                checkOutToday({ viaMobileApp: true });
              } else {
                checkInToday('Checked in via Argos Watch Mobile App (Live GPS)', { viaMobileApp: true });
              }
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 transition"
          >
            <Navigation className="w-3.5 h-3.5 text-emerald-400" />
            {isClockedIn ? 'Test Mobile Check-Out (Live GPS)' : 'Test Mobile Check-In (Live GPS)'}
          </button>

          {selectedIds.length > 0 && canManageMobile && (
            <button
              type="button"
              onClick={() => {
                sendBulkMobileInvitations(selectedIds);
                setSelectedIds([]);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition"
            >
              <Send className="w-3.5 h-3.5" />
              Send Invite to Selected ({selectedIds.length})
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              const pendingIds = mobileAppUsers
                .filter((u) => !u.isRegistered && u.accessStatus !== 'SUSPENDED')
                .map((u) => u.employeeId);
              if (pendingIds.length === 0) {
                addToast('All Employees Registered', 'All active employees have already registered.', 'info');
                return;
              }
              sendBulkMobileInvitations(pendingIds);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition"
          >
            <Send className="w-3.5 h-3.5" />
            Invite All Pending Users
          </button>
        </div>
      </div>

      {/* Requirement 8.6: Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Employees</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{kpis.total}</p>
          <p className="text-[11px] text-slate-400 mt-1">Eligible for mobile app</p>
        </div>

        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Invited to Mobile App</span>
            <Send className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{kpis.invited}</p>
          <p className="text-[11px] text-slate-400 mt-1">Download link dispatched</p>
        </div>

        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Registered Users</span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-2">{kpis.registered}</p>
          <p className="text-[11px] text-slate-400 mt-1">Active device paired</p>
        </div>

        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Pending Activation</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-300 mt-2">{kpis.pendingActivation}</p>
          <p className="text-[11px] text-slate-400 mt-1">Invited, awaiting login</p>
        </div>

        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Mobile Check-In Enabled</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{kpis.mobileCheckInEnabled}</p>
          <p className="text-[11px] text-slate-400 mt-1">Authorized for mobile punch</p>
        </div>

        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Suspended Accounts</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold text-rose-400 mt-2">{kpis.suspended}</p>
          <p className="text-[11px] text-slate-400 mt-1">Mobile access restricted</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('DIRECTORY')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
            activeTab === 'DIRECTORY'
              ? 'bg-emerald-600 text-white'
              : 'bg-[#0F172A] text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          1. Employee Mobile Status & Account Control ({mobileAppUsers.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ATTENDANCE_PERMISSIONS')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
            activeTab === 'ATTENDANCE_PERMISSIONS'
              ? 'bg-emerald-600 text-white'
              : 'bg-[#0F172A] text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          2. Mobile Check-In / Check-Out Permissions
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('LOCATION_TRACKING')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
            activeTab === 'LOCATION_TRACKING'
              ? 'bg-emerald-600 text-white'
              : 'bg-[#0F172A] text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <MapPin className="w-4 h-4" />
          3. Mobile Punch GPS Location Tracking ({mobileLocationLogs.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('STORE_SETTINGS')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
            activeTab === 'STORE_SETTINGS'
              ? 'bg-emerald-600 text-white'
              : 'bg-[#0F172A] text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Settings className="w-4 h-4" />
          4. Official App Download Links
        </button>
      </div>

      {/* Filters Bar for Directory & Permissions tabs */}
      {(activeTab === 'DIRECTORY' || activeTab === 'ATTENDANCE_PERMISSIONS') && (
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, ID, email, department..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
          >
            <option value="ALL">All Account Statuses</option>
            <option value="ACTIVE">Active (Registered)</option>
            <option value="INVITED">Invited (Pending)</option>
            <option value="NOT_INVITED">Not Invited</option>
            <option value="SUSPENDED">Suspended</option>
          </select>

          <select
            value={inviteFilter}
            onChange={(e) => setInviteFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
          >
            <option value="ALL">All Invitation States</option>
            <option value="INVITED">Invitation Sent</option>
            <option value="PENDING_ACTIVATION">Pending Activation</option>
            <option value="NOT_INVITED">Not Invited Yet</option>
          </select>

          <select
            value={checkInFilter}
            onChange={(e) => setCheckInFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
          >
            <option value="ALL">All Check-In Permissions</option>
            <option value="ENABLED">Mobile Check-In Enabled</option>
            <option value="DISABLED">Mobile Check-In Disabled</option>
          </select>

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* TAB 1: EMPLOYEE MOBILE STATUS & ACCOUNT CONTROL */}
      {activeTab === 'DIRECTORY' && (
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white">
                Employee Mobile App Status & Account Control ({filteredUsers.length} records)
              </h2>
              <p className="text-xs text-slate-400">
                Send or resend download links, trigger password resets, revoke active mobile sessions, or suspend mobile access
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
              >
                <option value="ALL">All Roles</option>
                <option value={UserRole.ADMIN}>Admin</option>
                <option value={UserRole.HR}>HR</option>
                <option value={UserRole.MANAGER}>Manager</option>
                <option value={UserRole.EMPLOYEE}>Employee</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/70 text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                  <th className="py-3 px-4 w-10">
                    <button
                      type="button"
                      onClick={toggleSelectAllFiltered}
                      className="text-slate-400 hover:text-white"
                      title="Select all filtered"
                    >
                      {filteredUsers.length > 0 &&
                      filteredUsers.every((u) => selectedIds.includes(u.employeeId)) ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Department & Role</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4">Invitation Details</th>
                  <th className="py-3 px-4">Device & Last Login</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-xs">
                {filteredUsers.map((user) => {
                  const isSelected = selectedIds.includes(user.employeeId);
                  return (
                    <tr key={user.employeeId} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => toggleSelectUser(user.employeeId)}
                          className="text-slate-400 hover:text-white"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{user.fullName}</div>
                        <div className="text-[11px] text-slate-400">
                          {user.employeeId} · {user.designation}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-slate-200">{user.email}</div>
                        <div className="text-[11px] text-slate-400">{user.phone}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-slate-200">{user.department}</div>
                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {renderStatusBadge(user.accessStatus)}
                        <div className="text-[11px] text-slate-400 mt-1">
                          {user.isRegistered ? 'Registered on App' : 'Not Registered'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {user.invitationSent ? (
                          <div>
                            <span className="text-emerald-400 font-medium">
                              Sent ({user.invitationCount}x via {user.invitationChannel || 'Email'})
                            </span>
                            <div className="text-[11px] text-slate-400">{user.invitationSentAt}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400">No invitation sent</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {user.isRegistered ? (
                          <div>
                            <div className="text-slate-200 font-medium">
                              {user.deviceModel} ({user.osPlatform} · {user.appVersion})
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Last login: {user.lastLoginAt || 'N/A'} · {user.activeSessionsCount} active session(s)
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">No paired device</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => sendMobileAppInvitation(user.employeeId, 'Email')}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-medium transition"
                            title="Send or resend mobile app download & onboarding email"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            {user.invitationSent ? 'Resend Link' : 'Send App Link'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopyInviteLink(user)}
                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] transition"
                            title="Copy download link / Share via WhatsApp"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => sendMobilePasswordReset(user.employeeId)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-[11px] font-medium transition"
                            title="Send mobile app password reset email"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            Reset Password
                          </button>

                          {user.activeSessionsCount > 0 && (
                            <button
                              type="button"
                              onClick={() => revokeMobileSessions(user.employeeId)}
                              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[11px] transition"
                              title="Force logout / Revoke active mobile sessions"
                            >
                              <LogOut className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setHistoryUser(user)}
                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] transition"
                            title="View Mobile Login & Security History"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>

                          {user.employeeId !== 'EMP-1000' && (
                            <button
                              type="button"
                              onClick={() => {
                                if (user.accessStatus === 'SUSPENDED') {
                                  toggleMobileAccountSuspension(user.employeeId, false, 'Restored by Admin');
                                } else {
                                  setSuspendModalUser(user);
                                  setSuspendReason('');
                                }
                              }}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-medium border transition ${
                                user.accessStatus === 'SUSPENDED'
                                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                                  : 'bg-rose-500/15 text-rose-300 border-rose-500/30 hover:bg-rose-500/25'
                              }`}
                            >
                              {user.accessStatus === 'SUSPENDED' ? (
                                <>
                                  <Unlock className="w-3.5 h-3.5" />
                                  Restore
                                </>
                              ) : (
                                <>
                                  <Lock className="w-3.5 h-3.5" />
                                  Suspend
                                </>
                              )}
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
      )}

      {/* TAB 2: MOBILE CHECK-IN / CHECK-OUT PERMISSIONS (Requirement 8.4) */}
      {activeTab === 'ATTENDANCE_PERMISSIONS' && (
        <div className="space-y-5">
          {/* Bulk Role / Department Policy Bar */}
          <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Role & Department-Wide Mobile Attendance Policy
              </h3>
              <p className="text-xs text-slate-400">
                Apply mobile check-in, check-out, and mandatory GPS verification rules across an entire department or role
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={bulkDept}
                onChange={(e) => setBulkDept(e.target.value)}
                className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
              >
                <option value="ALL">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>

              <select
                value={bulkRole}
                onChange={(e) => setBulkRole(e.target.value)}
                className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
              >
                <option value="ALL">All Roles</option>
                <option value={UserRole.ADMIN}>Admin</option>
                <option value={UserRole.HR}>HR</option>
                <option value={UserRole.MANAGER}>Manager</option>
                <option value={UserRole.EMPLOYEE}>Employee</option>
              </select>

              <button
                type="button"
                onClick={() =>
                  updateBulkMobileAttendancePermissions(
                    {
                      department: bulkDept,
                      role: bulkRole === 'ALL' ? undefined : (bulkRole as UserRole),
                    },
                    {
                      allowMobileAttendance: true,
                      allowMobileCheckIn: true,
                      allowMobileCheckOut: true,
                      requireGpsForPunch: true,
                      captureCheckInLocation: true,
                    }
                  )
                }
                className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
              >
                Enable Mobile Check-In/Out + GPS
              </button>

              <button
                type="button"
                onClick={() =>
                  updateBulkMobileAttendancePermissions(
                    {
                      department: bulkDept,
                      role: bulkRole === 'ALL' ? undefined : (bulkRole as UserRole),
                    },
                    {
                      allowMobileAttendance: false,
                      allowMobileCheckIn: false,
                      allowMobileCheckOut: false,
                    }
                  )
                }
                className="px-3.5 py-2 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold transition"
              >
                Disable Mobile Punch for Scope
              </button>
            </div>
          </div>

          {/* Individual Employee Mobile Permission Table */}
          <div className="bg-[#0F172A] border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800">
              <h2 className="text-sm font-semibold text-white">
                Individual Employee Mobile Check-In / Check-Out & GPS Controls
              </h2>
              <p className="text-xs text-slate-400">
                When Mobile Check-In or Check-Out is disabled for an employee, the mobile app punch action is blocked and logged
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/70 text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Department & Role</th>
                    <th className="py-3 px-4 text-center">Mobile Attendance Master</th>
                    <th className="py-3 px-4 text-center">Allow Mobile Check-In</th>
                    <th className="py-3 px-4 text-center">Allow Mobile Check-Out</th>
                    <th className="py-3 px-4 text-center">Require GPS for Punch</th>
                    <th className="py-3 px-4 text-center">Capture Location Coordinates</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-xs">
                  {filteredUsers.map((user) => {
                    const p = user.attendancePermissions;
                    return (
                      <tr key={user.employeeId} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-white">{user.fullName}</div>
                          <div className="text-[11px] text-slate-400">
                            {user.employeeId} · {user.designation}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-slate-200">{user.department}</div>
                          <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                            {user.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              updateMobileAttendancePermissions(user.employeeId, {
                                allowMobileAttendance: !p.allowMobileAttendance,
                                allowMobileCheckIn: !p.allowMobileAttendance,
                                allowMobileCheckOut: !p.allowMobileAttendance,
                              })
                            }
                            className={`px-3 py-1 rounded-md text-xs font-semibold border transition ${
                              p.allowMobileAttendance
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {p.allowMobileAttendance ? 'Enabled' : 'Disabled'}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={p.allowMobileAttendance && p.allowMobileCheckIn}
                            onChange={(e) =>
                              updateMobileAttendancePermissions(user.employeeId, {
                                allowMobileAttendance: e.target.checked ? true : p.allowMobileAttendance,
                                allowMobileCheckIn: e.target.checked,
                              })
                            }
                            className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                          />
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={p.allowMobileAttendance && p.allowMobileCheckOut}
                            onChange={(e) =>
                              updateMobileAttendancePermissions(user.employeeId, {
                                allowMobileAttendance: e.target.checked ? true : p.allowMobileAttendance,
                                allowMobileCheckOut: e.target.checked,
                              })
                            }
                            className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                          />
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={p.requireGpsForPunch}
                            onChange={(e) =>
                              updateMobileAttendancePermissions(user.employeeId, {
                                requireGpsForPunch: e.target.checked,
                              })
                            }
                            className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                          />
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={p.captureCheckInLocation}
                            onChange={(e) =>
                              updateMobileAttendancePermissions(user.employeeId, {
                                captureCheckInLocation: e.target.checked,
                              })
                            }
                            className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                          />
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

      {/* TAB 3: MOBILE CHECK-IN / CHECK-OUT LOCATION TRACKING (Requirement 8.5) */}
      {activeTab === 'LOCATION_TRACKING' && (
        <div className="space-y-4">
          <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={locSearch}
                onChange={(e) => setLocSearch(e.target.value)}
                placeholder="Search employee name or ID..."
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-400"
              />
            </div>

            <select
              value={locDeptFilter}
              onChange={(e) => setLocDeptFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>

            <select
              value={locStatusFilter}
              onChange={(e) => setLocStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
            >
              <option value="ALL">All Location Statuses</option>
              <option value="CAPTURED">Location Captured</option>
              <option value="LOW_ACCURACY">Low Accuracy</option>
              <option value="PERMISSION_DENIED">Location Permission Denied</option>
              <option value="UNAVAILABLE">Location Unavailable</option>
            </select>

            <input
              type="date"
              value={locDateFilter}
              onChange={(e) => setLocDateFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
            />
          </div>

          <div className="bg-[#0F172A] border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">
                  Employee Check-In & Check-Out GPS Location Log ({filteredLocations.length} records)
                </h2>
                <p className="text-xs text-slate-400">
                  Real device/browser geolocation coordinates captured at punch time. Coordinates are never fabricated if permission is denied.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/70 text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Date & Punch Time</th>
                    <th className="py-3 px-4">Punch Type & Source</th>
                    <th className="py-3 px-4">Location Status</th>
                    <th className="py-3 px-4">Coordinates & Accuracy</th>
                    <th className="py-3 px-4">Location / Address Summary</th>
                    <th className="py-3 px-4 text-right">Map Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-xs">
                  {filteredLocations.map((loc) => (
                    <tr key={loc.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{loc.employeeName}</div>
                        <div className="text-[11px] text-slate-400">
                          {loc.employeeId} · {loc.department}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-slate-200 font-medium">{loc.date}</div>
                        <div className="text-[11px] text-slate-400">{loc.punchTime}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                            loc.punchType === 'CHECK_IN'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                          }`}
                        >
                          {loc.punchType === 'CHECK_IN' ? 'Check-In' : 'Check-Out'}
                        </span>
                        <div className="text-[11px] text-slate-400 mt-1">
                          {loc.source} {loc.deviceInfo ? `· ${loc.deviceInfo}` : ''}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {loc.locationStatus === 'CAPTURED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Location Captured
                          </span>
                        )}
                        {loc.locationStatus === 'LOW_ACCURACY' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Low Accuracy
                          </span>
                        )}
                        {loc.locationStatus === 'PERMISSION_DENIED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                            <XCircle className="w-3.5 h-3.5" />
                            Permission Denied
                          </span>
                        )}
                        {loc.locationStatus === 'UNAVAILABLE' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-500/15 text-slate-300 border border-slate-500/30">
                            Location Unavailable
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        {loc.latitude !== null && loc.longitude !== null ? (
                          <div>
                            <div className="text-slate-200">
                              {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
                            </div>
                            <div className="text-slate-400">
                              Accuracy: ±{loc.accuracyMeters ?? 0}m
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500">No coordinates recorded</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-slate-200">{loc.locationName}</div>
                        {loc.note && <div className="text-[11px] text-slate-400 mt-0.5">{loc.note}</div>}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {loc.latitude !== null && loc.longitude !== null ? (
                          <a
                            href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-[11px] font-medium transition"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                            View on Map
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-slate-500 text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: OFFICIAL APP STORE DOWNLOAD LINKS (Requirement 8.2) */}
      {activeTab === 'STORE_SETTINGS' && (
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-6 max-w-3xl space-y-5">
          <div>
            <h2 className="text-base font-bold text-white">
              Official Mobile App Store & Download Link Configuration
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Configure your organization’s verified Google Play Store, Apple App Store, or direct enterprise APK/IPA distribution links. These links are included when dispatching employee invitations.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Android Google Play Store URL
              </label>
              <input
                type="url"
                value={androidUrl}
                onChange={(e) => setAndroidUrl(e.target.value)}
                placeholder="https://play.google.com/store/apps/details?id=..."
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                iOS Apple App Store URL
              </label>
              <input
                type="url"
                value={iosUrl}
                onChange={(e) => setIosUrl(e.target.value)}
                placeholder="https://apps.apple.com/app/..."
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Direct Download / Onboarding Portal URL
              </label>
              <input
                type="url"
                value={landingUrl}
                onChange={(e) => setLandingUrl(e.target.value)}
                placeholder="https://portal.argoswatch.in/mobile-onboarding"
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                IT / HR Mobile Support Email
              </label>
              <input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
              />
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  updateMobileAppStoreConfig({
                    androidPlayStoreUrl: androidUrl.trim(),
                    iosAppStoreUrl: iosUrl.trim(),
                    directDownloadLandingUrl: landingUrl.trim(),
                    supportEmail: supportEmail.trim(),
                  })
                }
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
              >
                Save Official Store Links
              </button>
              <span className="text-[11px] text-slate-400">
                Last updated: {mobileAppStoreConfig.updatedAt} by {mobileAppStoreConfig.updatedBy}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Login & Security History */}
      {historyUser && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#0F172A] border border-slate-700 rounded-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Mobile Login & Security History — {historyUser.fullName}
                </h3>
                <p className="text-xs text-slate-400">
                  {historyUser.employeeId} · {historyUser.deviceModel} ({historyUser.osPlatform})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryUser(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {historyUser.loginHistory && historyUser.loginHistory.length > 0 ? (
                historyUser.loginHistory.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-white">{ev.action.replace(/_/g, ' ')}</div>
                      <div className="text-[11px] text-slate-400">
                        {ev.deviceModel} · {ev.osVersion} · App {ev.appVersion}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-slate-200">{ev.timestamp}</div>
                      <div className="text-[11px] text-slate-400">IP: {ev.ipAddress}</div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 py-6 text-center">
                  No mobile login events recorded for this employee yet.
                </p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setHistoryUser(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-xs font-semibold text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Suspend Mobile Account */}
      {suspendModalUser && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#0F172A] border border-slate-700 rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">
                Suspend Mobile App Access — {suspendModalUser.fullName}
              </h3>
              <button
                type="button"
                onClick={() => setSuspendModalUser(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-300">
              Suspending mobile app access will immediately terminate active mobile sessions and prevent mobile check-in/out for {suspendModalUser.fullName}. Their core employee profile and historical records remain intact.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Reason for Suspension
              </label>
              <input
                type="text"
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="e.g., Lost mobile device / Policy review"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSuspendModalUser(null)}
                className="px-3.5 py-2 rounded-lg bg-slate-800 text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  toggleMobileAccountSuspension(
                    suspendModalUser.employeeId,
                    true,
                    suspendReason || 'Suspended by Admin'
                  );
                  setSuspendModalUser(null);
                }}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white"
              >
                Confirm Suspend
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
