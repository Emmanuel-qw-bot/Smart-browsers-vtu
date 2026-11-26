-- Weekend Rush qualification is tied to verified successful data VTU attempts, not wallet debits.
CREATE OR REPLACE FUNCTION public.weekend_rush_campaign_key(p_opens_at timestamptz)
RETURNS text LANGUAGE sql STABLE SET search_path=public AS $
 SELECT COALESCE(to_char(p_opens_at AT TIME ZONE 'UTC','YYYYMMDDHH24MISS'),to_char(now() AT TIME ZONE 'UTC','IYYYIW'));
$$;

CREATE OR REPLACE FUNCTION public.weekend_rush_refresh_eligibility(p_campaign text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO public.weekend_giveaway_eligibility(campaign_key,user_id,successful_data_purchases,verified_at)
 SELECT p_campaign,t.user_id,count(*)::integer,now()
 FROM public.vtu_purchase_attempts t
 WHERE t.service='data' AND t.status='successful'
 GROUP BY t.user_id
 ON CONFLICT(campaign_key,user_id) DO UPDATE SET
 successful_data_purchases=excluded.successful_data_purchases,verified_at=excluded.verified_at;
END $$;
REVOKE ALL ON FUNCTION public.weekend_rush_refresh_eligibility(text) FROM PUBLIC,authenticated,anon;


CREATE OR REPLACE FUNCTION public.weekend_rush_refresh_after_vtu()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE campaign text; settings_row public.weekend_giveaway_settings%ROWTYPE;
BEGIN
 IF (TG_OP='INSERT' AND NEW.service='data' AND NEW.status='successful')
 OR (TG_OP='UPDATE' AND NEW.service='data' AND (NEW.status='successful' OR OLD.status='successful')) THEN
   SELECT * INTO settings_row FROM public.weekend_giveaway_settings WHERE id=true;
   campaign:=public.weekend_rush_campaign_key(settings_row.opens_at);
   INSERT INTO public.weekend_giveaway_eligibility(campaign_key,user_id,successful_data_purchases,verified_at)
   SELECT campaign,NEW.user_id,count(*)::integer,now()
   FROM public.vtu_purchase_attempts t WHERE t.user_id=NEW.user_id AND t.service='data' AND t.status='successful'
   GROUP BY t.user_id
   ON CONFLICT(campaign_key,user_id) DO UPDATE SET successful_data_purchases=excluded.successful_data_purchases,verified_at=excluded.verified_at;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS weekend_rush_vtu_eligibility_refresh ON public.vtu_purchase_attempts;
CREATE TRIGGER weekend_rush_vtu_eligibility_refresh
AFTER INSERT OR UPDATE OF status,service,user_id ON public.vtu_purchase_attempts
FOR EACH ROW EXECUTE FUNCTION public.weekend_rush_refresh_after_vtu();

CREATE OR REPLACE FUNCTION public.weekend_rush_refresh_when_settings_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.opens_at IS DISTINCT FROM OLD.opens_at OR NEW.minimum_data_purchases IS DISTINCT FROM OLD.minimum_data_purchases OR NEW.enabled IS DISTINCT FROM OLD.enabled THEN
  PERFORM public.weekend_rush_refresh_eligibility(public.weekend_rush_campaign_key(NEW.opens_at));
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS weekend_rush_settings_eligibility_refresh ON public.weekend_giveaway_settings;
CREATE TRIGGER weekend_rush_settings_eligibility_refresh
AFTER UPDATE OF opens_at,minimum_data_purchases,enabled ON public.weekend_giveaway_settings
FOR EACH ROW EXECUTE FUNCTION public.weekend_rush_refresh_when_settings_change();

-- Claim-time verification independently checks live purchase-attempt records to prevent stale eligibility.
CREATE OR REPLACE FUNCTION public.weekend_rush_claim_slot()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
 v_user uuid:=auth.uid();
 v_settings public.weekend_giveaway_settings%ROWTYPE;
 v_campaign text;
 v_slot public.weekend_giveaway_slots%ROWTYPE;
 v_count integer;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Please sign in to apply.'; END IF;
 SELECT * INTO v_settings FROM public.weekend_giveaway_settings WHERE id=true FOR SHARE;
 IF NOT FOUND OR NOT v_settings.enabled THEN RAISE EXCEPTION 'Weekend Rush is not enabled.'; END IF;
 IF v_settings.opens_at IS NOT NULL AND now()<v_settings.opens_at THEN RAISE EXCEPTION 'Applications have not opened yet.'; END IF;
 IF v_settings.closes_at IS NOT NULL AND now()>v_settings.closes_at THEN RAISE EXCEPTION 'The application window is closed.'; END IF;
 v_campaign:=public.weekend_rush_campaign_key(v_settings.opens_at);
 PERFORM pg_advisory_xact_lock(hashtext('weekend-rush:'||v_campaign));
 SELECT count(*)::integer INTO v_count FROM public.vtu_purchase_attempts
 WHERE user_id=v_user AND service='data' AND status='successful';
 INSERT INTO public.weekend_giveaway_eligibility(campaign_key,user_id,successful_data_purchases,verified_at)
 VALUES(v_campaign,v_user,v_count,now())
 ON CONFLICT(campaign_key,user_id) DO UPDATE SET successful_data_purchases=excluded.successful_data_purchases,verified_at=excluded.verified_at;
 IF v_count<v_settings.minimum_data_purchases THEN RAISE EXCEPTION 'You need at least % verified successful data purchases to qualify. Your verified count is %.',v_settings.minimum_data_purchases,v_count; END IF;
 IF EXISTS(SELECT 1 FROM public.weekend_giveaway_claim_details WHERE campaign_key=v_campaign AND user_id=v_user) THEN RAISE EXCEPTION 'You have already claimed a Weekend Rush slot.'; END IF;
 INSERT INTO public.weekend_giveaway_slots(campaign_key,slot_number)
 SELECT v_campaign,n FROM generate_series(1,v_settings.maximum_winners)n ON CONFLICT(campaign_key,slot_number) DO NOTHING;
 SELECT * INTO v_slot FROM public.weekend_giveaway_slots WHERE campaign_key=v_campaign AND status='available' ORDER BY slot_number LIMIT 1 FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Sorry, all giveaway slots have been allocated. Please try next weekend.'; END IF;
 UPDATE public.weekend_giveaway_slots SET user_id=v_user,status='claimed',claimed_at=now() WHERE id=v_slot.id;
 INSERT INTO public.weekend_giveaway_claim_details(campaign_key,user_id,slot_id) VALUES(v_campaign,v_user,v_slot.id);
 RETURN jsonb_build_object('slot_number',v_slot.slot_number,'status','claimed','campaign_key',v_campaign,'successful_data_purchases',v_count);
END $$;

-- Opening notifications only go to customers with enough provider-confirmed successful data purchases.
CREATE OR REPLACE FUNCTION public.notify_weekend_rush_open()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.enabled AND (NOT OLD.enabled OR NEW.opens_at IS DISTINCT FROM OLD.opens_at)
   AND (NEW.opens_at IS NULL OR NEW.opens_at<=now()) THEN
  INSERT INTO public.user_notifications(user_id,notification_type,title,message,source_key,action_path)
  SELECT p.id,'weekend_rush','Weekend Rush is open',
    coalesce(NEW.announcement,'Weekend Rush applications are now open.'),
    'open-'||coalesce(NEW.opens_at::text,'immediate'),'/app/weekend-rush'
  FROM public.profiles p
  WHERE (SELECT count(*) FROM public.vtu_purchase_attempts t
    WHERE t.user_id=p.id AND t.service='data' AND t.status='successful')>=NEW.minimum_data_purchases
  ON CONFLICT(user_id,notification_type,source_key) DO NOTHING;
 END IF;
 RETURN NEW;
END $$;

-- Restrict helper functions to trusted trigger/RPC execution.
REVOKE ALL ON FUNCTION public.weekend_rush_campaign_key(timestamptz) FROM PUBLIC,authenticated,anon;
REVOKE ALL ON FUNCTION public.weekend_rush_refresh_after_vtu() FROM PUBLIC,authenticated,anon;
REVOKE ALL ON FUNCTION public.weekend_rush_refresh_when_settings_change() FROM PUBLIC,authenticated,anon;
REVOKE ALL ON FUNCTION public.notify_weekend_rush_open() FROM PUBLIC,authenticated,anon;
