# Implementation Plan - Separate Admin and Staff Dashboards

The current `dashboard.js` contains logic for Client, Staff, and Admin roles. The user requested to separate the Admin dashboard. To maintain a clean architecture, I will separate both Admin and Staff dashboards into their own HTML and JS files.

## User Review Required
> [!IMPORTANT]
> I will be creating new HTML files `admin_dashboard.html` and `staff_dashboard.html`. The existing `dashboard.html` will remain as the Client dashboard.
> I will also update `auth.js` to redirect users to their respective dashboard files upon login.

## Proposed Changes

### Frontend Structure
#### [NEW] [admin_dashboard.html](file:///c:/Users/STUDENTS/banka-core-banking-app/public/admin_dashboard.html)
- New HTML file for the Admin interface.
- Will link to `js/admin_dashboard.js`.

#### [NEW] [staff_dashboard.html](file:///c:/Users/STUDENTS/banka-core-banking-app/public/staff_dashboard.html)
- New HTML file for the Staff interface.
- Will link to `js/staff_dashboard.js`.

#### [NEW] [js/admin_dashboard.js](file:///c:/Users/STUDENTS/banka-core-banking-app/public/js/admin_dashboard.js)
- Will contain the `renderAdminDashboard` logic and related helper functions extracted from `dashboard.js`.

#### [NEW] [js/staff_dashboard.js](file:///c:/Users/STUDENTS/banka-core-banking-app/public/js/staff_dashboard.js)
- Will contain the `renderStaffDashboard` logic and related helper functions extracted from `dashboard.js`.

#### [MODIFY] [js/dashboard.js](file:///c:/Users/STUDENTS/banka-core-banking-app/public/js/dashboard.js)
- Remove Admin and Staff logic.
- Rename functions to be generic `initDashboard` but strictly for Client (or rename file to `client_dashboard.js` if preferred, but keeping `dashboard.js` as client default is fine).

#### [MODIFY] [js/auth.js](file:///c:/Users/STUDENTS/banka-core-banking-app/public/js/auth.js)
- Update `redirectToDashboard` to route:
    - Admin -> `admin_dashboard.html`
    - Staff -> `staff_dashboard.html`
    - Client -> `dashboard.html`

## Verification Plan
### Automated Tests
- None (Frontend UI changes).

### Manual Verification
1.  **Admin Login**: Login as admin -> Redirect to `admin_dashboard.html` -> Verify Admin UI loads.
2.  **Staff Login**: Login as staff -> Redirect to `staff_dashboard.html` -> Verify Staff UI loads.
3.  **Client Login**: Login as client -> Redirect to `dashboard.html` -> Verify Client UI loads.
