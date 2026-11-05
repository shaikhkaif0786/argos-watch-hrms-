import React, { useState, useMemo } from 'react';
import {
  FileText,
  Upload,
  Check,
  X,
  Search,
  FolderOpen,
  Edit3,
  Trash2,
  Printer,
  ArrowUpDown,
  Filter,
  Plus,
} from 'lucide-react';
import { useHRMS } from '../../context/HRMSContext';
import {
  ExportDropdown,
  AvatarInitials,
  StatusBadge,
  ModalShell,
  ConfirmDialog,
  ActionMenu,
} from '../ui/EnterpriseComponents';
import { DocumentVaultItem } from '../../types/hrms';
import { printOfficialLetter } from '../../lib/exportUtils';

export function DocumentsModule() {
  const {
    documents,
    scopedLetters,
    currentUser,
    permissions,
    uploadDocument,
    verifyDocument,
    updateDocument,
    deleteDocument,
    generateAndSaveLetter,
    employees,
  } = useHRMS();

  const [filterCat, setFilterCat] = useState('ALL');
  const [filterDept, setFilterDept] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'uploadedOn' | 'title' | 'employeeName'>('uploadedOn');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'LETTERS' | 'PAYSLIP'>('LETTERS');
  const [fileSize, setFileSize] = useState('420 KB');
  const [empId, setEmpId] = useState(currentUser.employeeId);
  const [targetScope, setTargetScope] = useState<'EMPLOYEE' | 'DEPARTMENT'>('EMPLOYEE');
  const [targetDepartment, setTargetDepartment] = useState(currentUser.department);

  // Edit Document State
  const [editingDoc, setEditingDoc] = useState<DocumentVaultItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState<'LETTERS' | 'PAYSLIP'>('LETTERS');
  const [editStatus, setEditStatus] = useState<DocumentVaultItem['status']>('VERIFIED');

  // Delete Confirmation
  const [deletingDoc, setDeletingDoc] = useState<DocumentVaultItem | null>(null);

  const departments = useMemo<string[]>(() => {
    const set = new Set<string>(employees.map((e) => e.department));
    return ['ALL', ...Array.from(set)];
  }, [employees]);

  const assignedTeamEmpIds = useMemo(() => {
    if (currentUser.role === 'MANAGER') {
      return new Set(
        employees
          .filter((e) => e.managerId === currentUser.employeeId || e.id === currentUser.employeeId)
          .map((e) => e.id)
      );
    }
    return new Set([currentUser.employeeId]);
  }, [employees, currentUser]);

  // Combine HR-added Letters (for the employee or their department) with Vault Documents,
  // excluding KYC, Experience, and Policy Acknowledgement, and renaming Offer Letter to "Letters"
  const combinedRecords = useMemo(() => {
    const normalizedDocs: (DocumentVaultItem & { displayCategory: string; isHRLetter?: boolean; letterBody?: string })[] = documents
      .filter((d) => {
        const rawCat = String(d.category).toUpperCase();
        const rawTitle = String(d.title).toLowerCase();
        // Remove KYC, Experience, and Policy Acknowledgement
        if (
          rawCat === 'KYC' ||
          rawCat === 'EXPERIENCE' ||
          rawCat === 'POLICY_ACK' ||
          rawTitle.includes('kyc') ||
          rawTitle.includes('experience') ||
          rawTitle.includes('policy')
        ) {
          return false;
        }
        return true;
      })
      .map((d) => {
        const rawCat = String(d.category).toUpperCase();
        const isLetter =
          rawCat === 'OFFER_LETTER' ||
          rawCat === 'LETTERS' ||
          rawCat === 'LETTER' ||
          d.title.toLowerCase().includes('letter');
        return {
          ...d,
          title: d.title.replace(/Offer Letter/gi, 'Letters'),
          displayCategory: isLetter ? 'Letters' : rawCat === 'PAYSLIP' ? 'Payslip' : 'Letters',
        };
      });

    // Also include HR-generated letters specifically for the employee or their assigned team
    const letterItems: (DocumentVaultItem & { displayCategory: string; isHRLetter?: boolean; letterBody?: string })[] = (
      scopedLetters || []
    )
      .filter((ltr: any) => {
        const tType = String(ltr.templateType || '').toLowerCase();
        const subj = String(ltr.subject || '').toLowerCase();
        if (tType.includes('experience') || subj.includes('experience') || subj.includes('policy')) {
          return false;
        }
        if (currentUser.role === 'EMPLOYEE' || permissions.Documents?.scope === 'SELF') {
          return ltr.employeeId === currentUser.employeeId;
        }
        if (currentUser.role === 'MANAGER' || permissions.Documents?.scope === 'TEAM') {
          return assignedTeamEmpIds.has(ltr.employeeId);
        }
        return true;
      })
      .map((ltr: any) => {
        const empMatch = employees.find((e) => e.id === ltr.employeeId);
        return {
          id: ltr.id,
          employeeId: ltr.employeeId,
          employeeName: ltr.employeeName || empMatch?.fullName || currentUser.fullName,
          department: empMatch?.department || currentUser.department,
          title: String(ltr.subject || 'Official HR Letter').replace(/Offer Letter/gi, 'Letters'),
          category: 'OFFER_LETTER' as const,
          displayCategory: 'Letters',
          uploadedOn: ltr.issuedDate || '2026-10-06',
          fileSize: '340 KB',
          status: 'VERIFIED' as const,
          verifiedBy: ltr.issuedBy || 'HR Department',
          isHRLetter: true,
          letterBody: ltr.content,
        };
      });

    // Merge and deduplicate by id
    const seen = new Set<string>();
    const merged: typeof normalizedDocs = [];
    for (const item of [...letterItems, ...normalizedDocs]) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        merged.push(item);
      }
    }
    return merged;
  }, [documents, scopedLetters, employees, currentUser, permissions.Documents, assignedTeamEmpIds]);

  const scopedDocs = useMemo(() => {
    const scope = permissions.Documents?.scope;
    return combinedRecords
      .filter((d) => {
        if (
          (currentUser.role === 'EMPLOYEE' || scope === 'SELF') &&
          d.employeeId !== currentUser.employeeId
        ) {
          return false;
        }
        if (
          (currentUser.role === 'MANAGER' || scope === 'TEAM') &&
          !assignedTeamEmpIds.has(d.employeeId)
        ) {
          return false;
        }
        if (filterCat !== 'ALL' && d.displayCategory.toUpperCase() !== filterCat) return false;
        if (filterDept !== 'ALL' && d.department !== filterDept) return false;
        if (filterStatus !== 'ALL' && d.status !== filterStatus) return false;
        if (
          searchQuery &&
          !d.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !d.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !d.displayCategory.toLowerCase().includes(searchQuery.toLowerCase())
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const dir = sortOrder === 'asc' ? 1 : -1;
        if (sortBy === 'uploadedOn') return a.uploadedOn.localeCompare(b.uploadedOn) * dir;
        if (sortBy === 'title') return a.title.localeCompare(b.title) * dir;
        if (sortBy === 'employeeName') return a.employeeName.localeCompare(b.employeeName) * dir;
        return 0;
      });
  }, [
    combinedRecords,
    permissions.Documents,
    currentUser,
    filterCat,
    filterDept,
    filterStatus,
    searchQuery,
    sortBy,
    sortOrder,
  ]);

  const printVerificationCertificate = (
    doc: DocumentVaultItem & { displayCategory?: string; letterBody?: string }
  ) => {
    const emp = employees.find((e) => e.id === doc.employeeId);
    printOfficialLetter({
      recipientName: doc.employeeName,
      employeeCode: emp?.employeeCode || 'ARG-EMP',
      designation: emp?.designation || 'Team Member',
      department: doc.department,
      joiningDate: emp?.joiningDate || '2023-01-01',
      annualCTC: emp?.annualCTC || 600000,
      letterType: 'OFFER',
      issuedBy: doc.verifiedBy || currentUser.fullName,
      customRemarks:
        doc.letterBody ||
        `Document "${doc.title}" (Category: ${doc.displayCategory || 'Letters'}) has been officially issued and verified on ${doc.uploadedOn}.`,
    });
  };

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (category === 'LETTERS' && (currentUser.role === 'HR' || currentUser.role === 'ADMIN')) {
      const targetEmp =
        targetScope === 'DEPARTMENT'
          ? employees.find((emp) => emp.department === targetDepartment) || employees[0]
          : employees.find((emp) => emp.id === empId) || employees[0];

      generateAndSaveLetter({
        employeeId: targetEmp.id,
        templateType: 'Letters' as any,
        subject:
          targetScope === 'DEPARTMENT'
            ? `[${targetDepartment} Dept] ${title}`
            : title,
        content: `Official letter issued by HR (${currentUser.fullName}) for ${
          targetScope === 'DEPARTMENT' ? `${targetDepartment} Department` : targetEmp.fullName
        }: ${title}.`,
      });
    }

    uploadDocument({
      employeeId: permissions.Documents?.scope === 'ALL' ? empId : currentUser.employeeId,
      title:
        targetScope === 'DEPARTMENT' && (currentUser.role === 'HR' || currentUser.role === 'ADMIN')
          ? `[${targetDepartment} Dept] ${title}`
          : title,
      category: category === 'LETTERS' ? 'OFFER_LETTER' : 'PAYSLIP',
      fileSize,
    });
    setShowModal(false);
    setTitle('');
  };

  const openEditDoc = (doc: DocumentVaultItem & { displayCategory?: string }) => {
    setEditingDoc(doc);
    setEditTitle(doc.title);
    setEditCategory(doc.displayCategory === 'Payslip' ? 'PAYSLIP' : 'LETTERS');
    setEditStatus(doc.status);
  };

  const handleSaveEditDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc) return;
    updateDocument(editingDoc.id, {
      title: editTitle,
      category: editCategory === 'LETTERS' ? 'OFFER_LETTER' : 'PAYSLIP',
      status: editStatus,
    });
    setEditingDoc(null);
  };

  const canModifyDoc = (_doc: DocumentVaultItem) => {
    if (currentUser.role === 'HR' || currentUser.role === 'ADMIN') return true;
    return false;
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1480px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#CBCBCB]">
        <div>
          <span className="px-2.5 py-0.5 rounded-md bg-[#164C38]/10 border border-[#164C38]/30 text-[#164C38] text-[10px] font-bold uppercase tracking-wider">
            Letters & Documents
          </span>
          <h1 className="text-xl font-bold text-[#141A17] tracking-tight mt-1.5">
            Letters & Documents Vault
          </h1>
          <p className="text-xs text-[#525854] mt-0.5">
            Official letters added by HR for you or your department, along with verified salary documents
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <ExportDropdown
            data={scopedDocs}
            filename="argos_letters_documents"
            title="Argos Watch — Letters & Documents"
          />
          {(currentUser.role === 'HR' || currentUser.role === 'ADMIN') && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#164C38] hover:bg-[#0F3627] text-[#F2F2F2] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Letter / Document</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Sort Controls — Vertically Stacked on Mobile */}
      <div className="bg-white border border-[#CBCBCB] rounded-xl p-4 space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 bg-[#F2F2F2] p-1.5 rounded-xl w-full lg:w-auto">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'LETTERS', label: 'Letters' },
              { id: 'PAYSLIP', label: 'Payslip' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFilterCat(cat.id)}
                className={`w-full sm:w-auto px-3.5 py-2 sm:py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-between sm:justify-center ${
                  filterCat === cat.id
                    ? 'bg-[#164C38] text-[#F2F2F2]'
                    : 'bg-white sm:bg-transparent text-[#525854] hover:text-[#141A17]'
                }`}
              >
                <span>{cat.label}</span>
                {filterCat === cat.id && (
                  <span className="w-2 h-2 rounded-full bg-emerald-300 sm:hidden" />
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
              placeholder="Search letters, department notices, or documents..."
              className="w-full pl-8 pr-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-xl text-xs text-[#141A17] placeholder:text-[#525854] focus:outline-none focus:border-[#4E1617]"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-2.5 pt-2.5 border-t border-[#F2F2F2]">
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#525854] mr-1">
              <Filter className="w-3 h-3" /> Filters:
            </span>
            {currentUser.role !== 'EMPLOYEE' && currentUser.role !== 'MANAGER' && (
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
              <option value="ALL">All Status</option>
              <option value="VERIFIED">VERIFIED</option>
              <option value="PENDING_VERIFICATION">PENDING_VERIFICATION</option>
              <option value="REJECTED">REJECTED</option>
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
              <option value="uploadedOn">Issued / Upload Date</option>
              <option value="title">Title</option>
              <option value="employeeName">Employee Name</option>
            </select>
            <button
              onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              className="px-3 py-2 bg-[#F2F2F2] hover:bg-[#CBCBCB] text-[#141A17] rounded-xl text-xs font-mono font-bold transition-colors cursor-pointer shrink-0"
            >
              {sortOrder === 'asc' ? 'ASC ↑' : 'DESC ↓'}
            </button>
          </div>
        </div>
      </div>

      {/* Letters & Documents — Mobile-First Vertical Cards + Desktop Table */}
      <div className="bg-white border border-[#CBCBCB] rounded-2xl overflow-hidden shadow-2xs">
        {/* Mobile App Cards */}
        <div className="md:hidden divide-y divide-[#CBCBCB]/60">
          {scopedDocs.map((doc) => (
            <div key={doc.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#164C38]/10 flex items-center justify-center text-[#164C38] shrink-0 mt-0.5">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-[#141A17] break-words">
                      {doc.title}
                    </p>
                    <p className="text-[11px] text-[#525854] mt-0.5">
                      {doc.employeeName} · {doc.department}
                    </p>
                  </div>
                </div>
                <StatusBadge status={doc.status} />
              </div>

              <div className="grid grid-cols-1 gap-1.5 p-2.5 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB]/70 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#525854]">Category</span>
                  <span className="px-2 py-0.5 rounded bg-[#164C38]/10 text-[#164C38] font-mono text-[11px] font-semibold">
                    {doc.displayCategory}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#525854]">Issued / Uploaded On</span>
                  <span className="font-mono font-semibold text-[#141A17]">{doc.uploadedOn}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#525854]">File Size</span>
                  <span className="font-mono text-[#525854]">{doc.fileSize}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-1">
                {doc.status === 'PENDING_VERIFICATION' &&
                  permissions.Documents?.actions.includes('APPROVE') && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => verifyDocument(doc.id, 'VERIFIED')}
                        className="min-h-[38px] inline-flex items-center justify-center gap-1 px-3 py-2 bg-[#164C38] text-white text-xs font-semibold rounded-xl cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" /> Verify
                      </button>
                      <button
                        onClick={() => verifyDocument(doc.id, 'REJECTED')}
                        className="min-h-[38px] inline-flex items-center justify-center gap-1 px-3 py-2 bg-[#4E1617]/10 text-[#4E1617] border border-[#4E1617]/30 text-xs font-semibold rounded-xl cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  )}

                <button
                  type="button"
                  onClick={() => printVerificationCertificate(doc)}
                  className="w-full sm:w-auto min-h-[40px] px-3.5 py-2 rounded-xl bg-[#F2F2F2] border border-[#CBCBCB] text-xs font-bold text-[#164C38] hover:border-[#164C38] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Download / Print</span>
                </button>
              </div>
            </div>
          ))}
          {scopedDocs.length === 0 && (
            <div className="py-10 text-center text-xs text-[#525854]">
              <FolderOpen className="w-6 h-6 text-[#525854] mx-auto mb-1.5" />
              No letters or documents found in this category.
            </div>
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#CBCBCB] bg-[#F2F2F2]">
                <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-[#525854]">
                  Letter / Document Title
                </th>
                <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-[#525854]">
                  Employee & Department
                </th>
                <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-[#525854]">
                  Category
                </th>
                <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-[#525854]">
                  Issued / Uploaded On
                </th>
                <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-[#525854]">
                  Size
                </th>
                <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-[#525854]">
                  Status
                </th>
                <th className="py-3 px-4 text-right text-[11px] font-bold uppercase tracking-wider text-[#525854]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2F2F2] text-xs">
              {scopedDocs.map((doc) => (
                <tr key={doc.id} className="hover:bg-[#F2F2F2] transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#164C38]/10 flex items-center justify-center text-[#164C38] shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-[#141A17]">{doc.title}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <AvatarInitials name={doc.employeeName} size="sm" />
                      <div>
                        <div className="font-semibold text-[#141A17]">{doc.employeeName}</div>
                        <div className="text-[11px] text-[#525854]">{doc.department}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-0.5 rounded bg-[#164C38]/10 text-[#164C38] font-mono text-[11px] font-semibold">
                      {doc.displayCategory}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[#141A17]">{doc.uploadedOn}</td>
                  <td className="py-3.5 px-4 font-mono text-[#525854]">{doc.fileSize}</td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={doc.status} />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {doc.status === 'PENDING_VERIFICATION' &&
                        permissions.Documents?.actions.includes('APPROVE') && (
                          <>
                            <button
                              onClick={() => verifyDocument(doc.id, 'VERIFIED')}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#164C38] hover:bg-[#0F3627] text-white text-[11px] font-semibold rounded transition-colors cursor-pointer"
                            >
                              <Check className="w-3 h-3" /> Verify
                            </button>
                            <button
                              onClick={() => verifyDocument(doc.id, 'REJECTED')}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#4E1617]/10 text-[#4E1617] border border-[#4E1617]/30 text-[11px] font-semibold rounded transition-colors cursor-pointer"
                            >
                              <X className="w-3 h-3" /> Reject
                            </button>
                          </>
                        )}

                      <button
                        type="button"
                        onClick={() => printVerificationCertificate(doc)}
                        className="px-2.5 py-1 rounded bg-[#F2F2F2] border border-[#CBCBCB] text-[11px] font-semibold text-[#164C38] hover:border-[#164C38] inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Printer className="w-3 h-3" />
                        Download / Print
                      </button>

                      {canModifyDoc(doc) && !doc.isHRLetter && (
                        <ActionMenu
                          items={[
                            {
                              label: 'Edit Metadata',
                              icon: <Edit3 className="w-3.5 h-3.5" />,
                              onClick: () => openEditDoc(doc),
                            },
                            {
                              label: 'Delete',
                              icon: <Trash2 className="w-3.5 h-3.5" />,
                              variant: 'danger' as const,
                              onClick: () => setDeletingDoc(doc),
                            },
                          ]}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {scopedDocs.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-[#525854]">
                    <FolderOpen className="w-6 h-6 text-[#525854] mx-auto mb-1.5" />
                    No letters or documents found in this category.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Upload Modal */}
      <ModalShell
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Add Letter or Document"
        subtitle="HR can issue letters for a specific employee or an entire department"
      >
        <form onSubmit={handleUpload} className="space-y-4">
          {permissions.Documents?.scope === 'ALL' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-[#141A17] mb-1">
                  Target Recipient Scope
                </label>
                <select
                  value={targetScope}
                  onChange={(e) => setTargetScope(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs"
                >
                  <option value="EMPLOYEE">Specific Employee</option>
                  <option value="DEPARTMENT">Entire Department</option>
                </select>
              </div>

              {targetScope === 'EMPLOYEE' ? (
                <div>
                  <label className="block text-xs font-semibold text-[#141A17] mb-1">
                    Assign to Employee
                  </label>
                  <select
                    value={empId}
                    onChange={(e) => setEmpId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs"
                  >
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.fullName} ({e.department})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-[#141A17] mb-1">
                    Assign to Department
                  </label>
                  <select
                    value={targetDepartment}
                    onChange={(e) => setTargetDepartment(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs"
                  >
                    {departments
                      .filter((d: string) => d !== 'ALL')
                      .map((d: string) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#141A17] mb-1">
              Letter / Document Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Official Appointment / Appraisal Letter"
              className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#141A17] mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs"
              >
                <option value="LETTERS">Letters</option>
                <option value="PAYSLIP">Payslip</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#141A17] mb-1">
                Estimated File Size
              </label>
              <input
                type="text"
                value={fileSize}
                onChange={(e) => setFileSize(e.target.value)}
                className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs font-mono"
              />
            </div>
          </div>

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
              Save & Publish
            </button>
          </div>
        </form>
      </ModalShell>

      {/* Edit Document Modal */}
      <ModalShell
        isOpen={!!editingDoc}
        onClose={() => setEditingDoc(null)}
        title="Edit Letter / Document Metadata"
        subtitle={editingDoc ? `${editingDoc.employeeName} • ${editingDoc.department}` : ''}
      >
        <form onSubmit={handleSaveEditDoc} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#141A17] mb-1">Title</label>
            <input
              type="text"
              required
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#141A17] mb-1">Category</label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value as any)}
                className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs"
              >
                <option value="LETTERS">Letters</option>
                <option value="PAYSLIP">Payslip</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#141A17] mb-1">Status</label>
              <select
                value={editStatus}
                disabled={currentUser.role !== 'HR' && currentUser.role !== 'ADMIN'}
                onChange={(e) => setEditStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs disabled:opacity-60"
              >
                <option value="PENDING_VERIFICATION">PENDING_VERIFICATION</option>
                <option value="VERIFIED">VERIFIED</option>
                <option value="REJECTED">REJECTED</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#CBCBCB]">
            <button
              type="button"
              onClick={() => setEditingDoc(null)}
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
        isOpen={!!deletingDoc}
        onClose={() => setDeletingDoc(null)}
        onConfirm={() => {
          if (deletingDoc) deleteDocument(deletingDoc.id);
        }}
        title="Delete Item?"
        message={
          deletingDoc
            ? `Are you sure you want to permanently remove "${deletingDoc.title}" for ${deletingDoc.employeeName}?`
            : ''
        }
        confirmLabel="Delete"
      />
    </div>
  );
}
