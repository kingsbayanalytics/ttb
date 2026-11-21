import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AchievementsData,
  BadgeItem,
  BookChapterInfo,
  BookChapterProgress,
  ChapterJustUnlocked,
  CustomPlanSummary,
  Verse,
  VerseContext,
} from '../types';
import { CANONICAL_BOOKS } from '../data/books';
import { getCuratedPlanById } from '../data/curatedCatalog';
import {
  VerseService,
  ProgressService,
  MemoryService,
  PlanService,
  StatsService,
} from '../services/api';
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
import {
  ChapterBloomBanner,
  SessionHarvestStrip,
  ZenBloomChip,
} from './companion/ChapterBloomToast';
import { BadgeUnlockToast, ZenBadgeChip } from './trail/BadgeUnlockToast';

const LazyCompanionDrawer = React.lazy(() => import('./companion/CompanionDrawer'));
const LazyTrailBadgesModal = React.lazy(() => import('./trail/TrailBadgesModal'));

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
  const rawChapter = searchParams.get('chapter')?.trim() || '';
  const initialChapter = /^\d+$/.test(rawChapter) && Number(rawChapter) >= 1 ? rawChapter : '';
  const rawVerseNum = searchParams.get('verse')?.trim() || '';
  const initialVerseNum = /^\d+$/.test(rawVerseNum) && Number(rawVerseNum) >= 1 ? rawVerseNum : '';
  const initialPlanId = searchParams.get('plan')?.trim() || '';
  const initialCustomPlanId = searchParams.get('customPlan')?.trim() || '';
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
    kind: 'curated' | 'custom';
    verses: Verse[];
    index: number;
  } | null>(null);
  const [savedVerseKeys, setSavedVerseKeys] = useState<Set<string>>(new Set());
  const [savingToMemory, setSavingToMemory] = useState<boolean>(false);
  const [customPlans, setCustomPlans] = useState<CustomPlanSummary[]>([]);
  const [playlistFeedback, setPlaylistFeedback] = useState<string | null>(null);
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
  const [bookChapters, setBookChapters] = useState<BookChapterInfo[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<string>(initialChapter);
  const [selectedVerseNum, setSelectedVerseNum] = useState<string>(initialVerseNum);
  const [autoAdvance, setAutoAdvance] = useState<boolean>(
    Boolean(
      initialBook ||
        initialPlanId ||
        initialCustomPlanId ||
        initialMode === 'book' ||
        initialMode === 'sequential'
    )
  );
  const [passageFlow, setPassageFlow] = useState<boolean>(
    Boolean(initialBook || initialMode === 'book' || initialMode === 'sequential')
  );
  const [inlineTyping, setInlineTyping] = useState<boolean>(true);
  const [strictMode, setStrictMode] = useState<boolean>(false);
  const [zenMode, setZenMode] = useState<boolean>(false);
  const [inputFocused, setInputFocused] = useState<boolean>(false);
  const [verseContext, setVerseContext] = useState<VerseContext>({ prev: null, next: null });
  const [lastCompletedVerse, setLastCompletedVerse] = useState<{
    reference: string;
    wpm: number;
    accuracy: number;
    seconds: string;
  } | null>(null);
  const [bookChapterProgress, setBookChapterProgress] = useState<BookChapterProgress | null>(null);
  const [completionRefreshNonce, setCompletionRefreshNonce] = useState<number>(0);
  const [sessionUnlocks, setSessionUnlocks] = useState<ChapterJustUnlocked[]>([]);
  const [dismissedUnlockKey, setDismissedUnlockKey] = useState<string | null>(null);
  const [resultUnlock, setResultUnlock] = useState<ChapterJustUnlocked | null>(null);
  const [companionDrawerTarget, setCompanionDrawerTarget] = useState<{
    book: string;
    chapter: number;
    workId?: string;
  } | null>(null);
  const [latestAchievements, setLatestAchievements] = useState<AchievementsData | null>(null);
  const [newlyUnlockedBadges, setNewlyUnlockedBadges] = useState<BadgeItem[]>([]);
  const [badgeModalOpen, setBadgeModalOpen] = useState<boolean>(false);
  const [badgeModalEverOpened, setBadgeModalEverOpened] = useState<boolean>(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bookSelectRef = useRef<HTMLSelectElement>(null);
  const mismatchIndicesRef = useRef<Set<number>>(new Set());
  const companionOpenRef = useRef<boolean>(false);
  companionOpenRef.current = companionDrawerTarget !== null;
  const badgeModalOpenRef = useRef<boolean>(false);
  badgeModalOpenRef.current = badgeModalOpen;
  const knownUnlockedBadgeIdsRef = useRef<Set<string>>(new Set());
  const achievementsBaselineReadyRef = useRef<boolean>(false);
  const navigate = useNavigate();
  const { user } = useAuthSession();
  const userId = user?._id;

  const fetchVerse = useCallback(
    async (
      modeOverride?: 'random' | 'book' | 'sequential',
      bookOverride?: string,
      afterVerseOrder?: number,
      chapterOverride?: string,
      verseNumOverride?: string
    ) => {
      const mode = modeOverride ?? verseSelectionMode;
      const bookToFetch = bookOverride ?? selectedBook;
      const chapterToFetch = chapterOverride !== undefined ? chapterOverride : selectedChapter;
      const verseNumToFetch = verseNumOverride !== undefined ? verseNumOverride : selectedVerseNum;

      try {
        setLoading(true);
        setError(null);
        setBookComplete(null);
        setTypedText('');
        mismatchIndicesRef.current = new Set();
        setStartTime(null);
        setEndTime(null);
        setCompleted(false);
        setResultUnlock(null);
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
            if (chapterToFetch && afterVerseOrder === undefined) {
              const chapterNum = Number(chapterToFetch);
              if (userId && !verseNumToFetch) {
                const nextResult = await VerseService.getNextVerse(bookToFetch, {
                  chapter: chapterNum,
                });
                if (nextResult.complete || !nextResult.verse) {
                  setError(`No verses found for ${bookToFetch} ${chapterNum}`);
                  setLoading(false);
                  return;
                }
                data = nextResult.verse;
                setSelectedVerseNum(String(data.verse));
                break;
              }
              const chapterVerses = await VerseService.getVersesByBookAndChapter(
                bookToFetch,
                chapterNum
              );
              if (!Array.isArray(chapterVerses) || chapterVerses.length === 0) {
                setError(`No verses found for ${bookToFetch} ${chapterNum}`);
                setLoading(false);
                return;
              }
              const sorted = [...chapterVerses].sort((a, b) => a.verse - b.verse);
              const targetVerseNum = verseNumToFetch ? Number(verseNumToFetch) : 1;
              data = sorted.find((v) => v.verse === targetVerseNum) ?? sorted[0];
              break;
            }
            if (chapterToFetch && afterVerseOrder !== undefined) {
              try {
                const nextSequential = await VerseService.getVerseByOrder(afterVerseOrder + 1);
                if (nextSequential && nextSequential.book.toLowerCase() === bookToFetch.toLowerCase()) {
                  data = nextSequential;
                  setSelectedChapter(String(nextSequential.chapter));
                  setSelectedVerseNum(String(nextSequential.verse));
                  break;
                }
                setVerse(null);
                setBookComplete(bookToFetch);
                setLoading(false);
                return;
              } catch {
                setVerse(null);
                setBookComplete(bookToFetch);
                setLoading(false);
                return;
              }
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
    [verseSelectionMode, selectedBook, selectedChapter, selectedVerseNum, userId]
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
              kind: 'curated',
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
        kind: 'curated',
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

  const fetchCustomPlanVerses = useCallback(async (customPlanId: string) => {
    if (!PlanService?.getCustomPlanDetail) {
      setError('Custom playlists are unavailable.');
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

      const detail = await PlanService.getCustomPlanDetail(customPlanId);
      if (!detail?.verses || detail.verses.length === 0) {
        setError(`Custom playlist "${detail?.title || customPlanId}" has no verses yet.`);
        setLoading(false);
        return;
      }
      const completedSet = new Set(detail.completedVerseIds || []);
      const firstUnfinishedIdx = detail.verses.findIndex((v) => !completedSet.has(v._id));
      const startIndex = firstUnfinishedIdx >= 0 ? firstUnfinishedIdx : 0;
      setActivePlan({
        id: detail._id,
        title: detail.title,
        kind: 'custom',
        verses: detail.verses,
        index: startIndex,
      });
      setVerse(detail.verses[startIndex]);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load custom playlist.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load saved Memory Deck keys & custom playlists when user is logged in
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    if (MemoryService?.getDeck) {
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
    }
    if (PlanService?.getCustomPlans) {
      PlanService.getCustomPlans()
        .then((items) => {
          if (!cancelled && Array.isArray(items)) {
            setCustomPlans(items);
          }
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Load chapter metadata whenever selectedBook changes
  useEffect(() => {
    if (!selectedBook || typeof VerseService.getBookChapters !== 'function') {
      setBookChapters([]);
      return;
    }
    let cancelled = false;
    VerseService.getBookChapters(selectedBook)
      .then((chapters) => {
        if (!cancelled && Array.isArray(chapters)) {
          setBookChapters(chapters);
        }
      })
      .catch(() => {
        if (!cancelled) setBookChapters([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedBook]);

  // Fetch immediate prev/next verse previews when Passage Flow is enabled
  useEffect(() => {
    if (
      !passageFlow ||
      !verse?.verseOrder ||
      typeof VerseService.getVerseContext !== 'function'
    ) {
      setVerseContext({ prev: null, next: null });
      return;
    }
    let cancelled = false;
    VerseService.getVerseContext(verse.verseOrder)
      .then((ctx) => {
        if (!cancelled && ctx) {
          setVerseContext(ctx);
        }
      })
      .catch(() => {
        if (!cancelled) setVerseContext({ prev: null, next: null });
      });
    return () => {
      cancelled = true;
    };
  }, [passageFlow, verse?.verseOrder]);

  // Sync Zen Mode with documentElement and strict Escape precedence (Drawer/Modal closes before Zen Mode)
  useEffect(() => {
    if (zenMode) {
      document.documentElement.dataset.zen = 'true';
    } else {
      delete document.documentElement.dataset.zen;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (companionDrawerTarget) {
        e.preventDefault();
        setCompanionDrawerTarget(null);
        return;
      }
      if (badgeModalOpen) {
        e.preventDefault();
        setBadgeModalOpen(false);
        return;
      }
      if (zenMode) {
        setZenMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      delete document.documentElement.dataset.zen;
    };
  }, [zenMode, companionDrawerTarget, badgeModalOpen]);

  // Capture initial achievement badge baseline when authenticated user enters Typing Studio
  useEffect(() => {
    knownUnlockedBadgeIdsRef.current = new Set();
    achievementsBaselineReadyRef.current = false;
    setNewlyUnlockedBadges([]);

    if (!userId || typeof StatsService?.getAchievements !== 'function') {
      return;
    }

    let cancelled = false;
    Promise.resolve(StatsService.getAchievements())
      .then((data) => {
        if (cancelled || !data || !Array.isArray(data.badges)) return;
        knownUnlockedBadgeIdsRef.current = new Set(
          data.badges.filter((b) => b.unlocked).map((b) => b.id)
        );
        achievementsBaselineReadyRef.current = true;
        setLatestAchievements(data);
      })
      .catch(() => {
        // Non-blocking: baseline achievements unavailable silently
      });

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

  // Load initial verse or respond to ?book= / ?chapter= / ?verse= / ?plan= / ?customPlan= / ?mode= query parameter changes
  useEffect(() => {
    if (initialCustomPlanId) {
      setAutoAdvance(true);
      fetchCustomPlanVerses(initialCustomPlanId);
    } else if (initialPlanId) {
      setAutoAdvance(true);
      fetchPlanVerses(initialPlanId);
    } else if (initialBook) {
      setActivePlan(null);
      setVerseSelectionMode('book');
      setSelectedBook(initialBook);
      setSelectedChapter(initialChapter);
      setSelectedVerseNum(initialVerseNum);
      setAutoAdvance(true);
      setPassageFlow(true);
      fetchVerse('book', initialBook, undefined, initialChapter, initialVerseNum);
    } else if (initialMode === 'sequential') {
      setActivePlan(null);
      setVerseSelectionMode('sequential');
      setSelectedBook('');
      setSelectedChapter('');
      setSelectedVerseNum('');
      setAutoAdvance(true);
      setPassageFlow(true);
      fetchVerse('sequential', '');
    } else if (initialMode === 'book') {
      setActivePlan(null);
      setVerseSelectionMode('book');
      setSelectedBook('');
      setSelectedChapter('');
      setSelectedVerseNum('');
      setAutoAdvance(true);
      setPassageFlow(true);
      fetchVerse('random', '');
    } else {
      setActivePlan(null);
      setVerseSelectionMode('random');
      setSelectedBook('');
      setSelectedChapter('');
      setSelectedVerseNum('');
      setAutoAdvance(false);
      fetchVerse('random', '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialBook, initialChapter, initialVerseNum, initialPlanId, initialCustomPlanId, initialMode]);

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
    if (verse && !companionOpenRef.current && !badgeModalOpenRef.current) {
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

    // Check for completion (in Strict Mode, require zero remaining typos)
    if (typedText.length >= verse.text.length && !completed) {
      if (strictMode && incorrect > 0) {
        return;
      }
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
  }, [typedText, verse, completed, startTime, user?._id, autoAdvance, strictMode, verseSelectionMode, selectedBook]);

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

      const response = await ProgressService.submitResult({
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

      const unlocked = response?.chapterJustUnlocked ?? null;
      if (unlocked) {
        setSessionUnlocks((prev) => {
          const key = `${unlocked.book}:${unlocked.chapter}`;
          if (prev.some((item) => `${item.book}:${item.chapter}` === key)) {
            return prev;
          }
          return [...prev, unlocked];
        });
        setDismissedUnlockKey(null);
        setResultUnlock(unlocked);
      }

      if (
        typeof StatsService?.getAchievements === 'function' &&
        achievementsBaselineReadyRef.current
      ) {
        try {
          const nextAchievements = await StatsService.getAchievements();
          if (nextAchievements && Array.isArray(nextAchievements.badges)) {
            setLatestAchievements(nextAchievements);
            const earned = nextAchievements.badges.filter(
              (b) => b.unlocked && !knownUnlockedBadgeIdsRef.current.has(b.id)
            );
            if (earned.length > 0) {
              earned.forEach((b) => knownUnlockedBadgeIdsRef.current.add(b.id));
              setNewlyUnlockedBadges((prev) => {
                const merged = [...prev];
                for (const item of earned) {
                  if (!merged.some((existing) => existing.id === item.id)) {
                    merged.push(item);
                  }
                }
                return merged;
              });
            }
          }
        } catch {
          // Non-blocking: ignore transient achievement poll errors
        }
      }
    } catch (err) {
      console.error('Failed to submit result:', err);
      // We'll continue even if result submission fails
    }
  };

  const handleOpenCompanionForUnlock = useCallback((unlock: ChapterJustUnlocked) => {
    setCompanionDrawerTarget({
      book: unlock.book,
      chapter: unlock.chapter,
      workId: unlock.workId || 'web-bible',
    });
  }, []);

  const handleCloseCompanionDrawer = useCallback(() => {
    setCompanionDrawerTarget(null);
  }, []);

  const handleOpenBadgeCase = useCallback(() => {
    setBadgeModalEverOpened(true);
    setBadgeModalOpen(true);
  }, []);

  const handleDismissUnlockedBadge = useCallback((badgeId: string) => {
    setNewlyUnlockedBadges((prev) => prev.filter((b) => b.id !== badgeId));
  }, []);

  const highlightedBadgeIds = useMemo(
    () => new Set(newlyUnlockedBadges.map((b) => b.id)),
    [newlyUnlockedBadges]
  );

  const latestSessionUnlock =
    sessionUnlocks.length > 0 ? sessionUnlocks[sessionUnlocks.length - 1] : null;
  const activeChapterUnlock =
    latestSessionUnlock &&
    dismissedUnlockKey !== `${latestSessionUnlock.book}:${latestSessionUnlock.chapter}`
      ? latestSessionUnlock
      : null;

  const handleDismissChapterUnlock = useCallback(() => {
    if (!latestSessionUnlock) return;
    setDismissedUnlockKey(`${latestSessionUnlock.book}:${latestSessionUnlock.chapter}`);
  }, [latestSessionUnlock]);

  const handleDrawerNavigateChapter = useCallback((bookName: string, chapterNum: number) => {
    setCompanionDrawerTarget((prev) => ({
      book: bookName,
      chapter: chapterNum,
      workId: prev?.workId || 'web-bible',
    }));
  }, []);

  const handleDrawerTypeChapter = useCallback(
    (bookName: string, chapterNum: number) => {
      setActivePlan(null);
      setVerseSelectionMode('book');
      setSelectedBook(bookName);
      setSelectedChapter(String(chapterNum));
      setSelectedVerseNum('');
      setAutoAdvance(true);
      setPassageFlow(true);
      fetchVerse('book', bookName, undefined, String(chapterNum), '');
    },
    [fetchVerse]
  );

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
    const isSequentialFlow = mode === 'book' || mode === 'sequential';
    setAutoAdvance(isSequentialFlow);
    setPassageFlow(isSequentialFlow);
  };

  const handleBookChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextBook = e.target.value;
    setSelectedBook(nextBook);
    setSelectedChapter('');
    setSelectedVerseNum('');
    if (nextBook) {
      setLastCompletedVerse(null);
      setActivePlan(null);
      fetchVerse('book', nextBook, undefined, '', '');
    }
  };

  const handleChapterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextChapter = e.target.value;
    setSelectedChapter(nextChapter);
    setSelectedVerseNum('');
    if (selectedBook) {
      setLastCompletedVerse(null);
      setActivePlan(null);
      fetchVerse('book', selectedBook, undefined, nextChapter, '');
    }
  };

  const handleVerseNumChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextVerseNum = e.target.value;
    setSelectedVerseNum(nextVerseNum);
    if (selectedBook && selectedChapter) {
      setLastCompletedVerse(null);
      setActivePlan(null);
      fetchVerse('book', selectedBook, undefined, selectedChapter, nextVerseNum);
    }
  };

  const handleAddVerseToCustomPlan = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const planId = e.target.value;
    e.target.value = '';
    if (!planId || !verse || !PlanService?.updateCustomPlan) return;
    const targetPlan = customPlans.find((p) => p._id === planId);
    try {
      const updated = await PlanService.updateCustomPlan(planId, {
        addVerse: { book: verse.book, chapter: verse.chapter, verse: verse.verse },
      });
      setCustomPlans((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
      setPlaylistFeedback(
        `Added ${verse.book} ${verse.chapter}:${verse.verse} to "${targetPlan?.title || updated.title}"`
      );
      setTimeout(() => setPlaylistFeedback(null), 3500);
    } catch (err) {
      console.error('Failed to add verse to playlist:', err);
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

  // Highlight correct/incorrect characters and live caret directly on the verse
  const renderVerse = () => {
    if (!verse) return null;

    return verse.text.split('').map((char, index) => {
      const classes: string[] = [];

      if (index < typedText.length) {
        classes.push(typedText[index] === char ? 'correct' : 'incorrect');
      } else if (index === typedText.length && !completed) {
        classes.push('current-char');
      }

      return (
        <span key={index} className={classes.join(' ')}>
          {char}
        </span>
      );
    });
  };

  if (!verse) {
    return <div className="error">No verse found</div>;
  }

  const activeChapterInfo = selectedChapter
    ? bookChapters.find((c) => c.chapter === Number(selectedChapter))
    : undefined;
  const currentIncorrectCount = countIncorrectCharacters(typedText, verse.text);
  const strictBlocked =
    strictMode && !completed && typedText.length >= verse.text.length && currentIncorrectCount > 0;
  const showPrevContext =
    passageFlow && verseContext.prev && verseContext.prev.book === verse.book;
  const showNextContext =
    passageFlow && verseContext.next && verseContext.next.book === verse.book;

  return (
    <div className={`typing-test-container ${zenMode ? 'is-zen-mode' : ''}`}>
      {zenMode && (
        <div className="zen-topbar" data-testid="zen-topbar">
          <span className="zen-badge">Zen Mode · Focus Canvas</span>
          <div className="zen-topbar-actions">
            <ZenBloomChip
              sessionUnlocks={sessionUnlocks}
              onOpenCompanion={handleOpenCompanionForUnlock}
            />
            <ZenBadgeChip
              badges={newlyUnlockedBadges}
              onOpenBadgeCase={handleOpenBadgeCase}
            />
            <button
              type="button"
              className="secondary-button zen-exit-button"
              onClick={() => setZenMode(false)}
              data-testid="exit-zen-button"
            >
              Exit Zen (Esc)
            </button>
          </div>
        </div>
      )}

      {!zenMode && (
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
                  title={!user ? 'Login to use sequential mode' : ''}
                >
                  Sequential
                </button>
              </div>
            </div>

            {verseSelectionMode === 'book' && (
              <div className="book-selector-group">
                <div className="book-selector">
                  <select
                    ref={bookSelectRef}
                    aria-label="Select a Bible book"
                    value={selectedBook}
                    onChange={handleBookChange}
                  >
                    <option value="">-- Select a Book --</option>
                    {CANONICAL_BOOKS.map((book) => (
                      <option key={book} value={book}>
                        {book}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedBook && bookChapters.length > 0 && (
                  <div className="chapter-selector">
                    <select
                      aria-label="Select a chapter"
                      value={selectedChapter}
                      onChange={handleChapterChange}
                    >
                      <option value="">Next untyped</option>
                      {bookChapters.map((c) => (
                        <option key={c.chapter} value={String(c.chapter)}>
                          Ch. {c.chapter} ({c.verseCount}v)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedBook && selectedChapter && activeChapterInfo && (
                  <div className="verse-num-selector">
                    <select
                      aria-label="Select a verse"
                      value={selectedVerseNum}
                      onChange={handleVerseNumChange}
                    >
                      <option value="">v. 1</option>
                      {Array.from({ length: activeChapterInfo.verseCount }, (_, idx) => idx + 1).map(
                        (vNum) => (
                          <option key={vNum} value={String(vNum)}>
                            v. {vNum}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                )}
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
            <label className="studio-switch-label">
              <input
                type="checkbox"
                {...({ switch: '' } as any)}
                className="studio-switch-input"
                checked={autoAdvance}
                onChange={(e) => setAutoAdvance(e.target.checked)}
              />
              <span>Auto-advance</span>
            </label>

            <label className="studio-switch-label">
              <input
                type="checkbox"
                {...({ switch: '' } as any)}
                className="studio-switch-input"
                checked={passageFlow}
                onChange={(e) => setPassageFlow(e.target.checked)}
              />
              <span>Passage Flow</span>
            </label>

            <label className="studio-switch-label">
              <input
                type="checkbox"
                {...({ switch: '' } as any)}
                className="studio-switch-input"
                checked={inlineTyping}
                onChange={(e) => setInlineTyping(e.target.checked)}
              />
              <span>Inline Caret</span>
            </label>

            <label className="studio-switch-label">
              <input
                type="checkbox"
                {...({ switch: '' } as any)}
                className="studio-switch-input"
                checked={strictMode}
                onChange={(e) => setStrictMode(e.target.checked)}
              />
              <span>Strict Mode</span>
            </label>

            <button
              type="button"
              className="selection-button zen-toggle-button"
              onClick={() => setZenMode(true)}
              data-testid="enter-zen-button"
            >
              Zen Mode
            </button>
          </div>
        </div>
      )}

      {activePlan && (
        <div
          className="active-plan-banner"
          role="status"
          data-testid="active-plan-banner"
        >
          <span>
            <strong>
              {activePlan.kind === 'custom' ? 'Custom Playlist' : 'Curated Plan'}:{' '}
              {activePlan.title}
            </strong>{' '}
            · Verse {activePlan.index + 1} of {activePlan.verses.length}
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

      {!zenMode && sessionUnlocks.length > 1 && (
        <SessionHarvestStrip
          sessionUnlocks={sessionUnlocks}
          onOpenCompanion={handleOpenCompanionForUnlock}
        />
      )}

      {playlistFeedback && (
        <div className="last-completed-banner" role="status" data-testid="playlist-feedback-banner">
          <span>{playlistFeedback}</span>
        </div>
      )}

      <>
        <div className="verse-reference">
          <div className="verse-reference-main">
            <h2>
              {verse.book} {verse.chapter}:{verse.verse}
            </h2>
            {loading && (
              <span className="inline-refresh-badge" role="status" aria-live="polite">
                Updating verse…
              </span>
            )}
          </div>
          {user && (
            <div className="verse-reference-actions">
              {customPlans.length > 0 && (
                <select
                  aria-label="Add verse to custom playlist"
                  className="playlist-quick-add-select"
                  defaultValue=""
                  onChange={handleAddVerseToCustomPlan}
                >
                  <option value="">＋ Add to Playlist…</option>
                  {customPlans.map((cp) => (
                    <option key={cp._id} value={cp._id}>
                      {cp.title}
                    </option>
                  ))}
                </select>
              )}
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
            </div>
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

        <div className="passage-flow-stage">
          {showPrevContext && verseContext.prev && (
            <p
              className="passage-context-line passage-context-prev"
              aria-hidden="true"
              data-testid="passage-context-prev"
            >
              <span className="passage-context-ref">
                {verseContext.prev.chapter}:{verseContext.prev.verse}
              </span>{' '}
              {verseContext.prev.text}
            </p>
          )}

          <div
            className={`typing-canvas ${inlineTyping ? 'is-inline-mode' : ''} ${
              inputFocused ? 'is-focused' : ''
            }`}
            onClick={() => {
              if (!completed) {
                inputRef.current?.focus();
              }
            }}
          >
            <div
              className={`verse-display ${loading ? 'is-refreshing' : ''} ${
                inlineTyping && inputFocused ? 'is-inline-focused' : ''
              }`}
              data-testid="verse-display"
            >
              {renderVerse()}
            </div>

            {!completed && inlineTyping && (
              <textarea
                ref={inputRef}
                className="typing-input typing-input-inline"
                value={typedText}
                onChange={handleInputChange}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder="Start typing the verse above..."
                aria-label="Type the active Bible verse"
                disabled={completed}
                autoFocus
              />
            )}
          </div>

          {!completed && inlineTyping && !inputFocused && typedText.length === 0 && (
            <p className="inline-typing-hint" aria-hidden="true">
              Click the verse above and start typing — your live caret moves directly across the scripture.
            </p>
          )}

          {showNextContext && verseContext.next && (
            <p
              className="passage-context-line passage-context-next"
              aria-hidden="true"
              data-testid="passage-context-next"
            >
              <span className="passage-context-ref">
                {verseContext.next.chapter}:{verseContext.next.verse}
              </span>{' '}
              {verseContext.next.text}
            </p>
          )}
        </div>

        {strictBlocked && (
          <div className="strict-mode-alert" role="status" data-testid="strict-mode-alert">
            Strict Mode: fix {currentIncorrectCount}{' '}
            {currentIncorrectCount === 1 ? 'highlighted typo' : 'highlighted typos'} to complete this
            verse.
          </div>
        )}

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

            {!autoAdvance && !zenMode && resultUnlock && (
              <ChapterBloomBanner
                unlock={resultUnlock}
                onOpenCompanion={handleOpenCompanionForUnlock}
              />
            )}

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
          !inlineTyping && (
            <textarea
              ref={inputRef}
              className="typing-input"
              value={typedText}
              onChange={handleInputChange}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder="Start typing the verse above..."
              aria-label="Type the active Bible verse"
              disabled={completed}
              autoFocus
            />
          )
        )}

        {!completed && (
          <button onClick={handleTryAnotherVerse} className="secondary-button mt-4">
            Get Another Verse
          </button>
        )}
      </>

      <BadgeUnlockToast
        badges={newlyUnlockedBadges}
        chapterUnlock={activeChapterUnlock}
        suppressed={zenMode || companionDrawerTarget !== null || badgeModalOpen}
        onDismissBadge={handleDismissUnlockedBadge}
        onOpenBadgeCase={handleOpenBadgeCase}
        onOpenCompanion={handleOpenCompanionForUnlock}
        onDismissChapterUnlock={handleDismissChapterUnlock}
      />

      {badgeModalEverOpened && (
        <Suspense fallback={null}>
          <LazyTrailBadgesModal
            isOpen={badgeModalOpen}
            achievements={latestAchievements}
            highlightedBadgeIds={highlightedBadgeIds}
            onClose={() => setBadgeModalOpen(false)}
          />
        </Suspense>
      )}

      {companionDrawerTarget && (
        <Suspense fallback={null}>
          <LazyCompanionDrawer
            isOpen={true}
            book={companionDrawerTarget.book}
            chapter={companionDrawerTarget.chapter}
            workId={companionDrawerTarget.workId || 'web-bible'}
            onClose={handleCloseCompanionDrawer}
            onNavigateChapter={handleDrawerNavigateChapter}
            onTypeChapter={handleDrawerTypeChapter}
          />
        </Suspense>
      )}
    </div>
  );
};

export default TypingTest;