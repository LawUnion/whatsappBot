-- Fix Super Admin active status
UPDATE admins
SET active = true
WHERE email = 'admin@lawconnect.com';
