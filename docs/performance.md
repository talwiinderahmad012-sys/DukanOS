# DukaanOS — Performance & Database Optimization (Step 19)

## 1. Database Indexing & Query Strategy

All primary transactional queries in DukaanOS are indexed for high-volume retail throughput:

- **Tenant Partitioning**: Compound indexes on `(businessId, createdAt)` and `(businessId, branchId)` enable fast temporal filtering on large ledgers.
- **Unique Lookups**: Unique indexes on `(businessId, sku)`, `(businessId, barcode)`, and `(businessId, code)` ensure instant catalog barcode scans.
- **Stock Movement Indexing**: Indexed on `(businessId, productId, createdAt)` for rapid FIFO / ledger reconstruction.

---

## 2. N+1 Query Prevention

- **Parallelized Aggregations**: Dashboard metrics and monthly reports use `Promise.all` alongside Prisma's `aggregate`, `_sum`, and `_count` rather than fetching raw records in loops.
- **Selected Columns**: Read-only product listings fetch only necessary display fields (`select: { id, name, sku, currentStock, sellingPrice }`) minimizing network I/O and server RAM usage.

---

## 3. Client Bundle & Asset Optimization

- **Turbopack Tree-Shaking**: Only client components are marked with `'use client'`, ensuring heavy libraries (like `bcryptjs`, `crypto`, `pg`, `@prisma/client`) remain strictly on the server.
- **PWA Resource Cache**: Static shell UI assets and Lucide icons are cached locally by the service worker, enabling instant cold starts.
