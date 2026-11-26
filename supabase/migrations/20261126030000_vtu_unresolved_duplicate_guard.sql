-- Prevent concurrent/retried equivalent purchases from being debited while
-- a previous outcome is unresolved, including after browser reload/new request ID.
CREATE UNIQUE INDEX IF NOT EXISTS vtu_purchase_attempts_unresolved_fingerprint_unique
  ON public.vtu_purchase_attempts (
    user_id,
    service,
    network_name,
    phone,
    COALESCE(product_id, '00000000-0000-0000-0000-000000000000'::uuid),
    amount_kobo
  )
  WHERE status IN ('initiated','debited','pending','uncertain','refund_failed');
