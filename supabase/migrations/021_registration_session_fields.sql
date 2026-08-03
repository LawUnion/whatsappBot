-- Migration 021: Add fields for line-by-line registration flow
-- Adds columns to registration_sessions table to support manual registration
-- when roll number is not found in roster

-- =====================================================
-- UPDATE REGISTRATION_SESSIONS TABLE
-- Add columns for storing line-by-line registration data
-- =====================================================

-- Name entered manually by user
ALTER TABLE registration_sessions ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- College selected by user (for manual registration)
ALTER TABLE registration_sessions ADD COLUMN IF NOT EXISTS college_id INTEGER REFERENCES colleges(id) ON DELETE SET NULL;

-- Year selected by user (for manual registration)
ALTER TABLE registration_sessions ADD COLUMN IF NOT EXISTS year_id INTEGER REFERENCES years(id) ON DELETE SET NULL;

-- Section selected by user (for manual registration)
ALTER TABLE registration_sessions ADD COLUMN IF NOT EXISTS section_id INTEGER REFERENCES sections(id) ON DELETE SET NULL;

-- Indexes for lookups
CREATE INDEX IF NOT EXISTS idx_reg_session_college ON registration_sessions(college_id);
CREATE INDEX IF NOT EXISTS idx_reg_session_year ON registration_sessions(year_id);
CREATE INDEX IF NOT EXISTS idx_reg_session_section ON registration_sessions(section_id);
