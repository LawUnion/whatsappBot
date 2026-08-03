-- Migration 006: Add DELETE and UPDATE policies
-- Missing policies for full CRUD operations

-- =====================================================
-- STUDY MATERIALS DELETE POLICY
-- =====================================================

CREATE POLICY "Study material admins can delete materials"
ON study_materials FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins a
    WHERE a.id = auth.uid() AND a.active = TRUE
    AND (
      a.role = 'SUPER_ADMIN' OR 
      a.role = 'STUDY_MATERIAL_ADMIN' OR 
      (a.role = 'SECTION_ADMIN' AND a.section_id = study_materials.section_id) OR
      (uploaded_by = auth.uid())
    )
  )
);

CREATE POLICY "Study material admins can update materials"
ON study_materials FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins a
    WHERE a.id = auth.uid() AND a.active = TRUE
    AND (
      a.role = 'SUPER_ADMIN' OR 
      a.role = 'STUDY_MATERIAL_ADMIN' OR 
      (uploaded_by = auth.uid())
    )
  )
);

-- =====================================================
-- NOTICES DELETE POLICY
-- =====================================================

CREATE POLICY "Notices admins can delete notices"
ON notices FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins a
    WHERE a.id = auth.uid() AND a.active = TRUE
    AND (
      a.role = 'SUPER_ADMIN' OR 
      a.role = 'NOTICES_ADMIN' OR 
      (posted_by = auth.uid())
    )
  )
);

CREATE POLICY "Notices admins can update notices"
ON notices FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins a
    WHERE a.id = auth.uid() AND a.active = TRUE
    AND (
      a.role = 'SUPER_ADMIN' OR 
      a.role = 'NOTICES_ADMIN' OR 
      (posted_by = auth.uid())
    )
  )
);

-- =====================================================
-- EVENTS DELETE POLICY
-- =====================================================

CREATE POLICY "Events admins can delete events"
ON events FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins a
    WHERE a.id = auth.uid() AND a.active = TRUE
    AND (
      a.role = 'SUPER_ADMIN' OR 
      a.role = 'EVENTS_ADMIN' OR 
      (created_by = auth.uid())
    )
  )
);

CREATE POLICY "Events admins can update events"
ON events FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins a
    WHERE a.id = auth.uid() AND a.active = TRUE
    AND (
      a.role = 'SUPER_ADMIN' OR 
      a.role = 'EVENTS_ADMIN' OR 
      (created_by = auth.uid())
    )
  )
);

-- =====================================================
-- INTERNSHIPS DELETE POLICY
-- =====================================================

CREATE POLICY "Internship admins can delete internships"
ON internships FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins a
    WHERE a.id = auth.uid() AND a.active = TRUE
    AND (
      a.role = 'SUPER_ADMIN' OR 
      a.role = 'INTERNSHIP_ADMIN' OR 
      (created_by = auth.uid())
    )
  )
);

CREATE POLICY "Internship admins can update internships"
ON internships FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins a
    WHERE a.id = auth.uid() AND a.active = TRUE
    AND (
      a.role = 'SUPER_ADMIN' OR 
      a.role = 'INTERNSHIP_ADMIN' OR 
      (created_by = auth.uid())
    )
  )
);

-- =====================================================
-- SCHEDULE NOTES DELETE POLICY
-- =====================================================

CREATE POLICY "Section admins can delete schedule notes"
ON schedule_notes FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins a
    WHERE a.id = auth.uid() AND a.active = TRUE
    AND (
      a.role = 'SUPER_ADMIN' OR 
      (a.role = 'SECTION_ADMIN' AND a.section_id = schedule_notes.section_id) OR
      (posted_by = auth.uid())
    )
  )
);

CREATE POLICY "Section admins can update schedule notes"
ON schedule_notes FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins a
    WHERE a.id = auth.uid() AND a.active = TRUE
    AND (
      a.role = 'SUPER_ADMIN' OR 
      (a.role = 'SECTION_ADMIN' AND a.section_id = schedule_notes.section_id) OR
      (posted_by = auth.uid())
    )
  )
);

-- =====================================================
-- BROADCASTS DELETE POLICY
-- =====================================================

CREATE POLICY "Admins can delete own broadcasts"
ON broadcasts FOR DELETE
TO authenticated
USING (
  sent_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM admins a
    WHERE a.id = auth.uid() AND a.role = 'SUPER_ADMIN' AND a.active = TRUE
  )
);

-- =====================================================
-- SOCIETY POSTS DELETE POLICY (from migration 005)
-- =====================================================

CREATE POLICY "society_posts_update_admin" ON society_posts FOR UPDATE 
  USING (auth.uid() IN (SELECT id FROM admins WHERE active = true));
