CREATE TABLE IF NOT EXISTS public.bigisub_airtime_pending (
  reference text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider_transaction_id text,
  network_name text NOT NULL,
  phone text NOT NULL,
  amount_naira integer NOT NULL CHECK (amount_naira >= 25),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','uncertain','successful','failed','refunded')),
  provider_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_checked_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bigisub_airtime_pending_status_idx
  ON public.bigisub_airtime_pending(status, created_at DESC);
ALTER TABLE public.bigisub_airtime_pending ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.bigisub_airtime_pending FROM anon, authenticated;
GRANT ALL ON public.bigisub_airtime_pending TO service_role;
