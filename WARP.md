# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project overview

Banka is a lightweight core banking web application with three roles (Client, Staff/Cashier, Admin) built on:
- Frontend: static HTML, CSS (no frameworks), and vanilla JavaScript
- Backend: Node.js with Express
- Database: PostgreSQL

Auth, JWT, bcrypt-based password hashing, and email/OTP flows are planned but may not yet be implemented.

## Commands and workflows

All commands are intended to be run from the repository root.

### Dependency installation

The `dependencies` section in `package.json` is currently empty; the README specifies the intended runtime packages:

```bash
npm install express pg dotenv bcrypt jsonwebtoken nodemon
```

After the above (and any future dev dependencies) are installed, use:

```bash
npm install
```

for subsequent installs to restore `node_modules` from `package.json`/`package-lock.json`.

### Running the server

`package.json` defines minimal scripts:

- Development / run the server:
  - `npm run dev`
  - This currently resolves to: `node src/server/app.js`
- Start (production-style entry):
  - `npm start`
  - Also resolves to: `node src/server/app.js`

There is no separate build step; the server runs the source files directly via Node.

If `nodemon` is installed but not wired into `package.json`, a common pattern is:

```bash
npx nodemon src/server/app.js
```

Update the `dev` script to use `nodemon` if hot-reload is desired.

### Linting and formatting

No linting or formatting scripts are currently defined in `package.json`.

If/when tools like ESLint or Prettier are added, prefer to expose them via scripts (for example, `npm run lint`, `npm run format`) and update this section so Warp can invoke them directly.

### Tests

There is currently no `test` script defined in `package.json`, and no test runner is configured.

When tests are introduced, make sure to:
- Add a `"test"` script in `package.json` (e.g., for Jest, Mocha, or another framework).
- Document here how to:
  - Run the full test suite, e.g. `npm test`
  - Run a single test file or test case, e.g. `npm test -- path/to/file.test.js` or a framework-specific pattern

Warp will rely on these documented commands rather than guessing.

### Database and environment

Environment configuration is expected (based on `README.md`) to live in `.env`, copied from `.env.example`.

Key points for future changes:
- PostgreSQL connection settings are expected via either `DATABASE_URL` or the standard `PG*` variables (`PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`).
- JWT: a `JWT_SECRET` (or equivalent) is expected for token signing once JWT auth is implemented.
- OTP and email settings (for verification and password reset) are expected to use SMTP credentials such as:
  - `EMAIL_USER`
  - `EMAIL_PASS` (likely an app password)

Database bootstrap is currently manual:
- Create the database explicitly, e.g. `CREATE DATABASE banka_db;` in PostgreSQL.
- Any migration or schema-creation tooling (SQL files, migration runners) should be documented here once introduced.

## High-level architecture

The current repository mainly defines intent via `README.md`. The following describes the planned big-picture architecture so future Warp instances know where to look as implementation evolves.

### Backend (Node.js / Express)

Planned structure (from README):
- `src/server/app.js`
  - Express application entry point.
  - Expected responsibilities:
    - Create and configure the Express app.
    - Register global middleware (JSON parsing, static file serving for `public/`, basic error handling).
    - Mount route modules under API prefixes (e.g. `/api/auth`, `/api/accounts`, `/api/admin`).
    - Start the HTTP server on a configured port (default likely `3000`).

- `src/server/config/db.js`
  - PostgreSQL connection helper using environment variables.
  - Expected responsibilities:
    - Initialize a `pg` pool or client.
    - Export a reusable query interface for controllers and data-access layers.

- `src/server/routes/`
  - Route modules grouped by domain:
    - Auth (signup, login, verification, password reset).
    - Accounts (create account, list accounts, fetch account by ID, list transactions).
    - Admin/staff operations (credit/debit transactions, activate/deactivate accounts, manage users, dashboard endpoints).
  - Should remain thin: map HTTP routes to controller functions and apply role-based middleware.

- `src/server/controllers/`
  - Business-logic layer for the main domains:
    - Authentication and user management.
    - Account lifecycle (creation, activation/deactivation, deletion).
    - Transaction processing (credit/debit) with balance checks.
    - Reporting/dashboard aggregation for admin metrics.
  - Controllers are expected to:
    - Validate and normalize inputs.
    - Call DB helpers / queries.
    - Enforce role and state rules (e.g. only staff can credit/debit; only admin can deactivate users).

Where possible, keep controllers separate from raw SQL by introducing a simple data-access layer (even if it lives alongside controllers) so business rules do not depend directly on SQL strings.

### Frontend (static assets)

Planned structure:
- `public/`
  - Static HTML pages for the three roles (Client, Staff/Cashier, Admin).
  - Shared assets: CSS, vanilla JS, and images.
  - The Express app should serve this directory directly, with JS making API calls to the backend.

Constraints from the README:
- No PHP.
- No CSS frameworks (Bootstrap, Tailwind, etc.).

### Auth, security, and email (planned)

The README calls out several planned subsystems that may not yet have concrete code:
- JWT-based authentication for session handling.
- Password hashing with `bcrypt`.
- OTP-based email flows for:
  - Account verification after signup.
  - Password reset.

When these are implemented, keep in mind:
- Centralize JWT verification and role-based access control in reusable middleware.
- Isolate email-sending logic (e.g. using `nodemailer`) in a dedicated helper/module rather than scattering SMTP calls across controllers.

## Notes for future Warp agents

- This repository is currently in a scaffold/early stage. Before performing multi-file edits, verify that the referenced directories (`src/server`, `public`, etc.) and files actually exist; create them if necessary in line with the architecture above.
- Use `README.md` as the source of truth for business requirements and role behavior; the implementation may lag behind the documented plan.
- When new tooling (linting, testing, migrations, CI scripts) is added, update this `WARP.md` with the exact commands and directory structure so future Warp sessions can operate reliably without guessing.
