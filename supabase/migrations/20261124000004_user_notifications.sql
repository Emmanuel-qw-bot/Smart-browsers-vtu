-- Device/app notification inbox with unread counters. SMS is not used.
create table if not exists public.user_notifications (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 notification_type text not null check(notification_type in ('mini_shop_order','wallet_credit','reward_ready','weekend_rush','system')),
 title text not null,
 message text not null,
 source_key text,
 action_path text,
 created_at timestamptz not null default now(),
 read_at timestamptz,
 unique(user_id,notification_type,source_key)
);
create index if not exists user_notifications_unread_idx on public.user_notifications(user_id,created_at desc) where read_at is null;
alter table public.user_notifications enable row level security;
grant select,update on public.user_notifications to authenticated;
grant all on public.user_notifications to service_role;
create policy "Users read own notifications" on public.user_notifications for select to authenticated using(user_id=auth.uid());
create policy "Users mark own notifications read" on public.user_notifications for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

create or replace function public.notify_vendor_order_created() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.user_notifications(user_id,notification_type,title,message,source_key,action_path)
 values(new.owner_id,'mini_shop_order','New Mini Shop order', 'Order '||new.order_number||' received. Review the buyer details and confirm the order.',new.id::text,'/app/mini-shop')
 on conflict(user_id,notification_type,source_key) do nothing;
 return new;
end $$;
drop trigger if exists vendor_order_notify on public.vendor_orders;
create trigger vendor_order_notify after insert on public.vendor_orders for each row execute function public.notify_vendor_order_created();

create or replace function public.notify_wallet_credit() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.amount_kobo>0 and new.category in ('deposit','promotional','reward','refund') then
  insert into public.user_notifications(user_id,notification_type,title,message,source_key,action_path)
  values(new.user_id,'wallet_credit','Wallet credited','Your wallet received a credit: '||new.description,new.id::text,'/app/wallet')
  on conflict(user_id,notification_type,source_key) do nothing;
 end if;
 return new;
end $$;
drop trigger if exists wallet_credit_notify on public.wallet_transactions;
create trigger wallet_credit_notify after insert on public.wallet_transactions for each row execute function public.notify_wallet_credit();

create or replace function public.notify_purchase_milestone() returns trigger language plpgsql security definer set search_path=public as $$
declare n integer; milestone integer; reward text;
begin
 if new.category='purchase' and new.description like 'Data:%' then
  select count(*) into n from public.wallet_transactions t
  where t.user_id=new.user_id and t.category='purchase' and t.description like 'Data:%'
  and not exists(select 1 from public.wallet_transactions r where r.category='refund' and replace(r.reference,'refund:','')=t.reference);
  if n in (50,100,500,1000,2000) then
   milestone:=n;
   reward:=case n when 50 then '3 GB' when 100 then '5 GB' when 500 then '10 GB' when 1000 then '20 GB' when 2000 then '30 GB' end;
   insert into public.user_notifications(user_id,notification_type,title,message,source_key,action_path)
   values(new.user_id,'reward_ready','Purchase reward milestone unlocked','You reached '||milestone||' eligible data purchases. Your '||reward||' milestone reward is ready to review.',milestone::text,'/app/rewards')
   on conflict(user_id,notification_type,source_key) do nothing;
  end if;
 end if;
 return new;
end $$;
drop trigger if exists purchase_milestone_notify on public.wallet_transactions;
create trigger purchase_milestone_notify after insert on public.wallet_transactions for each row execute function public.notify_purchase_milestone();

-- Admin turning Weekend Rush on with an opening window that is already active notifies eligible users.
create or replace function public.notify_weekend_rush_open() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.enabled and (not old.enabled or new.opens_at is distinct from old.opens_at) and (new.opens_at is null or new.opens_at<=now()) then
  insert into public.user_notifications(user_id,notification_type,title,message,source_key,action_path)
  select p.id,'weekend_rush','Weekend Rush is open',coalesce(new.announcement,'Weekend Rush applications are now open.'),'open-'||coalesce(new.opens_at::text,'immediate'),'/app/weekend-rush'
  from public.profiles p
  where (select count(*) from public.wallet_transactions t where t.user_id=p.id and t.category='purchase' and t.description like 'Data:%'
   and not exists(select 1 from public.wallet_transactions r where r.category='refund' and replace(r.reference,'refund:','')=t.reference))>=new.minimum_data_purchases
  on conflict(user_id,notification_type,source_key) do nothing;
 end if;
 return new;
end $$;
drop trigger if exists weekend_rush_open_notify on public.weekend_giveaway_settings;
create trigger weekend_rush_open_notify after update on public.weekend_giveaway_settings for each row execute function public.notify_weekend_rush_open();
