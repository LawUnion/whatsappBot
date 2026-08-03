-- Migration 025: Add DELETE policy for students table
-- Fixes: Delete button not working in pending approvals

-- =====================================================
-- STUDENTS DELETE POLICY
-- =====================================================

-- Allow admins to delete students within their scope
DROP POLICY IF EXISTS "Admins can delete students in scope" ON students;
CREATE POLICY "Admins can delete students in scope"
ON students FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins a
    WHERE a.id = auth.uid()
    AND a.active = TRUE
    AND (
      -- Super admins can delete any student
      a.role = 'SUPER_ADMIN'
      OR
      -- College admins can delete students in their college
      (a.college_id IS NOT NULL AND a.college_id = students.college_id)
      OR
      -- Year admins can delete students in their year
      (a.year_id IS NOT NULL AND a.year_id = students.year_id)
      OR
      -- Section admins can delete students in their section
      (a.section_id IS NOT NULL AND a.section_id = students.section_id)
    )
  )
);
