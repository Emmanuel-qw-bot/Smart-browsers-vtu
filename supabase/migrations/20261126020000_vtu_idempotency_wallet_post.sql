ALTER TABLE public.vtu_purchase_attempts
  ADD COLUMN IF NOT EXISTS request_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS vtu_purchase_attempts_user_request_unique
  ON public.vtu_purchase_attempts(user_id, request_id)
  WHERE request_id IS NOT NULL;

-- Make wallet_post idempotency safe: reusing a reference with different
-- transaction details must fail instead of silently returning an old ledger ID.
CREATE OR REPLACE FUNCTION public.wallet_post(
  _user_id uuid,
  _category public.wallet_txn_category,
  _amount_kobo bigint,
  _reference text,
  _description text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _bal bigint;
  _id uuid;
  _existing_user uuid;
  _existing_category public.wallet_txn_category;
  _existing_amount bigint;
BEGIN
  SELECT id, user_id, category, amount_kobo
    INTO _id, _existing_user, _existing_category, _existing_amount
    FROM wallet_transactions
    WHERE reference = _reference;

  IF _id IS NOT NULL THEN
    IF _existing_user <> _user_id OR _existing_category <> _category OR _existing_amount <> _amount_kobo THEN
      RAISE EXCEPTION 'Idempotency reference conflicts with a different transaction';
    END IF;
    RETURN _id;
  END IF;

  SELECT balance_kobo INTO _bal
    FROM wallets WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet not found'; END IF;
  IF _bal + _amount_kobo < 0 THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;

  INSERT INTO wallet_transactions(user_id, category, amount_kobo, balance_after_kobo, reference, description)
    VALUES (_user_id, _category, _amount_kobo, _bal + _amount_kobo, _reference, _description)
    ON CONFLICT (reference) DO NOTHING
    RETURNING id INTO _id;

  IF _id IS NULL THEN
    SELECT id, user_id, category, amount_kobo
      INTO _id, _existing_user, _existing_category, _existing_amount
      FROM wallet_transactions WHERE reference = _reference;
    IF _existing_user <> _user_id OR _existing_category <> _category OR _existing_amount <> _amount_kobo THEN
      RAISE EXCEPTION 'Idempotency reference conflicts with a different transaction';
    END IF;
    RETURN _id;
  END IF;

  UPDATE wallets SET balance_kobo = _bal + _amount_kobo, updated_at = now()
    WHERE user_id = _user_id;
  RETURN _id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.wallet_post(uuid, public.wallet_txn_category, bigint, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_post(uuid, public.wallet_txn_category, bigint, text, text) TO service_role;
