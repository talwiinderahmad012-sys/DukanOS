# DukaanOS — Multi-Business, Multi-Branch & Tenancy Architecture (Step 18)

## 1. Overview
DukaanOS provides true enterprise multi-tenancy and multi-outlet management, allowing users to operate multiple independent businesses (stores, wholesale distribution centers, franchises) and multiple physical branches under a unified user identity.

---

## 2. Active Context Resolution & Security

Active business and branch contexts are resolved on the server on every request via secure HTTP-only cookies:

```text
Incoming Request
      ↓
Read Cookies (dukaanos_active_business_id, dukaanos_active_branch_id)
      ↓
Verify User Membership in Database (Active Role & Valid Tenant)
      ↓
Authorized? ─── NO ───► Fallback to User's Primary Active Business
      │
     YES
      ↓
Verify Branch Belongs to Active Business & is ACTIVE
      ↓
Valid? ──────── NO ───► Fallback to Primary Main Branch or "All Branches"
      │
     YES
      ↓
Bind Context to Server Components, Actions, and Domain Services
```

### Security Guarantees:
- **No Client Trust**: Client cookies are treated as untrusted hints. Server verifies `prisma.businessMembership` against `user.id` on every query.
- **Stale Context Safe Reset**: If a user is removed from a business or switches to a business with different branch IDs, incompatible cookies are automatically sanitized and reset to authorized defaults.
- **No URL Pollution**: Business identifiers are not exposed in public URLs (e.g. `/dashboard` instead of `/dashboard/business/123/sales`).

---

## 3. Business-Level vs Branch-Level Data Hierarchy

| Layer | Entity Types | Scope & Rules |
|---|---|---|
| **Business-Level** (Global to Tenant) | `Product` catalog, `Category`, `Supplier`, `Customer` master, `BusinessSetting`, `BusinessMembership`, `CommunicationConfig`, `Advisor` rules | Shared across all branches of the business. Changes update master definitions. |
| **Branch-Level** (Outlet Specific) | `StockMovement` (ledger), `Sale`, `Purchase`, `Expense`, `Employee`, `Camera`, `EmployeeAttendance` | Strictly partitioned by `branchId`. Sales, cashiers, and inventory transactions operate within their physical branch context. |

---

## 4. Multi-Business Management (`/dashboard/settings/businesses`)

- **Business Roster**: Displays all accessible stores, business types, status (`ACTIVE`, `ARCHIVED`, `SUSPENDED`), branches count, and user's role.
- **Context Switcher**: 1-click switching updates active cookies and refreshes UI.
- **Atomic Business Creation**: Creates `Business`, default `Branch` (`MAIN`), `BusinessSetting` defaults, and `BusinessMembership` (`OWNER`) within a single database transaction (`$transaction`).
- **Archive / Deactivation Rules**:
  - Archived businesses cannot commit new sales, purchases, or expenses (`Cannot complete sale: Business is ARCHIVED`).
  - Remains viewable in read-only mode to authorized owners for accounting and tax records.
- **Atomic Ownership Transfer**:
  - Owners can transfer primary ownership to another existing member.
  - Transaction promotes target to `OWNER` and demotes old owner to `MANAGER` (or selected role), ensuring a business never ends up without an active owner.

---

## 5. Multi-Branch Reporting & Dashboard Breakdown

- **Real-Time Multi-Branch Overview**: Dashboard overview automatically aggregates and breaks down today's revenue, order volume, and realized profit across all active outlets when multiple branches exist.
- **Server-Filtered Branch Reports**: Daily, Weekly, Monthly, and Annual financial reports accept `branchId` to deliver single-branch or all-branch aggregate metrics.
