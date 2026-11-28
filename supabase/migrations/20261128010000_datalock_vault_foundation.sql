-- DataLock Vault foundational configuration and premium access flag.
CREATE TABLE IF NOT EXISTS public.datalock_vault_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id=true),
  enabled boolean NOT NULL DEFAULT false,
  premium_upgrade_price_kobo bigint NOT NULL DEFAULT 300000 CHECK (premium_upgrade_price_kobo>=0),
  daily_drip_enabled boolean NOT NULL DEFAULT true,
  pocket_safe_enabled boolean NOT NULL DEFAULT true,
  service_fee_mode text NOT NULL DEFAULT 'fixed' CHECK(service_fee_mode IN ('fixed','percentage')),
  service_fee_kobo bigint NOT NULL DEFAULT 0 CHECK(service_fee_kobo>=0),
  service_fee_percent numeric(6,3) NOT NULL DEFAULT 0 CHECK(service_fee_percent>=0 AND service_fee_percent<=100),
  minimum_release_mb integer NOT NULL DEFAULT 500 CHECK(minimum_release_mb>=100),
  maximum_release_mb integer NOT NULL DEFAULT 2000 CHECK(maximum_release_mb>=minimum_release_mb),
  schedules jsonb NOT NULL DEFAULT '[1,2,3,7]'::jsonb,
  admin_notes text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
INSERT INTO public.datalock_vault_settings(id) VALUES(true) ON CONFLICT(id) DO NOTHING;
ALTER TABLE public.datalock_vault_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Vault settings readable by authenticated" ON public.datalock_vault_settings;
CREATE POLICY "Vault settings readable by authenticated" ON public.datalock_vault_settings FOR SELECT TO authenticated USING(true);
DROP POLICY IF EXISTS "Vault settings admin writes" ON public.datalock_vault_settings;
CREATE POLICY "Vault settings admin writes" ON public.datalock_vault_settings FOR UPDATE TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_tier text NOT NULL DEFAULT 'starter' CHECK(account_tier IN ('starter','premium'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS datalock_premium_activated_at timestamptz;
