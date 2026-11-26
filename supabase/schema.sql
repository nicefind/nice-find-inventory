-- Nice Find inventory — Supabase schema
-- Run this whole file in the Supabase Dashboard: SQL Editor > New query > paste > Run.
-- Then create the photo bucket (see the storage section at the bottom).
-- WARNING: the policies below let anyone with the anon key read/write this
-- table. That is fine for a single-user hobby app, but do NOT share the
-- deployed URL publicly, and do NOT put the service_role key in the app.

create extension if not exists "pgcrypto";

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  description text not null default '',
  category text not null default 'Other Vintage',
  era_brand text not null default '',
  condition text not null default '',
  completeness text not null default '',
  cost numeric not null default 0,
  asking_price numeric not null default 0,
  sold_price numeric not null default 0,
  postage numeric not null default 0,
  fees numeric not null default 0,
  source text not null default '',
  date_bought date,
  pickup_location text not null default '',
  status text not null default 'To photograph',
  created_at timestamptz not null default now(),
  sold_date date,
  price_notes text not null default '',
  platforms jsonb not null default '{"eBay":{"status":"Draft","listedDate":"","url":""},"Marketplace":{"status":"Draft","listedDate":"","url":""},"Depop":{"status":"Draft","listedDate":"","url":""}}'::jsonb,
  photos text[] not null default '{}',
  is_sample boolean not null default false
);

-- Row Level Security: permissive anon policies for a single-user hobby app.
alter table public.items enable row level security;

drop policy if exists "Allow all for anon" on public.items;
create policy "Allow all for anon"
  on public.items
  for all
  to anon
  using (true)
  with check (true);

-- Explicit Data API grants (Supabase no longer exposes new tables to the
-- Data API by default on projects created after mid-2026). Without these,
-- supabase-js cannot see the table even with the RLS policy above.
grant select, insert, update, delete on public.items to anon;
grant select, insert, update, delete on public.items to authenticated;
grant all on public.items to service_role;

-- Photo storage bucket.
-- SQL alone cannot reliably create a bucket in every Supabase project, so do
-- this in the Dashboard if the insert below does not work:
--   Storage > New bucket > name: item-photos > tick "Public bucket" > Create.
insert into storage.buckets (id, name, public)
values ('item-photos', 'item-photos', true)
on conflict (id) do nothing;

-- Public read + anon upload/delete for the item-photos bucket.
drop policy if exists "Public read item-photos" on storage.objects;
create policy "Public read item-photos"
  on storage.objects for select
  to anon
  using (bucket_id = 'item-photos');

drop policy if exists "Anon upload item-photos" on storage.objects;
create policy "Anon upload item-photos"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'item-photos');

drop policy if exists "Anon delete item-photos" on storage.objects;
create policy "Anon delete item-photos"
  on storage.objects for delete
  to anon
  using (bucket_id = 'item-photos');
