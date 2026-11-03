CREATE TYPE public.app_role AS ENUM ('admin', 'customer');
CREATE TYPE public.registration_source AS ENUM ('friends','whatsapp','facebook','instagram','tiktok','google_search','other');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
-- No INSERT/UPDATE/DELETE policies: roles can only be changed by the backend (service role / SQL).

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  invite_code text NOT NULL UNIQUE,
  referred_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  registration_source public.registration_source NOT NULL DEFAULT 'other',
  registration_source_other text,
  email_verified boolean NOT NULL DEFAULT false,
  phone_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invite_code_format CHECK (invite_code ~ '^SB-[A-Z0-9]{6}$'),
  CONSTRAINT full_name_len CHECK (char_length(full_name) BETWEEN 2 AND 100),
  CONSTRAINT phone_format CHECK (phone ~ '^\+234[789][01][0-9]{8}$')
);
GRANT SELECT ON public.profiles TO authenticated;
-- Customers may only edit these columns; verification, codes and referrals are backend-controlled.
GRANT UPDATE (full_name, phone) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers read own profile" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Customers update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Unique code generator: SB- + 6 chars (no ambiguous 0/O/1/I).
CREATE OR REPLACE FUNCTION public.generate_invite_code() RETURNS text
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text; i int;
BEGIN
  LOOP
    code := 'SB-';
    FOR i IN 1..6 LOOP
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE invite_code = code);
  END LOOP;
  RETURN code;
END $$;
REVOKE EXECUTE ON FUNCTION public.generate_invite_code() FROM PUBLIC, anon, authenticated;

-- Lets the signup form check a code before submitting. Reveals only true/false.
CREATE OR REPLACE FUNCTION public.invite_code_is_valid(_code text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE invite_code = upper(trim(_code)))
$$;
GRANT EXECUTE ON FUNCTION public.invite_code_is_valid(text) TO anon, authenticated;

-- Create profile + customer role on signup, validating metadata server-side.
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_name text := trim(COALESCE(meta->>'full_name', ''));
  v_phone text := trim(COALESCE(meta->>'phone', ''));
  v_source text := lower(COALESCE(meta->>'registration_source', 'other'));
  v_other text := nullif(left(trim(COALESCE(meta->>'registration_source_other', '')), 100), '');
  v_ref_code text := upper(trim(COALESCE(meta->>'referral_code', '')));
  v_ref uuid;
BEGIN
  IF char_length(v_name) < 2 OR char_length(v_name) > 100 THEN
    RAISE EXCEPTION 'Please enter your full name';
  END IF;
  IF v_phone !~ '^\+234[789][01][0-9]{8}$' THEN
    RAISE EXCEPTION 'Please enter a valid Nigerian phone number';
  END IF;
  IF v_source NOT IN ('friends','whatsapp','facebook','instagram','tiktok','google_search','other') THEN
    v_source := 'other';
  END IF;
  IF v_ref_code <> '' THEN
    SELECT id INTO v_ref FROM public.profiles WHERE invite_code = v_ref_code;
    IF v_ref IS NULL THEN RAISE EXCEPTION 'Invitation code not found'; END IF;
  END IF;

  INSERT INTO public.profiles (id, full_name, email, phone, invite_code, referred_by,
    registration_source, registration_source_other, email_verified)
  VALUES (NEW.id, v_name, NEW.email, v_phone, public.generate_invite_code(), v_ref,
    v_source::public.registration_source, v_other, NEW.email_confirmed_at IS NOT NULL);

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer');
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_user_email_confirmed() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    UPDATE public.profiles SET email_verified = true WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_email_confirmed AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_email_confirmed();