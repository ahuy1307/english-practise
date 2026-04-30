export interface RawPhrase {
  topic: string;
  phrase: string;
  pronunciation: string;
  example: string;
}

export interface Card extends RawPhrase {
  id: string;
}

export interface CardState {
  id: string;
  stage: number;    // 0 = new/reset, 1–4 = learning, 5 = mastered
  interval: number;
  dueDate: string;
}

export const Rating = { DontKnow: 0, Know: 1 } as const;
export type RatingValue = (typeof Rating)[keyof typeof Rating];

export interface TopicMeta {
  slug: string;
  name: string;
  emoji: string;
  cards: Card[];
}

export interface TopicProgress {
  total: number;
  due: number;
  newCount: number;
  learningCount: number;
  masteredCount: number;
}

export interface ReviewDay {
  date: string;
  count: number;
}
