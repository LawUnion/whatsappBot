-- Migration 048: Add semester_id to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS semester_id INTEGER REFERENCES semesters(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_students_semester ON students(semester_id);
