import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CoverageData, Testament } from '../../types';
import { PHASE1_ACTIVE_BOOKS } from '../../data/trailBiomes';

export interface BookCoverageProps {
  coverage: CoverageData;
}

type TestamentFilter = 'all' | Testament;

const BookCoverage: React.FC<BookCoverageProps> = ({ coverage }) => {
  const [filter, setFilter] = useState<TestamentFilter>('all');
  const [showTable, setShowTable] = useState(false);

  const filteredBooks = useMemo(() => {
    if (filter === 'all') {
      return coverage.books;
    }
    return coverage.books.filter((book) => book.testament === filter);
  }, [coverage.books, filter]);

  return (
    <section className="dashboard-section" aria-labelledby="coverage-heading">
      <div className="dashboard-section-header">
        <div>
          <h3 id="coverage-heading">Bible Coverage</h3>
          <p className="dashboard-section-subtitle">
            Overall progress and canonical book breakdown
          </p>
        </div>
      </div>

      <div className="coverage-overview-grid">
        <div className="summary-card coverage-overall-card">
          <h4>Overall Bible Coverage</h4>
          <div className="summary-value" data-testid="overall-coverage-percentage">
            {coverage.overall.percentage.toFixed(1)}%
          </div>
          <div className="summary-detail">
            {coverage.overall.completedVerses} of {coverage.overall.totalVerses} verses completed
          </div>
          <div
            className="progress-bar-container"
            role="progressbar"
            aria-label="Overall Bible coverage"
            aria-valuenow={coverage.overall.percentage}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="progress-bar"
              style={{ width: `${Math.min(coverage.overall.percentage, 100)}%` }}
            />
          </div>
        </div>

        {coverage.testaments.map((item) => (
          <div key={item.testament} className="summary-card coverage-testament-card">
            <h4>{item.testament}</h4>
            <div className="summary-value">{item.percentage.toFixed(1)}%</div>
            <div className="summary-detail">
              {item.completedVerses} of {item.totalVerses} verses
            </div>
            <div
              className="progress-bar-container"
              role="progressbar"
              aria-label={`${item.testament} coverage`}
              aria-valuenow={item.percentage}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="progress-bar"
                style={{ width: `${Math.min(item.percentage, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-chart-wrapper coverage-chart-wrapper" aria-hidden="true">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={coverage.testaments}
            margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-stone, #D6D0C4)" />
            <XAxis dataKey="testament" stroke="var(--ink-secondary, #57534E)" />
            <YAxis domain={[0, 100]} unit="%" stroke="var(--ink-secondary, #57534E)" />
            <Tooltip
              formatter={(value: unknown) => {
                const numeric = typeof value === 'number' ? value : Number(value);
                return [`${Number.isNaN(numeric) ? value : numeric.toFixed(1)}%`, 'Coverage'];
              }}
            />
            <Bar
              dataKey="percentage"
              name="Coverage (%)"
              fill="var(--accent-terracotta, #B84A39)"
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="coverage-filter-bar">
        <div className="dashboard-controls" role="group" aria-label="Filter books by Testament">
          <button
            type="button"
            className={`selection-button ${filter === 'all' ? 'active' : ''}`}
            aria-pressed={filter === 'all'}
            onClick={() => setFilter('all')}
          >
            All Books ({coverage.books.length})
          </button>
          <button
            type="button"
            className={`selection-button ${filter === 'Old Testament' ? 'active' : ''}`}
            aria-pressed={filter === 'Old Testament'}
            onClick={() => setFilter('Old Testament')}
          >
            Old Testament
          </button>
          <button
            type="button"
            className={`selection-button ${filter === 'New Testament' ? 'active' : ''}`}
            aria-pressed={filter === 'New Testament'}
            onClick={() => setFilter('New Testament')}
          >
            New Testament
          </button>
        </div>

        <button
          type="button"
          className="secondary-button"
          aria-expanded={showTable}
          aria-controls="coverage-plain-table"
          onClick={() => setShowTable((prev) => !prev)}
        >
          {showTable ? 'Hide summary table' : 'Show summary table'}
        </button>
      </div>

      <div
        id="coverage-plain-table"
        className={showTable ? 'dashboard-table-wrapper' : 'sr-only'}
      >
        <table className="progress-table dashboard-data-table">
          <caption>Bible coverage by book in canonical order</caption>
          <thead>
            <tr>
              <th scope="col">Book</th>
              <th scope="col">Testament</th>
              <th scope="col">Completed</th>
              <th scope="col">Total</th>
              <th scope="col">Coverage</th>
            </tr>
          </thead>
          <tbody>
            {filteredBooks.map((book) => (
              <tr key={book.book}>
                <td>{book.book}</td>
                <td>{book.testament}</td>
                <td>{book.completedVerses}</td>
                <td>{book.totalVerses}</td>
                <td>{book.percentage.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="coverage-book-list" aria-label="Book coverage list">
        {filteredBooks.map((book) => {
          const isComplete =
            book.totalVerses > 0 && book.completedVerses >= book.totalVerses;

          return (
            <li key={book.book} className="coverage-book-row" data-testid={`book-row-${book.book}`}>
              <div className="coverage-book-info">
                <span className="coverage-book-name">{book.book}</span>
                <span className="coverage-book-testament">{book.testament}</span>
              </div>

              <div className="coverage-book-progress">
                <div
                  className="progress-bar-container coverage-book-bar"
                  role="progressbar"
                  aria-label={`${book.book} coverage`}
                  aria-valuenow={book.percentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="progress-bar"
                    style={{ width: `${Math.min(book.percentage, 100)}%` }}
                  />
                </div>
                <span className="coverage-book-numbers">
                  {book.percentage.toFixed(1)}% ({book.completedVerses}/{book.totalVerses})
                </span>
              </div>

              <div
                className="coverage-book-action"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '0.5rem',
                  flexWrap: 'wrap',
                }}
              >
                {PHASE1_ACTIVE_BOOKS.has(book.book) && (
                  <Link
                    to={`/trail?book=${encodeURIComponent(book.book)}`}
                    className="secondary-button coverage-continue-link"
                    data-testid={`view-on-trail-${book.book}`}
                  >
                    <span aria-hidden="true">✦ </span>
                    View on Trail
                    <span className="visually-hidden">: {book.book}</span>
                  </Link>
                )}
                {book.totalVerses === 0 ? (
                  <span className="coverage-empty-badge">No verses</span>
                ) : isComplete ? (
                  <span className="coverage-complete-badge">Complete</span>
                ) : (
                  <Link
                    to={`/typing?book=${encodeURIComponent(book.book)}`}
                    className="primary-button coverage-continue-link"
                  >
                    Continue
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default BookCoverage;
