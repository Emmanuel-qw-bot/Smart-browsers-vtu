-- Durable tracking for VTU purchase/refund safety across providers.
CREATE TABLE IF NOT EXISTS public.vtu_purchase_attempts (
  reference text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service text NOT NULL CHECK (service IN ('data','airtime')),
  provider text NOT NULL CHECK (provider IN ('arewabundle','bigisub')),
  product_id uuid REFERENCES public.vtu_products(id) ON DELETE SET NULL,
  network_name text NOT NULL,
  phone text NOT NULL,
  amount_kobo bigint NOT NULL CHECK (amount_kobo > 0),
  status text NOT NULL DEFAULT 'initiated'
    CHECK (status IN ('initiated','debit_failed','debited','pending','uncertain','successful','refunded','refund_failed')),
  provider_reference text,
  provider_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vtu_purchase_attempts_status_created_idx
  ON public.vtu_purchase_attempts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS vtu_purchase_attempts_user_created_idx
  ON public.vtu_purchase_attempts(user_id, created_at DESC);
ALTER TABLE public.vtu_purchase_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.vtu_purchase_attempts FROM anon, authenticated;
GRANT ALL ON public.vtu_purchase_attempts TO service_role;
