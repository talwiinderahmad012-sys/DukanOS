# DukaanOS — User Onboarding & Activation Funnel (Step 22)

## 1. Onboarding Funnel Steps

```text
Visitor Landed (/)
      ↓
Register Account (/register)
      ↓
Store Setup Wizard (/onboarding)
      ↓
Dashboard with Onboarding Checklist (/dashboard)
      ↓
1. Create Business [✓]
2. Add First Product (/dashboard/products/new)
3. Add First Customer (/dashboard/customers)
4. Record First Purchase (/dashboard/purchases/new)
5. Ring Up First POS Sale (/dashboard/pos)
      ↓
Store Activated ("You're Ready!")
```

---

## 2. In-App Setup Checklist & Contextual Empty States
- **Onboarding Checklist (`src/components/onboarding/onboarding-checklist.tsx`)**:
  - Dynamically calculates setup progress ($0\% \rightarrow 100\%$).
  - Shows direct quick links to unfinished setup actions.
  - Automatically collapses and allows clean dismissal once all 5 tasks are completed.
- **Contextual Empty States**:
  - Informative guidance on empty product and invoice tables instructing shop owners on next operational steps.

---

## 3. Activation Telemetry & Feedback
- **Non-Sensitive Milestones**: `LANDING_VIEWED`, `SIGNUP_COMPLETED`, `FIRST_PRODUCT_CREATED`, `FIRST_SALE_RECORDED`.
- **In-App Feedback Modal**: Shop owners can submit ratings or report bugs directly from the dashboard bottom trigger.
