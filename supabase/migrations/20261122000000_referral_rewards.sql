-- Smart Browsers referral rewards: configurable eligibility, verified deposits, one-time reward claims.
CREATE TABLE IF NOT EXISTS public.referral_reward_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  enabled boolean NOT NULL DEFAULT true,
  required_referrals integer NOT NULL DEFAULT 5 CHECK (required_referrals BETWEEN 1 AND 100),
  minimum_funding_kobo bigint NOT NULL DEFAULT 50000 CHECK (minimum_funding_kobo >= 500 AND minimum_funding_kobo <= 100000000),
  reward_data_mb integer NOT NULL DEFAULT 5000 CHECK (reward_data_mb BETWEEN 100 AND 100000),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
INSERT INTO public.referral_reward_settings(id) VALUES (true) ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.referral_reward_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.referral_reward_settings TO authenticated;
GRANT UPDATE ON public.referral_reward_settings TO authenticated;
CREATE POLICY "Customers read referral reward settings" ON public.referral_reward_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins update referral reward settings" ON public.referral_reward_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.referral_qualifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referred_user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  referrer_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  qualifying_wallet_transaction_id uuid NOT NULL UNIQUE REFERENCES public.wallet_transactions(id),
  qualifying_amount_kobo bigint NOT NULL CHECK (qualifying_amount_kobo >= 50000),
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at timestamptz NOT NULL DEFAULT now(),
  note text
);
ALTER TABLE public.referral_qualifications ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.referral_qualifications TO authenticated;
CREATE POLICY "Users read own referral qualifications" ON public.referral_qualifications FOR SELECT TO authenticated USING (referrer_user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.referral_reward_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reward_cycle integer NOT NULL DEFAULT 1,
  data_mb integer NOT NULL,
  network text NOT NULL CHECK (network IN ('MTN','Airtel','Glo','9mobile')),
  recipient_phone text NOT NULL CHECK (recipient_phone ~ '^0[789][01][0-9]{8}$'),
  product_id uuid NOT NULL REFERENCES public.vtu_products(id),
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved','processing','pending','delivered','failed')),
  provider_reference text,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  UNIQUE(referrer_user_id,reward_cycle)
);
ALTER TABLE public.referral_reward_claims ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.referral_reward_claims TO authenticated;
CREATE POLICY "Users read own referral claims" ON public.referral_reward_claims FOR SELECT TO authenticated USING (referrer_user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.referral_reward_claim_qualifications (
  claim_id uuid NOT NULL REFERENCES public.referral_reward_claims(id) ON DELETE CASCADE,
  qualification_id uuid NOT NULL UNIQUE REFERENCES public.referral_qualifications(id),
  PRIMARY KEY (claim_id,qualification_id)
);
ALTER TABLE public.referral_reward_claim_qualifications ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.referral_reward_claim_qualifications TO authenticated;
CREATE POLICY "Users read their reward qualification snapshots" ON public.referral_reward_claim_qualifications FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM referral_reward_claims c WHERE c.id=claim_id AND (c.referrer_user_id=auth.uid() OR public.has_role(auth.uid(),'admin'))));

CREATE TABLE IF NOT EXISTS public.referral_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event text NOT NULL,
  subject_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.referral_audit ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.referral_audit TO authenticated;
CREATE POLICY "Admins read referral audit" ON public.referral_audit FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- Only a verified deposit can qualify; admin-manual credits require explicit admin verification here.
CREATE OR REPLACE FUNCTION public.admin_verify_referral_deposit(_transaction_id uuid, _note text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE tx public.wallet_transactions; referrer uuid; minimum_amount bigint;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Administrator permission required'; END IF;
  SELECT * INTO tx FROM public.wallet_transactions WHERE id=_transaction_id FOR UPDATE;
  IF NOT FOUND OR tx.category <> 'deposit' OR tx.amount_kobo < 50000 THEN
    RAISE EXCEPTION 'Only wallet deposit transactions of at least ₦500 can be verified';
  END IF;
  SELECT referred_by INTO referrer FROM public.profiles WHERE id=tx.user_id;
  IF referrer IS NULL THEN RETURN jsonb_build_object('qualified',false,'reason','Customer was not referred'); END IF;
  SELECT minimum_funding_kobo INTO minimum_amount FROM public.referral_reward_settings WHERE id=true;
  IF tx.amount_kobo < minimum_amount THEN RAISE EXCEPTION 'Deposit is below the configured qualifying amount'; END IF;
  INSERT INTO public.referral_qualifications(referred_user_id,referrer_user_id,qualifying_wallet_transaction_id,qualifying_amount_kobo,verified_by,note)
  VALUES(tx.user_id,referrer,tx.id,tx.amount_kobo,auth.uid(),left(trim(_note),500))
  ON CONFLICT (referred_user_id) DO NOTHING;
  INSERT INTO public.referral_audit(actor_id,event,subject_user_id,details)
  VALUES(auth.uid(),'deposit_verified_for_referral',tx.user_id,jsonb_build_object('transaction_id',tx.id,'amount_kobo',tx.amount_kobo,'note',left(trim(_note),500)));
  RETURN jsonb_build_object('qualified',true);
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_verify_referral_deposit(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_verify_referral_deposit(uuid,text) TO authenticated;

-- The code lookup exposes only a referral display label, never contact details.
CREATE OR REPLACE FUNCTION public.invite_code_referrer_label(_code text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT CASE WHEN (SELECT count(*) FROM public.profiles p2 WHERE lower(split_part(trim(p2.full_name),' ',1))=lower(split_part(trim(p.full_name),' ',1)))>1
    THEN 'SBR-'||split_part(trim(p.full_name),' ',1)||'-'||right(p.invite_code,4)
    ELSE 'SBR-'||split_part(trim(p.full_name),' ',1) END
  FROM public.profiles p WHERE p.invite_code=upper(trim(_code)) LIMIT 1
$$;
REVOKE EXECUTE ON FUNCTION public.invite_code_referrer_label(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invite_code_referrer_label(text) TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.get_my_referral_dashboard()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); s public.referral_reward_settings; q integer; total_q integer; claims jsonb; friends jsonb; cycle integer; unlocked boolean;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO s FROM public.referral_reward_settings WHERE id=true;
  SELECT count(*) INTO total_q FROM public.referral_qualifications WHERE referrer_user_id=uid;
  SELECT count(*) INTO q FROM public.referral_qualifications rq WHERE referrer_user_id=uid AND NOT EXISTS (SELECT 1 FROM referral_reward_claim_qualifications used WHERE used.qualification_id=rq.id);
  SELECT coalesce(jsonb_agg(jsonb_build_object('display_name','Friend '||row_number::text,'qualified',qualified,'joined_at',joined_at,'qualified_at',qualified_at) ORDER BY joined_at),'[]'::jsonb)
    INTO friends FROM (
      SELECT p.created_at joined_at,(rq.id IS NOT NULL) qualified,rq.verified_at qualified_at,
        row_number() OVER (ORDER BY p.created_at) row_number
      FROM profiles p LEFT JOIN referral_qualifications rq ON rq.referred_user_id=p.id
      WHERE p.referred_by=uid
    ) x;
  SELECT coalesce(max(reward_cycle),0)+1 INTO cycle FROM referral_reward_claims WHERE referrer_user_id=uid;
  unlocked:=s.enabled AND q>=s.required_referrals AND NOT EXISTS(SELECT 1 FROM referral_reward_claims WHERE referrer_user_id=uid AND reward_cycle=cycle);
  SELECT coalesce(jsonb_agg(to_jsonb(rc) ORDER BY rc.created_at DESC),'[]'::jsonb) INTO claims FROM referral_reward_claims rc WHERE rc.referrer_user_id=uid;
  RETURN jsonb_build_object('enabled',s.enabled,'required',s.required_referrals,'minimum_funding_kobo',s.minimum_funding_kobo,'reward_data_mb',s.reward_data_mb,'qualified_count',total_q,'available_count',q,'friends',friends,'claims',claims,'next_cycle',cycle,'unlocked',unlocked);
END $$;
REVOKE EXECUTE ON FUNCTION public.get_my_referral_dashboard() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_my_referral_dashboard() TO authenticated;

CREATE OR REPLACE FUNCTION public.reserve_referral_reward_claim(_network text,_phone text,_product_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); s public.referral_reward_settings; q integer; cycle integer; product public.vtu_products; claim_id uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO s FROM referral_reward_settings WHERE id=true;
  IF NOT s.enabled THEN RAISE EXCEPTION 'Referral rewards are currently disabled'; END IF;
  IF _network NOT IN ('MTN','Airtel','Glo','9mobile') OR _phone !~ '^0[789][01][0-9]{8}$' THEN RAISE EXCEPTION 'Choose a valid network and Nigerian phone number'; END IF;
  SELECT count(*) INTO q FROM referral_qualifications WHERE referrer_user_id=uid;
  IF q<s.required_referrals THEN RAISE EXCEPTION 'You have not qualified for the referral reward yet'; END IF;
  SELECT coalesce(max(reward_cycle),0)+1 INTO cycle FROM referral_reward_claims WHERE referrer_user_id=uid;
  SELECT * INTO product FROM vtu_products WHERE id=_product_id AND service='data' AND active AND NOT archived AND upper(network_name)=upper(_network) AND plan_name ~* ('(^|[^0-9])'||(s.reward_data_mb/1000)::text||'[[:space:]]*GB([^0-9]|$)') LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'The selected reward data plan is not configured'; END IF;
  INSERT INTO referral_reward_claims(referrer_user_id,reward_cycle,data_mb,network,recipient_phone,product_id,status)
  VALUES(uid,cycle,s.reward_data_mb,_network,_phone,_product_id,'reserved') RETURNING id INTO claim_id;
  INSERT INTO referral_reward_claim_qualifications(claim_id,qualification_id)
    SELECT claim_id,id FROM referral_qualifications WHERE referrer_user_id=uid
      AND NOT EXISTS (SELECT 1 FROM referral_reward_claim_qualifications used WHERE used.qualification_id=referral_qualifications.id)
    ORDER BY verified_at LIMIT s.required_referrals;
  INSERT INTO referral_audit(actor_id,event,subject_user_id,details) VALUES(uid,'reward_claim_reserved',uid,jsonb_build_object('claim_id',claim_id,'network',_network,'phone_masked',right(_phone,4),'product_id',_product_id));
  RETURN claim_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.reserve_referral_reward_claim(text,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.reserve_referral_reward_claim(text,text,uuid) TO authenticated;
