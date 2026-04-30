import { useState } from 'react';
import { cancelSpeech, speak } from '../lib/tts.ts';
import type { Card } from '../types/index.ts';
import './FlashCard.css';

interface Props {
  card: Card;
  flipped: boolean;
  onFlip: () => void;
}

function highlightPhrase(example: string, phrase: string): string {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return example.replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>');
}

function SpeakerIcon({ playing }: { playing: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M11 5L6 9H3a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h3l5 4V5Z"
        fill="currentColor"
      />
      {playing ? (
        <>
          <path d="M15.5 8.5a5 5 0 0 1 0 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          <path d="M18.5 5.5a9 9 0 0 1 0 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </>
      ) : (
        <path d="M15.5 8.5a5 5 0 0 1 0 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      )}
    </svg>
  );
}

export function FlashCard({ card, flipped, onFlip }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const highlighted = highlightPhrase(card.example, card.phrase);

  function handleSpeak(text: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (isPlaying) {
      cancelSpeech();
      setIsPlaying(false);
      return;
    }
    setIsPlaying(true);
    speak(text).finally(() => setIsPlaying(false));
  }

  return (
    <div
      className="flashcard"
      onClick={!flipped ? onFlip : undefined}
      role="button"
      tabIndex={flipped ? -1 : 0}
      aria-label={flipped ? undefined : 'Flip card to reveal example'}
      onKeyDown={(e) => { if (!flipped && (e.key === 'Enter' || e.key === ' ')) onFlip(); }}
    >
      <div className={`flashcard__inner${flipped ? ' flashcard__inner--flipped' : ''}`}>
        {/* Front — phrase + pronunciation */}
        <div className="flashcard__face flashcard__front">
          <p className="flashcard__phrase">{card.phrase}</p>
          <p className="flashcard__pronunciation">{card.pronunciation}</p>
          <span className="flashcard__tap-hint">tap to flip</span>
          <button
            className={`flashcard__speak${isPlaying ? ' flashcard__speak--playing' : ''}`}
            onClick={(e) => handleSpeak(card.phrase, e)}
            aria-label={isPlaying ? 'Stop' : 'Listen to phrase'}
            title={isPlaying ? 'Stop' : 'Listen'}
          >
            <SpeakerIcon playing={isPlaying} />
          </button>
        </div>

        {/* Back — example sentence */}
        <div className="flashcard__face flashcard__back">
          <p className="flashcard__phrase flashcard__phrase--back">{card.phrase}</p>
          <p
            className="flashcard__example"
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
          <button
            className={`flashcard__speak${isPlaying ? ' flashcard__speak--playing' : ''}`}
            onClick={(e) => handleSpeak(card.example, e)}
            aria-label={isPlaying ? 'Stop' : 'Listen to example'}
            title={isPlaying ? 'Stop' : 'Listen to example'}
          >
            <SpeakerIcon playing={isPlaying} />
          </button>
        </div>
      </div>
    </div>
  );
}
