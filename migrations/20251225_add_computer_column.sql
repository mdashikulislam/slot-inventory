-- Migration: Add computer column to phones and ips tables
-- Run this with drizzle-kit or psql against your database.

BEGIN;

-- Add computer column to phones table
ALTER TABLE public.phones ADD COLUMN IF NOT EXISTS computer TEXT DEFAULT '';

-- Add computer column to ips table
ALTER TABLE public.ips ADD COLUMN IF NOT EXISTS computer TEXT DEFAULT '';

COMMIT;
