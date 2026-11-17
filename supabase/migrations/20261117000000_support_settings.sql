CREATE TABLE IF NOT EXISTS public.support_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  phone text NOT NULL DEFAULT '',
  whatsapp_number text NOT NULL DEFAULT '',
  support_email text NOT NULL DEFAULT 'smartbrowsers9@gmail.com',
  whatsapp_group_url text NOT NULL DEFAULT '',
  support_hours text NOT NULL DEFAULT 'Monday - Saturday, 8:00 AM - 8:00 PM',
  phone_enabled boolean NOT NULL DEFAULT true,
  whatsapp_enabled boolean NOT NULL DEFAULT true,
  email_enabled boolean NOT NULL DEFAULT true,
  group_enabled boolean NOT NULL DEFAULT true,
  floating_button_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
INSERT INTO public.support_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.support_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.support_settings TO anon, authenticated;
GRANT UPDATE ON public.support_settings TO authenticated;
DROP POLICY IF EXISTS "Anyone can read support channels" ON public.support_settings;
CREATE POLICY "Anyone can read support channels" ON public.support_settings
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Admins update support channels" ON public.support_settings;
CREATE POLICY "Admins update support channels" ON public.support_settings
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE OR REPLACE FUNCTION public.touch_support_settings_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS support_settings_touch ON public.support_settings;
CREATE TRIGGER support_settings_touch BEFORE UPDATE ON public.support_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_support_settings_updated_at();
