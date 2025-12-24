-- Migration: make slots.phone_id and slots.ip_id nullable
-- Run this with drizzle-kit or psql against your database.

BEGIN;

ALTER TABLE public.slots
  ALTER COLUMN phone_id DROP NOT NULL;

ALTER TABLE public.slots
  ALTER COLUMN ip_id DROP NOT NULL;

COMMIT;

