-- Fix Infinite Recursion in RLS Policies
-- Use a SECURITY DEFINER function to check admin role without triggering RLS

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

-- Drop existing specific problematic policies
DROP POLICY IF EXISTS "Admins can view own profile" ON admins;
DROP POLICY IF EXISTS "Super admins can view all admins" ON admins;

-- Re-create policies using the safe function

-- 1. Admins can view their own profile
CREATE POLICY "Admins can view own profile"
ON admins FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 2. Super admins can view all admins
CREATE POLICY "Super admins can view all admins"
ON admins FOR SELECT
TO authenticated
USING (is_super_admin());

-- Update Student Policies
DROP POLICY IF EXISTS "Admins can view students in scope" ON students;
CREATE POLICY "Admins can view students in scope"
ON students FOR SELECT
TO authenticated
USING (
  is_super_admin() OR
  EXISTS (
    SELECT 1 FROM admins a
    WHERE a.id = auth.uid() AND a.active = TRUE
    AND (
      (a.role = 'COLLEGE_CONTENT_ADMIN' AND a.college_id = students.college_id) OR
      (a.role = 'SECTION_ADMIN' AND a.section_id = students.section_id)
    )
  )
);
