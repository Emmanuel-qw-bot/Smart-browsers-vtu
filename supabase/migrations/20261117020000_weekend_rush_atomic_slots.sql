-- Atomic Weekend Rush slot claims. Eligibility counts are written only by trusted server-side reconciliation.
CREATE TABLE public.weekend_giveaway_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_key text NOT NULL,
  slot_number integer NOT NULL CHECK (slot_number BETWEEN 1 AND 100),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','claimed')),
  claimed_at timestamptz,
  UNIQUE (campaign_key, slot_number),
  CHECK ((status = 'available' AND user_id IS NULL AND claimed_at IS NULL)
      OR (status = 'claimed' AND user_id IS NOT NULL AND claimed_at IS NOT NULL))
);
ALTER TABLE public.weekend_giveaway_slots ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.weekend_giveaway_slots TO authenticated;
CREATE POLICY "Customers view giveaway slots" ON public.weekend_giveaway_slots
  FOR SELECT TO authenticated USING (true);

CREATE TABLE public.weekend_giveaway_eligibility (
  campaign_key text NOT NULL,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  successful_data_purchases integer NOT NULL DEFAULT 0 CHECK (successful_data_purchases >= 0),
  verified_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_key, user_id)
);
ALTER TABLE public.weekend_giveaway_eligibility ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.weekend_giveaway_eligibility TO authenticated;
CREATE POLICY "Customers view own giveaway eligibility" ON public.weekend_giveaway_eligibility
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
-- No authenticated INSERT/UPDATE grants or policies: only trusted server/service role can maintain eligibility.

CREATE TABLE public.weekend_giveaway_claim_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_key text NOT NULL,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slot_id uuid NOT NULL UNIQUE REFERENCES public.weekend_giveaway_slots(id),
  network text CHECK (network IN ('MTN','Airtel','Glo')),
  recipient_phone text,
  status text NOT NULL DEFAULT 'slot_claimed' CHECK (status IN ('slot_claimed','details_confirmed','fulfilment_pending','fulfilled','failed','manual_review')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_key, user_id),
  CHECK ((network IS NULL AND recipient_phone IS NULL) OR (network IS NOT NULL AND recipient_phone IS NOT NULL))
);
ALTER TABLE public.weekend_giveaway_claim_details ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.weekend_giveaway_claim_details TO authenticated;
CREATE POLICY "Customers view own reward claim" ON public.weekend_giveaway_claim_details
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.weekend_rush_claim_slot()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_settings public.weekend_giveaway_settings%ROWTYPE;
  v_campaign text;
  v_slot public.weekend_giveaway_slots%ROWTYPE;
  v_count integer;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Please sign in to apply.'; END IF;
  SELECT * INTO v_settings FROM public.weekend_giveaway_settings WHERE id = true FOR SHARE;
  IF NOT FOUND OR NOT v_settings.enabled THEN RAISE EXCEPTION 'Weekend Rush is not enabled.'; END IF;
  IF v_settings.opens_at IS NOT NULL AND now() < v_settings.opens_at THEN RAISE EXCEPTION 'Applications have not opened yet.'; END IF;
  IF v_settings.closes_at IS NOT NULL AND now() > v_settings.closes_at THEN RAISE EXCEPTION 'The application window is closed.'; END IF;
  v_campaign := COALESCE(to_char(v_settings.opens_at AT TIME ZONE 'UTC', 'YYYYMMDDHH24MISS'), to_char(now() AT TIME ZONE 'UTC', 'IYYYIW'));
  PERFORM pg_advisory_xact_lock(hashtext('weekend-rush:' || v_campaign));
  SELECT successful_data_purchases INTO v_count FROM public.weekend_giveaway_eligibility
    WHERE campaign_key = v_campaign AND user_id = v_user;
  IF COALESCE(v_count, 0) < v_settings.minimum_data_purchases THEN
    RAISE EXCEPTION 'You need at least % verified successful data purchases to qualify.', v_settings.minimum_data_purchases;
  END IF;
  IF EXISTS (SELECT 1 FROM public.weekend_giveaway_claim_details WHERE campaign_key = v_campaign AND user_id = v_user) THEN
    RAISE EXCEPTION 'You have already claimed a Weekend Rush slot.';
  END IF;
  INSERT INTO public.weekend_giveaway_slots (campaign_key, slot_number)
    SELECT v_campaign, n FROM generate_series(1, v_settings.maximum_winners) n
    ON CONFLICT (campaign_key, slot_number) DO NOTHING;
  SELECT * INTO v_slot FROM public.weekend_giveaway_slots
    WHERE campaign_key = v_campaign AND status = 'available'
    ORDER BY slot_number LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sorry, all giveaway slots have been allocated. Please try next weekend.'; END IF;
  UPDATE public.weekend_giveaway_slots SET user_id = v_user, status = 'claimed', claimed_at = now() WHERE id = v_slot.id;
  INSERT INTO public.weekend_giveaway_claim_details (campaign_key, user_id, slot_id)
    VALUES (v_campaign, v_user, v_slot.id);
  RETURN jsonb_build_object('slot_number', v_slot.slot_number, 'status', 'claimed', 'campaign_key', v_campaign);
END;
$$;
REVOKE ALL ON FUNCTION public.weekend_rush_claim_slot() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.weekend_rush_claim_slot() TO authenticated;

CREATE OR REPLACE FUNCTION public.weekend_rush_save_recipient(_network text, _phone text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_user uuid := auth.uid(); v_row public.weekend_giveaway_claim_details%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Please sign in.'; END IF;
  IF _network NOT IN ('MTN','Airtel','Glo') THEN RAISE EXCEPTION 'Choose MTN, Airtel or Glo.'; END IF;
  IF _phone !~ '^(0[789][01][0-9]{8}|234[789][01][0-9]{8})$' THEN RAISE EXCEPTION 'Enter a valid Nigerian mobile number.'; END IF;
  SELECT * INTO v_row FROM public.weekend_giveaway_claim_details
    WHERE user_id = v_user AND status = 'slot_claimed' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No uncompleted reward slot was found.'; END IF;
  UPDATE public.weekend_giveaway_claim_details SET network = _network, recipient_phone = _phone, status = 'details_confirmed', updated_at = now()
    WHERE id = v_row.id;
  RETURN jsonb_build_object('success', true, 'network', _network, 'phone', _phone);
END;
$$;
REVOKE ALL ON FUNCTION public.weekend_rush_save_recipient(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.weekend_rush_save_recipient(text,text) TO authenticated;
