# Banka Project To-Do List

Based on `admin_features.md`, `client_features.md`, `staff_features.md`, and `README.md`.

## Authentication & User Management (High Priority)
- [x] **Sign Up (Client)**: Register with email, password, name. Create bank account on registration.
- [x] **Sign In**: Login with email and password.
- [x] **Two-Factor Authentication (OTP)**: Verify login via OTP sent to email.
- [x] **Forgot Password**: Reset password via OTP.
- [x] **User Profile**: Update profile info (name) and change password.
- [x] **Login History**: View recent login activity.

## Client Features (High Priority)
- [x] **Create Account**: Create new bank accounts.
- [x] **View Account History**: View transaction history.
- [x] **View Transaction**: View details of a specific transaction.
- [x] **Download Statement**: Export transaction history as CSV.

## Staff (Cashier) Features (Medium Priority)
- [x] **Debit Account**: Withdraw funds from client account.
- [x] **Credit Account**: Deposit funds to client account.
- [x] **View Accounts**: View all user accounts.
- [x] **View Account Details**: View specific user account details.

## Admin Features (Medium Priority)
### User Management
- [x] **Create Staff/Admin**: Create new users with specific roles.
- [x] **View Users**: View all users.
- [x] **View User Details**: View specific user details.
- [x] **Manage Users**: Activate or deactivate users.
- [x] **Delete User**: Delete a specific user.

### Account Management
- [x] **Manage Accounts**: Activate or deactivate bank accounts.
- [x] **Delete Account**: Delete specific bank accounts.

### Dashboard & Reporting
- [x] **Dashboard Stats**: View statistics for all/dormant/active accounts.
- [x] **Financial Reports**: View total deposits and withdrawals.
- [x] **Filter Reports**: Filter financial reports by date range.

## General / System (Core)
- [x] **Database Schema**: Ensure PostgreSQL schema supports all entities.
- [x] **API Endpoints**: Implement RESTful API for all features.
- [x] **Frontend Integration**: Connect HTML/JS frontend to backend APIs.
