-- Featured Market Deals for dashboard merchandising.
alter table public.vendor_products
  add column if not exists is_featured boolean not null default false,
  add column if not exists featured_until timestamptz,
  add column if not exists featured_label text not null default 'Featured Deal'
    check (char_length(featured_label)<=40);

create index if not exists vendor_products_featured_idx
  on public.vendor_products(is_featured,featured_until,created_at desc)
  where is_featured=true;

create or replace function public.get_featured_market_deals()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',p.id,
    'title',p.title,
    'description',p.description,
    'category',p.category,
    'state',p.state,
    'price_kobo',p.price_kobo,
    'image_url',p.image_url,
    'is_available',p.is_available,
    'featured_label',p.featured_label,
    'store_name',s.store_name,
    'store_slug',s.slug
  ) order by p.created_at desc),'[]'::jsonb)
  from public.vendor_products p
  join public.vendor_stores s on s.id=p.store_id
  where p.is_available=true
    and p.is_featured=true
    and (p.featured_until is null or p.featured_until>now())
  limit 8;
$$;
grant execute on function public.get_featured_market_deals() to anon,authenticated;
