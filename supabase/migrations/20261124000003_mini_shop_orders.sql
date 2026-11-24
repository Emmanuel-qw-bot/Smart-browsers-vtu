-- Mini Shop order management: public buyers place orders, only the owning seller can read/manage them.
create table if not exists public.vendor_orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.vendor_stores(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  order_number text not null unique default ('SB-ORD-'||to_char(now(),'YYMMDD')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6))),
  buyer_name text not null check (char_length(trim(buyer_name)) between 2 and 100),
  buyer_phone text not null check (char_length(trim(buyer_phone)) between 7 and 30),
  delivery_location text not null check (char_length(trim(delivery_location)) between 2 and 300),
  buyer_note text not null default '' check (char_length(buyer_note)<=500),
  status text not null default 'pending' check (status in ('pending','confirmed','processing','delivered','cancelled','rejected')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','part_paid','paid')),
  total_kobo bigint not null check (total_kobo>0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.vendor_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.vendor_orders(id) on delete cascade,
  product_id uuid references public.vendor_products(id) on delete set null,
  product_title text not null,
  product_image_url text,
  quantity integer not null check (quantity between 1 and 99),
  unit_price_kobo bigint not null check (unit_price_kobo>0),
  line_total_kobo bigint not null check (line_total_kobo>0)
);
create index if not exists vendor_orders_owner_created_idx on public.vendor_orders(owner_id,created_at desc);
create index if not exists vendor_orders_store_status_idx on public.vendor_orders(store_id,status,created_at desc);
create index if not exists vendor_order_items_order_idx on public.vendor_order_items(order_id);

alter table public.vendor_orders enable row level security;
alter table public.vendor_order_items enable row level security;
grant select,update on public.vendor_orders to authenticated;
grant select on public.vendor_order_items to authenticated;
grant all on public.vendor_orders,public.vendor_order_items to service_role;
drop policy if exists "Owners read their orders" on public.vendor_orders;
create policy "Owners read their orders" on public.vendor_orders for select to authenticated using(owner_id=auth.uid());
drop policy if exists "Owners update their orders" on public.vendor_orders;
create policy "Owners update their orders" on public.vendor_orders for update to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
drop policy if exists "Owners read their order items" on public.vendor_order_items;
create policy "Owners read their order items" on public.vendor_order_items for select to authenticated using(exists(select 1 from public.vendor_orders o where o.id=order_id and o.owner_id=auth.uid()));

create or replace function public.create_vendor_order(
  _product_id uuid,
  _buyer_name text,
  _buyer_phone text,
  _delivery_location text,
  _quantity integer,
  _buyer_note text default ''
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare p public.vendor_products%rowtype; s public.vendor_stores%rowtype; o public.vendor_orders%rowtype; total bigint;
begin
  if char_length(trim(coalesce(_buyer_name,''))) not between 2 and 100 then raise exception 'Enter your full name.'; end if;
  if char_length(trim(coalesce(_buyer_phone,''))) not between 7 and 30 then raise exception 'Enter a valid phone number.'; end if;
  if char_length(trim(coalesce(_delivery_location,''))) not between 2 and 300 then raise exception 'Enter your delivery or pickup location.'; end if;
  if _quantity is null or _quantity not between 1 and 99 then raise exception 'Quantity must be between 1 and 99.'; end if;
  select * into p from public.vendor_products where id=_product_id and is_available=true for share;
  if not found then raise exception 'This product is unavailable.'; end if;
  if p.stock_quantity is not null and p.stock_quantity<_quantity then raise exception 'Not enough stock available for this quantity.'; end if;
  select * into s from public.vendor_stores where id=p.store_id;
  if not found then raise exception 'Seller shop not found.'; end if;
  total:=p.price_kobo*_quantity;
  insert into public.vendor_orders(store_id,owner_id,buyer_name,buyer_phone,delivery_location,buyer_note,total_kobo)
  values(s.id,s.owner_id,trim(_buyer_name),trim(_buyer_phone),trim(_delivery_location),left(coalesce(_buyer_note,''),500),total)
  returning * into o;
  insert into public.vendor_order_items(order_id,product_id,product_title,product_image_url,quantity,unit_price_kobo,line_total_kobo)
  values(o.id,p.id,p.title,p.image_url,_quantity,p.price_kobo,total);
  return jsonb_build_object('order_id',o.id,'order_number',o.order_number,'total_kobo',o.total_kobo,'store_name',s.store_name);
end;
$$;
revoke all on function public.create_vendor_order(uuid,text,text,text,integer,text) from public;
grant execute on function public.create_vendor_order(uuid,text,text,text,integer,text) to anon,authenticated;

