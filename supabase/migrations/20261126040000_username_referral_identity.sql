-- Customer usernames and username-based invitation codes.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;

-- Give existing accounts stable unique usernames derived from their full names.
DO $$
DECLARE p record; base text; candidate text; suffix integer;
BEGIN
  FOR p IN SELECT id,full_name FROM public.profiles WHERE username IS NULL ORDER BY created_at,id LOOP
    base := lower(regexp_replace(trim(split_part(p.full_name,' ',1)), '[^a-zA-Z0-9_]', '', 'g'));
    IF length(base)<3 THEN base := 'user'; END IF;
    base := left(base,20);
    candidate := base;
    suffix := 1;
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE lower(username)=lower(candidate)) LOOP
      candidate := left(base,18)||suffix::text;
      suffix := suffix+1;
    END LOOP;
    UPDATE public.profiles SET username=candidate WHERE id=p.id;
  END LOOP;
END $$;

ALTER TABLE public.profiles ALTER COLUMN username SET NOT NULL;
ALTER TABLE public.profiles ADD CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]{3,20}$');
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_unique ON public.profiles(lower(username));
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $signup_fn$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_name text := trim(COALESCE(meta->>'full_name', ''));
  v_username text := lower(trim(COALESCE(meta->>'username', '')));
  v_phone text := trim(COALESCE(meta->>'phone', ''));
  v_source text := lower(COALESCE(meta->>'registration_source', 'other'));
  v_other text := nullif(left(trim(COALESCE(meta->>'registration_source_other', '')), 100), '');
  v_ref_code text := upper(trim(COALESCE(meta->>'referral_code', '')));
  v_ref uuid;
  v_invite text;
BEGIN
  IF char_length(v_name) < 2 OR char_length(v_name) > 100 THEN RAISE EXCEPTION 'Please enter your full name'; END IF;
  IF v_username !~ '^[a-zA-Z0-9_]{3,20}$' THEN RAISE EXCEPTION 'Username must be 3-20 letters, numbers or underscores'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(username)=lower(v_username)) THEN RAISE EXCEPTION 'USERNAME_TAKEN'; END IF;
  IF v_phone !~ '^\+234[789][01][0-9]{8}$' THEN RAISE EXCEPTION 'Please enter a valid Nigerian phone number'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE phone=v_phone) THEN RAISE EXCEPTION 'PHONE_TAKEN'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(email)=lower(NEW.email)) THEN RAISE EXCEPTION 'EMAIL_TAKEN'; END IF;
  IF v_source NOT IN ('friends','whatsapp','facebook','instagram','tiktok','google_search','other') THEN v_source:='other'; END IF;
  IF v_source='friends' AND v_ref_code='' THEN RAISE EXCEPTION 'Friend referral code required'; END IF;
  IF v_ref_code<>'' THEN
    SELECT id INTO v_ref FROM public.profiles WHERE invite_code=upper(v_ref_code);
    IF v_ref IS NULL THEN RAISE EXCEPTION 'Invitation code not found'; END IF;
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id=v_ref AND (phone=v_phone OR lower(email)=lower(NEW.email))) THEN RAISE EXCEPTION 'Self referral is not allowed'; END IF;
  END IF;
  v_invite := public.generate_invite_code();
  INSERT INTO public.profiles(id,full_name,username,email,phone,invite_code,referred_by,registration_source,registration_source_other,email_verified)
  VALUES(NEW.id,v_name,v_username,lower(NEW.email),v_phone,v_invite,v_ref,v_source::public.registration_source,v_other,NEW.email_confirmed_at IS NOT NULL);
  INSERT INTO public.user_roles(user_id,role) VALUES(NEW.id,'customer');
  RETURN NEW;
END $signup_fn$;

CREATE OR REPLACE FUNCTION public.invite_code_referrer_label(_code text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $label_fn$
  SELECT 'SB-'||p.username FROM public.profiles p WHERE p.invite_code=upper(trim(_code)) LIMIT 1
$label_fn$;
REVOKE EXECUTE ON FUNCTION public.invite_code_referrer_label(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invite_code_referrer_label(text) TO anon,authenticated;

-- Friendly preflight checks for email, phone and username. Database uniqueness remains authoritative.
CREATE OR REPLACE FUNCTION public.registration_conflicts(_email text,_phone text,_username text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object(
   'email',EXISTS(SELECT 1 FROM public.profiles WHERE lower(email)=lower(trim(_email))),
   'phone',EXISTS(SELECT 1 FROM public.profiles WHERE phone=trim(_phone)),
   'username',EXISTS(SELECT 1 FROM public.profiles WHERE lower(username)=lower(trim(_username)))
 );
$$;
REVOKE EXECUTE ON FUNCTION public.registration_conflicts(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.registration_conflicts(text,text,text) TO anon,authenticated;
