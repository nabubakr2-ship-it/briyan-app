-- Supabase schema — یەک خشتەی گشتی بۆ هەموو داتای ئەپەکە
-- هەر localStorage key وەک یەک ڕیز لێرە هەڵدەگیرێت (value = JSON array/object)

create table if not exists app_data (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- Supabase API لەڕێگەی anon keyەوە دەسەڵاتی خوێندنەوە/نووسین پێدەدات
-- (بۆ ئەم بەرنامەیەی خۆماڵی گونجاوە؛ دواتر دەتوانرێت auth بکرێتەوە)
create index if not exists idx_app_data_updated on app_data(updated_at desc);

grant select, insert, update on app_data to anon, authenticated;
