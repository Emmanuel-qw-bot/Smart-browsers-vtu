-- Keep owner identifiers private; public storefronts are served through a narrow RPC.
drop policy if exists "Public can view store profiles" on public.vendor_stores;
drop policy if exists "Public view available products" on public.vendor_products;
create policy "Owners view their stores" on public.vendor_stores for select to authenticated using (owner_id=auth.uid());
create policy "Owners view their products" on public.vendor_products for select to authenticated using (owner_id=auth.uid());

create or replace function public.get_vendor_storefront(_slug text)
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  select jsonb_build_object(
    'store', jsonb_build_object(
      'slug',s.slug,
      'store_name',s.store_name,
      'tagline',s.tagline,
      'whatsapp_phone',s.whatsapp_phone,
      'pickup_delivery_note',s.pickup_delivery_note,
      'logo_url',s.logo_url
    ),
    'products', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',p.id,'title',p.title,'description',p.description,
        'category',p.category,'price_kobo',p.price_kobo,
        'image_url',p.image_url,'is_available',p.is_available
      ) order by p.created_at desc)
      from public.vendor_products p
      where p.store_id=s.id and p.is_available=true
    ),'[]'::jsonb)
  )
  from public.vendor_stores s
  where s.slug=lower(trim(_slug))
  limit 1;
$$;
grant execute on function public.get_vendor_storefront(text) to anon,authenticated;
