-- Necronotecon: notes table, full-text search, and row level security.

create table public.notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body        text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  pinned      boolean not null default false,
  deleted_at  timestamptz,
  -- 'simple' config: no stemming or stop words, so partial words and any language behave predictably.
  search      tsvector generated always as (to_tsvector('simple', body)) stored
);

create index notes_search_idx on public.notes using gin (search);
create index notes_user_created_idx on public.notes (user_id, created_at desc);

alter table public.notes enable row level security;

-- Only the signed-in owner can see or change their rows.
create policy "notes select own" on public.notes
  for select to authenticated using (user_id = auth.uid());

create policy "notes insert own" on public.notes
  for insert to authenticated with check (user_id = auth.uid());

create policy "notes update own" on public.notes
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "notes delete own" on public.notes
  for delete to authenticated using (user_id = auth.uid());

-- Nothing for the anonymous role: with no policy, RLS denies it everything.
revoke all on public.notes from anon;
