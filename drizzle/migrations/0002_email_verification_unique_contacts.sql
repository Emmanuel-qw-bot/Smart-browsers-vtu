CREATE UNIQUE INDEX profiles_phone_unique ON public.profiles (phone);
CREATE UNIQUE INDEX profiles_email_lower_unique ON public.profiles (lower(email));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
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
  IF EXISTS (SELECT 1 FROM public.profiles WHERE phone = v_phone) THEN
    RAISE EXCEPTION 'PHONE_TAKEN';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(email) = lower(NEW.email)) THEN
    RAISE EXCEPTION 'EMAIL_TAKEN';
  END IF;
  IF v_source NOT IN ('friends','whatsapp','facebook','instagram','tiktok','google_search','other') THEN
    v_source := 'other';
  END IF;
  IF v_ref_code <> '' THEN
    SELECT id INTO v_ref FROM public.profiles WHERE invite_code = v_ref_code;
    IF v_ref IS NULL THEN RAISE EXCEPTION 'Invitation code not found'; END IF;
  END IF;
  -- Unique indexes on phone and lower(email) remain the final guard against concurrent signups.
  INSERT INTO public.profiles (id, full_name, email, phone, invite_code, referred_by,
    registration_source, registration_source_other, email_verified)
  VALUES (NEW.id, v_name, lower(NEW.email), v_phone, public.generate_invite_code(), v_ref,
    v_source::public.registration_source, v_other, NEW.email_confirmed_at IS NOT NULL);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer');
  RETURN NEW;
END $function$;

-- Lets the signup form show a friendly message before submitting.
CREATE OR REPLACE FUNCTION public.registration_conflicts(_email text, _phone text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'email', EXISTS (SELECT 1 FROM profiles WHERE lower(email) = lower(trim(_email)))
             OR EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = lower(trim(_email))),
    'phone', EXISTS (SELECT 1 FROM profiles WHERE phone = _phone));
$$;
REVOKE EXECUTE ON FUNCTION public.registration_conflicts(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registration_conflicts(text, text) TO anon, authenticated;

-- Welcome bonus now paid once when the email is verified.
CREATE OR REPLACE FUNCTION public.grant_welcome_bonus() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s welcome_bonus_settings;
BEGIN
  IF NEW.email_verified AND NOT COALESCE(OLD.email_verified, false) THEN
    SELECT * INTO s FROM welcome_bonus_settings WHERE id;
    IF s.enabled THEN
      PERFORM wallet_post(NEW.id, 'promotional', s.amount_kobo, 'welcome-bonus:' || NEW.id, 'Welcome bonus');
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS profiles_welcome_bonus ON public.profiles;
CREATE TRIGGER profiles_welcome_bonus AFTER UPDATE OF email_verified ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.grant_welcome_bonus();
REVOKE EXECUTE ON FUNCTION public.grant_welcome_bonus() FROM PUBLIC, anon, authenticated;