-- Migration 045: Make roll_number optional in student_roster and make form_number unique
ALTER TABLE student_roster ALTER COLUMN roll_number DROP NOT NULL;
ALTER TABLE student_roster DROP CONSTRAINT IF EXISTS student_roster_form_number_key;
ALTER TABLE student_roster ADD CONSTRAINT student_roster_form_number_key UNIQUE (form_number);
