-- Migration 020: Fix Admin RLS Policies
-- Ensures all admin roles have proper access to their scoped data

-- =====================================================
-- ENABLE RLS ON REFERENCE TABLES
-- =====================================================

ALTER TABLE colleges ENABLE ROW LEVEL SECURITY;
ALTER TABLE years ENABLE ROW LEVEL SECURITY;
ALTER TABLE semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE societies ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_types ENABLE ROW LEVEL SECURITY;

-- All active admins can read reference tables
CREATE POLICY "admins_read_colleges" ON colleges FOR SELECT
  USING (auth.uid() IN (SELECT id FROM admins WHERE active = true));

CREATE POLICY "admins_read_years" ON years FOR SELECT
  USING (auth.uid() IN (SELECT id FROM admins WHERE active = true));

CREATE POLICY "admins_read_semesters" ON semesters FOR SELECT
  USING (auth.uid() IN (SELECT id FROM admins WHERE active = true));

CREATE POLICY "admins_read_sections" ON sections FOR SELECT
  USING (auth.uid() IN (SELECT id FROM admins WHERE active = true));

CREATE POLICY "admins_read_societies" ON societies FOR SELECT
  USING (auth.uid() IN (SELECT id FROM admins WHERE active = true));

CREATE POLICY "admins_read_event_types" ON event_types FOR SELECT
  USING (auth.uid() IN (SELECT id FROM admins WHERE active = true));

-- =====================================================
-- FIX STUDENTS TABLE POLICIES
-- Add UPDATE policy for admins to approve/block students
-- =====================================================

CREATE POLICY "Admins can update students in scope"
ON students FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins a
    WHERE a.id = auth.uid() AND a.active = TRUE
    AND (
      a.role = 'SUPER_ADMIN' OR
      (a.role = 'COLLEGE_CONTENT_ADMIN' AND a.college_id = students.college_id) OR
      (a.role = 'SECTION_ADMIN' AND a.section_id = students.section_id)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins a
    WHERE a.id = auth.uid() AND a.active = TRUE
    AND (
      a.role = 'SUPER_ADMIN' OR
      (a.role = 'COLLEGE_CONTENT_ADMIN' AND a.college_id = students.college_id) OR
      (a.role = 'SECTION_ADMIN' AND a.section_id = students.section_id)
    )
  )
);

-- =====================================================
-- FIX BOT_BUTTONS POLICIES
-- Add UPDATE/INSERT/DELETE for super admins
-- =====================================================

DROP POLICY IF EXISTS "Super admins can modify bot buttons" ON bot_buttons;

CREATE POLICY "Super admins can insert bot buttons"
ON bot_buttons FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins
    WHERE id = auth.uid() AND role = 'SUPER_ADMIN' AND active = TRUE
  )
);

CREATE POLICY "Super admins can update bot buttons"
ON bot_buttons FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE id = auth.uid() AND role = 'SUPER_ADMIN' AND active = TRUE
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins
    WHERE id = auth.uid() AND role = 'SUPER_ADMIN' AND active = TRUE
  )
);

CREATE POLICY "Super admins can delete bot buttons"
ON bot_buttons FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE id = auth.uid() AND role = 'SUPER_ADMIN' AND active = TRUE
  )
);

-- =====================================================
-- FIX BOT_SETTINGS POLICIES
-- Add UPDATE for super admins
-- =====================================================

CREATE POLICY "Super admins can update bot settings"
ON bot_settings FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE id = auth.uid() AND role = 'SUPER_ADMIN' AND active = TRUE
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins
    WHERE id = auth.uid() AND role = 'SUPER_ADMIN' AND active = TRUE
  )
);

-- =====================================================
-- FIX COLLEGE_CONTENT_ADMIN EVENT ACCESS
-- Allow them to create/update events for their college
-- =====================================================

DROP POLICY IF EXISTS "Events admins can create events" ON events;
CREATE POLICY "Admins can create events"
ON events FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins a
    WHERE a.id = auth.uid() AND a.active = TRUE
    AND a.id = created_by
    AND (
      a.role = 'SUPER_ADMIN' OR
      a.role = 'EVENTS_ADMIN' OR
      a.role = 'SOCIETIES_ADMIN' OR
      (a.role = 'COLLEGE_CONTENT_ADMIN' AND a.college_id = events.college_id)
    )
  )
);

DROP POLICY IF EXISTS "Events admins can update events" ON events;
CREATE POLICY "Admins can update events"
ON events FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins a
    WHERE a.id = auth.uid() AND a.active = TRUE
    AND (
      a.role = 'SUPER_ADMIN' OR
      a.role = 'EVENTS_ADMIN' OR
      (a.role = 'COLLEGE_CONTENT_ADMIN' AND a.college_id = events.college_id) OR
      (created_by = auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Events admins can delete events" ON events;
CREATE POLICY "Admins can delete events"
ON events FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins a
    WHERE a.id = auth.uid() AND a.active = TRUE
    AND (
      a.role = 'SUPER_ADMIN' OR
      a.role = 'EVENTS_ADMIN' OR
      (a.role = 'COLLEGE_CONTENT_ADMIN' AND a.college_id = events.college_id) OR
      (created_by = auth.uid())
    )
  )
);

-- =====================================================
-- FIX STUDY_MATERIALS POLICIES
-- Allow COLLEGE_CONTENT_ADMIN to view/manage materials for their college
-- =====================================================

DROP POLICY IF EXISTS "Admins can view study materials in scope" ON study_materials;
CREATE POLICY "Admins can view study materials in scope"
ON study_materials FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins a
    WHERE a.id = auth.uid() AND a.active = TRUE
    AND (
      a.role = 'SUPER_ADMIN' OR
      a.role = 'STUDY_MATERIAL_ADMIN' OR
      (a.role = 'COLLEGE_CONTENT_ADMIN' AND a.college_id = study_materials.college_id) OR
      (a.role = 'SECTION_ADMIN' AND a.section_id = study_materials.section_id)
    )
  )
);

DROP POLICY IF EXISTS "Study material admins can create materials" ON study_materials;
CREATE POLICY "Admins can create study materials"
ON study_materials FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins a
    WHERE a.id = auth.uid() AND a.active = TRUE
    AND a.id = uploaded_by
    AND (
      a.role = 'SUPER_ADMIN' OR
      a.role = 'STUDY_MATERIAL_ADMIN' OR
      a.role = 'SECTION_ADMIN' OR
      (a.role = 'COLLEGE_CONTENT_ADMIN' AND a.college_id = study_materials.college_id)
    )
  )
);

-- =====================================================
-- FIX SCHEDULE_NOTES POLICIES
-- Allow COLLEGE_CONTENT_ADMIN to view schedule notes for their college
-- =====================================================

DROP POLICY IF EXISTS "Admins can view schedule notes in scope" ON schedule_notes;
CREATE POLICY "Admins can view schedule notes in scope"
ON schedule_notes FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins a
    WHERE a.id = auth.uid() AND a.active = TRUE
    AND (
      a.role = 'SUPER_ADMIN' OR
      a.role = 'SECTION_ADMIN' OR
      a.role = 'COLLEGE_CONTENT_ADMIN'
    )
  )
);

-- =====================================================
-- FIX BROADCASTS POLICIES
-- Super admin can view ALL broadcasts, not just their own
-- =====================================================

DROP POLICY IF EXISTS "Admins can view own broadcasts" ON broadcasts;
CREATE POLICY "Admins can view broadcasts"
ON broadcasts FOR SELECT
TO authenticated
USING (
  sent_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM admins a
    WHERE a.id = auth.uid() AND a.role = 'SUPER_ADMIN' AND a.active = TRUE
  )
);

-- =====================================================
-- SUPER ADMIN MANAGEMENT POLICIES FOR REFERENCE TABLES
-- Super admins can manage colleges, years, sections, etc.
-- =====================================================

CREATE POLICY "super_admin_manage_colleges" ON colleges FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "super_admin_manage_years" ON years FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "super_admin_manage_semesters" ON semesters FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "super_admin_manage_sections" ON sections FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "super_admin_manage_societies" ON societies FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "super_admin_manage_event_types" ON event_types FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());
