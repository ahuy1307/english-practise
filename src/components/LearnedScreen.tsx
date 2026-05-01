import { useEffect, useState } from 'react';
import { ALL_TOPICS } from '../data/index.ts';
import { getAllCardStates } from '../lib/storage.ts';
import { cancelSpeech } from '../lib/tts.ts';
import type { Card, CardState } from '../types/index.ts';
import { FlashCard } from './FlashCard.tsx';
import './LearnedScreen.css';

interface Props {
  onBack: () => void;
}

interface LearnedCard {
  card: Card;
  state: CardState;
  topicSlug: string;
  topicName: string;
  topicEmoji: string;
}

interface ChartDay {
  date: string;
  label: string;
  count: number;
}

const STAGE_LABELS = ['New', '1 day', '3 days', '7 days', '14 days', 'Mastered'];

const TZ = 'America/Chicago';
const TZ_FMT = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const TZ_LABEL = new Intl.DateTimeFormat('en-US', { timeZone: TZ, month: 'short', day: 'numeric' });
const tzDate = (d: Date) => TZ_FMT.format(d);

function buildChartDays(cards: LearnedCard[]): ChartDay[] {
  const countMap: Record<string, number> = {};
  for (const { state } of cards) {
    if (state.learnedAt) {
      const date = tzDate(new Date(state.learnedAt)); // TX date
      countMap[date] = (countMap[date] ?? 0) + 1;
    }
  }
  const days: ChartDay[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = tzDate(d);
    const label = TZ_LABEL.format(d);
    days.push({ date, label, count: countMap[date] ?? 0 });
  }
  return days;
}

function DailyChart({ days }: { days: ChartDay[] }) {
  const max = Math.max(...days.map((d) => d.count), 1);
  const total = days.reduce((s, d) => s + d.count, 0);
  return (
    <div className="lc-chart">
      <div className="lc-chart__header">
        <span className="lc-chart__title">Words learned per day</span>
        <span className="lc-chart__total">{total} this month</span>
      </div>
      <div className="lc-chart__bars">
        {days.map(({ date, label, count }) => (
          <div key={date} className="lc-chart__col" title={`${label}: ${count} word${count !== 1 ? 's' : ''}`}>
            <div
              className={`lc-chart__bar ${count > 0 ? 'lc-chart__bar--filled' : ''}`}
              style={{ height: `${count > 0 ? Math.max((count / max) * 100, 10) : 4}%` }}
            />
          </div>
        ))}
      </div>
      <div className="lc-chart__axis">
        <span>{days[0]?.label}</span>
        <span>{days[14]?.label}</span>
        <span>Today</span>
      </div>
    </div>
  );
}

type StageFilter = 'all' | 'learning' | 'mastered';

export function LearnedScreen({ onBack }: Props) {
  const [learnedCards, setLearnedCards] = useState<LearnedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [topicFilter, setTopicFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState<StageFilter>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<LearnedCard | null>(null);
  const [modalFlipped, setModalFlipped] = useState(false);

  useEffect(() => {
    getAllCardStates().then((states) => {
      const cards: LearnedCard[] = [];
      for (const topic of ALL_TOPICS) {
        for (const card of topic.cards) {
          const state = states[card.id];
          if (state && state.stage >= 1) {
            cards.push({ card, state, topicSlug: topic.slug, topicName: topic.name, topicEmoji: topic.emoji });
          }
        }
      }
      setLearnedCards(cards);
      setLoading(false);
    });
  }, []);

  useEffect(() => () => { cancelSpeech(); }, []);

  // Close modal on Escape
  useEffect(() => {
    if (!selected) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeModal();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected]);

  function openModal(lc: LearnedCard) {
    cancelSpeech();
    setSelected(lc);
    setModalFlipped(false);
  }

  function closeModal() {
    cancelSpeech();
    setSelected(null);
  }

  const filtered = learnedCards.filter((lc) => {
    if (topicFilter !== 'all' && lc.topicSlug !== topicFilter) return false;
    if (stageFilter === 'learning' && lc.state.stage >= 5) return false;
    if (stageFilter === 'mastered' && lc.state.stage < 5) return false;
    if (search) {
      const q = search.toLowerCase();
      return lc.card.phrase.toLowerCase().includes(q) || lc.card.example.toLowerCase().includes(q);
    }
    return true;
  });

  const masteredCount = learnedCards.filter((lc) => lc.state.stage >= 5).length;
  const learningCount = learnedCards.filter((lc) => lc.state.stage < 5).length;
  const chartDays = buildChartDays(learnedCards);

  return (
    <div className="learned">
      <header className="learned__header">
        <button className="learned__back" onClick={onBack}>← Back</button>
        <h1 className="learned__title">Learned Words</h1>
        <span className="learned__total">{learnedCards.length} phrases</span>
      </header>

      {!loading && <DailyChart days={chartDays} />}

      <div className="learned__filters">
        <input
          className="learned__search"
          type="search"
          placeholder="Search phrases…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="learned__tabs">
          {(['all', 'learning', 'mastered'] as StageFilter[]).map((tab) => {
            const count = tab === 'all' ? learnedCards.length : tab === 'learning' ? learningCount : masteredCount;
            return (
              <button
                key={tab}
                className={`learned__tab ${stageFilter === tab ? 'learned__tab--active' : ''}`}
                onClick={() => setStageFilter(tab)}
              >
                {tab === 'all' ? 'All' : tab === 'learning' ? 'Learning' : 'Mastered'}
                <span className="learned__tab-count">{count}</span>
              </button>
            );
          })}
        </div>
        <select
          className="learned__topic-select"
          value={topicFilter}
          onChange={(e) => setTopicFilter(e.target.value)}
        >
          <option value="all">All topics</option>
          {ALL_TOPICS.map((t) => (
            <option key={t.slug} value={t.slug}>{t.emoji} {t.name}</option>
          ))}
        </select>
      </div>

      <main className="learned__list">
        {loading ? (
          <div className="learned__loading">
            <span className="learned__spinner" />
            <p>Loading…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="learned__empty">
            {learnedCards.length === 0
              ? 'No phrases learned yet. Start studying!'
              : 'No phrases match your filters.'}
          </div>
        ) : (
          filtered.map((lc) => {
            const { card, state, topicEmoji, topicName } = lc;
            return (
              <div
                key={card.id}
                className="learned__item"
                onClick={() => openModal(lc)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openModal(lc); }}
              >
                <div className="learned__item-body">
                  <p className="learned__phrase">{card.phrase}</p>
                  <p className="learned__pronunciation">{card.pronunciation}</p>
                  <p className="learned__example">{card.example}</p>
                  <span className="learned__topic-tag">{topicEmoji} {topicName}</span>
                </div>
                <span className={`learned__badge ${state.stage >= 5 ? 'learned__badge--mastered' : ''}`}>
                  {state.stage >= 5 ? '★ Mastered' : STAGE_LABELS[state.stage]}
                </span>
              </div>
            );
          })
        )}
      </main>

      {/* Flashcard modal */}
      {selected && (
        <div className="lc-modal" onClick={closeModal} role="dialog" aria-modal="true">
          <div className="lc-modal__content" onClick={(e) => e.stopPropagation()}>
            <div className="lc-modal__top">
              <span className="lc-modal__topic">
                {selected.topicEmoji} {selected.topicName}
              </span>
              <button className="lc-modal__close" onClick={closeModal} aria-label="Close">✕</button>
            </div>
            <FlashCard
              key={selected.card.id}
              card={selected.card}
              flipped={modalFlipped}
              onFlip={() => setModalFlipped(true)}
            />
            {modalFlipped && (
              <button className="lc-modal__reset" onClick={() => setModalFlipped(false)}>
                ↩ Flip back
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
