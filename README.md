# Banka - Core Banking Application

Banka is a lightweight core banking web application that allows users to create bank accounts, view transaction history, and perform transactions. It features a comprehensive dashboard for clients, staff (cashiers), and administrators.

## Features

### Client (User)
- **Sign Up & Sign In**: Secure registration and login with email verification.
- **Create Account**: Open new bank accounts.
- **Transaction History**: View full history of deposits and withdrawals.
- **Transaction Details**: Inspect details of specific transactions.
- **Low Balance Alerts**: Receive email notifications when account balance drops below a threshold.
- **Transaction Alerts**: Receive email notifications for credit and debit transactions.

### Staff (Cashier)
- **Credit/Debit Accounts**: Perform deposit and withdrawal transactions for user accounts.
- **View Accounts**: Access user account details.

### Admin
- **User Management**: Create staff and admin accounts; activate, deactivate, or delete users.
- **Account Management**: Activate, deactivate, or delete bank accounts.
- **Dashboard**: View statistics on active/dormant accounts and transaction volumes.

## Technology Stack

- **Frontend**: HTML5, CSS3 (Custom), JavaScript (Vanilla)
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens) - *Planned/In Progress*

## Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher)
- [PostgreSQL](https://www.postgresql.org/)

## Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd banka-core-banking-app
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

## Configuration

1.  Create a `.env` file in the root directory (copy from `.env.example` if available).
2.  Configure the following environment variables:

    ```env
    PORT=3000
    DATABASE_URL=postgresql://user:password@localhost:5432/banka_db
    JWT_SECRET=your_jwt_secret
    EMAIL_USER=your_email@example.com
    EMAIL_PASS=your_email_password
    ```

## Running the Application

- **Development Mode** (with nodemon):
    ```bash
    npm run dev
    ```

- **Production Mode**:
    ```bash
    npm start
    ```

The server will start on `http://localhost:3000` (or the port specified in `.env`).

## API Endpoints

The application exposes RESTful API endpoints. Key routes include:

- `/api/v1/auth/signup` - Register a new user
- `/api/v1/auth/signin` - Login user
- `/api/v1/accounts` - Account management
- `/api/v1/transactions` - Transaction processing

## Project Structure

```
banka-core-banking-app/
├── public/             # Static frontend assets (HTML, CSS, JS)
├── src/
│   ├── server/
│   │   ├── config/     # Database and app configuration
│   │   ├── controllers/# Request handlers
│   │   ├── routes/     # API route definitions
│   │   ├── utils/      # Helper functions
│   │   └── app.js      # Express app setup
│   └── server.js       # Server entry point
├── .env                # Environment variables
├── package.json        # Project dependencies and scripts
└── README.md           # Project documentation
```
