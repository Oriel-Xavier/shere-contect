create extension if not exists "pgcrypto";

create table if not exists public.contents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text default '',
  category text not null default 'Umum',
  thumbnail_url text default '',
  url text not null,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contents_published_idx
  on public.contents (published, created_at desc);

create index if not exists contents_category_idx
  on public.contents (category);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists contents_set_updated_at on public.contents;

create trigger contents_set_updated_at
before update on public.contents
for each row
execute function public.set_updated_at();

alter table public.contents enable row level security;

-- Public visitors read only published content.
drop policy if exists "public_read_published_contents" on public.contents;

create policy "public_read_published_contents"
on public.contents
for select
to anon, authenticated
using (published = true);

-- CRUD is performed by the server using the Supabase service role.
-- The service role bypasses RLS. Do not expose its key to the browser.

-- Example:
-- insert into public.contents (title, description, category, thumbnail_url, url)
-- values ('Example Tool', 'Demo content', 'Tools', '', 'https://example.com');
