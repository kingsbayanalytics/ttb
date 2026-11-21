import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BadgeItem } from '../../types';
import { getBadgeMedallionPath } from '../../data/trailBadges';
import './TrailOverlays.css';

export interface BadgeUnlockToastProps {
  badges: readonly BadgeItem[];
  suppressed?: boolean;
  onDismissBadge: (badgeId: string) => void;
  onOpenBadgeCase: () => void;
}

interface SingleBadgeToastProps {
  badge: BadgeItem;
  remainingIds: readonly string[];
  returnFocusRef: React.MutableRefObject<HTMLElement | null>;
  toastRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  onDismiss: (badgeId: string) => void;
  onOpenBadgeCase: () => void;
}

const supportsNativePopover =
  typeof HTMLElement !== 'undefined' &&
  Object.hasOwn(HTMLElement.prototype, 'popover');

const SingleBadgeToast: React.FC<SingleBadgeToastProps> = ({
  badge,
  remainingIds,
  returnFocusRef,
  toastRefs,
  onDismiss,
  onOpenBadgeCase,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = cardRef.current;
    const refsMap = toastRefs.current;
    if (!el) return;
    refsMap.set(badge.id, el);

    return () => {
      refsMap.delete(badge.id);
    };
  }, [badge.id, toastRefs]);

  const handleDismissClick = () => {
    const el = cardRef.current;
    const toastHadFocus = Boolean(el && el.contains(document.activeElement));

    onDismiss(badge.id);

    if (toastHadFocus) {
      const nextId = remainingIds.find((id) => id !== badge.id);
      window.requestAnimationFrame(() => {
        if (nextId) {
          const nextEl = toastRefs.current.get(nextId);
          const nextFocusBtn = nextEl?.querySelector<HTMLElement>('button');
          if (nextFocusBtn) {
            nextFocusBtn.focus();
            return;
          }
        }
        const prev = returnFocusRef.current;
        if (prev && prev.isConnected) {
          prev.focus();
        }
      });
    }
  };

  return (
    <div
      ref={cardRef}
      className="badge-toast-card"
      data-testid={`badge-unlock-toast-${badge.id}`}
    >
      <img
        src={getBadgeMedallionPath(badge.id)}
        alt=""
        width={48}
        height={48}
        className="badge-toast-medallion"
      />

      <div className="badge-toast-content">
        <span className="badge-toast-kicker">✦ TRAIL MEDALLION UNLOCKED</span>
        <h3 className="badge-toast-title">{badge.title}</h3>
        <p className="badge-toast-desc">{badge.description}</p>
        <div className="badge-toast-actions">
          <button
            type="button"
            className="badge-toast-action-btn"
            onClick={onOpenBadgeCase}
            data-testid={`badge-toast-open-case-${badge.id}`}
          >
            Open Badge Case
          </button>
          <button
            type="button"
            className="badge-toast-dismiss-btn"
            onClick={handleDismissClick}
            aria-label={`Dismiss ${badge.title} badge notification`}
            data-testid={`badge-toast-dismiss-${badge.id}`}
          >
            Dismiss ×
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Persistent, non-blocking Living Trail badge unlock toast stack (`persistent-toast-notifications` guide).
 * Suppresses rendering while a modal dialog or Zen Mode is active so notifications are never obscured.
 */
export const BadgeUnlockToast: React.FC<BadgeUnlockToastProps> = ({
  badges,
  suppressed = false,
  onDismissBadge,
  onOpenBadgeCase,
}) => {
  const stackRef = useRef<HTMLDivElement>(null);
  const toastRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const priorFocusRef = useRef<HTMLElement | null>(null);
  const announcedIdsRef = useRef<Set<string>>(new Set());
  const [liveFallbackText, setLiveFallbackText] = useState<string>('');

  const visibleBadges = useMemo(
    () => (suppressed ? [] : badges.slice(-3)),
    [badges, suppressed]
  );

  // Open/close single Top-Layer popover stack wrapper (so toasts stay anchored bottom-right above content)
  useEffect(() => {
    const stackEl = stackRef.current;
    if (!stackEl || !supportsNativePopover) return;

    if (visibleBadges.length > 0 && typeof (stackEl as any).showPopover === 'function') {
      try {
        if (!stackEl.matches(':popover-open')) {
          (stackEl as any).showPopover();
        }
      } catch {
        // Safe noop if detached
      }
    } else if (visibleBadges.length === 0 && typeof (stackEl as any).hidePopover === 'function') {
      try {
        if (stackEl.matches(':popover-open')) {
          (stackEl as any).hidePopover();
        }
      } catch {
        // Safe noop
      }
    }
  }, [visibleBadges.length]);

  useEffect(() => {
    const stackEl = stackRef.current;
    return () => {
      if (
        stackEl &&
        supportsNativePopover &&
        typeof (stackEl as any).hidePopover === 'function'
      ) {
        try {
          if (stackEl.matches(':popover-open')) {
            (stackEl as any).hidePopover();
          }
        } catch {
          // Safe noop
        }
      }
    };
  }, []);

  // Track last focused control before entering the toast region so dismissal restores cleanly
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (!target) return;
      const inToast = Array.from(toastRefs.current.values()).some((node) =>
        node.contains(target)
      );
      if (!inToast) {
        priorFocusRef.current = target;
      }
    };
    document.addEventListener('focusin', handleFocusIn);
    return () => document.removeEventListener('focusin', handleFocusIn);
  }, []);

  // Announce newly surfaced badges via ariaNotify() (preferred) or pre-mounted polite live region
  useEffect(() => {
    if (suppressed) return;
    const unannounced = visibleBadges.filter((b) => !announcedIdsRef.current.has(b.id));
    if (unannounced.length === 0) return;

    const latest = unannounced[unannounced.length - 1];
    unannounced.forEach((b) => announcedIdsRef.current.add(b.id));

    const announcement = `Trail Medallion Unlocked: ${latest.title}. ${latest.description} Actions available`;
    const docAny = document as any;
    if (typeof docAny?.ariaNotify === 'function') {
      docAny.ariaNotify(announcement);
    } else {
      setLiveFallbackText(announcement);
    }
  }, [visibleBadges, suppressed]);

  const remainingIds = useMemo(
    () => visibleBadges.map((b) => b.id),
    [visibleBadges]
  );

  const handleOpenCase = useCallback(() => {
    onOpenBadgeCase();
  }, [onOpenBadgeCase]);

  return (
    <div
      className="badge-toast-region"
      role="region"
      aria-label="Achievement notifications"
      data-testid="badge-toast-region"
    >
      <p className="sr-only">Achievement badge notifications</p>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveFallbackText}
      </div>

      <div
        ref={stackRef}
        {...(supportsNativePopover ? ({ popover: 'manual' } as any) : {})}
        className={`badge-toast-stack ${
          !supportsNativePopover && visibleBadges.length > 0
            ? 'badge-toast-stack--fallback'
            : ''
        }`.trim()}
      >
        {visibleBadges.map((badge) => (
          <SingleBadgeToast
            key={badge.id}
            badge={badge}
            remainingIds={remainingIds}
            returnFocusRef={priorFocusRef}
            toastRefs={toastRefs}
            onDismiss={onDismissBadge}
            onOpenBadgeCase={handleOpenCase}
          />
        ))}
      </div>
    </div>
  );
};

export interface ZenBadgeChipProps {
  badges: readonly BadgeItem[];
  onOpenBadgeCase: () => void;
}

export const ZenBadgeChip: React.FC<ZenBadgeChipProps> = ({
  badges,
  onOpenBadgeCase,
}) => {
  if (badges.length === 0) return null;
  const label =
    badges.length === 1
      ? `✦ ${badges[0].title} Earned`
      : `✦ ${badges.length} Badges Earned`;

  return (
    <button
      type="button"
      className="zen-badge-chip"
      onClick={onOpenBadgeCase}
      data-testid="zen-badge-chip"
    >
      {label}
    </button>
  );
};

export default BadgeUnlockToast;
