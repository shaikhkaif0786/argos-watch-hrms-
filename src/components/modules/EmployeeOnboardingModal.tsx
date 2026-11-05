import React, { useState, useEffect, useMemo } from 'react';
import {
  User,
  Briefcase,
  Clock,
  MapPin,
  GraduationCap,
  History,
  FileText,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Calendar,
  Save,
  ArrowRight,
  ArrowLeft,
  X,
  Layers,
  Sparkles,
  Shield,
  Phone,
  Mail,
} from 'lucide-react';
import { Department, Employee, EmployeeRecord, Role, UserRole } from '../../types/hrms';
import { ModalShell } from '../ui/EnterpriseComponents';

interface EducationItem {
  id: string;
  schoolName: string;
  degree: string;
  fieldOfStudy: string;
  completionDate: string;
  notes: string;
}

interface ExperienceItem {
  id: string;
  occupation: string;
  company: string;
  workSummary: string;
  duration: string;
  currentlyWorking: boolean;
}

interface EmployeeOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingEmp: EmployeeRecord | null;
  departments: Department[];
  allEmployees: Employee[];
  onSave: (employeePayload: any, generateOfferLetter: boolean) => void;
  addToast: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

export function EmployeeOnboardingModal({
  isOpen,
  onClose,
  editingEmp,
  departments,
  allEmployees,
  onSave,
  addToast,
}: EmployeeOnboardingModalProps) {
  // Current step 1 to 7
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(1);

  // SECTION A: BASIC INFORMATION
  const [empCode, setEmpCode] = useState('EMP-1008');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [dob, setDob] = useState('1996-05-20');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [personalEmail, setPersonalEmail] = useState('');
  const [officialEmail, setOfficialEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('+91 98201 55000');
  const [emergencyContactName, setEmergencyContactName] = useState('Family Contact');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('+91 98201 11222');
  const [emergencyContactRelation, setEmergencyContactRelation] = useState('Parent / Spouse');
  const [joiningDate, setJoiningDate] = useState('2026-11-01');

  // SECTION B: EMPLOYMENT & PROFESSIONAL DETAILS
  const [experienceYears, setExperienceYears] = useState('3');
  const [experienceMonths, setExperienceMonths] = useState('0');
  const [workLocation, setWorkLocation] = useState('Surat Atelier HQ');
  const [sourceOfHire, setSourceOfHire] = useState('Direct Application');
  const [designation, setDesignation] = useState('Horological Craftsman');
  const [skillSet, setSkillSet] = useState('Movement Assembly, CAD, Quality Regulation');
  const [currentSalary, setCurrentSalary] = useState(65000);
  const [annualCTC, setAnnualCTC] = useState(780000);
  const [department, setDepartment] = useState('Assembling-Packaging/Dispatch');
  const [highestQualification, setHighestQualification] = useState('Bachelor of Design');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [tentativeJoiningDate, setTentativeJoiningDate] = useState('2026-11-01');
  const [reportingManager, setReportingManager] = useState('Husein Kakajiwala');
  const [workMode, setWorkMode] = useState<'On-site' | 'Hybrid' | 'Remote'>('On-site');
  const [shiftSchedule, setShiftSchedule] = useState('General Shift (09:30 AM – 06:30 PM)');
  const [employmentStatus, setEmploymentStatus] = useState<'Active' | 'In Probation' | 'On Leave'>('Active');

  // SECTION C: EMPLOYEE TYPE & PROBATION RULES
  const [employeeType, setEmployeeType] = useState<
    | 'Probation'
    | 'Permanent'
    | 'Intern / Internship'
    | 'Contract'
    | 'Temporary'
    | 'Part-time'
    | 'Consultant'
    | 'Other'
  >('Probation');
  const [probationDurationMonths, setProbationDurationMonths] = useState(3);
  const [probationStartDate, setProbationStartDate] = useState('2026-11-01');

  // Auto-calculated expected probation end date based on duration
  const probationEndDate = useMemo(() => {
    try {
      const start = new Date(probationStartDate || joiningDate || '2026-11-01');
      start.setMonth(start.getMonth() + Number(probationDurationMonths || 3));
      return start.toISOString().split('T')[0];
    } catch {
      return '2027-02-01';
    }
  }, [probationStartDate, joiningDate, probationDurationMonths]);

  // SECTION D: ADDRESS DETAILS
  const [presentLine1, setPresentLine1] = useState('402 Horology Park, Dumas Road');
  const [presentLine2, setPresentLine2] = useState('Athwa Lines');
  const [presentCity, setPresentCity] = useState('Surat');
  const [presentState, setPresentState] = useState('Gujarat');
  const [presentCountry, setPresentCountry] = useState('India');
  const [presentPostalCode, setPresentPostalCode] = useState('395007');

  const [permanentLine1, setPermanentLine1] = useState('402 Horology Park, Dumas Road');
  const [permanentLine2, setPermanentLine2] = useState('Athwa Lines');
  const [permanentCity, setPermanentCity] = useState('Surat');
  const [permanentState, setPermanentState] = useState('Gujarat');
  const [permanentCountry, setPermanentCountry] = useState('India');
  const [permanentPostalCode, setPermanentPostalCode] = useState('395007');
  const [sameAsPresentAddress, setSameAsPresentAddress] = useState(true);

  // Sync permanent address when "Same as Present Address" is checked
  useEffect(() => {
    if (sameAsPresentAddress) {
      setPermanentLine1(presentLine1);
      setPermanentLine2(presentLine2);
      setPermanentCity(presentCity);
      setPermanentState(presentState);
      setPermanentCountry(presentCountry);
      setPermanentPostalCode(presentPostalCode);
    }
  }, [
    sameAsPresentAddress,
    presentLine1,
    presentLine2,
    presentCity,
    presentState,
    presentCountry,
    presentPostalCode,
  ]);

  // SECTION E: EDUCATION DETAILS
  const [educationList, setEducationList] = useState<EducationItem[]>([
    {
      id: 'EDU-1',
      schoolName: 'National Institute of Design (NID)',
      degree: 'B.Des',
      fieldOfStudy: 'Industrial & Precision Product Design',
      completionDate: '2022-05-30',
      notes: 'First Class with Distinction',
    },
  ]);

  // SECTION F: PREVIOUS & CURRENT EXPERIENCE
  const [experienceList, setExperienceList] = useState<ExperienceItem[]>([
    {
      id: 'EXP-1',
      occupation: 'Junior Watchmaker',
      company: 'Heritage Horology Atelier',
      workSummary: 'Mechanical movement casing, disassembly, balance-wheel calibration.',
      duration: '2 Years 6 Months',
      currentlyWorking: false,
    },
  ]);

  // SECTION G: DOCUMENTS & FINALIZATION
  const [offerLetterUploaded, setOfferLetterUploaded] = useState('Signed_Offer_Letter.pdf');
  const [panNumber, setPanNumber] = useState('ARGPK1008A');
  const [bankAccount, setBankAccount] = useState('HDFC Bank •••• 9910');
  const [role, setRole] = useState<Role>('EMPLOYEE');
  const [autoGenerateOfferLetter, setAutoGenerateOfferLetter] = useState(true);

  // Prepopulate form when editing an employee
  useEffect(() => {
    if (editingEmp) {
      setEmpCode(editingEmp.employeeCode);
      const names = editingEmp.fullName.split(' ');
      setFirstName(names[0] || '');
      setMiddleName(names.length > 2 ? names[1] : '');
      setLastName(names.length > 1 ? names[names.length - 1] : '');
      setOfficialEmail(editingEmp.email);
      setPersonalEmail(editingEmp.email);
      setMobileNumber(editingEmp.phone);
      setDepartment(editingEmp.department);
      setDesignation(editingEmp.designation);
      setRole(editingEmp.role);
      setReportingManager(editingEmp.reportingManager);
      setJoiningDate(editingEmp.joiningDate);
      setWorkLocation(editingEmp.location);
      setAnnualCTC(editingEmp.annualCTC);
      setCurrentSalary(Math.round(editingEmp.annualCTC / 12));
      setPanNumber(editingEmp.panNumber || 'ARGPK1008A');
      setBankAccount(editingEmp.bankAccount || 'HDFC •••• 9910');
      setEmployeeType(
        (editingEmp as any).employeeType === 'PROBATION'
          ? 'Probation'
          : (editingEmp as any).employeeType || 'Permanent'
      );
    } else {
      // Default new onboarding values
      setEmpCode(`EMP-100${allEmployees.length + 1}`);
      setFirstName('');
      setMiddleName('');
      setLastName('');
      setPersonalEmail('');
      setOfficialEmail('');
      setDepartment(departments[0]?.name || 'Human Resource');
      setReportingManager(allEmployees[0]?.fullName || 'Chaitanya Katare');
    }
  }, [editingEmp, allEmployees, departments]);

  // Add Education Row
  const addEducationRow = () => {
    setEducationList((prev) => [
      ...prev,
      {
        id: `EDU-${Date.now()}`,
        schoolName: '',
        degree: '',
        fieldOfStudy: '',
        completionDate: '',
        notes: '',
      },
    ]);
  };

  // Remove Education Row
  const removeEducationRow = (id: string) => {
    setEducationList((prev) => prev.filter((item) => item.id !== id));
  };

  // Add Experience Row
  const addExperienceRow = () => {
    setExperienceList((prev) => [
      ...prev,
      {
        id: `EXP-${Date.now()}`,
        occupation: '',
        company: '',
        workSummary: '',
        duration: '',
        currentlyWorking: false,
      },
    ]);
  };

  // Remove Experience Row
  const removeExperienceRow = (id: string) => {
    setExperienceList((prev) => prev.filter((item) => item.id !== id));
  };

  // Save Draft (Local confirmation)
  const handleSaveDraft = () => {
    addToast(
      'Draft Saved',
      `Onboarding draft for ${firstName || 'Employee'} (${empCode}) preserved.`,
      'info'
    );
  };

  // Validation & Final Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const constructedFullName = [firstName.trim(), middleName.trim(), lastName.trim()]
      .filter(Boolean)
      .join(' ');

    if (!constructedFullName) {
      addToast('Validation Failed', 'Please provide First and Last Name.', 'error');
      setCurrentStep(1);
      return;
    }

    if (!officialEmail.trim()) {
      addToast('Validation Failed', 'Official email address is required.', 'error');
      setCurrentStep(1);
      return;
    }

    // Check for duplicate employee ID if creating new
    if (!editingEmp) {
      const isDuplicate = allEmployees.some(
        (emp) => emp.id.toLowerCase() === empCode.trim().toLowerCase()
      );
      if (isDuplicate) {
        addToast(
          'Duplicate Employee ID',
          `An employee with ID "${empCode}" already exists. Please specify a unique ID.`,
          'error'
        );
        setCurrentStep(1);
        return;
      }
    }

    const payload = {
      employeeCode: empCode.trim(),
      fullName: constructedFullName,
      firstName: firstName.trim(),
      middleName: middleName.trim(),
      lastName: lastName.trim(),
      dob,
      gender,
      personalEmail: personalEmail.trim(),
      email: officialEmail.trim(),
      phone: mobileNumber.trim(),
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelation,
      emergencyContact: `${emergencyContactName} (${emergencyContactPhone}) - ${emergencyContactRelation}`,
      joiningDate,
      tentativeJoiningDate,
      experienceYears,
      experienceMonths,
      location: workLocation,
      sourceOfHire,
      designation: designation.trim(),
      skillSet,
      department,
      reportingManager,
      workMode,
      shiftSchedule,
      status: employmentStatus === 'Active' ? 'ACTIVE' : 'ACTIVE',
      employeeType,
      probationStartDate,
      probationEndDate,
      probationDurationMonths,
      highestQualification,
      additionalInfo,
      annualCTC: Number(annualCTC),
      panNumber,
      bankAccount,
      structuredAddress: {
        addressLine1: presentLine1,
        addressLine2: presentLine2,
        city: presentCity,
        state: presentState,
        country: presentCountry,
        postalCode: presentPostalCode,
      },
      permanentAddress: {
        addressLine1: permanentLine1,
        addressLine2: permanentLine2,
        city: permanentCity,
        state: permanentState,
        country: permanentCountry,
        postalCode: permanentPostalCode,
      },
      address: `${presentLine1}, ${presentLine2 ? `${presentLine2}, ` : ''}${presentCity}, ${presentState} - ${presentPostalCode}`,
      education: educationList,
      experience: experienceList,
      role,
    };

    onSave(payload, autoGenerateOfferLetter);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={
        editingEmp
          ? `Edit Employee Profile — ${editingEmp.fullName}`
          : 'Complete Employee Onboarding'
      }
      subtitle="Comprehensive multi-step onboarding wizard inspired by Zoho People"
      maxWidth="max-w-4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Progressive Step Navigation Tabs */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-1 bg-[#F2F2F2] p-1.5 rounded-xl border border-[#CBCBCB]">
          {[
            { step: 1, label: '1. Basic Info' },
            { step: 2, label: '2. Employment' },
            { step: 3, label: '3. Probation' },
            { step: 4, label: '4. Address' },
            { step: 5, label: '5. Education' },
            { step: 6, label: '6. Experience' },
            { step: 7, label: '7. Finalize' },
          ].map((tab) => (
            <button
              key={tab.step}
              type="button"
              onClick={() => setCurrentStep(tab.step as any)}
              className={`py-1.5 px-2 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap text-center ${
                currentStep === tab.step
                  ? 'bg-[#164C38] text-[#F2F2F2] shadow-xs'
                  : 'text-[#525854] hover:text-[#141A17]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* =================================================================== */}
        {/* STEP 1: BASIC INFORMATION                                          */}
        {/* =================================================================== */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="border-b border-[#CBCBCB] pb-2">
              <h3 className="text-xs font-bold uppercase text-[#164C38] tracking-wider">
                Section A: Basic Personal Information
              </h3>
              <p className="text-[11px] text-[#525854]">
                Official legal names, identity credentials, emergency points of contact, and joining schedule.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                  Employee ID *
                </label>
                <input
                  type="text"
                  required
                  value={empCode}
                  onChange={(e) => setEmpCode(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs font-mono font-bold text-[#164C38]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                  Joining Date *
                </label>
                <input
                  type="date"
                  required
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  required
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Taha"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                  Middle Name
                </label>
                <input
                  type="text"
                  placeholder="Optional"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Derolwala"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                  Official Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@argos.watch"
                  value={officialEmail}
                  onChange={(e) => setOfficialEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                  Personal Email
                </label>
                <input
                  type="email"
                  placeholder="personal@gmail.com"
                  value={personalEmail}
                  onChange={(e) => setPersonalEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                  Mobile Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="+91 98201 00000"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                  Gender *
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs font-semibold"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other / Prefer not to say</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                  Emergency Contact Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Rashida Derolwala"
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                  Emergency Contact Phone *
                </label>
                <input
                  type="text"
                  placeholder="+91 98201 11222"
                  value={emergencyContactPhone}
                  onChange={(e) => setEmergencyContactPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* STEP 2: EMPLOYMENT & PROFESSIONAL DETAILS                          */}
        {/* =================================================================== */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="border-b border-[#CBCBCB] pb-2">
              <h3 className="text-xs font-bold uppercase text-[#164C38] tracking-wider">
                Section B: Employment & Professional Details
              </h3>
              <p className="text-[11px] text-[#525854]">
                Designation, department source of truth, experience, skill sets, reporting lines, and work schedule.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                  Job Title / Designation *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Horological Technician"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                  Department (Central Source) *
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs font-semibold text-[#164C38]"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                  Reporting Manager *
                </label>
                <select
                  value={reportingManager}
                  onChange={(e) => setReportingManager(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs font-medium"
                >
                  {allEmployees.map((e) => (
                    <option key={e.id} value={e.fullName}>
                      {e.fullName} ({e.designation} · {e.department})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                  Prior Experience
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    placeholder="Years"
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(e.target.value)}
                    className="w-1/2 px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs font-mono"
                  />
                  <input
                    type="number"
                    min="0"
                    max="11"
                    placeholder="Months"
                    value={experienceMonths}
                    onChange={(e) => setExperienceMonths(e.target.value)}
                    className="w-1/2 px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                  Source of Hire
                </label>
                <select
                  value={sourceOfHire}
                  onChange={(e) => setSourceOfHire(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs"
                >
                  <option value="Direct Application">Direct Application</option>
                  <option value="Employee Referral">Employee Referral</option>
                  <option value="Campus Recruitment">Campus Recruitment</option>
                  <option value="LinkedIn Talent">LinkedIn Talent</option>
                  <option value="Recruitment Agency">Recruitment Agency</option>
                  <option value="Executive Search">Executive Search</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                  Highest Qualification
                </label>
                <input
                  type="text"
                  placeholder="e.g., B.Des / B.Tech / Diploma"
                  value={highestQualification}
                  onChange={(e) => setHighestQualification(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                  Work Location
                </label>
                <input
                  type="text"
                  value={workLocation}
                  onChange={(e) => setWorkLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                  Work Mode
                </label>
                <select
                  value={workMode}
                  onChange={(e) => setWorkMode(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs font-semibold"
                >
                  <option value="On-site">On-site (Atelier)</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="Remote">Remote</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                  Shift Schedule
                </label>
                <select
                  value={shiftSchedule}
                  onChange={(e) => setShiftSchedule(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs"
                >
                  <option value="General Shift (09:30 AM – 06:30 PM)">
                    General Shift (09:30 AM – 06:30 PM)
                  </option>
                  <option value="Morning Atelier Shift (08:00 AM – 05:00 PM)">
                    Morning Atelier Shift (08:00 AM – 05:00 PM)
                  </option>
                  <option value="Dispatch Peak Shift (11:00 AM – 08:00 PM)">
                    Dispatch Peak Shift (11:00 AM – 08:00 PM)
                  </option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                Skill Set Tags
              </label>
              <input
                type="text"
                placeholder="Comma separated skills, e.g., Caliber Assembly, Regulation, Laser Engraving"
                value={skillSet}
                onChange={(e) => setSkillSet(e.target.value)}
                className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs"
              />
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* STEP 3: EMPLOYEE TYPE & PROBATION RULES                             */}
        {/* =================================================================== */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="border-b border-[#CBCBCB] pb-2">
              <h3 className="text-xs font-bold uppercase text-[#164C38] tracking-wider">
                Section C: Employee Type & Probation Policy
              </h3>
              <p className="text-[11px] text-[#525854]">
                Select the contractual category and configure automated probation tracking with confirmation alerts.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                  Employment Category *
                </label>
                <select
                  value={employeeType}
                  onChange={(e) => setEmployeeType(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs font-bold text-[#164C38]"
                >
                  <option value="Probation">Probation (New Hire Assessment)</option>
                  <option value="Permanent">Permanent (Confirmed Full-Time)</option>
                  <option value="Intern / Internship">Intern / Internship (Trainee)</option>
                  <option value="Contract">Contract (Fixed Term)</option>
                  <option value="Temporary">Temporary (Seasonal / Peak Demand)</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Consultant">Consultant / External Advisor</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                  Probation Policy Duration (Months)
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={probationDurationMonths}
                  onChange={(e) => setProbationDurationMonths(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs font-mono font-bold"
                />
              </div>
            </div>

            {/* Probation Calculation Card */}
            <div className="p-4 bg-[#164C38]/5 border border-[#164C38]/20 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#164C38] uppercase text-[11px] tracking-wider">
                  Automated Probation Lifecycle Computation
                </span>
                <span className="px-2 py-0.5 rounded bg-[#164C38] text-[#F2F2F2] text-[10px] font-mono font-bold">
                  {employeeType === 'Probation' ? 'Probation Active' : employeeType}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-[#164C38]/15">
                <div>
                  <span className="text-[10px] text-[#525854] block">Probation Start</span>
                  <strong className="text-[#141A17] font-mono">{joiningDate}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[#525854] block">Expected End Date</span>
                  <strong className="text-[#164C38] font-mono">{probationEndDate}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[#525854] block">Confirmation Rule</span>
                  <span className="text-[#141A17]">HR Review at {probationDurationMonths} Mo</span>
                </div>
              </div>

              <p className="text-[11px] text-[#525854] pt-1">
                Notice: Employees will not be automatically converted to Permanent without authorized HR/Admin review and sign-off.
              </p>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* STEP 4: ADDRESS DETAILS                                             */}
        {/* =================================================================== */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div className="border-b border-[#CBCBCB] pb-2">
              <h3 className="text-xs font-bold uppercase text-[#164C38] tracking-wider">
                Section D: Address Details
              </h3>
              <p className="text-[11px] text-[#525854]">
                Present residential address and legal permanent domicile with automatic synchronization.
              </p>
            </div>

            {/* Present Address */}
            <div className="space-y-3 p-3.5 bg-[#F2F2F2] rounded-xl border border-[#CBCBCB]">
              <span className="text-[11px] font-bold uppercase text-[#141A17] block">
                Present Residential Address
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Address Line 1 *"
                  required
                  value={presentLine1}
                  onChange={(e) => setPresentLine1(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg text-xs"
                />
                <input
                  type="text"
                  placeholder="Address Line 2"
                  value={presentLine2}
                  onChange={(e) => setPresentLine2(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg text-xs"
                />
                <input
                  type="text"
                  placeholder="City *"
                  required
                  value={presentCity}
                  onChange={(e) => setPresentCity(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg text-xs"
                />
                <input
                  type="text"
                  placeholder="State *"
                  required
                  value={presentState}
                  onChange={(e) => setPresentState(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg text-xs"
                />
                <input
                  type="text"
                  placeholder="Country *"
                  required
                  value={presentCountry}
                  onChange={(e) => setPresentCountry(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg text-xs"
                />
                <input
                  type="text"
                  placeholder="Postal Code *"
                  required
                  value={presentPostalCode}
                  onChange={(e) => setPresentPostalCode(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg text-xs font-mono"
                />
              </div>
            </div>

            {/* Same as Present Checkbox */}
            <label className="flex items-center gap-2 p-2.5 rounded-lg bg-white border border-[#CBCBCB] text-xs font-semibold text-[#141A17] cursor-pointer">
              <input
                type="checkbox"
                checked={sameAsPresentAddress}
                onChange={(e) => setSameAsPresentAddress(e.target.checked)}
                className="accent-[#164C38]"
              />
              Permanent Address is the same as Present Address
            </label>

            {/* Permanent Address */}
            {!sameAsPresentAddress && (
              <div className="space-y-3 p-3.5 bg-[#F2F2F2] rounded-xl border border-[#CBCBCB]">
                <span className="text-[11px] font-bold uppercase text-[#141A17] block">
                  Permanent Legal Address
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Address Line 1"
                    value={permanentLine1}
                    onChange={(e) => setPermanentLine1(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Address Line 2"
                    value={permanentLine2}
                    onChange={(e) => setPermanentLine2(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg text-xs"
                  />
                  <input
                    type="text"
                    placeholder="City"
                    value={permanentCity}
                    onChange={(e) => setPermanentCity(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg text-xs"
                  />
                  <input
                    type="text"
                    placeholder="State"
                    value={permanentState}
                    onChange={(e) => setPermanentState(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Country"
                    value={permanentCountry}
                    onChange={(e) => setPermanentCountry(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Postal Code"
                    value={permanentPostalCode}
                    onChange={(e) => setPermanentPostalCode(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg text-xs font-mono"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* STEP 5: EDUCATION DETAILS (ADD / REMOVE ROWS)                       */}
        {/* =================================================================== */}
        {currentStep === 5 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#CBCBCB] pb-2">
              <div>
                <h3 className="text-xs font-bold uppercase text-[#164C38] tracking-wider">
                  Section E: Educational Qualifications
                </h3>
                <p className="text-[11px] text-[#525854]">
                  School/College, degree, field of study, completion date, and certifications.
                </p>
              </div>

              <button
                type="button"
                onClick={addEducationRow}
                className="px-3 py-1.5 bg-[#164C38] text-[#F2F2F2] rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Education
              </button>
            </div>

            <div className="space-y-3">
              {educationList.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-3.5 bg-[#F2F2F2] rounded-xl border border-[#CBCBCB] space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#141A17]">
                      Entry #{idx + 1}
                    </span>
                    {educationList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeEducationRow(item.id)}
                        className="text-[#4E1617] hover:underline text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="School / University Name *"
                      required
                      value={item.schoolName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEducationList((prev) =>
                          prev.map((x) => (x.id === item.id ? { ...x, schoolName: val } : x))
                        );
                      }}
                      className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg text-xs"
                    />

                    <input
                      type="text"
                      placeholder="Degree / Diploma *"
                      required
                      value={item.degree}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEducationList((prev) =>
                          prev.map((x) => (x.id === item.id ? { ...x, degree: val } : x))
                        );
                      }}
                      className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg text-xs"
                    />

                    <input
                      type="text"
                      placeholder="Field of Study"
                      value={item.fieldOfStudy}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEducationList((prev) =>
                          prev.map((x) => (x.id === item.id ? { ...x, fieldOfStudy: val } : x))
                        );
                      }}
                      className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg text-xs"
                    />

                    <input
                      type="date"
                      placeholder="Date of Completion"
                      value={item.completionDate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEducationList((prev) =>
                          prev.map((x) => (x.id === item.id ? { ...x, completionDate: val } : x))
                        );
                      }}
                      className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg text-xs"
                    />
                  </div>

                  <input
                    type="text"
                    placeholder="Additional Notes / Honors / GPA"
                    value={item.notes}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEducationList((prev) =>
                        prev.map((x) => (x.id === item.id ? { ...x, notes: val } : x))
                      );
                    }}
                    className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg text-xs"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* STEP 6: PREVIOUS & CURRENT EXPERIENCE (ADD / REMOVE ROWS)           */}
        {/* =================================================================== */}
        {currentStep === 6 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#CBCBCB] pb-2">
              <div>
                <h3 className="text-xs font-bold uppercase text-[#164C38] tracking-wider">
                  Section F: Professional Experience
                </h3>
                <p className="text-[11px] text-[#525854]">
                  Previous occupations, employers, work summaries, and tenures.
                </p>
              </div>

              <button
                type="button"
                onClick={addExperienceRow}
                className="px-3 py-1.5 bg-[#164C38] text-[#F2F2F2] rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Experience
              </button>
            </div>

            <div className="space-y-3">
              {experienceList.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-3.5 bg-[#F2F2F2] rounded-xl border border-[#CBCBCB] space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#141A17]">
                      Tenure #{idx + 1}
                    </span>
                    {experienceList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeExperienceRow(item.id)}
                        className="text-[#4E1617] hover:underline text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Occupation / Job Title *"
                      required
                      value={item.occupation}
                      onChange={(e) => {
                        const val = e.target.value;
                        setExperienceList((prev) =>
                          prev.map((x) => (x.id === item.id ? { ...x, occupation: val } : x))
                        );
                      }}
                      className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg text-xs"
                    />

                    <input
                      type="text"
                      placeholder="Company Name *"
                      required
                      value={item.company}
                      onChange={(e) => {
                        const val = e.target.value;
                        setExperienceList((prev) =>
                          prev.map((x) => (x.id === item.id ? { ...x, company: val } : x))
                        );
                      }}
                      className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg text-xs"
                    />

                    <input
                      type="text"
                      placeholder="Duration (e.g., 2 Years 3 Months)"
                      value={item.duration}
                      onChange={(e) => {
                        const val = e.target.value;
                        setExperienceList((prev) =>
                          prev.map((x) => (x.id === item.id ? { ...x, duration: val } : x))
                        );
                      }}
                      className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg text-xs"
                    />

                    <label className="flex items-center gap-2 px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg text-xs font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.currentlyWorking}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setExperienceList((prev) =>
                            prev.map((x) => (x.id === item.id ? { ...x, currentlyWorking: val } : x))
                          );
                        }}
                        className="accent-[#164C38]"
                      />
                      Currently Working Here
                    </label>
                  </div>

                  <textarea
                    rows={2}
                    placeholder="Work Summary & Key Contributions"
                    value={item.workSummary}
                    onChange={(e) => {
                      const val = e.target.value;
                      setExperienceList((prev) =>
                        prev.map((x) => (x.id === item.id ? { ...x, workSummary: val } : x))
                      );
                    }}
                    className="w-full px-3 py-2 bg-white border border-[#CBCBCB] rounded-lg text-xs"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* STEP 7: DOCUMENTS & FINALIZATION                                   */}
        {/* =================================================================== */}
        {currentStep === 7 && (
          <div className="space-y-4">
            <div className="border-b border-[#CBCBCB] pb-2">
              <h3 className="text-xs font-bold uppercase text-[#164C38] tracking-wider">
                Section G: Documents, Compensation & Finalization
              </h3>
              <p className="text-[11px] text-[#525854]">
                Confirm statutory tax numbers, banking records, offer letter attestation, and role assignment.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                  Annual CTC (Gross INR) *
                </label>
                <input
                  type="number"
                  required
                  value={annualCTC}
                  onChange={(e) => setAnnualCTC(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                  PAN Tax Identification Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ARGPK1008A"
                  value={panNumber}
                  onChange={(e) => setPanNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                  Bank Account Number & Branch
                </label>
                <input
                  type="text"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#525854] mb-1">
                  Assigned RBAC Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#CBCBCB] rounded-lg text-xs font-semibold"
                >
                  <option value="EMPLOYEE">EMPLOYEE (Self-Service)</option>
                  <option value="MANAGER">MANAGER (Operations & Direct Reports)</option>
                  <option value="HR">HR (People & Payroll Governance)</option>
                  <option value="ADMIN">ADMIN (Super Administrator)</option>
                </select>
              </div>
            </div>

            {/* Document Upload Simulation */}
            <div className="p-3.5 bg-[#F2F2F2] rounded-xl border border-[#CBCBCB] space-y-2">
              <span className="text-[11px] font-bold uppercase text-[#164C38] block">
                Offer Letter & Document Verification
              </span>
              <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-[#CBCBCB] text-xs">
                <span className="font-mono text-[#141A17]">
                  {offerLetterUploaded || 'Offer_Letter_Pending.pdf'}
                </span>
                <span className="px-2 py-0.5 rounded bg-[#164C38]/10 text-[#164C38] text-[10px] font-bold">
                  Attested & Verified
                </span>
              </div>

              <label className="flex items-center gap-2 pt-1 text-xs font-semibold text-[#164C38] cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoGenerateOfferLetter}
                  onChange={(e) => setAutoGenerateOfferLetter(e.target.checked)}
                  className="accent-[#164C38]"
                />
                Automatically generate Official Offer Letter & store in Document Vault
              </label>
            </div>
          </div>
        )}

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-[#CBCBCB]">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep((s) => (s - 1) as any)}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-[#525854] hover:bg-[#F2F2F2] flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Previous Step
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="px-3.5 py-2 bg-[#F2F2F2] hover:bg-[#E5E5E5] text-[#141A17] border border-[#CBCBCB] rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              Save Draft
            </button>

            {currentStep < 7 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((s) => (s + 1) as any)}
                className="px-4 py-2 bg-[#164C38] hover:bg-[#0F3627] text-[#F2F2F2] rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                Next Step
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="submit"
                className="px-5 py-2 bg-[#164C38] hover:bg-[#0F3627] text-[#F2F2F2] rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {editingEmp ? 'Save Employee Profile' : 'Complete Onboarding'}
              </button>
            )}
          </div>
        </div>
      </form>
    </ModalShell>
  );
}
