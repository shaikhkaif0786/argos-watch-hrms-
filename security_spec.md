# Security Specification (`security_spec.md`)

## 1. Data Invariants

1. **Default-Deny Catch-All**: No collection or subcollection is accessible unless explicitly matched and authorized.
2. **Email Verification Mandate**: Every write and sensitive read requires `request.auth != null && request.auth.token.email_verified == true`.
3. **Role & Privilege Escalation Prevention**:
   - Users cannot self-assign `ADMIN`, `HR`, or `MANAGER` roles on `/users/{userId}` creation unless they are already a verified administrator (`isAdmin()`).
   - Non-admin users cannot modify their `role` or `uid` field during updates.
4. **PII & Scope Isolation**:
   - `/users/{userId}`: Only readable by the owner (`userId == request.auth.uid`) or `isAdmin()`.
   - `/employees/{employeeId}`: Only readable by the employee (`resource.data.uid == request.auth.uid`), their assigned manager (`resource.data.managerUid == request.auth.uid`), or `isAdmin()`.
   - `/leaves/{leaveId}` and `/considerations/{considerationId}`: Only readable by the requester (`uid == request.auth.uid`), their assigned manager (`managerUid == request.auth.uid`), or `isAdmin()`.
5. **Terminal State Locking**:
   - Once a `/leaves/{leaveId}` or `/considerations/{considerationId}` reaches a terminal status (`Approved` or `Rejected`), non-admin users cannot mutate the record further.
6. **Temporal & Immortal Field Integrity**:
   - `createdAt` must equal `request.time` on creation and is strictly immutable on update (`incoming().createdAt == existing().createdAt`).
   - `updatedAt` must equal `request.time` on creation and update.
   - `uid` and `id` are immutable after creation.

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Unverified Email Spoof**: Authenticated user with `email: "shaikhkaif@carterfarrago.com"` and `email_verified: false` attempting to read `/admins/uid1`.
2. **Self-Assigned Admin Role**: Normal user creating `/users/user_1` with `role: "ADMIN"`.
3. **Shadow Field Injection on User**: User updating `/users/user_1` with an extra field `isSuperAdmin: true`.
4. **ID Poisoning Attack**: Creating `/leaves/invalid$id!@#` or a 200-character ID.
5. **Cross-Employee PII Scraping**: User `emp_2` attempting `get` on `/employees/emp_1` where `uid != request.auth.uid` and `managerUid != request.auth.uid`.
6. **Identity Spoofing on Leave Creation**: User `user_1` creating a leave request with `uid: "user_2"`.
7. **Terminal State Re-opening**: Manager attempting to update a leave request whose existing `status` is already `"Approved"` without admin privileges.
8. **Immortal Field Mutation**: User updating their profile while changing `createdAt` or `uid`.
9. **Client Timestamp Forgery**: Creating a consideration request with a backdated `createdAt` timestamp instead of `request.time`.
10. **Value Poisoning / Oversized String**: Submitting a leave request with a 5,000-character `reason` (exceeding max 1000 chars).
11. **Audit Log Tampering**: Any user attempting to `update` or `delete` an `/activity_logs/{logId}` entry.
12. **Unbounded List Query Scraping**: Executing a blanket `list` on `/leaves` without filtering by `uid == request.auth.uid` or `managerUid == request.auth.uid`.
