import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChapterBloomState,
  LensCountMap,
  PrimaryCompanionLens,
  TrailChapterWaypoint,
} from '../../types';
import { LensMicroIcon } from '../../assets/trail/lensMicroIcons';
import {
  ClearingSegment,
  WaypointPoint,
  YardPropHotspot,
  YardPropId,
  computeYardPropWakeState,
} from './trailLayouts';

const PRIMARY_LENSES: ReadonlyArray<{
  readonly key: PrimaryCompanionLens;
  readonly label: string;
}> = [
  { key: 'hoodoo-folk', label: 'Hoodoo & Folk' },
  { key: 'historical-classic', label: 'Historical & Classic' },
  { key: 'community', label: 'Community r/Bible' },
];

export function formatTrailChapterTitle(book: string, chapter: number): string {
  return book === 'Psalms' ? `Psalm ${chapter}` : `${book} ${chapter}`;
}

export function countActiveLenses(lensCounts?: LensCountMap): number {
  if (!lensCounts) return 0;
  return PRIMARY_LENSES.filter((lens) => (lensCounts[lens.key] ?? 0) > 0).length;
}

function getStateLabel(state: ChapterBloomState): string {
  switch (state) {
    case 'bloomed':
      return 'Bloomed';
    case 'in_progress':
      return 'In Progress';
    case 'dormant':
    default:
      return 'Dormant';
  }
}

function getStateGlyph(state: ChapterBloomState): string {
  switch (state) {
    case 'bloomed':
      return '✦';
    case 'in_progress':
      return '◐';
    case 'dormant':
    default:
      return '◇';
  }
}

export function buildWaypointAriaLabel(
  book: string,
  waypoint: Pick<
    TrailChapterWaypoint,
    'chapter' | 'state' | 'completedVerses' | 'totalVerses' | 'hasCompanion' | 'lensCounts'
  >
): string {
  const title = formatTrailChapterTitle(book, waypoint.chapter);
  const stateLabel = getStateLabel(waypoint.state);
  const progressPart = `${waypoint.completedVerses} of ${waypoint.totalVerses} verses`;
  const companionReady =
    waypoint.state === 'bloomed' &&
    (waypoint.hasCompanion || countActiveLenses(waypoint.lensCounts) > 0);

  return companionReady
    ? `${title}, ${stateLabel}, ${progressPart}, Companion Ready`
    : `${title}, ${stateLabel}, ${progressPart}`;
}

function buildFallbackChapterWaypoint(chapter: number): TrailChapterWaypoint {
  return {
    chapter,
    totalVerses: 0,
    completedVerses: 0,
    state: 'dormant',
    bestWPM: 0,
    bestAccuracy: 0,
    unlockedAt: null,
    hasCompanion: false,
    lensCounts: {
      'hoodoo-folk': 0,
      'historical-classic': 0,
      community: 0,
    },
  };
}

export interface WaypointFocusRequest {
  readonly chapter: number;
  readonly seq: number;
}

export interface WaypointOverlayProps {
  readonly book: string;
  readonly segment: ClearingSegment;
  readonly chapters: readonly TrailChapterWaypoint[];
  readonly activeChapter?: number;
  readonly selectedChapter: number | null;
  readonly onSelectChapter: (chapter: number | null) => void;
  readonly onOpenCompanion: (book: string, chapter: number) => void;
  readonly selectedYardPropId?: YardPropId | null;
  readonly onSelectYardProp?: (id: YardPropId | null) => void;
  readonly onOpenBookGuide?: () => void;
  readonly bookMastered?: boolean;
  readonly bloomedOnly?: boolean;
  readonly onDisableBloomedOnly?: () => void;
  readonly focusRequest?: WaypointFocusRequest | null;
}

export const WaypointOverlay: React.FC<WaypointOverlayProps> = ({
  book,
  segment,
  chapters,
  activeChapter,
  selectedChapter,
  onSelectChapter,
  onOpenCompanion,
  selectedYardPropId: controlledYardPropId,
  onSelectYardProp,
  onOpenBookGuide,
  bookMastered = false,
  bloomedOnly = false,
  onDisableBloomedOnly,
  focusRequest = null,
}) => {
  const baseId = useId();
  const popoverId = `${baseId}-waypoint-popover`;
  const popoverTitleId = `${baseId}-waypoint-popover-title`;
  const yardPopoverId = `${baseId}-yard-prop-popover`;
  const yardPopoverTitleId = `${baseId}-yard-prop-popover-title`;

  const overlayRootRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLElement | null>(null);
  const popoverCloseRef = useRef<HTMLButtonElement | null>(null);
  const yardPopoverRef = useRef<HTMLElement | null>(null);
  const yardPopoverCloseRef = useRef<HTMLButtonElement | null>(null);
  const buttonRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const yardButtonRefs = useRef<Map<YardPropId, HTMLButtonElement>>(new Map());
  const suppressNextClickRef = useRef<boolean>(false);

  const [internalYardPropId, setInternalYardPropId] = useState<YardPropId | null>(null);
  const selectedYardPropId =
    controlledYardPropId !== undefined ? controlledYardPropId : internalYardPropId;

  const setYardPropSelection = useCallback(
    (nextId: YardPropId | null) => {
      if (onSelectYardProp) {
        onSelectYardProp(nextId);
      } else {
        setInternalYardPropId(nextId);
      }
    },
    [onSelectYardProp]
  );

  const chapterMap = useMemo(() => {
    const map = new Map<number, TrailChapterWaypoint>();
    for (const ch of chapters) {
      map.set(ch.chapter, ch);
    }
    return map;
  }, [chapters]);

  const clearingBloomedCount = useMemo(() => {
    let count = 0;
    for (const wp of segment.waypoints) {
      if (chapterMap.get(wp.chapter)?.state === 'bloomed') {
        count += 1;
      }
    }
    return count;
  }, [segment.waypoints, chapterMap]);

  const wakeState = useMemo(
    () =>
      computeYardPropWakeState(
        clearingBloomedCount,
        segment.waypoints.length,
        bookMastered
      ),
    [clearingBloomedCount, segment.waypoints.length, bookMastered]
  );

  const isYardPropAwake = useCallback(
    (propId: YardPropId): boolean => {
      switch (propId) {
        case 'bottle-tree':
          return wakeState.bottleTreeBloomed;
        case 'herb-rack':
          return wakeState.herbRackAwake;
        case 'river-cairn':
          return wakeState.riverCairnAwake;
        case 'elder-keeper':
          return wakeState.elderKeeperAwake;
        default:
          return false;
      }
    },
    [wakeState]
  );

  const visibleWaypoints = useMemo<readonly WaypointPoint[]>(() => {
    if (!bloomedOnly) {
      return segment.waypoints;
    }
    return segment.waypoints.filter(
      (wp) => (chapterMap.get(wp.chapter)?.state ?? 'dormant') === 'bloomed'
    );
  }, [segment.waypoints, bloomedOnly, chapterMap]);

  const [rovingChapter, setRovingChapter] = useState<number | null>(
    () => visibleWaypoints[0]?.chapter ?? null
  );

  const effectiveRovingChapter = useMemo(() => {
    if (visibleWaypoints.length === 0) return null;
    if (
      rovingChapter !== null &&
      visibleWaypoints.some((wp) => wp.chapter === rovingChapter)
    ) {
      return rovingChapter;
    }
    return visibleWaypoints[0].chapter;
  }, [visibleWaypoints, rovingChapter]);

  // Honor external focus requests (e.g., Quick-Jump "[Next Active]" button or Companion close)
  useEffect(() => {
    if (!focusRequest) return;
    const existsInSegment = visibleWaypoints.some(
      (wp) => wp.chapter === focusRequest.chapter
    );
    if (!existsInSegment) return;

    setRovingChapter(focusRequest.chapter);
    const btn = buttonRefs.current.get(focusRequest.chapter);
    if (btn) {
      btn.focus();
      if (typeof btn.scrollIntoView === 'function') {
        btn.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    }
  }, [focusRequest, visibleWaypoints]);

  // Reset internal yard prop inspection cleanly when switching clearings
  useEffect(() => {
    if (controlledYardPropId === undefined) {
      setInternalYardPropId(null);
    }
  }, [segment.clearingId, controlledYardPropId]);

  // If the selected chapter disappears from the visible clearing, close its popover cleanly
  useEffect(() => {
    if (selectedChapter === null) return;
    const stillVisible = visibleWaypoints.some((wp) => wp.chapter === selectedChapter);
    if (!stillVisible) {
      onSelectChapter(null);
    }
  }, [selectedChapter, visibleWaypoints, onSelectChapter]);

  const closePopoverAndRestoreFocus = useCallback(
    (chapterToFocus: number | null) => {
      onSelectChapter(null);
      if (chapterToFocus !== null) {
        setRovingChapter(chapterToFocus);
        const triggerBtn = buttonRefs.current.get(chapterToFocus);
        if (triggerBtn && typeof triggerBtn.focus === 'function') {
          triggerBtn.focus();
        }
      }
    },
    [onSelectChapter]
  );

  const closeYardPopoverAndRestoreFocus = useCallback(
    (propId: YardPropId | null) => {
      setYardPropSelection(null);
      if (propId) {
        const trigger = yardButtonRefs.current.get(propId);
        if (trigger && typeof trigger.focus === 'function') {
          trigger.focus();
        }
      }
    },
    [setYardPropSelection]
  );

  // Move focus inside the newly opened chapter or yard-prop popover
  useEffect(() => {
    if (selectedChapter === null) return;
    const firstAction = popoverRef.current?.querySelector<HTMLElement>(
      'a[href], button:not(.waypoint-popover-close):not([disabled])'
    );
    const target = firstAction ?? popoverCloseRef.current;
    if (target && typeof target.focus === 'function') {
      target.focus();
    }
  }, [selectedChapter]);

  useEffect(() => {
    if (!selectedYardPropId) return;
    const firstAction = yardPopoverRef.current?.querySelector<HTMLElement>(
      'a[href], button:not(.waypoint-popover-close):not([disabled])'
    );
    const target = firstAction ?? yardPopoverCloseRef.current;
    if (target && typeof target.focus === 'function') {
      target.focus();
    }
  }, [selectedYardPropId]);

  // Escape closes open popovers & restores focus; outside clicks light-dismiss.
  useEffect(() => {
    if (selectedChapter === null && !selectedYardPropId) return undefined;

    const handleDocumentKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        if (selectedChapter !== null) {
          closePopoverAndRestoreFocus(selectedChapter);
        } else if (selectedYardPropId) {
          closeYardPopoverAndRestoreFocus(selectedYardPropId);
        }
      }
    };

    const handleDocumentPointerDown = (e: MouseEvent) => {
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (selectedChapter !== null) {
        if (popoverRef.current?.contains(target)) return;
        const activeTrigger = buttonRefs.current.get(selectedChapter);
        if (activeTrigger?.contains(target)) return;
        onSelectChapter(null);
      }
      if (selectedYardPropId) {
        if (yardPopoverRef.current?.contains(target)) return;
        const activeYardTrigger = yardButtonRefs.current.get(selectedYardPropId);
        if (activeYardTrigger?.contains(target)) return;
        setYardPropSelection(null);
      }
    };

    document.addEventListener('keydown', handleDocumentKeyDown);
    document.addEventListener('mousedown', handleDocumentPointerDown);

    return () => {
      document.removeEventListener('keydown', handleDocumentKeyDown);
      document.removeEventListener('mousedown', handleDocumentPointerDown);
    };
  }, [
    selectedChapter,
    selectedYardPropId,
    closePopoverAndRestoreFocus,
    closeYardPopoverAndRestoreFocus,
    onSelectChapter,
    setYardPropSelection,
  ]);

  const moveFocusToIndex = (nextIndex: number) => {
    const targetWp = visibleWaypoints[nextIndex];
    if (!targetWp) return;
    setRovingChapter(targetWp.chapter);
    const btn = buttonRefs.current.get(targetWp.chapter);
    if (btn) {
      btn.focus();
      if (typeof btn.scrollIntoView === 'function') {
        btn.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    }
  };

  const toggleChapterPopover = (chapter: number) => {
    setRovingChapter(chapter);
    setYardPropSelection(null);
    if (selectedChapter === chapter) {
      closePopoverAndRestoreFocus(chapter);
    } else {
      onSelectChapter(chapter);
    }
  };

  const toggleYardPropPopover = (propId: YardPropId) => {
    onSelectChapter(null);
    if (selectedYardPropId === propId) {
      closeYardPopoverAndRestoreFocus(propId);
    } else {
      setYardPropSelection(propId);
    }
  };

  const handleWaypointKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
    chapter: number
  ) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) {
      return;
    }

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      if (index < visibleWaypoints.length - 1) {
        e.preventDefault();
        moveFocusToIndex(index + 1);
      }
      return;
    }

    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      if (index > 0) {
        e.preventDefault();
        moveFocusToIndex(index - 1);
      }
      return;
    }

    if (e.key === 'Home') {
      if (visibleWaypoints.length > 0) {
        e.preventDefault();
        moveFocusToIndex(0);
      }
      return;
    }

    if (e.key === 'End') {
      if (visibleWaypoints.length > 0) {
        e.preventDefault();
        moveFocusToIndex(visibleWaypoints.length - 1);
      }
      return;
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      suppressNextClickRef.current = true;
      toggleChapterPopover(chapter);
      Promise.resolve().then(() => {
        suppressNextClickRef.current = false;
      });
    }
  };

  const handleWaypointClick = (chapter: number) => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }
    toggleChapterPopover(chapter);
  };

  const selectedPoint =
    selectedChapter !== null
      ? visibleWaypoints.find((wp) => wp.chapter === selectedChapter) ?? null
      : null;

  const selectedData =
    selectedPoint !== null
      ? chapterMap.get(selectedPoint.chapter) ??
        buildFallbackChapterWaypoint(selectedPoint.chapter)
      : null;

  const handleOpenCompanionFromPopover = (chapter: number) => {
    // Focus the persistent waypoint trigger first so CompanionDrawer's focus restoration
    // lands directly back on the chapter waypoint button when the drawer closes.
    const triggerBtn = buttonRefs.current.get(chapter);
    if (triggerBtn && typeof triggerBtn.focus === 'function') {
      triggerBtn.focus();
    }
    onSelectChapter(null);
    onOpenCompanion(book, chapter);
  };

  const selectedYardProp: YardPropHotspot | null =
    selectedYardPropId !== null
      ? segment.scene.yardHotspots.find((h) => h.id === selectedYardPropId) ?? null
      : null;

  const selectedYardPropAwake = selectedYardProp
    ? isYardPropAwake(selectedYardProp.id)
    : false;

  const popoverAlignmentClasses = useMemo(() => {
    if (!selectedPoint) return 'waypoint-popover';
    const classes = ['waypoint-popover'];
    if (selectedPoint.xPct < 32) {
      classes.push('waypoint-popover--inline-start');
    } else if (selectedPoint.xPct > 68) {
      classes.push('waypoint-popover--inline-end');
    }
    if (selectedPoint.yPct > 56) {
      classes.push('waypoint-popover--block-start');
    }
    return classes.join(' ');
  }, [selectedPoint]);

  const yardPopoverAlignmentClasses = useMemo(() => {
    if (!selectedYardProp) return 'waypoint-popover yard-prop-popover';
    const classes = ['waypoint-popover', 'yard-prop-popover'];
    if (selectedYardProp.xPct < 32) {
      classes.push('waypoint-popover--inline-start');
    } else if (selectedYardProp.xPct > 68) {
      classes.push('waypoint-popover--inline-end');
    }
    if (selectedYardProp.yPct > 56) {
      classes.push('waypoint-popover--block-start');
    }
    return classes.join(' ');
  }, [selectedYardProp]);

  const visibleYardHotspots = useMemo(
    () =>
      segment.scene.yardHotspots.filter(
        (prop) => prop.id === 'bottle-tree' || isYardPropAwake(prop.id)
      ),
    [segment.scene.yardHotspots, isYardPropAwake]
  );

  return (
    <div
      ref={overlayRootRef}
      className="waypoint-overlay-layer"
      data-testid="waypoint-overlay"
    >
      {/* Text-free clickable waking Hoodoo/biblical yard props */}
      <div
        role="group"
        aria-label="Clearing heritage landmarks"
        className="yard-props-hotspot-group"
        data-testid="yard-props-hotspot-group"
      >
        {visibleYardHotspots.map((prop) => {
          const awake = isYardPropAwake(prop.id);
          const isOpen = selectedYardPropId === prop.id;
          const classes = [
            'yard-prop-hotspot-btn',
            `yard-prop-hotspot-btn--${prop.id}`,
            awake ? 'yard-prop-hotspot-btn--awake' : 'yard-prop-hotspot-btn--dormant',
            isOpen ? 'yard-prop-hotspot-btn--open-anchor' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <button
              key={prop.id}
              ref={(el) => {
                if (el) {
                  yardButtonRefs.current.set(prop.id, el);
                } else {
                  yardButtonRefs.current.delete(prop.id);
                }
              }}
              type="button"
              className={classes}
              style={{
                left: `${prop.xPct}%`,
                top: `${prop.yPct}%`,
              }}
              aria-label={
                awake
                  ? `${prop.title}, ${prop.tradition}`
                  : `${prop.title}, Dormant (${prop.wakeRuleLabel})`
              }
              aria-expanded={isOpen}
              aria-controls={isOpen ? yardPopoverId : undefined}
              onClick={() => toggleYardPropPopover(prop.id)}
              data-testid={`yard-prop-btn-${prop.id}`}
              data-prop-awake={String(awake)}
            >
              <span className="yard-prop-badge" aria-hidden="true">
                {awake ? '✦ ' : '◇ '}
                {prop.title}
              </span>
            </button>
          );
        })}
      </div>

      {/* Flush ground-level river flagstone buttons (text hidden cleanly until hover/focus) */}
      <div
        role="toolbar"
        aria-label={`${book} ${segment.shortLabel} chapter flagstones`}
        className="waypoint-buttons-toolbar"
      >
        {visibleWaypoints.map((wp, index) => {
          const data =
            chapterMap.get(wp.chapter) ?? buildFallbackChapterWaypoint(wp.chapter);
          const isOpen = selectedChapter === wp.chapter;
          const isRovingStop = effectiveRovingChapter === wp.chapter;
          const isActiveTraveler = activeChapter === wp.chapter;

          const btnClasses = [
            'waypoint-node-btn',
            `waypoint-node-btn--${data.state}`,
            isActiveTraveler ? 'waypoint-node-btn--active-traveler' : '',
            isOpen ? 'waypoint-node-btn--open-anchor' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <button
              key={wp.chapter}
              ref={(el) => {
                if (el) {
                  buttonRefs.current.set(wp.chapter, el);
                } else {
                  buttonRefs.current.delete(wp.chapter);
                }
              }}
              type="button"
              className={btnClasses}
              style={{
                left: `${wp.xPct}%`,
                top: `${wp.yPct}%`,
              }}
              tabIndex={isRovingStop ? 0 : -1}
              aria-label={buildWaypointAriaLabel(book, data)}
              aria-expanded={isOpen}
              aria-controls={isOpen ? popoverId : undefined}
              onFocus={() => setRovingChapter(wp.chapter)}
              onKeyDown={(e) => handleWaypointKeyDown(e, index, wp.chapter)}
              onClick={() => handleWaypointClick(wp.chapter)}
              data-testid={`waypoint-btn-${wp.chapter}`}
              data-waypoint-state={data.state}
            >
              <span className="waypoint-node-plaque">
                <span className="waypoint-node-glyph" aria-hidden="true">
                  {getStateGlyph(data.state)}
                </span>
                <span aria-hidden="true">{wp.chapter}</span>
              </span>
            </button>
          );
        })}
      </div>

      {bloomedOnly && visibleWaypoints.length === 0 && (
        <div
          className="waypoint-empty-filter-banner"
          role="status"
          data-testid="waypoint-empty-bloomed-filter"
        >
          <span>
            No bloomed chapters in {segment.label} yet. Show all flagstones or start typing to
            bloom a river flagstone.
          </span>
          {onDisableBloomedOnly && (
            <button
              type="button"
              className="secondary-button trail-table-action-btn"
              onClick={onDisableBloomedOnly}
            >
              Show All Waypoints
            </button>
          )}
        </div>
      )}

      {selectedPoint && selectedData && (
        <section
          ref={popoverRef}
          id={popoverId}
          aria-labelledby={popoverTitleId}
          className={popoverAlignmentClasses}
          style={
            {
              '--wp-x': `${selectedPoint.xPct}%`,
              '--wp-y': `${selectedPoint.yPct}%`,
            } as React.CSSProperties
          }
          data-testid="waypoint-popover"
        >
          <div className="waypoint-popover-header">
            <div className="waypoint-popover-title-group">
              <h4 id={popoverTitleId} className="waypoint-popover-title">
                {formatTrailChapterTitle(book, selectedData.chapter)}
              </h4>
              <span
                className={`waypoint-state-badge waypoint-state-badge--${selectedData.state}`}
                data-testid="waypoint-popover-state-badge"
              >
                <span aria-hidden="true">{getStateGlyph(selectedData.state)}</span>
                <span>{getStateLabel(selectedData.state)}</span>
              </span>
            </div>

            <button
              ref={popoverCloseRef}
              type="button"
              className="waypoint-popover-close"
              aria-label={`Close ${formatTrailChapterTitle(book, selectedData.chapter)} details`}
              onClick={() => closePopoverAndRestoreFocus(selectedData.chapter)}
              data-testid="waypoint-popover-close"
            >
              ×
            </button>
          </div>

          <div className="waypoint-popover-progress">
            <div className="waypoint-popover-progress-row">
              <span>Verse Progress</span>
              <strong>
                {selectedData.completedVerses} / {selectedData.totalVerses} verses
              </strong>
            </div>
            <progress
              className="waypoint-popover-meter"
              value={selectedData.completedVerses}
              max={Math.max(1, selectedData.totalVerses)}
              aria-label={`${formatTrailChapterTitle(book, selectedData.chapter)} verse progress`}
            />
          </div>

          {(selectedData.bestWPM > 0 || selectedData.bestAccuracy > 0) && (
            <p className="waypoint-popover-metrics" data-testid="waypoint-popover-metrics">
              {selectedData.bestWPM > 0 ? `Best ${Math.round(selectedData.bestWPM)} WPM` : ''}
              {selectedData.bestWPM > 0 && selectedData.bestAccuracy > 0 ? ' · ' : ''}
              {selectedData.bestAccuracy > 0
                ? `${Math.round(selectedData.bestAccuracy)}% Acc`
                : ''}
            </p>
          )}

          {countActiveLenses(selectedData.lensCounts) > 0 && (
            <ul
              className="waypoint-popover-lenses"
              aria-label="Curated study lenses"
              data-testid="waypoint-popover-lenses"
            >
              {PRIMARY_LENSES.map((lens) => {
                const count = selectedData.lensCounts?.[lens.key] ?? 0;
                if (count <= 0) return null;
                return (
                  <li key={lens.key} className="waypoint-lens-pill">
                    <LensMicroIcon lens={lens.key} size={14} aria-hidden />
                    <span>
                      {lens.label} ({count})
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          {selectedData.state === 'dormant' && (
            <>
              <p className="waypoint-popover-teaser">
                Start typing to bloom this clearing &amp; unlock Companion notes.
              </p>
              <div className="waypoint-popover-actions">
                <Link
                  to={`/typing?book=${encodeURIComponent(book)}&chapter=${selectedData.chapter}`}
                  className="primary-button waypoint-cta-btn"
                  data-testid="waypoint-cta-type-dormant"
                >
                  Type Chapter {selectedData.chapter} →
                </Link>
              </div>
            </>
          )}

          {selectedData.state === 'in_progress' && (
            <>
              <p
                className="waypoint-popover-teaser"
                data-testid="waypoint-locked-companion-teaser"
              >
                {(() => {
                  const versesLeft = Math.max(
                    1,
                    selectedData.totalVerses - selectedData.completedVerses
                  );
                  return `Unlocks upon chapter completion — ${versesLeft} ${
                    versesLeft === 1 ? 'verse' : 'verses'
                  } left`;
                })()}
              </p>
              <div className="waypoint-popover-actions">
                <Link
                  to={`/typing?book=${encodeURIComponent(book)}&chapter=${selectedData.chapter}`}
                  className="primary-button waypoint-cta-btn"
                  data-testid="waypoint-cta-continue-typing"
                >
                  Continue Typing →
                </Link>
              </div>
            </>
          )}

          {selectedData.state === 'bloomed' && (
            <div className="waypoint-popover-actions">
              {(() => {
                const activeLenses = countActiveLenses(selectedData.lensCounts);
                const displayLensCount = activeLenses > 0 ? activeLenses : 3;
                return (
                  <button
                    type="button"
                    className="primary-button waypoint-cta-btn"
                    onClick={() => handleOpenCompanionFromPopover(selectedData.chapter)}
                    data-testid="waypoint-cta-open-companion"
                  >
                    <span>Open Companion Reading Room</span>
                    <span className="waypoint-cta-seal" aria-hidden="true">
                      ✦ {displayLensCount} {displayLensCount === 1 ? 'Lens' : 'Lenses'}
                    </span>
                  </button>
                );
              })()}
              <Link
                to={`/typing?book=${encodeURIComponent(book)}&chapter=${selectedData.chapter}`}
                className="secondary-button waypoint-cta-btn"
                data-testid="waypoint-cta-retype"
              >
                Re-type Chapter
              </Link>
            </div>
          )}
        </section>
      )}

      {selectedYardProp && (
        <section
          ref={yardPopoverRef}
          id={yardPopoverId}
          aria-labelledby={yardPopoverTitleId}
          className={yardPopoverAlignmentClasses}
          style={
            {
              '--wp-x': `${selectedYardProp.xPct}%`,
              '--wp-y': `${selectedYardProp.yPct}%`,
            } as React.CSSProperties
          }
          data-testid="yard-prop-popover"
        >
          <div className="waypoint-popover-header">
            <div className="waypoint-popover-title-group">
              <span className="trail-kicker">{selectedYardProp.tradition}</span>
              <h4 id={yardPopoverTitleId} className="waypoint-popover-title">
                {selectedYardProp.title}
              </h4>
              <span
                className={`waypoint-state-badge waypoint-state-badge--${
                  selectedYardPropAwake ? 'bloomed' : 'dormant'
                }`}
              >
                <span aria-hidden="true">{selectedYardPropAwake ? '✦' : '◇'}</span>
                <span>
                  {selectedYardPropAwake
                    ? 'Awake in Clearing'
                    : selectedYardProp.wakeRuleLabel}
                </span>
              </span>
            </div>

            <button
              ref={yardPopoverCloseRef}
              type="button"
              className="waypoint-popover-close"
              aria-label={`Close ${selectedYardProp.title} details`}
              onClick={() => closeYardPopoverAndRestoreFocus(selectedYardProp.id)}
              data-testid="yard-prop-popover-close"
            >
              ×
            </button>
          </div>

          <p className="waypoint-popover-teaser">
            {selectedYardPropAwake
              ? selectedYardProp.loreSummary
              : selectedYardProp.dormantHint}
          </p>

          {selectedYardProp.id === 'bottle-tree' && (
            <div className="waypoint-popover-progress-row">
              <span>Sunlight Bottles Lit</span>
              <strong>
                {wakeState.bottleCount} / {segment.waypoints.length}
              </strong>
            </div>
          )}

          {onOpenBookGuide && (
            <div className="waypoint-popover-actions">
              <button
                type="button"
                className="primary-button waypoint-cta-btn"
                onClick={() => {
                  setYardPropSelection(null);
                  onOpenBookGuide();
                }}
                data-testid="yard-prop-open-book-guide"
              >
                Open {book} Book Guide →
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default WaypointOverlay;
