CREATE TYPE public.wallet_txn_category AS ENUM ('deposit','promotional','reward','purchase','refund');

CREATE TABLE public.wallets (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance_kobo bigint NOT NULL DEFAULT 0 CHECK (balance_kobo >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own wallet or admin" ON public.wallets FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.wallets(user_id) ON DELETE CASCADE,
  category public.wallet_txn_category NOT NULL,
  amount_kobo bigint NOT NULL CHECK (amount_kobo <> 0),
  balance_after_kobo bigint NOT NULL CHECK (balance_after_kobo >= 0),
  reference text NOT NULL UNIQUE,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((category IN ('deposit','promotional','reward','refund') AND amount_kobo > 0)
      OR (category = 'purchase' AND amount_kobo < 0))
);
CREATE INDEX wallet_transactions_user_idx ON public.wallet_transactions(user_id, created_at DESC);
GRANT SELECT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own transactions or admin" ON public.wallet_transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Ledger is append-only
CREATE FUNCTION public.prevent_ledger_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Wallet ledger entries cannot be changed or deleted'; END $$;
CREATE TRIGGER wallet_transactions_immutable BEFORE UPDATE OR DELETE ON public.wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_ledger_change();

-- Single atomic entry point for every balance change. Idempotent on reference.
CREATE FUNCTION public.wallet_post(_user_id uuid, _category public.wallet_txn_category, _amount_kobo bigint, _reference text, _description text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _bal bigint; _id uuid;
BEGIN
  SELECT id INTO _id FROM wallet_transactions WHERE reference = _reference;
  IF _id IS NOT NULL THEN RETURN _id; END IF;
  SELECT balance_kobo INTO _bal FROM wallets WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet not found'; END IF;
  IF _bal + _amount_kobo < 0 THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;
  INSERT INTO wallet_transactions(user_id, category, amount_kobo, balance_after_kobo, reference, description)
    VALUES (_user_id, _category, _amount_kobo, _bal + _amount_kobo, _reference, _description)
    ON CONFLICT (reference) DO NOTHING RETURNING id INTO _id;
  IF _id IS NULL THEN
    SELECT id INTO _id FROM wallet_transactions WHERE reference = _reference; RETURN _id;
  END IF;
  UPDATE wallets SET balance_kobo = _bal + _amount_kobo, updated_at = now() WHERE user_id = _user_id;
  RETURN _id;
END $$;
REVOKE EXECUTE ON FUNCTION public.wallet_post(uuid, public.wallet_txn_category, bigint, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_post(uuid, public.wallet_txn_category, bigint, text, text) TO service_role;

-- Welcome bonus settings (singleton)
CREATE TABLE public.welcome_bonus_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  enabled boolean NOT NULL DEFAULT true,
  amount_kobo bigint NOT NULL DEFAULT 10000 CHECK (amount_kobo > 0 AND amount_kobo <= 10000000),
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.welcome_bonus_settings DEFAULT VALUES;
GRANT SELECT ON public.welcome_bonus_settings TO anon, authenticated;
GRANT UPDATE (enabled, amount_kobo) ON public.welcome_bonus_settings TO authenticated;
GRANT ALL ON public.welcome_bonus_settings TO service_role;
ALTER TABLE public.welcome_bonus_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads bonus settings" ON public.welcome_bonus_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins update bonus settings" ON public.welcome_bonus_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE FUNCTION public.stamp_bonus_settings() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_by := auth.uid(); NEW.updated_at := now(); RETURN NEW; END $$;
CREATE TRIGGER welcome_bonus_settings_stamp BEFORE UPDATE ON public.welcome_bonus_settings
  FOR EACH ROW EXECUTE FUNCTION public.stamp_bonus_settings();

-- Wallet for every profile
CREATE FUNCTION public.handle_new_profile_wallet() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN INSERT INTO wallets(user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING; RETURN NEW; END $$;
CREATE TRIGGER profiles_create_wallet AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile_wallet();
INSERT INTO public.wallets(user_id) SELECT id FROM public.profiles ON CONFLICT DO NOTHING;

-- Welcome bonus: once per customer, when phone becomes verified
CREATE FUNCTION public.grant_welcome_bonus() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s welcome_bonus_settings;
BEGIN
  IF NEW.phone_verified AND NOT COALESCE(OLD.phone_verified, false) THEN
    SELECT * INTO s FROM welcome_bonus_settings WHERE id;
    IF s.enabled THEN
      PERFORM wallet_post(NEW.id, 'promotional', s.amount_kobo, 'welcome-bonus:' || NEW.id, 'Welcome bonus');
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER profiles_welcome_bonus AFTER UPDATE OF phone_verified ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.grant_welcome_bonus();
REVOKE EXECUTE ON FUNCTION public.grant_welcome_bonus() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_profile_wallet() FROM PUBLIC, anon, authenticated;