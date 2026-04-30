import type { RawPhrase, Card, TopicMeta } from '../types/index.ts';
import t01 from './01-greetings-social.json';
import t02 from './02-food-dining.json';
import t03 from './03-grocery-shopping.json';
import t04 from './04-transport-driving.json';
import t05 from './05-gym-fitness.json';
import t06 from './06-health-pharmacy.json';
import t07 from './07-housing-chores.json';
import t08 from './08-banking-money.json';
import t09 from './09-weather-nature.json';
import t10 from './10-emotions-opinions.json';
import t11 from './11-time-routine.json';
import t12 from './12-clothes-laundry.json';
import t13 from './13-emergency-safety.json';
import t14 from './14-community-neighbors.json';
import t15 from './15-filler-transitions.json';

const TOPIC_DEFS: { slug: string; emoji: string; data: RawPhrase[] }[] = [
  { slug: '01-greetings-social', emoji: '👋', data: t01 as RawPhrase[] },
  { slug: '02-food-dining', emoji: '🍽️', data: t02 as RawPhrase[] },
  { slug: '03-grocery-shopping', emoji: '🛒', data: t03 as RawPhrase[] },
  { slug: '04-transport-driving', emoji: '🚗', data: t04 as RawPhrase[] },
  { slug: '05-gym-fitness', emoji: '💪', data: t05 as RawPhrase[] },
  { slug: '06-health-pharmacy', emoji: '💊', data: t06 as RawPhrase[] },
  { slug: '07-housing-chores', emoji: '🏠', data: t07 as RawPhrase[] },
  { slug: '08-banking-money', emoji: '💰', data: t08 as RawPhrase[] },
  { slug: '09-weather-nature', emoji: '☀️', data: t09 as RawPhrase[] },
  { slug: '10-emotions-opinions', emoji: '💬', data: t10 as RawPhrase[] },
  { slug: '11-time-routine', emoji: '⏰', data: t11 as RawPhrase[] },
  { slug: '12-clothes-laundry', emoji: '👕', data: t12 as RawPhrase[] },
  { slug: '13-emergency-safety', emoji: '🚨', data: t13 as RawPhrase[] },
  { slug: '14-community-neighbors', emoji: '🤝', data: t14 as RawPhrase[] },
  { slug: '15-filler-transitions', emoji: '💭', data: t15 as RawPhrase[] },
];

function toCard(phrase: RawPhrase, slug: string, index: number): Card {
  return { ...phrase, id: `${slug}:${index}` };
}

export const ALL_TOPICS: TopicMeta[] = TOPIC_DEFS.map(({ slug, emoji, data }) => ({
  slug,
  emoji,
  name: data[0]?.topic ?? slug,
  cards: data.map((p, i) => toCard(p, slug, i)),
}));

export const ALL_CARDS: Card[] = ALL_TOPICS.flatMap((t) => t.cards);
