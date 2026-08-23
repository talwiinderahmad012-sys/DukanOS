# DukaanOS Database Architecture

## Entity Overview
The database uses a normalized relational design strictly enforcing tenant boundaries across all transactional operations.

### Tenancy Model
- **User**: The global authentication identity (Auth.js compatible).
- **Business**: The tenant representation.
- **BusinessMembership**: Many-to-many relationship linking a `User` to a `Business` with an assigned `MembershipRole` (e.g., OWNER, MANAGER, CASHIER).
- **Branch**: Physical or logical sub-divisions of a Business.

### Financial Transactions & Money Strategy
- **Money Representation**: All monetary values (`price`, `total`, `amount`) use the exact `Decimal(12, 2)` type mapped to PostgreSQL `numeric`. This eliminates floating-point drift.
- **Historical Consistency**: `SaleItem` records the `costPrice` of the product *at the moment of sale*. This prevents historical profit margins from changing if the product's purchase price changes in the future.
- **Customer Credit (Udhaar)**: `Customer.outstanding` represents an aggregate cached balance, which increases when an unpaid credit sale is made, and decreases via `CustomerPayment` records. It acts as an easy-read field backed by a traceable ledger.

### Stock & Inventory Strategy
- **Immutable Ledger**: The source of truth for all inventory changes is the `StockMovement` table.
- **Movements**: Every inventory action (Sale, Purchase, Damage, Adjustment) writes a `MovementType` record.
- **Aggregate Stock**: `Product.currentStock` acts as a materialized cache to prevent expensive ledger sum queries on every page load. It is incremented/decremented alongside `StockMovement` creation within a database transaction.

### Deletion & Archiving Strategy
- **Cascade**: Configuration entities like `BusinessMembership` or `Category` are deleted if their parent `Business` is deleted.
- **Restrict**: Transactional entities (e.g., `Sale`, `CustomerPayment`) implement `onDelete: Restrict` against their targets (like `Product` or `Customer`). A business cannot delete a product if there is historical sale data tied to it—the product must be marked `isActive: false` instead (Soft Deletion/Archiving).
- **Set Null**: Optional foreign keys (e.g., if a sale is no longer tied to a tracked branch, `branchId` is set to null).

### Security & Audit Strategy
- **AuditLog**: An explicit table tracking sensitive actions (e.g., `SALE_CANCELLED`, `STOCK_ADJUSTED`, `PURCHASE_CREATED`, `PURCHASE_CANCELLED`) storing stringified JSON metadata and referencing the actor.
- **Notifications**: System-generated alerts (like "Low Stock") mapped with read statuses and owner-only privacy flags.
- **Centralized Error Codes**: `src/lib/errors/error-codes.ts` provides deterministic error codes for consistent API responses. Database errors are sanitized before reaching the client.
- **Idempotency Keys**: `Sale.clientTransactionId` and `Notification.deduplicationKey` prevent duplicate financial transactions and spam notifications.

### Purchases & Supplier Ledger (Step 7)
- **Purchase**: Represents procurement transactions, tracking `invoiceNumber`, `purchaseDate`, `subtotal`, `discount`, `total`, `paidAmount`, and `status` (`RECEIVED`, `CANCELLED`).
- **PurchaseItem**: Records immutable historical unit procurement price (`purchasePrice`), line quantity, and line discounts.
- **Stock Integration**: Purchases create `StockMovement` records (`MovementType.PURCHASE`) and increment `Product.currentStock` atomically.
- **Cancellation Protection**: Cancellation verifies stock has not been consumed before reversing. If cancelled, `Product.purchasePrice` is restored to the previous valid purchase.

### Sales, POS & Customer Credit Architecture (Step 8)
- **Sale**: Records invoice transactions (`invoiceNumber`, `subtotal`, `discount`, `total`, `paidAmount`, `paymentMethod`, `status`, `saleDate`).
- **SaleItem**: Stores immutable snapshots of `sellingPrice`, `costPrice`, `discount`, `lineTotal`, and realized `lineProfit` (after proportional global discount share).
- **Concurrency Protection**: Stock is decremented conditionally (`currentStock >= quantity`). Fails atomically with `INSUFFICIENT_STOCK` if stock is depleted by a concurrent transaction.
- **Customer Udhaar & Ledger**: Credit is tracked via `Customer.outstanding`. Only debt payments against existing balance are written to `CustomerPayment`. Running balance is calculated from unified chronological events (Credit Sales, Payments, Cancellations).
- **Sale Reversal**: Reverses stock, creates offsetting `StockMovement` (`MovementType.RETURN`), reverses unpaid credit from `Customer.outstanding`, and logs audit trail.

### Employee & Staff Management Architecture (Step 10)
- **Employee**: Business-scoped profiles with unique `employeeCode` (`@@unique([businessId, employeeCode])`), current `basicSalary`, salary type (`MONTHLY`, `DAILY`, `HOURLY`), branch, and optional `userId`.
- **EmployeeAttendance**: Enforces strictly 1 record per staff member per business day (`@@unique([businessId, employeeId, date])`), tracking `PRESENT`, `ABSENT`, `LATE`, `LEAVE`, check-in/out timestamps, and notes.
- **EmployeeLeave**: Tracks multi-day leaves (`CASUAL`, `SICK`, `ANNUAL`, `UNPAID`, `OTHER`), status (`PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`), reviewer IDs, and approval notes.
- **EmployeeSalary**: Immutable monthly payroll records (`period: "YYYY-MM"`, `@@unique([businessId, employeeId, period])`), storing `baseSalary`, `overtime`, `bonus`, `deductions`, `advance`, and calculated `netSalary` along with payment disbursement status (`PENDING`, `PAID`) and payment methods.
- **EmployeeComplaint**: Confidential grievance logs with priority ratings (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), manager resolution workflows, and strict role privacy.

### Customer Experience & Feedback Architecture (Step 11)
- **Customer**: Extended with `status` (`ACTIVE`, `INACTIVE`, `ARCHIVED`), maintaining indexed balance lookup (`outstanding`) and full historical relations.
- **CustomerFeedback**: Records customer ratings (1 to 5 integer stars), `category` (`SERVICE`, `PRODUCT`, `PRICE`, `STAFF`, `CLEANLINESS`, `DELIVERY`, `OTHER`), `message`, `isAnonymous` flag, `status` (`NEW`, `REVIEWING`, `RESOLVED`, `ARCHIVED`), and private internal manager `resolutionNote`.
- **FeedbackInviteToken**: Stores unguessable cryptographic tokens (`token @unique`), expiration timestamps (`expiresAt`), and `usedAt` single-use tracking for secure, authenticated or anonymous mobile review submission.

### Internal Communication & Remote Monitoring Architecture (Step 12)
- **Business**: Extended with `isOpen: Boolean` and `operatingHours: String?` for live store status.
- **Conversation**: Business-scoped discussion channels (`type: DIRECT | GROUP`), indexed by `[businessId, updatedAt]`.
- **ConversationParticipant**: Tracks user conversation membership, `joinedAt`, and `lastReadAt` for dynamic unread message count calculations (`@@unique([conversationId, userId])`).
- **Message**: Stores plain-text content, sender relation, and soft-delete capability (`deletedAt`), indexed by `[conversationId, createdAt]` and `[businessId, createdAt]`.
- **Announcement**: Store broadcasts authored by owners/managers, with priority (`NORMAL`, `IMPORTANT`, `URGENT`), role targeting (`ALL`, `OWNER`, `MANAGER`, `CASHIER`, `EMPLOYEE`), and optional expiry timestamps (`expiresAt`).
- **AnnouncementRead**: Per-user read receipt tracker (`@@unique([announcementId, userId])`).


