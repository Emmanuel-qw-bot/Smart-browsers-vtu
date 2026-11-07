CREATE TABLE public.vtu_providers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
 adapter text NOT NULL CHECK (adapter IN ('arewabundle','unimplemented')),
 enabled boolean NOT NULL DEFAULT false CHECK (enabled = false),
 data_enabled boolean NOT NULL DEFAULT false,
 airtime_enabled boolean NOT NULL DEFAULT false,
 connection_status text NOT NULL DEFAULT 'not_tested' CHECK (connection_status IN ('not_tested','authenticated','error','not_configured')),
 last_authenticated_at timestamptz,
 last_checked_at timestamptz,
 last_error text,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX vtu_one_arewabundle ON public.vtu_providers(adapter) WHERE adapter = 'arewabundle';
GRANT SELECT, INSERT, UPDATE ON public.vtu_providers TO authenticated;
GRANT ALL ON public.vtu_providers TO service_role;
ALTER TABLE public.vtu_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY vtu_providers_admin ON public.vtu_providers FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
COMMENT ON COLUMN public.vtu_providers.enabled IS 'Safety gate: customer purchases remain disabled until provider response semantics and controlled tests are verified.';
CREATE TABLE public.vtu_products (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 provider_id uuid NOT NULL REFERENCES public.vtu_providers(id),
 service text NOT NULL CHECK (service IN ('data','airtime')),
 network_name text NOT NULL CHECK (char_length(network_name) BETWEEN 2 AND 80),
 network_id integer NOT NULL CHECK (network_id > 0),
 plan_name text NOT NULL CHECK (char_length(plan_name) BETWEEN 2 AND 100),
 data_plan_id integer CHECK (data_plan_id > 0),
 plan_type text,
 validity text,
 cost_kobo bigint CHECK (cost_kobo > 0 AND cost_kobo <= 10000000),
 selling_price_kobo bigint CHECK (selling_price_kobo > 0 AND selling_price_kobo <= 10000000),
 min_amount_kobo bigint CHECK (min_amount_kobo > 0 AND min_amount_kobo <= 10000000),
 max_amount_kobo bigint CHECK (max_amount_kobo > 0 AND max_amount_kobo <= 10000000),
 markup_percent numeric NOT NULL DEFAULT 0 CHECK (markup_percent BETWEEN 0 AND 100),
 active boolean NOT NULL DEFAULT false,
 archived boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((service = 'data' AND data_plan_id IS NOT NULL AND selling_price_kobo IS NOT NULL) OR (service = 'airtime' AND data_plan_id IS NULL)),
 CHECK (max_amount_kobo IS NULL OR min_amount_kobo IS NULL OR max_amount_kobo >= min_amount_kobo)
);
GRANT SELECT, INSERT, UPDATE ON public.vtu_products TO authenticated;
GRANT ALL ON public.vtu_products TO service_role;
ALTER TABLE public.vtu_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY vtu_products_admin ON public.vtu_products FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TABLE public.vtu_configuration_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid, entity_id uuid NOT NULL,
 entity_type text NOT NULL, action text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vtu_configuration_audit TO authenticated;
GRANT ALL ON public.vtu_configuration_audit TO service_role;
ALTER TABLE public.vtu_configuration_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY vtu_audit_admin ON public.vtu_configuration_audit FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE FUNCTION public.audit_vtu_configuration() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 INSERT INTO public.vtu_configuration_audit(actor_id,entity_id,entity_type,action) VALUES(auth.uid(),NEW.id,TG_TABLE_NAME,TG_OP);
 RETURN NEW;
END $$;
CREATE TRIGGER audit_vtu_provider AFTER INSERT OR UPDATE ON public.vtu_providers FOR EACH ROW EXECUTE FUNCTION public.audit_vtu_configuration();
CREATE TRIGGER audit_vtu_product AFTER INSERT OR UPDATE ON public.vtu_products FOR EACH ROW EXECUTE FUNCTION public.audit_vtu_configuration();