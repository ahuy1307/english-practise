import { Rating } from '../types/index.ts';
import type { RatingValue } from '../types/index.ts';
import './RatingBar.css';

interface Props {
  visible: boolean;
  onRate: (rating: RatingValue) => void;
}

export function RatingBar({ visible, onRate }: Props) {
  return (
    <div className={`rating-bar${visible ? ' rating-bar--visible' : ''}`} aria-hidden={!visible}>
      <p className="rating-bar__hint">Space / Enter = Got it &nbsp;·&nbsp; X = Don't know</p>
      <div className="rating-bar__buttons">
        <button
          className="rating-bar__btn rating-bar__btn--dontknow"
          onClick={() => onRate(Rating.DontKnow)}
          tabIndex={visible ? 0 : -1}
          disabled={!visible}
        >
          <span className="rating-bar__icon">✗</span>
          <span className="rating-bar__label">Don't know</span>
        </button>
        <button
          className="rating-bar__btn rating-bar__btn--know"
          onClick={() => onRate(Rating.Know)}
          tabIndex={visible ? 0 : -1}
          disabled={!visible}
        >
          <span className="rating-bar__icon">✓</span>
          <span className="rating-bar__label">Got it</span>
        </button>
      </div>
    </div>
  );
}
