-- Run this in Supabase SQL Editor to set up Nuance client tables.

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  designer_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  phone text,
  instagram text,
  notes text,
  retouch_cycle_days integer not null default 42,
  last_visit_at timestamptz,
  visit_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.treatments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients (id) on delete cascade,
  designer_id uuid not null references auth.users (id) on delete cascade,
  treatment_date date not null default current_date,
  title text not null default '시술',
  notes text,
  menu_items text[] not null default '{}',
  ratio_a numeric,
  ratio_b numeric,
  leave_time_minutes integer,
  result text,
  color_tags text[] not null default '{}',
  photo_urls text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists clients_designer_id_idx on public.clients (designer_id);
create index if not exists treatments_client_id_idx on public.treatments (client_id);

alter table public.clients enable row level security;
alter table public.treatments enable row level security;

create policy "Designers manage own clients"
  on public.clients
  for all
  using (auth.uid() = designer_id)
  with check (auth.uid() = designer_id);

create policy "Designers manage own treatments"
  on public.treatments
  for all
  using (auth.uid() = designer_id)
  with check (auth.uid() = designer_id);
