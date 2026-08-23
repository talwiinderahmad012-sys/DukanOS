# DukaanOS — Public Launch & Product Positioning (Step 22)

## 1. Product Positioning
- **Primary Proposition**: "Manage your shop. Track your money. Understand your business."
- **Secondary Proposition**: "DukaanOS doesn't just record sales — it helps you understand how your business is performing and what you should improve."
- **Free-First Message**: "Start managing your business for free." (Free to start, zero fake pricing, zero deceptive promises).

---

## 2. Public Architecture & Routes

| Route | Purpose | Access |
|---|---|:---:|
| `/` | Public Marketing & Conversion Landing Page | Public |
| `/docs` | Store Owner Operations & User Handbook | Public |
| `/support` | FAQs & Getting Started Guide | Public |
| `/privacy` | Transparent Business Privacy & Tenant Isolation Policy | Public |
| `/terms` | Acceptable Use & Responsibility Terms | Public |
| `/robots.txt` | Dynamic Search Crawler Directives (`src/app/robots.ts`) | Public |
| `/sitemap.xml` | Dynamic Search Index Generator (`src/app/sitemap.ts`) | Public |

---

## 3. SEO & Structured Data
- Schema.org `SoftwareApplication` JSON-LD embedded on homepage.
- Dynamic OpenGraph and Twitter social card tags configured in `src/app/page.tsx` and `src/app/layout.tsx`.
- Canonical domain set via `NEXT_PUBLIC_APP_URL`.
