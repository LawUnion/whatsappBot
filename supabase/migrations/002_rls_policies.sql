-- Row Level Security (RLS) Policies
-- Ensures admins can only access data within their role scope

-- =====================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE internships ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_buttons ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTIONS FOR RLS (Defined before policy usage)
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admins
    WHERE id = auth.uid()
    AND role = 'SUPER_ADMIN'
    AND active = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.get_my_admin_role()
RETURNS VARCHAR
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM admins
  WHERE id = auth.uid()
  AND active = TRUE;
$$;

-- =====================================================
-- ADMIN POLICIES
-- =====================================================

-- Admins can view their own profile
CREATE POLICY "Admins can view own profile"
ON admins FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Super admins can view all admins (Use function to break recursion)
CREATE POLICY "Super admins can view all admins"
ON admins FOR SELECT
TO authenticated
USING (is_super_admin());


-- =====================================================
-- STUDENT POLICIES
-- =====================================================

-- Admins can view students in their scope
CREATE POLICY "Admins can view students in scope"
ON students FOR SELECT
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
);

-- =====================================================
-- NOTICE POLICIES
-- =====================================================

-- Admins can view notices in their scope
CREATE POLICY "Admins can view notices in scope"
ON notices FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins a
    WHERE a.id = auth.uid() AND a.active = TRUE
    AND (
      a.role = 'SUPER_ADMIN' OR
      a.role = 'NOTICES_ADMIN' OR
      (a.role = 'COLLEGE_CONTENT_ADMIN' AND a.college_id = notices.college_id) OR
      (a.role = 'SECTION_ADMIN' AND a.section_id = notices.section_id)
    )
  )
);

-- Notices admins can create notices
CREATE POLICY "Notices admins can create notices"
ON notices FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins a
    WHERE a.id = auth.uid() AND a.active = TRUE
    AND a.id = posted_by
    AND (a.role = 'SUPER_ADMIN' OR a.role = 'NOTICES_ADMIN' OR a.role = 'COLLEGE_CONTENT_ADMIN' OR a.role = 'SECTION_ADMIN')
  )
);

-- =====================================================
-- EVENT POLICIES
-- =====================================================

-- Admins can view events in their scope
CREATE POLICY "Admins can view events in scope"
ON events FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins a
    WHERE a.id = auth.uid() AND a.active = TRUE
    AND (
      a.role = 'SUPER_ADMIN' OR
      a.role = 'EVENTS_ADMIN' OR
      (a.role = 'SOCIETIES_ADMIN' AND a.society_id = events.society_id) OR
      (a.role = 'COLLEGE_CONTENT_ADMIN' AND a.college_id = events.college_id)
    )
  )
);

-- Events admins can create events
CREATE POLICY "Events admins can create events"
ON events FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins a
    WHERE a.id = auth.uid() AND a.active = TRUE
    AND a.id = created_by
    AND (a.role = 'SUPER_ADMIN' OR a.role = 'EVENTS_ADMIN' OR a.role = 'SOCIETIES_ADMIN')
  )
);

-- =====================================================
-- INTERNSHIP POLICIES
-- =====================================================

-- All admins can view internships
CREATE POLICY "Admins can view internships"
ON internships FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins a
    WHERE a.id = auth.uid() AND a.active = TRUE
  )
);

-- Internship admins can create internships
CREATE POLICY "Internship admins can create internships"
ON internships FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins a
    WHERE a.id = auth.uid() AND a.active = TRUE
    AND a.id = created_by
    AND (a.role = 'SUPER_ADMIN' OR a.role = 'INTERNSHIP_ADMIN')
  )
);

-- =====================================================
-- STUDY MATERIAL POLICIES
-- =====================================================

-- Admins can view study materials in their scope
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

-- Study material admins can create materials
CREATE POLICY "Study material admins can create materials"
ON study_materials FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins a
    WHERE a.id = auth.uid() AND a.active = TRUE
    AND a.id = uploaded_by
    AND (a.role = 'SUPER_ADMIN' OR a.role = 'STUDY_MATERIAL_ADMIN' OR a.role = 'SECTION_ADMIN')
  )
);

-- =====================================================
-- SCHEDULE NOTES POLICIES
-- =====================================================

-- Admins can view schedule notes in their scope
CREATE POLICY "Admins can view schedule notes in scope"
ON schedule_notes FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins a
    WHERE a.id = auth.uid() AND a.active = TRUE
    AND (
      a.role = 'SUPER_ADMIN' OR
      a.role = 'SECTION_ADMIN'
    )
  )
);

-- Section admins can create schedule notes
CREATE POLICY "Section admins can create schedule notes"
ON schedule_notes FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins a
    WHERE a.id = auth.uid() AND a.active = TRUE
    AND a.id = posted_by
    AND (a.role = 'SUPER_ADMIN' OR a.role = 'SECTION_ADMIN')
  )
);

-- =====================================================
-- BOT CONFIGURATION POLICIES
-- =====================================================

-- Only super admins can view/edit bot buttons
CREATE POLICY "Super admins can view bot buttons"
ON bot_buttons FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE id = auth.uid() AND role = 'SUPER_ADMIN' AND active = TRUE
  )
);

CREATE POLICY "Super admins can modify bot buttons"
ON bot_buttons FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE id = auth.uid() AND role = 'SUPER_ADMIN' AND active = TRUE
  )
);

-- Only super admins can view/edit bot settings
CREATE POLICY "Super admins can view bot settings"
ON bot_settings FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE id = auth.uid() AND role = 'SUPER_ADMIN' AND active = TRUE
  )
);

-- =====================================================
-- BROADCAST POLICIES
-- =====================================================

-- All admins can view broadcasts they sent
CREATE POLICY "Admins can view own broadcasts"
ON broadcasts FOR SELECT
TO authenticated
USING (sent_by = auth.uid());

-- Admins can create broadcasts in their scope
CREATE POLICY "Admins can create broadcasts in scope"
ON broadcasts FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins a
    WHERE a.id = auth.uid() AND a.active = TRUE
    AND a.id = sent_by
  )
);

-- =====================================================
-- ACTIVITY LOG POLICIES
-- =====================================================

-- Super admins can view all logs
CREATE POLICY "Super admins can view all logs"
ON activity_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE id = auth.uid() AND role = 'SUPER_ADMIN' AND active = TRUE
  )
);

-- All admins can create logs for their actions
CREATE POLICY "Admins can create logs"
ON activity_logs FOR INSERT
TO authenticated
WITH CHECK (admin_id = auth.uid());

-- =====================================================
-- SUPPORT MESSAGE POLICIES
-- =====================================================

-- Super admins can view all support messages
CREATE POLICY "Super admins can view all support messages"
ON support_messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE id = auth.uid() AND role = 'SUPER_ADMIN' AND active = TRUE
  )
);
