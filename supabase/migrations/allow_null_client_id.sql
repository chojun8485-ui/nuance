-- Allow saving treatment records without a linked client.

alter table public.treatments
  alter column client_id drop not null;
