-- Fix section_id in student_roster based on section_name
-- The roster was populated with section_name (A, B, C, etc.) but section_id was left NULL
-- This migration updates section_id by looking up the section based on:
-- 1. section_name matches section.name
-- 2. The section belongs to a semester that belongs to the student's year

-- Step 1: Update section_id for all roster entries that have a section_name but no section_id
UPDATE student_roster sr
SET section_id = (
  SELECT s.id
  FROM sections s
  JOIN semesters sem ON s.semester_id = sem.id
  WHERE sem.year_id = sr.year_id
    AND s.name = sr.section_name
  LIMIT 1
)
WHERE sr.section_name IS NOT NULL
  AND sr.section_id IS NULL
  AND sr.year_id IS NOT NULL;

-- Step 2: Update students table for students who were registered from roster
-- and inherited NULL section_id (use the now-updated roster section_id)
UPDATE students st
SET section_id = sr.section_id
FROM student_roster sr
WHERE st.roster_id = sr.id
  AND st.section_id IS NULL
  AND sr.section_id IS NOT NULL;

-- Step 3: For students who have roster_id but roster section_name exists,
-- look up section directly using student's year_id and roster's section_name
UPDATE students st
SET section_id = (
  SELECT s.id
  FROM sections s
  JOIN semesters sem ON s.semester_id = sem.id
  WHERE sem.year_id = st.year_id
    AND s.name = sr.section_name
  LIMIT 1
)
FROM student_roster sr
WHERE st.roster_id = sr.id
  AND st.section_id IS NULL
  AND sr.section_name IS NOT NULL
  AND st.year_id IS NOT NULL;
