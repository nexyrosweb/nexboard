# Changelog

All notable changes to **NexBoard** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Line items & VAT on quotes/invoices
- Authentication / API protection
- Multi-user & roles

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

[Unreleased]: https://github.com/nexyrosweb/nexboard/compare/v1.1.1...HEAD
[1.1.1]: https://github.com/nexyrosweb/nexboard/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/nexyrosweb/nexboard/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/nexyrosweb/nexboard/releases/tag/v1.0.0
