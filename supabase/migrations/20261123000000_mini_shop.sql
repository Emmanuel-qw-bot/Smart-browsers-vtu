-- Smart Browsers Mini Shop: vendor stores, catalogue and receipts.
create table if not exists public.vendor_stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,39}$'),
  store_name text not null check (char_length(trim(store_name)) between 2 and 80),
  tagline text not null default '' check (char_length(tagline)<=140),
  whatsapp_phone text not null default '',
  pickup_delivery_note text not null default '' check (char_length(pickup_delivery_note)<=500),
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.vendor_products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.vendor_stores(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  description text not null default '' check (char_length(description)<=1000),
  category text not null default 'Other' check (char_length(category)<=60),
  price_kobo bigint not null check (price_kobo>0),
  stock_quantity integer check (stock_quantity is null or stock_quantity>=0),
  image_url text,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists vendor_products_store_idx on public.vendor_products(store_id,created_at desc);
create table if not exists public.vendor_receipts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.vendor_stores(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  receipt_number text not null unique default ('SB-R-'||to_char(now(),'YYMMDD')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6))),
  customer_name text not null default '' check (char_length(customer_name)<=100),
  customer_phone text not null default '' check (char_length(customer_phone)<=30),
  items jsonb not null check (jsonb_typeof(items)='array'),
  subtotal_kobo bigint not null check (subtotal_kobo>0),
  payment_status text not null default 'paid' check (payment_status in ('paid','unpaid')),
  payment_confirmation text not null default 'seller_confirmed' check (payment_confirmation in ('seller_confirmed','not_confirmed')),
  note text not null default '' check (char_length(note)<=300),
  created_at timestamptz not null default now()
);
create index if not exists vendor_receipts_owner_idx on public.vendor_receipts(owner_id,created_at desc);

alter table public.vendor_stores enable row level security;
alter table public.vendor_products enable row level security;
alter table public.vendor_receipts enable row level security;
grant select,insert,update,delete on public.vendor_stores,public.vendor_products to authenticated;
grant select,insert on public.vendor_receipts to authenticated;
grant all on public.vendor_stores,public.vendor_products,public.vendor_receipts to service_role;

drop policy if exists "Public can view store profiles" on public.vendor_stores;
create policy "Public can view store profiles" on public.vendor_stores for select using (true);
drop policy if exists "Owners manage their stores" on public.vendor_stores;
create policy "Owners manage their stores" on public.vendor_stores for all to authenticated using (owner_id=auth.uid()) with check (owner_id=auth.uid());

drop policy if exists "Public view available products" on public.vendor_products;
create policy "Public view available products" on public.vendor_products for select using (is_available=true);
drop policy if exists "Owners manage their products" on public.vendor_products;
create policy "Owners manage their products" on public.vendor_products for all to authenticated using (owner_id=auth.uid()) with check (owner_id=auth.uid());

drop policy if exists "Owners view their receipts" on public.vendor_receipts;
create policy "Owners view their receipts" on public.vendor_receipts for select to authenticated using (owner_id=auth.uid());
drop policy if exists "Owners create their receipts" on public.vendor_receipts;
create policy "Owners create their receipts" on public.vendor_receipts for insert to authenticated with check (owner_id=auth.uid());

