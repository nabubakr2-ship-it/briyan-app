-- چارەسەرکردنی content-type بۆ فایلە HTMLـەکان لە Supabase Storage
-- Supabase بە شێوەیەکی ئاسایی .html وەک text/plain دەنێرێت —
-- ئەم UPDATEـە mimetypeـەکە دەگۆڕێت بۆ text/html

update storage.objects
set metadata = jsonb_set(
  coalesce(metadata, '{}'::jsonb),
  '{mimetype}',
  '"text/html; charset=utf-8"'
)
where bucket_id = 'briyan'
  and name like '%.html';
