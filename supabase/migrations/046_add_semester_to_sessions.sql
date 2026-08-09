-- Migration 046: Add semester_id to registration_sessions

ALTER TABLE registration_sessions ADD COLUMN IF NOT EXISTS semester_id INTEGER REFERENCES semesters(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_reg_session_semester ON registration_sessions(semester_id);
