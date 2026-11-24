-- Add product category/state metadata for Smart Browsers Market.
alter table public.vendor_products add column if not exists state text not null default '';
create index if not exists vendor_products_market_idx on public.vendor_products(is_available,state,category,created_at desc);
