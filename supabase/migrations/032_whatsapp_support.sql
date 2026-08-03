-- Migration 032: Add WhatsApp Cloud API Support
-- Makes telegram_user_id nullable and adds whatsapp_id across relevant tables
-- Adds WhatsApp bot configuration columns to bot_settings

-- =====================================================
-- 1. UPDATE STUDENTS TABLE
-- =====================================================

ALTER TABLE students ALTER COLUMN telegram_user_id DROP NOT NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS whatsapp_id VARCHAR(50) UNIQUE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS whatsapp_name VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_students_whatsapp ON students(whatsapp_id);

-- Ensure either telegram_user_id or whatsapp_id is present
ALTER TABLE students ADD CONSTRAINT chk_student_platform_id 
  CHECK (telegram_user_id IS NOT NULL OR whatsapp_id IS NOT NULL);

-- =====================================================
-- 2. UPDATE REGISTRATION_SESSIONS TABLE
-- =====================================================

ALTER TABLE registration_sessions ALTER COLUMN telegram_user_id DROP NOT NULL;
ALTER TABLE registration_sessions ADD COLUMN IF NOT EXISTS whatsapp_id VARCHAR(50) UNIQUE;
ALTER TABLE registration_sessions ADD COLUMN IF NOT EXISTS platform VARCHAR(20) DEFAULT 'telegram' CHECK (platform IN ('telegram', 'whatsapp'));

CREATE INDEX IF NOT EXISTS idx_reg_session_whatsapp ON registration_sessions(whatsapp_id);

ALTER TABLE registration_sessions ADD CONSTRAINT chk_session_platform_id 
  CHECK (telegram_user_id IS NOT NULL OR whatsapp_id IS NOT NULL);

-- =====================================================
-- 3. UPDATE ACCOMMODATION_REQUESTS TABLE
-- =====================================================

ALTER TABLE accommodation_requests ALTER COLUMN telegram_user_id DROP NOT NULL;
ALTER TABLE accommodation_requests ADD COLUMN IF NOT EXISTS whatsapp_id VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_accommodation_whatsapp ON accommodation_requests(whatsapp_id);

-- =====================================================
-- 4. UPDATE BOT_SETTINGS TABLE
-- =====================================================

ALTER TABLE bot_settings ADD COLUMN IF NOT EXISTS whatsapp_phone_number_id TEXT;
ALTER TABLE bot_settings ADD COLUMN IF NOT EXISTS whatsapp_access_token TEXT;
ALTER TABLE bot_settings ADD COLUMN IF NOT EXISTS whatsapp_verify_token TEXT;
ALTER TABLE bot_settings ADD COLUMN IF NOT EXISTS whatsapp_webhook_url TEXT;
ALTER TABLE bot_settings ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN DEFAULT FALSE;
