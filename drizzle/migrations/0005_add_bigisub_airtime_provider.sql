ALTER TABLE public.vtu_providers
DROP CONSTRAINT IF EXISTS vtu_providers_adapter_check;

ALTER TABLE public.vtu_providers
ADD CONSTRAINT vtu_providers_adapter_check
CHECK (adapter IN ('arewabundle', 'bigisub', 'unimplemented'));

CREATE UNIQUE INDEX IF NOT EXISTS vtu_one_big isub
ON public.vtu_providers(adapter)
WHERE adapter = 'bigisub';
