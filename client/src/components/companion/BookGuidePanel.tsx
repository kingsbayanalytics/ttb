import React from 'react';
import { Link } from 'react-router-dom';
import { BookGuideResponse, ChapterBloomState } from '../../types';
import { CompanionMarkdown } from './CompanionMarkdown';

export interface BookGuidePanelProps {
  guide: BookGuideResponse;
  onTypeChapter?: (book: string, chapter: number) => void;
  onSelectChapterCompanion?: (book: string, chapter: number) => void;
  onClose?: () => void;
}

function getStateMeta(state: ChapterBloomState): { glyph: string; label: string } {
  switch (state) {
    case 'bloomed':
      return { glyph: '✦', label: 'Bloomed' };
    case 'in_progress':
      return { glyph: '◐', label: 'In Progress' };
    default:
      return { glyph: '○', label: 'Dormant' };
  }
}

function formatSlotChapter(book: string, chapter: number): string {
  return book === 'Psalms' ? `Psalm ${chapter}` : `${book} ${chapter}`;
}

export const BookGuidePanel: React.FC<BookGuidePanelProps> = ({
  guide,
  onTypeChapter,
  onSelectChapterCompanion,
  onClose,
}) => {
  const { book, bookProgress, introductions, dailySchedule, bonusMeditations } = guide;
  const hasContent =
    introductions.length > 0 || dailySchedule.length > 0 || bonusMeditations.length > 0;

  return (
    <div className="companion-guide-panel" data-testid="book-guide-panel">
      <div className="companion-guide-progress-bar">
        <div className="companion-guide-progress-header">
          <span className="companion-section-kicker">{book} Journey Progress</span>
          <span className="companion-guide-progress-stats">
            {bookProgress.bloomedChapters} / {bookProgress.totalChapters} chapters bloomed ·{' '}
            {bookProgress.completedVerses.toLocaleString()} /{' '}
            {bookProgress.totalVerses.toLocaleString()} verses
          </span>
        </div>
        <progress
          className="companion-progress-meter"
          value={bookProgress.bloomedChapters}
          max={Math.max(1, bookProgress.totalChapters)}
          aria-label={`${book} chapter bloom progress`}
        />
        {bookProgress.bookMastered && (
          <p className="companion-mastery-badge">✦ Sanctuary Radiance — Book Mastered</p>
        )}
      </div>

      {!hasContent && (
        <div className="companion-empty-state">
          <p>No book-level guide entries have been curated for {book} yet.</p>
        </div>
      )}

      {introductions.length > 0 && (
        <section className="companion-guide-section" aria-labelledby="guide-intro-heading">
          <h3 id="guide-intro-heading" className="companion-guide-heading">
            Book Introduction &amp; Context
          </h3>
          {introductions.map((entry) => (
            <article key={entry.id || entry.upsertKey} className="companion-entry">
              <h4 className="companion-entry-title">{entry.title}</h4>
              {entry.summary && <p className="companion-entry-summary">{entry.summary}</p>}
              <CompanionMarkdown
                text={entry.body}
                className="companion-entry-body"
                headingLevel="h5"
              />
              {entry.source?.title && (
                <p className="companion-guide-source">
                  Source: {entry.source.title}
                  {entry.source.author ? ` — ${entry.source.author}` : ''}
                  {entry.source.year ? ` (${entry.source.year})` : ''}
                </p>
              )}
            </article>
          ))}
        </section>
      )}

      {dailySchedule.length > 0 && (
        <section
          className="companion-guide-section"
          aria-labelledby="guide-schedule-heading"
          data-testid="daily-prayer-schedule"
        >
          <h3 id="guide-schedule-heading" className="companion-guide-heading">
            Daily Prayer Schedule ({dailySchedule.length} Slots)
          </h3>
          <div className="companion-schedule-table-wrap">
            <table className="companion-schedule-table">
              <caption className="visually-hidden">
                {book} morning and evening daily prayer schedule
              </caption>
              <thead>
                <tr>
                  <th scope="col">Slot</th>
                  <th scope="col">Chapter</th>
                  <th scope="col">Status</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {dailySchedule.map((item, idx) => {
                  const targetBook = item.book || book;
                  const targetChapter = item.chapter || item.psalm;
                  const stateMeta = getStateMeta(item.state);
                  const chapterText = formatSlotChapter(targetBook, targetChapter);
                  const typingUrl = `/typing?book=${encodeURIComponent(
                    targetBook
                  )}&chapter=${targetChapter}`;

                  return (
                    <tr key={`${item.slot}-${targetChapter}-${idx}`}>
                      <td className="companion-schedule-slot">{item.slot}</td>
                      <td className="companion-schedule-chapter">{chapterText}</td>
                      <td>
                        <span
                          className={`companion-state-badge companion-state-badge--${item.state}`}
                        >
                          <span aria-hidden="true">{stateMeta.glyph}</span> {stateMeta.label}
                        </span>
                      </td>
                      <td className="companion-schedule-actions">
                        {onTypeChapter ? (
                          <button
                            type="button"
                            className="companion-inline-action"
                            onClick={() => onTypeChapter(targetBook, targetChapter)}
                          >
                            Type {chapterText}
                          </button>
                        ) : (
                          <Link
                            to={typingUrl}
                            className="companion-inline-action"
                            onClick={onClose}
                          >
                            Type {chapterText}
                          </Link>
                        )}
                        {item.unlocked && onSelectChapterCompanion && (
                          <button
                            type="button"
                            className="companion-inline-secondary"
                            onClick={() => onSelectChapterCompanion(targetBook, targetChapter)}
                          >
                            Read Notes
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {bonusMeditations.length > 0 && (
        <section
          className="companion-guide-section"
          aria-labelledby="guide-meditations-heading"
          data-testid="book-guide-meditations"
        >
          <h3 id="guide-meditations-heading" className="companion-guide-heading">
            Bonus Meditations &amp; Reflections
          </h3>
          {bonusMeditations.map((entry) => (
            <article key={entry.id || entry.upsertKey} className="companion-entry">
              <h4 className="companion-entry-title">{entry.title}</h4>
              {entry.summary && <p className="companion-entry-summary">{entry.summary}</p>}
              <CompanionMarkdown
                text={entry.body}
                className="companion-entry-body"
                headingLevel="h5"
              />
              {entry.source?.title && (
                <p className="companion-guide-source">
                  Source: {entry.source.title}
                  {entry.source.author ? ` — ${entry.source.author}` : ''}
                </p>
              )}
            </article>
          ))}
        </section>
      )}
    </div>
  );
};

export default BookGuidePanel;
