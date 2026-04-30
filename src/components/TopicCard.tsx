import type { TopicMeta, TopicProgress } from '../types/index.ts';
import './TopicCard.css';

interface Props {
  topic: TopicMeta;
  progress: TopicProgress;
  onStudy: () => void;
}

export function TopicCard({ topic, progress, onStudy }: Props) {
  const { total, due, newCount, learningCount, masteredCount } = progress;
  const masteredPct = (masteredCount / total) * 100;
  const learningPct = (learningCount / total) * 100;
  const newPct = (newCount / total) * 100;

  return (
    <article className="topic-card">
      <div className="topic-card__top">
        <span className="topic-card__emoji" aria-hidden="true">{topic.emoji}</span>
        <span className={`topic-card__due ${due > 0 ? 'topic-card__due--active' : ''}`}>
          {due > 0 ? `${due} due` : 'all done ✓'}
        </span>
      </div>

      <h2 className="topic-card__name">{topic.name}</h2>

      {/* Stacked stage bar */}
      <div className="topic-card__stagebar" title={`New: ${newCount} · Learning: ${learningCount} · Mastered: ${masteredCount}`}>
        <div className="topic-card__stagebar-mastered" style={{ width: `${masteredPct}%` }} />
        <div className="topic-card__stagebar-learning" style={{ width: `${learningPct}%` }} />
        <div className="topic-card__stagebar-new" style={{ width: `${newPct}%` }} />
      </div>

      <div className="topic-card__legend">
        <span className="topic-card__legend-item topic-card__legend-item--mastered">
          <span className="topic-card__legend-dot" />
          {masteredCount} mastered
        </span>
        <span className="topic-card__legend-item topic-card__legend-item--learning">
          <span className="topic-card__legend-dot" />
          {learningCount} learning
        </span>
        <span className="topic-card__legend-item topic-card__legend-item--new">
          <span className="topic-card__legend-dot" />
          {newCount} new
        </span>
      </div>

      <button className="topic-card__btn" onClick={onStudy} disabled={due === 0}>
        {due === 0 ? 'Come back tomorrow' : `Study ${due} card${due !== 1 ? 's' : ''}`}
      </button>
    </article>
  );
}
