import React, { useState, useMemo } from 'react';
import {
  Building2,
  Users,
  Search,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  UserCheck,
  Briefcase,
  Layers,
  Network,
  Plus,
  Edit3,
  ArrowRight,
  Filter,
  Shield,
  Eye,
  CheckCircle2,
  Sparkles,
  GitBranch,
  AlertTriangle,
  ArrowLeft,
  CornerDownRight,
  ShieldCheck,
  User,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Crown,
} from 'lucide-react';
import { useHRMS } from '../../context/HRMSContext';
import { Employee, Department, UserRole } from '../../types/hrms';
import { AvatarInitials, ModalShell } from '../ui/EnterpriseComponents';

interface ReportingNode {
  employee: Employee;
  directReports: ReportingNode[];
  totalSubtreeCount: number;
}

export function OrgTreesModule() {
  const {
    currentUser,
    currentRole,
    allEmployees,
    departments,
    updateEmployee,
    addToast,
    openEmployeeProfile,
  } = useHRMS();

  const isHRAdmin =
    currentRole === UserRole.ADMIN || currentRole === UserRole.HR;

  // Primary Tree Mode: 'department-tree' vs 'employee-tree'
  const [treeMode, setTreeMode] = useState<'department-tree' | 'employee-tree'>('department-tree');

  // Search Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Department Drill-down Screen State (Mobile-First)
  const [drillDownDeptId, setDrillDownDeptId] = useState<string | null>(null);

  // Department Card Expandable State
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({
    'DEPT-HR': true,
    'DEPT-OPS': true,
    'DEPT-INV': false,
    'DEPT-ACC': false,
    'DEPT-APD': false,
    'DEPT-STR': false,
  });

  // Department Tree Zoom & View Mode State
  const [deptTreeZoom, setDeptTreeZoom] = useState<number>(1.0);
  const [deptViewMode, setDeptViewMode] = useState<'hierarchy' | 'cards'>('hierarchy');

  // Employee Tree Drill-Down State (Mobile-first drill-down breadcrumb hierarchy)
  const [drillDownManagerId, setDrillDownManagerId] = useState<string | null>(null);

  // Employee Tree Expandable Mode (Expand All vs Accordion)
  const [empViewType, setEmpViewType] = useState<'drilldown' | 'expandable'>('drilldown');
  const [expandedEmpNodes, setExpandedEmpNodes] = useState<Record<string, boolean>>({
    'EMP-1001': true,
    'EMP-1003': true,
    'EMP-1002': true,
  });

  // Helper: Compute all descendants (direct and indirect reports) for circular reporting validation
  const getDescendantIds = (targetId: string, emps: Employee[]): Set<string> => {
    const descendants = new Set<string>();
    const queue = [targetId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const directReports = emps.filter((e) => e.managerId === current && e.id !== current);
      for (const report of directReports) {
        if (!descendants.has(report.id)) {
          descendants.add(report.id);
          queue.push(report.id);
        }
      }
    }
    return descendants;
  };

  // Reorganize Manager Assignment State
  const [reorgTargetEmp, setReorgTargetEmp] = useState<Employee | null>(null);
  const [selectedNewManagerId, setSelectedNewManagerId] = useState('');
  const [reorgError, setReorgError] = useState('');

  const invalidManagerIds = useMemo(() => {
    if (!reorgTargetEmp) return new Set<string>();
    const set = getDescendantIds(reorgTargetEmp.id, allEmployees);
    set.add(reorgTargetEmp.id);
    return set;
  }, [reorgTargetEmp, allEmployees]);

  // Handle saving manager reorganization
  const handleSaveReorg = () => {
    if (!reorgTargetEmp || !selectedNewManagerId) return;
    setReorgError('');

    if (invalidManagerIds.has(selectedNewManagerId)) {
      setReorgError(
        `Circular Dependency: ${reorgTargetEmp.fullName} cannot report to an employee in their own direct or indirect reporting line.`
      );
      addToast(
        'Circular Assignment Prohibited',
        'An employee cannot report to themselves or anyone in their reporting line.',
        'error'
      );
      return;
    }

    const newMgr = allEmployees.find((e) => e.id === selectedNewManagerId);
    if (!newMgr) return;

    const previousManager = reorgTargetEmp.managerName || 'None';

    updateEmployee(reorgTargetEmp.id, {
      reportingManager: newMgr.fullName,
      managerId: newMgr.id,
      managerUid: newMgr.uid,
    });

    addToast(
      'Reporting Line Updated',
      `${reorgTargetEmp.fullName} now reports to ${newMgr.fullName}. (Was: ${previousManager})`,
      'success'
    );
    setReorgTargetEmp(null);
    setSelectedNewManagerId('');
    setReorgError('');
  };

  // Department Expansion helpers
  const toggleDept = (deptId: string) => {
    setExpandedDepts((prev) => ({ ...prev, [deptId]: !prev[deptId] }));
  };

  const expandAllDepts = () => {
    const next: Record<string, boolean> = {};
    departments.forEach((d) => (next[d.id] = true));
    setExpandedDepts(next);
  };

  const collapseAllDepts = () => {
    setExpandedDepts({});
  };

  // Employee Node expansion helpers
  const toggleEmp = (empId: string) => {
    setExpandedEmpNodes((prev) => ({ ...prev, [empId]: !prev[empId] }));
  };

  const expandAllEmps = () => {
    const next: Record<string, boolean> = {};
    allEmployees.forEach((e) => (next[e.id] = true));
    setExpandedEmpNodes(next);
  };

  const collapseAllEmps = () => {
    setExpandedEmpNodes({});
  };

  // Build Department Statistics Map
  const departmentStats = useMemo(() => {
    const stats: Record<
      string,
      {
        count: number;
        members: typeof allEmployees;
        head: typeof allEmployees[0] | undefined;
      }
    > = {};

    departments.forEach((dept) => {
      const members = allEmployees.filter(
        (e) => e.department.toLowerCase() === dept.name.toLowerCase()
      );
      const head =
        allEmployees.find((e) => e.id === dept.managerId) ||
        allEmployees.find((e) => e.fullName === dept.managerName);

      stats[dept.id] = {
        count: members.length,
        members,
        head,
      };
    });

    return stats;
  }, [departments, allEmployees]);

  // Filtered Departments
  const filteredDepartments = useMemo(() => {
    if (!searchQuery.trim()) return departments;
    const q = searchQuery.toLowerCase().trim();
    return departments.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q) ||
        (d.managerName && d.managerName.toLowerCase().includes(q))
    );
  }, [departments, searchQuery]);

  // Build Employee Reporting Tree with Subtree Counts
  const reportingHierarchy = useMemo(() => {
    const empMap = new Map<string, Employee>();
    allEmployees.forEach((e) => empMap.set(e.id, e));

    const childrenMap = new Map<string, Employee[]>();
    allEmployees.forEach((e) => {
      const mId = e.managerId;
      if (mId && mId !== e.id && empMap.has(mId)) {
        if (!childrenMap.has(mId)) childrenMap.set(mId, []);
        childrenMap.get(mId)!.push(e);
      }
    });

    const buildNode = (emp: Employee): ReportingNode => {
      const directList = childrenMap.get(emp.id) || [];
      const directReportNodes = directList.map(buildNode);
      const totalSubtree = directReportNodes.reduce(
        (acc, child) => acc + 1 + child.totalSubtreeCount,
        0
      );

      return {
        employee: emp,
        directReports: directReportNodes,
        totalSubtreeCount: totalSubtree,
      };
    };

    const roots = allEmployees.filter(
      (e) => !e.managerId || e.managerId === e.id || !empMap.has(e.managerId)
    );

    return roots.map(buildNode);
  }, [allEmployees]);

  // Reporting Hierarchy Node Map for quick drill-down lookup
  const reportingNodeMap = useMemo(() => {
    const map = new Map<string, ReportingNode>();
    const traverse = (node: ReportingNode) => {
      map.set(node.employee.id, node);
      node.directReports.forEach(traverse);
    };
    reportingHierarchy.forEach(traverse);
    return map;
  }, [reportingHierarchy]);

  // Current drill-down manager node
  const activeDrillDownNode = useMemo(() => {
    if (!drillDownManagerId) return null;
    return reportingNodeMap.get(drillDownManagerId) || null;
  }, [drillDownManagerId, reportingNodeMap]);

  // Compute Breadcrumb Trail for Employee Drill-Down
  const employeeBreadcrumbs = useMemo(() => {
    if (!activeDrillDownNode) return [];
    const trail: Employee[] = [];
    let currentId: string | undefined = activeDrillDownNode.employee.id;
    const visited = new Set<string>();

    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const emp = allEmployees.find((e) => e.id === currentId);
      if (emp) {
        trail.unshift(emp);
        currentId = emp.managerId && emp.managerId !== emp.id ? emp.managerId : undefined;
      } else {
        break;
      }
    }
    return trail;
  }, [activeDrillDownNode, allEmployees]);

  // Filtered Employees for Employee Tree search
  const filteredEmployeeSearchList = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return allEmployees.filter(
      (e) =>
        e.fullName.toLowerCase().includes(q) ||
        e.employeeCode.toLowerCase().includes(q) ||
        e.designation.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q)
    );
  }, [allEmployees, searchQuery]);

  // Selected Drill-Down Department
  const activeDrillDownDept = useMemo(() => {
    if (!drillDownDeptId) return null;
    return departments.find((d) => d.id === drillDownDeptId) || null;
  }, [drillDownDeptId, departments]);

  return (
    <div className="space-y-5 p-3.5 sm:p-6 max-w-7xl mx-auto animate-in fade-in duration-150">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#C6C6CD] dark:border-[#1E293B]">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-[#0F172A] text-white dark:bg-white dark:text-[#0F172A] text-[10px] font-bold font-mono uppercase tracking-wider">
              Organization Structure
            </span>
            <span className="text-xs text-[#45464D] dark:text-[#94A3B8]">
              Executive Precision HRMS
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#191C1E] dark:text-[#EFF1F3] tracking-tight mt-1">
            {treeMode === 'department-tree' ? 'Department Tree' : 'Employee Hierarchy Tree'}
          </h1>
          <p className="text-xs text-[#45464D] dark:text-[#94A3B8] mt-0.5">
            {treeMode === 'department-tree'
              ? 'Mobile-first overview of company divisions, department heads, and team headcounts.'
              : 'Direct and indirect reporting chains, leadership spans, and supervisory hierarchy.'}
          </p>
        </div>

        {/* Tree Mode Switcher Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[#ECEEF0] dark:bg-[#1E293B] rounded-xl border border-[#C6C6CD] dark:border-[#334155] self-start sm:self-center">
          <button
            type="button"
            onClick={() => {
              setTreeMode('department-tree');
              setDrillDownDeptId(null);
              setSearchQuery('');
            }}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all ${
              treeMode === 'department-tree'
                ? 'bg-[#0F172A] text-white dark:bg-white dark:text-[#0F172A] shadow-xs'
                : 'text-[#45464D] dark:text-[#94A3B8] hover:text-[#191C1E] dark:hover:text-[#EFF1F3]'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Department Tree</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTreeMode('employee-tree');
              setDrillDownManagerId(null);
              setSearchQuery('');
            }}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all ${
              treeMode === 'employee-tree'
                ? 'bg-[#0F172A] text-white dark:bg-white dark:text-[#0F172A] shadow-xs'
                : 'text-[#45464D] dark:text-[#94A3B8] hover:text-[#191C1E] dark:hover:text-[#EFF1F3]'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Employee Tree</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. SEPARATE SCREEN: DEPARTMENT TREE                                       */}
      {/* ========================================================================= */}
      {treeMode === 'department-tree' && (
        <div className="space-y-5">
          {/* If Drilling Down into a specific Department on Mobile */}
          {activeDrillDownDept ? (
            <div className="space-y-4">
              {/* Back Button & Breadcrumbs */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setDrillDownDeptId(null)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#111827] border border-[#C6C6CD] dark:border-[#1E293B] text-xs font-semibold text-[#191C1E] dark:text-[#EFF1F3] hover:bg-[#F2F4F6] cursor-pointer transition-colors shadow-xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-[#0051D5]" />
                  <span>Back to All Departments</span>
                </button>

                <span className="text-xs font-mono font-bold text-[#0051D5] dark:text-[#3B82F6]">
                  {departmentStats[activeDrillDownDept.id]?.count || 0} Members
                </span>
              </div>

              {/* Department Hero Card */}
              <div className="bg-white dark:bg-[#111827] border border-[#C6C6CD] dark:border-[#1E293B] rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="inline-block text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-[#DBE1FF] text-[#0051D5] dark:bg-[#1E3A8A] dark:text-[#DBE1FF]">
                      {activeDrillDownDept.code}
                    </span>
                    <h2 className="text-xl font-bold text-[#191C1E] dark:text-[#EFF1F3] mt-1.5">
                      {activeDrillDownDept.name}
                    </h2>
                    <p className="text-xs text-[#45464D] dark:text-[#94A3B8] mt-0.5">
                      Official enterprise division unit
                    </p>
                  </div>

                  <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-[#F2F4F6] dark:bg-[#1E293B] text-[#191C1E] dark:text-[#EFF1F3] border border-[#C6C6CD] dark:border-[#334155]">
                    {departmentStats[activeDrillDownDept.id]?.count || 0} Team Members
                  </span>
                </div>

                {/* Department Head Spotlight Card */}
                {departmentStats[activeDrillDownDept.id]?.head ? (
                  <div
                    onClick={() =>
                      openEmployeeProfile(departmentStats[activeDrillDownDept.id]!.head!.id)
                    }
                    className="p-3.5 rounded-xl bg-[#F7F9FB] dark:bg-[#1E293B]/60 border border-[#E2E8F0] dark:border-[#334155] flex items-center justify-between cursor-pointer hover:border-[#0051D5] transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <AvatarInitials
                        name={departmentStats[activeDrillDownDept.id]!.head!.fullName}
                        size="md"
                      />
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#0051D5] dark:text-[#3B82F6] block tracking-wider">
                          Department Head
                        </span>
                        <span className="text-sm font-bold text-[#191C1E] dark:text-[#EFF1F3]">
                          {departmentStats[activeDrillDownDept.id]!.head!.fullName}
                        </span>
                        <span className="text-xs text-[#45464D] dark:text-[#94A3B8] block">
                          {departmentStats[activeDrillDownDept.id]!.head!.designation}
                        </span>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-[#76777D]" />
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-[#F2F4F6] dark:bg-[#1E293B] text-xs text-[#45464D] dark:text-[#94A3B8]">
                    Department Head: {activeDrillDownDept.managerName || 'Unassigned'}
                  </div>
                )}
              </div>

              {/* Members Roster List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#191C1E] dark:text-[#EFF1F3] uppercase tracking-wider">
                    Assigned Employees ({departmentStats[activeDrillDownDept.id]?.count || 0})
                  </h3>
                  <span className="text-xs text-[#45464D] dark:text-[#94A3B8]">
                    Tap employee to open full record
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(departmentStats[activeDrillDownDept.id]?.members || []).map((emp) => (
                    <div
                      key={emp.id}
                      onClick={() => openEmployeeProfile(emp.id)}
                      className="bg-white dark:bg-[#111827] border border-[#C6C6CD] dark:border-[#1E293B] hover:border-[#0051D5] dark:hover:border-[#3B82F6] rounded-xl p-3.5 shadow-2xs cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <AvatarInitials name={emp.fullName} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-[#191C1E] dark:text-[#EFF1F3] truncate">
                              {emp.fullName}
                            </span>
                            <span className="font-mono text-[10px] text-[#0051D5] dark:text-[#3B82F6] shrink-0">
                              {emp.employeeCode}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#45464D] dark:text-[#94A3B8] truncate">
                            {emp.designation}
                          </p>
                          <div className="flex items-center gap-1.5 mt-2">
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#F2F4F6] dark:bg-[#1E293B] text-[#45464D] dark:text-[#94A3B8] border border-[#C6C6CD] dark:border-[#334155]">
                              {emp.role}
                            </span>
                            <span className="text-[10px] text-[#76777D] truncate">
                              Reports to: {emp.managerName || (emp as any).reportingManager || 'Leadership'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Main Department Tree Overview */
            <>
              {/* Top Metrics Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
                <div className="bg-white dark:bg-[#111827] border border-[#C6C6CD] dark:border-[#1E293B] rounded-xl p-3 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase text-[#45464D] dark:text-[#94A3B8] block">
                    Total Departments
                  </span>
                  <span className="text-lg sm:text-xl font-bold font-mono text-[#191C1E] dark:text-[#EFF1F3] mt-0.5 block">
                    {departments.length}
                  </span>
                </div>
                <div className="bg-white dark:bg-[#111827] border border-[#C6C6CD] dark:border-[#1E293B] rounded-xl p-3 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase text-[#0051D5] dark:text-[#3B82F6] block">
                    Department Heads
                  </span>
                  <span className="text-lg sm:text-xl font-bold font-mono text-[#0051D5] dark:text-[#3B82F6] mt-0.5 block">
                    {departments.filter((d) => d.managerName).length}
                  </span>
                </div>
                <div className="bg-white dark:bg-[#111827] border border-[#C6C6CD] dark:border-[#1E293B] rounded-xl p-3 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase text-[#45464D] dark:text-[#94A3B8] block">
                    Total Headcount
                  </span>
                  <span className="text-lg sm:text-xl font-bold font-mono text-[#191C1E] dark:text-[#EFF1F3] mt-0.5 block">
                    {allEmployees.length}
                  </span>
                </div>
                <div className="bg-white dark:bg-[#111827] border border-[#C6C6CD] dark:border-[#1E293B] rounded-xl p-3 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase text-[#059669] block">
                    Avg Team Size
                  </span>
                  <span className="text-lg sm:text-xl font-bold font-mono text-[#059669] mt-0.5 block">
                    {departments.length > 0 ? Math.round(allEmployees.length / departments.length) : 0}
                  </span>
                </div>
              </div>

              {/* Search & Action Controls + Zoom Toolbar */}
              <div className="bg-white dark:bg-[#111827] border border-[#C6C6CD] dark:border-[#1E293B] rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2.5 shadow-2xs">
                <div className="relative flex-1 w-full">
                  <Search className="w-3.5 h-3.5 text-[#76777D] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search department name, code, designation, or employee..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-[#F2F4F6] dark:bg-[#1E293B] border border-[#C6C6CD] dark:border-[#334155] rounded-lg text-xs text-[#191C1E] dark:text-[#EFF1F3] placeholder:text-[#76777D] focus:outline-none focus:border-[#0051D5]"
                  />
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0 flex-wrap">
                  {/* View Mode Toggle */}
                  <div className="flex items-center bg-[#F2F4F6] dark:bg-[#1E293B] p-0.5 rounded-lg border border-[#C6C6CD] dark:border-[#334155]">
                    <button
                      type="button"
                      onClick={() => setDeptViewMode('hierarchy')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                        deptViewMode === 'hierarchy'
                          ? 'bg-white dark:bg-[#0F172A] text-[#191C1E] dark:text-[#EFF1F3] shadow-xs'
                          : 'text-[#45464D] dark:text-[#94A3B8]'
                      }`}
                    >
                      Hierarchy Tree
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeptViewMode('cards')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                        deptViewMode === 'cards'
                          ? 'bg-white dark:bg-[#0F172A] text-[#191C1E] dark:text-[#EFF1F3] shadow-xs'
                          : 'text-[#45464D] dark:text-[#94A3B8]'
                      }`}
                    >
                      Grid Cards
                    </button>
                  </div>

                  {/* Zoom Controls */}
                  {deptViewMode === 'hierarchy' && (
                    <div className="flex items-center bg-[#F2F4F6] dark:bg-[#1E293B] rounded-lg border border-[#C6C6CD] dark:border-[#334155] p-0.5">
                      <button
                        type="button"
                        onClick={() => setDeptTreeZoom((z) => Math.max(0.6, Number((z - 0.1).toFixed(1))))}
                        className="p-1 hover:bg-white dark:hover:bg-[#0F172A] rounded text-[#45464D] dark:text-[#94A3B8]"
                        title="Zoom Out"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeptTreeZoom(1.0)}
                        className="px-1.5 text-[10px] font-mono font-bold text-[#191C1E] dark:text-[#EFF1F3]"
                        title="Reset Zoom"
                      >
                        {Math.round(deptTreeZoom * 100)}%
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeptTreeZoom((z) => Math.min(1.4, Number((z + 0.1).toFixed(1))))}
                        className="p-1 hover:bg-white dark:hover:bg-[#0F172A] rounded text-[#45464D] dark:text-[#94A3B8]"
                        title="Zoom In"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={expandAllDepts}
                      className="px-2.5 py-1 text-xs font-semibold text-[#0051D5] dark:text-[#3B82F6] hover:bg-[#F2F4F6] dark:hover:bg-[#1E293B] rounded-lg cursor-pointer"
                    >
                      Expand All
                    </button>
                    <span className="text-[#C6C6CD]">|</span>
                    <button
                      type="button"
                      onClick={collapseAllDepts}
                      className="px-2.5 py-1 text-xs font-semibold text-[#45464D] dark:text-[#94A3B8] hover:bg-[#F2F4F6] dark:hover:bg-[#1E293B] rounded-lg cursor-pointer"
                    >
                      Collapse All
                    </button>
                  </div>
                </div>
              </div>

              {/* VIEW 1: TRUE HIERARCHICAL ORGANIZATION CHART (Requirement 4) */}
              {deptViewMode === 'hierarchy' ? (
                <div className="bg-white dark:bg-[#111827] border border-[#C6C6CD] dark:border-[#1E293B] rounded-2xl p-6 shadow-xs overflow-x-auto min-h-[600px]">
                  <div
                    className="flex flex-col items-center min-w-max transition-transform duration-200"
                    style={{ transform: `scale(${deptTreeZoom})`, transformOrigin: 'top center' }}
                  >
                    {/* LEVEL 1: ROOT APEX (Managing Director & CEO / Executive Board) */}
                    <div className="flex flex-col items-center">
                      <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-white rounded-2xl p-4 shadow-md border border-[#334155] w-80 text-center relative">
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-amber-400 text-[#0F172A] font-bold text-[10px] tracking-wider uppercase flex items-center gap-1 shadow-xs">
                          <Crown className="w-3 h-3" />
                          <span>Apex Leadership</span>
                        </div>
                        <div className="text-base font-bold mt-1 tracking-tight">
                          Argos Executive Board
                        </div>
                        <div className="text-xs text-neutral-300 mt-0.5">
                          Managing Director & Chief Executive Officer
                        </div>
                        <div className="flex items-center justify-center gap-2 mt-2 pt-2 border-t border-neutral-700/60 text-[11px] font-mono">
                          <span className="text-amber-400 font-bold">
                            {allEmployees.length} Total Workforce
                          </span>
                          <span className="text-neutral-400">•</span>
                          <span className="text-neutral-300">
                            {departments.length} Divisions
                          </span>
                        </div>
                      </div>

                      {/* Stem from Apex down to Distributor */}
                      <div className="w-0.5 h-8 bg-neutral-300 dark:bg-neutral-700" />
                    </div>

                    {/* LEVEL 2 & 3: HORIZONTAL CONNECTOR & DEPARTMENT TREES */}
                    <div className="relative pt-4">
                      {/* Top Horizontal Distributor Line */}
                      {filteredDepartments.length > 1 && (
                        <div className="absolute top-0 left-12 right-12 h-0.5 bg-neutral-300 dark:bg-neutral-700" />
                      )}

                      <div className="flex items-start gap-8 justify-center">
                        {filteredDepartments.map((dept) => {
                          const stats = departmentStats[dept.id] || { count: 0, members: [], head: undefined };
                          const isExpanded = !!expandedDepts[dept.id];

                          return (
                            <div key={dept.id} className="flex flex-col items-center relative">
                              {/* Vertical Drop from Horizontal Line */}
                              <div className="w-0.5 h-4 bg-neutral-300 dark:bg-neutral-700 -mt-4 mb-0" />

                              {/* Department Node Card */}
                              <div className="bg-[#F8FAFC] dark:bg-[#1E293B]/80 border-2 border-[#CBD5E1] dark:border-[#334155] hover:border-[#0051D5] rounded-2xl p-4 w-72 shadow-xs transition-all space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[#DBE1FF] text-[#0051D5] dark:bg-[#1E3A8A] dark:text-[#DBE1FF]">
                                      {dept.code}
                                    </span>
                                    <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mt-1">
                                      {dept.name}
                                    </h3>
                                  </div>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200">
                                    {stats.count} Staff
                                  </span>
                                </div>

                                {/* Department Head Spotlight */}
                                <div className="p-2.5 rounded-xl bg-white dark:bg-[#0F172A] border border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <AvatarInitials
                                      name={stats.head?.fullName || dept.managerName || 'Lead'}
                                      size="sm"
                                    />
                                    <div className="min-w-0">
                                      <span className="text-[11px] font-bold text-neutral-900 dark:text-neutral-100 block truncate">
                                        {stats.head?.fullName || dept.managerName}
                                      </span>
                                      <span className="text-[10px] text-neutral-500 block truncate">
                                        {stats.head?.designation || 'Department Head'}
                                      </span>
                                    </div>
                                  </div>
                                  {stats.head && (
                                    <button
                                      type="button"
                                      onClick={() => openEmployeeProfile(stats.head!.id)}
                                      className="p-1 rounded text-[#0051D5] hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                      title="View Profile"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>

                                {/* Expand/Collapse Branch Button */}
                                <button
                                  type="button"
                                  onClick={() => toggleDept(dept.id)}
                                  className="w-full py-1.5 px-3 rounded-xl bg-white dark:bg-[#0F172A] hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-900 dark:text-neutral-100 flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                                >
                                  {isExpanded ? (
                                    <>
                                      <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
                                      <span>Hide Employees ({stats.count})</span>
                                    </>
                                  ) : (
                                    <>
                                      <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />
                                      <span>View Employees ({stats.count})</span>
                                    </>
                                  )}
                                </button>
                              </div>

                              {/* LEVEL 3: EMPLOYEE CARDS (Branches under Department) */}
                              {isExpanded && stats.members.length > 0 && (
                                <div className="flex flex-col items-center">
                                  {/* Vertical connector down from Department Node */}
                                  <div className="w-0.5 h-6 bg-neutral-300 dark:bg-neutral-700" />

                                  {/* Vertical Stack of Employee Cards with Connecting Spine */}
                                  <div className="relative pl-6 space-y-3 before:absolute before:left-2.5 before:top-2 before:bottom-6 before:w-0.5 before:bg-neutral-300 dark:before:bg-neutral-700">
                                    {stats.members.map((member) => (
                                      <div key={member.id} className="relative">
                                        {/* Horizontal branch from spine to card */}
                                        <div className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-0.5 bg-neutral-300 dark:bg-neutral-700" />

                                        {/* Employee Card: MUST clearly display Employee Name and Designation */}
                                        <div
                                          onClick={() => openEmployeeProfile(member.id)}
                                          className="bg-white dark:bg-[#0F172A] border border-neutral-200 dark:border-neutral-700 hover:border-[#0051D5] dark:hover:border-[#3B82F6] rounded-xl p-3 w-64 shadow-2xs cursor-pointer transition-all hover:shadow-xs group"
                                        >
                                          <div className="flex items-center gap-2.5">
                                            <AvatarInitials name={member.fullName} size="sm" />
                                            <div className="min-w-0 flex-1">
                                              {/* 1. Employee Name (Clearly Displayed) */}
                                              <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-[#0051D5] truncate">
                                                {member.fullName}
                                              </div>
                                              {/* 2. Employee Designation (Clearly Displayed) */}
                                              <div className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400 truncate">
                                                {member.designation}
                                              </div>
                                              {/* Metadata pill row */}
                                              <div className="flex items-center gap-1.5 mt-1.5 text-[9px] font-mono">
                                                <span className="px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-semibold">
                                                  {member.employeeCode || member.id}
                                                </span>
                                                <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold">
                                                  Active
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* VIEW 2: COMPACT GRID CARDS (Alternative Mobile List) */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredDepartments.map((dept) => {
                    const stats = departmentStats[dept.id] || { count: 0, members: [], head: undefined };
                    const isExpanded = !!expandedDepts[dept.id];

                    return (
                      <div
                        key={dept.id}
                        className="bg-white dark:bg-[#111827] border border-[#C6C6CD] dark:border-[#1E293B] rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[#DBE1FF] text-[#0051D5] dark:bg-[#1E3A8A] dark:text-[#DBE1FF]">
                                {dept.code}
                              </span>
                              <span className="text-xs font-bold text-[#191C1E] dark:text-[#EFF1F3] truncate">
                                {dept.name}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#45464D] dark:text-[#94A3B8] mt-1">
                              Division Head: <strong>{dept.managerName || 'Unassigned'}</strong>
                            </p>
                          </div>
                          <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-[#F2F4F6] dark:bg-[#1E293B] text-[#191C1E] dark:text-[#EFF1F3] border border-[#C6C6CD] dark:border-[#334155] shrink-0">
                            {stats.count} Members
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-[#F7F9FB] dark:bg-[#1E293B]/70 border border-[#E2E8F0] dark:border-[#334155] flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <AvatarInitials
                              name={stats.head?.fullName || dept.managerName || 'Lead'}
                              size="sm"
                            />
                            <div>
                              <span className="text-xs font-bold text-[#191C1E] dark:text-[#EFF1F3] block">
                                {stats.head?.fullName || dept.managerName}
                              </span>
                              <span className="text-[10px] text-[#76777D] block">
                                {stats.head?.designation || 'Department Leader'}
                              </span>
                            </div>
                          </div>
                          {stats.head && (
                            <button
                              type="button"
                              onClick={() => openEmployeeProfile(stats.head!.id)}
                              className="p-1 rounded text-[#0051D5] hover:bg-white dark:hover:bg-[#111827] text-xs font-semibold"
                              title="View Head Profile"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#F2F4F6] dark:border-[#1E293B]">
                          <button
                            type="button"
                            onClick={() => toggleDept(dept.id)}
                            className="w-full py-2 px-3 rounded-xl bg-[#F2F4F6] dark:bg-[#1E293B] hover:bg-[#E6E8EA] dark:hover:bg-[#242E42] text-xs font-semibold text-[#191C1E] dark:text-[#EFF1F3] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronDown className="w-3.5 h-3.5" />
                                <span>Hide Members</span>
                              </>
                            ) : (
                              <>
                                <ChevronRight className="w-3.5 h-3.5" />
                                <span>Show ({stats.count})</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDrillDownDeptId(dept.id)}
                            className="w-full py-2 px-3 rounded-xl bg-[#0F172A] text-white hover:bg-[#1E293B] dark:bg-white dark:text-[#0F172A] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                          >
                            <span>Drill Down</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="pt-2 space-y-2 border-t border-[#E2E8F0] dark:border-[#1E293B] animate-in fade-in duration-150">
                            <span className="text-[10px] font-bold uppercase text-[#76777D] tracking-wider block">
                              Department Members ({stats.members.length})
                            </span>
                            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                              {stats.members.map((member) => (
                                <div
                                  key={member.id}
                                  onClick={() => openEmployeeProfile(member.id)}
                                  className="p-2 rounded-lg bg-[#F7F9FB] dark:bg-[#1E293B]/50 hover:bg-[#ECEEF0] dark:hover:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] flex items-center justify-between cursor-pointer transition-colors text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <AvatarInitials name={member.fullName} size="xs" />
                                    <div>
                                      <span className="font-bold text-[#191C1E] dark:text-[#EFF1F3] block">
                                        {member.fullName}
                                      </span>
                                      <span className="text-[10px] text-[#76777D]">
                                        {member.designation}
                                      </span>
                                    </div>
                                  </div>
                                  <span className="font-mono text-[10px] text-[#0051D5] dark:text-[#3B82F6]">
                                    {member.employeeCode}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SEPARATE SCREEN: EMPLOYEE TREE (Reporting Hierarchy)                   */}
      {/* ========================================================================= */}
      {treeMode === 'employee-tree' && (
        <div className="space-y-5">
          {/* Top Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
            <div className="bg-white dark:bg-[#111827] border border-[#C6C6CD] dark:border-[#1E293B] rounded-xl p-3 shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-[#45464D] dark:text-[#94A3B8] block">
                Total Workforce
              </span>
              <span className="text-lg sm:text-xl font-bold font-mono text-[#191C1E] dark:text-[#EFF1F3] mt-0.5 block">
                {allEmployees.length}
              </span>
            </div>
            <div className="bg-white dark:bg-[#111827] border border-[#C6C6CD] dark:border-[#1E293B] rounded-xl p-3 shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-[#0051D5] dark:text-[#3B82F6] block">
                People Managers
              </span>
              <span className="text-lg sm:text-xl font-bold font-mono text-[#0051D5] dark:text-[#3B82F6] mt-0.5 block">
                {new Set(allEmployees.map((e) => e.managerId).filter(Boolean)).size}
              </span>
            </div>
            <div className="bg-white dark:bg-[#111827] border border-[#C6C6CD] dark:border-[#1E293B] rounded-xl p-3 shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-[#059669] block">
                Apex Leadership
              </span>
              <span className="text-lg sm:text-xl font-bold font-mono text-[#059669] mt-0.5 block">
                {reportingHierarchy.length}
              </span>
            </div>
            <div className="bg-white dark:bg-[#111827] border border-[#C6C6CD] dark:border-[#1E293B] rounded-xl p-3 shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-[#45464D] dark:text-[#94A3B8] block">
                Active View
              </span>
              <span className="text-xs font-semibold text-[#191C1E] dark:text-[#EFF1F3] mt-1.5 block capitalize">
                {empViewType === 'drilldown' ? 'Drill-Down Screen' : 'Expandable Tree'}
              </span>
            </div>
          </div>

          {/* Search Toolbar & View Switcher */}
          <div className="bg-white dark:bg-[#111827] border border-[#C6C6CD] dark:border-[#1E293B] rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2.5 shadow-2xs">
            <div className="relative flex-1 w-full">
              <Search className="w-3.5 h-3.5 text-[#76777D] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search employee, designation, manager, or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-[#F2F4F6] dark:bg-[#1E293B] border border-[#C6C6CD] dark:border-[#334155] rounded-lg text-xs text-[#191C1E] dark:text-[#EFF1F3] placeholder:text-[#76777D] focus:outline-none focus:border-[#0051D5]"
              />
            </div>

            {/* View Type Toggle (Mobile Drill-down vs Expandable Tree) */}
            <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
              <div className="flex items-center bg-[#F2F4F6] dark:bg-[#1E293B] p-0.5 rounded-lg border border-[#C6C6CD] dark:border-[#334155]">
                <button
                  type="button"
                  onClick={() => {
                    setEmpViewType('drilldown');
                    setDrillDownManagerId(null);
                  }}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    empViewType === 'drilldown'
                      ? 'bg-white dark:bg-[#111827] text-[#0051D5] dark:text-[#3B82F6] shadow-xs'
                      : 'text-[#45464D] dark:text-[#94A3B8]'
                  }`}
                >
                  Drill-Down
                </button>
                <button
                  type="button"
                  onClick={() => setEmpViewType('expandable')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    empViewType === 'expandable'
                      ? 'bg-white dark:bg-[#111827] text-[#0051D5] dark:text-[#3B82F6] shadow-xs'
                      : 'text-[#45464D] dark:text-[#94A3B8]'
                  }`}
                >
                  Expandable Tree
                </button>
              </div>

              {empViewType === 'expandable' && (
                <div className="flex items-center gap-1 text-xs text-[#45464D]">
                  <button
                    type="button"
                    onClick={expandAllEmps}
                    className="px-2 py-1 text-xs font-semibold text-[#0051D5] hover:underline"
                  >
                    Expand
                  </button>
                  <button
                    type="button"
                    onClick={collapseAllEmps}
                    className="px-2 py-1 text-xs font-semibold text-[#76777D] hover:underline"
                  >
                    Collapse
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Search Result Instant Cards if query entered */}
          {searchQuery.trim() && (
            <div className="bg-white dark:bg-[#111827] border border-[#C6C6CD] dark:border-[#1E293B] rounded-2xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#191C1E] dark:text-[#EFF1F3] uppercase tracking-wider">
                  Matching Employees ({filteredEmployeeSearchList.length})
                </span>
                <span className="text-xs text-[#76777D]">
                  Tap to drill down into their reporting team
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredEmployeeSearchList.map((emp) => {
                  const node = reportingNodeMap.get(emp.id);
                  const directCount = node?.directReports.length || 0;
                  const totalSub = node?.totalSubtreeCount || 0;

                  return (
                    <div
                      key={emp.id}
                      className="p-3 rounded-xl bg-[#F7F9FB] dark:bg-[#1E293B]/70 border border-[#E2E8F0] dark:border-[#334155] hover:border-[#0051D5] transition-all space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <AvatarInitials name={emp.fullName} size="sm" />
                          <div>
                            <span className="text-xs font-bold text-[#191C1E] dark:text-[#EFF1F3] block">
                              {emp.fullName}
                            </span>
                            <span className="text-[11px] text-[#45464D] dark:text-[#94A3B8]">
                              {emp.designation} · {emp.department}
                            </span>
                          </div>
                        </div>
                        <span className="font-mono text-[10px] text-[#0051D5]">
                          {emp.employeeCode}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0] dark:border-[#334155] text-[11px]">
                        <span className="text-[#76777D]">
                          Reports to: <strong>{emp.managerName || (emp as any).reportingManager || 'Executive Board'}</strong>
                        </span>
                        {directCount > 0 && (
                          <span className="font-mono font-bold text-[#0051D5]">
                            {directCount} Direct ({totalSub} Total)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setDrillDownManagerId(emp.id);
                            setEmpViewType('drilldown');
                            setSearchQuery('');
                          }}
                          className="flex-1 py-1.5 rounded-lg bg-[#0F172A] text-white text-[11px] font-semibold text-center cursor-pointer hover:bg-[#1E293B]"
                        >
                          Explore Hierarchy
                        </button>
                        <button
                          type="button"
                          onClick={() => openEmployeeProfile(emp.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#111827] border border-[#C6C6CD] dark:border-[#334155] text-[11px] font-semibold text-[#191C1E] dark:text-[#EFF1F3] cursor-pointer"
                        >
                          Profile
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* OPTION A: DRILL-DOWN HIERARCHY SCREEN (Mobile-First Masterpiece)    */}
          {/* =================================================================== */}
          {empViewType === 'drilldown' && (
            <div className="space-y-4">
              {/* Breadcrumb Navigation Trail */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-1 text-xs scrollbar-none">
                <button
                  type="button"
                  onClick={() => setDrillDownManagerId(null)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                    !activeDrillDownNode
                      ? 'bg-[#0F172A] text-white dark:bg-white dark:text-[#0F172A]'
                      : 'bg-white dark:bg-[#111827] text-[#45464D] dark:text-[#94A3B8] border border-[#C6C6CD] dark:border-[#1E293B] hover:text-[#191C1E]'
                  }`}
                >
                  Apex Leaders
                </button>

                {employeeBreadcrumbs.map((crumb, idx) => {
                  const isLast = idx === employeeBreadcrumbs.length - 1;
                  return (
                    <React.Fragment key={crumb.id}>
                      <ChevronRight className="w-3.5 h-3.5 text-[#76777D] shrink-0" />
                      <button
                        type="button"
                        onClick={() => setDrillDownManagerId(crumb.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                          isLast
                            ? 'bg-[#0F172A] text-white dark:bg-white dark:text-[#0F172A]'
                            : 'bg-white dark:bg-[#111827] text-[#45464D] dark:text-[#94A3B8] border border-[#C6C6CD] dark:border-[#1E293B] hover:text-[#191C1E]'
                        }`}
                      >
                        {crumb.fullName}
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Active Focused Manager Hero Card (If Drilled In) */}
              {activeDrillDownNode ? (
                <div className="space-y-4">
                  <div className="bg-white dark:bg-[#111827] border-2 border-[#0051D5] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <AvatarInitials name={activeDrillDownNode.employee.fullName} size="md" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm sm:text-base font-bold text-[#191C1E] dark:text-[#EFF1F3]">
                              {activeDrillDownNode.employee.fullName}
                            </span>
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#DBE1FF] text-[#0051D5] font-bold">
                              {activeDrillDownNode.employee.employeeCode}
                            </span>
                          </div>
                          <p className="text-xs text-[#45464D] dark:text-[#94A3B8] mt-0.5">
                            {activeDrillDownNode.employee.designation} · {activeDrillDownNode.employee.department}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center">
                        <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-[#DBE1FF] text-[#0051D5]">
                          {activeDrillDownNode.directReports.length} Direct Reports
                        </span>
                        {activeDrillDownNode.totalSubtreeCount > 0 && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-[#F2F4F6] text-[#45464D] border border-[#C6C6CD]">
                            {activeDrillDownNode.totalSubtreeCount} Total in Subtree
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-[#E2E8F0] dark:border-[#1E293B] text-xs">
                      <span className="text-[#76777D]">
                        Reports to: <strong>{activeDrillDownNode.employee.managerName || (activeDrillDownNode.employee as any).reportingManager || 'Executive Board'}</strong>
                      </span>

                      <div className="flex items-center gap-2">
                        {isHRAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              setReorgTargetEmp(activeDrillDownNode.employee);
                              setSelectedNewManagerId(activeDrillDownNode.employee.managerId || '');
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#F2F4F6] dark:bg-[#1E293B] text-[#191C1E] dark:text-[#EFF1F3] hover:bg-[#E6E8EA] flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3 text-[#0051D5]" />
                            <span>Reassign</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => openEmployeeProfile(activeDrillDownNode.employee.id)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#0F172A] text-white hover:bg-[#1E293B] cursor-pointer"
                        >
                          View Profile
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Direct Reports List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-[#191C1E] dark:text-[#EFF1F3] uppercase tracking-wider">
                        Direct Subordinates ({activeDrillDownNode.directReports.length})
                      </h3>
                      <span className="text-[11px] text-[#76777D]">
                        Tap any subordinate with reports to drill down deeper
                      </span>
                    </div>

                    {activeDrillDownNode.directReports.length === 0 ? (
                      <div className="p-6 text-center bg-white dark:bg-[#111827] rounded-xl border border-[#C6C6CD] text-xs text-[#76777D]">
                        This employee has no direct subordinates reporting to them.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {activeDrillDownNode.directReports.map((reportNode) => {
                          const rep = reportNode.employee;
                          const hasOwnReports = reportNode.directReports.length > 0;

                          return (
                            <div
                              key={rep.id}
                              className="bg-white dark:bg-[#111827] border border-[#C6C6CD] dark:border-[#1E293B] hover:border-[#0051D5] rounded-xl p-3.5 shadow-2xs transition-all space-y-2.5"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                <div
                                  onClick={() => openEmployeeProfile(rep.id)}
                                  className="flex items-center gap-3 cursor-pointer min-w-0"
                                >
                                  <AvatarInitials name={rep.fullName} size="sm" />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-[#191C1E] dark:text-[#EFF1F3] truncate hover:text-[#0051D5]">
                                        {rep.fullName}
                                      </span>
                                      <span className="font-mono text-[10px] text-[#0051D5]">
                                        {rep.employeeCode}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-[#45464D] dark:text-[#94A3B8] truncate">
                                      {rep.designation} · {rep.department}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 self-end sm:self-center">
                                  {hasOwnReports ? (
                                    <button
                                      type="button"
                                      onClick={() => setDrillDownManagerId(rep.id)}
                                      className="px-3 py-1.5 rounded-lg bg-[#DBE1FF] dark:bg-[#1E3A8A] text-[#0051D5] dark:text-[#DBE1FF] hover:bg-[#0051D5] hover:text-white dark:hover:bg-[#3B82F6] dark:hover:text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                                    >
                                      <span>Manages {reportNode.directReports.length} Reports</span>
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                  ) : (
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F2F4F6] dark:bg-[#1E293B] text-[#76777D] border border-[#C6C6CD] dark:border-[#334155]">
                                      Individual Contributor
                                    </span>
                                  )}

                                  {isHRAdmin && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setReorgTargetEmp(rep);
                                        setSelectedNewManagerId(rep.managerId || '');
                                      }}
                                      className="p-1 text-[#76777D] hover:text-[#0051D5] cursor-pointer"
                                      title="Reassign Reporting Manager"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Apex Leaders Overview List */
                <div className="space-y-4">
                  <div className="bg-white dark:bg-[#111827] border border-[#C6C6CD] dark:border-[#1E293B] rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#0051D5] block">
                      Executive Tier
                    </span>
                    <h2 className="text-lg font-bold text-[#191C1E] dark:text-[#EFF1F3]">
                      Organizational Apex Leadership
                    </h2>
                    <p className="text-xs text-[#45464D] dark:text-[#94A3B8]">
                      Top-level leaders who report directly to executive leadership or the board. Tap any leader to drill down into their team structure.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {reportingHierarchy.map((rootNode) => {
                      const leader = rootNode.employee;
                      return (
                        <div
                          key={leader.id}
                          className="bg-white dark:bg-[#111827] border border-[#C6C6CD] dark:border-[#1E293B] hover:border-[#0051D5] rounded-2xl p-4 shadow-2xs transition-all space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <AvatarInitials name={leader.fullName} size="md" />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-[#191C1E] dark:text-[#EFF1F3]">
                                    {leader.fullName}
                                  </span>
                                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#DBE1FF] text-[#0051D5]">
                                    {leader.employeeCode}
                                  </span>
                                </div>
                                <p className="text-xs text-[#45464D] dark:text-[#94A3B8] mt-0.5">
                                  {leader.designation} · {leader.department}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-start sm:self-center">
                              <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-[#DBE1FF] text-[#0051D5]">
                                {rootNode.directReports.length} Direct Reports
                              </span>
                              <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-[#F2F4F6] text-[#45464D] border border-[#C6C6CD]">
                                {rootNode.totalSubtreeCount} Subtree
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F2F4F6] dark:border-[#1E293B]">
                            <button
                              type="button"
                              onClick={() => openEmployeeProfile(leader.id)}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#F2F4F6] dark:bg-[#1E293B] text-[#191C1E] dark:text-[#EFF1F3] hover:bg-[#E6E8EA] cursor-pointer"
                            >
                              Profile
                            </button>
                            <button
                              type="button"
                              onClick={() => setDrillDownManagerId(leader.id)}
                              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#0F172A] text-white hover:bg-[#1E293B] dark:bg-white dark:text-[#0F172A] flex items-center gap-1.5 cursor-pointer shadow-xs"
                            >
                              <span>Explore Team</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =================================================================== */}
          {/* OPTION B: EXPANDABLE ACCORDION HIERARCHY TREE                      */}
          {/* =================================================================== */}
          {empViewType === 'expandable' && (
            <div className="bg-white dark:bg-[#111827] border border-[#C6C6CD] dark:border-[#1E293B] rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#1E293B]">
                <div>
                  <h3 className="text-sm font-bold text-[#191C1E] dark:text-[#EFF1F3]">
                    Full Organization Reporting Chain
                  </h3>
                  <p className="text-xs text-[#45464D] dark:text-[#94A3B8]">
                    Expand nodes to view sub-teams across all management tiers.
                  </p>
                </div>
                <span className="text-xs font-mono text-[#0051D5] font-bold">
                  {allEmployees.length} Total Nodes
                </span>
              </div>

              <div className="space-y-3">
                {reportingHierarchy.map((rootNode) => (
                  <ExpandableEmployeeCard
                    key={rootNode.employee.id}
                    node={rootNode}
                    level={0}
                    expandedEmpNodes={expandedEmpNodes}
                    toggleEmp={toggleEmp}
                    isHRAdmin={isHRAdmin}
                    onReorganize={(emp) => {
                      setReorgTargetEmp(emp);
                      setSelectedNewManagerId(emp.managerId || allEmployees[0]?.id || 'EMP-1001');
                    }}
                    onViewProfile={openEmployeeProfile}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================================= */}
      {/* REORGANIZE REPORTING MANAGER MODAL (WITH CIRCULAR DEPENDENCY VALIDATION) */}
      {/* ======================================================================= */}
      {reorgTargetEmp && (
        <ModalShell
          title={`Reorganize Reporting Line — ${reorgTargetEmp.fullName}`}
          subtitle={`Current Manager: ${reorgTargetEmp.managerName || 'None'}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-[#F2F4F6] dark:bg-[#1E293B] rounded-xl border border-[#C6C6CD] dark:border-[#334155] text-xs text-[#45464D] dark:text-[#94A3B8]">
              Reassigning an employee updates their supervisor in the database and adjusts the organizational reporting tree. All changes are written to the immutable system Activity Log.
            </div>

            {reorgError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{reorgError}</span>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold uppercase text-[#191C1E] dark:text-[#EFF1F3] mb-1">
                Select New Reporting Manager *
              </label>
              <select
                value={selectedNewManagerId}
                onChange={(e) => {
                  setSelectedNewManagerId(e.target.value);
                  setReorgError('');
                }}
                className="w-full px-3 py-2 bg-[#F2F4F6] dark:bg-[#1E293B] border border-[#C6C6CD] dark:border-[#334155] rounded-lg text-xs font-semibold text-[#0051D5] dark:text-[#3B82F6]"
              >
                <option value="">-- Choose New Manager --</option>
                {allEmployees.map((e) => {
                  const isSelf = e.id === reorgTargetEmp.id;
                  const isDescendant = invalidManagerIds.has(e.id) && !isSelf;
                  const isCurrent = e.id === reorgTargetEmp.managerId;

                  return (
                    <option
                      key={e.id}
                      value={e.id}
                      disabled={isSelf || isDescendant}
                    >
                      {e.fullName} ({e.designation} · {e.department})
                      {isSelf ? ' — (Self)' : ''}
                      {isCurrent ? ' — (Current Manager)' : ''}
                      {isDescendant ? ' — (Prohibited: Reports to this employee)' : ''}
                    </option>
                  );
                })}
              </select>
              <p className="text-[10px] text-[#76777D] mt-1">
                Note: An employee cannot report to themselves, their direct reports, or any subordinate in their reporting line.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#C6C6CD] dark:border-[#1E293B]">
              <button
                type="button"
                onClick={() => {
                  setReorgTargetEmp(null);
                  setReorgError('');
                }}
                className="px-4 py-2 text-xs font-semibold text-[#45464D] dark:text-[#94A3B8]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveReorg}
                disabled={!selectedNewManagerId || invalidManagerIds.has(selectedNewManagerId)}
                className="px-5 py-2 bg-[#0F172A] hover:bg-[#1E293B] text-white dark:bg-white dark:text-[#0F172A] text-xs font-semibold rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
              >
                Save Reporting Line
              </button>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

// Mobile-friendly Expandable Employee Node Component
function ExpandableEmployeeCard({
  node,
  level,
  expandedEmpNodes,
  toggleEmp,
  isHRAdmin,
  onReorganize,
  onViewProfile,
}: {
  node: ReportingNode;
  level: number;
  expandedEmpNodes: Record<string, boolean>;
  toggleEmp: (id: string) => void;
  isHRAdmin: boolean;
  onReorganize: (emp: Employee) => void;
  onViewProfile: (id: string) => void;
}) {
  const { employee, directReports, totalSubtreeCount } = node;
  const isExpanded = !!expandedEmpNodes[employee.id];
  const hasReports = directReports.length > 0;

  // Level-specific badge styling
  const levelLabels = ['Apex Leader', 'Director / Lead', 'Manager', 'Team Member'];
  const levelLabel = levelLabels[Math.min(level, levelLabels.length - 1)];

  return (
    <div className={`space-y-2 ${level > 0 ? 'ml-2 sm:ml-6 pl-2.5 sm:pl-4 border-l-2 border-[#C6C6CD] dark:border-[#334155]' : ''}`}>
      <div className="p-3 rounded-xl bg-[#F7F9FB] dark:bg-[#1E293B]/70 hover:bg-[#ECEEF0] dark:hover:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] transition-colors space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {hasReports ? (
              <button
                type="button"
                onClick={() => toggleEmp(employee.id)}
                className="p-1 rounded-md bg-white dark:bg-[#111827] text-[#191C1E] dark:text-[#EFF1F3] hover:bg-[#0051D5] hover:text-white cursor-pointer transition-colors shadow-2xs shrink-0"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
            ) : (
              <span className="w-4 text-center text-[#76777D] text-xs shrink-0">↳</span>
            )}

            <div
              onClick={() => onViewProfile(employee.id)}
              className="flex items-center gap-2.5 cursor-pointer min-w-0"
            >
              <AvatarInitials name={employee.fullName} size="xs" />
              <div className="min-w-0">
                <span className="text-xs font-bold text-[#191C1E] dark:text-[#EFF1F3] truncate block hover:text-[#0051D5]">
                  {employee.fullName}
                </span>
                <span className="text-[10px] text-[#76777D] truncate block">
                  {employee.designation} · {employee.department}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-white dark:bg-[#111827] text-[#0051D5] border border-[#C6C6CD] dark:border-[#334155]">
              {levelLabel}
            </span>

            {hasReports && (
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#DBE1FF] text-[#0051D5]">
                {directReports.length} {directReports.length === 1 ? 'Report' : 'Reports'}
              </span>
            )}

            {isHRAdmin && (
              <button
                type="button"
                onClick={() => onReorganize(employee)}
                className="p-1 text-[#76777D] hover:text-[#0051D5] cursor-pointer"
                title="Change Manager"
              >
                <Edit3 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Render Direct Subordinates Recursively */}
      {isExpanded && hasReports && (
        <div className="space-y-2 pt-1 animate-in fade-in duration-150">
          {directReports.map((childNode) => (
            <ExpandableEmployeeCard
              key={childNode.employee.id}
              node={childNode}
              level={level + 1}
              expandedEmpNodes={expandedEmpNodes}
              toggleEmp={toggleEmp}
              isHRAdmin={isHRAdmin}
              onReorganize={onReorganize}
              onViewProfile={onViewProfile}
            />
          ))}
        </div>
      )}
    </div>
  );
}
