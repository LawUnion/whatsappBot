-- Migration 051: Update RLS policies to support SUB_ADMIN role
-- SUB_ADMIN role replaces old specific roles; access is controlled via allocated_modules array

-- =====================
-- EVENTS
-- =====================
DROP POLICY IF EXISTS "Admins can view events in scope" ON events;
DROP POLICY IF EXISTS "Admins can create events" ON events;
DROP POLICY IF EXISTS "Admins can update events" ON events;
DROP POLICY IF EXISTS "Admins can delete events" ON events;

CREATE POLICY "Admins can view events in scope" ON events FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM admins a WHERE a.id = auth.uid() AND a.active = TRUE AND (
      a.role = 'SUPER_ADMIN' OR
      a.role = 'EVENTS_ADMIN' OR
      (a.role = 'SUB_ADMIN' AND 'events' = ANY(a.allocated_modules)) OR
      (a.role = 'SOCIETIES_ADMIN') OR
      (a.role = 'COLLEGE_CONTENT_ADMIN')
    )
  )
);
CREATE POLICY "Admins can create events" ON events FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins a WHERE a.id = auth.uid() AND a.active = TRUE AND a.id = created_by AND (
      a.role = 'SUPER_ADMIN' OR a.role = 'EVENTS_ADMIN' OR a.role = 'SOCIETIES_ADMIN' OR a.role = 'COLLEGE_CONTENT_ADMIN' OR
      (a.role = 'SUB_ADMIN' AND 'events' = ANY(a.allocated_modules))
    )
  )
);
CREATE POLICY "Admins can update events" ON events FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM admins a WHERE a.id = auth.uid() AND a.active = TRUE AND (
      a.role = 'SUPER_ADMIN' OR a.role = 'EVENTS_ADMIN' OR (created_by = auth.uid()) OR a.role = 'COLLEGE_CONTENT_ADMIN' OR
      (a.role = 'SUB_ADMIN' AND 'events' = ANY(a.allocated_modules))
    )
  )
);
CREATE POLICY "Admins can delete events" ON events FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM admins a WHERE a.id = auth.uid() AND a.active = TRUE AND (
      a.role = 'SUPER_ADMIN' OR a.role = 'EVENTS_ADMIN' OR (created_by = auth.uid()) OR a.role = 'COLLEGE_CONTENT_ADMIN' OR
      (a.role = 'SUB_ADMIN' AND 'events' = ANY(a.allocated_modules))
    )
  )
);

-- =====================
-- NOTICES
-- =====================
DROP POLICY IF EXISTS "Admins can view notices in scope" ON notices;
DROP POLICY IF EXISTS "Admins can create notices" ON notices;
DROP POLICY IF EXISTS "Admins can update notices" ON notices;
DROP POLICY IF EXISTS "Admins can delete notices" ON notices;

CREATE POLICY "Admins can view notices in scope" ON notices FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM admins a WHERE a.id = auth.uid() AND a.active = TRUE AND (
      a.role = 'SUPER_ADMIN' OR a.role = 'NOTICES_ADMIN' OR a.role = 'COLLEGE_CONTENT_ADMIN' OR
      (a.role = 'SUB_ADMIN' AND 'notices' = ANY(a.allocated_modules))
    )
  )
);
CREATE POLICY "Admins can create notices" ON notices FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins a WHERE a.id = auth.uid() AND a.active = TRUE AND (
      a.role = 'SUPER_ADMIN' OR a.role = 'NOTICES_ADMIN' OR a.role = 'COLLEGE_CONTENT_ADMIN' OR
      (a.role = 'SUB_ADMIN' AND 'notices' = ANY(a.allocated_modules))
    )
  )
);
CREATE POLICY "Admins can update notices" ON notices FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM admins a WHERE a.id = auth.uid() AND a.active = TRUE AND (
      a.role = 'SUPER_ADMIN' OR a.role = 'NOTICES_ADMIN' OR a.role = 'COLLEGE_CONTENT_ADMIN' OR
      (a.role = 'SUB_ADMIN' AND 'notices' = ANY(a.allocated_modules))
    )
  )
);
CREATE POLICY "Admins can delete notices" ON notices FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM admins a WHERE a.id = auth.uid() AND a.active = TRUE AND (
      a.role = 'SUPER_ADMIN' OR a.role = 'NOTICES_ADMIN' OR a.role = 'COLLEGE_CONTENT_ADMIN' OR
      (a.role = 'SUB_ADMIN' AND 'notices' = ANY(a.allocated_modules))
    )
  )
);

-- =====================
-- STUDY MATERIALS
-- =====================
DROP POLICY IF EXISTS "Admins can view study materials in scope" ON study_materials;
DROP POLICY IF EXISTS "Admins can create study materials" ON study_materials;
DROP POLICY IF EXISTS "Study material admins can update materials" ON study_materials;
DROP POLICY IF EXISTS "Admins can delete study materials" ON study_materials;

CREATE POLICY "Admins can view study materials in scope" ON study_materials FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM admins a WHERE a.id = auth.uid() AND a.active = TRUE AND (
      a.role = 'SUPER_ADMIN' OR a.role = 'STUDY_MATERIAL_ADMIN' OR a.role = 'SECTION_ADMIN' OR a.role = 'COLLEGE_CONTENT_ADMIN' OR
      (a.role = 'SUB_ADMIN' AND 'study_materials' = ANY(a.allocated_modules))
    )
  )
);
CREATE POLICY "Admins can create study materials" ON study_materials FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins a WHERE a.id = auth.uid() AND a.active = TRUE AND (
      a.role = 'SUPER_ADMIN' OR a.role = 'STUDY_MATERIAL_ADMIN' OR a.role = 'SECTION_ADMIN' OR a.role = 'COLLEGE_CONTENT_ADMIN' OR
      (a.role = 'SUB_ADMIN' AND 'study_materials' = ANY(a.allocated_modules))
    )
  )
);
CREATE POLICY "Study material admins can update materials" ON study_materials FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM admins a WHERE a.id = auth.uid() AND a.active = TRUE AND (
      a.role = 'SUPER_ADMIN' OR a.role = 'STUDY_MATERIAL_ADMIN' OR (uploaded_by = auth.uid()) OR a.role = 'SECTION_ADMIN' OR a.role = 'COLLEGE_CONTENT_ADMIN' OR
      (a.role = 'SUB_ADMIN' AND 'study_materials' = ANY(a.allocated_modules))
    )
  )
);
CREATE POLICY "Admins can delete study materials" ON study_materials FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM admins a WHERE a.id = auth.uid() AND a.active = TRUE AND (
      a.role = 'SUPER_ADMIN' OR a.role = 'STUDY_MATERIAL_ADMIN' OR (uploaded_by = auth.uid()) OR a.role = 'COLLEGE_CONTENT_ADMIN' OR
      (a.role = 'SUB_ADMIN' AND 'study_materials' = ANY(a.allocated_modules))
    )
  )
);

-- =====================
-- SOCIETIES
-- =====================
DROP POLICY IF EXISTS "Admins can view societies" ON societies;
DROP POLICY IF EXISTS "Admins can manage societies" ON societies;

CREATE POLICY "Admins can view societies" ON societies FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM admins a WHERE a.id = auth.uid() AND a.active = TRUE AND (
      a.role = 'SUPER_ADMIN' OR a.role = 'SOCIETIES_ADMIN' OR a.role = 'COLLEGE_CONTENT_ADMIN' OR
      (a.role = 'SUB_ADMIN' AND 'societies' = ANY(a.allocated_modules))
    )
  )
);
CREATE POLICY "Admins can manage societies" ON societies FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM admins a WHERE a.id = auth.uid() AND a.active = TRUE AND (
      a.role = 'SUPER_ADMIN' OR a.role = 'SOCIETIES_ADMIN' OR a.role = 'COLLEGE_CONTENT_ADMIN' OR
      (a.role = 'SUB_ADMIN' AND 'societies' = ANY(a.allocated_modules))
    )
  )
);

-- =====================
-- INTERNSHIPS
-- =====================
DROP POLICY IF EXISTS "Admins can view internships" ON internships;
DROP POLICY IF EXISTS "Admins can manage internships" ON internships;

CREATE POLICY "Admins can view internships" ON internships FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM admins a WHERE a.id = auth.uid() AND a.active = TRUE AND (
      a.role = 'SUPER_ADMIN' OR a.role = 'INTERNSHIP_ADMIN' OR a.role = 'COLLEGE_CONTENT_ADMIN' OR
      (a.role = 'SUB_ADMIN' AND 'internships' = ANY(a.allocated_modules))
    )
  )
);
CREATE POLICY "Admins can manage internships" ON internships FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM admins a WHERE a.id = auth.uid() AND a.active = TRUE AND (
      a.role = 'SUPER_ADMIN' OR a.role = 'INTERNSHIP_ADMIN' OR a.role = 'COLLEGE_CONTENT_ADMIN' OR
      (a.role = 'SUB_ADMIN' AND 'internships' = ANY(a.allocated_modules))
    )
  )
);

-- =====================
-- CLASS SCHEDULE (timetable)
-- =====================
DROP POLICY IF EXISTS "Admins can view class schedules" ON class_timetables;
DROP POLICY IF EXISTS "Admins can manage class schedules" ON class_timetables;

CREATE POLICY "Admins can view class schedules" ON class_timetables FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM admins a WHERE a.id = auth.uid() AND a.active = TRUE AND (
      a.role = 'SUPER_ADMIN' OR a.role = 'SECTION_ADMIN' OR
      (a.role = 'SUB_ADMIN' AND 'class_schedule' = ANY(a.allocated_modules))
    )
  )
);
CREATE POLICY "Admins can manage class schedules" ON class_timetables FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM admins a WHERE a.id = auth.uid() AND a.active = TRUE AND (
      a.role = 'SUPER_ADMIN' OR a.role = 'SECTION_ADMIN' OR
      (a.role = 'SUB_ADMIN' AND 'class_schedule' = ANY(a.allocated_modules))
    )
  )
);
