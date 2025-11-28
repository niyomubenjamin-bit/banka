-- Initial schema for Banka core banking app
-- Phase 1: users table for authentication and roles, plus OTPs for email verification and password reset.

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'client', -- client | staff | admin
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'active', -- active | inactive
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure status column exists for existing databases
ALTER TABLE users
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

CREATE TABLE IF NOT EXISTS otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    purpose TEXT NOT NULL, -- 'verify_email' | 'reset_password'
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otps_user_purpose ON otps (user_id, purpose);

-- In PostgreSQL 14+ on some setups, gen_random_uuid() may require the pgcrypto extension.
-- Enable it manually if needed:
--   CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Accounts table for client banking
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    account_number TEXT NOT NULL UNIQUE,
    owner_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'savings', -- savings | current
    status TEXT NOT NULL DEFAULT 'active', -- active | dormant
    balance NUMERIC(14, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounts_owner ON accounts (owner_id);

CREATE INDEX IF NOT EXISTS idx_accounts_account_number ON accounts (account_number);

-- Transactions table for account history
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    account_id UUID NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- credit | debit
    amount NUMERIC(14, 2) NOT NULL,
    cashier_id UUID REFERENCES users (id), -- staff/admin who performed the operation (nullable for client self-service)
    old_balance NUMERIC(14, 2) NOT NULL,
    new_balance NUMERIC(14, 2) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions (account_id);

CREATE INDEX IF NOT EXISTS idx_transactions_account_created_at ON transactions (account_id, created_at DESC);

-- Login activity for security center
CREATE TABLE IF NOT EXISTS login_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    user_id UUID REFERENCES users (id) ON DELETE SET NULL,
    email TEXT,
    success BOOLEAN NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_activity_user_created_at ON login_activity (user_id, created_at DESC);