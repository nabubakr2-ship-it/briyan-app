-- چارەسەرکردنی مۆڵەتی خوێندنەوە/نووسین بۆ خشتەی app_data
-- ٤٠١ لە کاتی نووسین = RLS چالاکە بەبێ policy یان grant نییە

grant select, insert, update, delete on app_data to anon, authenticated;

-- RLS ناچالاک بکە بۆ ئەم خشتەیە (بەبێ ئەمە anon ناتوانێت بنووسێت)
alter table app_data disable row level security;
