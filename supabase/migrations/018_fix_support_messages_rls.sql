-- Fix RLS policies for support_messages table
-- Allow all active admins to read support messages (not just SUPER_ADMIN)

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Super admins can view all support messages" ON support_messages;

-- Create new policy for all active admins to view support messages
CREATE POLICY "Admins can view support messages"
ON support_messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE id = auth.uid() AND active = TRUE
  )
);

-- Allow admins to update support messages (mark as read, add reply)
CREATE POLICY "Admins can update support messages"
ON support_messages FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE id = auth.uid() AND active = TRUE
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins
    WHERE id = auth.uid() AND active = TRUE
  )
);
