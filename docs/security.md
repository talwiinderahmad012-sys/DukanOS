# DukaanOS — Security Architecture & Hardening Guide (Step 19)

## 1. Threat Model & Security Principles
DukaanOS is designed to operate securely in untrusted retail environments, protecting commercial financial records, employee privacy, customer udhaar balances, and CCTV video feeds.

### Core Security Guarantees:
1. **Zero Client Trust for Tenancy & Branching**:
   - Client requests cannot specify or override `businessId` or `branchId` directly.
   - The active tenant is derived exclusively from the authenticated session and verified in `prisma.businessMembership` on every server transaction.
2. **Role-Based Capability Enforcement**:
   - Capabilities are checked on the server before mutating or reading data. UI hiding is purely cosmetic and never relied upon for security.
3. **In-Memory Rate Limiting**:
   - Prevents brute-force attacks on authentication, spamming on public customer feedback tokens, and CPU exhaustion on data export endpoints.
4. **Secret Masking & Safe Logging**:
   - Passwords, auth tokens, CCTV RTSP credentials, and SMS/WhatsApp API keys are automatically stripped before writing to log streams.
5. **Sanitization & XSS Defenses**:
   - All user-supplied HTML is stripped before rendering plain text notes, complaints, and feedback.

---

## 2. Role Capability Matrix

| Capability | OWNER | MANAGER | CASHIER | STAFF |
|---|:---:|:---:|:---:|:---:|
| **Manage Business Profile & Settings** | ✅ | ❌ | ❌ | ❌ |
| **Manage Outlets / Branches** | ✅ | ✅ | ❌ | ❌ |
| **Manage Members & Roles** | ✅ | ❌ | ❌ | ❌ |
| **Export Data (JSON / CSV)** | ✅ | ❌ | ❌ | ❌ |
| **Archive / Restore Business** | ✅ | ❌ | ❌ | ❌ |
| **Transfer Ownership** | ✅ | ❌ | ❌ | ❌ |
| **Create & View Sales** | ✅ | ✅ | ✅ | ❌ |
| **Void / Cancel Sales** | ✅ | ✅ | ❌ | ❌ |
| **Manage Products & Inventory** | ✅ | ✅ | ❌ | ❌ |
| **Create Purchases & Stock Receipts** | ✅ | ✅ | ❌ | ❌ |
| **View Gross Profit & Net Financials** | ✅ | ✅ | ❌ | ❌ |
| **Manage Employees & Attendance** | ✅ | ✅ | ❌ | ❌ |
| **View & Process Salary Ledgers** | ✅ | ❌ | ❌ | ❌ |
| **Configure CCTV Cameras** | ✅ | ✅ | ❌ | ❌ |
| **View Assigned Camera Feeds** | ✅ | ✅ | ✅ | ✅ |

---

## 3. Rate Limiting Profiles

Configured in `src/lib/security/rate-limiter.ts`:

- `AUTH_LOGIN`: Max 5 attempts / 1 min per IP.
- `AUTH_REGISTER`: Max 3 attempts / 1 min per IP.
- `PASSWORD_CHANGE`: Max 5 attempts / 1 hour per user.
- `DATA_EXPORT`: Max 5 exports / 1 hour per business.
- `PUBLIC_FEEDBACK`: Max 10 submissions / 1 min per IP.
- `COMM_SEND`: Max 30 dispatches / 1 min per business.
- `CAMERA_TEST`: Max 15 connectivity checks / 1 min per business.
- `REPORT_QUERY`: Max 100 queries / 1 min per business.

---

## 4. HTTP Security Headers

Configured in `next.config.ts`:

```typescript
{
  'X-DNS-Prefetch-Control': 'on',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(self), microphone=(), geolocation=()',
}
```
