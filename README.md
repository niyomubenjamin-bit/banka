# Banka - Lightweight Core Banking Web Application

Banka is a lightweight core banking web application built with **HTML**, **CSS**, **pure JavaScript**, **Node.js (Express)**, and **PostgreSQL**. It supports three roles:

- **Client** – Owns bank accounts, views balances and transactions, and performs basic self-service actions.
- **Staff (Cashier)** – Credits and debits client accounts.
- **Admin** – Manages users and accounts, and views high-level banking statistics.

## Technology Stack

- **Frontend:** HTML, CSS (no CSS frameworks), Vanilla JavaScript
- **Backend:** Node.js with Express
- **Database:** PostgreSQL
- **Auth & Security:** JWT (implemented), bcrypt for password hashing (implemented)
- **Email/OTP:** Nodemailer for email via SMTP (implemented)

> **Note:** PHP and CSS frameworks (Bootstrap, Tailwind, etc.) are intentionally **not** used in this project.

## Core Features (Implemented)

### Authentication & Users
- Client/Staff/Admin user roles.
- Client Sign up with email, password, first name, last name, and desired account type (creates a bank account immediately upon registration).
- Account details (account number and type) are sent to the client's email upon successful registration.
- Login is a two-step process:
    1.  Enter email and password.
    2.  If credentials are correct, an OTP is sent to the registered email address. The user must then enter this OTP to complete the login.
- Email verification via OTP at signup has been removed; new users are `email_verified: true` upon creation. OTPs are now primarily used for login MFA and password resets.
- Forgot password flow using OTP and email.
- Admin can create Staff and Admin users.

### Client Banking
- Create bank accounts.
- View account transaction history.
- View specific account transactions.

### Staff (Cashier)
- Debit (withdraw from) client accounts.
- Credit (deposit to) client accounts.

### Admin & Staff Shared
- View all user accounts.
- View a specific user account.

### Admin Only
- Activate or deactivate an account.
- Delete a specific user account.
- Activate or deactivate users.
- Delete users.
- Dashboard with counts and totals (all accounts, dormant vs. active, total deposited vs. withdrawn, filtered by date range).

## Project Structure

- `src/server/app.js` – Express app entry point.
- `src/server/config/db.js` – PostgreSQL connection helper.
- `src/server/routes/` – Express route modules for auth, accounts, and admin.
- `src/server/controllers/` – Controllers for auth, account, and admin business logic.
- `public/` – Static frontend (HTML, CSS, JS) served by Express.

## Getting Started

1.  **Clone or create the project directory**
    -   This repo is expected to live in a folder like `banka-core-banking-app`.

2.  **Install dependencies**
    ```bash
    npm install bcryptjs dotenv express jsonwebtoken nodemailer pg jest supertest nodemon
    ```

3.  **Configure environment variables**
    -   Copy `.env.example` to `.env` and fill in real values:
        -   PostgreSQL settings (`PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD` or `DATABASE_URL`).
        -   `JWT_SECRET` for signing tokens.
        -   `OTP_EXPIRY_MINUTES` for OTP validity duration.
        -   Email settings for Nodemailer:
            -   `EMAIL_HOST` (e.g., `smtp.gmail.com`)
            -   `EMAIL_PORT` (e.g., `587`)
            -   `EMAIL_USER` (e.g., `your_email@gmail.com`)
            -   `EMAIL_PASS` (e.g., `your_gmail_app_password`)

4.  **Create the PostgreSQL database**
    -   Example: `CREATE DATABASE banka_db;`

5.  **Apply the database schema**
    ```bash
    psql -d banka_db -f db/schema.sql
    ```

6.  **Run the server (development)**
    ```bash
    npm run dev
    ```
    - The server will run on `http://localhost:3000` (or your configured port).

7.  **Create an Admin User (Optional but Recommended)**
    - If you need an admin user for testing, you can run the `create_admin.js` script (you might need to adjust it to suit your needs, e.g., hardcode email/password or make it interactive).

## How to Run the Frontend

The Express server (`npm run dev`) serves the static frontend files located in the `public/` directory. Once the server is running, simply open your web browser and navigate to `http://localhost:3000`.

## Implemented Extra Features

These are two additional features implemented on top of the core specification:

1.  **Downloadable Account Statement (CSV)**
    -   Clients can now export the transaction history for any of their accounts as a CSV file directly from the dashboard. This feature allows for easy offline record-keeping and integration with personal finance software. The endpoint is `GET /api/accounts/:accountId/statement.csv`.

2.  **Client Profile & Security Center**
    -   Authenticated users can update their profile information (first name, last name), change their password, and view a log of their recent login activities directly from their dashboard. This enhances user control over their personal data and security.

Further documentation (including detailed API docs and UI walkthroughs) will be added as the implementation progresses.
