-- Migration 008: Societies Improvements
-- Adds icon and active columns to societies table

-- Add icon column for visual representation
ALTER TABLE societies ADD COLUMN IF NOT EXISTS icon VARCHAR(10) DEFAULT '🏢';

-- Add active column for visibility control
ALTER TABLE societies ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

-- Create index for active societies filter
CREATE INDEX IF NOT EXISTS idx_societies_active ON societies(active);

-- Update existing societies to have default values
UPDATE societies SET icon = '🏢' WHERE icon IS NULL;
UPDATE societies SET active = TRUE WHERE active IS NULL;
