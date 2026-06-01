-- Run in Supabase SQL Editor to store formula groups and hair sections.

alter table public.treatments
  add column if not exists formula_groups jsonb,
  add column if not exists hair_sections jsonb;
