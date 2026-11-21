import React, { useEffect, useId, useRef } from 'react';
import { TrailBookOverview } from '../../types';
import { PHASE1_ACTIVE_BOOKS } from '../../data/trailBiomes';
import './TrailOverlays.css';

export interface HydratedAtlasBook extends TrailBookOverview {
  readonly canonicalChapters: number;
}

export interface HydratedAtlasBiome {
  readonly biomeId: string;
  readonly order: number;
  readonly name: string;
  readonly shortName: string;
  readonly phase: 1 | 2 | 3;
  readonly motif: string;
  readonly books: readonly HydratedAtlasBook[];
}

export interface WorldAtlasDrawerProps {
  isOpen: boolean;
  biomes: readonly HydratedAtlasBiome[];
  selectedBook: 'Genesis' | 'Psalms';
  totalCanonBloomed: number;
  totalCanonChapters: number;
  totalCanonBooks: number;
  travelerSummary: string;
  focusBiomeId?: string | null;
  onSelectBook: (book: 'Genesis' | 'Psalms') => void;
  onClose: () => void;
}

export const WorldAtlasDrawer: React.FC<WorldAtlasDrawerProps> = ({
  isOpen,
  biomes,
  selectedBook,
  totalCanonBloomed,
  totalCanonChapters,
  totalCanonBooks,
  travelerSummary,
  focusBiomeId = null,
  onSelectBook,
  onClose,
}) => {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef<boolean>(false);
  const pointerDownOutsideRef = useRef<boolean>(false);

  // Open/close native <dialog> via showModal() with JSDOM fallback
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !wasOpenRef.current) {
      wasOpenRef.current = true;
      if (typeof dialog.showModal === 'function') {
        if (!dialog.open) {
          dialog.showModal();
        }
      } else {
        dialog.setAttribute('open', '');
      }
      closeButtonRef.current?.focus();

      if (focusBiomeId) {
        const target = dialog.querySelector<HTMLElement>(
          `[data-biome-id="${focusBiomeId}"]`
        );
        if (target && typeof target.scrollIntoView === 'function') {
          target.scrollIntoView({ block: 'nearest' });
        }
      }
    } else if (!isOpen && wasOpenRef.current) {
      wasOpenRef.current = false;
      if (typeof dialog.close === 'function') {
        if (dialog.open) {
          dialog.close();
        }
      } else {
        dialog.removeAttribute('open');
      }
    }
  }, [isOpen, focusBiomeId]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };

    const handleClose = () => {
      dialog.returnValue = '';
      if (wasOpenRef.current) {
        onClose();
      }
    };

    const supportsClosedBy =
      typeof HTMLDialogElement !== 'undefined' && 'closedBy' in HTMLDialogElement.prototype;
    const supportsNativeModal = typeof dialog.showModal === 'function';

    const isOutside = (clientX: number, clientY: number): boolean => {
      const r = dialog.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return true;
      return clientX < r.left || clientX > r.right || clientY < r.top || clientY > r.bottom;
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (supportsClosedBy) return;
      pointerDownOutsideRef.current =
        e.target === dialog && isOutside(e.clientX, e.clientY);
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (supportsClosedBy) return;
      if (
        pointerDownOutsideRef.current &&
        e.target === dialog &&
        isOutside(e.clientX, e.clientY)
      ) {
        pointerDownOutsideRef.current = false;
        onClose();
      } else {
        pointerDownOutsideRef.current = false;
      }
    };

    const handleFallbackKeyDown = (e: KeyboardEvent) => {
      if (!supportsNativeModal && isOpen && e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    dialog.addEventListener('cancel', handleCancel);
    dialog.addEventListener('close', handleClose);
    dialog.addEventListener('pointerdown', handlePointerDown);
    dialog.addEventListener('pointerup', handlePointerUp);
    dialog.addEventListener('keydown', handleFallbackKeyDown);

    return () => {
      dialog.removeEventListener('cancel', handleCancel);
      dialog.removeEventListener('close', handleClose);
      dialog.removeEventListener('pointerdown', handlePointerDown);
      dialog.removeEventListener('pointerup', handlePointerUp);
      dialog.removeEventListener('keydown', handleFallbackKeyDown);
    };
  }, [isOpen, onClose]);

  const handleChooseBook = (book: 'Genesis' | 'Psalms') => {
    onSelectBook(book);
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className="world-atlas-drawer"
      aria-labelledby={titleId}
      data-testid="world-atlas-drawer"
      {...({ closedby: 'any' } as any)}
    >
      <div className="world-atlas-drawer-header">
        <div className="world-atlas-drawer-top">
          <span className="trail-badges-kicker">
            WORLD BIBLICAL ATLAS · 9 REGIONS · {totalCanonBooks} CANONICAL BOOKS
          </span>
          <button
            ref={closeButtonRef}
            type="button"
            className="trail-dialog-close-btn"
            onClick={onClose}
            data-testid="world-atlas-close-btn"
          >
            Close [Esc]
          </button>
        </div>

        <h2 id={titleId} className="world-atlas-drawer-title">
          Canonical Biome Atlas
        </h2>
        <p className="world-atlas-drawer-subtitle">
          ✦ {totalCanonBloomed} / {totalCanonChapters} Chapters Bloomed · Traveler at{' '}
          {travelerSummary} · Phase 1 Playable: Genesis &amp; Psalms
        </p>
      </div>

      <div className="world-atlas-drawer-body" data-testid="trail-macro-atlas">
        <ol className="atlas-biome-strip atlas-biome-strip--drawer">
          {biomes.map((biome) => {
            const containsActiveBook = biome.books.some((b) => b.book === selectedBook);
            const hasPlayablePhase1 = biome.books.some(
              (b) => b.phase1Active || PHASE1_ACTIVE_BOOKS.has(b.book)
            );
            const isFocused = focusBiomeId === biome.biomeId;

            const cardClasses = [
              'atlas-biome-card',
              containsActiveBook ? 'atlas-biome-card--active' : '',
              !hasPlayablePhase1 ? 'atlas-biome-card--horizon' : '',
              isFocused ? 'atlas-biome-card--focused' : '',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <li
                key={biome.biomeId}
                className={cardClasses}
                data-biome-id={biome.biomeId}
                data-testid={`atlas-biome-${biome.biomeId}`}
              >
                <div className="atlas-biome-card-top">
                  <span className="atlas-biome-order">Region {biome.order}</span>
                  <span
                    className={
                      hasPlayablePhase1
                        ? 'atlas-phase-badge atlas-phase-badge--playable'
                        : 'atlas-phase-badge'
                    }
                  >
                    {hasPlayablePhase1
                      ? 'Phase 1 Playable'
                      : `Phase ${biome.phase} · Mist-Veiled`}
                  </span>
                </div>

                <div>
                  <h3 className="atlas-biome-title">{biome.name}</h3>
                  <p className="atlas-biome-motif">{biome.motif}</p>
                </div>

                <ul className="atlas-biome-books">
                  {biome.books.map((bk) => {
                    if (bk.phase1Active) {
                      const isSelected = selectedBook === bk.book;
                      return (
                        <li
                          key={bk.book}
                          style={{ width: '100%' }}
                          data-book={bk.book}
                          data-phase1-active="true"
                        >
                          <button
                            type="button"
                            className="atlas-playable-book-btn"
                            aria-pressed={isSelected}
                            onClick={() =>
                              handleChooseBook(bk.book as 'Genesis' | 'Psalms')
                            }
                            data-testid={`atlas-book-btn-${bk.book}`}
                          >
                            <span className="atlas-playable-book-row">
                              <span className="atlas-playable-book-name">
                                {bk.bookMastered ? '✦ ' : ''}
                                {bk.book}
                              </span>
                              <span className="atlas-playable-book-bloom">
                                {bk.bloomedChapters} / {bk.totalChapters} Chapters Bloomed
                              </span>
                            </span>
                            <span className="atlas-playable-book-landmark">
                              Landmark: {bk.landmarkName}
                              {bk.bookMastered ? ' · Sanctuary Illuminated' : ''}
                            </span>
                          </button>
                        </li>
                      );
                    }

                    return (
                      <li
                        key={bk.book}
                        className="atlas-book-chip--veiled"
                        data-book={bk.book}
                        data-phase1-active="false"
                        title={`${bk.book} (${bk.totalChapters} ch.) — Mist-veiled future horizon`}
                      >
                        <span className="atlas-veiled-glyph" aria-hidden="true">
                          ◌
                        </span>
                        <span>{bk.book}</span>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ol>
      </div>
    </dialog>
  );
};

export default WorldAtlasDrawer;
