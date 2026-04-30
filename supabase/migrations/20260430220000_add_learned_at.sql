-- Track when a card was first learned (stage 0 → 1)
alter table public.card_states
  add column if not exists learned_at timestamptz;

-- Auto-set learned_at the first time a card reaches stage >= 1
create or replace function public.set_learned_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.repetitions >= 1 and new.learned_at is null then
    if TG_OP = 'INSERT' or (TG_OP = 'UPDATE' and old.repetitions = 0) then
      new.learned_at = now();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_learned_at on public.card_states;
create trigger trg_set_learned_at
  before insert or update on public.card_states
  for each row execute function public.set_learned_at();
