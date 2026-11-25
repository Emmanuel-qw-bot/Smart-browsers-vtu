-- Seller-managed promotional campaigns with controlled discounts and date windows.
create table if not exists public.vendor_product_campaigns (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.vendor_stores(id) on delete cascade,
  product_id uuid not null references public.vendor_products(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 80),
  campaign_type text not null check (campaign_type in ('percentage','fixed_price')),
  discount_percent numeric(5,2),
  promotional_price_kobo bigint,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint campaign_dates_valid check (ends_at>starts_at),
  constraint campaign_discount_valid check (
    (campaign_type='percentage' and discount_percent>0 and discount_percent<90 and promotional_price_kobo is null)
    or
    (campaign_type='fixed_price' and promotional_price_kobo>0 and discount_percent is null)
  )
);
create index if not exists vendor_campaigns_active_dates_idx
  on public.vendor_product_campaigns(is_active,starts_at,ends_at);
alter table public.vendor_product_campaigns enable row level security;
drop policy if exists "Owners manage campaigns for their store" on public.vendor_product_campaigns;
create policy "Owners manage campaigns for their store" on public.vendor_product_campaigns
for all to authenticated
using (exists(select 1 from public.vendor_stores s where s.id=store_id and s.owner_id=auth.uid()))
with check (exists(select 1 from public.vendor_stores s where s.id=store_id and s.owner_id=auth.uid()));

create or replace function public.get_active_market_campaigns()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
 select coalesce(jsonb_agg(jsonb_build_object(
   'campaign_id',c.id,'campaign_title',c.title,'campaign_type',c.campaign_type,
   'discount_percent',c.discount_percent,'promotional_price_kobo',c.promotional_price_kobo,
   'starts_at',c.starts_at,'ends_at',c.ends_at,
   'product_id',p.id,'product_title',p.title,'product_description',p.description,
   'category',p.category,'state',p.state,'original_price_kobo',p.price_kobo,
   'image_url',p.image_url,'store_name',s.store_name,'store_slug',s.slug
 ) order by c.ends_at asc),'[]'::jsonb)
 from public.vendor_product_campaigns c
 join public.vendor_products p on p.id=c.product_id
 join public.vendor_stores s on s.id=c.store_id
 where c.is_active=true and c.starts_at<=now() and c.ends_at>now()
 and p.is_available=true;
$$;
grant execute on function public.get_active_market_campaigns() to anon,authenticated;
