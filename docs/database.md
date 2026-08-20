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
- **AuditLog**: An explicit table tracking sensitive actions (e.g., `SALE_CANCELLED`, `STOCK_ADJUSTED`) storing stringified JSON metadata and referencing the actor.
- **Notifications**: System-generated alerts (like "Low Stock") mapped with read statuses and owner-only privacy flags.
