import React, { useState, useMemo } from 'react';
import {
  Award,
  AlertTriangle,
  Plus,
  Check,
  X,
  Edit3,
  Trash2,
  Search,
  ArrowUpDown,
  Filter,
  Clock,
  ShieldCheck,
  UserCheck,
  FileText,
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
} from '../ui/EnterpriseComponents';

export function ConsiderationsModule() {
  const {
    currentUser,
    currentEmployee,
    permissions,
    considerations,
    employees,
    submitConsideration,
    decideConsideration,
    updateConsideration,
    deleteConsideration,
  } = useHRMS();

  const isHRAdmin = currentUser.role === 'HR' || currentUser.role === 'ADMIN';
  const isManager = currentUser.role === 'MANAGER';
  const isEmployee = currentUser.role === 'EMPLOYEE';

  // Filter & Sort State
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterDept, setFilterDept] = useState<string>('ALL');
  const [viewScopeFilter, setViewScopeFilter] = useState<'ALL' | 'TEAM_ONLY' | 'MY_OWN'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'employeeName' | 'deductionAmountSaved'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [showModal, setShowModal] = useState(false);
  const [selectedCase, setSelectedCase] = useState<any | null>(null);

  // Assigned Team Members for Manager
  const assignedTeamEmployees = useMemo(() => {
    if (isHRAdmin) return employees;
    if (isManager) {
      return employees.filter(
        (e) => e.managerId === currentUser.employeeId || e.id === currentUser.employeeId
      );
    }
    return employees.filter((e) => e.id === currentUser.employeeId);
  }, [employees, isHRAdmin, isManager, currentUser.employeeId]);

  // Create / Submit Consideration Form State
  const [empId, setEmpId] = useState(currentUser.employeeId);
  const [incidentDate, setIncidentDate] = useState('2026-05-19');
  const [considerationType, setConsiderationType] = useState<
    | 'Late Arrival Waiver'
    | 'Missed Punch Correction'
    | 'Half Day Override'
    | 'Salary Deduction Waiver'
    | 'Other'
  >('Late Arrival Waiver');
  const [customType, setCustomType] = useState('');
  const [title, setTitle] = useState('');
  const [reason, setReason] = useState('');
  const [supportingNote, setSupportingNote] = useState('');
  const [forwardToHRImmediately, setForwardToHRImmediately] = useState(true);

  // Two-Stage Review & Decision Modal State (Manager Stage 1 & HR Stage 2)
  const [reviewingCase, setReviewingCase] = useState<any | null>(null);
  const [reviewAction, setReviewAction] = useState<'Approved' | 'Rejected'>('Approved');
  const [reviewNote, setReviewNote] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [waiveAttendancePenalty, setWaiveAttendancePenalty] = useState(true);
  const [waiveSalaryDeduction, setWaiveSalaryDeduction] = useState(true);

  // Edit Form State (HR/Admin Only)
  const [editingCase, setEditingCase] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState<string>('PENDING_MANAGER');

  // Delete Confirmation State (HR/Admin Only)
  const [deletingCase, setDeletingCase] = useState<any | null>(null);

  const departments = useMemo<string[]>(() => {
    const set = new Set<string>(employees.map((e) => e.department));
    return ['ALL', ...Array.from(set)];
  }, [employees]);

  const scopedCases = useMemo(() => {
    let base = considerations as any[];
    if (isEmployee) {
      base = base.filter((c) => c.employeeId === currentUser.employeeId);
    } else if (isManager) {
      // Strict Team-Based Access Security: only assigned team members or self
      base = base.filter(
        (c) => c.managerId === currentUser.employeeId || c.employeeId === currentUser.employeeId
      );
      if (viewScopeFilter === 'TEAM_ONLY') {
        base = base.filter(
          (c) => c.managerId === currentUser.employeeId && c.employeeId !== currentUser.employeeId
        );
      } else if (viewScopeFilter === 'MY_OWN') {
        base = base.filter((c) => c.employeeId === currentUser.employeeId);
      }
    }

    const filtered = base.filter((c) => {
      const matchType =
        filterType === 'ALL' ||
        c.type === filterType ||
        c.category === filterType;
      const matchStatus = filterStatus === 'ALL' || c.status === filterStatus;
      const matchDept = filterDept === 'ALL' || c.department === filterDept;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (c.employeeName || '').toLowerCase().includes(q) ||
        (c.title || '').toLowerCase().includes(q) ||
        (c.type || '').toLowerCase().includes(q) ||
        (c.reason || c.description || '').toLowerCase().includes(q) ||
        (c.supportingNote || '').toLowerCase().includes(q);
      return matchType && matchStatus && matchDept && matchSearch;
    });

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = (a.date || '').localeCompare(b.date || '');
      } else if (sortBy === 'employeeName') {
        comparison = (a.employeeName || '').localeCompare(b.employeeName || '');
      } else if (sortBy === 'deductionAmountSaved') {
        comparison = (a.deductionAmountSaved || 0) - (b.deductionAmountSaved || 0);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [
    considerations,
    isEmployee,
    isManager,
    currentUser.employeeId,
    viewScopeFilter,
    filterType,
    filterStatus,
    filterDept,
    searchQuery,
    sortBy,
    sortOrder,
  ]);

  const openSubmitModal = () => {
    if (isEmployee) {
      setEmpId(currentUser.employeeId);
    } else if (isManager) {
      const firstTeamMember = assignedTeamEmployees.find((e) => e.id !== currentUser.employeeId);
      setEmpId(firstTeamMember ? firstTeamMember.id : currentUser.employeeId);
    } else {
      setEmpId(employees[0]?.id || currentUser.employeeId);
    }
    setIncidentDate('2026-05-19');
    setConsiderationType('Late Arrival Waiver');
    setCustomType('');
    setTitle('');
    setReason('');
    setSupportingNote('');
    setForwardToHRImmediately(true);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmpId = isEmployee ? currentUser.employeeId : empId;
    if (!reason.trim()) return;
    if (considerationType === 'Other' && !customType.trim()) return;

    const isSubmittingOnBehalf =
      isManager && targetEmpId !== currentUser.employeeId;
    const effectiveType =
      considerationType === 'Other' ? customType.trim() : considerationType;

    submitConsideration({
      employeeId: targetEmpId,
      date: incidentDate,
      type: considerationType,
      customType: considerationType === 'Other' ? customType.trim() : undefined,
      title:
        title.trim() ||
        `${effectiveType} — ${
          employees.find((emp) => emp.id === targetEmpId)?.fullName || targetEmpId
        }`,
      category: considerationType,
      reason: reason.trim(),
      supportingNote: supportingNote.trim() || undefined,
      supportingDocument: isSubmittingOnBehalf
        ? 'Manager_OnBehalf_Attestation.pdf'
        : 'Employee_Attendance_Attestation.pdf',
      forwardToHRImmediately: isSubmittingOnBehalf ? forwardToHRImmediately : false,
    });

    setShowModal(false);
    setTitle('');
    setCustomType('');
    setReason('');
    setSupportingNote('');
  };

  const canActOnConsideration = (c: any) => {
    if (c.status === 'APPROVED' || c.status === 'REJECTED') return false;
    // Stage 1: Manager can review requests for their assigned team when PENDING_MANAGER
    if (isManager) {
      return (
        c.managerId === currentUser.employeeId &&
        c.employeeId !== currentUser.employeeId &&
        c.status === 'PENDING_MANAGER'
      );
    }
    // Stage 2: HR / Admin can finalize requests at PENDING_HR (or override PENDING_MANAGER)
    if (isHRAdmin) return true;
    return false;
  };

  const openReviewModal = (c: any, action: 'Approved' | 'Rejected') => {
    setReviewingCase(c);
    setReviewAction(action);
    setReviewNote('');
    setReviewError('');
    setWaiveAttendancePenalty(true);
    setWaiveSalaryDeduction(true);
  };

  const handleConfirmReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingCase) return;
    if (reviewAction === 'Rejected' && !reviewNote.trim()) {
      setReviewError('A rejection reason is required and will be recorded in the request timeline.');
      return;
    }
    decideConsideration(
      reviewingCase.id,
      reviewAction,
      reviewNote.trim() ||
        (reviewAction === 'Approved'
          ? isManager
            ? `Approved by Manager (${currentEmployee.fullName}) and forwarded to HR for final review.`
            : `Final HR approval granted by ${currentEmployee.fullName}.`
          : ''),
      isHRAdmin
        ? {
            affectsAttendancePenalty: waiveAttendancePenalty,
            affectsSalaryDeduction: waiveSalaryDeduction,
          }
        : undefined
    );
    setReviewingCase(null);
    setReviewNote('');
    setReviewError('');
  };

  const openEditCase = (c: any) => {
    if (!isHRAdmin) return;
    setEditingCase(c);
    setEditTitle(c.title || '');
    setEditDescription(c.reason || c.description || '');
    setEditStatus(c.status);
  };

  const handleSaveEditCase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCase || !isHRAdmin) return;
    updateConsideration(editingCase.id, {
      title: editTitle,
      description: editDescription,
      reason: editDescription,
      status: editStatus,
    });
    setEditingCase(null);
  };

  const canModifyCase = () => isHRAdmin;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1480px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#CBCBCB]">
        <div>
          <span className="px-2.5 py-0.5 rounded-md bg-[#4E1617]/10 border border-[#4E1617]/30 text-[#4E1617] text-[10px] font-bold uppercase tracking-wider">
            Two-Stage Attendance & Penalty Consideration Workflow
          </span>
          <h1 className="text-xl font-bold text-[#141A17] tracking-tight mt-1.5">
            {isManager
              ? 'Team & Personal Consideration Requests'
              : isEmployee
              ? 'My Attendance Consideration Requests'
              : 'Employee Considerations & Waiver Ledger'}
          </h1>
          <p className="text-xs text-[#525854] mt-0.5">
            {isManager
              ? 'Submit considerations for yourself or on behalf of assigned team members • Stage 1: Manager Review → Stage 2: HR Final Review'
              : 'Employee or Manager submits Consideration → Manager Review → HR Final Review → Final Status'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <ExportDropdown
            data={scopedCases}
            filename="argos_employee_considerations"
            title="Argos Watch — Employee Considerations Ledger"
          />
          <button
            onClick={openSubmitModal}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#164C38] hover:bg-[#0F3627] text-[#F2F2F2] text-xs font-semibold rounded-xl transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {isManager
              ? 'Submit Consideration (Self / Team)'
              : isEmployee
              ? 'Submit Consideration Request'
              : 'Log Consideration Request'}
          </button>
        </div>
      </div>

      {/* Filter & Sort Controls — Vertically Stacked on Mobile */}
      <div className="bg-white border border-[#CBCBCB] rounded-xl p-4 space-y-3.5 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 bg-[#F2F2F2] p-1.5 rounded-xl w-full lg:w-auto">
            {(
              [
                'ALL',
                'Late Arrival Waiver',
                'Missed Punch Correction',
                'Half Day Override',
                'Salary Deduction Waiver',
              ] as const
            ).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`w-full sm:w-auto px-3 py-2 sm:py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-between sm:justify-center ${
                  filterType === t
                    ? 'bg-white text-[#141A17] shadow-2xs'
                    : 'text-[#525854] hover:text-[#141A17]'
                }`}
              >
                <span>{t === 'ALL' ? 'All Types' : t}</span>
                {filterType === t && (
                  <span className="w-2 h-2 rounded-full bg-[#164C38] sm:hidden" />
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
              placeholder="Search employee, reason, supporting note..."
              className="w-full pl-8 pr-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-xl text-xs text-[#141A17] placeholder:text-[#525854] focus:outline-none focus:border-[#4E1617]"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-2.5 pt-2.5 border-t border-[#F2F2F2]">
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#525854] mr-1">
              <Filter className="w-3 h-3" /> Filters:
            </span>

            {isManager && (
              <select
                value={viewScopeFilter}
                onChange={(e) => setViewScopeFilter(e.target.value as any)}
                className="w-full sm:w-auto px-3 py-2 bg-[#164C38]/10 border border-[#164C38]/30 rounded-xl text-xs text-[#164C38] font-bold"
              >
                <option value="ALL">All (Assigned Team & My Requests)</option>
                <option value="TEAM_ONLY">Assigned Team Members Only</option>
                <option value="MY_OWN">My Personal Requests Only</option>
              </select>
            )}

            {isHRAdmin && (
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-xl text-xs text-[#141A17] font-medium"
              >
                {departments.map((d: string) => (
                  <option key={d} value={d}>
                    {d === 'ALL' ? 'All Departments' : d}
                  </option>
                ))}
              </select>
            )}

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-xl text-xs text-[#141A17] font-medium"
            >
              <option value="ALL">All Approval Stages</option>
              <option value="PENDING_MANAGER">Stage 1: Pending Manager Review</option>
              <option value="PENDING_HR">Stage 2: Pending HR Final Review</option>
              <option value="APPROVED">Final Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#525854] shrink-0">
              <ArrowUpDown className="w-3 h-3" /> Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="flex-1 sm:flex-initial px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-xl text-xs text-[#141A17] font-semibold"
            >
              <option value="date">Incident Date</option>
              <option value="employeeName">Employee Name</option>
              <option value="deductionAmountSaved">Deduction Impact (₹)</option>
            </select>
            <button
              onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              className="px-3 py-2 bg-[#F2F2F2] hover:bg-[#CBCBCB] text-[#141A17] rounded-xl text-xs font-mono font-bold transition-colors shrink-0"
            >
              {sortOrder === 'asc' ? 'ASC ↑' : 'DESC ↓'}
            </button>
          </div>
        </div>
      </div>

      {/* Cases List — Clean Apple-Minimalist Scannable Cards */}
      <div className="grid grid-cols-1 gap-3">
        {scopedCases.map((c: any) => {
          const submittedOnBehalfByManager =
            c.submittedByRole === 'Manager' && c.submittedById !== c.employeeId;

          return (
            <div
              key={c.id}
              onClick={() => setSelectedCase(c)}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 rounded-2xl p-5 transition-all shadow-2xs cursor-pointer group"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <AvatarInitials name={c.employeeName} size="md" />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-black dark:group-hover:text-white transition-colors">
                        {c.employeeName}
                      </span>
                      <span className="text-[11px] font-mono text-neutral-500">
                        {c.employeeId}
                      </span>
                      {submittedOnBehalfByManager && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[10px] font-semibold">
                          Submitted by Manager on behalf of Employee ({c.submittedByName})
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-neutral-500 mt-0.5">
                      {c.department} · Incident: <span className="font-mono text-neutral-700 dark:text-neutral-300 font-medium">{c.date}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    {c.customType ? `${c.customType} (Other)` : c.type}
                  </span>
                  <StatusBadge status={c.status} />
                  {c.deductionAmountSaved > 0 && (
                    <span className="text-xs font-mono font-semibold text-neutral-600 dark:text-neutral-400">
                      ₹{c.deductionAmountSaved.toLocaleString('en-IN')}
                    </span>
                  )}
                  {canModifyCase() && (
                    <div onClick={(e) => e.stopPropagation()}>
                      <ActionMenu
                        items={[
                          {
                            label: 'Edit Consideration Record',
                            icon: <Edit3 className="w-3.5 h-3.5" />,
                            onClick: () => openEditCase(c),
                          },
                          {
                            label: 'Delete Case',
                            icon: <Trash2 className="w-3.5 h-3.5" />,
                            variant: 'danger',
                            onClick: () => setDeletingCase(c),
                          },
                        ]}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Short Excerpt */}
              <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500">
                <p className="line-clamp-1 flex-1 pr-4">
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">{c.title || c.type}: </span>
                  {c.reason || c.description}
                </p>
                <span className="shrink-0 font-medium text-neutral-900 dark:text-neutral-100 group-hover:translate-x-0.5 transition-transform">
                  View details →
                </span>
              </div>
            </div>
          );
        })}

        {scopedCases.length === 0 && (
          <div className="py-12 text-center bg-white border border-[#CBCBCB] rounded-xl text-xs text-[#525854]">
            No consideration requests found matching your current filter criteria.
          </div>
        )}
      </div>

      {/* Submit Consideration Request Modal (Employee Self OR Manager on Behalf of Team) */}
      <ModalShell
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={
          isManager
            ? 'Submit Consideration Request (Self or Assigned Team)'
            : isEmployee
            ? 'Submit Attendance Consideration Request'
            : 'Log Employee Consideration Request'
        }
        subtitle="Two-Stage Workflow: Employee/Manager Submission → Manager Review → HR Final Review"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#141A17] mb-1">
                Target Employee
              </label>
              {isEmployee ? (
                <input
                  type="text"
                  disabled
                  value={`${currentEmployee.fullName} (${currentEmployee.id})`}
                  className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs text-[#525854] font-semibold"
                />
              ) : (
                <select
                  value={empId}
                  onChange={(e) => setEmpId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs text-[#141A17] font-medium"
                >
                  {assignedTeamEmployees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.fullName} ({e.id}) — {e.id === currentUser.employeeId ? 'Myself' : e.designation}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#141A17] mb-1">
                Attendance / Incident Date
              </label>
              <input
                type="date"
                required
                value={incidentDate}
                onChange={(e) => setIncidentDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs font-mono text-[#141A17]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#141A17] mb-1">
                Consideration Category / Type
              </label>
              <select
                value={considerationType}
                onChange={(e) => setConsiderationType(e.target.value as any)}
                className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs text-[#141A17] font-medium"
              >
                <option value="Late Arrival Waiver">Late Arrival Waiver</option>
                <option value="Missed Punch Correction">Missed Punch Correction</option>
                <option value="Half Day Override">Half Day Override</option>
                <option value="Salary Deduction Waiver">Salary Deduction Waiver</option>
                <option value="Other">Other (Custom Request)</option>
              </select>
            </div>

          {considerationType === 'Other' && (
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#141A17] mb-1">
                Custom Consideration Type <span className="text-[#ba1a1a]">*</span>
              </label>
              <input
                type="text"
                required
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                placeholder="Enter custom consideration type (e.g. Remote Client Visit, Transit Disruption, Medical Emergency)..."
                className="w-full px-3 py-2 bg-white border border-[#0051d5] rounded-lg text-xs text-[#141A17] focus:outline-none ring-1 ring-[#0051d5]"
              />
            </div>
          )}
            <div>
              <label className="block text-xs font-semibold text-[#141A17] mb-1">
                Request Headline (Optional)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Client Boutique Transit Delay Waiver"
                className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs text-[#141A17]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#141A17] mb-1">
              Reason for Consideration Request <span className="text-[#4E1617]">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide the detailed reason for requesting attendance or deduction consideration..."
              className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs text-[#141A17]"
            />
          </div>

          {/* Manager Supporting Note when submitting on behalf of an assigned team member */}
          {isManager && empId !== currentUser.employeeId && (
            <div className="p-3.5 rounded-xl bg-[#164C38]/5 border border-[#164C38]/30 space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#164C38] mb-1">
                  Manager Supporting Note (On Behalf of Team Member) <span className="text-[#4E1617]">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={supportingNote}
                  onChange={(e) => setSupportingNote(e.target.value)}
                  placeholder="Provide your managerial endorsement and supporting context for HR Final Review..."
                  className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg text-xs text-[#141A17]"
                />
              </div>

              <label className="flex items-start gap-2 text-xs text-[#141A17] cursor-pointer">
                <input
                  type="checkbox"
                  checked={forwardToHRImmediately}
                  onChange={(e) => setForwardToHRImmediately(e.target.checked)}
                  className="mt-0.5 rounded border-[#CBCBCB] text-[#164C38]"
                />
                <span>
                  <span className="font-semibold">Include Manager Stage 1 Endorsement immediately</span> — Forward directly to <span className="font-mono font-bold text-[#164C38]">PENDING_HR</span> so HR can finalize attendance penalty and salary deduction impact (never bypasses HR).
                </span>
              </label>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#CBCBCB]">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-3.5 py-2 text-xs font-semibold text-[#525854]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#164C38] hover:bg-[#0F3627] text-[#F2F2F2] text-xs font-semibold rounded-lg cursor-pointer"
            >
              Submit Consideration Request
            </button>
          </div>
        </form>
      </ModalShell>

      {/* Two-Stage Review & Decision Modal (Manager Stage 1 / HR Final Stage 2) */}
      <ModalShell
        isOpen={!!reviewingCase}
        onClose={() => setReviewingCase(null)}
        title={
          reviewAction === 'Approved'
            ? isManager
              ? 'Manager Review — Approve & Forward to HR'
              : 'HR Final Review — Approve Consideration'
            : 'Reject Consideration Request'
        }
        subtitle={
          reviewingCase
            ? `${reviewingCase.employeeName} (${reviewingCase.employeeId}) • ${reviewingCase.type} on ${reviewingCase.date}`
            : ''
        }
      >
        {reviewingCase && (
          <form onSubmit={handleConfirmReview} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB] space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#141A17]">{reviewingCase.type}</span>
                <span className="font-mono font-bold text-[#4E1617]">
                  Potential Waiver: ₹{(reviewingCase.deductionAmountSaved || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <p className="text-[#525854]">
                <span className="font-semibold text-[#141A17]">Reason: </span>
                {reviewingCase.reason || reviewingCase.description}
              </p>
              {reviewingCase.supportingNote && (
                <p className="text-[#164C38]">
                  <span className="font-semibold">Manager Supporting Note: </span>
                  {reviewingCase.supportingNote}
                </p>
              )}
            </div>

            {/* HR Final Review Options: Decide whether it affects attendance penalties or salary deductions */}
            {isHRAdmin && reviewAction === 'Approved' && (
              <div className="p-4 rounded-xl bg-[#164C38]/5 border border-[#164C38]/30 space-y-3">
                <div className="text-xs font-bold text-[#164C38] uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> HR Final Authority — Penalty & Payroll Impact
                </div>

                <label className="flex items-start gap-2.5 text-xs text-[#141A17] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={waiveAttendancePenalty}
                    onChange={(e) => setWaiveAttendancePenalty(e.target.checked)}
                    className="mt-0.5 rounded border-[#CBCBCB] text-[#164C38]"
                  />
                  <div>
                    <span className="font-bold block">Waive Attendance Penalty</span>
                    <span className="text-[11px] text-[#525854]">
                      Updates attendance status for {reviewingCase.date} to Present and resets late arrival minutes to 0.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 text-xs text-[#141A17] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={waiveSalaryDeduction}
                    onChange={(e) => setWaiveSalaryDeduction(e.target.checked)}
                    className="mt-0.5 rounded border-[#CBCBCB] text-[#164C38]"
                  />
                  <div>
                    <span className="font-bold block">
                      Waive Salary Deduction (₹{(reviewingCase.deductionAmountSaved || 0).toLocaleString('en-IN')})
                    </span>
                    <span className="text-[11px] text-[#525854]">
                      Refunds/credits the deduction amount back into the employee’s monthly net salary calculation.
                    </span>
                  </div>
                </label>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#141A17] mb-1">
                {reviewAction === 'Rejected' ? (
                  <>
                    Rejection Reason <span className="text-[#4E1617]">* (Required)</span>
                  </>
                ) : (
                  'Reviewer Decision Note (Recorded in Timeline)'
                )}
              </label>
              <textarea
                rows={3}
                required={reviewAction === 'Rejected'}
                value={reviewNote}
                onChange={(e) => {
                  setReviewNote(e.target.value);
                  if (reviewError) setReviewError('');
                }}
                placeholder={
                  reviewAction === 'Rejected'
                    ? 'State the reason for rejecting this consideration request...'
                    : isManager
                    ? 'Optional manager review note before forwarding to HR...'
                    : 'Optional HR final review note...'
                }
                className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs text-[#141A17]"
              />
              {reviewError && (
                <p className="text-[11px] text-[#4E1617] font-semibold mt-1">{reviewError}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#CBCBCB]">
              <button
                type="button"
                onClick={() => setReviewingCase(null)}
                className="px-3.5 py-2 text-xs font-semibold text-[#525854]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-4 py-2 text-white text-xs font-semibold rounded-lg cursor-pointer ${
                  reviewAction === 'Approved'
                    ? 'bg-[#164C38] hover:bg-[#0F3627]'
                    : 'bg-[#4E1617] hover:bg-[#360F10]'
                }`}
              >
                {reviewAction === 'Approved'
                  ? isManager
                    ? 'Confirm Manager Approval & Send to HR'
                    : 'Confirm Final HR Approval'
                  : 'Confirm Rejection'}
              </button>
            </div>
          </form>
        )}
      </ModalShell>

      {/* Edit Consideration Modal (HR/Admin Only) */}
      <ModalShell
        isOpen={!!editingCase}
        onClose={() => setEditingCase(null)}
        title="Edit Consideration Record"
        subtitle={editingCase ? `${editingCase.employeeName} • ${editingCase.department}` : ''}
      >
        <form onSubmit={handleSaveEditCase} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#141A17] mb-1">
              Case Headline
            </label>
            <input
              type="text"
              required
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#141A17] mb-1">
              Reason / Observation
            </label>
            <textarea
              rows={3}
              required
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#CBCBCB]">
            <button
              type="button"
              onClick={() => setEditingCase(null)}
              className="px-3.5 py-2 text-xs font-semibold text-[#525854]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#164C38] hover:bg-[#0F3627] text-[#F2F2F2] text-xs font-semibold rounded-lg"
            >
              Save Changes
            </button>
          </div>
        </form>
      </ModalShell>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingCase}
        onClose={() => setDeletingCase(null)}
        onConfirm={() => {
          if (deletingCase) deleteConsideration(deletingCase.id);
        }}
        title="Delete Consideration Record?"
        message={
          deletingCase
            ? `Are you sure you want to permanently delete "${deletingCase.title}" for ${deletingCase.employeeName}?`
            : ''
        }
        confirmLabel="Delete Case"
      />

      {/* Dedicated Consideration Case Detail Drawer */}
      <SlideOverDrawer
        open={!!selectedCase}
        onClose={() => setSelectedCase(null)}
        title="Consideration Request Details"
        subtitle={selectedCase ? `${selectedCase.employeeName} · ${selectedCase.customType ? `${selectedCase.customType} (Other)` : selectedCase.type}` : undefined}
      >
        {selectedCase && (
          <div className="space-y-6">
            {/* Identity Card */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60">
              <div className="flex items-center gap-3">
                <AvatarInitials name={selectedCase.employeeName} size="md" />
                <div>
                  <div className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                    {selectedCase.employeeName}
                  </div>
                  <div className="text-xs text-neutral-500 font-mono">
                    {selectedCase.employeeId} · {selectedCase.department}
                  </div>
                </div>
              </div>
              <StatusBadge status={selectedCase.status} />
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700/60">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block">
                  Incident Date
                </span>
                <span className="text-base font-mono font-bold text-neutral-900 dark:text-neutral-100 mt-1 block">
                  {selectedCase.date}
                </span>
                <span className="text-[11px] text-neutral-500 mt-0.5 block">
                  Logged {selectedCase.submittedAt || selectedCase.date}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700/60">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block">
                  Deduction Impact
                </span>
                <span className="text-base font-mono font-bold text-neutral-900 dark:text-neutral-100 mt-1 block">
                  ₹{(selectedCase.deductionAmountSaved || 0).toLocaleString('en-IN')}
                </span>
                <span className="text-[11px] text-neutral-500 mt-0.5 block">
                  Salary at stake
                </span>
              </div>
            </div>

            {/* Case Reason & Explanation */}
            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-neutral-500 border-b border-neutral-100 dark:border-neutral-800 pb-2">
                Case Statement & Reason
              </div>
              <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {selectedCase.title || `${selectedCase.type} — ${selectedCase.employeeName}`}
              </div>
              <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">
                {selectedCase.reason || selectedCase.description}
              </p>
              {selectedCase.supportingNote && (
                <div className="mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800 text-xs text-neutral-600 dark:text-neutral-400">
                  <span className="font-semibold block text-[11px] text-neutral-500 mb-0.5">Manager Supporting Note:</span>
                  {selectedCase.supportingNote}
                </div>
              )}
            </div>

            {/* Multi-Stage Decision History Timeline */}
            {Array.isArray(selectedCase.approvalHistory) && selectedCase.approvalHistory.length > 0 && (
              <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-neutral-500 border-b border-neutral-100 dark:border-neutral-800 pb-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Two-Stage Approval Timeline
                </div>
                <div className="space-y-2.5">
                  {selectedCase.approvalHistory.map((step: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700/60 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {step.stage === 'SUBMITTED'
                            ? 'Stage 1: Request Submitted'
                            : step.stage === 'MANAGER_REVIEW'
                            ? 'Stage 1: Reporting Manager Review'
                            : 'Stage 2: HR Final Review'}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200">
                          {step.action}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-500">
                        {step.actorName} ({step.actorRole}) · <span className="font-mono">{step.timestamp}</span>
                      </div>
                      {step.note && (
                        <div className="text-neutral-700 dark:text-neutral-300 italic pt-1 border-t border-neutral-200/50 dark:border-neutral-700/50">
                          “{step.note}”
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rejection / Impact notes */}
            {selectedCase.status === 'REJECTED' && (selectedCase.rejectionReason || selectedCase.decisionNote) && (
              <div className="p-3.5 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 text-xs text-red-700 dark:text-red-300 space-y-1">
                <span className="font-bold block">Rejection Reason:</span>
                <p>{selectedCase.rejectionReason || selectedCase.decisionNote}</p>
              </div>
            )}

            {/* Stage Decision Actions for Authorized Reviewer */}
            {canActOnConsideration(selectedCase) && (
              <div className="space-y-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Review & Decision ({isManager ? 'Reporting Manager' : 'HR Final Authority'})
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const c = selectedCase;
                      setSelectedCase(null);
                      openReviewModal(c, 'Approved');
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 text-xs font-bold transition-colors cursor-pointer"
                  >
                    {isManager ? 'Approve & Forward to HR' : 'Approve Consideration'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const c = selectedCase;
                      setSelectedCase(null);
                      openReviewModal(c, 'Rejected');
                    }}
                    className="py-2.5 px-4 rounded-xl border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Reject
                  </button>
                </div>
              </div>
            )}

            {/* Admin / HR edit & delete options */}
            {canModifyCase() && (
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const c = selectedCase;
                    setSelectedCase(null);
                    openEditCase(c);
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-bold text-neutral-900 dark:text-neutral-100 transition-colors cursor-pointer"
                >
                  Edit Record
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const c = selectedCase;
                    setSelectedCase(null);
                    setDeletingCase(c);
                  }}
                  className="py-2.5 px-4 rounded-xl border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs font-bold transition-colors cursor-pointer"
                >
                  Delete
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setSelectedCase(null)}
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

