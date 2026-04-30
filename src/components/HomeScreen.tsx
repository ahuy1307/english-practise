import { useEffect, useState } from 'react';
import { ALL_TOPICS } from '../data/index.ts';
import { getAllCardStates, getReviewLog } from '../lib/storage.ts';
import { isDue } from '../lib/srs.ts';
import type { ReviewDay, TopicProgress } from '../types/index.ts';
import { TopicCard } from './TopicCard.tsx';
import './HomeScreen.css';

interface Props {
  onSelectTopic: (slug: string) => void;
  onStartPractice: () => void;
  onViewLearned: () => void;
}

function calcStreak(log: ReviewDay[]): number {
  const dateSet = new Set(log.map((d) => d.date));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    if (dateSet.has(key)) streak++;
    else break;
  }
  return streak;
}

function buildHeatmapDays(log: ReviewDay[]): { date: string; count: number }[] {
  const countMap: Record<string, number> = {};
  for (const d of log) countMap[d.date] = d.count;

  const days: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    days.push({ date: key, count: countMap[key] ?? 0 });
  }
  return days;
}

function heatIntensity(count: number): string {
  if (count === 0) return 'heat-0';
  if (count < 5) return 'heat-1';
  if (count < 15) return 'heat-2';
  if (count < 30) return 'heat-3';
  return 'heat-4';
}

export function HomeScreen({ onSelectTopic, onStartPractice, onViewLearned }: Props) {
  const [progress, setProgress] = useState<Record<string, TopicProgress>>({});
  const [reviewLog, setReviewLog] = useState<ReviewDay[]>([]);
  const [dueReview, setDueReview] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAllCardStates(), getReviewLog()]).then(([states, log]) => {
      const map: Record<string, TopicProgress> = {};
      for (const topic of ALL_TOPICS) {
        let due = 0, newCount = 0, learningCount = 0, masteredCount = 0;
        for (const card of topic.cards) {
          const state = states[card.id];
          if (!state || state.stage === 0) {
            newCount++;
            due++;
          } else if (state.stage >= 1 && state.stage <= 4) {
            learningCount++;
            if (isDue(state)) due++;
          } else {
            masteredCount++;
            if (isDue(state)) due++;
          }
        }
        map[topic.slug] = { total: topic.cards.length, due, newCount, learningCount, masteredCount };
      }
      // Also compute global due-review count (previously-seen cards scheduled for today)
      let dueReviewGlobal = 0;
      for (const topic of ALL_TOPICS) {
        for (const card of topic.cards) {
          const s = states[card.id];
          if (s && s.stage >= 1 && isDue(s)) dueReviewGlobal++;
        }
      }
      setDueReview(dueReviewGlobal);
      setProgress(map);
      setReviewLog(log);
      setLoading(false);
    });
  }, []);

  const totalMastered = Object.values(progress).reduce((s, p) => s + p.masteredCount, 0);
  const totalDue = Object.values(progress).reduce((s, p) => s + p.due, 0);
  const totalLearning = Object.values(progress).reduce((s, p) => s + p.learningCount, 0);
  const streak = calcStreak(reviewLog);
  const heatDays = buildHeatmapDays(reviewLog);

  return (
    <div className="home">
      <header className="home__header">
        <h1 className="home__title">Daily English</h1>
      </header>

      <main className="home__main">
        {loading ? (
          <div className="home__loading">
            <span className="home__spinner" />
            <p>Loading…</p>
          </div>
        ) : (
          <>
            {/* Global Dashboard */}
            <section className="dashboard">
              <div className="dashboard__stats">
                <div className="dashboard__stat">
                  <span className="dashboard__stat-value">{streak}</span>
                  <span className="dashboard__stat-label">
                    {streak === 1 ? 'day streak' : 'day streak'}
                    {streak >= 3 ? ' 🔥' : ''}
                  </span>
                </div>
                <div className="dashboard__stat">
                  <span className="dashboard__stat-value dashboard__stat-value--accent">{totalMastered}</span>
                  <span className="dashboard__stat-label">mastered</span>
                </div>
                <div className="dashboard__stat">
                  <span className="dashboard__stat-value">{totalLearning}</span>
                  <span className="dashboard__stat-label">learning</span>
                </div>
                <div className="dashboard__stat">
                  <span className="dashboard__stat-value">{totalDue}</span>
                  <span className="dashboard__stat-label">due today</span>
                </div>
              </div>

              {/* 30-day heatmap */}
              <div className="dashboard__heatmap-wrap">
                <p className="dashboard__heatmap-label">Last 30 days</p>
                <div className="dashboard__heatmap">
                  {heatDays.map(({ date, count }) => (
                    <div
                      key={date}
                      className={`dashboard__heat-cell ${heatIntensity(count)}`}
                      title={`${date}: ${count} review${count !== 1 ? 's' : ''}`}
                    />
                  ))}
                </div>
              </div>

              {/* Overall progress bar */}
              <div className="dashboard__overall">
                <div className="dashboard__overall-bar">
                  <div
                    className="dashboard__overall-mastered"
                    style={{ width: `${(totalMastered / 1000) * 100}%` }}
                  />
                  <div
                    className="dashboard__overall-learning"
                    style={{ width: `${(totalLearning / 1000) * 100}%` }}
                  />
                </div>
                <span className="dashboard__overall-text">
                  {totalMastered} / 1,000 phrases mastered
                </span>
              </div>
            </section>

            {/* SRS practice section */}
            {(totalMastered + totalLearning) > 0 && (
              <section className="home__srs">
                <div className="home__srs-label">
                  <span>Spaced Repetition</span>
                  <span className="home__srs-sub">cards scheduled for review</span>
                </div>
                {dueReview > 0 ? (
                  <button className="home__srs-btn" onClick={onStartPractice}>
                    <div className="home__srs-count">
                      <span className="home__srs-num">{dueReview}</span>
                      <span className="home__srs-unit">cards due today</span>
                    </div>
                    <span className="home__srs-arrow">Start review →</span>
                  </button>
                ) : (
                  <div className="home__srs-done">
                    <span className="home__srs-done-icon">✓</span>
                    <span>All caught up — nothing due right now</span>
                  </div>
                )}
              </section>
            )}

            {/* Per-topic grid */}
            <section className="home__topics">
              <div className="home__section-header">
                <h2 className="home__section-title">Topics</h2>
                {(totalMastered + totalLearning) > 0 && (
                  <button className="home__learned-link" onClick={onViewLearned}>
                    View learned words →
                  </button>
                )}
              </div>
              <div className="home__grid">
                {ALL_TOPICS.map((topic) => (
                  <TopicCard
                    key={topic.slug}
                    topic={topic}
                    progress={
                      progress[topic.slug] ?? {
                        total: topic.cards.length,
                        due: topic.cards.length,
                        newCount: topic.cards.length,
                        learningCount: 0,
                        masteredCount: 0,
                      }
                    }
                    onStudy={() => onSelectTopic(topic.slug)}
                  />
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
