import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookGuideResponse,
  ChapterCompanionResponse,
  PrimaryCompanionLens,
} from '../../types';
import { CompanionService } from '../../services/api';
import {
  HerbSprigIcon,
  LanternCircleIcon,
  OpenCodexIcon,
} from '../../assets/trail/lensMicroIcons';
import { CompanionLensPanel } from './CompanionLensPanel';
import { BookGuidePanel } from './BookGuidePanel';
import './CompanionDrawer.css';

export type CompanionDrawerMode = 'chapter' | 'guide';

export interface CompanionDrawerProps {
  isOpen: boolean;
  book: string;
  chapter?: number | null;
  initialMode?: CompanionDrawerMode;
  /** Convenience alias supported for LivingTrailPage integration (Story 12.3). */
  mode?: CompanionDrawerMode;
  workId?: string;
  onClose: () => void;
  /** Called when navigating Prev/Next chapter inside the drawer. */
  onNavigateChapter?: (book: string, chapter: number) => void;
  /** Optional custom handler for "Type Chapter N" CTAs; defaults to navigating to /typing?book=...&chapter=... */
  onTypeChapter?: (book: string, chapter: number) => void;
  maxChapter?: number;
}

const LENS_TABS: ReadonlyArray<{
  key: PrimaryCompanionLens;
  label: string;
}> = [
  { key: 'hoodoo-folk', label: 'Hoodoo & Folk' },
  { key: 'historical-classic', label: 'Historical & Classic' },
  { key: 'community', label: 'Community r/Bible' },
];

const BIOME_SUBTITLES: Record<string, string> = {
  Genesis: 'Eden Root-Garden & Covenant Plains',
  Psalms: "Twilight Shepherd's Sanctuary",
};

const KNOWN_MAX_CHAPTERS: Record<string, number> = {
  Genesis: 50,
  Psalms: 150,
};

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function formatChapterTitle(book: string, chapter: number): string {
  return book === 'Psalms' ? `Psalm ${chapter}` : `${book} ${chapter}`;
}

function formatBloomedDate(iso?: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function renderLensIcon(lens: PrimaryCompanionLens) {
  switch (lens) {
    case 'hoodoo-folk':
      return <HerbSprigIcon size={16} className="companion-tab-icon" aria-hidden />;
    case 'historical-classic':
      return <OpenCodexIcon size={16} className="companion-tab-icon" aria-hidden />;
    case 'community':
      return <LanternCircleIcon size={16} className="companion-tab-icon" aria-hidden />;
  }
}

export const CompanionDrawer: React.FC<CompanionDrawerProps> = ({
  isOpen,
  book,
  chapter = null,
  initialMode,
  mode: modeProp,
  workId = 'web-bible',
  onClose,
  onNavigateChapter,
  onTypeChapter,
  maxChapter,
}) => {
  const navigate = useNavigate();
  const baseId = useId();
  const titleId = `${baseId}-title`;

  const resolvedInitialMode: CompanionDrawerMode =
    initialMode ?? modeProp ?? (chapter !== null && chapter !== undefined ? 'chapter' : 'guide');

  const [activeMode, setActiveMode] = useState<CompanionDrawerMode>(resolvedInitialMode);
  const [internalChapter, setInternalChapter] = useState<number | null>(chapter ?? null);
  const [activeLens, setActiveLens] = useState<PrimaryCompanionLens>('hoodoo-folk');

  const [chapterData, setChapterData] = useState<ChapterCompanionResponse | null>(null);
  const [guideData, setGuideData] = useState<BookGuideResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef<boolean>(false);
  const pointerDownOutsideRef = useRef<boolean>(false);

  // Sync controlled props when drawer opens or target changes
  useEffect(() => {
    setInternalChapter(chapter ?? null);
  }, [chapter]);

  useEffect(() => {
    if (isOpen) {
      const nextMode =
        initialMode ?? modeProp ?? (chapter !== null && chapter !== undefined ? 'chapter' : 'guide');
      setActiveMode(nextMode);
    }
  }, [isOpen, initialMode, modeProp, chapter, book]);

  const effectiveChapter = internalChapter ?? chapter ?? null;

  const bookMaxChapter = useMemo(() => {
    if (maxChapter && maxChapter > 0) return maxChapter;
    if (guideData?.bookProgress?.totalChapters) return guideData.bookProgress.totalChapters;
    return KNOWN_MAX_CHAPTERS[book] ?? undefined;
  }, [maxChapter, guideData?.bookProgress?.totalChapters, book]);

  // Open/close native <dialog> via showModal() with JSDOM fallback + focus capture/restoration
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !wasOpenRef.current) {
      wasOpenRef.current = true;
      previousFocusRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;

      if (typeof dialog.showModal === 'function') {
        if (!dialog.open) {
          dialog.showModal();
        }
      } else {
        dialog.setAttribute('open', '');
      }

      closeButtonRef.current?.focus();
    } else if (!isOpen && wasOpenRef.current) {
      wasOpenRef.current = false;
      if (typeof dialog.close === 'function') {
        if (dialog.open) {
          dialog.close();
        }
      } else {
        dialog.removeAttribute('open');
      }

      const prev = previousFocusRef.current;
      previousFocusRef.current = null;
      if (prev && prev.isConnected && typeof prev.focus === 'function') {
        prev.focus();
      }
    }
  }, [isOpen]);

  // Restore focus cleanly if unmounted while open
  useEffect(() => {
    return () => {
      if (wasOpenRef.current) {
        wasOpenRef.current = false;
        const prev = previousFocusRef.current;
        previousFocusRef.current = null;
        if (prev && prev.isConnected && typeof prev.focus === 'function') {
          prev.focus();
        }
      }
    };
  }, []);

  // Native <dialog> cancel event (Esc / mobile back gesture) + closedby="any" fallback
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };

    const supportsClosedBy =
      typeof HTMLDialogElement !== 'undefined' && 'closedBy' in HTMLDialogElement.prototype;

    const isPointOutsideDialog = (clientX: number, clientY: number): boolean => {
      const rect = dialog.getBoundingClientRect();
      // In JSDOM getBoundingClientRect() returns all zeros; treat target===dialog clicks as backdrop
      if (rect.width === 0 && rect.height === 0) {
        return true;
      }
      return (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      );
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (supportsClosedBy) return;
      pointerDownOutsideRef.current =
        e.target === dialog && isPointOutsideDialog(e.clientX, e.clientY);
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (supportsClosedBy) return;
      if (
        pointerDownOutsideRef.current &&
        e.target === dialog &&
        isPointOutsideDialog(e.clientX, e.clientY)
      ) {
        pointerDownOutsideRef.current = false;
        onClose();
      } else {
        pointerDownOutsideRef.current = false;
      }
    };

    const handleBackdropClick = (e: MouseEvent) => {
      if (supportsClosedBy) return;
      if (e.target !== dialog) return;
      if (isPointOutsideDialog(e.clientX, e.clientY)) {
        onClose();
      }
    };

    dialog.addEventListener('cancel', handleCancel);
    dialog.addEventListener('pointerdown', handlePointerDown);
    dialog.addEventListener('pointerup', handlePointerUp);
    dialog.addEventListener('click', handleBackdropClick);

    return () => {
      dialog.removeEventListener('cancel', handleCancel);
      dialog.removeEventListener('pointerdown', handlePointerDown);
      dialog.removeEventListener('pointerup', handlePointerUp);
      dialog.removeEventListener('click', handleBackdropClick);
    };
  }, [onClose]);

  // Fetch chapter companion or book guide data when open
  useEffect(() => {
    if (!isOpen || !book) return;

    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        if (activeMode === 'guide' || !effectiveChapter) {
          const guide = await CompanionService.getBookGuide(book, workId);
          if (!cancelled) {
            setGuideData(guide);
          }
        } else {
          const companion = await CompanionService.getChapterCompanion(
            book,
            effectiveChapter,
            workId
          );
          if (!cancelled) {
            setChapterData(companion);
            if (companion.unlocked) {
              const firstWithEntries =
                LENS_TABS.find((t) => (companion.lenses[t.key]?.length ?? 0) > 0)?.key ??
                'hoodoo-folk';
              setActiveLens(firstWithEntries);
            }
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(
            err?.response?.data?.message ||
              err?.message ||
              'Unable to load Companion Reading Room notes.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [isOpen, book, effectiveChapter, activeMode, workId]);

  const handleDialogKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDialogElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        ).filter((el) => !el.hasAttribute('hidden') && el.closest('[hidden]') === null);

        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;

        if (e.shiftKey) {
          if (active === first || !dialogRef.current.contains(active)) {
            e.preventDefault();
            last.focus();
          }
        } else if (active === last || !dialogRef.current.contains(active)) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose]
  );

  const selectLensTab = useCallback((lens: PrimaryCompanionLens, focusTab = false) => {
    setActiveLens(lens);
    const idx = LENS_TABS.findIndex((t) => t.key === lens);
    const tabBtn = tabRefs.current[idx];
    if (tabBtn) {
      if (focusTab) {
        tabBtn.focus();
      }
      if (typeof tabBtn.scrollIntoView === 'function') {
        tabBtn.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    }
  }, []);

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    let nextIndex: number | null = null;
    if (e.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % LENS_TABS.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + LENS_TABS.length) % LENS_TABS.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = LENS_TABS.length - 1;
    }

    if (nextIndex !== null) {
      e.preventDefault();
      selectLensTab(LENS_TABS[nextIndex].key, true);
    }
  };

  const handleChapterStep = (targetChapter: number) => {
    if (targetChapter < 1) return;
    if (bookMaxChapter && targetChapter > bookMaxChapter) return;
    setInternalChapter(targetChapter);
    setActiveMode('chapter');
    onNavigateChapter?.(book, targetChapter);
  };

  const handleTriggerTypeChapter = (targetBook: string, targetChapter: number) => {
    if (onTypeChapter) {
      onTypeChapter(targetBook, targetChapter);
      onClose();
      return;
    }
    onClose();
    navigate(`/typing?book=${encodeURIComponent(targetBook)}&chapter=${targetChapter}`);
  };

  const handleSelectChapterFromGuide = (targetBook: string, targetChapter: number) => {
    setInternalChapter(targetChapter);
    setActiveMode('chapter');
    onNavigateChapter?.(targetBook, targetChapter);
  };

  if (!isOpen) {
    return (
      <dialog
        ref={dialogRef}
        className="companion-drawer"
        aria-labelledby={titleId}
        {...({ closedby: 'any' } as any)}
      />
    );
  }

  const workKicker =
    workId === 'web-bible'
      ? 'COMPANION READING ROOM · WEB'
      : `COMPANION READING ROOM · ${workId.toUpperCase()}`;

  const biomeSubtitle = BIOME_SUBTITLES[book] ?? `${book} Study Atlas`;
  const headingTitle =
    activeMode === 'guide' || !effectiveChapter
      ? `${book} — Book Guide`
      : formatChapterTitle(book, effectiveChapter);

  const bloomDateLabel =
    chapterData && chapterData.unlocked ? formatBloomedDate(chapterData.progress.unlockedAt) : null;

  const canGoPrev = activeMode === 'chapter' && effectiveChapter !== null && effectiveChapter > 1;
  const nextChapterNum =
    activeMode === 'chapter' && effectiveChapter !== null ? effectiveChapter + 1 : null;
  const canGoNext =
    nextChapterNum !== null && (!bookMaxChapter || nextChapterNum <= bookMaxChapter);

  return (
    <dialog
      ref={dialogRef}
      className="companion-drawer"
      aria-labelledby={titleId}
      onKeyDown={handleDialogKeyDown}
      data-testid="companion-drawer"
      {...({ closedby: 'any' } as any)}
    >
      <div className="companion-drawer-surface">
        <header className="companion-drawer-header">
          <div className="companion-drawer-topbar">
            <div className="companion-drawer-kicker-group">
              <HerbSprigIcon size={16} className="companion-biome-crest" aria-hidden />
              <span className="companion-drawer-kicker">{workKicker}</span>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              className="companion-close-button"
              onClick={onClose}
              aria-label="Close Companion Reading Room"
              data-testid="companion-close-button"
            >
              Esc ×
            </button>
          </div>

          <div className="companion-drawer-title-row">
            <div>
              <h2 id={titleId} className="companion-drawer-title">
                {headingTitle}
              </h2>
              <p className="companion-drawer-subtitle">{biomeSubtitle}</p>
            </div>

            {effectiveChapter !== null && (
              <div className="companion-mode-switcher" role="group" aria-label="Reading Room view">
                <button
                  type="button"
                  className={`companion-mode-pill ${activeMode === 'chapter' ? 'is-active' : ''}`}
                  aria-pressed={activeMode === 'chapter'}
                  onClick={() => setActiveMode('chapter')}
                  data-testid="companion-mode-chapter"
                >
                  Chapter Notes
                </button>
                <button
                  type="button"
                  className={`companion-mode-pill ${activeMode === 'guide' ? 'is-active' : ''}`}
                  aria-pressed={activeMode === 'guide'}
                  onClick={() => setActiveMode('guide')}
                  data-testid="companion-mode-guide"
                >
                  Book Guide
                </button>
              </div>
            )}
          </div>

          {activeMode === 'chapter' && chapterData && chapterData.unlocked && (
            <p className="companion-bloom-stats" data-testid="companion-bloom-stats">
              {bloomDateLabel ? `Bloomed ${bloomDateLabel} · ` : 'Bloomed · '}
              {chapterData.progress.completedVerses}/{chapterData.progress.totalVerses} verses
              {chapterData.progress.bestWPM > 0
                ? ` · Best ${Math.round(chapterData.progress.bestWPM)} WPM`
                : ''}
              {chapterData.progress.bestAccuracy > 0
                ? ` · ${Math.round(chapterData.progress.bestAccuracy)}% Acc`
                : ''}
            </p>
          )}
        </header>

        {activeMode === 'chapter' && chapterData && chapterData.unlocked && !loading && !error && (
          <div
            role="tablist"
            aria-label="Companion study lenses"
            className="companion-tablist"
            data-testid="companion-tablist"
          >
            {LENS_TABS.map((tab, index) => {
              const isSelected = activeLens === tab.key;
              const count = chapterData.lensCounts?.[tab.key] ?? 0;
              return (
                <button
                  key={tab.key}
                  ref={(el) => {
                    tabRefs.current[index] = el;
                  }}
                  type="button"
                  id={`${baseId}-tab-${tab.key}`}
                  role="tab"
                  aria-selected={isSelected}
                  tabIndex={isSelected ? 0 : -1}
                  className={`companion-tab companion-tab--${tab.key}`}
                  onClick={() => selectLensTab(tab.key, false)}
                  onKeyDown={(e) => handleTabKeyDown(e, index)}
                  data-testid={`companion-tab-${tab.key}`}
                >
                  {renderLensIcon(tab.key)}
                  <span className="companion-tab-label">{tab.label}</span>
                  <span className="companion-tab-count" aria-label={`${count} entries`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="companion-drawer-body">
          {loading && (
            <div className="companion-loading-state" role="status">
              <p>Opening the Reading Room…</p>
            </div>
          )}

          {!loading && error && (
            <div className="companion-error-state" role="alert">
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && activeMode === 'guide' && guideData && (
            <BookGuidePanel
              guide={guideData}
              onTypeChapter={handleTriggerTypeChapter}
              onSelectChapterCompanion={handleSelectChapterFromGuide}
              onClose={onClose}
            />
          )}

          {!loading && !error && activeMode === 'chapter' && chapterData && !chapterData.unlocked && (
            <section
              className="companion-locked-teaser"
              aria-label="Locked chapter preview"
              data-testid="companion-locked-teaser"
            >
              <p className="companion-section-kicker">CHAPTER VEILED IN MIST · LOCKED</p>
              <h3 className="companion-locked-heading">
                Complete {formatChapterTitle(chapterData.book, chapterData.chapter)} to Unlock
                Study Notes
              </h3>
              <p className="companion-locked-copy">
                Finish transcribing every verse in this chapter to bloom its waypoint on the Living
                Trail and open all curated commentary lenses.
              </p>

              <div className="companion-locked-progress">
                <div className="companion-guide-progress-header">
                  <span className="companion-section-kicker">Verse Progress</span>
                  <span className="companion-guide-progress-stats">
                    {chapterData.progress.completedVerses} / {chapterData.progress.totalVerses}{' '}
                    verses
                  </span>
                </div>
                <progress
                  className="companion-progress-meter"
                  value={chapterData.progress.completedVerses}
                  max={Math.max(1, chapterData.progress.totalVerses)}
                  aria-label="Chapter completion progress"
                />
              </div>

              <div className="companion-locked-lenses" data-testid="companion-locked-lens-counts">
                <span className="companion-section-kicker">Waiting Inside Reading Room</span>
                <ul className="companion-locked-lens-list">
                  {LENS_TABS.map((tab) => (
                    <li key={tab.key} className="companion-locked-lens-pill">
                      {renderLensIcon(tab.key)}
                      <span>
                        {tab.label} ({chapterData.lensCounts[tab.key] ?? 0})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="companion-locked-cta">
                <button
                  type="button"
                  className="primary-button"
                  onClick={() =>
                    handleTriggerTypeChapter(chapterData.book, chapterData.chapter)
                  }
                  data-testid="companion-continue-typing-btn"
                >
                  Continue Typing Chapter {chapterData.chapter} →
                </button>
              </div>
            </section>
          )}

          {!loading && !error && activeMode === 'chapter' && chapterData && chapterData.unlocked && (
            <>
              {LENS_TABS.map((tab) => (
                <CompanionLensPanel
                  key={tab.key}
                  lens={tab.key}
                  book={chapterData.book}
                  chapter={chapterData.chapter}
                  entries={chapterData.lenses[tab.key] ?? []}
                  id={`${baseId}-panel-${tab.key}`}
                  labelledBy={`${baseId}-tab-${tab.key}`}
                  hidden={activeLens !== tab.key}
                />
              ))}
            </>
          )}
        </div>

        <footer className="companion-drawer-footer">
          {canGoPrev && effectiveChapter !== null ? (
            <button
              type="button"
              className="secondary-button companion-footer-btn"
              onClick={() => handleChapterStep(effectiveChapter - 1)}
              data-testid="companion-prev-chapter"
            >
              ← Prev Chapter
            </button>
          ) : (
            <span className="companion-footer-spacer" aria-hidden="true" />
          )}

          <Link
            to={`/trail?book=${encodeURIComponent(book)}`}
            className="secondary-button companion-footer-btn"
            onClick={onClose}
            data-testid="companion-view-trail-link"
          >
            View on Living Trail
          </Link>

          {canGoNext && nextChapterNum !== null ? (
            <button
              type="button"
              className="primary-button companion-footer-btn"
              onClick={() => handleTriggerTypeChapter(book, nextChapterNum)}
              data-testid="companion-type-next-chapter"
            >
              Type {formatChapterTitle(book, nextChapterNum)} →
            </button>
          ) : (
            <span className="companion-footer-spacer" aria-hidden="true" />
          )}
        </footer>
      </div>
    </dialog>
  );
};

export default CompanionDrawer;
