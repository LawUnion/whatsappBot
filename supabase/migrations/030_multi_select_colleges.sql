-- Migration 030: Replace single college_id with target_colleges array for Notices, Events, and Study Materials

-- 1. NOTICES
ALTER TABLE notices ADD COLUMN IF NOT EXISTS target_colleges INTEGER[];

-- Migrate existing college_id to target_colleges
UPDATE notices SET target_colleges = ARRAY[college_id] WHERE college_id IS NOT NULL;

-- Drop college_id
ALTER TABLE notices DROP COLUMN IF EXISTS college_id;


-- 2. EVENTS
ALTER TABLE events ADD COLUMN IF NOT EXISTS target_colleges INTEGER[];

-- Migrate existing college_id to target_colleges
UPDATE events SET target_colleges = ARRAY[college_id] WHERE college_id IS NOT NULL;

-- Drop college_id
ALTER TABLE events DROP COLUMN IF EXISTS college_id;


-- 3. STUDY MATERIALS
-- Note: study_materials may already have target_colleges added in migration 26, but just to be sure
ALTER TABLE study_materials ADD COLUMN IF NOT EXISTS target_colleges INTEGER[];

-- Migrate existing college_id to target_colleges
UPDATE study_materials SET target_colleges = ARRAY[college_id] WHERE college_id IS NOT NULL AND (target_colleges IS NULL OR array_length(target_colleges, 1) = 0);

-- Drop college_id
ALTER TABLE study_materials DROP COLUMN IF EXISTS college_id;

-- 4. Recreate Indexes (Optional but good practice)
-- Postgres uses GIN index for arrays
CREATE INDEX IF NOT EXISTS idx_notices_target_colleges ON notices USING GIN(target_colleges);
CREATE INDEX IF NOT EXISTS idx_events_target_colleges ON events USING GIN(target_colleges);
CREATE INDEX IF NOT EXISTS idx_study_materials_target_colleges ON study_materials USING GIN(target_colleges);
