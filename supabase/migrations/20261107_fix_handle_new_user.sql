-- Migration: Fix handle_new_user() trigger function and automatic PENDING -> ACTIVE transition on first login
-- Problem:
-- 1. 'barangay' and 'municipality' columns were dropped from public.profiles,
--    and 'BRGY_ADMIN' / 'FIELD_OP' roles were not handled in the enum cast in handle_new_user().
-- 2. Newly created users start as 'PENDING' until they log in with their default password,
--    at which point their status should automatically become 'ACTIVE'.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    default_role_id uuid;
    assigned_role_code text;
    assigned_user_role public.user_role;
BEGIN
    -- Normalize the role string to uppercase
    assigned_role_code := UPPER(COALESCE(new.raw_user_meta_data->>'role', 'FIELD_OP'));

    -- Map legacy role codes to current role codes
    IF assigned_role_code = 'MHO' THEN
        assigned_role_code := 'BRGY_ADMIN';
    ELSIF assigned_role_code = 'BHW' THEN
        assigned_role_code := 'FIELD_OP';
    END IF;

    -- Cast the enum safely
    CASE assigned_role_code
        WHEN 'SYS_ADMIN'  THEN assigned_user_role := 'SYS_ADMIN'::public.user_role;
        WHEN 'ADMIN'      THEN assigned_user_role := 'ADMIN'::public.user_role;
        WHEN 'BRGY_ADMIN' THEN assigned_user_role := 'BRGY_ADMIN'::public.user_role;
        WHEN 'FIELD_OP'   THEN assigned_user_role := 'FIELD_OP'::public.user_role;
        ELSE                   assigned_user_role := 'FIELD_OP'::public.user_role;
    END CASE;

    -- Lookup role ID with case-insensitive matching
    SELECT id INTO default_role_id
    FROM public.roles
    WHERE UPPER(role_code) = assigned_role_code
    LIMIT 1;

    -- Fallback role ID if not found
    IF default_role_id IS NULL THEN
        SELECT id INTO default_role_id
        FROM public.roles
        WHERE UPPER(role_code) = 'FIELD_OP'
        LIMIT 1;
    END IF;

    -- Perform insert or update
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = new.id) THEN
        UPDATE public.profiles
        SET
            email = new.email,
            updated_at = now()
        WHERE id = new.id;
    ELSE
        INSERT INTO public.profiles (
            id,
            first_name,
            middle_name,
            last_name,
            email,
            username,
            phone_number,
            role_id,
            role,
            status,
            invited_at,
            is_active,
            must_change_password,
            created_at,
            updated_at
        ) VALUES (
            new.id,
            COALESCE(new.raw_user_meta_data->>'first_name', SPLIT_PART(new.email, '@', 1)),
            new.raw_user_meta_data->>'middle_name',
            COALESCE(new.raw_user_meta_data->>'last_name', 'User'),
            new.email,
            COALESCE(new.raw_user_meta_data->>'username', SPLIT_PART(new.email, '@', 1)),
            new.raw_user_meta_data->>'phone_number',
            default_role_id,
            assigned_user_role,
            'PENDING',
            now(),
            true,
            true,
            now(),
            now()
        );
    END IF;

    RETURN new;
END;
$function$;

-- Remove duplicate trigger if present
DROP TRIGGER IF EXISTS trg_auth_user_created ON auth.users;

-- Fix users_view_update_trigger to not reference dropped municipality/barangay columns
CREATE OR REPLACE FUNCTION public.users_view_update_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.profiles
  SET
    first_name = NEW.first_name,
    middle_name = NEW.middle_name,
    last_name = NEW.last_name,
    email = NEW.email,
    username = NEW.username,
    phone_number = NEW.phone_number,
    role = NEW.role,
    status = NEW.status,
    invited_at = NEW.invited_at,
    activated_at = NEW.activated_at,
    deactivated_at = NEW.deactivated_at,
    updated_at = now()
  WHERE id = OLD.id;
  RETURN NEW;
END;
$function$;

-- Automatically mark PENDING users as ACTIVE in public.profiles as soon as they sign in
CREATE OR REPLACE FUNCTION public.handle_user_first_login()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.last_sign_in_at IS NOT NULL AND (OLD.last_sign_in_at IS NULL OR NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at) THEN
    UPDATE public.profiles
    SET
      status = 'ACTIVE',
      is_active = true,
      activated_at = COALESCE(activated_at, now()),
      updated_at = now()
    WHERE id = NEW.id
      AND status = 'PENDING';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;
CREATE TRIGGER on_auth_user_login
AFTER UPDATE OF last_sign_in_at ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_user_first_login();

-- Ensure any existing unconfirmed accounts (created before auto-confirm) can log in with their default password while staying PENDING until first login
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email_confirmed_at IS NULL;
