import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Clock,
  Check,
  X,
  FileText,
  Award,
  Calendar,
  AlertTriangle,
  User,
  ChevronRight,
  Shield,
  Filter,
} from 'lucide-react';
import { useHRMS } from '../../context/HRMSContext';
import {
  StatusBadge,
  AvatarInitials,
  ModalShell,
  KPICard,
  SegmentedControl,
  SearchInput,
  SlideOverDrawer,
} from '../ui/EnterpriseComponents';
import { LeaveRequest, ConsiderationRequest, UserRole } from '../../types/hrms';

type FilterStatusTab = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL';
type RequestTypeFilter = 'ALL' | 'LEAVE' | 'CONSIDERATION';

interface UnifiedApprovalItem {
  id: string;
  sourceType: 'LEAVE' | 'CONSIDERATION';
  employeeId: string;
  employeeName: string;
  department: string;
  title: string;
  subtitle: string;
  submissionDate: string;
  details: string;
  status: string;
  statusCategory: 'PENDING' | 'APPROVED' | 'REJECTED';
  rawLeave?: LeaveRequest;
  rawConsideration?: ConsiderationRequest;
  timeline: Array<{
    stage: string;
    actorName: string;
    action: string;
    note?: string;
    timestamp: string;
  }>;
}

export const ApprovalRequestsModule: React.FC = () => {
  const {
    currentEmployee,
    currentRole,
    allEmployees,
    scopedLeaves,
    scopedConsiderations,
    approveLeave,
    rejectLeave,
    approveConsideration,
    rejectConsideration,
    submitConsideration,
    addToast,
    t,
  } = useHRMS();

  const [activeTab, setActiveTab] = useState<FilterStatusTab>('PENDING');
  const [typeFilter, setTypeFilter] = useState<RequestTypeFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // New Consideration Request Modal
  const [showNewConsModal, setShowNewConsModal] = useState(false);
  const [consEmpId, setConsEmpId] = useState(currentEmployee.id);
  const [consDate, setConsDate] = useState('2026-10-06');
  const [consType, setConsType] = useState<
    | 'Late Arrival Waiver'
    | 'Missed Punch Regularization'
    | 'Half-Day Waiver'
    | 'Salary Deduction Waiver'
    | 'Work From Home'
    | 'Client Visit'
  >('Late Arrival Waiver');
  const [consTitle, setConsTitle] = useState('');
  const [consReason, setConsReason] = useState('');
  const [consNote, setConsNote] = useState('');

  // Selected item for Dedicated SlideOverDrawer
  const [detailItem, setDetailItem] = useState<UnifiedApprovalItem | null>(null);

  // Rejection modal
  const [rejectingItem, setRejectingItem] = useState<UnifiedApprovalItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Approval confirm modal
  const [approvingItem, setApprovingItem] = useState<UnifiedApprovalItem | null>(null);
  const [approvalNote, setApprovalNote] = useState('');

  const isManager = currentRole === UserRole.MANAGER;
  const isHRAdmin = currentRole === UserRole.ADMIN || currentRole === UserRole.HR;

  // Build Unified Approval Requests list from scoped leaves and considerations
  const unifiedRequests = useMemo<UnifiedApprovalItem[]>(() => {
    const list: UnifiedApprovalItem[] = [];

    // 1. Leave Requests
    scopedLeaves.forEach((lv) => {
      if (isManager && lv.employeeId === currentEmployee.id) {
        return;
      }

      let category: 'PENDING' | 'APPROVED' | 'REJECTED' = 'PENDING';
      if (lv.status === 'APPROVED' || lv.status === 'Approved') category = 'APPROVED';
      else if (lv.status === 'REJECTED' || lv.status === 'Rejected') category = 'REJECTED';

      const timeline: UnifiedApprovalItem['timeline'] = (lv.approvalHistory || []).map((h) => ({
        stage: h.stage,
        actorName: h.actorName,
        action: h.action,
        note: h.note,
        timestamp: h.timestamp,
      }));

      if (timeline.length === 0) {
        timeline.push({
          stage: 'SUBMITTED',
          actorName: lv.employeeName,
          action: 'SUBMITTED',
          note: lv.reason,
          timestamp: lv.appliedOn || lv.startDate,
        });
        if (lv.managerApprovedBy) {
          timeline.push({
            stage: 'MANAGER_REVIEW',
            actorName: lv.managerApprovedBy,
            action: 'APPROVED',
            note: lv.managerDecisionNote || 'Concurred and forwarded to HR',
            timestamp: lv.managerApprovedAt || 'Recorded',
          });
        }
        if (lv.status === 'APPROVED') {
          timeline.push({
            stage: 'HR_FINAL_REVIEW',
            actorName: lv.hrApprovedBy || 'HR Admin',
            action: 'APPROVED',
            note: lv.hrDecisionNote || 'Final approval granted and leave balance deducted',
            timestamp: lv.hrApprovedAt || 'Recorded',
          });
        } else if (lv.status === 'REJECTED') {
          timeline.push({
            stage: 'REVIEW_DECISION',
            actorName: lv.rejectedBy || 'Approver',
            action: 'REJECTED',
            note: lv.decisionNote || lv.rejectionReason || 'Rejected with recorded reason',
            timestamp: lv.rejectedAt || 'Recorded',
          });
        }
      }

      list.push({
        id: lv.id,
        sourceType: 'LEAVE',
        employeeId: lv.employeeId,
        employeeName: lv.employeeName,
        department: lv.department,
        title: `${lv.leaveType} (${lv.days} ${lv.days === 1 ? 'day' : 'days'})`,
        subtitle: `${lv.startDate} → ${lv.endDate}`,
        submissionDate: lv.appliedOn || lv.startDate,
        details: lv.reason,
        status: lv.status,
        statusCategory: category,
        rawLeave: lv,
        timeline,
      });
    });

    // 2. Considerations
    scopedConsiderations.forEach((cs) => {
      if (isManager && cs.employeeId === currentEmployee.id && cs.origin !== 'MANAGER_ON_BEHALF') {
        return;
      }

      let category: 'PENDING' | 'APPROVED' | 'REJECTED' = 'PENDING';
      const st = cs.status?.toUpperCase() || 'PENDING';
      if (st.includes('APPROV')) category = 'APPROVED';
      else if (st.includes('REJECT')) category = 'REJECTED';

      const timeline: UnifiedApprovalItem['timeline'] = ((cs as any).approvalTimeline || []).map((h: any) => ({
        stage: h.stage,
        actorName: h.actorName,
        action: h.action,
        note: h.note,
        timestamp: h.timestamp,
      }));

      if (timeline.length === 0) {
        timeline.push({
          stage: 'SUBMITTED',
          actorName: cs.submittedByName || cs.employeeName,
          action: 'SUBMITTED',
          note: cs.reason,
          timestamp: cs.date,
        });
        if (category === 'APPROVED') {
          timeline.push({
            stage: 'FINAL_DECISION',
            actorName: cs.decidedBy || 'Reviewer',
            action: 'APPROVED',
            note: cs.decisionNote || 'Waiver granted and attendance penalty regularized',
            timestamp: (cs as any).decidedAt || 'Recorded',
          });
        }
      }

      list.push({
        id: cs.id,
        sourceType: 'CONSIDERATION',
        employeeId: cs.employeeId,
        employeeName: cs.employeeName,
        department: cs.department,
        title: cs.type,
        subtitle: `Date: ${cs.date}`,
        submissionDate: cs.date,
        details: cs.reason,
        status: cs.status || 'PENDING',
        statusCategory: category,
        rawConsideration: cs,
        timeline,
      });
    });

    return list.sort((a, b) => b.submissionDate.localeCompare(a.submissionDate));
  }, [scopedLeaves, scopedConsiderations, isManager, currentEmployee.id]);

  // Tab counts
  const counts = useMemo(() => {
    return {
      pending: unifiedRequests.filter((r) => r.statusCategory === 'PENDING').length,
      approved: unifiedRequests.filter((r) => r.statusCategory === 'APPROVED').length,
      rejected: unifiedRequests.filter((r) => r.statusCategory === 'REJECTED').length,
      total: unifiedRequests.length,
    };
  }, [unifiedRequests]);

  // Filtered requests list
  const filteredRequests = useMemo(() => {
    return unifiedRequests.filter((item) => {
      const matchTab = activeTab === 'ALL' || item.statusCategory === activeTab;
      const matchType = typeFilter === 'ALL' || item.sourceType === typeFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.employeeName.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.details.toLowerCase().includes(q) ||
        item.department.toLowerCase().includes(q);

      return matchTab && matchType && matchSearch;
    });
  }, [unifiedRequests, activeTab, typeFilter, searchQuery]);

  // Handlers
  const handleConfirmApproval = () => {
    if (!approvingItem) return;

    if (approvingItem.sourceType === 'LEAVE') {
      approveLeave(approvingItem.id, approvalNote.trim() || undefined);
    } else {
      approveConsideration(approvingItem.id, approvalNote.trim() || undefined);
    }

    addToast(
      'Request Approved',
      `${approvingItem.title} for ${approvingItem.employeeName} approved.`,
      'success'
    );
    if (detailItem?.id === approvingItem.id) {
      setDetailItem(null);
    }
    setApprovingItem(null);
    setApprovalNote('');
  };

  const handleConfirmRejection = () => {
    if (!rejectingItem) return;
    if (!rejectionReason.trim()) {
      addToast('Reason Required', 'Please enter a clear mandatory reason for rejecting this request.', 'error');
      return;
    }

    if (rejectingItem.sourceType === 'LEAVE') {
      rejectLeave(rejectingItem.id, rejectionReason.trim());
    } else {
      rejectConsideration(rejectingItem.id, rejectionReason.trim());
    }

    addToast(
      'Request Rejected',
      `${rejectingItem.title} for ${rejectingItem.employeeName} rejected with recorded reason.`,
      'info'
    );
    if (detailItem?.id === rejectingItem.id) {
      setDetailItem(null);
    }
    setRejectingItem(null);
    setRejectionReason('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
            {t('nav.approvals', 'Approvals Queue')}
          </h1>
          <p className="text-xs sm:text-sm text-[#6E6E73] dark:text-[#A1A1A6] mt-0.5">
            {isManager
              ? 'Review pending time-off requests and consideration waivers from your direct reports.'
              : 'Enterprise-wide approval governance ledger for leave requests and employee considerations.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setConsEmpId(currentEmployee.id);
              setConsDate('2026-10-06');
              setConsType('Late Arrival Waiver');
              setConsTitle('');
              setConsReason('');
              setConsNote('');
              setShowNewConsModal(true);
            }}
            className="px-3.5 py-1.5 bg-[#000000] dark:bg-white text-white dark:text-[#000000] text-xs font-semibold rounded-xl hover:opacity-90 transition-opacity cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
          >
            <Award className="w-3.5 h-3.5" />
            <span>+ Request Consideration</span>
          </button>
          <span className="text-xs font-mono font-medium px-3 py-1.5 rounded-xl bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7]">
            {counts.pending} Actionable · {counts.total} Total
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <KPICard
          label="Pending Review"
          value={counts.pending}
          subtext="Requires immediate decision"
          accent="primary"
          onClick={() => setActiveTab('PENDING')}
        />
        <KPICard
          label="Approved"
          value={counts.approved}
          subtext="Finalized in cycle"
          onClick={() => setActiveTab('APPROVED')}
        />
        <KPICard
          label="Rejected"
          value={counts.rejected}
          subtext="Returned with reason"
          onClick={() => setActiveTab('REJECTED')}
        />
        <KPICard
          label="All Requests"
          value={counts.total}
          subtext="Full approval history"
          onClick={() => setActiveTab('ALL')}
        />
      </div>

      {/* Filter and Control Bar (No Stage 1 / Stage 2 Headline Tabs!) */}
      <div className="bg-white dark:bg-[#161618] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-2xl p-3.5 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tabs (All, Pending, Approved, Rejected) */}
          <SegmentedControl<FilterStatusTab>
            value={activeTab}
            onChange={(val) => setActiveTab(val)}
            items={[
              { id: 'PENDING', label: t('status.pending', 'Pending'), count: counts.pending },
              { id: 'APPROVED', label: t('status.approved', 'Approved'), count: counts.approved },
              { id: 'REJECTED', label: t('status.rejected', 'Rejected'), count: counts.rejected },
              { id: 'ALL', label: t('status.all', 'All'), count: counts.total },
            ]}
          />

          {/* Right Controls: Category Filter + Search */}
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl<RequestTypeFilter>
              value={typeFilter}
              onChange={(val) => setTypeFilter(val)}
              items={[
                { id: 'ALL', label: 'All' },
                { id: 'LEAVE', label: 'Leaves' },
                { id: 'CONSIDERATION', label: 'Considerations' },
              ]}
            />

            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search employee, request, details..."
              className="w-full sm:w-64"
            />
          </div>
        </div>
      </div>

      {/* Requests Ledger Table / List (Clickable Records -> Drawer) */}
      <div className="bg-white dark:bg-[#161618] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-2xl overflow-hidden shadow-2xs">
        {filteredRequests.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#F0F0F2] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#2C2C2E] flex items-center justify-center text-[#6E6E73] mb-3">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
              No {activeTab.toLowerCase()} requests
            </h3>
            <p className="text-xs text-[#6E6E73] dark:text-[#A1A1A6] mt-1 max-w-sm mx-auto">
              {activeTab === 'PENDING'
                ? 'Your approval queue is all caught up. No pending requests require action.'
                : 'No requests match your current tab or search criteria.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E5EA] dark:border-[#2C2C2E] text-[11px] font-medium tracking-tight text-[#6E6E73] dark:text-[#A1A1A6] bg-[#FAFAFC] dark:bg-[#1A1A1C]">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Request Summary</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E] text-xs">
                  {filteredRequests.map((item) => {
                    const isPendingAction = item.statusCategory === 'PENDING';

                    return (
                      <tr
                        key={`${item.sourceType}-${item.id}`}
                        onClick={() => setDetailItem(item)}
                        className="hover:bg-[#F5F5F7] dark:hover:bg-[#1C1C1E] transition-colors cursor-pointer group"
                      >
                        {/* Employee */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <AvatarInitials name={item.employeeName} size="sm" />
                            <div className="min-w-0">
                              <div className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] group-hover:underline">
                                {item.employeeName}
                              </div>
                              <div className="text-[11px] text-[#6E6E73] dark:text-[#A1A1A6] truncate">
                                {item.department} · {item.employeeId}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Request Type */}
                        <td className="py-3.5 px-4">
                          <span className="text-[11px] font-medium text-[#6E6E73] dark:text-[#A1A1A6] flex items-center gap-1.5">
                            {item.sourceType === 'LEAVE' ? (
                              <Calendar className="w-3.5 h-3.5 text-[#86868B]" />
                            ) : (
                              <Award className="w-3.5 h-3.5 text-[#86868B]" />
                            )}
                            <span>{item.sourceType === 'LEAVE' ? 'Leave' : 'Consideration'}</span>
                          </span>
                        </td>

                        {/* Request Summary */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                            {item.title}
                          </div>
                          <div className="text-[11px] text-[#6E6E73] dark:text-[#A1A1A6] truncate">
                            {item.subtitle}
                          </div>
                        </td>

                        {/* Submission Date */}
                        <td className="py-3.5 px-4 font-mono text-[#6E6E73] dark:text-[#A1A1A6]">
                          {item.submissionDate}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <StatusBadge status={item.status} size="sm" />
                        </td>

                        {/* Quick Inline Actions */}
                        <td
                          className="py-3.5 px-4 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            {isPendingAction ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setApprovingItem(item)}
                                  className="px-2.5 py-1 bg-[#000000] dark:bg-white text-white dark:text-[#000000] text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity cursor-pointer inline-flex items-center gap-1"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Approve</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRejectingItem(item);
                                    setRejectionReason('');
                                  }}
                                  className="px-2.5 py-1 bg-[#F0F0F2] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] text-[#1D1D1F] dark:text-[#F5F5F7] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                                >
                                  Reject
                                </button>
                              </>
                            ) : (
                              <span className="text-[11px] text-[#86868B] flex items-center gap-1">
                                <span>Details</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards */}
            <div className="sm:hidden divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E]">
              {filteredRequests.map((item) => (
                <div
                  key={`${item.sourceType}-${item.id}`}
                  onClick={() => setDetailItem(item)}
                  className="p-4 space-y-2.5 active:bg-[#F5F5F7] dark:active:bg-[#1C1C1E] transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-sm text-[#1D1D1F] dark:text-[#F5F5F7]">
                        {item.employeeName}
                      </div>
                      <div className="text-xs text-[#6E6E73] dark:text-[#A1A1A6]">
                        {item.department} · {item.title}
                      </div>
                    </div>
                    <StatusBadge status={item.status} size="sm" />
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono text-[#6E6E73] dark:text-[#A1A1A6]">
                    <span>{item.subtitle}</span>
                    <span>{item.submissionDate}</span>
                  </div>

                  <p className="text-xs text-[#86868B] line-clamp-1 italic">
                    "{item.details}"
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ===================================================================== */}
      {/* REQUIREMENT 3: DEDICATED APPROVAL DETAIL DRAWER                        */}
      {/* ===================================================================== */}
      <SlideOverDrawer
        open={!!detailItem}
        onClose={() => setDetailItem(null)}
        title={detailItem ? `${detailItem.sourceType === 'LEAVE' ? 'Leave Application' : 'Consideration Waiver'}` : ''}
        subtitle={detailItem ? `ID: ${detailItem.id}` : ''}
        footer={
          detailItem && detailItem.statusCategory === 'PENDING' ? (
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setRejectingItem(detailItem);
                  setRejectionReason('');
                }}
                className="px-4 py-2 bg-[#F0F0F2] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] text-[#1D1D1F] dark:text-[#F5F5F7] rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Reject Request
              </button>
              <button
                type="button"
                onClick={() => setApprovingItem(detailItem)}
                className="px-4 py-2 bg-[#000000] dark:bg-white text-white dark:text-[#000000] rounded-xl text-xs font-semibold transition-opacity hover:opacity-90 cursor-pointer"
              >
                Approve Request
              </button>
            </div>
          ) : undefined
        }
      >
        {detailItem && (
          <div className="space-y-6">
            {/* Status & Type Banner */}
            <div className="p-4 rounded-2xl bg-[#F0F0F2] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-medium uppercase tracking-wider text-[#6E6E73] dark:text-[#A1A1A6] block">
                  Workflow Status
                </span>
                <div className="mt-1">
                  <StatusBadge status={detailItem.status} size="md" />
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-medium uppercase tracking-wider text-[#6E6E73] dark:text-[#A1A1A6] block">
                  Category
                </span>
                <span className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                  {detailItem.sourceType}
                </span>
              </div>
            </div>

            {/* Employee Information */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#86868B] mb-2.5">
                Employee Details
              </h4>
              <div className="p-4 rounded-2xl bg-white dark:bg-[#161618] border border-[#E5E5EA] dark:border-[#2C2C2E] space-y-3">
                <div className="flex items-center gap-3">
                  <AvatarInitials name={detailItem.employeeName} size="md" />
                  <div>
                    <div className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                      {detailItem.employeeName}
                    </div>
                    <div className="text-xs text-[#6E6E73] dark:text-[#A1A1A6]">
                      {detailItem.department} · {detailItem.employeeId}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Request Summary */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#86868B] mb-2.5">
                Request Specifications
              </h4>
              <div className="p-4 rounded-2xl bg-white dark:bg-[#161618] border border-[#E5E5EA] dark:border-[#2C2C2E] space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[#86868B] block">Title / Type</span>
                    <span className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                      {detailItem.title}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#86868B] block">Timeline / Date</span>
                    <span className="font-mono text-[#1D1D1F] dark:text-[#F5F5F7]">
                      {detailItem.subtitle}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
                  <span className="text-[#86868B] block mb-1">Reason / Supporting Statement</span>
                  <p className="text-[#1D1D1F] dark:text-[#F5F5F7] leading-relaxed">
                    "{detailItem.details}"
                  </p>
                </div>
              </div>
            </div>

            {/* Workflow Timeline */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#86868B] mb-2.5">
                Decision & Audit Timeline
              </h4>
              <div className="p-4 rounded-2xl bg-white dark:bg-[#161618] border border-[#E5E5EA] dark:border-[#2C2C2E] space-y-4">
                {detailItem.timeline.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs">
                    <div className="w-6 h-6 rounded-full bg-[#1D1D1F] text-white dark:bg-white dark:text-[#1D1D1F] flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                        {step.stage} · {step.action}
                      </div>
                      <div className="text-[11px] text-[#86868B]">
                        Actor: {step.actorName} · {step.timestamp}
                      </div>
                      {step.note && (
                        <p className="text-xs text-[#6E6E73] dark:text-[#A1A1A6] mt-1 italic">
                          "{step.note}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </SlideOverDrawer>

      {/* Approve Confirmation Modal */}
      <ModalShell
        isOpen={!!approvingItem}
        onClose={() => setApprovingItem(null)}
        title="Confirm Approval"
        subtitle={
          approvingItem
            ? `Approve ${approvingItem.title} for ${approvingItem.employeeName}`
            : ''
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#6E6E73] dark:text-[#A1A1A6] mb-1">
              Approval Remarks (Optional)
            </label>
            <textarea
              rows={3}
              value={approvalNote}
              onChange={(e) => setApprovalNote(e.target.value)}
              placeholder="Add any administrative remarks or concurrence comments..."
              className="w-full px-3 py-2 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl text-xs text-[#1D1D1F] dark:text-[#F5F5F7] outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
            <button
              type="button"
              onClick={() => setApprovingItem(null)}
              className="px-4 py-2 text-xs font-medium text-[#6E6E73]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmApproval}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#000000] dark:bg-white dark:text-[#000000] rounded-xl hover:opacity-90"
            >
              Confirm Approval
            </button>
          </div>
        </div>
      </ModalShell>

      {/* Reject Modal with Mandatory Reason */}
      <ModalShell
        isOpen={!!rejectingItem}
        onClose={() => setRejectingItem(null)}
        title="Reject Request"
        subtitle={
          rejectingItem
            ? `State mandatory reason for rejecting ${rejectingItem.employeeName}'s ${rejectingItem.title}`
            : ''
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#6E6E73] dark:text-[#A1A1A6] mb-1">
              Mandatory Rejection Reason
            </label>
            <textarea
              required
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Specify the policy or operational reason for rejection..."
              className="w-full px-3 py-2 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl text-xs text-[#1D1D1F] dark:text-[#F5F5F7] outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
            <button
              type="button"
              onClick={() => setRejectingItem(null)}
              className="px-4 py-2 text-xs font-medium text-[#6E6E73]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmRejection}
              className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl"
            >
              Confirm Rejection
            </button>
          </div>
        </div>
      </ModalShell>
      {/* New Consideration Request Modal */}
      <ModalShell
        isOpen={showNewConsModal}
        onClose={() => setShowNewConsModal(false)}
        title="Submit Consideration Request"
        subtitle="Late arrival waivers, missed punch regularizations, and deduction overrides"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!consReason.trim()) {
              addToast('Reason Required', 'Please provide a clear justification.', 'error');
              return;
            }
            const emp = allEmployees.find((e) => e.id === consEmpId) || currentEmployee;
            submitConsideration({
              employeeId: emp.id,
              date: consDate,
              type: consType,
              title: consTitle.trim() || `${consType} — ${emp.fullName}`,
              category: consType,
              reason: consReason.trim(),
              supportingNote: consNote.trim() || `Submitted via Approvals & Considerations Queue.`,
              supportingDocument: 'Consideration_Supporting_Doc.pdf',
              forwardToHRImmediately: isManager || isHRAdmin,
            });
            setShowNewConsModal(false);
            setTypeFilter('CONSIDERATION');
            addToast('Consideration Submitted', `${consType} submitted for ${emp.fullName}.`, 'success');
          }}
          className="space-y-4 text-xs"
        >
          {(isHRAdmin || isManager) && (
            <div>
              <label className="block font-medium text-[#6E6E73] dark:text-[#A1A1A6] mb-1">
                Select Employee *
              </label>
              <select
                value={consEmpId}
                onChange={(e) => setConsEmpId(e.target.value)}
                className="w-full px-3 py-2 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl text-xs text-[#1D1D1F] dark:text-[#F5F5F7] outline-none"
              >
                {allEmployees
                  .filter((e) => {
                    if (isHRAdmin) return true;
                    if (isManager) return e.managerId === currentEmployee.id || e.id === currentEmployee.id;
                    return e.id === currentEmployee.id;
                  })
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.fullName} ({e.id} · {e.department})
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[#6E6E73] dark:text-[#A1A1A6] mb-1">
                Incident / Attendance Date *
              </label>
              <input
                type="date"
                required
                value={consDate}
                onChange={(e) => setConsDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl text-xs text-[#1D1D1F] dark:text-[#F5F5F7] font-mono outline-none"
              />
            </div>
            <div>
              <label className="block font-medium text-[#6E6E73] dark:text-[#A1A1A6] mb-1">
                Consideration Type *
              </label>
              <select
                value={consType}
                onChange={(e) => setConsType(e.target.value as any)}
                className="w-full px-3 py-2 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl text-xs text-[#1D1D1F] dark:text-[#F5F5F7] outline-none font-semibold"
              >
                <option value="Late Arrival Waiver">Late Arrival Waiver</option>
                <option value="Missed Punch Regularization">Missed Punch Regularization</option>
                <option value="Half-Day Waiver">Half-Day Waiver</option>
                <option value="Salary Deduction Waiver">Salary Deduction Waiver</option>
                <option value="Work From Home">Work From Home</option>
                <option value="Client Visit">Client Visit</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium text-[#6E6E73] dark:text-[#A1A1A6] mb-1">
              Headline / Summary (Optional)
            </label>
            <input
              type="text"
              value={consTitle}
              onChange={(e) => setConsTitle(e.target.value)}
              placeholder="e.g., Transit delay / Device fingerprint reader error"
              className="w-full px-3 py-2 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl text-xs text-[#1D1D1F] dark:text-[#F5F5F7] outline-none"
            />
          </div>

          <div>
            <label className="block font-medium text-[#6E6E73] dark:text-[#A1A1A6] mb-1">
              Reason for Consideration *
            </label>
            <textarea
              rows={3}
              required
              value={consReason}
              onChange={(e) => setConsReason(e.target.value)}
              placeholder="State the detailed operational or personal circumstance..."
              className="w-full px-3 py-2 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl text-xs text-[#1D1D1F] dark:text-[#F5F5F7] outline-none"
            />
          </div>

          <div>
            <label className="block font-medium text-[#6E6E73] dark:text-[#A1A1A6] mb-1">
              Additional Supporting Note (Optional)
            </label>
            <textarea
              rows={2}
              value={consNote}
              onChange={(e) => setConsNote(e.target.value)}
              placeholder="Any supervisor or operational context..."
              className="w-full px-3 py-2 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl text-xs text-[#1D1D1F] dark:text-[#F5F5F7] outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
            <button
              type="button"
              onClick={() => setShowNewConsModal(false)}
              className="px-3.5 py-2 text-xs font-medium text-[#6E6E73]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-[#000000] dark:bg-white dark:text-[#000000] rounded-xl hover:opacity-90 transition-opacity cursor-pointer"
            >
              Submit Request
            </button>
          </div>
        </form>
      </ModalShell>
    </div>
  );
};
