-- Migration 052: Fix section_name column length in student_roster
-- Was VARCHAR(5) which is too short for section names
ALTER TABLE student_roster ALTER COLUMN section_name TYPE VARCHAR(100);
