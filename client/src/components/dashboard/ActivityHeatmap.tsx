import React, { useMemo, useState } from 'react';
import { ActivityPoint } from '../../types';

export interface ActivityHeatmapProps {
  data: ActivityPoint[];
  year: number;
  availableYears: number[];
  onYearChange: (year: number) => void;
  loading?: boolean;
}

export interface HeatmapCell {
  date: string;
  attempts: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export function getActivityLevel(attempts: number): 0 | 1 | 2 | 3 | 4 {
  if (attempts <= 0) return 0;
  if (attempts <= 2) return 1;
  if (attempts <= 5) return 2;
  if (attempts <= 10) return 3;
  return 4;
}

export function buildCalendarWeeks(
  year: number,
  data: readonly ActivityPoint[]
): Array<Array<HeatmapCell | null>> {
  const counts = new Map<string, number>();
  for (const point of data) {
    counts.set(point.date, point.attempts);
  }

  const jan1 = new Date(Date.UTC(year, 0, 1));
  const dec31 = new Date(Date.UTC(year, 11, 31));
  const leadingEmpty = jan1.getUTCDay();

  const weeks: Array<Array<HeatmapCell | null>> = [];
  let currentWeek: Array<HeatmapCell | null> = Array.from({ length: leadingEmpty }, () => null);

  for (
    let cursor = new Date(jan1.getTime());
    cursor <= dec31;
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)
  ) {
    const date = cursor.toISOString().slice(0, 10);
    const attempts = counts.get(date) ?? 0;
    currentWeek.push({
      date,
      attempts,
      level: getActivityLevel(attempts),
    });

    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  return weeks;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({
  data,
  year,
  availableYears,
  onYearChange,
  loading = false,
}) => {
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);
  const [showTable, setShowTable] = useState(false);

  const weeks = useMemo(() => buildCalendarWeeks(year, data), [year, data]);
  const totalAttempts = useMemo(
    () => data.reduce((sum, point) => sum + point.attempts, 0),
    [data]
  );

  return (
    <section className="dashboard-section" aria-labelledby="activity-heading">
      <div className="dashboard-section-header">
        <div>
          <h3 id="activity-heading">Daily Practice Activity</h3>
          <p className="dashboard-section-subtitle">
            {totalAttempts} {totalAttempts === 1 ? 'attempt' : 'attempts'} across{' '}
            {data.length} active {data.length === 1 ? 'day' : 'days'} in {year}
          </p>
        </div>

        <div className="dashboard-controls">
          <label htmlFor="activity-year-select" className="sr-only">
            Activity year
          </label>
          <select
            id="activity-year-select"
            aria-label="Activity year"
            className="dashboard-year-select"
            value={year}
            onChange={(e) => onYearChange(Number(e.target.value))}
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && data.length === 0 ? (
        <div className="dashboard-inline-loading" role="status">
          Loading activity calendar...
        </div>
      ) : (
        <div className={loading ? 'is-refreshing' : ''}>
          <div className="heatmap-status-bar" aria-live="polite">
            {loading ? (
              <span className="inline-refresh-badge" role="status">
                Updating activity calendar…
              </span>
            ) : hoveredCell ? (
              <span>
                <strong>{hoveredCell.date}:</strong> {hoveredCell.attempts}{' '}
                {hoveredCell.attempts === 1 ? 'attempt' : 'attempts'}
              </span>
            ) : (
              <span>Hover or focus any day cell to inspect its date and attempt count.</span>
            )}
          </div>

          <div className="heatmap-scroll-container">
            <div className="heatmap-layout">
              <div className="heatmap-weekdays" aria-hidden="true">
                {WEEKDAY_LABELS.map((day) => (
                  <span key={day} className="heatmap-weekday-label">
                    {day}
                  </span>
                ))}
              </div>
              <div
                className="heatmap-grid"
                role="grid"
                aria-label={`Practice activity calendar for ${year}`}
              >
                {weeks.map((week, weekIdx) => (
                  <div key={weekIdx} className="heatmap-week" role="row">
                    {week.map((cell, dayIdx) =>
                      cell ? (
                        <button
                          key={cell.date}
                          type="button"
                          role="gridcell"
                          className={`heatmap-cell level-${cell.level}`}
                          data-date={cell.date}
                          data-attempts={cell.attempts}
                          data-level={cell.level}
                          title={`${cell.date}: ${cell.attempts} ${
                            cell.attempts === 1 ? 'attempt' : 'attempts'
                          }`}
                          aria-label={`${cell.date}: ${cell.attempts} ${
                            cell.attempts === 1 ? 'attempt' : 'attempts'
                          }`}
                          onMouseEnter={() => setHoveredCell(cell)}
                          onMouseLeave={() => setHoveredCell(null)}
                          onFocus={() => setHoveredCell(cell)}
                          onBlur={() => setHoveredCell(null)}
                        />
                      ) : (
                        <span
                          key={`empty-${weekIdx}-${dayIdx}`}
                          className="heatmap-cell-placeholder"
                          aria-hidden="true"
                        />
                      )
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="heatmap-legend" aria-label="Activity intensity legend">
            <span>Less (0)</span>
            <span className="heatmap-cell level-0" aria-hidden="true" />
            <span className="heatmap-cell level-1" aria-hidden="true" />
            <span className="heatmap-cell level-2" aria-hidden="true" />
            <span className="heatmap-cell level-3" aria-hidden="true" />
            <span className="heatmap-cell level-4" aria-hidden="true" />
            <span>More (11+)</span>
          </div>

          <div className="dashboard-table-toggle">
            <button
              type="button"
              className="secondary-button"
              aria-expanded={showTable}
              aria-controls="activity-data-table"
              onClick={() => setShowTable((prev) => !prev)}
            >
              {showTable ? 'Hide activity table' : 'Show activity table'}
            </button>
          </div>

          <div
            id="activity-data-table"
            className={showTable ? 'dashboard-table-wrapper' : 'sr-only'}
          >
            {data.length === 0 ? (
              <p className="dashboard-empty-state">No practice activity recorded in {year}.</p>
            ) : (
              <table className="progress-table dashboard-data-table">
                <caption>Active practice days in {year}</caption>
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Attempts</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((point) => (
                    <tr key={point.date}>
                      <td>{point.date}</td>
                      <td>{point.attempts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default ActivityHeatmap;
