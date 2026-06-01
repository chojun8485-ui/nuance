-- Run in Supabase SQL Editor to extend treatments and enable photo storage.

alter table public.treatments
  add column if not exists menu_items text[] not null default '{}',
  add column if not exists ratio_a numeric,
  add column if not exists ratio_b numeric,
  add column if not exists leave_time_minutes integer,
  add column if not exists result text,
  add column if not exists color_tags text[] not null default '{}',
  add column if not exists photo_urls text[] not null default '{}';

insert into storage.buckets (id, name, public)
values ('treatment-photos', 'treatment-photos', true)
on conflict (id) do nothing;

create policy "Designers upload own treatment photos"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'treatment-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Designers read own treatment photos"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'treatment-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Designers delete own treatment photos"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'treatment-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
