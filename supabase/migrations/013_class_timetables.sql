-- Migration 009: Class Timetables
-- Separate table for section-wise semester timetables (updated every 6 months)

-- =====================================================
-- CLASS TIMETABLES TABLE
-- One timetable PDF per section per semester
-- =====================================================

CREATE TABLE IF NOT EXISTS class_timetables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id INTEGER NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  semester_id INTEGER NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
  title VARCHAR(255),
  file_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES admins(id),
  academic_year VARCHAR(20), -- e.g., "2024-25"
  effective_from DATE,
  notes TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Only one active timetable per section per semester
  UNIQUE(section_id, semester_id, active)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_timetables_section ON class_timetables(section_id);
CREATE INDEX IF NOT EXISTS idx_timetables_semester ON class_timetables(semester_id);
CREATE INDEX IF NOT EXISTS idx_timetables_active ON class_timetables(active);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE class_timetables ENABLE ROW LEVEL SECURITY;

-- Admins can read all timetables
CREATE POLICY "timetables_read_admin" ON class_timetables FOR SELECT
  USING (auth.uid() IN (SELECT id FROM admins WHERE active = true));

-- Admins can insert timetables
CREATE POLICY "timetables_insert_admin" ON class_timetables FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT id FROM admins WHERE active = true));

-- Admins can update timetables
CREATE POLICY "timetables_update_admin" ON class_timetables FOR UPDATE
  USING (auth.uid() IN (SELECT id FROM admins WHERE active = true));

-- Admins can delete timetables
CREATE POLICY "timetables_delete_admin" ON class_timetables FOR DELETE
  USING (auth.uid() IN (SELECT id FROM admins WHERE active = true));

-- =====================================================
-- UPDATE SCHEDULE_NOTES TABLE
-- Add expiry tracking for daily notes
-- =====================================================

-- Add expires_at column for auto-cleanup tracking
ALTER TABLE schedule_notes ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Set default expiry to 3 days from creation for new entries
-- (This will be set by the application on insert)

-- Create index for expiry cleanup
CREATE INDEX IF NOT EXISTS idx_schedule_notes_expires ON schedule_notes(expires_at);

-- =====================================================
-- FUNCTION: Cleanup expired daily notes
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_expired_daily_notes()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Delete notes where expires_at has passed
  DELETE FROM schedule_notes
  WHERE expires_at IS NOT NULL AND expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- REALTIME
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE class_timetables;
