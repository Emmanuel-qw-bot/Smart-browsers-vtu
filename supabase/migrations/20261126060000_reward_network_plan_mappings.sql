-- Configure reward VTU identifiers separately from paid product catalog.
ALTER TABLE public.weekend_giveaway_settings
 ADD COLUMN IF NOT EXISTS mtn_network_id text,
 ADD COLUMN IF NOT EXISTS mtn_data_plan_id text,
 ADD COLUMN IF NOT EXISTS airtel_network_id text,
 ADD COLUMN IF NOT EXISTS airtel_data_plan_id text,
 ADD COLUMN IF NOT EXISTS glo_network_id text,
 ADD COLUMN IF NOT EXISTS glo_data_plan_id text;

ALTER TABLE public.referral_reward_settings
 ADD COLUMN IF NOT EXISTS mtn_network_id text,
 ADD COLUMN IF NOT EXISTS mtn_data_plan_id text,
 ADD COLUMN IF NOT EXISTS airtel_network_id text,
 ADD COLUMN IF NOT EXISTS airtel_data_plan_id text,
 ADD COLUMN IF NOT EXISTS glo_network_id text,
 ADD COLUMN IF NOT EXISTS glo_data_plan_id text;

ALTER TABLE public.weekend_giveaway_claim_details
 ADD COLUMN IF NOT EXISTS network_id text,
 ADD COLUMN IF NOT EXISTS data_plan_id text,
 ADD COLUMN IF NOT EXISTS provider_reference text;

ALTER TABLE public.referral_reward_claims
 ALTER COLUMN product_id DROP NOT NULL,
 ADD COLUMN IF NOT EXISTS network_id text,
 ADD COLUMN IF NOT EXISTS data_plan_id text;

-- Reward identifiers are snapshot into each claim. Changing settings cannot alter an already reserved claim.
CREATE OR REPLACE FUNCTION public.weekend_rush_save_recipient(_network text,_phone text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); c public.weekend_giveaway_claim_details%ROWTYPE; s public.weekend_giveaway_settings%ROWTYPE; v_network_id text; v_plan_id text;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Please sign in.'; END IF;
 IF _network NOT IN ('MTN','Airtel','Glo') THEN RAISE EXCEPTION 'Choose MTN, Airtel or Glo.'; END IF;
 IF _phone !~ '^(0[789][01][0-9]{8}|234[789][01][0-9]{8})$' THEN RAISE EXCEPTION 'Enter a valid Nigerian mobile number.'; END IF;
 SELECT * INTO s FROM public.weekend_giveaway_settings WHERE id=true;
 CASE _network WHEN 'MTN' THEN v_network_id:=s.mtn_network_id;v_plan_id:=s.mtn_data_plan_id;
 WHEN 'Airtel' THEN v_network_id:=s.airtel_network_id;v_plan_id:=s.airtel_data_plan_id;
 WHEN 'Glo' THEN v_network_id:=s.glo_network_id;v_plan_id:=s.glo_data_plan_id; END CASE;
 IF nullif(trim(v_network_id),'') IS NULL OR nullif(trim(v_plan_id),'') IS NULL THEN RAISE EXCEPTION 'Reward is not configured for this network. Please choose another network or contact support.'; END IF;
 SELECT * INTO c FROM public.weekend_giveaway_claim_details WHERE user_id=uid AND status IN ('slot_claimed','details_confirmed','failed') ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'No uncompleted reward slot was found.'; END IF;
 IF c.status='details_confirmed' AND c.network=_network AND c.recipient_phone=_phone AND c.network_id=v_network_id AND c.data_plan_id=v_plan_id THEN
   RETURN jsonb_build_object('success',true,'network',_network,'phone',_phone,'claim_id',c.id,'already_saved',true);
 END IF;
 UPDATE public.weekend_giveaway_claim_details SET network=_network,recipient_phone=_phone,network_id=v_network_id,data_plan_id=v_plan_id,status='details_confirmed',updated_at=now() WHERE id=c.id;
 RETURN jsonb_build_object('success',true,'network',_network,'phone',_phone,'claim_id',c.id);
END $$;
REVOKE ALL ON FUNCTION public.weekend_rush_save_recipient(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.weekend_rush_save_recipient(text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.reserve_referral_reward_claim(_network text,_phone text,_product_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); s public.referral_reward_settings%ROWTYPE; q integer; cycle integer; claim_id uuid; v_network_id text; v_plan_id text;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 PERFORM 1 FROM public.profiles WHERE id=uid FOR UPDATE;
 SELECT * INTO s FROM public.referral_reward_settings WHERE id=true;
 IF NOT s.enabled THEN RAISE EXCEPTION 'Referral rewards are currently disabled'; END IF;
 IF EXISTS(SELECT 1 FROM public.referral_reward_claims WHERE referrer_user_id=uid AND status IN ('reserved','processing','pending')) THEN RAISE EXCEPTION 'You have a reward claim awaiting processing or reconciliation. Resolve it before claiming another reward.'; END IF;
 IF _network NOT IN ('MTN','Airtel','Glo') OR _phone !~ '^0[789][01][0-9]{8}$' THEN RAISE EXCEPTION 'Choose MTN, Airtel or Glo and enter a valid Nigerian phone number'; END IF;
 SELECT count(*) INTO q FROM public.referral_qualifications rq WHERE rq.referrer_user_id=uid AND NOT EXISTS(SELECT 1 FROM public.referral_reward_claim_qualifications used WHERE used.qualification_id=rq.id);
 IF q<s.required_referrals THEN RAISE EXCEPTION 'You have not qualified for the referral reward yet'; END IF;
 CASE _network WHEN 'MTN' THEN v_network_id:=s.mtn_network_id;v_plan_id:=s.mtn_data_plan_id;
 WHEN 'Airtel' THEN v_network_id:=s.airtel_network_id;v_plan_id:=s.airtel_data_plan_id;
 WHEN 'Glo' THEN v_network_id:=s.glo_network_id;v_plan_id:=s.glo_data_plan_id; END CASE;
 IF nullif(trim(v_network_id),'') IS NULL OR nullif(trim(v_plan_id),'') IS NULL THEN RAISE EXCEPTION 'Reward is not configured for this network'; END IF;
 SELECT coalesce(max(reward_cycle),0)+1 INTO cycle FROM public.referral_reward_claims WHERE referrer_user_id=uid;
 INSERT INTO public.referral_reward_claims(referrer_user_id,reward_cycle,data_mb,network,recipient_phone,product_id,network_id,data_plan_id,status)
 VALUES(uid,cycle,s.reward_data_mb,_network,_phone,NULL,v_network_id,v_plan_id,'reserved') RETURNING id INTO claim_id;
 INSERT INTO public.referral_reward_claim_qualifications(claim_id,qualification_id)
 SELECT claim_id,rq.id FROM public.referral_qualifications rq WHERE rq.referrer_user_id=uid
 AND NOT EXISTS(SELECT 1 FROM public.referral_reward_claim_qualifications used WHERE used.qualification_id=rq.id)
 ORDER BY rq.verified_at LIMIT s.required_referrals;
 INSERT INTO public.referral_audit(actor_id,event,subject_user_id,details) VALUES(uid,'reward_claim_reserved',uid,jsonb_build_object('claim_id',claim_id,'network',_network,'phone_last4',right(_phone,4)));
 RETURN claim_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.reserve_referral_reward_claim(text,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.reserve_referral_reward_claim(text,text,uuid) TO authenticated;


ALTER TABLE public.weekend_giveaway_claim_details ADD COLUMN IF NOT EXISTS admin_resolution_note text, ADD COLUMN IF NOT EXISTS admin_resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
