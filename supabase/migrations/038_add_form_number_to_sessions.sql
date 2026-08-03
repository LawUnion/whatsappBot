-- Add form_number to registration_sessions
ALTER TABLE registration_sessions ADD COLUMN IF NOT EXISTS form_number VARCHAR(50);
