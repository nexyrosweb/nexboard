# NexBoard

<p align="center">
  <img src="docs/images/logo.png" alt="NexBoard Logo" width="180">
</p>

<p align="center">
  <strong>Modern, modular and lightweight business management dashboard.</strong>
</p>

<p align="center">
  React • Vite • TypeScript • Node.js • Fastify • SQLite
</p>

<p align="center">
  <a href="https://github.com/nexyrosweb/nexboard/releases"><img src="https://img.shields.io/github/v/release/nexyrosweb/nexboard?label=release" alt="GitHub release"></a>
  <a href="https://www.npmjs.com/package/nexboard"><img src="https://img.shields.io/npm/v/nexboard.svg" alt="npm version"></a>
  <a href="CHANGELOG.md"><img src="https://img.shields.io/badge/changelog-Keep%20a%20Changelog-blue.svg" alt="Changelog"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT license"></a>
  <a href="https://github.com/nexyrosweb/nexboard"><img src="https://img.shields.io/github/stars/nexyrosweb/nexboard?style=social" alt="GitHub stars"></a>
</p>

<p align="center">
  <a href="#-english">English</a> ·
  <a href="#-français">Français</a>
</p>

---

## 🇬🇧 English

### About NexBoard

**NexBoard** is a modern business management dashboard designed to provide a clean, fast and intuitive interface for managing everyday business operations.

The project uses a client-server architecture and is designed to remain lightweight, modular and easy to install on Windows, Linux, macOS or a VPS.

### Preview

<p align="center">
  <img src="docs/images/Dashboard.png" alt="NexBoard Dashboard" width="900">
</p>

> Logo: `docs/images/logo.png` (from *Logo NexBoard - Blanc.png*).

### Features

* 📊 Dashboard with key statistics and charts
* 👥 Customer management (CRUD)
* 📁 Project management (CRUD)
* 🧾 Quotes and invoices (CRUD + email send)
* 🖨️ Printable document preview (save as PDF via browser)
* 🔁 Convert quote → invoice
* 🗂️ Detail sheets with quick actions
* 📈 Charts and analytics (Recharts)
* 🔎 Search and filters
* 🌙 Light and dark mode
* 🎨 Logo, brand color and multi-language UI
* 🔔 In-app notifications
* ✉️ SMTP configuration and test emails
* ⚙️ Application settings
* 📤 CSV export and SQLite backup
* 📱 Responsive interface
* 💾 Local SQLite database (auto-created)
* 🚀 Simple installation (`npm install` + `npm run dev`)

### Screenshots

#### Dashboard

<p align="center">
  <img src="docs/images/Dashboard.png" alt="Dashboard">
</p>

#### Customers

<p align="center">
  <img src="docs/images/Clients.png" alt="Customer Management">
</p>

#### Projects

<p align="center">
  <img src="docs/images/Project.png" alt="Project Management">
</p>

#### Quotes

<p align="center">
  <img src="docs/images/Devis.png" alt="Quotes Management">
</p>

#### Invoices

<p align="center">
  <img src="docs/images/Factures.png" alt="Invoice Management">
</p>

> Screenshots: `Dashboard.png`, `Clients.png`, `Project.png`, `Devis.png`, `Factures.png`.

### Versioning

NexBoard follows [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`).

- Changelog: [`CHANGELOG.md`](CHANGELOG.md)
- GitHub Releases: https://github.com/nexyrosweb/nexboard/releases

### Tech Stack

#### Frontend

* React
* Vite
* TypeScript
* CSS
* Lucide Icons
* Recharts

#### Backend

* Node.js **22+**
* Fastify
* SQLite (`node:sqlite`)

### Project Structure

```text
nexboard/
├── client/
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── context/
│   │   ├── i18n/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── styles/
│   │   └── types/
│   └── package.json
│
├── server/
│   ├── bin/
│   ├── src/
│   │   ├── db/
│   │   ├── routes/
│   │   └── services/
│   ├── data/                 # SQLite + uploads (local)
│   └── package.json          # publishable as `nexboard`
│
├── docs/
│   └── images/
│       ├── logo.png
│       ├── Logo NexBoard - Blanc.png
│       ├── Logo NexBoard - Noir.png
│       ├── Dashboard.png
│       ├── Clients.png
│       ├── Project.png
│       ├── Devis.png
│       └── Factures.png
│
├── .env.example
├── .gitignore
├── LICENSE
├── package.json
└── README.md
```

### Installation

#### Requirements

* Node.js **22+**
* npm
* Git

Clone the repository:

```bash
git clone https://github.com/nexyrosweb/nexboard.git
```

Open the project:

```bash
cd nexboard
```

Install all dependencies:

```bash
npm install
```

### Environment

Create your local environment file from `.env.example`.

Linux / macOS:

```bash
cp .env.example .env
```

Windows (PowerShell):

```powershell
Copy-Item .env.example .env
```

Main variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | API / production port | `3001` |
| `HOST` | Listen address (`0.0.0.0` for VPS) | `0.0.0.0` |
| `DATABASE_PATH` | Relative SQLite path (from `server/`) | `./data/nexboard.db` |

### Development

Start NexBoard in development mode:

```bash
npm run dev
```

* UI: [http://localhost:5173](http://localhost:5173)
* API: [http://localhost:3001](http://localhost:3001)

Client and server are managed through npm workspaces.

### Production

```bash
npm run build
npm start
```

Or, once published to npm:

```bash
npx nexboard
```

### Database

NexBoard uses **SQLite** to keep installation simple and portable.

No external MySQL or PostgreSQL server is required.

The local database is created automatically on first start, with demo data.

### Goals

NexBoard is built around a few core principles:

* Simple installation
* Clean architecture
* Reusable components
* Modular code
* Minimal unnecessary dependencies
* Responsive design
* Easy deployment
* Maintainable codebase

### Roadmap

* [x] Project architecture
* [x] Dashboard interface
* [x] Customer management
* [x] Project management
* [x] Quotes
* [x] Invoices
* [x] Notifications
* [x] SMTP / email sending
* [x] Branding (logo & colors)
* [x] Multi-language UI
* [x] API
* [x] Dashboard customization
* [ ] Authentication
* [ ] PDF export
* [ ] User management
* [ ] Roles and permissions
* [ ] Advanced analytics

### Contributing

Contributions, suggestions and feedback are welcome.

You can open an **Issue** to report a bug, suggest an improvement or propose a new feature.

### License

This project is licensed under the **MIT License**.

See the [`LICENSE`](LICENSE) file for more information.

---

## 🇫🇷 Français

### À propos de NexBoard

**NexBoard** est un dashboard moderne de gestion d’entreprise permettant de centraliser les opérations quotidiennes dans une interface simple, rapide et intuitive.

Le projet utilise une architecture client-serveur et est pensé pour rester léger, modulaire et facilement installable sur Windows, Linux, macOS ou un VPS.

### Aperçu

<p align="center">
  <img src="docs/images/Dashboard.png" alt="Dashboard NexBoard" width="900">
</p>

> Logo : `docs/images/logo.png` (issu de *Logo NexBoard - Blanc.png*).

### Fonctionnalités

* 📊 Tableau de bord avec statistiques et graphiques
* 👥 Gestion des clients (CRUD)
* 📁 Gestion des projets (CRUD)
* 🧾 Devis et factures (CRUD + envoi e-mail)
* 🖨️ Aperçu document imprimable (PDF via navigateur)
* 🔁 Conversion devis → facture
* 🗂️ Fiches détail avec actions rapides
* 📈 Graphiques et analytics (Recharts)
* 🔎 Recherche et filtres
* 🌙 Mode clair et sombre
* 🎨 Logo, couleur de marque et interface multilingue
* 🔔 Notifications in-app
* ✉️ Configuration SMTP et e-mails de test
* ⚙️ Paramètres de l’application
* 📤 Export CSV et sauvegarde SQLite
* 📱 Interface responsive
* 💾 Base de données SQLite locale (création auto)
* 🚀 Installation simple (`npm install` + `npm run dev`)

### Captures d’écran

#### Tableau de bord

<p align="center">
  <img src="docs/images/Dashboard.png" alt="Tableau de bord">
</p>

#### Clients

<p align="center">
  <img src="docs/images/Clients.png" alt="Gestion des clients">
</p>

#### Projets

<p align="center">
  <img src="docs/images/Project.png" alt="Gestion des projets">
</p>

#### Devis

<p align="center">
  <img src="docs/images/Devis.png" alt="Gestion des devis">
</p>

#### Factures

<p align="center">
  <img src="docs/images/Factures.png" alt="Gestion des factures">
</p>

> Captures : `Dashboard.png`, `Clients.png`, `Project.png`, `Devis.png`, `Factures.png`.

### Versioning

NexBoard suit le [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`).

- Journal des versions : [`CHANGELOG.md`](CHANGELOG.md)
- Releases GitHub : https://github.com/nexyrosweb/nexboard/releases

### Technologies

#### Frontend

* React
* Vite
* TypeScript
* CSS
* Lucide Icons
* Recharts

#### Backend

* Node.js **22+**
* Fastify
* SQLite (`node:sqlite`)

### Structure du projet

```text
nexboard/
├── client/
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── context/
│   │   ├── i18n/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── styles/
│   │   └── types/
│   └── package.json
│
├── server/
│   ├── bin/
│   ├── src/
│   │   ├── db/
│   │   ├── routes/
│   │   └── services/
│   ├── data/                 # SQLite + uploads (local)
│   └── package.json          # publiable sous `nexboard`
│
├── docs/
│   └── images/
│       ├── logo.png
│       ├── Logo NexBoard - Blanc.png
│       ├── Logo NexBoard - Noir.png
│       ├── Dashboard.png
│       ├── Clients.png
│       ├── Project.png
│       ├── Devis.png
│       └── Factures.png
│
├── .env.example
├── .gitignore
├── LICENSE
├── package.json
└── README.md
```

### Installation

#### Prérequis

* Node.js **22+**
* npm
* Git

Clonez le dépôt :

```bash
git clone https://github.com/nexyrosweb/nexboard.git
```

Accédez au projet :

```bash
cd nexboard
```

Installez toutes les dépendances :

```bash
npm install
```

### Configuration

Créez votre fichier d’environnement à partir de `.env.example`.

Linux / macOS :

```bash
cp .env.example .env
```

Windows (PowerShell) :

```powershell
Copy-Item .env.example .env
```

Variables principales :

| Variable | Description | Défaut |
|----------|-------------|--------|
| `PORT` | Port API / production | `3001` |
| `HOST` | Adresse d’écoute (`0.0.0.0` pour un VPS) | `0.0.0.0` |
| `DATABASE_PATH` | Chemin relatif SQLite (depuis `server/`) | `./data/nexboard.db` |

### Développement

Lancez NexBoard en mode développement :

```bash
npm run dev
```

* Interface : [http://localhost:5173](http://localhost:5173)
* API : [http://localhost:3001](http://localhost:3001)

Le client et le serveur sont gérés via les npm workspaces.

### Production

```bash
npm run build
npm start
```

Ou, une fois publié sur npm :

```bash
npx nexboard
```

### Base de données

NexBoard utilise **SQLite** afin de conserver une installation simple et portable.

Aucun serveur MySQL ou PostgreSQL externe n’est nécessaire.

La base locale est créée automatiquement au premier lancement, avec des données de démonstration.

### Objectifs

NexBoard repose sur plusieurs principes :

* Installation simple
* Architecture claire
* Composants réutilisables
* Code modulaire
* Peu de dépendances inutiles
* Interface responsive
* Déploiement facile
* Code facilement maintenable

### Feuille de route

* [x] Architecture du projet
* [x] Interface du dashboard
* [x] Gestion des clients
* [x] Gestion des projets
* [x] Devis
* [x] Factures
* [x] Notifications
* [x] SMTP / envoi d’e-mails
* [x] Branding (logo & couleurs)
* [x] Interface multilingue
* [x] API
* [x] Personnalisation du dashboard
* [ ] Authentification
* [ ] Export PDF
* [ ] Gestion des utilisateurs
* [ ] Rôles et permissions
* [ ] Statistiques avancées

### Contribution

Les contributions, suggestions et retours sont les bienvenus.

Vous pouvez ouvrir une **Issue** pour signaler un problème, proposer une amélioration ou suggérer une nouvelle fonctionnalité.

### Licence

Ce projet est distribué sous licence **MIT**.

Consultez le fichier [`LICENSE`](LICENSE) pour plus d’informations.

---

<p align="center">
  <img src="docs/images/logo.png" alt="NexBoard" width="64">
</p>

<p align="center">
  Made with ❤️ for NexBoard
</p>
