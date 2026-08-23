# DukaanOS — User Feedback Intelligence & Bug Triage (Step 23)

## 1. System Separation

DukaanOS strictly separates two distinct feedback channels:

1. **Customer Feedback (`CustomerFeedback`)**: End-retail customers rating a specific store's service, products, or cleanliness via receipt QR codes.
2. **Product Feedback (`ProductFeedback`) & Bug Reports (`BugReport`)**: Store owners and staff submitting platform reviews, bug reports, and roadmap suggestions for DukaanOS.

---

## 2. Bug Severity Classification

| Severity | Definition | SLA / Priority |
|---|---|:---:|
| **P0** | **Critical**: Data corruption, financial discrepancy, security breach, or total POS outage. | Immediate |
| **P1** | **High**: Major operational workflow broken without workaround. | 24 Hours |
| **P2** | **Medium**: Important feature impaired, but workaround exists. | Next Sprint |
| **P3** | **Low**: Minor visual defect, cosmetic typo, or non-blocking UX friction. | Backlog |

---

## 3. Bug Lifecycle Statuses

```text
NEW → TRIAGED → IN_PROGRESS → RESOLVED → CLOSED (or WONT_FIX)
```

- **NEW**: Submitted by store owner / cashier.
- **TRIAGED**: Confirmed by engineering team with severity and module assigned.
- **IN_PROGRESS**: Fix under active development.
- **RESOLVED**: Patch merged and verified in release branch.
- **CLOSED**: Validated in production environment.

---

## 4. Feature Request & Roadmap Statuses

```text
NEW → REVIEWING → PLANNED → IN_DEVELOPMENT → SHIPPED (or DECLINED)
```
