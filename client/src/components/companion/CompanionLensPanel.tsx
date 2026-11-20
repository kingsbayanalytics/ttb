import React, { useState } from 'react';
import { CompanionEntry, PrimaryCompanionLens } from '../../types';
import { CompanionMarkdown, isSafeHttpsUrl } from './CompanionMarkdown';

export interface CompanionLensPanelProps {
  lens: PrimaryCompanionLens;
  book: string;
  chapter: number;
  entries: CompanionEntry[];
  id: string;
  labelledBy: string;
  hidden: boolean;
}

const LENS_KICKERS: Record<PrimaryCompanionLens, string> = {
  'hoodoo-folk': 'TRADITIONAL ROOTWORK & FOLKLORIC PRACTICE',
  'historical-classic': 'HISTORICAL & CLASSICAL COMMENTARY',
  community: 'OFFLINE-CURATED COMMUNITY NOTES · r/Bible',
};

function formatChapterLabel(book: string, chapter: number): string {
  return book === 'Psalms' ? `Psalm ${chapter}` : `${book} ${chapter}`;
}

function formatDateShort(iso?: string): string | null {
  if (!iso) return null;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function formatPages(pages?: number[]): string | null {
  if (!pages || pages.length === 0) return null;
  const unique = Array.from(new Set(pages)).sort((a, b) => a - b);
  if (unique.length === 1) return `p. ${unique[0]}`;
  return `pp. ${unique[0]}–${unique[unique.length - 1]}`;
}

function slugifyOctave(octave: string, index: number): string {
  return `octave-${octave.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${index}`;
}

export const CompanionLensPanel: React.FC<CompanionLensPanelProps> = ({
  lens,
  book,
  chapter,
  entries,
  id,
  labelledBy,
  hidden,
}) => {
  const [activeOctaveId, setActiveOctaveId] = useState<string | null>(null);
  const chapterLabel = formatChapterLabel(book, chapter);

  const handleOctaveJump = (targetId: string) => {
    setActiveOctaveId(targetId);
    const el = document.getElementById(targetId);
    if (el) {
      if (typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ block: 'nearest' });
      }
      el.focus?.();
    }
  };

  return (
    <div
      id={id}
      role="tabpanel"
      aria-labelledby={labelledBy}
      hidden={hidden}
      tabIndex={hidden ? undefined : 0}
      className="companion-tabpanel"
      data-lens-panel={lens}
    >
      <div className="companion-tabpanel-inner">
        <p className={`companion-lens-kicker companion-lens-kicker--${lens}`}>
          {LENS_KICKERS[lens]}
        </p>

        {entries.length === 0 ? (
          <div className="companion-empty-state" data-testid={`companion-empty-${lens}`}>
            {lens === 'hoodoo-folk' && (
              <p>
                No Hoodoo &amp; Folk entry curated for {chapterLabel} yet — switch to Historical
                &amp; Classic to explore classical commentary.
              </p>
            )}
            {lens === 'historical-classic' && (
              <p>No Historical &amp; Classic commentary curated for {chapterLabel} yet.</p>
            )}
            {lens === 'community' && (
              <p>No community highlights archived for {chapterLabel} yet.</p>
            )}
          </div>
        ) : (
          <div className="companion-entries-stack">
            {entries.map((entry) => {
              const hasOctaves = entry.purposes.some((p) => Boolean(p.octave));
              const safeUrl = isSafeHttpsUrl(entry.externalUrl) ? entry.externalUrl.trim() : null;
              const pagesLabel = formatPages(entry.source?.pages);
              const retrievedLabel = formatDateShort(entry.source?.retrievedAt);

              return (
                <article key={entry.id || entry.upsertKey} className="companion-entry">
                  <header className="companion-entry-header">
                    <h3 className="companion-entry-title">{entry.title}</h3>
                    {entry.source?.originalRef && (
                      <p
                        className="companion-provenance-badge"
                        data-testid="vulgate-provenance-badge"
                      >
                        Vulgate / Douay-Rheims Alignment: {entry.source.originalRef}
                      </p>
                    )}
                    {entry.summary && (
                      <p className="companion-entry-summary">{entry.summary}</p>
                    )}
                  </header>

                  {entry.quoteExcerpt && (
                    <blockquote className="companion-quote-card" data-testid="community-quote-card">
                      <p className="companion-quote-text">&ldquo;{entry.quoteExcerpt}&rdquo;</p>
                      <footer className="companion-quote-meta">
                        {entry.source?.authorHandle && (
                          <span className="companion-mono-pill">{entry.source.authorHandle}</span>
                        )}
                        {entry.source?.subreddit && (
                          <span className="companion-mono-pill">{entry.source.subreddit}</span>
                        )}
                        {retrievedLabel && (
                          <span className="companion-meta-date">Archived {retrievedLabel}</span>
                        )}
                      </footer>
                    </blockquote>
                  )}

                  {entry.body && (
                    <CompanionMarkdown
                      text={entry.body}
                      className="companion-entry-body"
                      headingLevel="h4"
                    />
                  )}

                  {entry.purposes.length > 0 && (
                    <div className="companion-purposes-section">
                      {hasOctaves && (
                        <nav
                          aria-label={`${chapterLabel} Hebrew octaves`}
                          className="companion-octave-strip"
                          data-testid="psalm-119-octave-strip"
                        >
                          <span className="companion-octave-strip-label">
                            22 Hebrew Octaves:
                          </span>
                          <div className="companion-octave-buttons">
                            {entry.purposes.map((purpose, pIdx) => {
                              if (!purpose.octave) return null;
                              const targetId = slugifyOctave(purpose.octave, pIdx);
                              return (
                                <button
                                  key={targetId}
                                  type="button"
                                  className={`companion-octave-jump ${
                                    activeOctaveId === targetId ? 'is-active' : ''
                                  }`}
                                  onClick={() => handleOctaveJump(targetId)}
                                >
                                  {purpose.octave}
                                </button>
                              );
                            })}
                          </div>
                        </nav>
                      )}

                      <div className="companion-purposes-list">
                        {entry.purposes.map((purpose, pIdx) => {
                          const octaveId = purpose.octave
                            ? slugifyOctave(purpose.octave, pIdx)
                            : undefined;
                          return (
                            <section
                              key={octaveId || `${entry.id}-purpose-${pIdx}`}
                              id={octaveId}
                              tabIndex={octaveId ? -1 : undefined}
                              className={`companion-purpose-card ${
                                octaveId && activeOctaveId === octaveId ? 'is-highlighted' : ''
                              }`}
                              data-octave={purpose.octave || undefined}
                            >
                              {purpose.octave && (
                                <div className="companion-octave-badge">
                                  <span>{purpose.octave}</span>
                                  {purpose.verseRange && (
                                    <span> · Verses {purpose.verseRange}</span>
                                  )}
                                </div>
                              )}
                              <h4 className="companion-purpose-title">{purpose.title}</h4>
                              <CompanionMarkdown
                                text={purpose.body}
                                className="companion-purpose-body"
                                headingLevel="h5"
                              />
                              {(purpose.citedVerses.length > 0 ||
                                purpose.ritualTags.length > 0 ||
                                purpose.page !== undefined) && (
                                <div className="companion-purpose-meta">
                                  {purpose.citedVerses.length > 0 && (
                                    <span className="companion-verse-ref">
                                      Verses: {purpose.citedVerses.join(', ')}
                                    </span>
                                  )}
                                  {purpose.page !== undefined && (
                                    <span className="companion-page-ref">p. {purpose.page}</span>
                                  )}
                                  {purpose.ritualTags.length > 0 && (
                                    <div className="companion-tag-row">
                                      {purpose.ritualTags.map((tag) => (
                                        <span key={tag} className="companion-ritual-pill">
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </section>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {entry.purposes.length === 0 &&
                    (entry.ritualTags.length > 0 || entry.citedVerses.length > 0) && (
                      <div className="companion-entry-tags">
                        {entry.citedVerses.length > 0 && (
                          <span className="companion-verse-ref">
                            Verses: {entry.citedVerses.join(', ')}
                          </span>
                        )}
                        {entry.ritualTags.length > 0 && (
                          <div className="companion-tag-row">
                            {entry.ritualTags.map((tag) => (
                              <span key={tag} className="companion-ritual-pill">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                  {entry.indexPurposes.length > 0 && (
                    <section
                      className="companion-index-purposes"
                      data-testid="companion-index-purposes"
                    >
                      <h4 className="companion-section-kicker">Traditional Index Purposes</h4>
                      <ul className="companion-index-list">
                        {entry.indexPurposes.map((item, idx) => (
                          <li key={`${item.purpose}-${idx}`} className="companion-index-item">
                            <span>{item.purpose}</span>
                            {item.verseRange && (
                              <span className="companion-index-range">vv. {item.verseRange}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  <aside className="companion-source-box">
                    <h4 className="companion-source-kicker">Source &amp; Tradition Attribution</h4>
                    <dl className="companion-source-grid">
                      <div className="companion-source-row">
                        <dt>Source</dt>
                        <dd>
                          {entry.source.title}
                          {entry.source.author ? ` — ${entry.source.author}` : ''}
                          {entry.source.year ? ` (${entry.source.year})` : ''}
                        </dd>
                      </div>
                      {entry.source.originalRef && (
                        <div className="companion-source-row">
                          <dt>Original Ref</dt>
                          <dd>{entry.source.originalRef}</dd>
                        </div>
                      )}
                      {pagesLabel && (
                        <div className="companion-source-row">
                          <dt>Pages</dt>
                          <dd>{pagesLabel}</dd>
                        </div>
                      )}
                      {entry.source.subreddit && (
                        <div className="companion-source-row">
                          <dt>Community</dt>
                          <dd>
                            {entry.source.subreddit}
                            {entry.source.authorHandle ? ` · ${entry.source.authorHandle}` : ''}
                            {retrievedLabel ? ` · Archived ${retrievedLabel}` : ''}
                          </dd>
                        </div>
                      )}
                      {entry.source.edition && (
                        <div className="companion-source-row">
                          <dt>Edition</dt>
                          <dd>{entry.source.edition}</dd>
                        </div>
                      )}
                    </dl>
                    {safeUrl && (
                      <div className="companion-external-link-row">
                        <a
                          href={safeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="companion-external-link"
                          data-testid="companion-external-link"
                        >
                          Open External Source Reference ↗
                        </a>
                      </div>
                    )}
                  </aside>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanionLensPanel;
