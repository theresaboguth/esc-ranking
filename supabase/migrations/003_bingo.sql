-- Bingo boards: one row per user, upserted on every cell toggle
create table if not exists public.bingo_boards (
  user_id     uuid        not null primary key references public.users(id) on delete cascade,
  board       jsonb       not null default '[]'::jsonb,
  marked      jsonb       not null default '[]'::jsonb,
  bingo_count integer     not null default 0,
  updated_at  timestamptz not null default now()
);

alter table public.bingo_boards enable row level security;

-- Everyone can read (needed for the ranking on ResultsPage)
create policy "bingo_select_all"
  on public.bingo_boards for select
  using (true);

-- Trust-based app (no Supabase Auth), allow all writes
create policy "bingo_insert_all"
  on public.bingo_boards for insert
  with check (true);

create policy "bingo_update_all"
  on public.bingo_boards for update
  using (true)
  with check (true);
