-- Fix: position column in internships was NOT NULL from original schema
-- but the redesigned form doesn't use it. Make it nullable.
ALTER TABLE internships ALTER COLUMN position DROP NOT NULL;
ALTER TABLE internships ALTER COLUMN position SET DEFAULT NULL;
