-- Migration 006: Student Approval Flow
-- Adds student_roster table and updates students table for approval workflow

-- =====================================================
-- STUDENT ROSTER TABLE
-- Pre-loaded list of valid students with roll numbers
-- =====================================================

CREATE TABLE IF NOT EXISTS student_roster (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roll_number VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  college_id INTEGER REFERENCES colleges(id) ON DELETE SET NULL,
  year_id INTEGER REFERENCES years(id) ON DELETE SET NULL,
  section_id INTEGER REFERENCES sections(id) ON DELETE SET NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  is_claimed BOOLEAN DEFAULT FALSE,
  claimed_by UUID REFERENCES students(id) ON DELETE SET NULL,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_roster_roll_number ON student_roster(roll_number);
CREATE INDEX IF NOT EXISTS idx_roster_college ON student_roster(college_id);
CREATE INDEX IF NOT EXISTS idx_roster_claimed ON student_roster(is_claimed);
CREATE INDEX IF NOT EXISTS idx_roster_name ON student_roster(name);

-- =====================================================
-- UPDATE STUDENTS TABLE
-- Add 'Pending' status option
-- =====================================================

-- Drop the existing check constraint and add new one with 'Pending'
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_status_check;
ALTER TABLE students ADD CONSTRAINT students_status_check
  CHECK (status IN ('Active', 'Blocked', 'Pending', 'Rejected'));

-- Add roster_id to link student with their roster entry
ALTER TABLE students ADD COLUMN IF NOT EXISTS roster_id UUID REFERENCES student_roster(id);

-- Add rejection reason for tracking
ALTER TABLE students ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add approved_by to track who approved the student
ALTER TABLE students ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES admins(id);
ALTER TABLE students ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- =====================================================
-- REGISTRATION SESSIONS TABLE
-- Track ongoing registration conversations
-- =====================================================

CREATE TABLE IF NOT EXISTS registration_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id BIGINT UNIQUE NOT NULL,
  telegram_username VARCHAR(255),
  telegram_first_name VARCHAR(255),
  telegram_last_name VARCHAR(255),
  step VARCHAR(50) DEFAULT 'awaiting_roll_number',
  roll_number VARCHAR(50),
  roster_id UUID REFERENCES student_roster(id),
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reg_session_telegram ON registration_sessions(telegram_user_id);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE student_roster ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_sessions ENABLE ROW LEVEL SECURITY;

-- Student Roster RLS
CREATE POLICY "roster_read_admin" ON student_roster FOR SELECT
  USING (auth.uid() IN (SELECT id FROM admins WHERE active = true));
CREATE POLICY "roster_write_admin" ON student_roster FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT id FROM admins WHERE active = true));
CREATE POLICY "roster_update_admin" ON student_roster FOR UPDATE
  USING (auth.uid() IN (SELECT id FROM admins WHERE active = true));
CREATE POLICY "roster_delete_admin" ON student_roster FOR DELETE
  USING (auth.uid() IN (SELECT id FROM admins WHERE active = true));

-- Registration Sessions RLS (service role only - used by bot)
CREATE POLICY "reg_session_service" ON registration_sessions FOR ALL
  USING (true) WITH CHECK (true);

-- =====================================================
-- FUNCTIONS FOR APPROVAL WORKFLOW
-- =====================================================

-- Function to approve a student
CREATE OR REPLACE FUNCTION approve_student(
  p_student_id UUID,
  p_admin_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_roster_id UUID;
BEGIN
  -- Get the roster_id from the student
  SELECT roster_id INTO v_roster_id FROM students WHERE id = p_student_id;

  -- Update student status
  UPDATE students
  SET status = 'Active',
      approved_by = p_admin_id,
      approved_at = NOW()
  WHERE id = p_student_id AND status = 'Pending';

  -- Mark roster entry as claimed
  IF v_roster_id IS NOT NULL THEN
    UPDATE student_roster
    SET is_claimed = TRUE,
        claimed_by = p_student_id,
        claimed_at = NOW()
    WHERE id = v_roster_id;
  END IF;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject a student
CREATE OR REPLACE FUNCTION reject_student(
  p_student_id UUID,
  p_admin_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_roster_id UUID;
BEGIN
  -- Get the roster_id from the student
  SELECT roster_id INTO v_roster_id FROM students WHERE id = p_student_id;

  -- Update student status
  UPDATE students
  SET status = 'Rejected',
      rejection_reason = p_reason,
      approved_by = p_admin_id,
      approved_at = NOW()
  WHERE id = p_student_id AND status = 'Pending';

  -- Unlink roster entry so it can be claimed again
  IF v_roster_id IS NOT NULL THEN
    UPDATE student_roster
    SET is_claimed = FALSE,
        claimed_by = NULL,
        claimed_at = NULL
    WHERE id = v_roster_id;
  END IF;

  -- Also unlink from student
  UPDATE students SET roster_id = NULL WHERE id = p_student_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ENABLE REALTIME
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE student_roster;
ALTER PUBLICATION supabase_realtime ADD TABLE registration_sessions;
