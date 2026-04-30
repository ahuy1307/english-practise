-- card_states: stores SRS stage per phrase
create table if not exists public.card_states (
  id          text primary key,
  interval    integer     not null default 0,
  ease_factor float       not null default 0,
  repetitions integer     not null default 0,  -- used as SRS stage (0–5)
  due_date    timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- review_log: one row per card rating, drives heatmap + streak
create table if not exists public.review_log (
  reviewed_at timestamptz not null default now()
);

create index if not exists review_log_date_idx on public.review_log (reviewed_at);

-- RLS: enabled but open to anon (personal app, no user auth)
alter table public.card_states enable row level security;
alter table public.review_log  enable row level security;

create policy "anon full access" on public.card_states
  for all to anon using (true) with check (true);

create policy "anon full access" on public.review_log
  for all to anon using (true) with check (true);

-- Expose to the anon role via Data API
grant select, insert, update, delete on public.card_states to anon;
grant select, insert, delete         on public.review_log  to anon;
