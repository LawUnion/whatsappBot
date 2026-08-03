-- Migration 015: Admin Management RLS Policies
-- Allows super admins to create, update, and delete other admins

-- =====================================================
-- INSERT POLICY - Super admins can create new admins
-- =====================================================

CREATE POLICY "Super admins can create admins"
ON admins FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins a
    WHERE a.id = auth.uid()
    AND a.active = TRUE
    AND a.role = 'SUPER_ADMIN'
  )
);

-- =====================================================
-- UPDATE POLICY - Super admins can update any admin
-- =====================================================

CREATE POLICY "Super admins can update admins"
ON admins FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins a
    WHERE a.id = auth.uid()
    AND a.active = TRUE
    AND a.role = 'SUPER_ADMIN'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins a
    WHERE a.id = auth.uid()
    AND a.active = TRUE
    AND a.role = 'SUPER_ADMIN'
  )
);

-- =====================================================
-- DELETE POLICY - Super admins can delete admins
-- =====================================================

CREATE POLICY "Super admins can delete admins"
ON admins FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins a
    WHERE a.id = auth.uid()
    AND a.active = TRUE
    AND a.role = 'SUPER_ADMIN'
  )
);
