# NexBoard Technical Audit — 2.0 Baseline

**Date:** 2026-10-27  
**Baseline:** v1.2.0 (`main` @ `b6b1a8b`)  
**Branch:** `feature/nexboard-2.0`  
**Auditor:** Nexyros engineering (NexBoard 2.0 initiative)

This audit precedes major 2.0 work. Findings are based on source review, dependency install, and `npm audit`.

---

## 1. Stack & structure (confirmed)

| Layer | Stack |
|--------|--------|
| Frontend | React 19, TypeScript, Vite 6, CSS tokens, Lucide, Recharts 2, react-router-dom 7 |
| Backend | Node.js ≥22, Fastify 5, `node:sqlite` (DatabaseSync), Nodemailer, PDFKit |
| Packaging | npm workspaces; publishable package `nexboard` (server + bundled client) |

Monorepo layout (`client/`, `server/`, `docs/`) is clear and appropriate. **Do not migrate to Next.js** unless a concrete need appears.

---

## 2. Features actually available (v1.2.0)

Verified in routes + pages:

- Customizable dashboard (layout persisted in settings)
- Clients / projects CRUD
- Quotes & invoices CRUD, convert quote → invoice, email + PDF
- Configurable document numbers, multi-currency, custom statuses
- Tasks & reminders, calendar (week/month)
- Smart notifications / overdue reminders
- CSV import (clients/projects) + CSV export + SQLite backup download
- SMTP settings (password masked in API responses)
- Light/dark theme, branding, i18n (EN / FR / ES / DE / JA)
- Responsive shell (sidebar + backdrop)

---

## 3. Critical issues (must address in Alpha)

### C1 — No authentication

- All `/api/*` routes are publicly reachable.
- Anyone who can reach the host can read/write clients, invoices, SMTP settings, and download the full SQLite backup (`GET /api/backup`).
- CORS is `origin: true` (reflects any Origin).

**Impact:** Critical for any network-exposed or multi-user deployment.

### C2 — Sensitive data at rest / in transit patterns

- SMTP password stored in `settings` table as plaintext.
- Backup endpoint returns the raw DB file without access control.
- No security headers (`helmet` / equivalent) registered.

### C3 — Dependency vulnerabilities (`npm audit`)

- `@fastify/busboy` / multipart-related advisories (DoS, CRLF) — **high/moderate**, fix available.
- `@fastify/static` path-traversal advisory — **high/moderate**, fix available via upgrade.

**Action:** bump `@fastify/multipart` / `@fastify/static` (and transitive busboy) to patched versions.

### C4 — Demo seed on empty / zero-client DB

`initDatabase()` seeds demo data when the DB is new **or** `clients` count is 0. An emptied production DB would be re-seeded with fictional data.

**Action:** gate seed behind explicit `SEED_DEMO=true` (or first-run wizard), never on “empty clients” alone for existing installs.

---

## 4. High / medium issues

| ID | Area | Finding |
|----|------|---------|
| H1 | AuthN/Z | No roles, sessions, or server-side permissions |
| H2 | Rate limit | No login/API rate limiting |
| H3 | Migrations | Ad-hoc `migrateSchema()` only; no versioned migration ledger |
| H4 | Validation | Manual validators per route; no shared schema (Zod/etc.); email format rarely validated |
| H5 | Errors | Inconsistent error shape; some routes rethrow without centralized handler |
| H6 | Restore | Backup download exists; no documented safe restore path |
| H7 | Activity | No audit / activity log for sensitive actions |
| M1 | Tests | **Zero** unit/integration/migration tests |
| M2 | CI | No GitHub Actions |
| M3 | OpenAPI | No API documentation |
| M4 | Lint | No ESLint/Prettier at workspace root |
| M5 | Recharts | v2 deprecated; plan v3 migration later (non-blocking) |
| M6 | `glob` | Deprecated transitive warning during install |

---

## 5. Frontend / UX audit

Detailed client review (architecture, a11y, i18n, perf) — baseline before Beta 2 UI work.

**Strengths**

- Clear layout: pages + shared components + CSS tokens (`tokens.css` / `layout.css` / `components.css`).
- CRUD pattern consistent (`useAsyncData`, `PageHeader`, tables, modals).
- Design tokens with light/dark + brand color; `prefers-reduced-motion` in tokens/layout.
- Focus-visible styles; many `aria-label`s; toasts with `aria-live`.

**Auth (updated since initial audit)**

- Client now has `AuthContext`, `/login` + `/setup`, cookie sessions via `credentials: 'include'`, and route guard when `AUTH_ENABLED=true`.

**Critical / high (defer to Beta 2 unless blocking)**

| ID | Issue | Where |
|----|--------|--------|
| F1 | Nested interactive controls in calendar cells | `CalendarPage.tsx` |
| F2 | Generic API/error strings hardcoded in French | `useAsyncData.ts`, `hooks.ts`, `api/client.ts` |
| F3 | Modals lack focus trap / `aria-labelledby` | `Modal.tsx` |
| F4 | Dashboard customize dialog bypasses shared `Modal` ARIA pattern | `DashboardPage.tsx` |
| F5 | Widget drag-and-drop has no keyboard alternative | `DashboardPage.tsx` |

**Medium**

- No route lazy-loading; large monoliths (`SettingsPage`, quotes/invoices/calendar).
- `TasksPage` toolbar diverges from `ListToolbar`.
- Dates forced `fr-FR` in `format.ts`; dashboard priorities sometimes raw English.
- Topbar theme toggle overrides settings `system` mode.
- Notification polling every 20s; `RevenueChart` reads computed styles each render.
- Tables: horizontal scroll only on small screens (no card layout).
- Silent refetch when filters change (loading with stale data, no overlay).
- Dead code: `StatusPieChart.tsx` unused.

**Low**

- Locale label “Japan”; `index.html` default `lang="fr"`.
- Hardcoded chart colors outside tokens; Google Fonts network dependency.

---

## 6. Database & compatibility

- Schema covers clients, projects, quotes, invoices, settings, notifications, tasks, calendar_events.
- `migrateSchema` safely adds columns/tables and rebuilds CHECK constraints — **good baseline**.
- Missing for 2.0: `users`, `sessions`, `activity_logs`, payments/expenses tables (later phases).
- **Priority:** versioned migrations that never drop business data; test on a DB copy.

---

## 7. Installation & DX

- `npm install` at workspace root succeeds (Node v24 / npm 12 observed).
- Dev: `npm run dev` (concurrently server + client).
- Engines: Node ≥22 required (`node:sqlite`).
- `.env.example` minimal (PORT, HOST, DATABASE_PATH, VITE_API_URL) — needs auth secrets, seed flags, etc.

---

## 8. What must NOT break

Preserve all v1.2.0 features listed in the README. Especially: dashboard layout, CSV import/export, backup, SMTP, multi-currency, themes, i18n, quote→invoice, npm/`npx` packaging.

---

## 9. Recommended order (executed next)

1. Publish this audit + public `ROADMAP.md`.
2. Versioned migrations + optional auth foundation (Alpha).
3. Protect sensitive routes; rate-limit login; activity log.
4. Fix vulnerable Fastify-related packages.
5. Gate demo seed; expand `.env.example`.
6. Continue commercial / UI / dashboard / DX phases per roadmap checklists.

---

## 10. Verdict

NexBoard **1.2.0 is a solid single-operator local CRM**. It is **not yet safe as a networked multi-user business platform**. NexBoard 2.0 should evolve the existing Fastify + React stack incrementally, starting with **security and data integrity**, without a rewrite.
