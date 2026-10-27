# Changelog

All notable changes to **NexBoard** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Public **NexBoard 2.0** roadmap ([`ROADMAP.md`](ROADMAP.md)) with Alpha → Stable phases and verified checklists
- Technical audit baseline for 2.0 ([`docs/AUDIT-2.0.md`](docs/AUDIT-2.0.md))
- Migration guide ([`docs/MIGRATIONS.md`](docs/MIGRATIONS.md))
- README links (EN/FR) to the 2.0 roadmap and audit
- **Opt-in authentication** (`AUTH_ENABLED`): setup, login/logout, httpOnly sessions, roles `admin`/`user`
- Server-side API protection, login/setup rate limits, activity logs, admin-only backup download
- Versioned SQLite migrations ledger (`schema_migrations`) + auth tables
- Login / initial-setup screens
- Expanded `.env.example` (auth, session, seed)
- **Topbar language switcher** (FR / EN / ES / DE / IT / PT) with flags, keyboard a11y, instant UI update
- Modular i18n dictionaries under `client/src/i18n/locales/{locale}/`
- Locale-aware dates, numbers and currency via `Intl` (invoice currency amounts unchanged)
- Guide: [`docs/I18N.md`](docs/I18N.md)

### Changed
- Default UI locale for new installs: **French** (`fr`); legacy `ja` maps to `en`
- Japanese locale removed from the active set (replaced by Italian & Portuguese)
- Demo seed runs only on **brand-new** DB files when `SEED_DEMO=true` (no reseed of empty existing DBs)
- Security headers via `@fastify/helmet`; CORS credentials support for cookie sessions
- Fastify multipart/static dependency upgrades (patched busboy)

### Planned (see ROADMAP)
- Users management UI in Settings; finer permissions (Alpha polish)
- Line items & VAT fields, payments, expenses, templates (Beta 1)
- UI/UX polish and enhanced live dashboard (Beta 2)
- OpenAPI, tests, CI, optional Docker (RC)

## [1.2.0] - 2026-08-08

### Added
- Tasks with due date, priority, assignee, reminders and “today” view
- Calendar week/month view (invoices, quotes, projects, tasks, appointments)
- Customizable dashboard widgets (drag, hide/show, persisted layout)
- CSV import for clients/projects with preview and duplicate detection
- Smart notification center (overdue invoices, expiring quotes, project deadlines, task/event reminders, backup failures)
- Configurable quote/invoice number formats (`DEV-2026-012`, `FAC - 2026 - 018`)
- Multi-currency support and custom statuses per entity
- Overdue invoice reminders (in-app + optional email) with PDF attachments on email send
- Date-range filters and period CSV export
- Official NexBoard logo and favicon branding

### Changed
- Appearance settings: logo, brand color and theme save automatically
- Dashboard stats extended (monthly revenue, unpaid, conversion rate, new clients)

## [1.1.2] - 2026-08-07

### Fixed
- Print / PDF no longer produces a blank page (dedicated print root)
- Detail sheet action buttons no longer wrap awkwardly

### Changed
- README: quick install via `npm i nexboard` / `npx nexboard`
- Shorter action labels in document detail sheets

## [1.1.1] - 2026-08-07

### Fixed
- Language setting now persists correctly (Français and other locales)
- Selecting a language saves immediately to the server
- Branding settings refresh no longer overwrites the chosen locale
- Clearer French navigation labels (`Tableau de bord`, etc.)

## [1.1.0] - 2026-08-07

### Added
- Printable document preview for quotes and invoices (browser Print / PDF)
- Convert quote → invoice (`POST /api/quotes/:id/convert`)
- Detail sheets for clients, quotes and invoices with quick actions
- Richer empty states with guidance hints
- npm package badges in README

### Changed
- Package version bumped to `1.1.0`
- Settings “ideas” list updated (PDF preview shipped)

## [1.0.0] - 2026-08-07

### Added
- Initial public release of NexBoard
- Dashboard with stats and charts (Recharts)
- CRUD for clients, projects, quotes and invoices
- Light / dark theme, branding (logo + brand color)
- Multi-language UI (English, Japan, Español, Deutsch, Français)
- In-app notifications
- SMTP configuration, test mail, send quotes/invoices by email
- CSV export and SQLite backup
- CLI: `npx nexboard` (Node.js ≥ 22)
- MIT license

[Unreleased]: https://github.com/nexyrosweb/nexboard/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/nexyrosweb/nexboard/compare/v1.1.2...v1.2.0
[1.1.2]: https://github.com/nexyrosweb/nexboard/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/nexyrosweb/nexboard/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/nexyrosweb/nexboard/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/nexyrosweb/nexboard/releases/tag/v1.0.0
