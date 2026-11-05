import React, { useState, useMemo } from 'react';
import {
  FileText,
  Lock,
  CheckCircle2,
  Printer,
  Edit3,
  Trash2,
  Search,
  ArrowUpDown,
  Eye,
  EyeOff,
  Download,
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
import { PayrollRecord } from '../../types/hrms';
import { printPayslipDocument } from '../../lib/exportUtils';

interface DetailedPayrollRow extends PayrollRecord {
  lpaPackage: number;
  commission: number;
  otherAdditions: number;
  lateComingDeduction: number;
  emiDeduction: number;
  otherTaxDeduction: number;
  otherDeductions: number;
}

export function PayrollModule() {
  const {
    currentUser,
    permissions,
    payroll,
    employees,
    processMonthlyPayroll,
    updatePayrollRecord,
    deletePayrollRecord,
  } = useHRMS();

  // Eye Icon Hide/Show Salary Toggle
  const [showSalary, setShowSalary] = useState<boolean>(false);

  // Selected Salary Entry for Complete Breakdown Modal
  const [selectedSlip, setSelectedSlip] = useState<DetailedPayrollRow | null>(null);

  // Filter & Sort State
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterDept, setFilterDept] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'employeeName' | 'netPayable' | 'grossMonthly' | 'lopDays'>('employeeName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Edit Payroll State
  const [editingPayroll, setEditingPayroll] = useState<PayrollRecord | null>(null);
  const [editPaidDays, setEditPaidDays] = useState(31);
  const [editLopDays, setEditLopDays] = useState(0);
  const [editTdsDeduction, setEditTdsDeduction] = useState(0);
  const [editLatePenalty, setEditLatePenalty] = useState(0);
  const [editStatus, setEditStatus] = useState<PayrollRecord['status']>('PROCESSED');

  const [deletingPayroll, setDeletingPayroll] = useState<PayrollRecord | null>(null);

  const canManageAll = permissions.Payroll?.scope === 'ALL';

  const departments = useMemo(() => {
    const set = new Set(employees.map((e) => e.department));
    return ['ALL', ...Array.from(set)];
  }, [employees]);

  // Enrich Payroll Records + Historical Months for Salary History
  const enrichedSalaryHistory = useMemo<DetailedPayrollRow[]>(() => {
    let base = payroll;
    if (!canManageAll) {
      base = payroll.filter((p) => p.employeeId === currentUser.employeeId);
    }

    const historicalMonths = canManageAll
      ? ['October 2026']
      : ['October 2026', 'September 2026', 'August 2026', 'July 2026'];

    const rows: DetailedPayrollRow[] = [];

    historicalMonths.forEach((monthLabel, mIdx) => {
      base.forEach((p) => {
        const empObj = employees.find((e) => e.id === p.employeeId);
        const annualCTC = empObj?.annualCTC || p.grossMonthly * 12;
        const commission = mIdx === 0 ? 4500 : mIdx === 1 ? 3000 : 5000;
        const otherAdditions = mIdx === 0 ? 1500 : 1000;
        const lateComingDeduction = mIdx === 1 ? 0 : p.latePenaltyDeduction || 500;
        const emiDeduction = 2000;
        const pfDed = p.pfDeduction || 1800;
        const tdsDed = p.tdsDeduction || 2500;
        const otherTaxDeduction = p.professionalTax || 200;
        const otherDeductions = mIdx === 0 ? 300 : 0;

        const totalAdditions =
          p.basicPay + p.hra + p.specialAllowance + commission + otherAdditions;
        const totalDeductions =
          lateComingDeduction +
          emiDeduction +
          pfDed +
          tdsDed +
          otherTaxDeduction +
          otherDeductions;
        const netCalc = Math.max(0, totalAdditions - totalDeductions);

        rows.push({
          ...p,
          id: mIdx === 0 ? p.id : `${p.id}-HIST-${mIdx}`,
          month: monthLabel,
          status: mIdx === 0 ? p.status : 'DISBURSED',
          lpaPackage: annualCTC,
          commission,
          otherAdditions,
          lateComingDeduction,
          emiDeduction,
          otherTaxDeduction,
          otherDeductions,
          grossMonthly: totalAdditions,
          netPayable: netCalc,
        });
      });
    });

    const filtered = rows.filter((p) => {
      const matchStatus = filterStatus === 'ALL' || p.status === filterStatus;
      const matchDept = filterDept === 'ALL' || p.department === filterDept;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.employeeName.toLowerCase().includes(q) ||
        p.employeeCode.toLowerCase().includes(q) ||
        p.department.toLowerCase().includes(q) ||
        p.month.toLowerCase().includes(q);
      return matchStatus && matchDept && matchSearch;
    });

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'employeeName') {
        comparison = a.employeeName.localeCompare(b.employeeName);
      } else if (sortBy === 'netPayable') {
        comparison = a.netPayable - b.netPayable;
      } else if (sortBy === 'grossMonthly') {
        comparison = a.grossMonthly - b.grossMonthly;
      } else if (sortBy === 'lopDays') {
        comparison = a.lopDays - b.lopDays;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [
    payroll,
    employees,
    canManageAll,
    currentUser.employeeId,
    filterStatus,
    filterDept,
    searchQuery,
    sortBy,
    sortOrder,
  ]);

  const currentEmpRecord = useMemo(
    () =>
      enrichedSalaryHistory.find((p) => p.employeeId === currentUser.employeeId) ||
      enrichedSalaryHistory[0],
    [enrichedSalaryHistory, currentUser.employeeId]
  );

  const maskAmount = (val: number) => {
    if (!showSalary) return '₹ ••••••';
    return `₹${val.toLocaleString('en-IN')}`;
  };

  const openEditPayroll = (p: PayrollRecord) => {
    setEditingPayroll(p);
    setEditPaidDays(p.paidDays);
    setEditLopDays(p.lopDays);
    setEditTdsDeduction(p.tdsDeduction);
    setEditLatePenalty(p.latePenaltyDeduction);
    setEditStatus(p.status);
  };

  const handleSaveEditPayroll = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayroll) return;
    const newNetPayable = Math.max(
      0,
      editingPayroll.grossMonthly -
        editingPayroll.pfDeduction -
        editingPayroll.professionalTax -
        Number(editTdsDeduction) -
        Number(editLatePenalty)
    );
    updatePayrollRecord(editingPayroll.id, {
      paidDays: Number(editPaidDays),
      lopDays: Number(editLopDays),
      tdsDeduction: Number(editTdsDeduction),
      latePenaltyDeduction: Number(editLatePenalty),
      netPayable: newNetPayable,
      status: editStatus,
    });
    setEditingPayroll(null);
  };

  return (
    <div className="p-4 lg:p-6 max-w-[1440px] mx-auto space-y-6">
      {/* Header with Eye Icon Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#CBCBCB]">
        <div>
          <span className="px-2.5 py-0.5 rounded-md bg-[#164C38]/10 border border-[#164C38]/30 text-[#164C38] text-[10px] font-bold uppercase tracking-wider">
            Payroll & Salary History
          </span>
          <h1 className="text-xl font-bold text-[#141A17] tracking-tight mt-1.5">
            Payroll, LPA Package & Salary History
          </h1>
          <p className="text-xs text-[#525854] mt-0.5">
            Click the Eye icon to show/hide salary amounts, download payslips, or open any salary entry for a full breakdown
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Eye Icon Button to Hide/Show Salary Information */}
          <button
            type="button"
            onClick={() => setShowSalary((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-[#CBCBCB] text-xs font-semibold text-[#141A17] hover:border-[#164C38] cursor-pointer"
            title={showSalary ? 'Hide Salary Information' : 'Show Salary Information'}
          >
            {showSalary ? (
              <>
                <EyeOff className="w-4 h-4 text-[#4E1617]" />
                <span>Hide Salary</span>
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 text-[#164C38]" />
                <span>Show Salary</span>
              </>
            )}
          </button>

          {currentEmpRecord && (
            <button
              type="button"
              onClick={() => printPayslipDocument(currentEmpRecord)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 text-xs font-semibold hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Payslip</span>
            </button>
          )}

          <ExportDropdown
            data={enrichedSalaryHistory}
            filename="argos_salary_history"
            title="Argos Watch — Salary History & Payroll Register"
          />

          {permissions.Payroll?.actions.includes('APPROVE') && (
            <button
              onClick={() => processMonthlyPayroll()}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Disburse Monthly Payroll
            </button>
          )}
        </div>
      </div>

      {/* Top 3 Boxes: LPA Package, Monthly Salary, and Salary Payslip with Download */}
      {currentEmpRecord && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-[#CBCBCB] rounded-xl p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#525854]">
                LPA Package (Annual CTC)
              </span>
              <button
                type="button"
                onClick={() => setShowSalary((v) => !v)}
                className="text-[#525854] hover:text-[#164C38] cursor-pointer"
              >
                {showSalary ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="text-2xl font-bold font-mono text-[#164C38] mt-1.5">
              {showSalary
                ? `${(currentEmpRecord.lpaPackage / 100000).toFixed(2)} LPA`
                : '₹ •••••• LPA'}
            </div>
            <div className="text-[11px] text-[#525854] mt-0.5 font-mono">
              {showSalary
                ? `₹${currentEmpRecord.lpaPackage.toLocaleString('en-IN')} / Year`
                : 'Annual Package Masked'}
            </div>
          </div>

          <div className="bg-white border border-[#CBCBCB] rounded-xl p-5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#525854] block">
              Monthly Salary (Net Take-Home)
            </span>
            <div className="text-2xl font-bold font-mono text-[#141A17] mt-1.5">
              {maskAmount(currentEmpRecord.netPayable)}
            </div>
            <div className="text-[11px] text-[#164C38] font-medium mt-0.5">
              Gross Monthly: {maskAmount(currentEmpRecord.grossMonthly)}
            </div>
          </div>

          <div className="bg-white border border-[#CBCBCB] rounded-xl p-5 flex items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#525854] block">
                Salary Payslip ({currentEmpRecord.month})
              </span>
              <div className="text-sm font-bold text-[#141A17] mt-1.5">
                Verified Official Payslip
              </div>
              <button
                type="button"
                onClick={() => setSelectedSlip(currentEmpRecord)}
                className="text-[11px] font-semibold text-neutral-900 dark:text-neutral-100 hover:underline mt-0.5 cursor-pointer"
              >
                Open Full Breakdown →
              </button>
            </div>
            <button
              type="button"
              onClick={() => printPayslipDocument(currentEmpRecord)}
              className="px-3.5 py-2 rounded-xl bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          </div>
        </div>
      )}

      {/* Filter & Sort Controls — Vertically Stacked on Mobile */}
      <div className="bg-white border border-[#CBCBCB] rounded-xl p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 bg-[#F2F2F2] p-1.5 rounded-xl w-full lg:w-auto">
            {['ALL', 'DRAFT', 'PROCESSED', 'DISBURSED'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`w-full sm:w-auto px-3.5 py-2 sm:py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-between sm:justify-center ${
                  filterStatus === st
                    ? 'bg-white text-[#141A17] shadow-2xs'
                    : 'text-[#525854] hover:text-[#141A17]'
                }`}
              >
                <span>{st === 'ALL' ? 'All Status' : st}</span>
                {filterStatus === st && (
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
              placeholder="Search salary history by month, employee name, or department..."
              className="w-full pl-8 pr-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-xl text-xs"
            />
          </div>
        </div>
      </div>

      {/* Salary History Section Below */}
      <div className="bg-white border border-[#CBCBCB] rounded-2xl overflow-hidden shadow-2xs">
        <div className="px-4 sm:px-5 py-3.5 border-b border-[#CBCBCB] bg-[#F2F2F2] flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#164C38]">
              Salary History ({enrichedSalaryHistory.length} Entries)
            </h2>
            <p className="text-[11px] text-[#525854]">
              Tap any salary entry to inspect Additions and Deductions
            </p>
          </div>
        </div>

        {/* Mobile App Card List (Vertically Stacked Fields on Mobile) */}
        <div className="md:hidden divide-y divide-[#CBCBCB]/60">
          {enrichedSalaryHistory.map((p) => {
            const totalAdditions = p.commission + p.otherAdditions;
            const totalDeductions =
              p.lateComingDeduction +
              p.emiDeduction +
              p.pfDeduction +
              p.tdsDeduction +
              p.otherTaxDeduction +
              p.otherDeductions;

            return (
              <div
                key={p.id}
                onClick={() => setSelectedSlip(p)}
                className="p-4 space-y-3 hover:bg-[#F2F2F2]/60 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold text-[#141A17]">{p.month}</div>
                    <div className="text-[11px] font-mono text-[#525854] mt-0.5">
                      {p.employeeName} · {p.employeeCode}
                    </div>
                  </div>
                  <StatusBadge status={p.status} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="flex sm:block items-center justify-between p-2.5 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB]/70">
                    <span className="text-[11px] font-semibold text-[#525854]">
                      Additions
                    </span>
                    <span className="font-mono font-bold text-[#164C38]">
                      +{maskAmount(totalAdditions)}
                    </span>
                  </div>
                  <div className="flex sm:block items-center justify-between p-2.5 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB]/70">
                    <span className="text-[11px] font-semibold text-[#525854]">
                      Deductions
                    </span>
                    <span className="font-mono font-bold text-[#4E1617]">
                      -{maskAmount(totalDeductions)}
                    </span>
                  </div>
                  <div className="flex sm:block items-center justify-between p-2.5 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB]/70">
                    <span className="text-[11px] font-semibold text-[#525854]">
                      Net Salary
                    </span>
                    <span className="font-mono font-bold text-[#141A17]">
                      {maskAmount(p.netPayable)}
                    </span>
                  </div>
                </div>

                <div
                  className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedSlip(p)}
                    className="w-full sm:flex-1 min-h-[40px] px-3 py-2 rounded-xl border border-[#CBCBCB] bg-white hover:bg-[#F2F2F2] text-xs font-bold text-[#141A17] cursor-pointer"
                  >
                    Open Breakdown
                  </button>
                  <button
                    type="button"
                    onClick={() => printPayslipDocument(p)}
                    className="w-full sm:flex-1 min-h-[40px] px-3 py-2 rounded-xl bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Payslip</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#CBCBCB] text-[10px] font-bold uppercase tracking-wider text-[#525854] bg-[#F2F2F2]">
                <th className="py-3.5 px-5">Employee & Cycle</th>
                <th className="py-3.5 px-4">LPA Package</th>
                <th className="py-3.5 px-4">Base + HRA + Special</th>
                <th className="py-3.5 px-4">Additions (Commission & Other)</th>
                <th className="py-3.5 px-4">Deductions (Late, EMI, PF, TDS, Tax)</th>
                <th className="py-3.5 px-4">Net Salary</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-5 text-right">Payslip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#CBCBCB]/60 text-xs">
              {enrichedSalaryHistory.map((p) => {
                const totalAdditions = p.commission + p.otherAdditions;
                const totalDeductions =
                  p.lateComingDeduction +
                  p.emiDeduction +
                  p.pfDeduction +
                  p.tdsDeduction +
                  p.otherTaxDeduction +
                  p.otherDeductions;

                return (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedSlip(p)}
                    className="hover:bg-[#F2F2F2] transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <AvatarInitials name={p.employeeName} size="sm" />
                        <div>
                          <div className="font-bold text-[#141A17]">{p.employeeName}</div>
                          <div className="text-[11px] font-mono text-[#164C38]">
                            {p.month} · {p.employeeCode}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-[#164C38]">
                      {showSalary ? `${(p.lpaPackage / 100000).toFixed(2)} LPA` : '₹ ••••'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#141A17]">
                      {maskAmount(p.basicPay + p.hra + p.specialAllowance)}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-[#164C38]">
                      +{maskAmount(totalAdditions)}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-[#4E1617]">
                      -{maskAmount(totalDeductions)}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-[#141A17]">
                      {maskAmount(p.netPayable)}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={p.status} />
                    </td>
                    <td
                      className="py-3.5 px-5 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedSlip(p)}
                          className="px-2.5 py-1 rounded-md border border-[#CBCBCB] bg-white hover:bg-[#F2F2F2] text-xs font-semibold text-[#141A17]"
                        >
                          Open Breakdown
                        </button>
                        <button
                          onClick={() => printPayslipDocument(p)}
                          className="px-2.5 py-1 rounded-md bg-[#164C38] text-[#F2F2F2] text-xs font-semibold inline-flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" />
                          Payslip
                        </button>
                        {canManageAll && (
                          <ActionMenu
                            items={[
                              {
                                label: 'Edit Payroll',
                                icon: <Edit3 className="w-3.5 h-3.5" />,
                                onClick: () => openEditPayroll(p),
                              },
                              {
                                label: 'Delete Record',
                                icon: <Trash2 className="w-3.5 h-3.5" />,
                                variant: 'danger',
                                onClick: () => setDeletingPayroll(p),
                              },
                            ]}
                          />
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

      {/* Complete Salary Breakdown Modal when a Salary Entry is Opened */}
      <ModalShell
        isOpen={!!selectedSlip}
        onClose={() => setSelectedSlip(null)}
        title={`Complete Salary Breakdown — ${selectedSlip?.month || ''}`}
        subtitle={`${selectedSlip?.employeeName || ''} (${selectedSlip?.employeeCode || ''}) • ${selectedSlip?.department || ''}`}
        maxWidth="max-w-2xl"
      >
        {selectedSlip && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Additions Section */}
              <div className="p-4 rounded-xl bg-[#164C38]/5 border border-[#164C38]/30 space-y-2.5">
                <h4 className="font-bold uppercase tracking-wider text-[#164C38] border-b border-[#164C38]/20 pb-1.5">
                  Additions & Earnings
                </h4>
                <div className="flex justify-between">
                  <span className="text-[#525854]">Basic Salary</span>
                  <span className="font-mono font-semibold">
                    ₹{selectedSlip.basicPay.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#525854]">House Rent Allowance (HRA)</span>
                  <span className="font-mono font-semibold">
                    ₹{selectedSlip.hra.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#525854]">Special Allowance</span>
                  <span className="font-mono font-semibold">
                    ₹{selectedSlip.specialAllowance.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-[#164C38] font-semibold">
                  <span>Commission</span>
                  <span className="font-mono">
                    +₹{selectedSlip.commission.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-[#164C38] font-semibold">
                  <span>Other Additions</span>
                  <span className="font-mono">
                    +₹{selectedSlip.otherAdditions.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="pt-2 border-t border-[#164C38]/20 flex justify-between font-bold text-[#141A17]">
                  <span>Total Gross + Additions</span>
                  <span className="font-mono">
                    ₹{selectedSlip.grossMonthly.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Deductions Section */}
              <div className="p-4 rounded-xl bg-[#4E1617]/5 border border-[#4E1617]/30 space-y-2.5">
                <h4 className="font-bold uppercase tracking-wider text-[#4E1617] border-b border-[#4E1617]/20 pb-1.5">
                  Deductions
                </h4>
                <div className="flex justify-between">
                  <span className="text-[#525854]">Late Coming Deduction</span>
                  <span className="font-mono font-semibold text-[#4E1617]">
                    -₹{selectedSlip.lateComingDeduction.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#525854]">EMI Deduction</span>
                  <span className="font-mono font-semibold text-[#4E1617]">
                    -₹{selectedSlip.emiDeduction.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#525854]">PF (Provident Fund)</span>
                  <span className="font-mono font-semibold text-[#4E1617]">
                    -₹{selectedSlip.pfDeduction.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#525854]">TDS (Income Tax)</span>
                  <span className="font-mono font-semibold text-[#4E1617]">
                    -₹{selectedSlip.tdsDeduction.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#525854]">Other Tax (Professional Tax)</span>
                  <span className="font-mono font-semibold text-[#4E1617]">
                    -₹{selectedSlip.otherTaxDeduction.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#525854]">Other Deductions</span>
                  <span className="font-mono font-semibold text-[#4E1617]">
                    -₹{selectedSlip.otherDeductions.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Net Salary Amount Footer */}
            <div className="p-4 rounded-xl bg-neutral-900 dark:bg-neutral-950 text-white flex items-center justify-between border border-neutral-800">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block">
                  Net Salary Amount
                </span>
                <span className="text-2xl font-bold font-mono">
                  ₹{selectedSlip.netPayable.toLocaleString('en-IN')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => printPayslipDocument(selectedSlip)}
                className="px-4 py-2 rounded-xl bg-white hover:bg-neutral-100 text-black font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Payslip PDF</span>
              </button>
            </div>
          </div>
        )}
      </ModalShell>

      {/* Edit Payroll Modal */}
      <ModalShell
        isOpen={!!editingPayroll}
        onClose={() => setEditingPayroll(null)}
        title={`Adjust Payroll — ${editingPayroll?.employeeName || ''}`}
      >
        <form onSubmit={handleSaveEditPayroll} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                TDS Tax Deduction (₹)
              </label>
              <input
                type="number"
                value={editTdsDeduction}
                onChange={(e) => setEditTdsDeduction(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                Late Coming Deduction (₹)
              </label>
              <input
                type="number"
                value={editLatePenalty}
                onChange={(e) => setEditLatePenalty(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs font-mono"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#164C38] text-[#F2F2F2]"
            >
              Save Adjustments
            </button>
          </div>
        </form>
      </ModalShell>

      <ConfirmDialog
        isOpen={!!deletingPayroll}
        onClose={() => setDeletingPayroll(null)}
        onConfirm={() => {
          if (deletingPayroll) deletePayrollRecord(deletingPayroll.id);
        }}
        title="Delete Payroll Record"
        message={`Are you sure you want to delete the payroll record for ${deletingPayroll?.employeeName}?`}
        confirmLabel="Delete Record"
      />
    </div>
  );
}
