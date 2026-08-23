# DukaanOS — Product Backlog & Roadmapping

Categorized backlog of features, performance enhancements, and ecosystem expansions gathered during pilot testing and user feedback.

---

## 1. Must Fix (Completed for v1.0.0 Release Candidate)

- [x] **Zero Cross-Tenant Access Invariant**: Server-side derived session context across all queries.
- [x] **Atomic Concurrency Protection**: Conditional SQL updates prohibiting negative inventory.
- [x] **Idempotent POS Synchronization**: Client-generated transaction UUID deduplication on offline sync.
- [x] **2-Decimal Rounding Precision**: Exact rupee calculation across sales, purchases, and Udhaar ledger.
- [x] **Sensitive Credential Redaction**: Automated logging filter for passwords, tokens, and camera RTSP credentials.

---

## 2. Before Broad Public Launch

- [ ] **Thermal Bluetooth Printer Integration**: Web Bluetooth API driver for direct portable thermal receipt printing.
- [ ] **SMS Gateway Integration**: Real-time SMS receipts & Udhaar balance reminders via local Pakistani telco SMS gateways.
- [ ] **Automated Daily DB Backup to Cloud**: Automated daily encrypted database snapshots to Amazon S3 / Cloudflare R2.
- [ ] **Multi-Language Urdu Localization**: Full Urdu UI switch (Nastaliq typography) for non-English speaking cashier staff.

---

## 3. Post-Launch Enhancements

- [ ] **FBR / GST Fiscal E-Invoicing**: Direct API connector for Pakistani Federal Board of Revenue POS integration.
- [ ] **WhatsApp Business API Gateway**: Official Meta Cloud API webhook integration for sending interactive bills and payment links.
- [ ] **WebRTC Media Server for CCTV**: In-house RTSP to WebRTC/HLS transcoding gateway for universal browser playback.
- [ ] **Advanced Customer Loyalty Program**: Points-based reward points earned per purchase with redemption rules.

---

## 4. Future Ideas & Long-Term Roadmap

- [ ] **Supplier B2B Marketplace**: Direct procurement purchasing from verified national wholesalers inside DukaanOS.
- [ ] **Voice-Powered POS Order Entry**: Voice-to-text Urdu/English quick billing for fast-paced rush hours.
- [ ] **AI-Powered Demand Forecasting**: Predictive seasonal demand estimation based on weather and historical holiday trends.
