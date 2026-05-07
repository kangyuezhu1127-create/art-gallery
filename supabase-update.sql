-- Run this in Supabase Dashboard → SQL Editor

-- 1. Add user columns to artworks
alter table public.artworks
  add column if not exists user_id uuid references auth.users(id),
  add column if not exists uploader_name text;

-- 2. Replace open insert with auth-required insert
drop policy if exists "public insert" on public.artworks;
create policy "auth insert" on public.artworks
  for insert with check (auth.uid() = user_id);

-- 3. Storage: allow authenticated uploads only
drop policy if exists "public upload" on storage.objects;
create policy "auth upload" on storage.objects
  for insert with check (bucket_id = 'artworks' and auth.role() = 'authenticated');
