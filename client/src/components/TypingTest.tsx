import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BookChapterProgress, Verse } from '../types';
import { CANONICAL_BOOKS } from '../data/books';
import { getCuratedPlanById } from '../data/curatedCatalog';
import { VerseService, ProgressService, MemoryService, PlanService } from '../services/api';
import { useAuthSession } from '../context/AuthContext';
import {
  countIncorrectCharacters,
  calculateAccuracy,
  calculateWpm,
  calculateCps,
} from '../utils/typingMetrics';
import {
  extractTypingErrors,
  recordKeystrokeMismatches,
} from '../utils/weaknessExtractor';

function formatCompletionPercent(completed: number, total: number): string {
  if (total <= 0 || completed <= 0) return '0%';
  if (completed >= total) return '100%';
  const raw = (completed / total) * 100;
  if (raw < 0.1) return '<0.1%';
  return `${raw.toFixed(1)}%`;
}

const TypingTest: React.FC = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search || '');
  const initialBook = searchParams.get('book')?.trim() || '';
  const initialPlanId = searchParams.get('plan')?.trim() || '';
  const rawMode = searchParams.get('mode')?.trim().toLowerCase() || '';
  const initialMode: 'random' | 'book' | 'sequential' | '' =
    rawMode === 'random' || rawMode === 'book' || rawMode === 'sequential' ? rawMode : '';

  const [verse, setVerse] = useState<Verse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [bookComplete, setBookComplete] = useState<string | null>(null);
  const [activePlan, setActivePlan] = useState<{
    id: string;
    title: string;
    verses: Verse[];
    index: number;
  } | null>(null);
  const [savedVerseKeys, setSavedVerseKeys] = useState<Set<string>>(new Set());
  const [savingToMemory, setSavingToMemory] = useState<boolean>(false);
  const [typedText, setTypedText] = useState<string>('');
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [completed, setCompleted] = useState<boolean>(false);
  const [wpm, setWpm] = useState<number>(0);
  const [accuracy, setAccuracy] = useState<number>(0);
  const [verseSelectionMode, setVerseSelectionMode] = useState<'random' | 'book' | 'sequential'>(
    initialBook ? 'book' : initialMode || 'random'
  );
  const [selectedBook, setSelectedBook] = useState<string>(initialBook);
  const [autoAdvance, setAutoAdvance] = useState<boolean>(
    Boolean(initialBook || initialPlanId || initialMode === 'book' || initialMode === 'sequential')
  );
  const [lastCompletedVerse, setLastCompletedVerse] = useState<{
    reference: string;
    wpm: number;
    accuracy: number;
    seconds: string;
  } | null>(null);
  const [bookChapterProgress, setBookChapterProgress] = useState<BookChapterProgress | null>(null);
  const [completionRefreshNonce, setCompletionRefreshNonce] = useState<number>(0);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bookSelectRef = useRef<HTMLSelectElement>(null);
  const mismatchIndicesRef = useRef<Set<number>>(new Set());
  const navigate = useNavigate();
  const { user } = useAuthSession();
  const userId = user?._id;

  const fetchVerse = useCallback(
    async (
      modeOverride?: 'random' | 'book' | 'sequential',
      bookOverride?: string,
      afterVerseOrder?: number
    ) => {
      const mode = modeOverride ?? verseSelectionMode;
      const bookToFetch = bookOverride ?? selectedBook;

      try {
        setLoading(true);
        setError(null);
        setBookComplete(null);
        setTypedText('');
        mismatchIndicesRef.current = new Set();
        setStartTime(null);
        setEndTime(null);
        setCompleted(false);
        setWpm(0);
        setAccuracy(0);

        let data: Verse;

        switch (mode) {
          case 'book':
            if (!bookToFetch) {
              setError('Please select a book');
              setLoading(false);
              return;
            }
            if (userId) {
              try {
                const nextResult =
                  afterVerseOrder !== undefined
                    ? await VerseService.getNextVerse(bookToFetch, afterVerseOrder)
                    : await VerseService.getNextVerse(bookToFetch);
                if (nextResult.complete || !nextResult.verse) {
                  setVerse(null);
                  setBookComplete(bookToFetch);
                  setLoading(false);
                  return;
                }
                data = nextResult.verse;
              } catch (err) {
                throw new Error(`Failed to fetch verse from ${bookToFetch}.`);
              }
            } else {
              try {
                const bookResults = await VerseService.getVersesByBook(bookToFetch);
                if (bookResults.data.length === 0) {
                  setError(`No verses found for ${bookToFetch}`);
                  setLoading(false);
                  return;
                }
                const sorted = [...bookResults.data].sort((a, b) => a.verseOrder - b.verseOrder);
                const nextInBook =
                  afterVerseOrder !== undefined
                    ? sorted.find((v) => v.verseOrder > afterVerseOrder) ?? sorted[0]
                    : sorted[0];
                data = nextInBook;
              } catch (err) {
                throw new Error(`Failed to fetch verse from ${bookToFetch}.`);
              }
            }
            break;

          case 'sequential':
            try {
              if (afterVerseOrder !== undefined) {
                data = await VerseService.getVerseByOrder(afterVerseOrder + 1);
              } else {
                const progress = userId ? await ProgressService.getUserProgress() : [];

                let nextVerseOrder = 1;
                if (progress.length > 0) {
                  const maxVerseOrder = Math.max(...progress.map((p) => p.verseOrder));
                  nextVerseOrder = maxVerseOrder + 1;
                }

                data = await VerseService.getVerseByOrder(nextVerseOrder);
              }
            } catch (err) {
              console.error('Failed to get sequential verse, falling back to random:', err);
              data = await VerseService.getRandomVerse();
            }
            break;

          case 'random':
          default:
            data = await VerseService.getRandomVerse();
            break;
        }

        setVerse(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch verse. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [verseSelectionMode, selectedBook, userId]
  );

  const fetchPlanVerses = useCallback(async (planId: string) => {
    const planDef = getCuratedPlanById(planId);
    if (!planDef) {
      setError(`Curated plan "${planId}" not found.`);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setBookComplete(null);
      setTypedText('');
      mismatchIndicesRef.current = new Set();
      setStartTime(null);
      setEndTime(null);
      setCompleted(false);
      setWpm(0);
      setAccuracy(0);

      let resolvedVerses: Verse[] = [];
      if (PlanService?.getPlanDetail) {
        try {
          const detail = await PlanService.getPlanDetail(planId);
          if (detail?.verses && detail.verses.length > 0) {
            const completedSet = new Set(detail.completedVerseIds || []);
            const firstUnfinishedIdx = detail.verses.findIndex(
              (v) => !completedSet.has(v._id)
            );
            const startIndex = firstUnfinishedIdx >= 0 ? firstUnfinishedIdx : 0;
            setActivePlan({
              id: planDef.id,
              title: planDef.title,
              verses: detail.verses,
              index: startIndex,
            });
            setVerse(detail.verses[startIndex]);
            return;
          }
        } catch (_err) {
          // Fallback to resolving first verse via VerseService below
        }
      }

      const firstRef = planDef.verses[0];
      const bookData = await VerseService.getVersesByBook(firstRef.book);
      resolvedVerses = bookData.data.length > 0 ? bookData.data : [];
      if (resolvedVerses.length === 0) {
        const randomFallback = await VerseService.getRandomVerse();
        resolvedVerses = [randomFallback];
      }

      setActivePlan({
        id: planDef.id,
        title: planDef.title,
        verses: resolvedVerses,
        index: 0,
      });
      setVerse(resolvedVerses[0]);
    } catch (err: any) {
      setError(err.message || 'Failed to load study plan.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load saved Memory Deck keys when user is logged in
  useEffect(() => {
    if (!userId || !MemoryService?.getDeck) return;
    let cancelled = false;
    MemoryService.getDeck()
      .then((items) => {
        if (cancelled || !Array.isArray(items)) return;
        const keys = new Set<string>();
        items.forEach((item) => {
          if (item.verse?._id) keys.add(item.verse._id);
          keys.add(`${item.book}:${item.chapter}:${item.verseNum}`);
        });
        setSavedVerseKeys(keys);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Fetch live chapter & book completion counts for the current verse
  useEffect(() => {
    if (
      !userId ||
      !verse?.book ||
      !verse?.chapter ||
      typeof ProgressService.getBookChapterProgress !== 'function'
    ) {
      return;
    }

    let cancelled = false;
    ProgressService.getBookChapterProgress(verse.book, verse.chapter)
      .then((data) => {
        if (!cancelled && data) {
          setBookChapterProgress(data);
        }
      })
      .catch(() => {
        // Keep existing completion display silently if lookup fails
      });

    return () => {
      cancelled = true;
    };
  }, [userId, verse?.book, verse?.chapter, completionRefreshNonce]);

  // Load initial verse or respond to ?book= / ?plan= / ?mode= query parameter changes
  useEffect(() => {
    if (initialPlanId) {
      setAutoAdvance(true);
      fetchPlanVerses(initialPlanId);
    } else if (initialBook) {
      setActivePlan(null);
      setVerseSelectionMode('book');
      setSelectedBook(initialBook);
      setAutoAdvance(true);
      fetchVerse('book', initialBook);
    } else if (initialMode === 'sequential') {
      setActivePlan(null);
      setVerseSelectionMode('sequential');
      setSelectedBook('');
      setAutoAdvance(true);
      fetchVerse('sequential', '');
    } else if (initialMode === 'book') {
      setActivePlan(null);
      setVerseSelectionMode('book');
      setSelectedBook('');
      setAutoAdvance(true);
      fetchVerse('random', '');
    } else {
      setActivePlan(null);
      setVerseSelectionMode('random');
      setSelectedBook('');
      setAutoAdvance(false);
      fetchVerse('random', '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialBook, initialPlanId, initialMode]);

  const advanceInPlanOrFetchNext = useCallback(
    (afterVerseOrder?: number) => {
      if (activePlan) {
        const nextIndex = activePlan.index + 1;
        if (nextIndex >= activePlan.verses.length) {
          setVerse(null);
          setBookComplete(activePlan.title);
          return;
        }
        setActivePlan({
          ...activePlan,
          index: nextIndex,
        });
        setTypedText('');
        mismatchIndicesRef.current = new Set();
        setStartTime(null);
        setEndTime(null);
        setCompleted(false);
        setWpm(0);
        setAccuracy(0);
        setVerse(activePlan.verses[nextIndex]);
        return;
      }
      fetchVerse(verseSelectionMode, selectedBook, afterVerseOrder);
    },
    [activePlan, fetchVerse, selectedBook, verseSelectionMode]
  );
  useEffect(() => {
    if (verse) {
      if (initialMode === 'book' && !selectedBook && bookSelectRef.current) {
        bookSelectRef.current.focus();
      } else if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  }, [verse, initialMode, selectedBook]);

  // Set start time on first keystroke
  useEffect(() => {
    if (typedText.length > 0 && !startTime) {
      setStartTime(new Date());
    }
  }, [typedText, startTime]);

  // Check for completion and calculate stats
  useEffect(() => {
    if (!verse) return;

    const incorrect = countIncorrectCharacters(typedText, verse.text);
    const accuracyPercentage = calculateAccuracy(typedText.length, incorrect);
    setAccuracy(accuracyPercentage);

    if (!typedText) return;

    // Check for completion
    if (typedText.length >= verse.text.length && !completed) {
      const now = new Date();
      const effectiveStartTime = startTime || now;
      if (!startTime) {
        setStartTime(effectiveStartTime);
      }
      // Calculate final stats
      const durationMs = now.getTime() - effectiveStartTime.getTime();
      const wordsPerMinute = calculateWpm(verse.words, durationMs);
      setWpm(wordsPerMinute);

      const completedVerseOrder = verse.verseOrder;
      const completedRef = `${verse.book} ${verse.chapter}:${verse.verse}`;
      const elapsedSeconds = (durationMs / 1000).toFixed(1);
      const finalMismatches = recordKeystrokeMismatches(
        verse.text,
        typedText,
        mismatchIndicesRef.current
      );
      const extractedErrors = extractTypingErrors(verse.text, finalMismatches);

      if (autoAdvance) {
        // Keep textarea mounted and clear input immediately for zero-flash inline transition
        setTypedText('');
        mismatchIndicesRef.current = new Set();
        setStartTime(null);
        setEndTime(null);
        setWpm(0);
        setAccuracy(0);
        setLastCompletedVerse({
          reference: completedRef,
          wpm: wordsPerMinute,
          accuracy: accuracyPercentage,
          seconds: elapsedSeconds,
        });
        if (user) {
          submitResult(
            effectiveStartTime,
            now,
            wordsPerMinute,
            accuracyPercentage,
            incorrect,
            extractedErrors
          );
        }
        advanceInPlanOrFetchNext(completedVerseOrder);
        return;
      }

      setEndTime(now);
      setCompleted(true);

      if (user) {
        submitResult(
          effectiveStartTime,
          now,
          wordsPerMinute,
          accuracyPercentage,
          incorrect,
          extractedErrors
        );
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typedText, verse, completed, startTime, user?._id, autoAdvance, verseSelectionMode, selectedBook]);

  const submitResult = async (
    resultStartTime: Date,
    resultEndTime: Date,
    resultWpm: number,
    resultAccuracy: number,
    incorrectChars: number,
    extractedErrors?: {
      missedChars: Array<{ char: string; count: number }>;
      missedWords: Array<{ word: string; count: number }>;
    }
  ) => {
    if (!verse) return;

    try {
      const duration = Math.max(0, resultEndTime.getTime() - resultStartTime.getTime()); // in milliseconds
      const cps = calculateCps(verse.characters, duration);

      await ProgressService.submitResult({
        user: user?._id || '',
        verse: verse._id,
        verseOrder: verse.verseOrder,
        startTime: resultStartTime.toISOString(),
        endTime: resultEndTime.toISOString(),
        duration,
        wpm: resultWpm,
        cps,
        accuracy: resultAccuracy,
        incorrectCharacters: incorrectChars,
        totalCharacters: verse.characters,
        missedChars: extractedErrors?.missedChars ?? [],
        missedWords: extractedErrors?.missedWords ?? [],
      });
      setCompletionRefreshNonce((n) => n + 1);
    } catch (err) {
      console.error('Failed to submit result:', err);
      // We'll continue even if result submission fails
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextValue = e.target.value;
    if (verse) {
      mismatchIndicesRef.current = recordKeystrokeMismatches(
        verse.text,
        nextValue,
        mismatchIndicesRef.current
      );
    }
    setTypedText(nextValue);
  };

  const handleTryAnotherVerse = () => {
    advanceInPlanOrFetchNext(verse?.verseOrder);
  };

  const handleSaveToMemory = async () => {
    if (!verse || !user || !MemoryService?.saveVerse) return;
    const verseKey = `${verse.book}:${verse.chapter}:${verse.verse}`;
    if (savedVerseKeys.has(verse._id) || savedVerseKeys.has(verseKey)) {
      return;
    }

    try {
      setSavingToMemory(true);
      await MemoryService.saveVerse({
        verseId: verse._id,
        book: verse.book,
        chapter: verse.chapter,
        verse: verse.verse,
        packId: activePlan?.id,
      });
      setSavedVerseKeys((prev) => {
        const next = new Set(prev);
        next.add(verse._id);
        next.add(verseKey);
        return next;
      });
    } catch (err) {
      console.error('Failed to save verse to Memory Deck:', err);
    } finally {
      setSavingToMemory(false);
    }
  };

  const handleViewProgress = () => {
    navigate('/progress');
  };

  const handleVerseSelectionModeChange = (mode: 'random' | 'book' | 'sequential') => {
    setVerseSelectionMode(mode);
    setAutoAdvance(mode === 'book' || mode === 'sequential');
  };

  const handleBookChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextBook = e.target.value;
    setSelectedBook(nextBook);
    if (nextBook) {
      setLastCompletedVerse(null);
      fetchVerse('book', nextBook);
    }
  };

  const handleFetchVerseClick = () => {
    setLastCompletedVerse(null);
    fetchVerse();
  };

  if (loading && !verse && !bookComplete) {
    return <div className="loading">Loading verse...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-message">{error}</p>
        <button onClick={() => fetchVerse()} className="primary-button">
          Try Again
        </button>
      </div>
    );
  }

  if (bookComplete) {
    return (
      <div className="typing-test-container">
        <div className="results-container" data-testid="book-complete-state">
          <h3>{bookComplete} Complete!</h3>
          <p>You have completed all verses in {bookComplete}.</p>
          <div className="results-actions">
            <Link to="/dashboard" className="primary-button">
              Back to Dashboard
            </Link>
            <button
              type="button"
              onClick={() => {
                setVerseSelectionMode('random');
                setSelectedBook('');
                fetchVerse('random', '');
              }}
              className="secondary-button"
            >
              Practice Random Verse
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Highlight correct/incorrect characters in the verse
  const renderVerse = () => {
    if (!verse) return null;
    
    return verse.text.split('').map((char, index) => {
      let className = '';
      
      if (index < typedText.length) {
        className = typedText[index] === char ? 'correct' : 'incorrect';
      }
      
      return (
        <span key={index} className={className}>
          {char}
        </span>
      );
    });
  };

  if (!verse) {
    return <div className="error">No verse found</div>;
  }

  return (
    <div className="typing-test-container">
      <div className="verse-settings">
        <div className="selection-controls">
          <div className="mode-selector">
            <label>Verse Selection Mode:</label>
            <div className="mode-buttons">
              <button 
                className={`selection-button ${verseSelectionMode === 'random' ? 'active' : ''}`}
                onClick={() => handleVerseSelectionModeChange('random')}
              >
                Random
              </button>
              
              <button 
                className={`selection-button ${verseSelectionMode === 'book' ? 'active' : ''}`}
                onClick={() => handleVerseSelectionModeChange('book')}
              >
                By Book
              </button>
              
              <button 
                className={`selection-button ${verseSelectionMode === 'sequential' ? 'active' : ''}`}
                onClick={() => handleVerseSelectionModeChange('sequential')}
                disabled={!user}
                title={!user ? "Login to use sequential mode" : ""}
              >
                Sequential
              </button>
            </div>
          </div>
          
          {verseSelectionMode === 'book' && (
            <div className="book-selector">
              <select
                ref={bookSelectRef}
                aria-label="Select a Bible book"
                value={selectedBook}
                onChange={handleBookChange}
              >
                <option value="">-- Select a Book --</option>
                {CANONICAL_BOOKS.map(book => (
                  <option key={book} value={book}>{book}</option>
                ))}
              </select>
            </div>
          )}
          
          <button 
            className="primary-button"
            onClick={handleFetchVerseClick}
            disabled={verseSelectionMode === 'book' && !selectedBook}
          >
            Get Verse
          </button>
        </div>

        <div className="continuity-controls">
          <label className={`auto-advance-toggle ${autoAdvance ? 'is-active' : ''}`}>
            <input
              type="checkbox"
              className="visually-hidden"
              checked={autoAdvance}
              onChange={(e) => setAutoAdvance(e.target.checked)}
            />
            <span>Auto-advance to next verse on completion</span>
          </label>
        </div>
      </div>

      {activePlan && (
        <div
          className="active-plan-banner"
          role="status"
          data-testid="active-plan-banner"
        >
          <span>
            <strong>Curated Plan: {activePlan.title}</strong> · Verse {activePlan.index + 1} of{' '}
            {activePlan.verses.length}
          </span>
          <Link to="/memory" className="secondary-button coverage-continue-link">
            Memory Studio
          </Link>
        </div>
      )}

      {lastCompletedVerse && (
        <div
          className="last-completed-banner"
          role="status"
          data-testid="last-completed-banner"
        >
          <span>
            <strong>Completed {lastCompletedVerse.reference}</strong> — {lastCompletedVerse.wpm} WPM ·{' '}
            {lastCompletedVerse.accuracy}% Accuracy · {lastCompletedVerse.seconds}s
          </span>
        </div>
      )}
      
      <>
        <div className="verse-reference">
          <div className="verse-reference-main">
            <h2>{verse.book} {verse.chapter}:{verse.verse}</h2>
            {loading && (
              <span className="inline-refresh-badge" role="status" aria-live="polite">
                Updating verse…
              </span>
            )}
          </div>
          {user && (
            <button
              type="button"
              className={`memory-save-button ${
                savedVerseKeys.has(verse._id) ||
                savedVerseKeys.has(`${verse.book}:${verse.chapter}:${verse.verse}`)
                  ? 'is-saved'
                  : ''
              }`}
              onClick={handleSaveToMemory}
              disabled={
                savingToMemory ||
                savedVerseKeys.has(verse._id) ||
                savedVerseKeys.has(`${verse.book}:${verse.chapter}:${verse.verse}`)
              }
              data-testid="save-memory-button"
            >
              {savedVerseKeys.has(verse._id) ||
              savedVerseKeys.has(`${verse.book}:${verse.chapter}:${verse.verse}`)
                ? '✓ Saved in Memory Deck'
                : savingToMemory
                ? 'Saving...'
                : '★ Save to Memory Deck'}
            </button>
          )}
        </div>

        {user && bookChapterProgress && bookChapterProgress.bookTotal > 0 && (
          <div
            className="completion-progress-strip"
            data-testid="chapter-book-progress"
          >
            <div className="completion-meter completion-meter-chapter">
              <div className="completion-meter-header">
                <label
                  htmlFor="chapter-completion-bar"
                  className="completion-meter-label"
                >
                  Chapter {bookChapterProgress.chapter}
                </label>
                <span className="completion-meter-stats">
                  {bookChapterProgress.chapterCompleted.toLocaleString()} /{' '}
                  {bookChapterProgress.chapterTotal.toLocaleString()} verses ·{' '}
                  <strong>
                    {formatCompletionPercent(
                      bookChapterProgress.chapterCompleted,
                      bookChapterProgress.chapterTotal
                    )}
                  </strong>
                </span>
              </div>
              <progress
                id="chapter-completion-bar"
                className="completion-progress-bar completion-progress-bar-chapter"
                value={bookChapterProgress.chapterCompleted}
                max={Math.max(1, bookChapterProgress.chapterTotal)}
              />
            </div>

            <div className="completion-meter completion-meter-book">
              <div className="completion-meter-header">
                <label
                  htmlFor="book-completion-bar"
                  className="completion-meter-label"
                >
                  {bookChapterProgress.book}
                </label>
                <span className="completion-meter-stats">
                  {bookChapterProgress.bookCompleted.toLocaleString()} /{' '}
                  {bookChapterProgress.bookTotal.toLocaleString()} verses ·{' '}
                  <strong>
                    {formatCompletionPercent(
                      bookChapterProgress.bookCompleted,
                      bookChapterProgress.bookTotal
                    )}
                  </strong>
                </span>
              </div>
              <progress
                id="book-completion-bar"
                className="completion-progress-bar completion-progress-bar-book"
                value={bookChapterProgress.bookCompleted}
                max={Math.max(1, bookChapterProgress.bookTotal)}
              />
            </div>
          </div>
        )}
        
        <div
          className={`verse-display ${loading ? 'is-refreshing' : ''}`}
          data-testid="verse-display"
        >
          {renderVerse()}
        </div>
        
        <div className="typing-stats">
          {startTime && !completed && (
            <>
              <div className="stat">
                <span className="stat-label">WPM:</span> {wpm}
              </div>
              <div className="stat">
                <span className="stat-label">Accuracy:</span> {accuracy}%
              </div>
              <div className="stat">
                <span className="stat-label">Progress:</span>{' '}
                {Math.round((typedText.length / verse.text.length) * 100)}%
              </div>
            </>
          )}
        </div>
        
        {completed ? (
          <div className="results-container">
            <h3>Verse Completed!</h3>
            
            <div className="results">
              <div className="result-item">
                <span className="result-label">Words Per Minute:</span>
                <span className="result-value">{wpm}</span>
              </div>
              
              <div className="result-item">
                <span className="result-label">Accuracy:</span>
                <span className="result-value">{accuracy}%</span>
              </div>
              
              <div className="result-item">
                <span className="result-label">Time:</span>
                <span className="result-value">
                  {startTime && endTime
                    ? `${((endTime.getTime() - startTime.getTime()) / 1000).toFixed(1)} seconds`
                    : 'N/A'}
                </span>
              </div>
            </div>
            
            <div className="results-actions">
              <button onClick={handleTryAnotherVerse} className="primary-button">
                Try Another Verse
              </button>
              
              {user && (
                <button onClick={handleViewProgress} className="secondary-button">
                  View Progress
                </button>
              )}
            </div>
          </div>
        ) : (
          <textarea
            ref={inputRef}
            className="typing-input"
            value={typedText}
            onChange={handleInputChange}
            placeholder="Start typing the verse above..."
            disabled={completed}
            autoFocus
          />
        )}
        
        {!completed && (
          <button onClick={handleTryAnotherVerse} className="secondary-button mt-4">
            Get Another Verse
          </button>
        )}
      </>
    </div>
  );
};

export default TypingTest; 