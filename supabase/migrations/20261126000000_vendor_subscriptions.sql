-- Vendor subscriptions: editable plans, subscription ledger and atomic wallet purchase.
create table if not exists public.vendor_subscription_plans (
  plan_key text primary key check (plan_key in ('starter','pro','enterprise')),
  name text not null,
  description text not null default '',
  weekly_price_kobo bigint not null default 0 check (weekly_price_kobo>=0),
  monthly_price_kobo bigint not null default 0 check (monthly_price_kobo>=0),
  max_active_products integer, -- NULL means unlimited
  features jsonb not null default '{}'::jsonb,
  benefits jsonb not null default '[]'::jsonb,
  enabled boolean not null default true,
  popular boolean not null default false,
  grace_days integer not null default 3 check (grace_days between 0 and 30),
  updated_at timestamptz not null default now(),
  updated_by uuid
);
insert into public.vendor_subscription_plans(plan_key,name,description,weekly_price_kobo,monthly_price_kobo,max_active_products,features,benefits,popular)
values
('starter','Starter','Try selling online for free.',0,0,3,
 '{"verified_badge":false,"custom_branding":false,"remove_branding":false,"flyer_maker":false,"featured_homepage":false,"pin_category":false,"campaigns":false,"analytics":"basic","customer_book":false,"stock_alerts":false,"priority_listing":false}'::jsonb,
 '["3 active products","Mini shop and shareable product links","Receive orders","Basic receipts","Marketplace listing","Smart Browsers branding"]'::jsonb,false),
('pro','Pro Seller','Make your shop look professional and grow.',60000,150000,25,
 '{"verified_badge":true,"custom_branding":true,"remove_branding":true,"flyer_maker":true,"featured_homepage":false,"pin_category":false,"campaigns":false,"analytics":"standard","customer_book":true,"stock_alerts":true,"priority_listing":true}'::jsonb,
 '["25 active products","Verified Vendor badge","Your logo on receipts","WhatsApp Status flyer maker","Remove Smart Browsers branding","Stock alerts and customer book","Sales tracking"]'::jsonb,true),
('enterprise','Enterprise','More tools and visibility for bigger sellers.',0,250000,null,
 '{"verified_badge":true,"custom_branding":true,"remove_branding":true,"flyer_maker":true,"featured_homepage":true,"pin_category":true,"campaigns":true,"analytics":"advanced","customer_book":true,"stock_alerts":true,"priority_listing":true}'::jsonb,
 '["Unlimited products","Everything in Pro","Homepage featured deals","Pin shop to category top","Flash sales and campaigns","Advanced product views and order analytics"]'::jsonb,false)
on conflict(plan_key) do nothing;
alter table public.vendor_subscription_plans enable row level security;
grant select on public.vendor_subscription_plans to anon,authenticated;
grant update,insert,delete on public.vendor_subscription_plans to authenticated;
grant all on public.vendor_subscription_plans to service_role;
drop policy if exists "Read enabled plans" on public.vendor_subscription_plans;
create policy "Read enabled plans" on public.vendor_subscription_plans for select using (enabled or public.has_role(auth.uid(),'admin'));
drop policy if exists "Admins manage plans" on public.vendor_subscription_plans;
create policy "Admins manage plans" on public.vendor_subscription_plans for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table if not exists public.vendor_subscriptions (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.profiles(id) on delete cascade,
 plan_key text not null references public.vendor_subscription_plans(plan_key),
 status text not null default 'active' check(status in ('active','expired','cancelled','grace')),
 billing_period text not null check(billing_period in ('weekly','monthly','free','admin_grant')),
 started_at timestamptz not null default now(),
 expires_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists vendor_subscriptions_owner_idx on public.vendor_subscriptions(owner_id,expires_at desc);
alter table public.vendor_subscriptions enable row level security;
grant select on public.vendor_subscriptions to authenticated;
grant all on public.vendor_subscriptions to service_role;
drop policy if exists "Vendors read own subscriptions" on public.vendor_subscriptions;
create policy "Vendors read own subscriptions" on public.vendor_subscriptions for select to authenticated using(owner_id=auth.uid() or public.has_role(auth.uid(),'admin'));

create or replace function public.purchase_vendor_subscription(_plan_key text,_billing_period text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare p public.vendor_subscription_plans%rowtype; current_sub public.vendor_subscriptions%rowtype; price bigint; days integer; wallet_bal bigint; ref text; sid uuid;
begin
 if auth.uid() is null then raise exception 'Sign in to subscribe.'; end if;
 if _plan_key not in ('pro','enterprise') or _billing_period not in ('weekly','monthly') then raise exception 'Invalid plan or billing option.'; end if;
 select * into p from vendor_subscription_plans where plan_key=_plan_key and enabled=true;
 if not found then raise exception 'This plan is not available right now.'; end if;
 price:=case when _billing_period='weekly' then p.weekly_price_kobo else p.monthly_price_kobo end;
 if price<=0 then raise exception 'This plan has no payable subscription price.'; end if;
 select * into current_sub from vendor_subscriptions where owner_id=auth.uid() and status='active' and expires_at>now() order by expires_at desc limit 1;
 if current_sub.id is not null and current_sub.plan_key=_plan_key then raise exception 'You already have this plan active.'; end if;
 select balance_kobo into wallet_bal from wallets where user_id=auth.uid() for update;
 if wallet_bal is null then raise exception 'Wallet not found.'; end if;
 if wallet_bal<price then raise exception 'Insufficient wallet balance. Please fund your wallet first.'; end if;
 ref:='vendor-subscription:'||auth.uid()::text||':'||gen_random_uuid()::text;
 perform wallet_post(auth.uid(),'purchase',-price,ref,'Vendor subscription: '||p.name||' ('||_billing_period||')');
 days:=case when _billing_period='weekly' then 7 else 30 end;
 update vendor_subscriptions set status='expired',updated_at=now() where owner_id=auth.uid() and status='active';
 insert into vendor_subscriptions(owner_id,plan_key,status,billing_period,started_at,expires_at)
 values(auth.uid(),_plan_key,'active',_billing_period,now(),now()+make_interval(days=>days)) returning id into sid;
 return jsonb_build_object('subscription_id',sid,'plan',_plan_key,'expires_at',now()+make_interval(days=>days),'charged_kobo',price);
end $$;
revoke execute on function public.purchase_vendor_subscription(text,text) from public,anon;
grant execute on function public.purchase_vendor_subscription(text,text) to authenticated;

-- Feature entitlements are checked server-side, not only hidden in the UI.
create or replace function public.vendor_feature_enabled(_owner uuid,_feature text)
returns boolean language sql stable security definer set search_path=public as $$
 select coalesce((p.features->>_feature)::boolean,false)
 from vendor_subscription_plans p
 where p.plan_key=(
   select s.plan_key from vendor_subscriptions s
   where s.owner_id=_owner and s.status='active' and s.expires_at>now()
   order by s.expires_at desc limit 1
 )
 union all
 select coalesce((p.features->>_feature)::boolean,false)
 from vendor_subscription_plans p
 where p.plan_key='starter'
 and not exists(select 1 from vendor_subscriptions s where s.owner_id=_owner and s.status='active' and s.expires_at>now())
 limit 1;
$$;
revoke execute on function public.vendor_feature_enabled(uuid,text) from public,anon;
grant execute on function public.vendor_feature_enabled(uuid,text) to authenticated;

drop policy if exists "Owners manage campaigns for their store" on public.vendor_product_campaigns;
create policy "Owners manage campaigns for their store" on public.vendor_product_campaigns
for all to authenticated
using (exists(select 1 from public.vendor_stores s where s.id=store_id and s.owner_id=auth.uid()))
with check (
 exists(select 1 from public.vendor_stores s where s.id=store_id and s.owner_id=auth.uid())
 and public.vendor_feature_enabled(auth.uid(),'campaigns')
);

-- Server-side product limit guard prevents direct API writes from bypassing plans.
create or replace function public.vendor_active_product_limit(_owner uuid)
returns integer language sql stable security definer set search_path=public as $$
 select p.max_active_products
 from vendor_subscription_plans p
 where p.plan_key=coalesce((
   select s.plan_key from vendor_subscriptions s
   where s.owner_id=_owner and s.status='active' and s.expires_at>now()
   order by s.expires_at desc limit 1
 ),'starter')
 limit 1;
$$;
revoke execute on function public.vendor_active_product_limit(uuid) from public,anon;
grant execute on function public.vendor_active_product_limit(uuid) to anon,authenticated;

create or replace function public.guard_vendor_product_limit()
returns trigger language plpgsql security definer set search_path=public as $$
declare product_limit integer; active_count integer;
begin
 if new.is_available is not true then return new; end if;
 product_limit:=vendor_active_product_limit(new.owner_id);
 if product_limit is null then return new; end if;
 select count(*) into active_count from vendor_products
 where owner_id=new.owner_id and store_id=new.store_id and is_available=true
 and (tg_op='INSERT' or id<>new.id);
 if active_count>=product_limit then
   raise exception 'Your plan allows % active products. Upgrade your plan or make another product inactive.',product_limit;
 end if;
 return new;
end $$;
drop trigger if exists vendor_product_plan_limit on public.vendor_products;
create trigger vendor_product_plan_limit before insert or update of is_available on public.vendor_products
for each row execute function public.guard_vendor_product_limit();

-- When a plan expires or its limit is reduced, keep excess products saved but hide them from public listings.
drop policy if exists "Public view available products" on public.vendor_products;
create policy "Public view available products within plan limits" on public.vendor_products
for select using (
 is_available=true and (
   public.vendor_active_product_limit(owner_id) is null
   or (
     select count(*) from public.vendor_products newer
     where newer.store_id=vendor_products.store_id and newer.is_available=true
       and (newer.created_at>vendor_products.created_at or (newer.created_at=vendor_products.created_at and newer.id>vendor_products.id))
   ) < public.vendor_active_product_limit(owner_id)
 )
);

-- SECURITY DEFINER helper avoids recursive RLS when ranking public product listings.
create or replace function public.vendor_product_public_allowed(_product uuid,_owner uuid,_store uuid,_created_at timestamptz)
returns boolean language plpgsql stable security definer set search_path=public as $$
declare product_limit integer; ahead bigint;
begin
 product_limit:=vendor_active_product_limit(_owner);
 if product_limit is null then return true; end if;
 select count(*) into ahead from vendor_products newer
 where newer.store_id=_store and newer.is_available=true and newer.id<>_product
 and (newer.created_at>_created_at or (newer.created_at=_created_at and newer.id>_product));
 return ahead<product_limit;
end $$;
revoke execute on function public.vendor_product_public_allowed(uuid,uuid,uuid,timestamptz) from public;
grant execute on function public.vendor_product_public_allowed(uuid,uuid,uuid,timestamptz) to anon,authenticated;
drop policy if exists "Public view available products within plan limits" on public.vendor_products;
create policy "Public view available products within plan limits" on public.vendor_products
for select using (is_available=true and public.vendor_product_public_allowed(id,owner_id,store_id,created_at));

-- Admin subscription grants and revocations. All actions are permission checked and recorded.
create table if not exists public.vendor_subscription_admin_log (
 id uuid primary key default gen_random_uuid(),
 admin_id uuid not null references public.profiles(id),
 vendor_id uuid not null references public.profiles(id),
 action text not null check(action in ('grant','revoke','expire')),
 plan_key text,
 subscription_id uuid,
 duration_days integer,
 reason text not null default '',
 created_at timestamptz not null default now()
);
alter table public.vendor_subscription_admin_log enable row level security;
grant select on public.vendor_subscription_admin_log to authenticated;
drop policy if exists "Admins read subscription audit" on public.vendor_subscription_admin_log;
create policy "Admins read subscription audit" on public.vendor_subscription_admin_log for select to authenticated using(public.has_role(auth.uid(),'admin'));
grant all on public.vendor_subscription_admin_log to service_role;

create or replace function public.admin_grant_vendor_subscription(_vendor_id uuid,_plan_key text,_duration_days integer,_reason text default '')
returns jsonb language plpgsql security definer set search_path=public as $$
declare sid uuid; p public.vendor_subscription_plans%rowtype;
begin
 if auth.uid() is null or not public.has_role(auth.uid(),'admin') then raise exception 'Admin access required.'; end if;
 if _plan_key not in ('pro','enterprise') then raise exception 'Choose Pro or Enterprise.'; end if;
 if _duration_days<1 or _duration_days>365 then raise exception 'Duration must be 1 to 365 days.'; end if;
 select * into p from vendor_subscription_plans where plan_key=_plan_key;
 if not found then raise exception 'Plan not found.'; end if;
 update vendor_subscriptions set status='expired',updated_at=now() where owner_id=_vendor_id and status in ('active','grace');
 insert into vendor_subscriptions(owner_id,plan_key,status,billing_period,started_at,expires_at)
 values(_vendor_id,_plan_key,'active','admin_grant',now(),now()+make_interval(days=>_duration_days)) returning id into sid;
 insert into vendor_subscription_admin_log(admin_id,vendor_id,action,plan_key,subscription_id,duration_days,reason)
 values(auth.uid(),_vendor_id,'grant',_plan_key,sid,_duration_days,left(coalesce(_reason,''),300));
 return jsonb_build_object('subscription_id',sid,'vendor_id',_vendor_id,'plan',_plan_key,'expires_at',now()+make_interval(days=>_duration_days));
end $$;
revoke execute on function public.admin_grant_vendor_subscription(uuid,text,integer,text) from public,anon;
grant execute on function public.admin_grant_vendor_subscription(uuid,text,integer,text) to authenticated;

create or replace function public.admin_revoke_vendor_subscription(_subscription_id uuid,_reason text default '')
returns boolean language plpgsql security definer set search_path=public as $$
declare s vendor_subscriptions%rowtype;
begin
 if auth.uid() is null or not public.has_role(auth.uid(),'admin') then raise exception 'Admin access required.'; end if;
 select * into s from vendor_subscriptions where id=_subscription_id for update;
 if not found then raise exception 'Subscription not found.'; end if;
 update vendor_subscriptions set status='cancelled',expires_at=now(),updated_at=now() where id=_subscription_id;
 insert into vendor_subscription_admin_log(admin_id,vendor_id,action,plan_key,subscription_id,reason)
 values(auth.uid(),s.owner_id,'revoke',s.plan_key,s.id,left(coalesce(_reason,''),300));
 return true;
end $$;
revoke execute on function public.admin_revoke_vendor_subscription(uuid,text) from public,anon;
grant execute on function public.admin_revoke_vendor_subscription(uuid,text) to authenticated;

create or replace function public.admin_refresh_vendor_subscription_expiry()
returns integer language plpgsql security definer set search_path=public as $$
declare n integer;
begin
 if auth.uid() is null or not public.has_role(auth.uid(),'admin') then raise exception 'Admin access required.'; end if;
 update vendor_subscriptions set status='expired',updated_at=now()
 where status in ('active','grace') and expires_at is not null and expires_at<=now();
 get diagnostics n=row_count;
 return n;
end $$;
revoke execute on function public.admin_refresh_vendor_subscription_expiry() from public,anon;
grant execute on function public.admin_refresh_vendor_subscription_expiry() to authenticated;

-- Grace-period-aware plan resolution. Vendors keep their paid entitlements briefly after expiry.
create or replace function public.vendor_current_plan_key(_owner uuid)
returns text language sql stable security definer set search_path=public as $$
 select s.plan_key
 from vendor_subscriptions s join vendor_subscription_plans p on p.plan_key=s.plan_key
 where s.owner_id=_owner and s.status in ('active','grace')
 and s.expires_at is not null
 and now()<=s.expires_at+make_interval(days=>p.grace_days)
 order by s.expires_at desc limit 1;
$$;
revoke execute on function public.vendor_current_plan_key(uuid) from public;
grant execute on function public.vendor_current_plan_key(uuid) to anon,authenticated;

create or replace function public.vendor_feature_enabled(_owner uuid,_feature text)
returns boolean language sql stable security definer set search_path=public as $$
 select coalesce((p.features->>_feature)::boolean,false)
 from vendor_subscription_plans p
 where p.plan_key=coalesce(public.vendor_current_plan_key(_owner),'starter')
 limit 1;
$$;

create or replace function public.vendor_active_product_limit(_owner uuid)
returns integer language sql stable security definer set search_path=public as $$
 select p.max_active_products from vendor_subscription_plans p
 where p.plan_key=coalesce(public.vendor_current_plan_key(_owner),'starter') limit 1;
$$;

create or replace function public.admin_refresh_vendor_subscription_expiry()
returns integer language plpgsql security definer set search_path=public as $$
declare n integer;
begin
 if auth.uid() is null or not public.has_role(auth.uid(),'admin') then raise exception 'Admin access required.'; end if;
 update vendor_subscriptions s set status='grace',updated_at=now()
 from vendor_subscription_plans p
 where s.plan_key=p.plan_key and s.status='active' and s.expires_at<=now()
 and s.expires_at+make_interval(days=>p.grace_days)>now();
 update vendor_subscriptions s set status='expired',updated_at=now()
 from vendor_subscription_plans p
 where s.plan_key=p.plan_key and s.status in ('active','grace')
 and s.expires_at+make_interval(days=>p.grace_days)<=now();
 get diagnostics n=row_count;
 return n;
end $$;

-- Public storefront RPC must also respect the current vendor plan's product cap.
create or replace function public.get_vendor_storefront(_slug text)
returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object(
  'store',jsonb_build_object('slug',s.slug,'store_name',s.store_name,'tagline',s.tagline,'whatsapp_phone',s.whatsapp_phone,'pickup_delivery_note',s.pickup_delivery_note,'logo_url',s.logo_url),
  'products',coalesce((
   select jsonb_agg(jsonb_build_object('id',p.id,'title',p.title,'description',p.description,'category',p.category,'price_kobo',p.price_kobo,'image_url',p.image_url,'is_available',p.is_available) order by p.created_at desc)
   from public.vendor_products p
   where p.store_id=s.id and p.is_available=true
   and public.vendor_product_public_allowed(p.id,p.owner_id,p.store_id,p.created_at)
  ),'[]'::jsonb)
 )
 from public.vendor_stores s where s.slug=lower(trim(_slug)) limit 1;
$$;
grant execute on function public.get_vendor_storefront(text) to anon,authenticated;

-- Purchase/renewal and upgrades: carry remaining paid time forward instead of wasting it.
create or replace function public.purchase_vendor_subscription(_plan_key text,_billing_period text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare p public.vendor_subscription_plans%rowtype; current_sub public.vendor_subscriptions%rowtype; price bigint; days integer; wallet_bal bigint; ref text; sid uuid; base_time timestamptz; new_expiry timestamptz;
begin
 if auth.uid() is null then raise exception 'Sign in to subscribe.'; end if;
 if _plan_key not in ('pro','enterprise') or _billing_period not in ('weekly','monthly') then raise exception 'Invalid plan or billing option.'; end if;
 select * into p from vendor_subscription_plans where plan_key=_plan_key and enabled=true;
 if not found then raise exception 'This plan is not available right now.'; end if;
 price:=case when _billing_period='weekly' then p.weekly_price_kobo else p.monthly_price_kobo end;
 if price<=0 then raise exception 'This billing option is unavailable.'; end if;
 select * into current_sub from vendor_subscriptions s join vendor_subscription_plans oldp on oldp.plan_key=s.plan_key
 where s.owner_id=auth.uid() and s.status in ('active','grace') and s.expires_at+make_interval(days=>oldp.grace_days)>now()
 order by s.expires_at desc limit 1;
 if current_sub.id is not null and current_sub.plan_key=_plan_key and current_sub.expires_at>now() then
   base_time:=current_sub.expires_at;
 else
   base_time:=now();
   if current_sub.id is not null and current_sub.expires_at>now() then base_time:=current_sub.expires_at; end if;
 end if;
 select balance_kobo into wallet_bal from wallets where user_id=auth.uid() for update;
 if wallet_bal is null then raise exception 'Wallet not found.'; end if;
 if wallet_bal<price then raise exception 'Insufficient wallet balance. Please fund your wallet first.'; end if;
 ref:='vendor-subscription:'||auth.uid()::text||':'||gen_random_uuid()::text;
 perform wallet_post(auth.uid(),'purchase',-price,ref,'Vendor subscription: '||p.name||' ('||_billing_period||')');
 days:=case when _billing_period='weekly' then 7 else 30 end;
 new_expiry:=base_time+make_interval(days=>days);
 update vendor_subscriptions set status='expired',updated_at=now() where owner_id=auth.uid() and status in ('active','grace');
 insert into vendor_subscriptions(owner_id,plan_key,status,billing_period,started_at,expires_at)
 values(auth.uid(),_plan_key,'active',_billing_period,now(),new_expiry) returning id into sid;
 return jsonb_build_object('subscription_id',sid,'plan',_plan_key,'expires_at',new_expiry,'charged_kobo',price);
end $$;
revoke execute on function public.purchase_vendor_subscription(text,text) from public,anon;
grant execute on function public.purchase_vendor_subscription(text,text) to authenticated;
