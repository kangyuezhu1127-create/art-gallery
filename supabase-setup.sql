-- Run this in Supabase Dashboard → SQL Editor

-- 1. Artworks table
create table public.artworks (
  id          uuid        primary key default gen_random_uuid(),
  title       text        not null,
  artist      text,
  year        text,
  description text,
  original_url  text,
  depth_map_url text,
  aspect_ratio  float,
  depth_status  text default 'processing',
  created_at  timestamptz default now()
);

-- 2. Row Level Security — public read, open write (no auth yet)
alter table public.artworks enable row level security;

create policy "public read"   on public.artworks for select using (true);
create policy "public insert" on public.artworks for insert with check (true);
create policy "public update" on public.artworks for update using (true);

-- 3. Storage bucket (public)
insert into storage.buckets (id, name, public)
values ('artworks', 'artworks', true)
on conflict do nothing;

create policy "public upload" on storage.objects
  for insert with check (bucket_id = 'artworks');

create policy "public read"   on storage.objects
  for select using (bucket_id = 'artworks');
