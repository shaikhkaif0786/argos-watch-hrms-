import React, { useState, useMemo, useEffect } from 'react';
import {
  Star,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  User,
  Award,
  AlertCircle,
  Building2,
  MessageSquare,
  Lock,
  RotateCcw,
  Plus,
  Edit3,
  Trash2,
  UserPlus,
  Check,
  SlidersHorizontal,
  ArrowRight,
  Eye,
} from 'lucide-react';
import { useHRMS, DEFAULT_ADMIN_OPERATOR } from '../../context/HRMSContext';
import {
  Employee,
  ReviewType,
  ReviewStatus,
  EmployeeReview,
  PublicEmployeeReview,
  UserRole,
} from '../../types/hrms';
import {
  KPICard,
  SegmentedControl,
  SectionCard,
  SectionHeader,
  EmployeeAvatar,
  SearchInput,
  ModalShell,
  SlideOverDrawer,
  ConfirmDialog,
  ExportDropdown,
  EmptyState,
} from '../ui/EnterpriseComponents';

type MainReviewTab = 'received' | 'given' | 'directory' | 'admin-queue';

const DEFAULT_POSITIVE_CATEGORIES: string[] = [
  'Excellent Performance',
  'Teamwork',
  'Leadership',
  'Helping Others',
  'Initiative',
  'Problem Solving',
  'Communication',
  'Punctuality',
  'Outstanding Contribution',
  'Other',
];

const DEFAULT_NEGATIVE_CATEGORIES: string[] = [
  'Poor Performance',
  'Lack of Teamwork',
  'Unprofessional Behaviour',
  'Lack of Responsibility',
  'Poor Communication',
  'Lack of Punctuality',
  'Lack of Initiative',
  'Missed Commitments',
  'Policy Violation',
  'Other',
];

const STAR_OPTIONS: Array<{ value: 1 | 2 | 3 | 4 | 5; label: string }> = [
  { value: 1, label: '1 Star' },
  { value: 2, label: '2 Stars' },
  { value: 3, label: '3 Stars' },
  { value: 4, label: '4 Stars' },
  { value: 5, label: '5 Stars' },
];

/**
 * Helper component to render 1–5 visual stars
 */
const StarIconsRow: React.FC<{
  count: number;
  type: ReviewType;
  size?: 'sm' | 'md';
}> = ({ count, type, size = 'sm' }) => {
  const safeCount = Math.min(5, Math.max(1, Math.round(Number(count) || 1)));
  const iconSize = size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5';
  const activeColor =
    type === 'POSITIVE'
      ? 'fill-emerald-500 text-emerald-500 dark:fill-emerald-400 dark:text-emerald-400'
      : 'fill-rose-500 text-rose-500 dark:fill-rose-400 dark:text-rose-400';

  return (
    <div className="inline-flex items-center gap-0.5" aria-label={`${safeCount} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((idx) => (
        <Star
          key={idx}
          className={`${iconSize} ${
            idx <= safeCount
              ? activeColor
              : 'text-[#E5E5EA] dark:text-[#3A3A3C]'
          }`}
        />
      ))}
    </div>
  );
};

export const ReviewsModule: React.FC = () => {
  const {
    currentEmployee,
    currentRole,
    activeWorkspace,
    allEmployees,
    departments,
    reviews,
    submitEmployeeReview,
    decideEmployeeReview,
    updateEmployeeReview,
    deleteEmployeeReview,
    getEmployeeStarSummary,
    getPublicEmployeeReviews,
    addNewEmployee,
  } = useHRMS();

  // Owner/Admin permission check (respects OWN workspace mode for employee self-service view)
  const isAdminOrOwner =
    (currentRole === UserRole.ADMIN || currentRole === UserRole.HR) &&
    activeWorkspace !== 'OWN';

  // Configurable Categories (persisted so Admin/Owner can manage categories)
  const [positiveCategories, setPositiveCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('hrms_review_positive_categories');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return DEFAULT_POSITIVE_CATEGORIES;
  });

  const [negativeCategories, setNegativeCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('hrms_review_negative_categories');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return DEFAULT_NEGATIVE_CATEGORIES;
  });

  useEffect(() => {
    localStorage.setItem('hrms_review_positive_categories', JSON.stringify(positiveCategories));
  }, [positiveCategories]);

  useEffect(() => {
    localStorage.setItem('hrms_review_negative_categories', JSON.stringify(negativeCategories));
  }, [negativeCategories]);

  // Main Screen Tab State: Received Star History | Stars Given | Employee Directory | Admin Queue
  const [activeTab, setActiveTab] = useState<MainReviewTab>('received');

  // Filter & Search States for Received / Given / Directory
  const [receivedTypeFilter, setReceivedTypeFilter] = useState<'ALL' | ReviewType>('ALL');
  const [receivedSearch, setReceivedSearch] = useState('');
  const [givenStatusFilter, setGivenStatusFilter] = useState<'ALL' | ReviewStatus>('ALL');
  const [givenTypeFilter, setGivenTypeFilter] = useState<'ALL' | ReviewType>('ALL');
  const [givenSearch, setGivenSearch] = useState('');
  const [directorySearch, setDirectorySearch] = useState('');
  const [directoryDeptFilter, setDirectoryDeptFilter] = useState<string>('ALL');

  // Selected Received Review Detail Drawer (strictly anonymous)
  const [selectedReceivedReview, setSelectedReceivedReview] =
    useState<PublicEmployeeReview | null>(null);

  // Selected Employee Limited Public Profile Drawer
  const [viewingPublicEmployee, setViewingPublicEmployee] = useState<Employee | null>(null);

  // =========================================================================
  // "GIVE STARS" STEP-BY-STEP MODAL STATE
  // =========================================================================
  const [giveStarsOpen, setGiveStarsOpen] = useState(false);
  // Step 1: Choose Review Type (must select Positive or Negative first)
  const [selectedReviewType, setSelectedReviewType] = useState<ReviewType | null>(null);
  // Step 2: Select Employee (search by Employee Name or Employee ID)
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  // Step 3: Select Category (dynamic based on Review Type + custom category when 'Other')
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [customCategoryInput, setCustomCategoryInput] = useState<string>('');
  // Step 4: Reason / Description (mandatory, max 500 chars)
  const [descriptionInput, setDescriptionInput] = useState<string>('');
  // Step 5: Star Selection (1 to 5 stars, mandatory)
  const [selectedStars, setSelectedStars] = useState<number>(0);
  const [hoveredStars, setHoveredStars] = useState<number>(0);
  // Validation error message
  const [formError, setFormError] = useState<string | null>(null);

  // Quick-Add Eligible Colleague inside Step 2 (if clean workspace has 0 other employees)
  const [showQuickAddColleague, setShowQuickAddColleague] = useState(false);
  const [quickColleagueName, setQuickColleagueName] = useState('');
  const [quickColleagueDesignation, setQuickColleagueDesignation] = useState('');
  const [quickColleagueDept, setQuickColleagueDept] = useState(
    departments[0]?.name || 'Operations'
  );

  // =========================================================================
  // ADMIN APPROVAL QUEUE & CATEGORY MANAGEMENT STATE
  // =========================================================================
  const [adminStatusFilter, setAdminStatusFilter] = useState<'ALL' | ReviewStatus>('PENDING');
  const [adminTypeFilter, setAdminTypeFilter] = useState<'ALL' | ReviewType>('ALL');
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [decisionNoteInput, setDecisionNoteInput] = useState<Record<string, string>>({});
  const [editingReview, setEditingReview] = useState<EmployeeReview | null>(null);
  const [editStarCount, setEditStarCount] = useState<number>(5);
  const [editReviewType, setEditReviewType] = useState<ReviewType>('POSITIVE');
  const [editCategory, setEditCategory] = useState<string>('');
  const [editReason, setEditReason] = useState<string>('');
  const [editStatus, setEditStatus] = useState<ReviewStatus>('PENDING');
  const [editDecisionNote, setEditDecisionNote] = useState<string>('');
  const [deletingReview, setDeletingReview] = useState<EmployeeReview | null>(null);

  // Admin Category Manager Modal
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<ReviewType>('POSITIVE');

  // =========================================================================
  // DERIVED DATA & CALCULATIONS
  // =========================================================================

  // Active eligible employees in the organization
  const activeOrganizationEmployees = useMemo<Employee[]>(() => {
    const active = allEmployees.filter(
      (emp) =>
        emp.status !== 'Archived' &&
        emp.status !== 'Exited' &&
        emp.status !== 'Terminated' &&
        emp.status !== 'Inactive'
    );
    const hasCurrent = active.some((e) => e.id === currentEmployee.id);
    if (!hasCurrent && currentEmployee) {
      return [currentEmployee, ...active];
    }
    return active.length > 0 ? active : [DEFAULT_ADMIN_OPERATOR];
  }, [allEmployees, currentEmployee]);

  // Eligible employees that the logged-in user can give stars to (never self)
  const eligibleTargetEmployees = useMemo<Employee[]>(() => {
    return activeOrganizationEmployees.filter((emp) => emp.id !== currentEmployee.id);
  }, [activeOrganizationEmployees, currentEmployee.id]);

  // Filtered employees in Step 2 of Give Stars (search by Employee Name or Employee ID)
  const step2FilteredEmployees = useMemo<Employee[]>(() => {
    const q = employeeSearchQuery.trim().toLowerCase();
    if (!q) return eligibleTargetEmployees;
    return eligibleTargetEmployees.filter(
      (emp) =>
        emp.fullName.toLowerCase().includes(q) ||
        emp.id.toLowerCase().includes(q) ||
        emp.designation.toLowerCase().includes(q) ||
        emp.department.toLowerCase().includes(q)
    );
  }, [eligibleTargetEmployees, employeeSearchQuery]);

  // 1A. Current Logged-In Employee's Star Summary
  const myStarSummary = useMemo(
    () => getEmployeeStarSummary(currentEmployee.id),
    [getEmployeeStarSummary, currentEmployee.id, reviews]
  );

  // 1B. Received Star History for Logged-In Employee (APPROVED only, reviewer strictly stripped)
  const myReceivedReviews = useMemo<PublicEmployeeReview[]>(() => {
    const list = getPublicEmployeeReviews(currentEmployee.id);
    const q = receivedSearch.trim().toLowerCase();
    return list.filter((rev) => {
      if (receivedTypeFilter !== 'ALL' && rev.reviewType !== receivedTypeFilter) {
        return false;
      }
      if (!q) return true;
      return (
        (rev.category || '').toLowerCase().includes(q) ||
        rev.reason.toLowerCase().includes(q) ||
        rev.submittedAt.toLowerCase().includes(q)
      );
    });
  }, [
    getPublicEmployeeReviews,
    currentEmployee.id,
    receivedTypeFilter,
    receivedSearch,
    reviews,
  ]);

  // 1C. Given Star History (all reviews submitted by the logged-in employee)
  const myGivenReviews = useMemo<EmployeeReview[]>(() => {
    const mine = reviews.filter(
      (r) => (r.reviewerId || r.reviewerEmployeeId) === currentEmployee.id
    );
    const q = givenSearch.trim().toLowerCase();
    return mine.filter((rev) => {
      if (givenStatusFilter !== 'ALL' && rev.status !== givenStatusFilter) return false;
      if (givenTypeFilter !== 'ALL' && rev.reviewType !== givenTypeFilter) return false;
      if (!q) return true;
      const targetEmp = activeOrganizationEmployees.find((e) => e.id === rev.targetEmployeeId);
      const targetName = rev.targetEmployeeName || targetEmp?.fullName || rev.targetEmployeeId;
      const targetDesig = rev.targetEmployeeDesignation || targetEmp?.designation || '';
      return (
        targetName.toLowerCase().includes(q) ||
        rev.targetEmployeeId.toLowerCase().includes(q) ||
        targetDesig.toLowerCase().includes(q) ||
        (rev.category || '').toLowerCase().includes(q) ||
        rev.reason.toLowerCase().includes(q)
      );
    });
  }, [
    reviews,
    currentEmployee.id,
    givenStatusFilter,
    givenTypeFilter,
    givenSearch,
    activeOrganizationEmployees,
  ]);

  // Directory Filtered Employees
  const filteredDirectoryEmployees = useMemo<Employee[]>(() => {
    const q = directorySearch.trim().toLowerCase();
    return activeOrganizationEmployees.filter((emp) => {
      if (directoryDeptFilter !== 'ALL' && emp.department !== directoryDeptFilter) {
        return false;
      }
      if (!q) return true;
      return (
        emp.fullName.toLowerCase().includes(q) ||
        emp.id.toLowerCase().includes(q) ||
        emp.designation.toLowerCase().includes(q) ||
        emp.department.toLowerCase().includes(q)
      );
    });
  }, [activeOrganizationEmployees, directorySearch, directoryDeptFilter]);

  // Admin Approval Queue Filtered List
  const adminQueueReviews = useMemo<EmployeeReview[]>(() => {
    const q = adminSearchQuery.trim().toLowerCase();
    return reviews.filter((rev) => {
      if (adminStatusFilter !== 'ALL' && rev.status !== adminStatusFilter) return false;
      if (adminTypeFilter !== 'ALL' && rev.reviewType !== adminTypeFilter) return false;
      if (!q) return true;
      const targetName = rev.targetEmployeeName || rev.targetEmployeeId;
      const reviewerName = rev.reviewerName || rev.reviewerEmployeeName || '';
      const reviewerId = rev.reviewerId || rev.reviewerEmployeeId || '';
      return (
        targetName.toLowerCase().includes(q) ||
        rev.targetEmployeeId.toLowerCase().includes(q) ||
        reviewerName.toLowerCase().includes(q) ||
        reviewerId.toLowerCase().includes(q) ||
        (rev.category || '').toLowerCase().includes(q) ||
        rev.reason.toLowerCase().includes(q)
      );
    });
  }, [reviews, adminStatusFilter, adminTypeFilter, adminSearchQuery]);

  const pendingReviewsCount = useMemo(
    () => reviews.filter((r) => r.status === 'PENDING').length,
    [reviews]
  );

  // Dynamic Categories for Step 3 based on Step 1 selection
  const availableCategoriesForStep3 = useMemo<string[]>(() => {
    if (selectedReviewType === 'POSITIVE') return positiveCategories;
    if (selectedReviewType === 'NEGATIVE') return negativeCategories;
    return [];
  }, [selectedReviewType, positiveCategories, negativeCategories]);

  const selectedTargetEmployeeObj = useMemo<Employee | null>(
    () => eligibleTargetEmployees.find((e) => e.id === selectedEmployeeId) || null,
    [eligibleTargetEmployees, selectedEmployeeId]
  );

  // =========================================================================
  // HANDLERS FOR "GIVE STARS" WORKFLOW
  // =========================================================================

  const handleOpenGiveStars = (
    preselectedEmp?: Employee | null,
    preselectedType?: ReviewType | null
  ) => {
    setSelectedReviewType(preselectedType || null);
    if (preselectedEmp && preselectedEmp.id !== currentEmployee.id) {
      setSelectedEmployeeId(preselectedEmp.id);
    } else {
      setSelectedEmployeeId('');
    }
    setEmployeeSearchQuery('');
    setSelectedCategory('');
    setCustomCategoryInput('');
    setDescriptionInput('');
    setSelectedStars(0);
    setHoveredStars(0);
    setFormError(null);
    setShowQuickAddColleague(false);
    setGiveStarsOpen(true);
  };

  const handleSelectReviewTypeStep1 = (type: ReviewType) => {
    setSelectedReviewType(type);
    // Reset category when switching between Positive and Negative so only valid dynamic categories apply
    setSelectedCategory('');
    setCustomCategoryInput('');
    setFormError(null);
  };

  const handleQuickAddColleagueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickColleagueName.trim() || !quickColleagueDesignation.trim()) {
      setFormError('Please enter both the employee name and designation.');
      return;
    }
    const cleanEmail = `${quickColleagueName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '.')}@argoswatch.com`;

    const newEmp = addNewEmployee(
      {
        fullName: quickColleagueName.trim(),
        email: cleanEmail,
        officialEmail: cleanEmail,
        phone: '+91 98200 11000',
        role: UserRole.EMPLOYEE,
        designation: quickColleagueDesignation.trim(),
        department: quickColleagueDept || 'Operations',
        managerId: currentEmployee.id,
        managerName: currentEmployee.fullName,
        status: 'Active',
        employmentType: 'Full-Time',
        location: 'Main Atelier & HQ',
        joiningDate: new Date().toISOString().slice(0, 10),
        probationEndDate: '2027-04-01',
        dob: '1995-06-15',
        gender: 'Other',
        address: 'Corporate Atelier, India',
        emergencyContactName: 'HR Office',
        emergencyContactPhone: '+91 98200 00001',
        avatarUrl: '',
        bankName: 'HDFC Bank',
        bankAccountNumber: 'XXXX0000',
        ifscCode: 'HDFC0000001',
        panNumber: 'ABCDE1234F',
        salary: {
          baseSalary: 45000,
          hra: 18000,
          specialAllowance: 12000,
          pfDeduction: 1800,
          taxDeduction: 1500,
          professionalTax: 200,
        },
      },
      false
    );

    setSelectedEmployeeId(newEmp.id);
    setShowQuickAddColleague(false);
    setQuickColleagueName('');
    setQuickColleagueDesignation('');
    setFormError(null);
  };

  const handleSubmitGiveStars = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Step 1 check
    if (!selectedReviewType) {
      setFormError('Step 1: Please choose a review type (Positive or Negative).');
      return;
    }

    // Step 2 check
    if (!selectedEmployeeId) {
      setFormError('Step 2: Please select an employee to receive the stars.');
      return;
    }
    if (selectedEmployeeId === currentEmployee.id) {
      setFormError('Step 2: You cannot give stars to yourself.');
      return;
    }

    // Step 3 check
    if (!selectedCategory) {
      setFormError('Step 3: Please select a review category.');
      return;
    }
    if (selectedCategory === 'Other' && customCategoryInput.trim().length < 2) {
      setFormError('Step 3: Please provide a custom category description for "Other".');
      return;
    }

    // Step 4 check
    const trimmedDesc = descriptionInput.trim();
    if (!trimmedDesc || trimmedDesc.length < 10) {
      setFormError(
        'Step 4: Please enter a meaningful Reason / Description (minimum 10 characters).'
      );
      return;
    }
    if (trimmedDesc.length > 500) {
      setFormError('Step 4: Description cannot exceed 500 characters.');
      return;
    }

    // Step 5 check
    if (!selectedStars || selectedStars < 1 || selectedStars > 5) {
      setFormError('Step 5: Please select between 1 and 5 stars before submitting.');
      return;
    }

    const result = submitEmployeeReview({
      targetEmployeeId: selectedEmployeeId,
      reviewType: selectedReviewType,
      starCount: selectedStars,
      category: selectedCategory,
      customCategory: selectedCategory === 'Other' ? customCategoryInput.trim() : undefined,
      reason: trimmedDesc,
    });

    if (result.success) {
      setGiveStarsOpen(false);
      setActiveTab('given');
    } else {
      setFormError(result.message);
    }
  };

  // =========================================================================
  // ADMIN MODERATION & CATEGORY HANDLERS
  // =========================================================================

  const handleAdminDecision = (reviewId: string, status: ReviewStatus) => {
    const note = decisionNoteInput[reviewId] || '';
    decideEmployeeReview(reviewId, status, note);
    setDecisionNoteInput((prev) => ({ ...prev, [reviewId]: '' }));
  };

  const handleOpenEditReviewModal = (rev: EmployeeReview) => {
    setEditingReview(rev);
    setEditReviewType(rev.reviewType);
    setEditStarCount(Math.min(5, Math.max(1, Number(rev.starCount) || 1)));
    setEditCategory(rev.category || 'Other');
    setEditReason(rev.reason);
    setEditStatus(rev.status);
    setEditDecisionNote(rev.decisionNote || '');
  };

  const handleSaveEditedReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReview) return;
    if (editReason.trim().length < 10) return;

    updateEmployeeReview(
      editingReview.id,
      {
        reviewType: editReviewType,
        starCount: Math.min(5, Math.max(1, Number(editStarCount) || 1)),
        category: editCategory.trim() || 'Other',
        reason: editReason.trim(),
        status: editStatus,
        decisionNote: editDecisionNote.trim(),
      },
      editDecisionNote.trim() || 'Updated by Admin'
    );
    setEditingReview(null);
  };

  const handleAddCustomCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newCategoryName.trim();
    if (!clean) return;
    if (newCategoryType === 'POSITIVE') {
      if (!positiveCategories.includes(clean)) {
        const withoutOther = positiveCategories.filter((c) => c !== 'Other');
        setPositiveCategories([...withoutOther, clean, 'Other']);
      }
    } else {
      if (!negativeCategories.includes(clean)) {
        const withoutOther = negativeCategories.filter((c) => c !== 'Other');
        setNegativeCategories([...withoutOther, clean, 'Other']);
      }
    }
    setNewCategoryName('');
  };

  // Export Dataset (strictly preserves reviewer anonymity for non-admin exports)
  const exportDataset = useMemo(() => {
    if (activeTab === 'received') {
      return myReceivedReviews.map((r) => ({
        ReviewType: r.reviewType === 'POSITIVE' ? 'Positive' : 'Negative',
        StarsReceived:
          r.reviewType === 'POSITIVE'
            ? `+${r.starCount || 1} Stars`
            : `-${r.starCount || 1} Stars`,
        Category: r.category || 'Other',
        Description: r.reason,
        DateReceived: r.submittedAt.slice(0, 10),
      }));
    }
    if (activeTab === 'given') {
      return myGivenReviews.map((r) => ({
        RecipientName: r.targetEmployeeName || r.targetEmployeeId,
        RecipientDesignation: r.targetEmployeeDesignation || '—',
        ReviewType: r.reviewType === 'POSITIVE' ? 'Positive' : 'Negative',
        Category: r.category || 'Other',
        StarsGiven:
          r.reviewType === 'POSITIVE'
            ? `+${r.starCount || 1} Stars`
            : `-${r.starCount || 1} Stars`,
        Description: r.reason,
        SubmissionDate: r.submittedAt.slice(0, 10),
        ApprovalStatus: r.status,
      }));
    }
    if (activeTab === 'admin-queue' && isAdminOrOwner) {
      return adminQueueReviews.map((r) => ({
        ReviewID: r.id,
        RecipientName: r.targetEmployeeName || r.targetEmployeeId,
        RecipientID: r.targetEmployeeId,
        ReviewerName: r.reviewerName || r.reviewerEmployeeName || '—',
        ReviewerID: r.reviewerId || r.reviewerEmployeeId || '—',
        ReviewType: r.reviewType,
        Stars: r.reviewType === 'POSITIVE' ? `+${r.starCount || 1}` : `-${r.starCount || 1}`,
        Category: r.category || 'Other',
        Description: r.reason,
        SubmittedAt: r.submittedAt,
        Status: r.status,
      }));
    }
    return filteredDirectoryEmployees.map((emp) => {
      const sum = getEmployeeStarSummary(emp.id);
      return {
        EmployeeID: emp.id,
        EmployeeName: emp.fullName,
        Designation: emp.designation,
        Department: emp.department,
        PositiveStars: `+${sum.approvedPositive}`,
        NegativeStars: `-${sum.approvedNegative}`,
        NetStarBalance: sum.netScore > 0 ? `+${sum.netScore}` : `${sum.netScore}`,
      };
    });
  }, [
    activeTab,
    myReceivedReviews,
    myGivenReviews,
    adminQueueReviews,
    isAdminOrOwner,
    filteredDirectoryEmployees,
    getEmployeeStarSummary,
  ]);

  const currentServerDateDisplay = useMemo(
    () => new Date().toISOString().slice(0, 10),
    [giveStarsOpen]
  );

  return (
    <div className="space-y-6">
      {/* =====================================================================
          HEADER & PROMINENT "GIVE STARS" MAIN ACTION
          ===================================================================== */}
      <SectionHeader
        title="Reviews & Star Balance"
        subtitle="Track your current star balance, review your anonymous received star history, or give 1–5 stars to a colleague."
        action={
          <div className="flex items-center gap-2.5 flex-wrap">
            {isAdminOrOwner && (
              <button
                type="button"
                onClick={() => setCategoryModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] hover:border-[#1D1D1F] dark:hover:border-[#F5F5F7] text-[#1D1D1F] dark:text-[#F5F5F7] text-xs font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#6E6E73]" />
                <span>Manage Categories</span>
              </button>
            )}

            <ExportDropdown
              data={exportDataset}
              filename={`argos_reviews_${activeTab}`}
              title="Employee Reviews & Star Report"
              buttonLabel="Export"
            />

            <button
              type="button"
              onClick={() => handleOpenGiveStars(null, null)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1D1D1F] dark:bg-white text-white dark:text-[#1D1D1F] hover:opacity-90 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-xs whitespace-nowrap shrink-0"
            >
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span>Give Stars</span>
            </button>
          </div>
        }
      />

      {/* =====================================================================
          1A. CURRENT STAR SUMMARY (LOGGED-IN EMPLOYEE)
          ===================================================================== */}
      <div className="bg-white dark:bg-[#161618] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
          <div className="flex items-center gap-3">
            <EmployeeAvatar
              name={currentEmployee.fullName}
              avatarUrl={currentEmployee.avatarUrl}
              size="md"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                  {currentEmployee.fullName} — Current Star Summary
                </h3>
                <span className="text-xs font-mono text-[#86868B]">
                  ({currentEmployee.id})
                </span>
              </div>
              <p className="text-xs text-[#6E6E73] dark:text-[#A1A1A6]">
                {currentEmployee.designation} · {currentEmployee.department}
              </p>
            </div>
          </div>

          <div className="text-xs font-mono text-[#6E6E73] dark:text-[#A1A1A6]">
            Net Star Balance = {myStarSummary.approvedPositive} Positive −{' '}
            {myStarSummary.approvedNegative} Negative ={' '}
            <strong
              className={
                myStarSummary.netScore > 0
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : myStarSummary.netScore < 0
                  ? 'text-rose-700 dark:text-rose-400'
                  : 'text-[#1D1D1F] dark:text-[#F5F5F7]'
              }
            >
              {myStarSummary.netScore > 0
                ? `+${myStarSummary.netScore}`
                : myStarSummary.netScore < 0
                ? `−${Math.abs(myStarSummary.netScore)}`
                : '0'}{' '}
              Stars
            </strong>
          </div>
        </div>

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Current Total Stars */}
          <KPICard
            label="Current Total Stars"
            value={`${
              myStarSummary.netScore > 0
                ? `+${myStarSummary.netScore}`
                : myStarSummary.netScore < 0
                ? `−${Math.abs(myStarSummary.netScore)}`
                : '0'
            } ★`}
            delta={`${myStarSummary.totalApprovedReviews} Approved Reviews`}
            subtext={`Total star volume: ${myStarSummary.currentTotalStars} stars`}
            icon={<Star className="w-4 h-4 fill-amber-400 text-amber-500" />}
            onClick={() => {
              setReceivedTypeFilter('ALL');
              setActiveTab('received');
            }}
          />

          {/* Card 2: Positive Stars Received */}
          <KPICard
            label="Positive Stars Received"
            value={`+${myStarSummary.approvedPositive} ★`}
            delta={`${myStarSummary.positiveReviewsCount} Positive Reviews`}
            subtext="Approved positive stars received (1–5★)"
            icon={<ThumbsUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
            onClick={() => {
              setReceivedTypeFilter('POSITIVE');
              setActiveTab('received');
            }}
          />

          {/* Card 3: Negative Stars Received */}
          <KPICard
            label="Negative Stars Received"
            value={`−${myStarSummary.approvedNegative} ★`}
            delta={`${myStarSummary.negativeReviewsCount} Negative Reviews`}
            subtext="Approved negative stars received (1–5★)"
            icon={<ThumbsDown className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
            onClick={() => {
              setReceivedTypeFilter('NEGATIVE');
              setActiveTab('received');
            }}
          />

          {/* Card 4: Net Star Balance */}
          <div
            onClick={() => {
              setReceivedTypeFilter('ALL');
              setActiveTab('received');
            }}
            className={`rounded-2xl p-4 sm:p-5 border transition-all cursor-pointer ${
              myStarSummary.netScore > 0
                ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/80'
                : myStarSummary.netScore < 0
                ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/80'
                : 'bg-[#FAFAFC] dark:bg-[#1C1C1E] border-[#E5E5EA] dark:border-[#2C2C2E]'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-semibold tracking-tight uppercase text-[#6E6E73] dark:text-[#A1A1A6]">
                Net Star Balance
              </span>
              <Award
                className={`w-4 h-4 ${
                  myStarSummary.netScore > 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : myStarSummary.netScore < 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-[#86868B]'
                }`}
              />
            </div>
            <div className="flex items-baseline gap-2.5 flex-wrap">
              <span
                className={`text-2xl sm:text-3xl font-bold font-mono tabular-nums ${
                  myStarSummary.netScore > 0
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : myStarSummary.netScore < 0
                    ? 'text-rose-700 dark:text-rose-300'
                    : 'text-[#1D1D1F] dark:text-[#F5F5F7]'
                }`}
              >
                {myStarSummary.netScore > 0
                  ? `+${myStarSummary.netScore} Stars`
                  : myStarSummary.netScore < 0
                  ? `−${Math.abs(myStarSummary.netScore)} Stars`
                  : '0 Stars'}
              </span>
            </div>
            <p className="mt-1.5 text-xs text-[#6E6E73] dark:text-[#A1A1A6] font-mono">
              {myStarSummary.approvedPositive} Positive − {myStarSummary.approvedNegative} Negative
            </p>
          </div>
        </div>
      </div>

      {/* =====================================================================
          MAIN NAVIGATION TABS (Received Star History | Stars Given | Directory | Admin)
          ===================================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <SegmentedControl<MainReviewTab>
          value={activeTab}
          onChange={setActiveTab}
          items={[
            {
              id: 'received',
              label: 'Received Star History',
              count: myStarSummary.totalApprovedReviews,
            },
            {
              id: 'given',
              label: 'Stars Given',
              count: myGivenReviews.length,
            },
            {
              id: 'directory',
              label: 'Employee Star Directory',
              count: activeOrganizationEmployees.length,
            },
            ...(isAdminOrOwner
              ? [
                  {
                    id: 'admin-queue' as MainReviewTab,
                    label: 'Owner/Admin Approval Queue',
                    count: pendingReviewsCount,
                  },
                ]
              : []),
          ]}
        />

        <div className="flex items-center gap-2 text-xs text-[#6E6E73] dark:text-[#A1A1A6]">
          <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>
            Reviewer identity is strictly confidential and never visible to recipients
          </span>
        </div>
      </div>

      {/* =====================================================================
          1B. RECEIVED STAR HISTORY (STRICTLY ANONYMOUS)
          ===================================================================== */}
      {activeTab === 'received' && (
        <SectionCard
          title="Received Star History"
          subtitle="Approved stars received on your profile. Reviewer identities are permanently hidden to protect peer confidentiality."
          action={
            <div className="flex items-center gap-2.5 flex-wrap">
              <SearchInput
                value={receivedSearch}
                onChange={setReceivedSearch}
                placeholder="Search by category or description..."
                className="w-56"
              />
              <SegmentedControl<'ALL' | ReviewType>
                value={receivedTypeFilter}
                onChange={setReceivedTypeFilter}
                items={[
                  { id: 'ALL', label: 'All' },
                  { id: 'POSITIVE', label: 'Positive' },
                  { id: 'NEGATIVE', label: 'Negative' },
                ]}
              />
            </div>
          }
        >
          {myReceivedReviews.length > 0 ? (
            <div className="divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E]">
              {myReceivedReviews.map((rev) => {
                const stars = Math.min(5, Math.max(1, Number(rev.starCount) || 1));
                const isPositive = rev.reviewType === 'POSITIVE';

                return (
                  <div
                    key={rev.id}
                    onClick={() => setSelectedReceivedReview(rev)}
                    className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:bg-[#F5F5F7]/50 dark:hover:bg-[#202022]/50 -mx-3 px-3 rounded-xl transition-colors cursor-pointer"
                  >
                    <div className="space-y-2 flex-1 min-w-0">
                      {/* Top Row: Positive/Negative Indicator + 1–5 Stars + Category */}
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                            isPositive
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                          }`}
                        >
                          {isPositive ? (
                            <ThumbsUp className="w-3.5 h-3.5" />
                          ) : (
                            <ThumbsDown className="w-3.5 h-3.5" />
                          )}
                          <span>{isPositive ? 'Positive' : 'Negative'}</span>
                        </span>

                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F5F5F7] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E]">
                          <StarIconsRow count={stars} type={rev.reviewType} />
                          <span
                            className={`text-xs font-mono font-bold tabular-nums ${
                              isPositive
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : 'text-rose-700 dark:text-rose-400'
                            }`}
                          >
                            {isPositive ? `+${stars}` : `−${stars}`}{' '}
                            {stars === 1 ? 'Star' : 'Stars'}
                          </span>
                        </div>

                        <span className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                          {rev.category || 'General'}
                        </span>
                      </div>

                      {/* Review Description / Reason */}
                      <p className="text-xs sm:text-sm text-[#1D1D1F] dark:text-[#F5F5F7] leading-relaxed">
                        {rev.reason}
                      </p>

                      {/* Anonymous Footer & Date Received */}
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#6E6E73] dark:text-[#A1A1A6]">
                        <span className="font-mono">
                          Date Received: {rev.submittedAt.slice(0, 10)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                          <Lock className="w-3 h-3" />
                          <span>Anonymous Peer Review (Reviewer Identity Protected)</span>
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 flex sm:flex-col items-end justify-between gap-2">
                      <span
                        className={`text-lg font-mono font-bold tabular-nums ${
                          isPositive
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-rose-700 dark:text-rose-400'
                        }`}
                      >
                        {isPositive ? `+${stars}★` : `−${stars}★`}
                      </span>
                      <span className="text-[11px] text-[#0051D5] dark:text-[#3B82F6] font-medium">
                        View Details
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="No approved stars received yet"
              description="When colleagues submit reviews for you and they are approved by the Owner/Admin, your received star history will appear here."
              icon={<Star className="w-6 h-6" />}
              action={
                <button
                  type="button"
                  onClick={() => handleOpenGiveStars(null, null)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#1D1D1F] dark:bg-white text-white dark:text-[#1D1D1F] rounded-xl cursor-pointer"
                >
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>Give Stars to a Colleague</span>
                </button>
              }
            />
          )}
        </SectionCard>
      )}

      {/* =====================================================================
          1C. GIVEN STAR HISTORY ("STARS GIVEN" TAB)
          ===================================================================== */}
      {activeTab === 'given' && (
        <SectionCard
          title="Stars Given History"
          subtitle="All reviews and stars you have submitted for other employees, along with their current approval status."
          action={
            <div className="flex items-center gap-2.5 flex-wrap">
              <SearchInput
                value={givenSearch}
                onChange={setGivenSearch}
                placeholder="Search recipient, category, or reason..."
                className="w-56"
              />
              <SegmentedControl<'ALL' | ReviewStatus>
                value={givenStatusFilter}
                onChange={setGivenStatusFilter}
                items={[
                  { id: 'ALL', label: 'All' },
                  { id: 'PENDING', label: 'Pending' },
                  { id: 'APPROVED', label: 'Approved' },
                  { id: 'REJECTED', label: 'Rejected' },
                ]}
              />
              <button
                type="button"
                onClick={() => handleOpenGiveStars(null, null)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#1D1D1F] dark:bg-white text-white dark:text-[#1D1D1F] text-xs font-semibold rounded-xl cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Give Stars</span>
              </button>
            </div>
          }
        >
          {myGivenReviews.length > 0 ? (
            <div className="divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E]">
              {myGivenReviews.map((rev) => {
                const targetEmp = activeOrganizationEmployees.find(
                  (e) => e.id === rev.targetEmployeeId
                );
                const targetName =
                  rev.targetEmployeeName || targetEmp?.fullName || rev.targetEmployeeId;
                const targetDesignation =
                  rev.targetEmployeeDesignation || targetEmp?.designation || 'Employee';
                const targetDepartment =
                  rev.targetEmployeeDepartment || targetEmp?.department || 'General';
                const stars = Math.min(5, Math.max(1, Number(rev.starCount) || 1));
                const isPositive = rev.reviewType === 'POSITIVE';

                return (
                  <div key={rev.id} className="py-4 first:pt-0 last:pb-0 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      {/* Recipient Employee Name & Designation */}
                      <div className="flex items-center gap-3">
                        <EmployeeAvatar
                          name={targetName}
                          avatarUrl={targetEmp?.avatarUrl}
                          size="md"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                              {targetName}
                            </span>
                            <span className="text-xs font-mono text-[#86868B]">
                              ({rev.targetEmployeeId})
                            </span>
                          </div>
                          <div className="text-xs text-[#6E6E73] dark:text-[#A1A1A6]">
                            {targetDesignation} · {targetDepartment}
                          </div>
                        </div>
                      </div>

                      {/* Approval Status: Pending | Approved | Rejected */}
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${
                            rev.status === 'APPROVED'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : rev.status === 'REJECTED'
                              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          {rev.status === 'APPROVED' && <CheckCircle2 className="w-3.5 h-3.5" />}
                          {rev.status === 'REJECTED' && <XCircle className="w-3.5 h-3.5" />}
                          {rev.status === 'PENDING' && <Clock className="w-3.5 h-3.5" />}
                          <span>
                            {rev.status === 'APPROVED'
                              ? 'Approved'
                              : rev.status === 'REJECTED'
                              ? 'Rejected'
                              : 'Pending'}
                          </span>
                        </span>
                        <span className="text-xs font-mono text-[#86868B]">
                          Submitted: {rev.submittedAt.slice(0, 10)}
                        </span>
                      </div>
                    </div>

                    {/* Review Type, Star Count (1–5), and Category */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                          isPositive
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                        }`}
                      >
                        {isPositive ? (
                          <ThumbsUp className="w-3.5 h-3.5" />
                        ) : (
                          <ThumbsDown className="w-3.5 h-3.5" />
                        )}
                        <span>{isPositive ? 'Positive' : 'Negative'}</span>
                      </span>

                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F5F5F7] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E]">
                        <StarIconsRow count={stars} type={rev.reviewType} />
                        <span
                          className={`text-xs font-mono font-bold tabular-nums ${
                            isPositive
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-rose-700 dark:text-rose-400'
                          }`}
                        >
                          {isPositive ? `+${stars}` : `−${stars}`}{' '}
                          {stars === 1 ? 'Star' : 'Stars'} Given
                        </span>
                      </div>

                      <span className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                        Category: {rev.category || 'Other'}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-xs sm:text-sm text-[#1D1D1F] dark:text-[#F5F5F7] bg-[#F5F5F7] dark:bg-[#202022] p-3.5 rounded-xl border border-[#E5E5EA] dark:border-[#2C2C2E] leading-relaxed">
                      {rev.reason}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="You haven't given any stars yet"
              description="Click 'Give Stars' to recognize a colleague's positive contribution or submit constructive feedback."
              icon={<MessageSquare className="w-6 h-6" />}
              action={
                <button
                  type="button"
                  onClick={() => handleOpenGiveStars(null, null)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#1D1D1F] dark:bg-white text-white dark:text-[#1D1D1F] rounded-xl cursor-pointer"
                >
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>Give Stars Now</span>
                </button>
              }
            />
          )}
        </SectionCard>
      )}

      {/* =====================================================================
          EMPLOYEE STAR DIRECTORY (PUBLIC LIMITED PROFILES & QUICK GIVE STARS)
          ===================================================================== */}
      {activeTab === 'directory' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#161618] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <SearchInput
              value={directorySearch}
              onChange={setDirectorySearch}
              placeholder="Search employee by name, ID, designation, or department..."
              className="flex-1 max-w-md"
            />
            <div className="flex items-center gap-2.5">
              <select
                value={directoryDeptFilter}
                onChange={(e) => setDirectoryDeptFilter(e.target.value)}
                className="py-2 px-3 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl text-xs text-[#1D1D1F] dark:text-[#F5F5F7] outline-none"
              >
                <option value="ALL">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDirectoryEmployees.map((emp) => {
              const sum = getEmployeeStarSummary(emp.id);
              const isSelf = emp.id === currentEmployee.id;

              return (
                <div
                  key={emp.id}
                  className="bg-white dark:bg-[#161618] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-2xl p-5 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-4">
                    <div
                      onClick={() => setViewingPublicEmployee(emp)}
                      className="flex items-start gap-3.5 cursor-pointer group"
                    >
                      <EmployeeAvatar
                        name={emp.fullName}
                        avatarUrl={emp.avatarUrl}
                        size="lg"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] truncate group-hover:underline">
                            {emp.fullName}
                          </h3>
                          <span className="text-[11px] font-mono text-[#86868B]">{emp.id}</span>
                        </div>
                        <p className="text-xs text-[#6E6E73] dark:text-[#A1A1A6] truncate mt-0.5">
                          {emp.designation}
                        </p>
                        <p className="text-[11px] text-[#86868B] truncate mt-0.5">
                          {emp.department}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#E5E5EA] dark:border-[#2C2C2E] grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-200/70 dark:border-emerald-900/50">
                        <div className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                          +{sum.approvedPositive}★
                        </div>
                        <div className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
                          Positive
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-rose-50/70 dark:bg-rose-950/25 border border-rose-200/70 dark:border-rose-900/50">
                        <div className="text-xs font-mono font-bold text-rose-700 dark:text-rose-400 tabular-nums">
                          −{sum.approvedNegative}★
                        </div>
                        <div className="text-[10px] text-rose-700/80 dark:text-rose-400/80 mt-0.5">
                          Negative
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-[#F5F5F7] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E]">
                        <div
                          className={`text-xs font-mono font-bold tabular-nums ${
                            sum.netScore > 0
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : sum.netScore < 0
                              ? 'text-rose-700 dark:text-rose-400'
                              : 'text-[#1D1D1F] dark:text-[#F5F5F7]'
                          }`}
                        >
                          {sum.netScore > 0
                            ? `+${sum.netScore}★`
                            : sum.netScore < 0
                            ? `−${Math.abs(sum.netScore)}★`
                            : '0★'}
                        </div>
                        <div className="text-[10px] text-[#6E6E73] dark:text-[#A1A1A6] mt-0.5">
                          Net Balance
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#E5E5EA] dark:border-[#2C2C2E] flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setViewingPublicEmployee(emp)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#F5F5F7] dark:bg-[#202022] hover:bg-[#E5E5EA] dark:hover:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] rounded-xl cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Public Profile</span>
                    </button>

                    {!isSelf ? (
                      <button
                        type="button"
                        onClick={() => handleOpenGiveStars(emp, null)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#1D1D1F] dark:bg-white text-white dark:text-[#1D1D1F] rounded-xl cursor-pointer"
                      >
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>Give Stars</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-[#86868B] px-2">Your Profile</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          3. OWNER / ADMIN REVIEW APPROVAL QUEUE
          ===================================================================== */}
      {activeTab === 'admin-queue' && isAdminOrOwner && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#161618] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1">
              <SearchInput
                value={adminSearchQuery}
                onChange={setAdminSearchQuery}
                placeholder="Search recipient, reviewer, category, or description..."
                className="flex-1 max-w-md"
              />
              <select
                value={adminTypeFilter}
                onChange={(e) => setAdminTypeFilter(e.target.value as any)}
                className="py-2 px-3 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl text-xs text-[#1D1D1F] dark:text-[#F5F5F7] outline-none"
              >
                <option value="ALL">All Types</option>
                <option value="POSITIVE">Positive Only</option>
                <option value="NEGATIVE">Negative Only</option>
              </select>
            </div>

            <SegmentedControl<'ALL' | ReviewStatus>
              value={adminStatusFilter}
              onChange={setAdminStatusFilter}
              items={[
                { id: 'PENDING', label: 'Pending Queue', count: pendingReviewsCount },
                { id: 'APPROVED', label: 'Approved' },
                { id: 'REJECTED', label: 'Rejected' },
                { id: 'ALL', label: 'All', count: reviews.length },
              ]}
            />
          </div>

          {adminQueueReviews.length > 0 ? (
            <div className="space-y-4">
              {adminQueueReviews.map((rev) => {
                const targetEmp = activeOrganizationEmployees.find(
                  (e) => e.id === rev.targetEmployeeId
                );
                const targetName =
                  rev.targetEmployeeName || targetEmp?.fullName || rev.targetEmployeeId;
                const targetDesignation =
                  rev.targetEmployeeDesignation || targetEmp?.designation || 'Employee';
                const targetDepartment =
                  rev.targetEmployeeDepartment || targetEmp?.department || 'General';
                const reviewerName =
                  rev.reviewerName || rev.reviewerEmployeeName || 'System User';
                const reviewerId = rev.reviewerId || rev.reviewerEmployeeId || 'N/A';
                const reviewerDept = rev.reviewerDepartment || 'General';
                const stars = Math.min(5, Math.max(1, Number(rev.starCount) || 1));
                const isPositive = rev.reviewType === 'POSITIVE';

                return (
                  <div
                    key={rev.id}
                    className="bg-white dark:bg-[#161618] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-2xl p-5 space-y-4"
                  >
                    {/* Top Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border ${
                            isPositive
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                          }`}
                        >
                          {isPositive ? (
                            <ThumbsUp className="w-3.5 h-3.5" />
                          ) : (
                            <ThumbsDown className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {isPositive ? `Positive (+${stars}★)` : `Negative (−${stars}★)`}
                          </span>
                        </span>

                        <StarIconsRow count={stars} type={rev.reviewType} />

                        <span className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                          {rev.category || 'Other'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-mono text-[#6E6E73] dark:text-[#A1A1A6]">
                          Submitted: {rev.submittedAt}
                        </span>
                        <span
                          className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
                            rev.status === 'APPROVED'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : rev.status === 'REJECTED'
                              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          {rev.status}
                        </span>
                      </div>
                    </div>

                    {/* Confidential Reviewer vs Recipient Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3.5 rounded-xl bg-[#F5F5F7] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E]">
                        <div className="text-[11px] font-semibold text-[#6E6E73] dark:text-[#A1A1A6] mb-1.5 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            <span>Reviewer (Visible to Owner/Admin Only)</span>
                          </span>
                          <span className="font-mono text-[10px]">{reviewerId}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <EmployeeAvatar name={reviewerName} size="sm" />
                          <div>
                            <div className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                              {reviewerName}
                            </div>
                            <div className="text-[11px] text-[#6E6E73] dark:text-[#A1A1A6]">
                              {reviewerDept}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-[#F5F5F7] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E]">
                        <div className="text-[11px] font-semibold text-[#6E6E73] dark:text-[#A1A1A6] mb-1.5 flex items-center justify-between">
                          <span>Recipient Employee</span>
                          <span className="font-mono text-[10px]">{rev.targetEmployeeId}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <EmployeeAvatar
                            name={targetName}
                            avatarUrl={targetEmp?.avatarUrl}
                            size="sm"
                          />
                          <div>
                            <div className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                              {targetName}
                            </div>
                            <div className="text-[11px] text-[#6E6E73] dark:text-[#A1A1A6]">
                              {targetDesignation} · {targetDepartment}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs sm:text-sm text-[#1D1D1F] dark:text-[#F5F5F7] bg-[#FAFAFC] dark:bg-[#1C1C1E] p-3.5 rounded-xl border border-[#E5E5EA] dark:border-[#2C2C2E] leading-relaxed">
                      "{rev.reason}"
                    </p>

                    {/* Decision Controls */}
                    <div className="pt-3 border-t border-[#E5E5EA] dark:border-[#2C2C2E] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <input
                        type="text"
                        placeholder="Optional decision note..."
                        value={decisionNoteInput[rev.id] || ''}
                        onChange={(e) =>
                          setDecisionNoteInput((prev) => ({
                            ...prev,
                            [rev.id]: e.target.value,
                          }))
                        }
                        className="flex-1 max-w-md px-3 py-2 text-xs bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl text-[#1D1D1F] dark:text-[#F5F5F7] outline-none"
                      />

                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        {rev.status !== 'APPROVED' && (
                          <button
                            type="button"
                            onClick={() => handleAdminDecision(rev.id, 'APPROVED')}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>
                              Approve ({isPositive ? `+${stars}` : `−${stars}`}★)
                            </span>
                          </button>
                        )}

                        {rev.status !== 'REJECTED' && (
                          <button
                            type="button"
                            onClick={() => handleAdminDecision(rev.id, 'REJECTED')}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        )}

                        {rev.status !== 'PENDING' && (
                          <button
                            type="button"
                            onClick={() => handleAdminDecision(rev.id, 'PENDING')}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[#F0F0F2] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] rounded-xl cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Set Pending</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenEditReviewModal(rev)}
                          className="p-2 rounded-xl bg-[#F0F0F2] dark:bg-[#2C2C2E] text-[#6E6E73] hover:text-[#1D1D1F] dark:hover:text-white cursor-pointer"
                          title="Edit review"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeletingReview(rev)}
                          className="p-2 rounded-xl bg-[#F0F0F2] dark:bg-[#2C2C2E] text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                          title="Delete review"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="No reviews in this queue"
              description="Submitted reviews matching the selected status filter will appear here."
              icon={<ShieldCheck className="w-6 h-6" />}
            />
          )}
        </div>
      )}

      {/* =====================================================================
          2. "GIVE STARS" – COMPLETE 7-STEP MODAL / PANEL
          ===================================================================== */}
      <ModalShell
        isOpen={giveStarsOpen}
        onClose={() => setGiveStarsOpen(false)}
        title="Give Stars to a Colleague"
        subtitle="Complete the steps below. All submitted reviews go to the Owner/Admin approval queue before updating star balances."
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmitGiveStars} className="space-y-6">
          {formError && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* STEP 1: CHOOSE REVIEW TYPE (Positive or Negative) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                Step 1: Choose Review Type *
              </label>
              <span className="text-[11px] text-[#6E6E73] dark:text-[#A1A1A6]">
                Select Positive or Negative to continue
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleSelectReviewTypeStep1('POSITIVE')}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedReviewType === 'POSITIVE'
                    ? 'border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/50 ring-1 ring-emerald-600'
                    : 'border-[#E5E5EA] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] hover:border-emerald-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-400">
                    <ThumbsUp className="w-4 h-4" />
                    <span>Positive</span>
                  </span>
                  {selectedReviewType === 'POSITIVE' && (
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#6E6E73] dark:text-[#A1A1A6] mt-1.5">
                  Recognize outstanding work, teamwork, leadership, or positive impact (+1 to +5 Stars).
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleSelectReviewTypeStep1('NEGATIVE')}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedReviewType === 'NEGATIVE'
                    ? 'border-rose-600 bg-rose-50/80 dark:bg-rose-950/50 ring-1 ring-rose-600'
                    : 'border-[#E5E5EA] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] hover:border-rose-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 text-sm font-bold text-rose-700 dark:text-rose-400">
                    <ThumbsDown className="w-4 h-4" />
                    <span>Negative</span>
                  </span>
                  {selectedReviewType === 'NEGATIVE' && (
                    <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#6E6E73] dark:text-[#A1A1A6] mt-1.5">
                  Report missed commitments, policy violations, or areas needing improvement (−1 to −5 Stars).
                </p>
              </button>
            </div>
          </div>

          {/* STEPS 2–7: Shown once Step 1 (Positive or Negative) is chosen */}
          {selectedReviewType ? (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* STEP 2: SELECT EMPLOYEE */}
              <div className="space-y-2.5 pt-4 border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                    Step 2: Select Employee *
                  </label>
                  {!showQuickAddColleague && (
                    <button
                      type="button"
                      onClick={() => setShowQuickAddColleague(true)}
                      className="text-[11px] font-semibold text-[#0051D5] dark:text-[#3B82F6] hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <UserPlus className="w-3 h-3" />
                      <span>Add Eligible Employee</span>
                    </button>
                  )}
                </div>

                {showQuickAddColleague ? (
                  <div className="p-4 rounded-xl bg-[#F5F5F7] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">
                        Register Eligible Active Employee
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowQuickAddColleague(false)}
                        className="text-xs text-[#6E6E73] hover:text-[#1D1D1F] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <input
                        type="text"
                        placeholder="Employee Name *"
                        value={quickColleagueName}
                        onChange={(e) => setQuickColleagueName(e.target.value)}
                        className="px-3 py-2 text-xs bg-white dark:bg-[#161618] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Designation *"
                        value={quickColleagueDesignation}
                        onChange={(e) => setQuickColleagueDesignation(e.target.value)}
                        className="px-3 py-2 text-xs bg-white dark:bg-[#161618] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg outline-none"
                      />
                      <select
                        value={quickColleagueDept}
                        onChange={(e) => setQuickColleagueDept(e.target.value)}
                        className="px-3 py-2 text-xs bg-white dark:bg-[#161618] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg outline-none"
                      >
                        {departments.map((d) => (
                          <option key={d.id} value={d.name}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleQuickAddColleagueSubmit}
                        className="px-3.5 py-1.5 text-xs font-semibold bg-[#1D1D1F] dark:bg-white text-white dark:text-[#1D1D1F] rounded-lg cursor-pointer"
                      >
                        Add & Select Employee
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <SearchInput
                      value={employeeSearchQuery}
                      onChange={setEmployeeSearchQuery}
                      placeholder="Search by Employee Name or Employee ID..."
                    />

                    {step2FilteredEmployees.length > 0 ? (
                      <div className="max-h-48 overflow-y-auto divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl bg-[#FAFAFC] dark:bg-[#1C1C1E]">
                        {step2FilteredEmployees.map((emp) => {
                          const isSelected = emp.id === selectedEmployeeId;
                          return (
                            <button
                              key={emp.id}
                              type="button"
                              onClick={() => setSelectedEmployeeId(emp.id)}
                              className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-50/80 dark:bg-emerald-950/40'
                                  : 'hover:bg-[#F0F0F2] dark:hover:bg-[#242426]'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <EmployeeAvatar
                                  name={emp.fullName}
                                  avatarUrl={emp.avatarUrl}
                                  size="sm"
                                />
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                                    {emp.fullName}{' '}
                                    <span className="font-mono font-normal text-[#86868B]">
                                      ({emp.id})
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-[#6E6E73] dark:text-[#A1A1A6] truncate">
                                    {emp.designation} · {emp.department}
                                  </div>
                                </div>
                              </div>

                              {isSelected && (
                                <span className="w-5 h-5 rounded-full bg-[#1D1D1F] dark:bg-white text-white dark:text-[#1D1D1F] flex items-center justify-center shrink-0">
                                  <Check className="w-3 h-3" />
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-[#F5F5F7] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] text-xs text-[#6E6E73] dark:text-[#A1A1A6] flex items-center justify-between gap-3">
                        <span>
                          No other eligible active employees found (self-reviews are disabled).
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowQuickAddColleague(true)}
                          className="px-3 py-1.5 rounded-lg font-semibold bg-[#1D1D1F] dark:bg-white text-white dark:text-[#1D1D1F] shrink-0 cursor-pointer"
                        >
                          + Add Employee
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* STEP 3: SELECT CATEGORY (Dynamic based on Positive / Negative) */}
              <div className="space-y-2.5 pt-4 border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                    Step 3: Select {selectedReviewType === 'POSITIVE' ? 'Positive' : 'Negative'}{' '}
                    Category *
                  </label>
                  <span className="text-[11px] text-[#6E6E73] dark:text-[#A1A1A6]">
                    Dynamic categories for {selectedReviewType.toLowerCase()} review
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {availableCategoriesForStep3.map((cat) => {
                    const isSelected = selectedCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium text-left border transition-all cursor-pointer truncate ${
                          isSelected
                            ? selectedReviewType === 'POSITIVE'
                              ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 font-semibold'
                              : 'border-rose-600 bg-rose-50 dark:bg-rose-950/50 text-rose-900 dark:text-rose-200 font-semibold'
                            : 'border-[#E5E5EA] dark:border-[#2C2C2E] bg-[#FAFAFC] dark:bg-[#1C1C1E] text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-[#F0F0F2] dark:hover:bg-[#242426]'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>

                {selectedCategory === 'Other' && (
                  <div className="pt-2">
                    <label className="text-[11px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] block mb-1">
                      Custom Category Description *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={80}
                      value={customCategoryInput}
                      onChange={(e) => setCustomCategoryInput(e.target.value)}
                      placeholder="Specify custom category..."
                      className="w-full px-3 py-2 text-xs bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl text-[#1D1D1F] dark:text-[#F5F5F7] outline-none"
                    />
                  </div>
                )}
              </div>

              {/* STEP 4: REASON / DESCRIPTION */}
              <div className="space-y-2 pt-4 border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                    Step 4: Reason / Description *
                  </label>
                  <span
                    className={`text-[11px] font-mono ${
                      descriptionInput.trim().length >= 10
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-[#86868B]'
                    }`}
                  >
                    {descriptionInput.length} / 500 chars (min 10)
                  </span>
                </div>

                <textarea
                  required
                  rows={3}
                  maxLength={500}
                  value={descriptionInput}
                  onChange={(e) => setDescriptionInput(e.target.value)}
                  placeholder={
                    selectedReviewType === 'POSITIVE'
                      ? 'Explain what the employee did well, the specific task or achievement, and how it positively impacted the team...'
                      : 'Describe the specific incident, missed commitment, or behaviour objectively so the Owner/Admin can review it fairly...'
                  }
                  className="w-full p-3 text-xs sm:text-sm bg-[#F0F0F2] dark:bg-[#202022] focus:bg-white dark:focus:bg-[#161618] border border-[#E5E5EA] dark:border-[#2C2C2E] focus:border-[#1D1D1F] dark:focus:border-[#F5F5F7] rounded-xl text-[#1D1D1F] dark:text-[#F5F5F7] outline-none"
                />
              </div>

              {/* STEP 5: STAR SELECTION (1 TO 5 STARS) */}
              <div className="space-y-2.5 pt-4 border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                    Step 5: Star Selection (1 to 5 Stars) *
                  </label>
                  {selectedStars > 0 ? (
                    <span
                      className={`text-xs font-mono font-bold ${
                        selectedReviewType === 'POSITIVE'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-rose-700 dark:text-rose-400'
                      }`}
                    >
                      Selected:{' '}
                      {selectedReviewType === 'POSITIVE'
                        ? `+${selectedStars}`
                        : `−${selectedStars}`}{' '}
                      {selectedStars === 1 ? 'Star' : 'Stars'}
                    </span>
                  ) : (
                    <span className="text-[11px] text-[#86868B]">Select 1 to 5 stars</span>
                  )}
                </div>

                {/* Interactive Star Selector Buttons (1 Star .. 5 Stars) */}
                <div className="grid grid-cols-5 gap-2">
                  {STAR_OPTIONS.map((opt) => {
                    const isActive = selectedStars === opt.value;
                    const isWithinStarCount =
                      (hoveredStars || selectedStars) >= opt.value;

                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onMouseEnter={() => setHoveredStars(opt.value)}
                        onMouseLeave={() => setHoveredStars(0)}
                        onClick={() => setSelectedStars(opt.value)}
                        className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                          isActive
                            ? selectedReviewType === 'POSITIVE'
                              ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-600'
                              : 'border-rose-600 bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 ring-1 ring-rose-600'
                            : 'border-[#E5E5EA] dark:border-[#2C2C2E] bg-[#FAFAFC] dark:bg-[#1C1C1E] hover:bg-[#F0F0F2] dark:hover:bg-[#242426]'
                        }`}
                      >
                        <Star
                          className={`w-5 h-5 transition-colors ${
                            isWithinStarCount
                              ? selectedReviewType === 'POSITIVE'
                                ? 'fill-emerald-500 text-emerald-500'
                                : 'fill-rose-500 text-rose-500'
                              : 'text-[#86868B]'
                          }`}
                        />
                        <span className="text-xs font-semibold">{opt.label}</span>
                        <span className="text-[10px] font-mono text-[#6E6E73] dark:text-[#A1A1A6]">
                          {selectedReviewType === 'POSITIVE'
                            ? `+${opt.value}`
                            : `−${opt.value}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* STEP 6 & 7: AUTOMATIC SERVER DATE & PRE-SUBMISSION SUMMARY */}
              <div className="p-4 rounded-2xl bg-[#F5F5F7] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                    Review Confirmation Summary
                  </span>
                  <span className="text-[11px] font-mono text-[#6E6E73] dark:text-[#A1A1A6]">
                    Auto Server Date: {currentServerDateDisplay}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs pt-1">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#161618] border border-[#E5E5EA] dark:border-[#2C2C2E]">
                    <div className="text-[10px] text-[#86868B] uppercase">Selected Employee</div>
                    <div className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] truncate mt-0.5">
                      {selectedTargetEmployeeObj
                        ? selectedTargetEmployeeObj.fullName
                        : 'Not selected'}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#161618] border border-[#E5E5EA] dark:border-[#2C2C2E]">
                    <div className="text-[10px] text-[#86868B] uppercase">Review Type</div>
                    <div
                      className={`font-semibold mt-0.5 ${
                        selectedReviewType === 'POSITIVE'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-rose-700 dark:text-rose-400'
                      }`}
                    >
                      {selectedReviewType === 'POSITIVE' ? 'Positive' : 'Negative'}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#161618] border border-[#E5E5EA] dark:border-[#2C2C2E]">
                    <div className="text-[10px] text-[#86868B] uppercase">Category</div>
                    <div className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] truncate mt-0.5">
                      {selectedCategory === 'Other' && customCategoryInput.trim()
                        ? `Other: ${customCategoryInput.trim()}`
                        : selectedCategory || 'Not selected'}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#161618] border border-[#E5E5EA] dark:border-[#2C2C2E]">
                    <div className="text-[10px] text-[#86868B] uppercase">Star Impact</div>
                    <div
                      className={`font-mono font-bold mt-0.5 ${
                        selectedStars > 0
                          ? selectedReviewType === 'POSITIVE'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-rose-700 dark:text-rose-400'
                          : 'text-[#86868B]'
                      }`}
                    >
                      {selectedStars > 0
                        ? `${
                            selectedReviewType === 'POSITIVE'
                              ? `+${selectedStars}`
                              : `−${selectedStars}`
                          } ${selectedStars === 1 ? 'Star' : 'Stars'}`
                        : 'Select 1–5★'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* STEP 7: SUBMIT & CANCEL BUTTONS */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
            <button
              type="button"
              onClick={() => setGiveStarsOpen(false)}
              className="px-4 py-2 text-xs font-medium text-[#6E6E73] dark:text-[#A1A1A6] hover:text-[#1D1D1F] dark:hover:text-white rounded-xl bg-[#F0F0F2] dark:bg-[#2C2C2E] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedReviewType}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#1D1D1F] dark:bg-white dark:text-[#1D1D1F] hover:opacity-90 rounded-xl transition-opacity cursor-pointer disabled:opacity-40"
            >
              Submit Review
            </button>
          </div>
        </form>
      </ModalShell>

      {/* =====================================================================
          DRAWER 1: ANONYMOUS RECEIVED REVIEW DETAILS (ZERO REVIEWER IDENTITY)
          ===================================================================== */}
      <SlideOverDrawer
        open={Boolean(selectedReceivedReview)}
        onClose={() => setSelectedReceivedReview(null)}
        title="Received Star Details"
        subtitle="Confidential Peer Review Record"
        width="max-w-md"
      >
        {selectedReceivedReview &&
          (() => {
            const stars = Math.min(
              5,
              Math.max(1, Number(selectedReceivedReview.starCount) || 1)
            );
            const isPositive = selectedReceivedReview.reviewType === 'POSITIVE';

            return (
              <div className="space-y-5">
                <div
                  className={`p-5 rounded-2xl border text-center space-y-2 ${
                    isPositive
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800'
                  }`}
                >
                  <div className="flex justify-center">
                    <StarIconsRow
                      count={stars}
                      type={selectedReceivedReview.reviewType}
                      size="md"
                    />
                  </div>
                  <div
                    className={`text-2xl font-bold font-mono tabular-nums ${
                      isPositive
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : 'text-rose-700 dark:text-rose-300'
                    }`}
                  >
                    {isPositive ? `+${stars}` : `−${stars}`}{' '}
                    {stars === 1 ? 'Star' : 'Stars'} ({isPositive ? 'Positive' : 'Negative'})
                  </div>
                  <div className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                    Category: {selectedReceivedReview.category || 'General'}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-[#6E6E73] dark:text-[#A1A1A6] uppercase">
                    Reason / Description
                  </div>
                  <p className="text-sm text-[#1D1D1F] dark:text-[#F5F5F7] bg-[#F5F5F7] dark:bg-[#202022] p-4 rounded-xl border border-[#E5E5EA] dark:border-[#2C2C2E] leading-relaxed">
                    {selectedReceivedReview.reason}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F5F5F7] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#6E6E73] dark:text-[#A1A1A6]">Date Received:</span>
                    <span className="font-mono font-semibold">
                      {selectedReceivedReview.submittedAt.slice(0, 10)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6E6E73] dark:text-[#A1A1A6]">Submitted By:</span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Anonymous Colleague
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}
      </SlideOverDrawer>

      {/* =====================================================================
          DRAWER 2: LIMITED PUBLIC EMPLOYEE PROFILE
          ===================================================================== */}
      <SlideOverDrawer
        open={Boolean(viewingPublicEmployee)}
        onClose={() => setViewingPublicEmployee(null)}
        title="Employee Star Profile"
        subtitle="Public Recognition & Net Star Balance"
        width="max-w-xl"
        footer={
          viewingPublicEmployee && viewingPublicEmployee.id !== currentEmployee.id ? (
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  const emp = viewingPublicEmployee;
                  setViewingPublicEmployee(null);
                  handleOpenGiveStars(emp, 'POSITIVE');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>Give Positive Stars</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const emp = viewingPublicEmployee;
                  setViewingPublicEmployee(null);
                  handleOpenGiveStars(emp, 'NEGATIVE');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl cursor-pointer"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
                <span>Give Negative Stars</span>
              </button>
            </div>
          ) : undefined
        }
      >
        {viewingPublicEmployee &&
          (() => {
            const sum = getEmployeeStarSummary(viewingPublicEmployee.id);
            const pubReviews = getPublicEmployeeReviews(viewingPublicEmployee.id);

            return (
              <div className="space-y-5">
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#F5F5F7] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E]">
                  <EmployeeAvatar
                    name={viewingPublicEmployee.fullName}
                    avatarUrl={viewingPublicEmployee.avatarUrl}
                    size="xl"
                  />
                  <div>
                    <h3 className="text-base font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">
                      {viewingPublicEmployee.fullName}
                    </h3>
                    <p className="text-xs text-[#6E6E73] dark:text-[#A1A1A6]">
                      {viewingPublicEmployee.designation} · {viewingPublicEmployee.department}
                    </p>
                    <p className="text-[11px] font-mono text-[#86868B] mt-0.5">
                      ID: {viewingPublicEmployee.id}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                    <div className="text-lg font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      +{sum.approvedPositive}★
                    </div>
                    <div className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-0.5">
                      Positive Stars
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
                    <div className="text-lg font-mono font-bold text-rose-700 dark:text-rose-400">
                      −{sum.approvedNegative}★
                    </div>
                    <div className="text-[11px] text-rose-800 dark:text-rose-300 mt-0.5">
                      Negative Stars
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#F5F5F7] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E]">
                    <div className="text-lg font-mono font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">
                      {sum.netScore > 0
                        ? `+${sum.netScore}★`
                        : sum.netScore < 0
                        ? `−${Math.abs(sum.netScore)}★`
                        : '0★'}
                    </div>
                    <div className="text-[11px] text-[#6E6E73] dark:text-[#A1A1A6] mt-0.5">
                      Net Balance
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#6E6E73] dark:text-[#A1A1A6]">
                    Approved Star History ({pubReviews.length})
                  </h4>
                  {pubReviews.length > 0 ? (
                    <div className="space-y-2.5">
                      {pubReviews.map((r) => {
                        const st = Math.min(5, Math.max(1, Number(r.starCount) || 1));
                        return (
                          <div
                            key={r.id}
                            className="p-3.5 rounded-xl bg-[#F5F5F7] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <StarIconsRow count={st} type={r.reviewType} />
                                <span className="text-xs font-semibold">
                                  {r.category || 'General'}
                                </span>
                              </div>
                              <span className="text-[11px] font-mono text-[#86868B]">
                                {r.submittedAt.slice(0, 10)}
                              </span>
                            </div>
                            <p className="text-xs text-[#1D1D1F] dark:text-[#F5F5F7]">
                              {r.reason}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-[#6E6E73] dark:text-[#A1A1A6]">
                      No approved reviews yet.
                    </p>
                  )}
                </div>
              </div>
            );
          })()}
      </SlideOverDrawer>

      {/* =====================================================================
          ADMIN MODAL: MANAGE DYNAMIC REVIEW CATEGORIES
          ===================================================================== */}
      <ModalShell
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        title="Manage Review Categories"
        subtitle="Configure the Positive and Negative categories displayed in Step 3 of Give Stars."
        maxWidth="max-w-lg"
      >
        <div className="space-y-5">
          <form onSubmit={handleAddCustomCategory} className="flex items-center gap-2">
            <select
              value={newCategoryType}
              onChange={(e) => setNewCategoryType(e.target.value as ReviewType)}
              className="py-2 px-3 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl text-xs"
            >
              <option value="POSITIVE">Positive</option>
              <option value="NEGATIVE">Negative</option>
            </select>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="New category name..."
              className="flex-1 py-2 px-3 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl text-xs outline-none"
            />
            <button
              type="submit"
              className="px-3.5 py-2 text-xs font-semibold bg-[#1D1D1F] dark:bg-white text-white dark:text-[#1D1D1F] rounded-xl cursor-pointer"
            >
              Add
            </button>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-2">
              <div className="font-semibold text-emerald-700 dark:text-emerald-400">
                Positive Categories ({positiveCategories.length})
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {positiveCategories.map((c) => (
                  <div
                    key={c}
                    className="px-2.5 py-1.5 rounded-lg bg-[#F5F5F7] dark:bg-[#202022] flex items-center justify-between"
                  >
                    <span>{c}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-semibold text-rose-700 dark:text-rose-400">
                Negative Categories ({negativeCategories.length})
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {negativeCategories.map((c) => (
                  <div
                    key={c}
                    className="px-2.5 py-1.5 rounded-lg bg-[#F5F5F7] dark:bg-[#202022] flex items-center justify-between"
                  >
                    <span>{c}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </ModalShell>

      {/* =====================================================================
          ADMIN MODAL: EDIT REVIEW RECORD
          ===================================================================== */}
      <ModalShell
        isOpen={Boolean(editingReview)}
        onClose={() => setEditingReview(null)}
        title="Edit Review Record"
        subtitle="Modify review details or approval state."
        maxWidth="max-w-lg"
      >
        {editingReview && (
          <form onSubmit={handleSaveEditedReview} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold block mb-1">Review Type</label>
                <select
                  value={editReviewType}
                  onChange={(e) => setEditReviewType(e.target.value as ReviewType)}
                  className="w-full py-2 px-3 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl text-xs"
                >
                  <option value="POSITIVE">Positive</option>
                  <option value="NEGATIVE">Negative</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1">Stars (1–5)</label>
                <select
                  value={editStarCount}
                  onChange={(e) => setEditStarCount(Number(e.target.value))}
                  className="w-full py-2 px-3 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl text-xs"
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? 'Star' : 'Stars'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as ReviewStatus)}
                  className="w-full py-2 px-3 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl text-xs"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1">Category</label>
              <input
                type="text"
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="w-full py-2 px-3 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1">Description</label>
              <textarea
                rows={3}
                required
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                className="w-full p-3 text-xs bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
              <button
                type="button"
                onClick={() => setEditingReview(null)}
                className="px-4 py-2 text-xs font-medium rounded-xl bg-[#F0F0F2] dark:bg-[#2C2C2E] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-[#1D1D1F] dark:bg-white dark:text-[#1D1D1F] rounded-xl cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        )}
      </ModalShell>

      <ConfirmDialog
        isOpen={Boolean(deletingReview)}
        onClose={() => setDeletingReview(null)}
        onConfirm={() => {
          if (deletingReview) {
            deleteEmployeeReview(deletingReview.id, 'Removed by Admin');
          }
        }}
        title="Delete Review?"
        message="Are you sure you want to delete this review? Any approved star impact will be recalculated immediately."
        confirmLabel="Delete Review"
      />
    </div>
  );
};
