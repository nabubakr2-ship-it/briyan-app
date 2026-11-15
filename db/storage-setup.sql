-- Supabase Storage setup — فایلە ستاتیکەکانی ئەپەکە لێرە هۆست دەبن
-- یەکسەر لەم فایلەوە: buckets + policies بۆ anon key

-- ١. bucket دروست بکە (ئەگەر هەیە، دووبارە دروستی ناکاتەوە)
insert into storage.buckets (id, name, public)
values ('briyan', 'briyan', true)
on conflict (id) do nothing;

-- ٢. رێگادان بۆ anon key: خوێندنەوە (public) + نووسین (بۆ upload)
drop policy if exists "briyan_read" on storage.objects;
create policy "briyan_read" on storage.objects
  for select using (bucket_id = 'briyan');

drop policy if exists "briyan_insert" on storage.objects;
create policy "briyan_insert" on storage.objects
  for insert with check (bucket_id = 'briyan');

drop policy if exists "briyan_update" on storage.objects;
create policy "briyan_update" on storage.objects
  for update using (bucket_id = 'briyan');

drop policy if exists "briyan_delete" on storage.objects;
create policy "briyan_delete" on storage.objects
  for delete using (bucket_id = 'briyan');
