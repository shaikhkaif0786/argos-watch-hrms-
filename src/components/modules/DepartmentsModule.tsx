import React, { useState, useMemo } from 'react';
import {
  Building2,
  Users,
  Plus,
  Edit3,
  Trash2,
  Search,
  UserCheck,
  ArrowRightLeft,
  AlertTriangle,
  FolderTree,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  Download,
  DollarSign,
  MapPin,
  FileText,
} from 'lucide-react';
import { useHRMS } from '../../context/HRMSContext';
import { Department, UserRole } from '../../types/hrms';
import {
  AvatarInitials,
  ModalShell,
  ExportDropdown,
} from '../ui/EnterpriseComponents';
import { exportTableToCSV, exportTableToJSON } from '../../lib/exportUtils';

export function DepartmentsModule() {
  const {
    currentRole,
    currentUser,
    departments,
    allEmployees,
    addDepartment,
    updateDepartment,
    deleteDepartmentSafely,
    reassignDepartmentEmployees,
    addEmployeeToDepartment,
    removeEmployeeFromDepartment,
    transferEmployeeDepartment,
    addToast,
  } = useHRMS();

  const isAuthorized =
    currentRole === UserRole.ADMIN || currentRole === UserRole.HR;

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Add / Edit Department Modal
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [managerId, setManagerId] = useState('');

  // Safe Deletion & Resolution State
  const [deletingDept, setDeletingDept] = useState<Department | null>(null);
  const [reassignTargetDept, setReassignTargetDept] = useState('');

  // Direct Reassign Employees Wizard
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignSourceDept, setReassignSourceDept] = useState('');
  const [reassignDestinationDept, setReassignDestinationDept] = useState('');

  // Expanded Department Cards & Member Search
  const [expandedDeptId, setExpandedDeptId] = useState<string | null>(null);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  // Add Member to Department Modal State (Requirement 7)
  const [addingMemberToDept, setAddingMemberToDept] = useState<Department | null>(null);
  const [selectedEmpIdToAdd, setSelectedEmpIdToAdd] = useState('');
  const [addMemberFilter, setAddMemberFilter] = useState('');
  const [addMemberNote, setAddMemberNote] = useState('');

  // Remove Member from Department Confirmation Modal State (Requirement 7)
  const [removingMember, setRemovingMember] = useState<{
    empId: string;
    empName: string;
    empDesignation: string;
    deptName: string;
  } | null>(null);
  const [removeMemberReason, setRemoveMemberReason] = useState('');

  // Transfer Member to Another Department Modal State (Requirement 7)
  const [transferringMember, setTransferringMember] = useState<{
    empId: string;
    empName: string;
    empDesignation: string;
    currentDeptName: string;
  } | null>(null);
  const [transferTargetDeptName, setTransferTargetDeptName] = useState('');
  const [transferReason, setTransferReason] = useState('');

  // Calculate headcount and members map
  const departmentStats = useMemo(() => {
    const stats: Record<
      string,
      {
        count: number;
        members: typeof allEmployees;
        manager: typeof allEmployees[0] | undefined;
      }
    > = {};

    departments.forEach((dept) => {
      const members = allEmployees.filter(
        (e) => e.department.toLowerCase() === dept.name.toLowerCase()
      );
      const manager =
        allEmployees.find((e) => e.id === dept.managerId) ||
        allEmployees.find((e) => e.fullName === dept.managerName);

      stats[dept.id] = {
        count: members.length,
        members,
        manager,
      };
    });

    return stats;
  }, [departments, allEmployees]);

  // Employees unassigned to any formal department
  const unassignedEmployees = useMemo(() => {
    const deptNamesLower = new Set(departments.map((d) => d.name.toLowerCase()));
    return allEmployees.filter(
      (e) =>
        !e.department ||
        e.department.toLowerCase() === 'unassigned' ||
        !deptNamesLower.has(e.department.toLowerCase())
    );
  }, [allEmployees, departments]);

  // Filtered Departments
  const filteredDepartments = useMemo(() => {
    if (!searchQuery.trim()) return departments;
    const q = searchQuery.toLowerCase();
    return departments.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q) ||
        (d.managerName && d.managerName.toLowerCase().includes(q))
    );
  }, [departments, searchQuery]);

  // Total Company Headcount
  const totalEmployeesCount = allEmployees.length;

  const openCreateModal = () => {
    setEditingDept(null);
    setName('');
    setCode('');
    setManagerId(allEmployees[0]?.id || 'EMP-1001');
    setShowAddEditModal(true);
  };

  const openEditModal = (dept: Department) => {
    setEditingDept(dept);
    setName(dept.name);
    setCode(dept.code);
    setManagerId(dept.managerId || allEmployees[0]?.id || 'EMP-1001');
    setShowAddEditModal(true);
  };

  const handleSaveDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      addToast('Validation Error', 'Department name and code are required.', 'error');
      return;
    }

    const assignedManager = allEmployees.find((e) => e.id === managerId);
    const managerName = assignedManager?.fullName || 'Argos Leadership';

    if (editingDept) {
      updateDepartment(editingDept.id, {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        managerId,
        managerName,
      });
    } else {
      addDepartment({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        managerId,
        managerName,
        parentDepartmentId: null,
        location: '',
        description: '',
        annualBudget: 0,
      });
    }

    setShowAddEditModal(false);
  };

  const handleDeleteClick = (dept: Department) => {
    setDeletingDept(dept);
    // Find another department to default the migration destination
    const other = departments.find((d) => d.id !== dept.id);
    setReassignTargetDept(other ? other.name : '');
  };

  const handleExecuteDeletion = () => {
    if (!deletingDept) return;
    const res = deleteDepartmentSafely(deletingDept.id);
    if (res.success) {
      setDeletingDept(null);
    }
  };

  const handleReassignAndMigrate = () => {
    if (!deletingDept || !reassignTargetDept) {
      addToast('Target Required', 'Please select a destination department.', 'error');
      return;
    }
    reassignDepartmentEmployees(deletingDept.name, reassignTargetDept);
    // After migrating, re-attempt safe deletion
    const res = deleteDepartmentSafely(deletingDept.id);
    if (res.success) {
      setDeletingDept(null);
    }
  };

  const handleExecuteDirectReassignment = () => {
    if (!reassignSourceDept || !reassignDestinationDept) {
      addToast('Departments Required', 'Select both source and target departments.', 'error');
      return;
    }
    if (reassignSourceDept === reassignDestinationDept) {
      addToast('Invalid Selection', 'Source and target departments cannot be identical.', 'error');
      return;
    }
    reassignDepartmentEmployees(reassignSourceDept, reassignDestinationDept);
    setShowReassignModal(false);
  };

  // Requirement 7 Handlers: Add, Remove, Transfer Individual Members
  const openAddMemberModal = (dept: Department) => {
    const candidates = allEmployees.filter(
      (e) => e.department.toLowerCase() !== dept.name.toLowerCase()
    );
    setAddingMemberToDept(dept);
    setSelectedEmpIdToAdd(candidates[0]?.id || '');
    setAddMemberFilter('');
    setAddMemberNote('');
  };

  const handleConfirmAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingMemberToDept || !selectedEmpIdToAdd) {
      addToast('Selection Required', 'Please select an employee to add.', 'error');
      return;
    }
    addEmployeeToDepartment(selectedEmpIdToAdd, addingMemberToDept.name, addMemberNote.trim() || undefined);
    setExpandedDeptId(addingMemberToDept.id);
    setAddingMemberToDept(null);
  };

  const handleConfirmRemoveMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!removingMember) return;
    removeEmployeeFromDepartment(
      removingMember.empId,
      removingMember.deptName,
      removeMemberReason.trim() || undefined
    );
    setRemovingMember(null);
    setRemoveMemberReason('');
  };

  const openTransferMemberModal = (emp: typeof allEmployees[0], currentDeptName: string) => {
    const otherDepts = departments.filter(
      (d) => d.name.toLowerCase() !== currentDeptName.toLowerCase()
    );
    setTransferringMember({
      empId: emp.id,
      empName: emp.fullName,
      empDesignation: emp.designation,
      currentDeptName,
    });
    setTransferTargetDeptName(otherDepts[0]?.name || '');
    setTransferReason('');
  };

  const handleConfirmTransferMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferringMember || !transferTargetDeptName) {
      addToast('Destination Required', 'Please select a destination department.', 'error');
      return;
    }
    transferEmployeeDepartment(
      transferringMember.empId,
      transferTargetDeptName,
      transferReason.trim() || undefined
    );
    setTransferringMember(null);
    setTransferReason('');
  };

  if (!isAuthorized) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-white border-2 border-[#4E1617] rounded-2xl p-8 text-center space-y-4 shadow-sm">
          <ShieldAlert className="w-12 h-12 text-[#4E1617] mx-auto" />
          <h1 className="text-xl font-bold text-[#141A17]">
            Authorized HR & Admin Department Control
          </h1>
          <p className="text-sm text-[#525854] max-w-md mx-auto">
            You are logged in as <strong>{currentUser.role}</strong>. Creating, editing, or reassigning organizational departments is restricted to Human Resources and System Administrators.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#CBCBCB]">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-[#164C38] text-[#F2F2F2] text-[10px] font-bold font-mono uppercase tracking-wider">
              Organization Core
            </span>
            <span className="text-xs text-[#525854]">
              Single Source of Truth for Enterprise Units
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#141A17] tracking-tight mt-1">
            Department Management
          </h1>
          <p className="text-xs text-[#525854] mt-0.5">
            View department members, add existing employees, remove or transfer personnel between departments, and manage department heads with complete audit logging.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setReassignSourceDept(departments[0]?.name || '');
              setReassignDestinationDept(departments[1]?.name || '');
              setShowReassignModal(true);
            }}
            className="px-3.5 py-2 bg-[#F2F2F2] hover:bg-[#E5E5E5] text-[#141A17] border border-[#CBCBCB] rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            Batch Reassign
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2 bg-[#164C38] hover:bg-[#0F3627] text-[#F2F2F2] rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Department
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 bg-white border border-[#CBCBCB] rounded-xl shadow-xs">
          <span className="text-[10px] font-bold uppercase text-[#525854] block">
            Total Departments
          </span>
          <p className="text-2xl font-bold text-[#141A17] mt-1">
            {departments.length}
          </p>
          <span className="text-[11px] text-[#164C38] font-medium block mt-0.5">
            Active organizational units
          </span>
        </div>

        <div className="p-4 bg-white border border-[#CBCBCB] rounded-xl shadow-xs">
          <span className="text-[10px] font-bold uppercase text-[#525854] block">
            Total Headcount
          </span>
          <p className="text-2xl font-bold text-[#141A17] mt-1">
            {totalEmployeesCount}
          </p>
          <span className="text-[11px] text-[#525854] block mt-0.5">
            {unassignedEmployees.length > 0
              ? `${unassignedEmployees.length} unassigned`
              : 'All employees assigned'}
          </span>
        </div>

        <div className="p-4 bg-white border border-[#CBCBCB] rounded-xl shadow-xs">
          <span className="text-[10px] font-bold uppercase text-[#525854] block">
            Assigned Department Heads
          </span>
          <p className="text-2xl font-bold text-[#141A17] mt-1">
            {departments.filter((d) => d.managerName).length}
          </p>
          <span className="text-[11px] text-[#164C38] font-medium block mt-0.5">
            Leadership appointed
          </span>
        </div>

        <div className="p-4 bg-white border border-[#CBCBCB] rounded-xl shadow-xs">
          <span className="text-[10px] font-bold uppercase text-[#525854] block">
            Average Department Size
          </span>
          <p className="text-2xl font-bold text-[#141A17] mt-1">
            {departments.length > 0
              ? (totalEmployeesCount / departments.length).toFixed(1)
              : '0'}
          </p>
          <span className="text-[11px] text-[#525854] block mt-0.5">
            Members per unit
          </span>
        </div>
      </div>

      {/* Unassigned Employees Banner (if any employee was removed from a department) */}
      {unassignedEmployees.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-amber-900">
                Unassigned Personnel ({unassignedEmployees.length})
              </h3>
              <p className="text-[11px] text-amber-800">
                These employees are active in the HRMS directory but currently not assigned to a department. Click &ldquo;Add Member&rdquo; on any department card to assign them.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {unassignedEmployees.map((emp) => (
              <div
                key={emp.id}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-xs"
              >
                <span className="font-bold text-[#141A17]">{emp.fullName}</span>
                <span className="text-[11px] font-mono text-[#525854]">({emp.id} · {emp.designation})</span>
                <button
                  type="button"
                  onClick={() => openTransferMemberModal(emp, emp.department || 'Unassigned')}
                  className="text-[11px] font-semibold text-[#164C38] hover:underline cursor-pointer ml-1"
                >
                  Assign Dept →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Export Bar */}
      <div className="bg-white border border-[#CBCBCB] rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#525854] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search departments by name, code, or department head..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs placeholder:text-[#525854] focus:outline-none focus:ring-1 focus:ring-[#164C38]"
          />
        </div>

        <ExportDropdown
          onExportCSV={() =>
            exportTableToCSV(
              departments.map((d) => ({
                ID: d.id,
                'Department Name': d.name,
                'Department Code': d.code,
                'Department Head / Manager': d.managerName,
                Headcount: departmentStats[d.id]?.count || 0,
              })),
              'argos_departments_directory'
            )
          }
          onExportJSON={() =>
            exportTableToJSON(
              departments.map((d) => ({
                id: d.id,
                name: d.name,
                code: d.code,
                managerName: d.managerName,
                headcount: departmentStats[d.id]?.count || 0,
              })),
              'argos_departments_directory'
            )
          }
        />
      </div>

      {/* Department Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDepartments.map((dept) => {
          const stats = departmentStats[dept.id] || {
            count: 0,
            members: [],
            manager: undefined,
          };
          const isExpanded = expandedDeptId === dept.id;
          const filteredMembers = stats.members.filter((m) => {
            if (!isExpanded || !memberSearchQuery.trim()) return true;
            const q = memberSearchQuery.toLowerCase();
            return (
              m.fullName.toLowerCase().includes(q) ||
              m.id.toLowerCase().includes(q) ||
              m.designation.toLowerCase().includes(q)
            );
          });

          return (
            <div
              key={dept.id}
              className="bg-white border border-[#CBCBCB] hover:border-[#164C38] rounded-xl p-5 shadow-xs transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header row */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#164C38]/10 text-[#164C38] border border-[#164C38]/30">
                      {dept.code}
                    </span>
                    <h2 className="text-base font-bold text-[#141A17] mt-1">
                      {dept.name}
                    </h2>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-[#F2F2F2] text-[#141A17] border border-[#CBCBCB]">
                    {stats.count} {stats.count === 1 ? 'Member' : 'Members'}
                  </span>
                </div>

                {/* Assigned Department Head */}
                <div className="p-3 bg-[#F2F2F2] rounded-lg border border-[#CBCBCB] mb-3">
                  <span className="text-[10px] font-bold uppercase text-[#525854] block">
                    Department Head / Manager
                  </span>
                  <div className="flex items-center gap-2.5 mt-1">
                    <AvatarInitials name={dept.managerName || 'Head'} size="sm" />
                    <div>
                      <span className="text-xs font-bold text-[#141A17] block">
                        {dept.managerName || 'Unassigned'}
                      </span>
                      <span className="text-[11px] text-[#525854]">
                        {stats.manager?.designation || 'Department Leader'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expand Member List Drawer inside card (Requirement 7) */}
                {isExpanded && (
                  <div className="mt-4 pt-3 border-t border-[#CBCBCB] space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase text-[#164C38] block">
                        Department Members ({stats.members.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => openAddMemberModal(dept)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#164C38] hover:bg-[#0F3627] text-white text-[11px] font-semibold cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Member</span>
                      </button>
                    </div>

                    {stats.members.length > 2 && (
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-[#525854] absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={memberSearchQuery}
                          onChange={(e) => setMemberSearchQuery(e.target.value)}
                          placeholder="Search member name, ID, designation..."
                          className="w-full pl-8 pr-2.5 py-1.5 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-[11px] text-[#141A17] outline-none"
                        />
                      </div>
                    )}

                    <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
                      {filteredMembers.length === 0 ? (
                        <p className="text-xs text-[#525854] italic py-2">
                          No matching team members found in this department.
                        </p>
                      ) : (
                        filteredMembers.map((m) => (
                          <div
                            key={m.id}
                            className="p-2.5 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="font-bold text-xs text-[#141A17] block">
                                  {m.fullName}
                                </span>
                                <span className="text-[11px] text-[#525854] font-mono block">
                                  {m.id} · {m.designation}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-[#CBCBCB] text-[#164C38] font-semibold">
                                {m.role}
                              </span>
                            </div>

                            <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-[#CBCBCB]/60">
                              <button
                                type="button"
                                onClick={() => openTransferMemberModal(m, dept.name)}
                                className="px-2 py-1 rounded bg-white hover:bg-[#164C38] hover:text-white text-[#141A17] border border-[#CBCBCB] text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Transfer member to another department"
                              >
                                <ArrowRightLeft className="w-3 h-3" />
                                <span>Transfer</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setRemovingMember({
                                    empId: m.id,
                                    empName: m.fullName,
                                    empDesignation: m.designation,
                                    deptName: dept.name,
                                  });
                                  setRemoveMemberReason('');
                                }}
                                className="px-2 py-1 rounded bg-white hover:bg-[#4E1617] hover:text-white text-[#4E1617] border border-[#4E1617]/30 text-[10px] font-semibold transition-colors cursor-pointer"
                                title="Remove member from this department without deleting employee account"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#CBCBCB]">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setMemberSearchQuery('');
                      setExpandedDeptId(isExpanded ? null : dept.id);
                    }}
                    className="text-xs font-semibold text-[#164C38] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    {isExpanded ? 'Hide Members' : `Manage ${stats.count} Members`}
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {!isExpanded && (
                    <button
                      type="button"
                      onClick={() => openAddMemberModal(dept)}
                      className="text-xs font-semibold text-[#141A17] hover:text-[#164C38] cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Member</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEditModal(dept)}
                    className="p-1.5 rounded bg-[#F2F2F2] hover:bg-[#E5E5E5] text-[#141A17] cursor-pointer"
                    title="Edit Department"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteClick(dept)}
                    className="p-1.5 rounded hover:bg-[#4E1617]/10 text-[#4E1617] cursor-pointer"
                    title="Archive / Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ADD MEMBER TO DEPARTMENT MODAL (Requirement 7) */}
      {addingMemberToDept && (
        <ModalShell
          title={`Add Member to ${addingMemberToDept.name}`}
          subtitle="Select an existing employee to assign to this department. Their previous department assignment will be updated automatically."
          maxWidth="max-w-md"
        >
          <form onSubmit={handleConfirmAddMember} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                Filter Employees
              </label>
              <input
                type="text"
                value={addMemberFilter}
                onChange={(e) => setAddMemberFilter(e.target.value)}
                placeholder="Search by employee name, ID, or current department..."
                className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                Select Employee *
              </label>
              <select
                value={selectedEmpIdToAdd}
                onChange={(e) => setSelectedEmpIdToAdd(e.target.value)}
                className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs font-semibold text-[#141A17]"
                required
              >
                {allEmployees
                  .filter(
                    (e) =>
                      e.department.toLowerCase() !== addingMemberToDept.name.toLowerCase()
                  )
                  .filter((e) => {
                    if (!addMemberFilter.trim()) return true;
                    const q = addMemberFilter.toLowerCase();
                    return (
                      e.fullName.toLowerCase().includes(q) ||
                      e.id.toLowerCase().includes(q) ||
                      e.department.toLowerCase().includes(q) ||
                      e.designation.toLowerCase().includes(q)
                    );
                  })
                  .map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.id} · {emp.designation} — Currently: {emp.department})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                Assignment Note (Optional)
              </label>
              <input
                type="text"
                value={addMemberNote}
                onChange={(e) => setAddMemberNote(e.target.value)}
                placeholder="Reason or note for Activity Logs..."
                className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#CBCBCB]">
              <button
                type="button"
                onClick={() => setAddingMemberToDept(null)}
                className="px-4 py-2 text-xs font-semibold text-[#525854]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#164C38] hover:bg-[#0F3627] text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Confirm & Add to Department
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* REMOVE MEMBER FROM DEPARTMENT CONFIRMATION MODAL (Requirement 7) */}
      {removingMember && (
        <ModalShell
          title="Remove Member from Department"
          subtitle={`${removingMember.empName} (${removingMember.empId} · ${removingMember.empDesignation})`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleConfirmRemoveMember} className="space-y-4">
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 space-y-1">
              <strong className="block">Account Preservation Guarantee</strong>
              <span>
                Removing <strong>{removingMember.empName}</strong> from{' '}
                <strong>{removingMember.deptName}</strong> will set their department status to{' '}
                <strong>Unassigned</strong> without deleting their employee account, attendance, or payroll records.
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                Audit Reason / Remarks
              </label>
              <input
                type="text"
                value={removeMemberReason}
                onChange={(e) => setRemoveMemberReason(e.target.value)}
                placeholder="Optional reason for removing from this department..."
                className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#CBCBCB]">
              <button
                type="button"
                onClick={() => setRemovingMember(null)}
                className="px-4 py-2 text-xs font-semibold text-[#525854]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#4E1617] hover:bg-[#380F10] text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Confirm Removal from Department
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* TRANSFER MEMBER TO ANOTHER DEPARTMENT MODAL (Requirement 7) */}
      {transferringMember && (
        <ModalShell
          title="Transfer Employee to Another Department"
          subtitle={`${transferringMember.empName} (${transferringMember.empId} · ${transferringMember.empDesignation})`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleConfirmTransferMember} className="space-y-4">
            <div className="p-3 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs">
              <span className="text-[#525854] block">Current Department:</span>
              <strong className="text-[#141A17]">{transferringMember.currentDeptName}</strong>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                Destination Department *
              </label>
              <select
                value={transferTargetDeptName}
                onChange={(e) => setTransferTargetDeptName(e.target.value)}
                className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs font-semibold text-[#164C38]"
                required
              >
                {departments
                  .filter(
                    (d) =>
                      d.name.toLowerCase() !==
                      transferringMember.currentDeptName.toLowerCase()
                  )
                  .map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name} ({d.code})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                Transfer Note / Reason
              </label>
              <input
                type="text"
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                placeholder="Reason for department transfer (logged in Activity Logs)..."
                className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#CBCBCB]">
              <button
                type="button"
                onClick={() => setTransferringMember(null)}
                className="px-4 py-2 text-xs font-semibold text-[#525854]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#164C38] hover:bg-[#0F3627] text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Confirm Department Transfer
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* ADD / EDIT DEPARTMENT MODAL */}
      {showAddEditModal && (
        <ModalShell
          title={editingDept ? `Edit Department — ${editingDept.name}` : 'Add New Department'}
          subtitle="Manage Department Name, Code, and Department Head"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleSaveDepartment} className="space-y-4">
            <div className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                  Department Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Horological Research & Assembly"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                  Department Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., HRA, OPS, MKT"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                  Department Head / Manager *
                </label>
                <select
                  value={managerId}
                  onChange={(e) => setManagerId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs font-medium"
                >
                  {allEmployees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.fullName} ({e.designation} · {e.department})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#CBCBCB]">
              <button
                type="button"
                onClick={() => setShowAddEditModal(false)}
                className="px-4 py-2 text-xs font-semibold text-[#525854]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#164C38] hover:bg-[#0F3627] text-[#F2F2F2] rounded-lg text-xs font-semibold shadow-sm cursor-pointer"
              >
                {editingDept ? 'Save Changes' : 'Create Department'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* SAFE DELETION / REASSIGNMENT RESOLUTION MODAL */}
      {deletingDept && (
        <ModalShell
          title={`Archive / Delete — ${deletingDept.name}`}
          subtitle={`Department Code: ${deletingDept.code}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            {departmentStats[deletingDept.id]?.count > 0 ? (
              <>
                <div className="p-3.5 bg-[#4E1617]/10 border border-[#4E1617]/30 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-[#4E1617] shrink-0 mt-0.5" />
                  <div className="text-xs text-[#141A17]">
                    <strong className="block text-[#4E1617]">
                      Active Dependencies Detected
                    </strong>
                    There are currently{' '}
                    <strong>{departmentStats[deletingDept.id].count} employee(s)</strong>{' '}
                    assigned to <strong>{deletingDept.name}</strong>. Enterprise policy prohibits deleting departments with active dependencies to avoid orphan historical records.
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#141A17] mb-1">
                    Migrate Assigned Employees To *
                  </label>
                  <select
                    value={reassignTargetDept}
                    onChange={(e) => setReassignTargetDept(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs font-semibold text-[#164C38]"
                  >
                    {departments
                      .filter((d) => d.id !== deletingDept.id)
                      .map((d) => (
                        <option key={d.id} value={d.name}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#CBCBCB]">
                  <button
                    type="button"
                    onClick={() => setDeletingDept(null)}
                    className="px-4 py-2 text-xs font-semibold text-[#525854]"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleReassignAndMigrate}
                    className="px-4 py-2 bg-[#164C38] hover:bg-[#0F3627] text-[#F2F2F2] rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Reassign {departmentStats[deletingDept.id].count} Members & Delete
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-[#525854]">
                  This department currently has <strong>0 assigned employees</strong>. It can be safely removed without impacting historical employment profiles.
                </p>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#CBCBCB]">
                  <button
                    type="button"
                    onClick={() => setDeletingDept(null)}
                    className="px-4 py-2 text-xs font-semibold text-[#525854]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteDeletion}
                    className="px-4 py-2 bg-[#4E1617] hover:bg-[#380F10] text-[#F2F2F2] rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Confirm Deletion
                  </button>
                </div>
              </>
            )}
          </div>
        </ModalShell>
      )}

      {/* DIRECT PERSONNEL REASSIGNMENT WIZARD */}
      {showReassignModal && (
        <ModalShell
          title="Batch Personnel Reassignment Wizard"
          subtitle="Migrate employee groups between enterprise departments with complete activity logging"
          maxWidth="max-w-lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                  Source Department
                </label>
                <select
                  value={reassignSourceDept}
                  onChange={(e) => setReassignSourceDept(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs font-semibold"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name} ({departmentStats[d.id]?.count || 0} members)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                  Destination Department
                </label>
                <select
                  value={reassignDestinationDept}
                  onChange={(e) => setReassignDestinationDept(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs font-semibold text-[#164C38]"
                >
                  {departments
                    .filter((d) => d.name !== reassignSourceDept)
                    .map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="p-3 bg-[#F2F2F2] rounded-xl border border-[#CBCBCB] text-xs text-[#525854]">
              <strong>Migration Confirmation:</strong> All employees currently belonging to <strong>{reassignSourceDept}</strong> will be updated to <strong>{reassignDestinationDept}</strong>. This update will be recorded in the system audit trail.
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#CBCBCB]">
              <button
                type="button"
                onClick={() => setShowReassignModal(false)}
                className="px-4 py-2 text-xs font-semibold text-[#525854]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteDirectReassignment}
                className="px-5 py-2 bg-[#164C38] hover:bg-[#0F3627] text-[#F2F2F2] text-xs font-semibold rounded-lg cursor-pointer"
              >
                Confirm Reassignment
              </button>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
