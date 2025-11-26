# Banka Project - Progress Report

This document tracks the implementation status of the Banka core banking application against the requirements outlined in `Banka.pdf`.

- ✅: Done
- 🟡: Partially Done / Backend Only
- ❌: Not Done

---

## I. Core Backend & Setup

| Feature | Status | Notes |
| :--- | :---: | :--- |
| **Persistence** | ✅ | Project uses a NodeJS/Express backend with a PostgreSQL database, fulfilling the API requirement. |
| **Database Schema** | ✅ | A comprehensive schema exists in `db/schema.sql` that supports all required entities. |

---

## II. User Authentication (Client)

| Feature | Status | Notes |
| :--- | :---: | :--- |
| **Sign Up** | ✅ | API endpoint `POST /api/auth/signup` exists and handles registration. |
| **Save User Records** | ✅ | Users are saved to the `users` table. |
| **Email Verification (OTP)**| ✅ | `POST /api/auth/verify-otp` exists. The backend generates and sends an OTP via email for verification. |
| **Sign In** | ✅ | `POST /api/auth/login` exists. It checks for verified users and creates a session token. |
| **Forgot Password** | ✅ | `POST /api/auth/forgot-password` and `POST /api/auth/reset-password` are fully implemented. |
| **Maintain Session** | ✅ | System uses JWT for session management, which is standard practice. |

---

## III. Role Features

### Client Features

| Feature | Status | Notes |
| :--- | :---: | :--- |
| **Create Bank Account** | ✅ | `POST /api/accounts` allows a logged-in client to create a new account. |
| **View Transaction History**| ✅ | `GET /api/accounts/:accountId/transactions` retrieves all transactions for an account. |
| **View Specific Transaction**| ✅ | `GET /api/accounts/:accountId/transactions/:transactionId` retrieves a single transaction. |

### Staff (Cashier) Features

| Feature | Status | Notes |
| :--- | :---: | :--- |
| **Debit Client Account** | ✅ | `POST /api/accounts/:accountId/debit` is implemented and restricted to staff/admin roles. |
| **Credit Client Account** | ✅ | `POST /api/accounts/:accountId/credit` is implemented and restricted to staff/admin roles. |
| **View All User Accounts** | ✅ | `GET /api/accounts` allows staff/admin to see all accounts. |
| **View Specific Account** | ✅ | `GET /api/accounts/:accountId` allows staff/admin to see a specific account. |

### Admin Features

| Feature | Status | Notes |
| :--- | :---: | :--- |
| **Create Staff/Admin Users**| ✅ | `POST /api/admin/users` allows an admin to create users with 'staff' or 'admin' roles. |
| **Activate/Deactivate Account**| ✅ | `PATCH /api/admin/accounts/:accountId/[de]activate` endpoints exist. |
| **Delete Specific Account**| ✅ | `DELETE /api/admin/accounts/:accountId` endpoint exists. |
| **Activate/Deactivate User**| ✅ | `PATCH /api/admin/users/:userId/[de]activate` endpoints exist. |
| **Delete User** | ✅ | `DELETE /api/admin/users/:userId` endpoint exists. |
| **Dashboard Stats** | ✅ | `GET /api/admin/dashboard/summary` provides all required stats and supports date-range filtering. |

---

## IV. UI & Extra Features

| Feature | Status | Notes |
| :--- | :---: | :--- |
| **Clean UI** | 🟡 | HTML files exist in `/public`, but they are templates. **No JavaScript logic is implemented** to connect them to the backend API. This is the main remaining task. |
| **No CSS Frameworks** | ✅ | The project uses a plain `styles.css` file, adhering to the requirement. |
| **Add 2 Extra Features** | ✅ | Several extra features are present on the backend: 1. **Download CSV Statement**: `GET /api/accounts/:accountId/statement.csv`. 2. **Security Center**: Users can view their login activity and change their password. |
| **Explain Features in README**| ❌ | The current `README.md` is a generic template and does not explain the extra features. |

---

## V. Summary & Remaining Work

The project has a **complete and robust backend API** that covers nearly all functional requirements. All database and server-side logic is in place.

The primary remaining work is on the **frontend**:
1.  **Implement Frontend JavaScript:** The static HTML files in the `public` directory must be connected to the backend API. This involves:
    - Writing `fetch` calls in `public/js/` to handle user input (e.g., login, signup, creating accounts).
    - Dynamically rendering data from the API (e.g., account lists, transaction history, admin dashboards).
    - Managing user sessions (tokens) in the browser.
2.  **Update README:** The `README.md` file needs to be updated to document the two extra features that were implemented.
