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
    if (dateSet.has(tzDate(d))) streak++;
    else break;
  }
  return streak;
}

const TZ = 'America/Chicago';
const TZ_FMT = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const tzDate = (d: Date) => TZ_FMT.format(d); // YYYY-MM-DD in San Marcos TX time

function buildHeatmapDays(log: ReviewDay[]): { date: string; count: number }[] {
  const countMap: Record<string, number> = {};
  for (const d of log) countMap[d.date] = d.count;

  const days: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = tzDate(d); // TX date matches storage.ts grouping
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

function GoalRing({ count, goal }: { count: number; goal: number }) {
  const r = 34;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(count / Math.max(goal, 1), 1);
  const offset = circ * (1 - pct);
  const done = count >= goal;
  return (
    <svg viewBox="0 0 88 88" width="80" height="80" style={{ flexShrink: 0 }}>
      <circle cx="44" cy="44" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="6" />
      <circle
        cx="44" cy="44" r={r}
        fill="none"
        stroke={done ? 'var(--accent)' : 'var(--accent-dim)'}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 44 44)"
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
      <text x="44" y="40" textAnchor="middle" dominantBaseline="middle"
        fill={done ? 'var(--accent)' : 'var(--text)'}
        fontSize="20" fontWeight="600"
        fontFamily="Cormorant Garamond, Georgia, serif">
        {count}
      </text>
      <text x="44" y="56" textAnchor="middle" dominantBaseline="middle"
        fill="var(--text-faint)" fontSize="10"
        fontFamily="DM Sans, system-ui, sans-serif">
        {done ? '✓ done' : `/ ${goal}`}
      </text>
    </svg>
  );
}

export function HomeScreen({ onSelectTopic, onStartPractice, onViewLearned }: Props) {
  const [progress, setProgress] = useState<Record<string, TopicProgress>>({});
  const [reviewLog, setReviewLog] = useState<ReviewDay[]>([]);
  const [dueReview, setDueReview] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dailyGoal, setDailyGoal] = useState(() =>
    Math.max(5, parseInt(localStorage.getItem('daily-goal') ?? '10', 10))
  );

  function changeGoal(delta: number) {
    setDailyGoal((g) => {
      const next = Math.max(5, Math.min(200, g + delta));
      localStorage.setItem('daily-goal', String(next));
      return next;
    });
  }

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

      // Count unique cards reviewed today (TX date) — one card counts once
      // regardless of how many times it was rated in a session
      const todayTX = tzDate(new Date());
      const reviewed = Object.values(states).filter(
        (s) => s.updatedAt && tzDate(new Date(s.updatedAt)) === todayTX
      ).length;
      setTodayCount(reviewed);

      setProgress(map);
      setReviewLog(log);
      setLoading(false);
    });
  }, []);

  const totalMastered = Object.values(progress).reduce((s, p) => s + p.masteredCount, 0);
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
                  <span className="dashboard__stat-value">{dueReview}</span>
                  <span className="dashboard__stat-label">due today</span>
                </div>
              </div>

              {/* Daily goal ring */}
              <div className="dashboard__goal">
                <GoalRing count={todayCount} goal={dailyGoal} />
                <div className="dashboard__goal-body">
                  <p className="dashboard__goal-title">
                    {todayCount >= dailyGoal ? 'Daily goal reached!' : 'Daily goal'}
                  </p>
                  <p className="dashboard__goal-desc">
                    {todayCount >= dailyGoal
                      ? `${todayCount} cards reviewed today`
                      : `${dailyGoal - todayCount} more to go`}
                  </p>
                  <div className="dashboard__goal-controls">
                    <button className="dashboard__goal-btn" onClick={() => changeGoal(-5)} aria-label="Decrease goal">−</button>
                    <span className="dashboard__goal-target">Goal: {dailyGoal}</span>
                    <button className="dashboard__goal-btn" onClick={() => changeGoal(+5)} aria-label="Increase goal">+</button>
                  </div>
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
