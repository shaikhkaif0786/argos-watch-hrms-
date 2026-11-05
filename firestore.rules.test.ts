/**
 * Adversarial Security Rules Verification Specification
 * Verifies all 12 "Dirty Dozen" payloads from security_spec.md return PERMISSION_DENIED.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  auth: {
    uid: string;
    email: string;
    email_verified: boolean;
  } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const dirtyDozenTests: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Unverified Email Spoof on Admin Endpoint',
    operation: 'get',
    path: '/admins/uid_1',
    auth: { uid: 'uid_spoof', email: 'shaikhkaif@carterfarrago.com', email_verified: false },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Self-Assigned Admin Role on User Profile Creation',
    operation: 'create',
    path: '/users/user_1',
    auth: { uid: 'user_1', email: 'employee@carterfarrago.com', email_verified: true },
    payload: {
      uid: 'user_1',
      email: 'employee@carterfarrago.com',
      name: 'Normal Employee',
      role: 'ADMIN',
      employeeId: 'EMP-1005',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Shadow Field Injection on User Update',
    operation: 'update',
    path: '/users/user_1',
    auth: { uid: 'user_1', email: 'employee@carterfarrago.com', email_verified: true },
    payload: {
      uid: 'user_1',
      email: 'employee@carterfarrago.com',
      name: 'Updated Name',
      role: 'EMPLOYEE',
      employeeId: 'EMP-1005',
      isVerifiedAdmin: true,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'ID Poisoning with Special Characters',
    operation: 'create',
    path: '/leaves/bad$id!@#',
    auth: { uid: 'user_1', email: 'employee@carterfarrago.com', email_verified: true },
    payload: {},
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Cross-Employee PII Scraping',
    operation: 'get',
    path: '/employees/EMP-1001',
    auth: { uid: 'unrelated_user', email: 'other@carterfarrago.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Identity Spoofing on Leave Creation',
    operation: 'create',
    path: '/leaves/LV-900',
    auth: { uid: 'user_1', email: 'employee@carterfarrago.com', email_verified: true },
    payload: {
      id: 'LV-900',
      uid: 'user_2',
      managerUid: 'mgr_1',
      employeeId: 'EMP-1005',
      leaveType: 'Casual',
      startDate: '2026-10-12',
      endDate: '2026-10-13',
      days: 2,
      reason: 'Personal work',
      status: 'Pending',
      decisionNote: '',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Terminal State Mutation on Already Approved Leave',
    operation: 'update',
    path: '/leaves/LV-101',
    auth: { uid: 'mgr_1', email: 'manager@carterfarrago.com', email_verified: true },
    payload: {
      status: 'Rejected',
      decisionNote: 'Changed my mind after terminal lock',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Immortal Field Mutation (createdAt / uid)',
    operation: 'update',
    path: '/users/user_1',
    auth: { uid: 'user_1', email: 'employee@carterfarrago.com', email_verified: true },
    payload: {
      uid: 'user_hijacked',
      name: 'Hijacked',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Client Timestamp Forgery on Consideration Creation',
    operation: 'create',
    path: '/considerations/CON-501',
    auth: { uid: 'user_1', email: 'employee@carterfarrago.com', email_verified: true },
    payload: {
      id: 'CON-501',
      uid: 'user_1',
      managerUid: 'mgr_1',
      employeeId: 'EMP-1005',
      date: '2026-10-05',
      type: 'Late Arrival Waiver',
      reason: 'Traffic delay',
      status: 'Pending',
      decisionNote: '',
      createdAt: '2020-01-01T00:00:00Z',
      updatedAt: '2020-01-01T00:00:00Z',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Value Poisoning with Oversized Reason String',
    operation: 'create',
    path: '/leaves/LV-999',
    auth: { uid: 'user_1', email: 'employee@carterfarrago.com', email_verified: true },
    payload: {
      id: 'LV-999',
      uid: 'user_1',
      managerUid: 'mgr_1',
      employeeId: 'EMP-1005',
      leaveType: 'Casual',
      startDate: '2026-10-12',
      endDate: '2026-10-13',
      days: 2,
      reason: 'A'.repeat(2000),
      status: 'Pending',
      decisionNote: '',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Audit Log Tampering / Deletion',
    operation: 'delete',
    path: '/activity_logs/LOG-101',
    auth: { uid: 'user_1', email: 'employee@carterfarrago.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Unscoped List Query on Private Leave Records',
    operation: 'list',
    path: '/leaves',
    auth: { uid: 'unrelated_user', email: 'unrelated@carterfarrago.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
];
