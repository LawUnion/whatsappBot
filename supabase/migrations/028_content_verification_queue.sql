-- Migration 028: Content Verification Queue
-- All admin-posted content goes through super admin approval before students see it
-- Super admin's own posts are auto-approved
-- Existing content defaults to 'approved' so nothing breaks

-- Add approval_status to notices
ALTER TABLE notices ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'approved';
CREATE INDEX IF NOT EXISTS idx_notices_approval ON notices(approval_status);

-- Add approval_status to events
ALTER TABLE events ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'approved';
CREATE INDEX IF NOT EXISTS idx_events_approval ON events(approval_status);

-- Add approval_status to internships
ALTER TABLE internships ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'approved';
CREATE INDEX IF NOT EXISTS idx_internships_approval ON internships(approval_status);

-- Add approval_status to study_materials
ALTER TABLE study_materials ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'approved';
CREATE INDEX IF NOT EXISTS idx_study_materials_approval ON study_materials(approval_status);

-- Add approval_status to society_posts
ALTER TABLE society_posts ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'approved';
CREATE INDEX IF NOT EXISTS idx_society_posts_approval ON society_posts(approval_status);
