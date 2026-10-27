# NexBoard 2.0 Roadmap

Public roadmap for **NexBoard 2.0** by [Nexyros](https://nexyros.fr).

Baseline product: **v1.2.0** (stable).  
2.0 work happens on branch `feature/nexboard-2.0` and will ship as **pre-releases** before a stable tag.

Checklist legend:

- `[ ]` Not done
- `[x]` Done and verified

Do **not** mark an item complete unless it works in a real run (build, migration, or manual/automated test).

Related: [Technical audit](docs/AUDIT-2.0.md) · [Changelog](CHANGELOG.md) · [README](README.md)

---

## Status overview

| Phase | Codename | Target | Status |
|-------|----------|--------|--------|
| Alpha | Security & foundations | `2.0.0-alpha.x` | Foundations complete (opt-in auth) |
| Beta 1 | Commercial core | `2.0.0-beta.1` | Not started |
| Beta 2 | UI/UX & dashboard | `2.0.0-beta.2` | Not started |
| RC | Hardening & DX | `2.0.0-rc.x` | Not started |
| Stable | Production 2.0 | `2.0.0` | Not started |

---

## NexBoard 2.0 Alpha

### Objectives

- Make self-hosted deployments **safe by default** when auth is enabled.
- Introduce **versioned SQLite migrations** without breaking v1.2.0 data.
- Establish activity logging and auth primitives (users, roles, sessions).
- Fix known high-severity dependency issues where patches exist.
- Publish this roadmap and keep documentation bilingual (EN/FR in README).

### Features

- Secure authentication (login / logout / session)
- User accounts with **admin** and **user** roles
- Server-side route protection and permission checks
- Password hashing with a recognized KDF (no plaintext passwords)
- Login attempt rate limiting
- Activity / audit log for sensitive actions
- Backup + documented restore path
- Versioned database migrations
- Optional demo seed (never overwrite real data)
- Dependency security bumps for Fastify ecosystem packages

### Checklist

#### Documentation & process

- [x] Technical audit published (`docs/AUDIT-2.0.md`)
- [x] Public roadmap (`ROADMAP.md`) linked from README
- [x] Changelog updated for Unreleased / Alpha intent
- [x] Migration guide draft (`docs/MIGRATIONS.md`) verified on a DB copy

#### Security foundations

- [x] Users table + password hashes (scrypt/argon2-class KDF)
- [x] Sessions (httpOnly cookie or equivalent server sessions)
- [x] Login / logout / current-user API
- [x] First-run admin setup when no users exist
- [x] Roles: `admin` | `user` enforced on server
- [x] Protect `/api/*` (except auth + health) when auth is active
- [x] Rate-limit login attempts
- [x] Activity log table + write on auth and sensitive mutations
- [x] Auth secrets via environment (never in frontend bundle)
- [x] SMTP password remains masked in API responses

#### Data integrity

- [x] Versioned migration runner with applied-migrations ledger
- [x] Migrate existing v1.2.0 DB without data loss (tested on copy)
- [x] Demo seed gated (`SEED_DEMO`) — no auto-seed on empty clients alone
- [x] Backup download restricted when auth enabled
- [x] Safe restore endpoint or documented restore procedure

#### Hardening

- [x] Upgrade vulnerable `@fastify/*` / busboy packages
- [x] Sensible security headers
- [x] Expanded `.env.example` (auth, seed, secrets)
- [x] Typecheck / build still pass after Alpha changes

### Progress

**Alpha security foundations landed** on `feature/nexboard-2.0` (opt-in via `AUTH_ENABLED=true`). Remaining Alpha polish: user-management UI in Settings, automated test suite beyond smoke scripts, production CSP tuning.

### Validation criteria

- Fresh install can create an admin and log in.
- Existing SQLite file from 1.2.0 migrates; clients/invoices/settings preserved.
- Unauthenticated callers cannot export backup or mutate data when auth is enabled.
- `npm run build` succeeds on Windows (and documented for Linux/macOS).

---

## NexBoard 2.0 Beta 1

### Objectives

Improve commercial workflows without claiming legal invoicing compliance.

### Features

- Richer quote/invoice creation UX
- Document templates
- Payment tracking & partial payments
- Recurring invoices
- Expense management
- Client history timeline
- Commercial statistics & project profitability views

### Checklist

- [ ] Line items on quotes/invoices (amounts derived from lines)
- [ ] Optional VAT/tax fields (informational; no legal compliance claim)
- [ ] Document templates (header/footer/notes)
- [ ] Payments table + partial payments UI
- [ ] Recurring invoice schedules
- [ ] Expenses CRUD + categories
- [ ] Client history (linked documents, payments, projects)
- [ ] Commercial stats API (real data only)
- [ ] Project profitability (budget vs invoiced vs expenses)
- [ ] Preserve convert quote → invoice
- [ ] Tests for payment math and recurrence edge cases

### Progress

Not started (blocked on Alpha security/migrations).

### Validation criteria

- All Beta 1 features work against real SQLite data.
- No fictional KPIs in production mode.
- Migrations from Alpha DB succeed.

---

## NexBoard 2.0 Beta 2

### Objectives

Deliver a premium SaaS-grade UI and a smarter dashboard, keeping Lucide + CSS tokens.

### Features

- Refined light & dark themes
- Modern sidebar + minimal header
- Subtle cards, shadows, motion
- Skeleton loaders & elegant toasts
- Page transitions with `prefers-reduced-motion`
- Dashboard: revenue, pending invoices, payments, expenses, projects, priority tasks
- Interactive charts, period filters, saved widget layout

### Checklist

- [ ] Visual pass on shell (sidebar/header/pages) without neon/glass excess
- [ ] Skeleton loaders on list/dashboard routes
- [ ] Micro-interactions limited to purposeful motion
- [ ] `prefers-reduced-motion` verified across new animations
- [ ] Dashboard widgets use live aggregates (incl. new commercial data)
- [ ] Period filters wired to APIs
- [ ] Widget layout persistence still works
- [ ] Responsive breakpoints verified (mobile/tablet/desktop)
- [ ] a11y pass: focus order, dialogs, contrast
- [ ] Fix calendar nested interactives (`CalendarPage`)
- [ ] Modal focus trap + shared ARIA pattern (incl. dashboard customize)
- [ ] Keyboard alternative for dashboard widget reorder
- [x] i18n: client error strings + locale-aware `formatDate` / currency (`Intl`)
- [x] Topbar language switcher (FR/EN/ES/DE/IT/PT) with persistence
- [ ] Route-level code splitting for heavy pages
- [ ] Remove or wire unused `StatusPieChart`

### Progress

Not started.

### Validation criteria

- UI feels like a professional SaaS product, not a generic AI template.
- Dashboard numbers match DB queries for the selected period.
- No regression on i18n or theme persistence.

---

## NexBoard 2.0 Release Candidate

### Objectives

Developer experience, quality gates, and release hardening.

### Features

- OpenAPI documentation
- Unit + integration + migration tests
- GitHub Actions (typecheck, lint, test, audit)
- Optional Docker
- Complete install docs & `.env.example`
- Security review of auth and file upload paths

### Checklist

- [ ] OpenAPI spec generated/served for `/api`
- [ ] Unit tests for auth, migrations, payments
- [ ] Integration tests for protected routes
- [ ] Migration tests on fixture DB copies
- [ ] GitHub Actions workflow green on PR
- [ ] ESLint + TypeScript strict checks in CI
- [ ] `npm audit` clean or documented exceptions
- [ ] Optional `Dockerfile` + compose example
- [ ] Install docs updated (EN + FR sections in README)
- [ ] Pre-release version `2.0.0-rc.x` (no stable tag yet)

### Progress

Not started.

### Validation criteria

- CI blocks merges on failing typecheck/tests.
- A contributor can go from clone → running app using docs alone.
- Auth and backup/restore documented and tested.

---

## NexBoard 2.0 Stable

### Objectives

Ship a stable, professional open-source business platform under Nexyros.

### Features

- All Alpha–RC items complete and verified
- Stable semver `2.0.0`
- npm package and GitHub Release **only after explicit maintainer approval**

### Checklist

- [ ] All prior phase validation criteria met
- [ ] Upgrade guide 1.2.x → 2.0.0 published
- [ ] CHANGELOG finalized for 2.0.0
- [ ] Manual regression of preserved 1.2.0 features
- [ ] Security smoke test (auth on, backup protected, no secrets in client)
- [ ] Maintainer approval for tag / GitHub Release / npm publish
- [ ] Tag `v2.0.0` and publish (explicit approval required)

### Progress

Not started.

### Validation criteria

- Production-ready for self-hosted single- and multi-user setups.
- No known critical security issues open.
- Data migrations from 1.2.0 verified on real-world-like copies.

---

## Non-goals (for 2.0)

- Rewrite to Next.js / WordPress / unrelated frameworks
- Claiming legal invoicing/tax compliance without jurisdiction-specific validation
- Publishing npm/GitHub releases without explicit approval
- Destroying or silently reseeding existing customer data

---

## How to follow

1. Track issues/PRs against this roadmap.
2. Update checkboxes only after verification.
3. Prefer incremental PRs: security → commercial → UI → DX.
