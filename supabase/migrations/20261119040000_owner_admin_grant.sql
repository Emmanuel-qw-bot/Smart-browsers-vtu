-- Grant Smart Browsers admin access to the owner's verified account only.
-- Safe to run repeatedly; it does not promote any other email address.
CREATE OR REPLACE FUNCTION public.grant_smart_browsers_owner_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lower(COALESCE(NEW.email, '')) = 'emmanuelchibundu785@gmail.com'
     AND NEW.email_confirmed_at IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS grant_smart_browsers_owner_admin ON auth.users;
CREATE TRIGGER grant_smart_browsers_owner_admin
AFTER INSERT OR UPDATE OF email, email_confirmed_at ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.grant_smart_browsers_owner_admin();

-- Also promote the account if it already exists and has verified its email.
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE lower(COALESCE(email, '')) = 'emmanuelchibundu785@gmail.com'
  AND email_confirmed_at IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;
