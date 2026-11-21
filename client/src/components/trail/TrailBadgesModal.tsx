import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AchievementsData, BadgeCategory, BadgeItem } from '../../types';
import {
  BADGE_CATEGORY_META,
  getBadgeFlavor,
  getBadgeMedallionPath,
  getBadgeRibbonLabel,
} from '../../data/trailBadges';
import './TrailOverlays.css';

export interface TrailBadgesModalProps {
  isOpen: boolean;
  achievements: AchievementsData | null;
  highlightedBadgeIds?: ReadonlySet<string>;
  onClose: () => void;
}

export const TrailBadgesModal: React.FC<TrailBadgesModalProps> = ({
  isOpen,
  achievements,
  highlightedBadgeIds,
  onClose,
}) => {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef<boolean>(false);
  const pointerDownOutsideRef = useRef<boolean>(false);

  const [activeCategory, setActiveCategory] = useState<'all' | BadgeCategory>('all');

  const badges: readonly BadgeItem[] = useMemo(
    () => achievements?.badges ?? [],
    [achievements?.badges]
  );
  const unlockedCount = useMemo(
    () => badges.filter((b) => b.unlocked).length,
    [badges]
  );

  const filteredBadges = useMemo(() => {
    if (activeCategory === 'all') return badges;
    return badges.filter((b) => b.category === activeCategory);
  }, [badges, activeCategory]);

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
  }, [isOpen]);

  // Native cancel / close (with returnValue reset) and closedby="any" light-dismiss fallback
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

  const bloomedChapters = achievements?.milestones.bloomedChaptersCount ?? 0;
  const currentStreak = achievements?.streak.currentStreakDays ?? 0;
  const bestWpm = achievements?.milestones.bestWpm ?? 0;

  return (
    <dialog
      ref={dialogRef}
      className="trail-badges-modal"
      aria-labelledby={titleId}
      data-testid="trail-badges-modal"
      {...({ closedby: 'any' } as any)}
    >
      <div className="trail-badges-header">
        <div className="trail-badges-header-top">
          <span className="trail-badges-kicker">
            LIVING TRAIL FIELD SATCHEL · ILLUMINATED LEDGER
          </span>
          <button
            ref={closeButtonRef}
            type="button"
            className="trail-dialog-close-btn"
            onClick={onClose}
            data-testid="trail-badges-close-btn"
          >
            Close [Esc]
          </button>
        </div>

        <div className="trail-badges-title-row">
          <h2 id={titleId} className="trail-badges-title">
            Trail Medallions &amp; Achievements
          </h2>
          <span className="trail-badges-seal-count" data-testid="trail-badges-unlocked-count">
            ✦ {unlockedCount} / {badges.length || 14} Medallions Lit
          </span>
        </div>

        <div className="trail-badges-summary-strip">
          <span className="trail-badges-summary-pill">
            {currentStreak} Day Streak
          </span>
          <span className="trail-badges-summary-pill">
            {bloomedChapters} Chapters Bloomed
          </span>
          <span className="trail-badges-summary-pill">
            {bestWpm} Best WPM
          </span>
        </div>
      </div>

      <div
        className="trail-badges-filter-bar"
        role="group"
        aria-label="Filter achievement medallions by category"
      >
        {BADGE_CATEGORY_META.map((cat) => (
          <button
            key={cat.key}
            type="button"
            className="trail-badge-filter-btn"
            aria-pressed={activeCategory === cat.key}
            onClick={() => setActiveCategory(cat.key)}
            data-testid={`trail-badge-filter-${cat.key}`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="trail-badges-body">
        {filteredBadges.length === 0 ? (
          <p className="trail-medallion-desc">
            No medallions loaded for this filter yet.
          </p>
        ) : (
          <ul className="trail-badges-grid" aria-label="Achievement medallions">
            {filteredBadges.map((badge) => {
              const isHighlighted = Boolean(highlightedBadgeIds?.has(badge.id));
              const cardClass = [
                'trail-medallion-card',
                badge.unlocked
                  ? 'trail-medallion-card--unlocked'
                  : 'trail-medallion-card--locked',
                isHighlighted ? 'trail-medallion-card--highlighted' : '',
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <li
                  key={badge.id}
                  className={cardClass}
                  data-badge-id={badge.id}
                  data-unlocked={badge.unlocked ? 'true' : 'false'}
                  data-testid={`trail-badge-card-${badge.id}`}
                >
                  <div className="trail-medallion-frame">
                    <img
                      src={getBadgeMedallionPath(badge.id)}
                      alt=""
                      width={48}
                      height={48}
                      className="trail-medallion-img"
                    />
                  </div>

                  <div className="trail-medallion-content">
                    <div className="trail-medallion-meta-row">
                      <span className="trail-medallion-ribbon">
                        {getBadgeRibbonLabel(badge)}
                      </span>
                      <span className="trail-medallion-status">
                        {badge.unlocked
                          ? '✦ Lit'
                          : `◇ ${badge.progressCurrent}/${badge.progressTarget}`}
                      </span>
                    </div>

                    <h3 className="trail-medallion-title">{badge.title}</h3>
                    <p className="trail-medallion-desc">{badge.description}</p>
                    <p className="trail-medallion-flavor">{getBadgeFlavor(badge)}</p>

                    <div className="trail-medallion-meter">
                      <div
                        className="trail-medallion-track"
                        role="progressbar"
                        aria-label={`${badge.title} progress`}
                        aria-valuenow={badge.progressPct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div
                          className="trail-medallion-fill"
                          style={{ width: `${Math.min(100, badge.progressPct)}%` }}
                        />
                      </div>
                      <span className="trail-medallion-numbers">
                        {badge.progressCurrent} / {badge.progressTarget} ({badge.progressPct}%)
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </dialog>
  );
};

export default TrailBadgesModal;
