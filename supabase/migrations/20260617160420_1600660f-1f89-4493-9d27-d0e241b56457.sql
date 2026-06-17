
-- Promote existing Luca account to admin and create a generic admin login
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'lucadevictor@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Create generic admin user (admin@ole.local / Admin@2026)
DO $$
DECLARE
  new_uid uuid := gen_random_uuid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@ole.local') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin, is_sso_user
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', new_uid, 'authenticated', 'authenticated',
      'admin@ole.local', crypt('Admin@2026', gen_salt('bf')),
      now(), now(), now(),
      jsonb_build_object('provider','email','providers',jsonb_build_array('email')),
      jsonb_build_object('full_name','Administrador'),
      false, false
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), new_uid,
            jsonb_build_object('sub', new_uid::text, 'email', 'admin@ole.local', 'email_verified', true),
            'email', new_uid::text, now(), now(), now());
    INSERT INTO public.profiles (id, email, full_name, must_change_password)
    VALUES (new_uid, 'admin@ole.local', 'Administrador', false)
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (new_uid, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
