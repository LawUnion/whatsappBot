-- Migration 050: Admin Allocation Refactor
-- Adds SUB_ADMIN role and allocated_modules array to admins table

-- 1. Drop existing role check constraint
ALTER TABLE admins DROP CONSTRAINT IF EXISTS admins_role_check;

-- 2. Add the new constraint with SUB_ADMIN
ALTER TABLE admins ADD CONSTRAINT admins_role_check CHECK (role IN (
    'SUPER_ADMIN',
    'COLLEGE_CONTENT_ADMIN',
    'NOTICES_ADMIN',
    'SOCIETIES_ADMIN',
    'SECTION_ADMIN',
    'STUDY_MATERIAL_ADMIN',
    'EVENTS_ADMIN',
    'INTERNSHIP_ADMIN',
    'SUB_ADMIN'
));

-- 3. Add allocated_modules column
ALTER TABLE admins ADD COLUMN IF NOT EXISTS allocated_modules TEXT[] DEFAULT '{}';

-- 4. Migrate existing sub-admins to SUB_ADMIN role and populate their allocated_modules
UPDATE admins 
SET allocated_modules = ARRAY['notices'], role = 'SUB_ADMIN' 
WHERE role = 'NOTICES_ADMIN';

UPDATE admins 
SET allocated_modules = ARRAY['events'], role = 'SUB_ADMIN' 
WHERE role = 'EVENTS_ADMIN';

UPDATE admins 
SET allocated_modules = ARRAY['societies'], role = 'SUB_ADMIN' 
WHERE role = 'SOCIETIES_ADMIN';

UPDATE admins 
SET allocated_modules = ARRAY['study_materials'], role = 'SUB_ADMIN' 
WHERE role = 'STUDY_MATERIAL_ADMIN';

UPDATE admins 
SET allocated_modules = ARRAY['internships'], role = 'SUB_ADMIN' 
WHERE role = 'INTERNSHIP_ADMIN';

UPDATE admins 
SET allocated_modules = ARRAY['class_schedule', 'study_materials'], role = 'SUB_ADMIN' 
WHERE role = 'SECTION_ADMIN';

UPDATE admins 
SET allocated_modules = ARRAY['notices', 'events', 'internships'], role = 'SUB_ADMIN' 
WHERE role = 'COLLEGE_CONTENT_ADMIN';

