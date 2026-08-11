-- Add roll_number to registration_sessions
ALTER TABLE registration_sessions ADD COLUMN IF NOT EXISTS roll_number VARCHAR(50);
