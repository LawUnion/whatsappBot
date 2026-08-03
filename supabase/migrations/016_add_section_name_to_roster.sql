-- Add section_name column to student_roster for storing section letter without FK
-- This allows us to store section info (A, B, C, etc.) without requiring semester-specific section_id

ALTER TABLE student_roster ADD COLUMN IF NOT EXISTS section_name VARCHAR(5);

-- Create index for section_name lookups
CREATE INDEX IF NOT EXISTS idx_roster_section_name ON student_roster(section_name);
