-- Add contextual fields to students and student_roster tables

-- Add fields to student_roster
ALTER TABLE student_roster ADD COLUMN IF NOT EXISTS father_name VARCHAR(255);
ALTER TABLE student_roster ADD COLUMN IF NOT EXISTS college_code VARCHAR(50);
ALTER TABLE student_roster ADD COLUMN IF NOT EXISTS admission_batch VARCHAR(50);

-- Add fields to students
ALTER TABLE students ADD COLUMN IF NOT EXISTS father_name VARCHAR(255);
ALTER TABLE students ADD COLUMN IF NOT EXISTS college_code VARCHAR(50);
ALTER TABLE students ADD COLUMN IF NOT EXISTS admission_batch VARCHAR(50);

-- Create indexes for the new context fields for fast lookups
CREATE INDEX IF NOT EXISTS idx_roster_college_code ON student_roster(college_code);
CREATE INDEX IF NOT EXISTS idx_roster_admission_batch ON student_roster(admission_batch);
CREATE INDEX IF NOT EXISTS idx_students_college_code ON students(college_code);
CREATE INDEX IF NOT EXISTS idx_students_admission_batch ON students(admission_batch);
