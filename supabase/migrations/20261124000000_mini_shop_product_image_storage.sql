-- Mini Shop product image uploads: public image reads, owner-only uploads.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('mini-shop-product-images','mini-shop-product-images',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];

drop policy if exists "Mini Shop public image viewing" on storage.objects;
create policy "Mini Shop public image viewing" on storage.objects for select using (bucket_id='mini-shop-product-images');

drop policy if exists "Mini Shop owners upload their images" on storage.objects;
create policy "Mini Shop owners upload their images" on storage.objects for insert to authenticated
with check (bucket_id='mini-shop-product-images' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists "Mini Shop owners update their images" on storage.objects;
create policy "Mini Shop owners update their images" on storage.objects for update to authenticated
using (bucket_id='mini-shop-product-images' and (storage.foldername(name))[1]=auth.uid()::text)
with check (bucket_id='mini-shop-product-images' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists "Mini Shop owners delete their images" on storage.objects;
create policy "Mini Shop owners delete their images" on storage.objects for delete to authenticated
using (bucket_id='mini-shop-product-images' and (storage.foldername(name))[1]=auth.uid()::text);
