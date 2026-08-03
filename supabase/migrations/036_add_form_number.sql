-- Add form_number to students and student_roster

-- 1. Add form_number to student_roster
ALTER TABLE student_roster ADD COLUMN IF NOT EXISTS form_number VARCHAR(50);
CREATE INDEX IF NOT EXISTS idx_roster_form_number ON student_roster(form_number);

-- Ensure form_number is unique
-- Since existing rows have null form_number, we can't immediately add a unique constraint if there are multiple nulls
-- but we will populate it in the next migration, then add the unique constraint.

-- 2. Add form_number to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS form_number VARCHAR(50);
CREATE INDEX IF NOT EXISTS idx_students_form_number ON students(form_number);
