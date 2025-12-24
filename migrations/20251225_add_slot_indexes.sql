-- Migration: Add indexes for better query performance on slots table
-- Run this with drizzle-kit or psql against your database.

BEGIN;

-- Create individual column indexes for filtering
CREATE INDEX IF NOT EXISTS slots_phone_id_idx ON public.slots(phone_id);
CREATE INDEX IF NOT EXISTS slots_ip_id_idx ON public.slots(ip_id);
CREATE INDEX IF NOT EXISTS slots_used_at_idx ON public.slots(used_at);

-- Create composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS slots_phone_id_used_at_idx ON public.slots(phone_id, used_at);
CREATE INDEX IF NOT EXISTS slots_ip_id_used_at_idx ON public.slots(ip_id, used_at);

COMMIT;
