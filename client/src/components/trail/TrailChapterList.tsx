import React, { useEffect, useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChapterBloomState,
  PrimaryCompanionLens,
  TrailChapterWaypoint,
} from '../../types';
import { TrailLegDefinition, getTrailLegsForBook } from '../../data/trailBiomes';
import { LensMicroIcon } from '../../assets/trail/lensMicroIcons';
import { countActiveLenses, formatTrailChapterTitle } from './WaypointOverlay';

export type ChapterStatusFilter = 'all' | ChapterBloomState;

export interface TrailChapterListProps {
  readonly id?: string;
  readonly book: string;
  readonly chapters: readonly TrailChapterWaypoint[];
  readonly legs?: readonly TrailLegDefinition[];
  readonly initialLegId?: string;
  readonly onOpenCompanion: (book: string, chapter: number) => void;
}

const LENS_KEYS: readonly PrimaryCompanionLens[] = [
  'hoodoo-folk',
  'historical-classic',
  'community',
];

function getStatusBadgeInfo(state: ChapterBloomState): {
  readonly glyph: string;
  readonly label: string;
} {
  switch (state) {
    case 'bloomed':
      return { glyph: '✦', label: 'Bloomed' };
    case 'in_progress':
      return { glyph: '◐', label: 'In Progress' };
    case 'dormant':
    default:
      return { glyph: '◇', label: 'Dormant' };
  }
}

export const TrailChapterList: React.FC<TrailChapterListProps> = ({
  id = 'trail-chapter-list-panel',
  book,
  chapters,
  legs: legsProp,
  initialLegId = 'all',
  onOpenCompanion,
}) => {
  const baseId = useId();
  const headingId = `${baseId}-heading`;
  const captionId = `${baseId}-caption`;
  const legSelectId = `${baseId}-leg-filter`;

  const [statusFilter, setStatusFilter] = useState<ChapterStatusFilter>('all');
  const [legFilter, setLegFilter] = useState<string>(initialLegId);

  const resolvedLegs = useMemo<readonly TrailLegDefinition[]>(() => {
    if (legsProp && legsProp.length > 0) {
      return legsProp;
    }
    return getTrailLegsForBook(book, chapters.length || undefined);
  }, [legsProp, book, chapters.length]);

  // Reset leg filter to 'all' when switching books so chapters are never unexpectedly hidden
  useEffect(() => {
    setLegFilter('all');
  }, [book]);

  const statusCounts = useMemo(() => {
    let bloomed = 0;
    let inProgress = 0;
    let dormant = 0;
    for (const ch of chapters) {
      if (ch.state === 'bloomed') bloomed += 1;
      else if (ch.state === 'in_progress') inProgress += 1;
      else dormant += 1;
    }
    return {
      all: chapters.length,
      bloomed,
      in_progress: inProgress,
      dormant,
    };
  }, [chapters]);

  const selectedLeg = useMemo(
    () =>
      legFilter === 'all'
        ? undefined
        : resolvedLegs.find((leg) => leg.legId === legFilter),
    [legFilter, resolvedLegs]
  );

  const filteredChapters = useMemo(() => {
    return chapters.filter((ch) => {
      if (statusFilter !== 'all' && ch.state !== statusFilter) {
        return false;
      }
      if (
        selectedLeg &&
        (ch.chapter < selectedLeg.startChapter || ch.chapter > selectedLeg.endChapter)
      ) {
        return false;
      }
      return true;
    });
  }, [chapters, statusFilter, selectedLeg]);

  const findShortLegLabel = (chapterNum: number): string => {
    const leg = resolvedLegs.find(
      (l) => chapterNum >= l.startChapter && chapterNum <= l.endChapter
    );
    return leg ? leg.shortLabel : `Ch. ${chapterNum}`;
  };

  const legFilterLabel = book === 'Psalms' ? 'Filter by Psalter Book' : 'Filter by Trail Leg';

  return (
    <section
      id={id}
      className="trail-chapter-list-section"
      aria-labelledby={headingId}
      data-testid="trail-chapter-list"
    >
      <div className="trail-section-header">
        <h3 id={headingId}>{book} — Accessible Chapter List</h3>
        <span className="trail-section-meta">
          Showing {filteredChapters.length} of {chapters.length} chapters
        </span>
      </div>

      <div className="trail-list-filters">
        <div
          className="trail-status-filter-group"
          role="group"
          aria-label="Filter chapters by completion status"
        >
          <button
            type="button"
            className="trail-filter-pill"
            aria-pressed={statusFilter === 'all'}
            onClick={() => setStatusFilter('all')}
            data-testid="chapter-filter-all"
          >
            All ({statusCounts.all})
          </button>
          <button
            type="button"
            className="trail-filter-pill"
            aria-pressed={statusFilter === 'bloomed'}
            onClick={() => setStatusFilter('bloomed')}
            data-testid="chapter-filter-bloomed"
          >
            <span aria-hidden="true">✦ </span>Bloomed ({statusCounts.bloomed})
          </button>
          <button
            type="button"
            className="trail-filter-pill"
            aria-pressed={statusFilter === 'in_progress'}
            onClick={() => setStatusFilter('in_progress')}
            data-testid="chapter-filter-in-progress"
          >
            <span aria-hidden="true">◐ </span>In Progress ({statusCounts.in_progress})
          </button>
          <button
            type="button"
            className="trail-filter-pill"
            aria-pressed={statusFilter === 'dormant'}
            onClick={() => setStatusFilter('dormant')}
            data-testid="chapter-filter-dormant"
          >
            <span aria-hidden="true">◇ </span>Dormant ({statusCounts.dormant})
          </button>
        </div>

        <div className="trail-clearing-select-wrap">
          <label htmlFor={legSelectId} className="trail-clearing-select-label">
            {legFilterLabel}
          </label>
          <select
            id={legSelectId}
            className="trail-clearing-select"
            value={legFilter}
            onChange={(e) => setLegFilter(e.target.value)}
            data-testid="chapter-list-leg-select"
          >
            <option value="all">
              {book === 'Psalms' ? 'All Psalter Books (1–150)' : `All Legs (1–${chapters.length})`}
            </option>
            {resolvedLegs.map((leg) => (
              <option key={leg.legId} value={leg.legId}>
                {leg.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        tabIndex={0}
        role="region"
        aria-labelledby={captionId}
        className="trail-table-scroll-region"
      >
        <table className="trail-chapter-table" data-testid="trail-chapter-table">
          <caption id={captionId}>
            {book} chapter waypoints in canonical order ({filteredChapters.length} of{' '}
            {chapters.length} shown)
          </caption>
          <thead>
            <tr>
              <th scope="col">Chapter</th>
              <th scope="col">{book === 'Psalms' ? 'Psalter Book' : 'Trail Leg'}</th>
              <th scope="col">Status</th>
              <th scope="col">Verse Progress</th>
              <th scope="col">Best Performance</th>
              <th scope="col">Companion Lenses</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredChapters.length === 0 ? (
              <tr>
                <td colSpan={7} className="trail-table-mono">
                  No chapters match the selected status and leg filters.
                </td>
              </tr>
            ) : (
              filteredChapters.map((ch) => {
                const chapterTitle = formatTrailChapterTitle(book, ch.chapter);
                const badge = getStatusBadgeInfo(ch.state);
                const activeLenses = countActiveLenses(ch.lensCounts);
                const totalEntries = LENS_KEYS.reduce(
                  (sum, key) => sum + (ch.lensCounts?.[key] ?? 0),
                  0
                );
                const hasStats = ch.bestWPM > 0 || ch.bestAccuracy > 0;
                const typeVerb =
                  ch.state === 'bloomed'
                    ? 'Re-type'
                    : ch.state === 'in_progress'
                    ? 'Continue'
                    : 'Type';

                return (
                  <tr key={ch.chapter} data-testid={`chapter-list-row-${ch.chapter}`}>
                    <th scope="row">{chapterTitle}</th>
                    <td className="trail-table-mono">{findShortLegLabel(ch.chapter)}</td>
                    <td>
                      <span className={`waypoint-state-badge waypoint-state-badge--${ch.state}`}>
                        <span aria-hidden="true">{badge.glyph}</span>
                        <span>{badge.label}</span>
                      </span>
                    </td>
                    <td className="trail-table-mono">
                      {ch.completedVerses} / {ch.totalVerses} verses
                    </td>
                    <td className="trail-table-mono">
                      {hasStats
                        ? `${Math.round(ch.bestWPM)} WPM · ${Math.round(ch.bestAccuracy)}%`
                        : '—'}
                    </td>
                    <td className="trail-table-mono">
                      {ch.state === 'bloomed' ? (
                        <span className="waypoint-lens-pill">
                          {LENS_KEYS.map((lensKey) =>
                            (ch.lensCounts?.[lensKey] ?? 0) > 0 ? (
                              <LensMicroIcon key={lensKey} lens={lensKey} size={14} aria-hidden />
                            ) : null
                          )}
                          <span>
                            ✦ {activeLenses > 0 ? activeLenses : 3}{' '}
                            {(activeLenses > 0 ? activeLenses : 3) === 1 ? 'Lens' : 'Lenses'}
                          </span>
                        </span>
                      ) : totalEntries > 0 ? (
                        <span>
                          {activeLenses} {activeLenses === 1 ? 'lens' : 'lenses'} (locked)
                        </span>
                      ) : (
                        <span>Unlocks on completion</span>
                      )}
                    </td>
                    <td>
                      <div className="trail-table-actions">
                        {ch.state === 'bloomed' && (
                          <button
                            type="button"
                            className="primary-button trail-table-action-btn"
                            onClick={() => onOpenCompanion(book, ch.chapter)}
                            data-testid={`list-read-companion-${ch.chapter}`}
                          >
                            Read Companion
                            <span className="visually-hidden"> for {chapterTitle}</span>
                          </button>
                        )}
                        <Link
                          to={`/typing?book=${encodeURIComponent(book)}&chapter=${ch.chapter}`}
                          className={
                            ch.state === 'bloomed'
                              ? 'secondary-button trail-table-action-btn'
                              : 'primary-button trail-table-action-btn'
                          }
                          data-testid={`list-type-chapter-${ch.chapter}`}
                        >
                          {typeVerb}
                          <span className="visually-hidden"> {chapterTitle}</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default TrailChapterList;
