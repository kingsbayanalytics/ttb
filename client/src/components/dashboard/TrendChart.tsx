import React, { useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TrendPoint, TrendRange } from '../../types';

export interface TrendChartProps {
  data: TrendPoint[];
  range: TrendRange;
  onRangeChange: (range: TrendRange) => void;
  loading?: boolean;
}

const RANGE_OPTIONS: ReadonlyArray<{ value: TrendRange; label: string }> = [
  { value: '30', label: '30 Days' },
  { value: '90', label: '90 Days' },
  { value: '365', label: '365 Days' },
  { value: 'all', label: 'All Time' },
];

const TrendChart: React.FC<TrendChartProps> = ({
  data,
  range,
  onRangeChange,
  loading = false,
}) => {
  const [showTable, setShowTable] = useState(false);

  return (
    <section className="dashboard-section" aria-labelledby="trend-heading">
      <div className="dashboard-section-header">
        <div>
          <h3 id="trend-heading">
            Speed &amp; Accuracy Trend
            {loading && data.length > 0 && (
              <span className="inline-refresh-badge" role="status" aria-live="polite">
                Updating…
              </span>
            )}
          </h3>
          <p className="dashboard-section-subtitle">
            Daily average WPM and accuracy across active practice days
          </p>
        </div>

        <div className="dashboard-controls" role="group" aria-label="Trend time range">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`selection-button ${range === option.value ? 'active' : ''}`}
              aria-pressed={range === option.value}
              onClick={() => onRangeChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {loading && data.length === 0 ? (
        <div className="dashboard-inline-loading" role="status">
          Loading trend data...
        </div>
      ) : data.length === 0 ? (
        <div className="dashboard-empty-state" role="status">
          No typing attempts recorded in this range yet. Complete a verse to start your trend line.
        </div>
      ) : (
        <>
          <div
            className={`dashboard-chart-wrapper ${loading ? 'is-refreshing' : ''}`}
            data-testid="trend-chart-container"
          >
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-stone, #D6D0C4)" />
                <XAxis dataKey="date" stroke="var(--ink-secondary, #57534E)" />
                <YAxis
                  yAxisId="wpm"
                  stroke="var(--ink-secondary, #57534E)"
                  label={{ value: 'WPM', angle: -90, position: 'insideLeft' }}
                />
                <YAxis
                  yAxisId="accuracy"
                  orientation="right"
                  domain={[0, 100]}
                  stroke="var(--ink-secondary, #57534E)"
                  label={{ value: 'Accuracy %', angle: 90, position: 'insideRight' }}
                />
                <Tooltip
                  formatter={(value: unknown, name: unknown) => {
                    const numeric = typeof value === 'number' ? value : Number(value);
                    if (Number.isNaN(numeric)) return [String(value), String(name)];
                    const label = String(name);
                    return label.includes('Accuracy')
                      ? [`${numeric.toFixed(1)}%`, label]
                      : [numeric.toFixed(1), label];
                  }}
                />
                <Legend />
                <Line
                  yAxisId="wpm"
                  type="monotone"
                  dataKey="avgWpm"
                  name="Avg WPM"
                  stroke="var(--accent-terracotta, #B84A39)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="accuracy"
                  type="monotone"
                  dataKey="avgAccuracy"
                  name="Avg Accuracy (%)"
                  stroke="var(--accent-slate-blue, #345474)"
                  strokeWidth={2}
                  strokeDasharray="5 3"
                  dot={{ r: 3 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="dashboard-table-toggle">
            <button
              type="button"
              className="secondary-button"
              aria-expanded={showTable}
              aria-controls="trend-data-table"
              onClick={() => setShowTable((prev) => !prev)}
            >
              {showTable ? 'Hide data table' : 'Show data table'}
            </button>
          </div>

          <div
            id="trend-data-table"
            className={showTable ? 'dashboard-table-wrapper' : 'sr-only'}
          >
            <table className="progress-table dashboard-data-table">
              <caption>Daily WPM and accuracy trend</caption>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Avg WPM</th>
                  <th scope="col">Avg Accuracy</th>
                  <th scope="col">Attempts</th>
                </tr>
              </thead>
              <tbody>
                {data.map((point) => (
                  <tr key={point.date}>
                    <td>{point.date}</td>
                    <td>{point.avgWpm.toFixed(1)}</td>
                    <td>{point.avgAccuracy.toFixed(1)}%</td>
                    <td>{point.attempts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
};

export default TrendChart;
