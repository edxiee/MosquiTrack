-- ==============================================================================
-- MOSQUITRACK: CHOICE 2 - DIRECT STATUS TEXT COLUMN + AUTO-HEARTBEAT CRON
-- ==============================================================================
-- Run this script in the Supabase SQL Editor.
--
-- What this does:
-- 1. Adds a visible text column `status` to `public.ovitrap_devices` with default 'Offline'.
-- 2. Creates a trigger on `public.ovitrap_readings`:
--    Whenever IoT transmits data, `status` becomes 'Active' and `last_seen_at` updates.
-- 3. Sets up a `pg_cron` schedule that runs every minute:
--    If a device hasn't sent data for 16 minutes, it automatically flips `status` back to 'Offline'.
-- 4. Immediately syncs existing devices based on whether they sent data in the last 16 minutes.
-- ==============================================================================

-- 1. Add direct status column to ovitrap_devices
ALTER TABLE public.ovitrap_devices 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'Offline';

-- 2. Trigger function to mark device as 'Active' whenever telemetry arrives
CREATE OR REPLACE FUNCTION public.sync_device_status_text()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.ovitrap_devices
  SET last_seen_at = COALESCE(NEW.captured_at, NEW.created_at, NOW()),
      status = 'Active',
      updated_at = NOW()
  WHERE id = NEW.device_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to ovitrap_readings
DROP TRIGGER IF EXISTS trg_sync_device_status_text ON public.ovitrap_readings;
CREATE TRIGGER trg_sync_device_status_text
AFTER INSERT ON public.ovitrap_readings
FOR EACH ROW
EXECUTE FUNCTION public.sync_device_status_text();

-- 3. Enable pg_cron extension (available natively on Supabase)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Unschedule previous job if it exists to avoid duplicates
DO $$
BEGIN
  PERFORM cron.unschedule('auto-offline-traps-text');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Schedule auto-offline cron: runs every minute to flip to 'Offline' after 16 minutes
SELECT cron.schedule(
  'auto-offline-traps-text',
  '* * * * *',
  $$
    UPDATE public.ovitrap_devices
    SET status = 'Offline',
        updated_at = NOW()
    WHERE status = 'Active'
      AND (last_seen_at IS NULL OR last_seen_at < (NOW() - INTERVAL '16 minutes'));
  $$
);

-- 4. Initial one-time sync: set status based on current last_seen_at
UPDATE public.ovitrap_devices
SET status = CASE 
  WHEN last_seen_at >= (NOW() - INTERVAL '16 minutes') THEN 'Active'
  ELSE 'Offline'
END,
updated_at = NOW();
