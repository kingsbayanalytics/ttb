import React from 'react';
import { Link } from 'react-router-dom';
import { ChapterJustUnlocked } from '../../types';
import { HerbSprigIcon } from '../../assets/trail/lensMicroIcons';
import {
  buildChapterTrailStepSummary,
  formatChapterLabel,
} from '../trail/trailStepNotice';
import './CompanionDrawer.css';

export interface SessionHarvestStripProps {
  sessionUnlocks: ChapterJustUnlocked[];
  onOpenCompanion: (unlock: ChapterJustUnlocked) => void;
}

/**
 * Compact inline session strip displayed above the verse when 2+ chapters
 * have been unlocked in the current typing session.
 */
export const SessionHarvestStrip: React.FC<SessionHarvestStripProps> = ({
  sessionUnlocks,
  onOpenCompanion,
}) => {
  if (sessionUnlocks.length <= 1) return null;

  return (
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
  );
};

export interface ChapterBloomToastProps {
  /** Deduplicated queue of chapters unlocked in the current typing session. */
  sessionUnlocks: ChapterJustUnlocked[];
  /** Whether the latest whisper pill was dismissed (harvest strip remains accessible when > 1). */
  dismissedLatest: boolean;
  onOpenCompanion: (unlock: ChapterJustUnlocked) => void;
  onDismissLatest: () => void;
}

/**
 * Legacy inline wrapper retained for external imports. Active TypingTest surfaces the latest
 * chapter bloom inside the shared bottom-right BadgeUnlockToast Top-Layer stack and keeps
 * SessionHarvestStrip inline above the verse.
 */
export const ChapterBloomToast: React.FC<ChapterBloomToastProps> = ({
  sessionUnlocks,
  dismissedLatest,
  onOpenCompanion,
  onDismissLatest,
}) => {
  const latest = sessionUnlocks.length > 0 ? sessionUnlocks[sessionUnlocks.length - 1] : null;
  const showWhisperPill = Boolean(latest && !dismissedLatest);
  const summary = latest ? buildChapterTrailStepSummary(latest) : null;

  return (
    <div className="chapter-bloom-toast-region" data-testid="chapter-bloom-toast-region">
      <div
        className="chapter-bloom-live-region"
        aria-live="polite"
        aria-atomic="true"
        data-testid="chapter-bloom-live-region"
      >
        {showWhisperPill && latest && summary && (
          <div className="chapter-bloom-whisper-pill" data-testid="chapter-bloom-whisper-pill">
            <div className="chapter-bloom-whisper-text">
              <HerbSprigIcon size={16} className="chapter-bloom-icon" aria-hidden />
              <span>
                <strong>{summary.chapterLabel} Bloomed</strong> · Companion Unlocked
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
              <Link
                to={summary.trailHref}
                className="chapter-bloom-dismiss-btn"
                data-testid="chapter-bloom-trail-link"
              >
                View on Trail →
              </Link>
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

      <SessionHarvestStrip
        sessionUnlocks={sessionUnlocks}
        onOpenCompanion={onOpenCompanion}
      />
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
  const summary = buildChapterTrailStepSummary(unlock);
  return (
    <div className="chapter-bloom-banner" data-testid="chapter-bloom-banner">
      <div className="chapter-bloom-banner-shell">
        <img
          src={summary.iconPath}
          alt=""
          width={48}
          height={48}
          className="chapter-bloom-banner-art"
        />
        <div className="chapter-bloom-banner-main">
          <div className="chapter-bloom-banner-header">
            <span className="chapter-bloom-banner-kicker">{summary.kicker}</span>
            <span className="chapter-toast-companion-tag">Companion Unlocked</span>
          </div>
          <p className="chapter-bloom-banner-copy">
            <strong>{summary.chapterLabel} Bloomed</strong> — {summary.stepCopy} ({unlock.totalVerses}{' '}
            {unlock.totalVerses === 1 ? 'verse' : 'verses'}). Multi-lens commentary is ready in the
            Reading Room.
          </p>
          {summary.propNote && (
            <p
              className={`chapter-toast-prop-note ${
                summary.propAwakened ? 'chapter-toast-prop-note--awakened' : ''
              }`.trim()}
            >
              {summary.propNote}
            </p>
          )}
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
              to={summary.trailHref}
              className="secondary-button"
              data-testid="results-view-trail-link"
            >
              View on Living Trail
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChapterBloomToast;
