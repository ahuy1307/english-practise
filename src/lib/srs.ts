import { type CardState, type RatingValue, Rating } from '../types/index.ts';

// Fixed interval ladder (days)
const STAGE_INTERVALS = [0, 1, 3, 7, 14, 30];
export const MAX_STAGE = STAGE_INTERVALS.length - 1;

export function calculateNextReview(state: CardState, rating: RatingValue): CardState {
  const stage = rating === Rating.Know
    ? Math.min(state.stage + 1, MAX_STAGE)
    : 0;

  const intervalDays = STAGE_INTERVALS[stage];
  const dueDate = new Date();
  if (intervalDays > 0) dueDate.setDate(dueDate.getDate() + intervalDays);

  return { ...state, stage, interval: intervalDays, dueDate: dueDate.toISOString() };
}

export function isDue(state: CardState): boolean {
  return new Date(state.dueDate) <= new Date();
}

export function createNewCard(id: string): CardState {
  return { id, stage: 0, interval: 0, dueDate: new Date().toISOString() };
}

export function stageLabel(stage: number): string {
  if (stage === 0) return 'New';
  if (stage <= 4) return 'Learning';
  return 'Mastered';
}
