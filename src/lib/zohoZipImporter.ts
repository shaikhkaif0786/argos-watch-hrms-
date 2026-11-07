import {
  Department,
  Employee,
  LeaveRequest,
  AttendanceRecord,
  UserRole,
} from '../types/hrms';

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32Update(crc: number, byte: number): number {
  return (CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)) >>> 0;
}

function crc32Compute(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = crc32Update(crc, bytes[i]);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

interface ZipEntryMeta {
  filename: string;
  flags: number;
  compressionMethod: number;
  crc32: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
}

/**
 * Parse Central Directory of a ZIP buffer to get accurate sizes and CRC32 even when bit 3 (data descriptor) is set
 */
function parseZipCentralDirectory(buf: Uint8Array): ZipEntryMeta[] {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let eocdOffset = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) {
    throw new Error('Invalid ZIP archive: End of Central Directory not found.');
  }

  const totalEntries = view.getUint16(eocdOffset + 10, true);
  const cdOffset = view.getUint32(eocdOffset + 16, true);

  const entries: ZipEntryMeta[] = [];
  let ptr = cdOffset;
  const decoder = new TextDecoder('utf-8');

  for (let i = 0; i < totalEntries; i++) {
    if (view.getUint32(ptr, true) !== 0x02014b50) break;
    const flags = view.getUint16(ptr + 8, true);
    const compressionMethod = view.getUint16(ptr + 10, true);
    const crc32 = view.getUint32(ptr + 16, true);
    const compressedSize = view.getUint32(ptr + 20, true);
    const uncompressedSize = view.getUint32(ptr + 24, true);
    const fnLen = view.getUint16(ptr + 28, true);
    const extraLen = view.getUint16(ptr + 30, true);
    const commentLen = view.getUint16(ptr + 32, true);
    const localHeaderOffset = view.getUint32(ptr + 42, true);

    const filename = decoder.decode(buf.subarray(ptr + 46, ptr + 46 + fnLen));
    entries.push({
      filename,
      flags,
      compressionMethod,
      crc32,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
    });

    ptr += 46 + fnLen + extraLen + commentLen;
  }

  return entries;
}

function decryptZipCryptoPayload(encrypted: Uint8Array, password: string): Uint8Array {
  let k0 = 0x12345678;
  let k1 = 0x23456789;
  let k2 = 0x34567890;

  const updateKeys = (byte: number) => {
    k0 = crc32Update(k0, byte);
    k1 = (Math.imul((k1 + (k0 & 0xff)) >>> 0, 134775813) + 1) >>> 0;
    k2 = crc32Update(k2, (k1 >>> 24) & 0xff);
  };

  const passBytes = new TextEncoder().encode(password);
  for (let i = 0; i < passBytes.length; i++) {
    updateKeys(passBytes[i]);
  }

  if (encrypted.length < 12) {
    throw new Error('Encrypted entry too short.');
  }

  const out = new Uint8Array(encrypted.length - 12);
  for (let i = 0; i < encrypted.length; i++) {
    const temp = (k2 | 2) & 0xffff;
    const keyByte = ((temp * (temp ^ 1)) >>> 8) & 0xff;
    const plain = encrypted[i] ^ keyByte;
    updateKeys(plain);
    if (i >= 12) {
      out[i - 12] = plain;
    }
  }
  return out;
}

async function inflateRawBytes(compressed: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  const safeCopy = new Uint8Array(compressed.byteLength);
  safeCopy.set(compressed);
  writer.write(safeCopy);
  writer.close();
  const response = new Response(ds.readable);
  const ab = await response.arrayBuffer();
  return new Uint8Array(ab);
}

/**
 * Extract all CSV files from a ZIP buffer (supports both unencrypted and ZipCrypto password-encrypted archives)
 */
export async function extractCsvFilesFromZipBuffer(
  zipBuffer: ArrayBuffer,
  password?: string
): Promise<Record<string, string>> {
  const buf = new Uint8Array(zipBuffer);
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const entries = parseZipCentralDirectory(buf);
  const decoder = new TextDecoder('utf-8');
  const files: Record<string, string> = {};

  for (const entry of entries) {
    if (entry.uncompressedSize === 0 || entry.filename.endsWith('/')) continue;

    const lhOffset = entry.localHeaderOffset;
    if (view.getUint32(lhOffset, true) !== 0x04034b50) continue;

    const fnLen = view.getUint16(lhOffset + 26, true);
    const extraLen = view.getUint16(lhOffset + 28, true);
    const dataStart = lhOffset + 30 + fnLen + extraLen;
    const rawSlice = buf.subarray(dataStart, dataStart + entry.compressedSize);

    const isEncrypted = (entry.flags & 0x0001) !== 0;
    let compressedPayload: Uint8Array = rawSlice;

    if (isEncrypted) {
      if (!password) {
        throw new Error('PASSWORD_REQUIRED');
      }
      compressedPayload = decryptZipCryptoPayload(rawSlice, password);
    }

    let uncompressedBytes: Uint8Array;
    if (entry.compressionMethod === 0) {
      uncompressedBytes = compressedPayload;
    } else if (entry.compressionMethod === 8) {
      try {
        uncompressedBytes = await inflateRawBytes(compressedPayload);
      } catch {
        throw new Error('INVALID_PASSWORD');
      }
    } else {
      continue;
    }

    const actualCrc = crc32Compute(uncompressedBytes);
    if (actualCrc !== entry.crc32) {
      throw new Error('INVALID_PASSWORD');
    }

    files[entry.filename] = decoder.decode(uncompressedBytes);
  }

  return files;
}

/**
 * RFC-4180 compliant CSV parser returning array of key-value row objects
 */
export function parseCsvToObjects(csvText: string): Record<string, string>[] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i];
    const next = csvText[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        currentField += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentField += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (ch === '\r' && next === '\n') {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
        i++;
      } else if (ch === '\n' || ch === '\r') {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += ch;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }

  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.replace(/^\uFEFF/, '').trim());
  const result: Record<string, string>[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.every((cell) => !cell)) continue;
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      if (h) obj[h] = row[idx] ?? '';
    });
    result.push(obj);
  }

  return result;
}

function pickField(row: Record<string, string>, candidates: string[]): string {
  const keys = Object.keys(row);
  for (const cand of candidates) {
    const exact = row[cand];
    if (exact !== undefined && exact !== '') return exact.trim();
    const lowerCand = cand.toLowerCase();
    const matchedKey = keys.find((k) => k.toLowerCase() === lowerCand);
    if (matchedKey && row[matchedKey]) return row[matchedKey].trim();
  }
  for (const cand of candidates) {
    const lowerCand = cand.toLowerCase();
    const partialKey = keys.find((k) => k.toLowerCase().includes(lowerCand));
    if (partialKey && row[partialKey]) return row[partialKey].trim();
  }
  return '';
}

function normalizeDateString(raw: string, fallback = '2026-01-01'): string {
  if (!raw) return fallback;
  const clean = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) return clean.slice(0, 10);
  const dmy = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return fallback;
}

export interface ImportedZohoDataset {
  departments: Department[];
  employees: Employee[];
  leaves: LeaveRequest[];
  attendance: AttendanceRecord[];
  summary: {
    departmentsCount: number;
    employeesCount: number;
    leavesCount: number;
    attendanceCount: number;
    filesProcessed: string[];
  };
}

export type ZohoImportSummary = ImportedZohoDataset;

/**
 * Convert extracted Zoho People CSV map into HRMS Departments, Employees, Leaves, and Attendance records
 */
export function transformCsvMapToHRMSData(filesMap: Record<string, string>): ImportedZohoDataset {
  const departments: Department[] = [];
  const employees: Employee[] = [];
  const leaves: LeaveRequest[] = [];
  const attendance: AttendanceRecord[] = [];
  const filesProcessed = Object.keys(filesMap);

  const findCsvContent = (keyword: string): string | null => {
    const key = Object.keys(filesMap).find((k) =>
      k.toLowerCase().includes(keyword.toLowerCase())
    );
    return key ? filesMap[key] : null;
  };

  // 1. Parse Departments (Data/Department1/Department1.csv)
  const deptCsv = findCsvContent('department1.csv') || findCsvContent('department');
  if (deptCsv) {
    const rows = parseCsvToObjects(deptCsv);
    rows.forEach((row, idx) => {
      const name =
        pickField(row, ['Department Name', 'Department', 'Name', 'Department1']) ||
        `Department ${idx + 1}`;
      if (departments.some((d) => d.name.toLowerCase() === name.toLowerCase())) return;
      const code =
        pickField(row, ['Department Code', 'Code', 'Short Code']) ||
        name
          .replace(/[^A-Za-z]/g, '')
          .slice(0, 3)
          .toUpperCase() ||
        `D${idx + 1}`;
      const lead = pickField(row, [
        'Department Lead',
        'Department Head',
        'Head of Department',
        'Manager',
        'HOD',
      ]);
      const id =
        pickField(row, ['Department ID', 'Record Id', 'ID']) || `DEPT-${100 + idx + 1}`;

      departments.push({
        id: id.startsWith('DEPT-') ? id : `DEPT-${code}-${idx + 1}`,
        name,
        code,
        managerId: 'EMP-ADMIN',
        managerName: lead || 'Argos Administrator',
        parentDepartmentId: null,
        location: pickField(row, ['Location', 'Work Location']) || 'Main Atelier & HQ',
        description:
          pickField(row, ['Description', 'Mail Alias', 'About']) ||
          `${name} department imported from backup archive.`,
        annualBudget: 12000000,
      });
    });
  }

  // 2. Parse Exit & Termination Records so Employee status is accurate
  const exitedIds = new Map<string, { status: 'Exited' | 'Terminated' | 'On Notice'; date: string; reason: string }>();
  const exitCsv = findCsvContent('exit_details.csv');
  const resigCsv = findCsvContent('resignation.csv');
  const termCsv = findCsvContent('termination.csv');

  [
    { csv: exitCsv, defaultStatus: 'Exited' as const },
    { csv: resigCsv, defaultStatus: 'On Notice' as const },
    { csv: termCsv, defaultStatus: 'Terminated' as const },
  ].forEach(({ csv, defaultStatus }) => {
    if (!csv) return;
    const rows = parseCsvToObjects(csv);
    rows.forEach((r) => {
      const empKey = pickField(r, ['Employee ID', 'Employee', 'Employee Name', 'Email ID']);
      if (empKey) {
        exitedIds.set(empKey.toLowerCase(), {
          status: defaultStatus,
          date: normalizeDateString(
            pickField(r, ['Separation Date', 'Last Working Day', 'Termination Date', 'Resignation Date'])
          ),
          reason: pickField(r, ['Reason for leaving', 'Reason', 'Comments', 'Notes']) || defaultStatus,
        });
      }
    });
  });

  // 3. Parse Employees (Data/Employee1/Employee1.csv)
  const empCsv = findCsvContent('employee1.csv') || findCsvContent('/employee');
  if (empCsv) {
    const rows = parseCsvToObjects(empCsv);
    rows.forEach((row, idx) => {
      const empIdRaw = pickField(row, [
        'Employee ID',
        'EmployeeID',
        'Employee Code',
        'Emp ID',
        'Record Id',
      ]);
      const firstName = pickField(row, ['First Name', 'FirstName', 'Given Name']);
      const lastName = pickField(row, ['Last Name', 'LastName', 'Surname']);
      const fullNameCombined = [firstName, lastName].filter(Boolean).join(' ').trim();
      const fullName =
        fullNameCombined ||
        pickField(row, ['Employee Name', 'Full Name', 'Name', 'Display Name', 'Nick Name']) ||
        `Employee ${idx + 1}`;

      const id = empIdRaw || `EMP-${1001 + idx}`;
      const email =
        pickField(row, ['Email address', 'Email ID', 'Official Email', 'Work Email', 'Email']) ||
        `${fullName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@argos.watch`;
      const phone =
        pickField(row, ['Mobile Phone', 'Phone', 'Mobile', 'Work Phone', 'Personal Mobile']) ||
        '+91 98200 00000';
      const departmentName =
        pickField(row, ['Department', 'Department Name', 'Department1']) ||
        departments[0]?.name ||
        'Operations';

      if (
        departmentName &&
        !departments.some((d) => d.name.toLowerCase() === departmentName.toLowerCase())
      ) {
        const code =
          departmentName
            .replace(/[^A-Za-z]/g, '')
            .slice(0, 3)
            .toUpperCase() || 'DEP';
        departments.push({
          id: `DEPT-${code}-${departments.length + 1}`,
          name: departmentName,
          code,
          managerId: id,
          managerName: fullName,
          parentDepartmentId: null,
          location: 'Main Atelier & HQ',
          description: `${departmentName} department`,
          annualBudget: 10000000,
        });
      }

      const designation =
        pickField(row, ['Designation', 'Title', 'Job Title', 'Designation1', 'Role']) ||
        'Team Member';
      const zohoRole = pickField(row, ['Role', 'Zoho Role', 'System Role']).toLowerCase();
      let role: UserRole = UserRole.EMPLOYEE;
      if (zohoRole.includes('admin') || zohoRole.includes('director')) {
        role = UserRole.ADMIN;
      } else if (
        zohoRole.includes('hr') ||
        designation.toLowerCase().includes('people') ||
        designation.toLowerCase().includes('hr')
      ) {
        role = UserRole.HR;
      } else if (
        zohoRole.includes('manager') ||
        zohoRole.includes('team incharge') ||
        designation.toLowerCase().includes('head') ||
        designation.toLowerCase().includes('manager') ||
        designation.toLowerCase().includes('lead')
      ) {
        role = UserRole.MANAGER;
      }

      const managerRaw =
        pickField(row, ['Reporting To', 'Reporting Manager', 'Manager', 'Supervisor']) ||
        'Argos Administrator';
      const managerClean = managerRaw.replace(/\s+[A-Z0-9-]+$/, '').trim() || managerRaw;

      const statusRaw = pickField(row, [
        'Employee Status',
        'Status',
        'Employment Status',
      ]).toLowerCase();
      let status: Employee['status'] = 'Active';
      if (statusRaw.includes('terminated')) status = 'Terminated';
      else if (statusRaw.includes('exited') || statusRaw.includes('inactive') || statusRaw.includes('resigned'))
        status = 'Exited';
      else if (statusRaw.includes('notice')) status = 'On Notice';
      else if (statusRaw.includes('probation')) status = 'Probation';

      const exitMatch =
        exitedIds.get(id.toLowerCase()) || exitedIds.get(fullName.toLowerCase());
      if (exitMatch && status === 'Active') {
        status = exitMatch.status;
      }

      const empTypeRaw = pickField(row, [
        'Employment Type',
        'Employee Type',
        'Source of Hire',
      ]).toLowerCase();
      let employmentType: Employee['employmentType'] = 'Full-Time';
      if (empTypeRaw.includes('intern')) employmentType = 'Intern';
      else if (empTypeRaw.includes('contract') || empTypeRaw.includes('consultant'))
        employmentType = 'Contract';
      else if (empTypeRaw.includes('part')) employmentType = 'Part-Time';

      const joiningDate = normalizeDateString(
        pickField(row, ['Date of joining', 'Date of Joining', 'Joining Date', 'Hire Date']),
        '2024-01-01'
      );
      const dob = normalizeDateString(
        pickField(row, ['Date of birth', 'Date of Birth', 'DOB', 'Birth Date']),
        '1995-01-01'
      );
      const genderRaw = pickField(row, ['Gender', 'Sex']).toLowerCase();
      const gender: Employee['gender'] = genderRaw.startsWith('f')
        ? 'Female'
        : genderRaw.startsWith('m')
        ? 'Male'
        : 'Other';

      const baseSalaryNum =
        Number(
          pickField(row, ['Basic Salary', 'Base Salary', 'Monthly Salary', 'CTC', 'Salary']).replace(
            /[^0-9.]/g,
            ''
          )
        ) || 35000;

      employees.push({
        id,
        uid: `uid_${id.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        managerUid: 'uid_argos_admin',
        fullName,
        email,
        officialEmail: email,
        phone,
        role,
        designation,
        department: departmentName,
        managerId: 'EMP-ADMIN',
        managerName: managerClean,
        status,
        employmentType,
        location:
          pickField(row, ['Location', 'Work Location', 'Location Name', 'Seating Location']) ||
          'Main Atelier & HQ',
        joiningDate,
        probationEndDate: normalizeDateString(
          pickField(row, ['Probation End Date', 'Date of Confirmation']),
          joiningDate
        ),
        dob,
        gender,
        address:
          pickField(row, ['Present Address', 'Permanent Address', 'Address', 'City']) ||
          'Argos Atelier, India',
        emergencyContactName:
          pickField(row, ['Emergency Contact Name', 'Emergency Contact', 'Father Name']) ||
          'Family Contact',
        emergencyContactPhone:
          pickField(row, ['Emergency Contact Number', 'Emergency Phone', 'Personal Mobile']) ||
          phone,
        avatarUrl: '',
        bankName: pickField(row, ['Bank Name', 'Bank']) || 'HDFC Bank',
        bankAccountNumber: pickField(row, ['Account Number', 'Bank Account Number']) || '',
        ifscCode: pickField(row, ['IFSC Code', 'IFSC']) || '',
        panNumber: pickField(row, ['PAN', 'PAN Number', 'Pan Number']) || '',
        aadhaarNumber: pickField(row, ['Aadhaar', 'Aadhaar Number', 'Aadhar']) || undefined,
        uanNumber: pickField(row, ['UAN', 'UAN Number']) || undefined,
        salary: {
          baseSalary: baseSalaryNum,
          hra: Math.round(baseSalaryNum * 0.4),
          specialAllowance: Math.round(baseSalaryNum * 0.2),
          pfDeduction: Math.min(1800, Math.round(baseSalaryNum * 0.12)),
          taxDeduction: 0,
          professionalTax: 200,
        },
        salaryHistory: [],
        leaveBalance: {
          casualTotal: 12,
          casualUsed: 0,
          sickTotal: 8,
          sickUsed: 0,
          earnedTotal: 15,
          earnedUsed: 0,
        },
      });
    });
  }

  // Link managerId across imported employees & departments
  const empByName = new Map<string, Employee>();
  const empById = new Map<string, Employee>();
  employees.forEach((e) => {
    empByName.set(e.fullName.toLowerCase(), e);
    empById.set(e.id.toLowerCase(), e);
  });

  employees.forEach((emp) => {
    const mgr =
      empByName.get(emp.managerName.toLowerCase()) ||
      Array.from(empByName.values()).find((m) =>
        emp.managerName.toLowerCase().includes(m.fullName.toLowerCase())
      );
    if (mgr) {
      emp.managerId = mgr.id;
      emp.managerUid = mgr.uid;
      emp.managerName = mgr.fullName;
    }
  });

  departments.forEach((dept) => {
    const lead =
      empByName.get(dept.managerName.toLowerCase()) ||
      employees.find((e) => e.department.toLowerCase() === dept.name.toLowerCase());
    if (lead) {
      dept.managerId = lead.id;
      dept.managerName = lead.fullName;
    }
  });

  // 4. Parse Leave Records (Data/Leave1/Leave1.csv)
  const leaveCsv = findCsvContent('leave1.csv') || findCsvContent('/leave');
  if (leaveCsv) {
    const rows = parseCsvToObjects(leaveCsv);
    rows.forEach((row, idx) => {
      const empRef = pickField(row, [
        'Employee ID',
        'Employee',
        'Employee Name',
        'Name',
        'Email ID',
      ]);
      const matchedEmp =
        empById.get(empRef.toLowerCase()) ||
        empByName.get(empRef.toLowerCase()) ||
        employees.find(
          (e) =>
            empRef.toLowerCase().includes(e.id.toLowerCase()) ||
            empRef.toLowerCase().includes(e.fullName.toLowerCase())
        );

      const employeeId = matchedEmp?.id || empRef || `EMP-${1001 + (idx % Math.max(1, employees.length))}`;
      const employeeName =
        pickField(row, ['Employee Name', 'Employee', 'First Name']) ||
        matchedEmp?.fullName ||
        employeeId;
      const department =
        pickField(row, ['Department', 'Department Name']) ||
        matchedEmp?.department ||
        'Operations';

      const rawType = pickField(row, ['Leave Type', 'Leave Name', 'Type']).toLowerCase();
      let leaveType: LeaveRequest['leaveType'] = 'Casual';
      if (rawType.includes('sick') || rawType.includes('medical')) leaveType = 'Sick';
      else if (rawType.includes('earned') || rawType.includes('privilege') || rawType.includes('annual'))
        leaveType = 'Earned';
      else if (rawType.includes('unpaid') || rawType.includes('lop') || rawType.includes('without pay'))
        leaveType = 'Unpaid';

      const startDate = normalizeDateString(
        pickField(row, ['From', 'From Date', 'Start Date', 'Date']),
        '2026-10-01'
      );
      const endDate = normalizeDateString(
        pickField(row, ['To', 'To Date', 'End Date']),
        startDate
      );
      const daysVal =
        Number(
          pickField(row, ['Days', 'Number of Days', 'Days Taken', 'Leave Days', 'Count']).replace(
            /[^0-9.]/g,
            ''
          )
        ) || 1;

      const rawStatus = pickField(row, ['Approval Status', 'Status']).toLowerCase();
      let status: LeaveRequest['status'] = 'Approved';
      if (rawStatus.includes('reject') || rawStatus.includes('cancel')) status = 'Rejected';
      else if (rawStatus.includes('pending')) status = 'PENDING_HR';

      const reason =
        pickField(row, ['Reason', 'Reason for leave', 'Description', 'Team Email ID']) ||
        `${leaveType} Leave`;

      if (matchedEmp && status === 'Approved') {
        if (leaveType === 'Casual')
          matchedEmp.leaveBalance.casualUsed = Math.min(
            matchedEmp.leaveBalance.casualTotal,
            matchedEmp.leaveBalance.casualUsed + daysVal
          );
        if (leaveType === 'Sick')
          matchedEmp.leaveBalance.sickUsed = Math.min(
            matchedEmp.leaveBalance.sickTotal,
            matchedEmp.leaveBalance.sickUsed + daysVal
          );
        if (leaveType === 'Earned')
          matchedEmp.leaveBalance.earnedUsed = Math.min(
            matchedEmp.leaveBalance.earnedTotal,
            matchedEmp.leaveBalance.earnedUsed + daysVal
          );
      }

      const appliedDateStr = normalizeDateString(
        pickField(row, ['Date of Request', 'Applied On', 'Added Time']),
        startDate
      );

      leaves.push({
        id: pickField(row, ['Record Id', 'Leave ID', 'ID']) || `LV-IMP-${idx + 1}`,
        employeeId,
        employeeName,
        department,
        managerId: matchedEmp?.managerId || 'EMP-ADMIN',
        uid: matchedEmp?.uid || `uid_${employeeId}`,
        managerUid: matchedEmp?.managerUid || 'uid_argos_admin',
        leaveType,
        startDate,
        endDate,
        days: daysVal,
        isHalfDay: daysVal === 0.5,
        reason,
        appliedBy: employeeName,
        status,
        appliedOn: appliedDateStr,
        createdAt: appliedDateStr,
      });
    });
  }

  // 5. Parse Attendance Records (if an Attendance CSV is included)
  const attCsv = findCsvContent('attendance');
  if (attCsv) {
    const rows = parseCsvToObjects(attCsv);
    rows.forEach((row, idx) => {
      const empRef = pickField(row, ['Employee ID', 'Employee', 'Employee Name']);
      const matchedEmp =
        empById.get(empRef.toLowerCase()) || empByName.get(empRef.toLowerCase());
      const employeeId = matchedEmp?.id || empRef || `EMP-${1001 + idx}`;
      const employeeName = matchedEmp?.fullName || pickField(row, ['Employee Name', 'Employee']) || employeeId;
      const date = normalizeDateString(pickField(row, ['Date', 'Attendance Date']), '2026-10-05');
      const checkIn = pickField(row, ['First In', 'Check In', 'In Time', 'Punch In']) || '09:30';
      const checkOut = pickField(row, ['Last Out', 'Check Out', 'Out Time', 'Punch Out']) || '18:30';

      attendance.push({
        id: `ATT-IMP-${idx + 1}`,
        employeeId,
        employeeCode: employeeId,
        employeeName,
        department: matchedEmp?.department || pickField(row, ['Department']) || 'Operations',
        managerId: matchedEmp?.managerId || 'EMP-ADMIN',
        uid: matchedEmp?.uid || `uid_${employeeId}`,
        managerUid: 'uid_argos_admin',
        date,
        checkIn,
        checkOut,
        punchIn: checkIn,
        punchOut: checkOut,
        status: 'Present',
        isLate: false,
        lateMinutes: 0,
        earlyDepartureMinutes: 0,
        workingHours: 8.5,
        overtimeHours: 0,
        source: 'WEB',
        notes: 'Imported from backup archive',
      });
    });
  }

  return {
    departments,
    employees,
    leaves,
    attendance,
    summary: {
      departmentsCount: departments.length,
      employeesCount: employees.length,
      leavesCount: leaves.length,
      attendanceCount: attendance.length,
      filesProcessed,
    },
  };
}
