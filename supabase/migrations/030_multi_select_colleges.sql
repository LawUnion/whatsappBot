-- Migration 030: Replace single college_id with target_colleges array for Notices, Events, and Study Materials

-- 0. DROP POLICIES THAT DEPEND ON college_id
-- Notices
DROP POLICY IF EXISTS "Admins can view notices in scope" ON notices;
DROP POLICY IF EXISTS "Notices admins can create notices" ON notices;
DROP POLICY IF EXISTS "Notices admins can update notices" ON notices;
DROP POLICY IF EXISTS "Notices admins can delete notices" ON notices;

-- Events
DROP POLICY IF EXISTS "Admins can view events in scope" ON events;
DROP POLICY IF EXISTS "Events admins can create events" ON events;
DROP POLICY IF EXISTS "Admins can create events" ON events;
DROP POLICY IF EXISTS "Events admins can update events" ON events;
DROP POLICY IF EXISTS "Admins can update events" ON events;
DROP POLICY IF EXISTS "Events admins can delete events" ON events;
DROP POLICY IF EXISTS "Admins can delete events" ON events;

-- Study Materials
DROP POLICY IF EXISTS "Admins can view study materials in scope" ON study_materials;
DROP POLICY IF EXISTS "Study material admins can create materials" ON study_materials;
DROP POLICY IF EXISTS "Admins can create study materials" ON study_materials;
DROP POLICY IF EXISTS "Study material admins can update materials" ON study_materials;
DROP POLICY IF EXISTS "Study material admins can delete materials" ON study_materials;

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
ALTER TABLE study_materials ADD COLUMN IF NOT EXISTS target_colleges INTEGER[];

-- Migrate existing college_id to target_colleges
UPDATE study_materials SET target_colleges = ARRAY[college_id] WHERE college_id IS NOT NULL AND (target_colleges IS NULL OR array_length(target_colleges, 1) = 0);

-- Drop college_id
ALTER TABLE study_materials DROP COLUMN IF EXISTS college_id;

-- 4. Recreate Indexes
CREATE INDEX IF NOT EXISTS idx_notices_target_colleges ON notices USING GIN(target_colleges);
CREATE INDEX IF NOT EXISTS idx_events_target_colleges ON events USING GIN(target_colleges);
CREATE INDEX IF NOT EXISTS idx_study_materials_target_colleges ON study_materials USING GIN(target_colleges);


-- 5. RECREATE POLICIES USING target_colleges

-- NOTICES POLICIES
CREATE POLICY "Admins can view notices in scope" ON notices FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM admins a WHERE a.id = auth.uid() AND a.active = TRUE AND (
      a.role = 'SUPER_ADMIN' OR a.role = 'NOTICES_ADMIN' OR
      (a.role = 'COLLEGE_CONTENT_ADMIN' AND a.college_id = ANY(notices.target_colleges)) OR
      (a.role = 'SECTION_ADMIN' AND a.section_id = notices.section_id)
    )
  )
);
CREATE POLICY "Notices admins can create notices" ON notices FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins a WHERE a.id = auth.uid() AND a.active = TRUE AND a.id = posted_by AND (
      a.role = 'SUPER_ADMIN' OR a.role = 'NOTICES_ADMIN' OR
      (a.role = 'COLLEGE_CONTENT_ADMIN' AND a.college_id = ANY(notices.target_colleges))
    )
  )
);
CREATE POLICY "Notices admins can update notices" ON notices FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM admins a WHERE a.id = auth.uid() AND a.active = TRUE AND (
      a.role = 'SUPER_ADMIN' OR a.role = 'NOTICES_ADMIN' OR (posted_by = auth.uid()) OR
      (a.role = 'COLLEGE_CONTENT_ADMIN' AND a.college_id = ANY(notices.target_colleges))
    )
  )
);
CREATE POLICY "Notices admins can delete notices" ON notices FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM admins a WHERE a.id = auth.uid() AND a.active = TRUE AND (
      a.role = 'SUPER_ADMIN' OR a.role = 'NOTICES_ADMIN' OR (posted_by = auth.uid()) OR
      (a.role = 'COLLEGE_CONTENT_ADMIN' AND a.college_id = ANY(notices.target_colleges))
    )
  )
);

-- EVENTS POLICIES
CREATE POLICY "Admins can view events in scope" ON events FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM admins a WHERE a.id = auth.uid() AND a.active = TRUE AND (
      a.role = 'SUPER_ADMIN' OR a.role = 'EVENTS_ADMIN' OR
      (a.role = 'SOCIETIES_ADMIN' AND a.society_id = events.society_id) OR
      (a.role = 'COLLEGE_CONTENT_ADMIN' AND a.college_id = ANY(events.target_colleges))
    )
  )
);
CREATE POLICY "Admins can create events" ON events FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins a WHERE a.id = auth.uid() AND a.active = TRUE AND a.id = created_by AND (
      a.role = 'SUPER_ADMIN' OR a.role = 'EVENTS_ADMIN' OR a.role = 'SOCIETIES_ADMIN' OR
      (a.role = 'COLLEGE_CONTENT_ADMIN' AND a.college_id = ANY(events.target_colleges))
    )
  )
);
CREATE POLICY "Admins can update events" ON events FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM admins a WHERE a.id = auth.uid() AND a.active = TRUE AND (
      a.role = 'SUPER_ADMIN' OR a.role = 'EVENTS_ADMIN' OR (created_by = auth.uid()) OR
      (a.role = 'COLLEGE_CONTENT_ADMIN' AND a.college_id = ANY(events.target_colleges))
    )
  )
);
CREATE POLICY "Admins can delete events" ON events FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM admins a WHERE a.id = auth.uid() AND a.active = TRUE AND (
      a.role = 'SUPER_ADMIN' OR a.role = 'EVENTS_ADMIN' OR (created_by = auth.uid()) OR
      (a.role = 'COLLEGE_CONTENT_ADMIN' AND a.college_id = ANY(events.target_colleges))
    )
  )
);

-- STUDY MATERIALS POLICIES
CREATE POLICY "Admins can view study materials in scope" ON study_materials FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM admins a WHERE a.id = auth.uid() AND a.active = TRUE AND (
      a.role = 'SUPER_ADMIN' OR a.role = 'STUDY_MATERIAL_ADMIN' OR
      (a.role = 'COLLEGE_CONTENT_ADMIN' AND a.college_id = ANY(study_materials.target_colleges)) OR
      (a.role = 'SECTION_ADMIN' AND a.section_id = study_materials.section_id)
    )
  )
);
CREATE POLICY "Admins can create study materials" ON study_materials FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins a WHERE a.id = auth.uid() AND a.active = TRUE AND a.id = uploaded_by AND (
      a.role = 'SUPER_ADMIN' OR a.role = 'STUDY_MATERIAL_ADMIN' OR a.role = 'SECTION_ADMIN' OR
      (a.role = 'COLLEGE_CONTENT_ADMIN' AND a.college_id = ANY(study_materials.target_colleges))
    )
  )
);
CREATE POLICY "Study material admins can update materials" ON study_materials FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM admins a WHERE a.id = auth.uid() AND a.active = TRUE AND (
      a.role = 'SUPER_ADMIN' OR a.role = 'STUDY_MATERIAL_ADMIN' OR (uploaded_by = auth.uid()) OR
      (a.role = 'COLLEGE_CONTENT_ADMIN' AND a.college_id = ANY(study_materials.target_colleges))
    )
  )
);
CREATE POLICY "Study material admins can delete materials" ON study_materials FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM admins a WHERE a.id = auth.uid() AND a.active = TRUE AND (
      a.role = 'SUPER_ADMIN' OR a.role = 'STUDY_MATERIAL_ADMIN' OR (uploaded_by = auth.uid()) OR
      (a.role = 'COLLEGE_CONTENT_ADMIN' AND a.college_id = ANY(study_materials.target_colleges))
    )
  )
);
