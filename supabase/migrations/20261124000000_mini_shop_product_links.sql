-- Public, privacy-limited product detail lookup for shareable Mini Shop product links.
create or replace function public.get_vendor_product(_product_id uuid)
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  select jsonb_build_object(
    'product',jsonb_build_object(
      'id',p.id,'title',p.title,'description',p.description,'category',p.category,
      'price_kobo',p.price_kobo,'image_url',p.image_url,'is_available',p.is_available,
      'state',p.state,'stock_quantity',p.stock_quantity
    ),
    'store',jsonb_build_object(
      'store_name',s.store_name,'slug',s.slug,'tagline',s.tagline,
      'whatsapp_phone',s.whatsapp_phone,'pickup_delivery_note',s.pickup_delivery_note
    )
  )
  from public.vendor_products p
  join public.vendor_stores s on s.id=p.store_id
  where p.id=_product_id and p.is_available=true
  limit 1;
$$;
grant execute on function public.get_vendor_product(uuid) to anon,authenticated;
