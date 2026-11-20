import React from 'react';
import { Link } from 'react-router-dom';
import { ChapterJustUnlocked } from '../../types';
import { HerbSprigIcon } from '../../assets/trail/lensMicroIcons';
import './CompanionDrawer.css';

function formatChapterLabel(book: string, chapter: number): string {
  return book === 'Psalms' ? `Psalm ${chapter}` : `${book} ${chapter}`;
}

export interface ChapterBloomToastProps {
  /** Deduplicated queue of chapters unlocked in the current typing session. */
  sessionUnlocks: ChapterJustUnlocked[];
  /** Whether the latest whisper pill was dismissed (harvest strip remains accessible when > 1). */
  dismissedLatest: boolean;
  onOpenCompanion: (unlock: ChapterJustUnlocked) => void;
  onDismissLatest: () => void;
}

/**
 * Quiet, focus-preserving Chapter Bloom whisper pill + Session Harvest Strip
 * for autoAdvance && !zenMode in TypingTest.tsx (Story 11.3 / AD-15).
 * Always renders a single aria-live="polite" aria-atomic="true" region.
 */
export const ChapterBloomToast: React.FC<ChapterBloomToastProps> = ({
  sessionUnlocks,
  dismissedLatest,
  onOpenCompanion,
  onDismissLatest,
}) => {
  const latest = sessionUnlocks.length > 0 ? sessionUnlocks[sessionUnlocks.length - 1] : null;
  const showWhisperPill = Boolean(latest && !dismissedLatest);
  const showHarvestStrip = sessionUnlocks.length > 1;

  return (
    <div className="chapter-bloom-toast-region" data-testid="chapter-bloom-toast-region">
      <div
        className="chapter-bloom-live-region"
        aria-live="polite"
        aria-atomic="true"
        data-testid="chapter-bloom-live-region"
      >
        {showWhisperPill && latest && (
          <div className="chapter-bloom-whisper-pill" data-testid="chapter-bloom-whisper-pill">
            <div className="chapter-bloom-whisper-text">
              <HerbSprigIcon size={16} className="chapter-bloom-icon" aria-hidden />
              <span>
                <strong>{formatChapterLabel(latest.book, latest.chapter)} Bloomed</strong> ·
                Companion Unlocked
              </span>
            </div>
            <div className="chapter-bloom-whisper-actions">
              <button
                type="button"
                className="chapter-bloom-open-btn"
                onClick={() => onOpenCompanion(latest)}
                data-testid="chapter-bloom-open-btn"
              >
                Open Reading Room
              </button>
              <button
                type="button"
                className="chapter-bloom-dismiss-btn"
                onClick={onDismissLatest}
                aria-label="Dismiss chapter unlock notification"
                data-testid="chapter-bloom-dismiss-btn"
              >
                Dismiss ×
              </button>
            </div>
          </div>
        )}
      </div>

      {showHarvestStrip && (
        <div
          className="session-harvest-strip"
          aria-label="Chapters unlocked this session"
          data-testid="session-harvest-strip"
        >
          <span className="session-harvest-kicker">
            ✦ {sessionUnlocks.length} Chapters Unlocked This Session
          </span>
          <div className="session-harvest-chips">
            {sessionUnlocks.map((unlock) => {
              const key = `${unlock.book}:${unlock.chapter}`;
              return (
                <button
                  key={key}
                  type="button"
                  className="session-harvest-chip"
                  onClick={() => onOpenCompanion(unlock)}
                  data-testid={`session-harvest-chip-${unlock.book}-${unlock.chapter}`}
                >
                  {formatChapterLabel(unlock.book, unlock.chapter)}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export interface ZenBloomChipProps {
  sessionUnlocks: ChapterJustUnlocked[];
  onOpenCompanion: (unlock: ChapterJustUnlocked) => void;
}

/**
 * Minimalist mono chip rendered inside .zen-topbar beside "Exit Zen (Esc)" (Story 11.3 AC2-3).
 */
export const ZenBloomChip: React.FC<ZenBloomChipProps> = ({
  sessionUnlocks,
  onOpenCompanion,
}) => {
  if (sessionUnlocks.length === 0) return null;
  const latest = sessionUnlocks[sessionUnlocks.length - 1];
  const label =
    sessionUnlocks.length === 1
      ? `✦ ${formatChapterLabel(latest.book, latest.chapter)} Unlocked (1)`
      : `✦ ${sessionUnlocks.length} Chapters Unlocked`;

  return (
    <button
      type="button"
      className="zen-bloom-chip"
      onClick={() => onOpenCompanion(latest)}
      data-testid="zen-bloom-chip"
    >
      {label}
    </button>
  );
};

export interface ChapterBloomBannerProps {
  unlock: ChapterJustUnlocked;
  onOpenCompanion: (unlock: ChapterJustUnlocked) => void;
}

/**
 * Inline Chapter Bloom Banner rendered inside .results-container when !autoAdvance && !zenMode (Story 11.3 AC4).
 */
export const ChapterBloomBanner: React.FC<ChapterBloomBannerProps> = ({
  unlock,
  onOpenCompanion,
}) => {
  const chapterLabel = formatChapterLabel(unlock.book, unlock.chapter);
  return (
    <div className="chapter-bloom-banner" data-testid="chapter-bloom-banner">
      <div className="chapter-bloom-banner-header">
        <HerbSprigIcon size={16} className="chapter-bloom-icon" aria-hidden />
        <span className="chapter-bloom-banner-kicker">CHAPTER BLOOMED · COMPANION UNLOCKED</span>
      </div>
      <p className="chapter-bloom-banner-copy">
        You completed every verse of <strong>{chapterLabel}</strong> ({unlock.totalVerses} verses).
        Multi-lens commentary is ready in the Reading Room.
      </p>
      <div className="chapter-bloom-banner-actions">
        <button
          type="button"
          className="primary-button"
          onClick={() => onOpenCompanion(unlock)}
          data-testid="results-open-companion-btn"
        >
          Open Companion Reading Room
        </button>
        <Link
          to={`/trail?book=${encodeURIComponent(unlock.book)}`}
          className="secondary-button"
          data-testid="results-view-trail-link"
        >
          View on Living Trail
        </Link>
      </div>
    </div>
  );
};

export default ChapterBloomToast;
