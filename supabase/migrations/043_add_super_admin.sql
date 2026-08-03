-- 043_add_super_admin.sql
-- Creates a super admin user for shouttolearn@gmail.com

DO $$
DECLARE
    new_user_id UUID := gen_random_uuid();
BEGIN
    -- Only insert if the user doesn't already exist
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'shouttolearn@gmail.com') THEN
        INSERT INTO auth.users (
            id,
            instance_id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_token,
            email_change,
            email_change_token_new,
            recovery_token
        ) VALUES (
            new_user_id,
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated',
            'shouttolearn@gmail.com',
            extensions.crypt('password123', extensions.gen_salt('bf')),
            now(),
            '{"provider":"email","providers":["email"]}',
            '{}',
            now(),
            now(),
            '',
            '',
            '',
            ''
        );

        INSERT INTO public.admins (id, name, email, role, active, first_login)
        VALUES (
            new_user_id,
            'Super Admin',
            'shouttolearn@gmail.com',
            'SUPER_ADMIN',
            true,
            true
        );
    END IF;
END $$;
