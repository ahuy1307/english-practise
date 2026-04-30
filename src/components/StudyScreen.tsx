import { useEffect, useRef, useState } from 'react';
import { ALL_TOPICS } from '../data/index.ts';
import { getAllCardStates, logReview, saveCardState } from '../lib/storage.ts';
import { calculateNextReview, createNewCard, isDue } from '../lib/srs.ts';
import { Rating } from '../types/index.ts';
import type { Card, CardState, RatingValue } from '../types/index.ts';
import { FlashCard } from './FlashCard.tsx';
import { RatingBar } from './RatingBar.tsx';
import './StudyScreen.css';

interface Props {
  topicSlug: string;
  onExit: () => void;
}

type Phase = 'loading' | 'studying' | 'done';

export function StudyScreen({ topicSlug, onExit }: Props) {
  const topic = ALL_TOPICS.find((t) => t.slug === topicSlug)!;

  const [phase, setPhase] = useState<Phase>('loading');
  const [queue, setQueue] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [gotIt, setGotIt] = useState(0);

  const statesRef = useRef<Record<string, CardState>>({});
  const againQueueRef = useRef<Card[]>([]);
  const secondPassRef = useRef(false);

  useEffect(() => {
    getAllCardStates().then((states) => {
      statesRef.current = states;
      const dueCards = topic.cards.filter((card) => {
        const s = states[card.id];
        return !s || isDue(s);
      });
      const initial = dueCards.length > 0 ? dueCards : [...topic.cards];
      setQueue(initial);
      setIndex(0);
      setPhase('studying');
    });
  }, [topic]);

  function handleFlip() {
    setFlipped(true);
  }

  function handleRate(rating: RatingValue) {
    const card = queue[index];
    const prev = statesRef.current[card.id] ?? createNewCard(card.id);
    const next = calculateNextReview(prev, rating);
    statesRef.current[card.id] = next;
    void saveCardState(next);
    void logReview();

    if (rating === Rating.DontKnow && !secondPassRef.current) {
      againQueueRef.current.push(card);
    }
    if (rating === Rating.Know) setGotIt((n) => n + 1);

    const nextIndex = index + 1;
    if (nextIndex < queue.length) {
      setIndex(nextIndex);
      setFlipped(false);
      setReviewed((r) => r + 1);
    } else if (!secondPassRef.current && againQueueRef.current.length > 0) {
      secondPassRef.current = true;
      setQueue([...againQueueRef.current]);
      againQueueRef.current = [];
      setIndex(0);
      setFlipped(false);
      setReviewed((r) => r + 1);
    } else {
      setReviewed((r) => r + 1);
      setPhase('done');
    }
  }

  // Keyboard shortcuts — re-registers when flipped/queue/index change
  useEffect(() => {
    if (phase !== 'studying') return;

    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (!flipped && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        handleFlip();
      } else if (flipped) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          handleRate(Rating.Know);
        } else if (e.key === 'x' || e.key === 'X') {
          handleRate(Rating.DontKnow);
        }
      }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, flipped, queue, index]);

  if (phase === 'loading') {
    return (
      <div className="study study--loading">
        <span className="study__spinner" />
        <p>Loading cards…</p>
      </div>
    );
  }

  if (phase === 'done') {
    const total = reviewed;
    const pct = total > 0 ? Math.round((gotIt / total) * 100) : 0;
    return (
      <div className="study study--done">
        <div className="study__done-card">
          <p className="study__done-label">Session complete</p>
          <p className="study__done-count">{reviewed}</p>
          <p className="study__done-sub">cards reviewed</p>
          <div className="study__done-score">
            <span className="study__done-got">✓ {gotIt} got it</span>
            <span className="study__done-sep">·</span>
            <span className="study__done-miss">✗ {reviewed - gotIt} missed</span>
            <span className="study__done-sep">·</span>
            <span className="study__done-pct">{pct}%</span>
          </div>
          <button className="study__done-btn" onClick={onExit}>Back to home</button>
        </div>
      </div>
    );
  }

  const card = queue[index];
  const total = queue.length;

  return (
    <div className="study">
      <header className="study__header">
        <button className="study__back" onClick={onExit} aria-label="Back">← Back</button>
        <div className="study__topic">
          <span>{topic.emoji}</span>
          <span>{topic.name}</span>
        </div>
        <span className="study__count">{index + 1} / {total}</span>
      </header>

      <div className="study__progress">
        <div className="study__progress-fill" style={{ width: `${(index / total) * 100}%` }} />
      </div>

      <main className="study__main">
        <FlashCard
          key={card.id}
          card={card}
          flipped={flipped}
          onFlip={handleFlip}
        />
        <RatingBar visible={flipped} onRate={handleRate} />
        {!flipped && (
          <p className="study__hint">Tap the card or press Space to reveal</p>
        )}
      </main>
    </div>
  );
}
