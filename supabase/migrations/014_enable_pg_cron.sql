-- Migration 014: Enable pg_cron and schedule cleanup jobs
-- Runs daily cleanup for expired temp files and daily notes

-- =====================================================
-- ENABLE PG_CRON EXTENSION
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;

-- =====================================================
-- SCHEDULE CLEANUP JOBS
-- =====================================================

-- Schedule temp uploads cleanup - runs daily at 3 AM UTC
SELECT cron.schedule(
  'cleanup-temp-uploads',
  '0 3 * * *',
  'SELECT cleanup_expired_temp_uploads();'
);

-- Schedule daily notes cleanup - runs daily at 3:15 AM UTC
SELECT cron.schedule(
  'cleanup-expired-daily-notes',
  '15 3 * * *',
  'SELECT cleanup_expired_daily_notes();'
);

-- =====================================================
-- VERIFY SCHEDULED JOBS
-- =====================================================

-- You can check scheduled jobs with:
-- SELECT * FROM cron.job;

-- You can check job run history with:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
