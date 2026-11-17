CREATE TABLE public.weekend_giveaway_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  enabled boolean NOT NULL DEFAULT false,
  announcement text NOT NULL DEFAULT 'Weekend Rush is coming! Get ready for your chance to win free data.',
  reward_data_mb integer NOT NULL DEFAULT 1024 CHECK (reward_data_mb BETWEEN 100 AND 10000),
  minimum_data_purchases integer NOT NULL DEFAULT 10 CHECK (minimum_data_purchases BETWEEN 1 AND 10000),
  maximum_winners integer NOT NULL DEFAULT 10 CHECK (maximum_winners BETWEEN 1 AND 100),
  opens_at timestamptz,
  closes_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CHECK (closes_at IS NULL OR opens_at IS NULL OR closes_at > opens_at)
);
INSERT INTO public.weekend_giveaway_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.weekend_giveaway_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.weekend_giveaway_settings TO authenticated;
GRANT UPDATE ON public.weekend_giveaway_settings TO authenticated;
CREATE POLICY "Customers read weekend giveaway settings" ON public.weekend_giveaway_settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins update weekend giveaway settings" ON public.weekend_giveaway_settings
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE OR REPLACE FUNCTION public.touch_weekend_giveaway_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); NEW.updated_by = auth.uid(); RETURN NEW; END $$;
CREATE TRIGGER weekend_giveaway_settings_touch BEFORE UPDATE ON public.weekend_giveaway_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_weekend_giveaway_updated_at();

CREATE TABLE public.weekend_giveaway_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_key text NOT NULL,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','selected','not_selected','cancelled')),
  applied_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_key, user_id)
);
ALTER TABLE public.weekend_giveaway_applications ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.weekend_giveaway_applications TO authenticated;
CREATE POLICY "Customers read own giveaway applications" ON public.weekend_giveaway_applications
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Customers apply for giveaway" ON public.weekend_giveaway_applications
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins manage giveaway applications" ON public.weekend_giveaway_applications
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
