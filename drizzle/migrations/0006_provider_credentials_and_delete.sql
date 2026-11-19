ALTER TABLE public.vtu_providers
ADD COLUMN IF NOT EXISTS api_token_encrypted text,
ADD COLUMN IF NOT EXISTS transaction_pin_encrypted text;

ALTER TABLE public.vtu_products
DROP CONSTRAINT IF EXISTS vtu_products_provider_id_fkey;

ALTER TABLE public.vtu_products
ADD CONSTRAINT vtu_products_provider_id_fkey
FOREIGN KEY (provider_id) REFERENCES public.vtu_providers(id) ON DELETE CASCADE;
