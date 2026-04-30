import { supabase } from './supabase.ts';
import type { CardState, ReviewDay } from '../types/index.ts';

interface DbCardRow {
  id: string;
  interval: number;
  ease_factor: number;
  repetitions: number; // used as stage
  due_date: string;
  learned_at: string | null;
}

interface DbReviewRow {
  reviewed_at: string;
}

function rowToState(row: DbCardRow): CardState {
  return {
    id: row.id,
    stage: row.repetitions,
    interval: row.interval,
    dueDate: row.due_date,
    learnedAt: row.learned_at ?? undefined,
  };
}

export async function getAllCardStates(): Promise<Record<string, CardState>> {
  const { data, error } = await supabase.from('card_states').select('*');
  if (error || !data) return {};
  const map: Record<string, CardState> = {};
  for (const row of data as DbCardRow[]) {
    map[row.id] = rowToState(row);
  }
  return map;
}

export async function saveCardState(state: CardState): Promise<void> {
  await supabase.from('card_states').upsert({
    id: state.id,
    interval: state.interval,
    ease_factor: 0,
    repetitions: state.stage,
    due_date: state.dueDate,
    updated_at: new Date().toISOString(),
  });
}

export async function resetAllProgress(): Promise<void> {
  await supabase.from('card_states').delete().neq('id', '');
}

export async function logReview(): Promise<void> {
  await supabase.from('review_log').insert({ reviewed_at: new Date().toISOString() });
}

export async function getReviewLog(): Promise<ReviewDay[]> {
  const since = new Date();
  since.setDate(since.getDate() - 29);

  const { data } = await supabase
    .from('review_log')
    .select('reviewed_at')
    .gte('reviewed_at', since.toISOString());

  const counts: Record<string, number> = {};
  for (const row of (data ?? []) as DbReviewRow[]) {
    const date = row.reviewed_at.split('T')[0];
    counts[date] = (counts[date] ?? 0) + 1;
  }

  return Object.entries(counts)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
