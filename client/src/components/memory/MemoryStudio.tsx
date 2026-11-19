import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  BookChapterInfo,
  CuratedPlanSummary,
  CustomPlanSummary,
  MemoryItem,
  MemoryStage,
} from '../../types';
import { MemoryService, PlanService, ProgressService, VerseService } from '../../services/api';
import { useAuthSession } from '../../context/AuthContext';
import { CANONICAL_BOOKS } from '../../data/books';
import {
  CURATED_PLANS,
  CuratedPlanCategory,
  CuratedVerseRef,
} from '../../data/curatedCatalog';
import {
  MEMORY_STAGES,
  renderMaskedVerseCharacters,
} from '../../utils/memoryMask';
import {
  countIncorrectCharacters,
  calculateAccuracy,
  calculateWpm,
  calculateCps,
} from '../../utils/typingMetrics';

const PLAN_CATEGORIES: ReadonlyArray<'All' | CuratedPlanCategory> = [
  'All',
  'Mantra',
  'Anchor',
  'Wisdom',
  'Study Plan',
  'Gospels',
  'Epistles',
];

function openNativeDialog(dialog: HTMLDialogElement | null) {
  if (!dialog) return;
  if (typeof dialog.showModal === 'function') {
    if (!dialog.open) {
      dialog.showModal();
    }
  } else {
    dialog.setAttribute('open', '');
  }
}

function closeNativeDialog(dialog: HTMLDialogElement | null) {
  if (!dialog) return;
  if (typeof dialog.close === 'function') {
    if (dialog.open) {
      dialog.close();
    }
  } else {
    dialog.removeAttribute('open');
  }
}

const FALLBACK_PLANS: CuratedPlanSummary[] = CURATED_PLANS.map((plan) => ({
  id: plan.id,
  title: plan.title,
  subtitle: plan.subtitle,
  category: plan.category,
  description: plan.description,
  contextNote: plan.contextNote,
  totalVerses: plan.verses.length,
  completedVerses: 0,
  inMemoryDeckCount: 0,
  verseRefs: plan.verses,
}));

export const MemoryStudio: React.FC = () => {
  const { mode, user, loading: authLoading } = useAuthSession();
  const [deck, setDeck] = useState<MemoryItem[]>([]);
  const [plans, setPlans] = useState<CuratedPlanSummary[]>(FALLBACK_PLANS);
  const [customPlans, setCustomPlans] = useState<CustomPlanSummary[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<'All' | CuratedPlanCategory>('All');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [activeStage, setActiveStage] = useState<MemoryStage>(1);
  const [typedText, setTypedText] = useState<string>('');
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [practiceFeedback, setPracticeFeedback] = useState<{
    reference: string;
    wpm: number;
    accuracy: number;
    previousStage: MemoryStage;
    nextStage: MemoryStage;
    promoted: boolean;
  } | null>(null);
  const [addingPackId, setAddingPackId] = useState<string | null>(null);
  const [packStatusMessage, setPackStatusMessage] = useState<string | null>(null);

  // Custom Playlist modal state
  const [editingCustomPlan, setEditingCustomPlan] = useState<CustomPlanSummary | null>(null);
  const [playlistTitle, setPlaylistTitle] = useState<string>('');
  const [playlistDescription, setPlaylistDescription] = useState<string>('');
  const [playlistVerses, setPlaylistVerses] = useState<CuratedVerseRef[]>([]);
  const [pickerBook, setPickerBook] = useState<string>('Psalms');
  const [pickerChapters, setPickerChapters] = useState<BookChapterInfo[]>([]);
  const [pickerChapter, setPickerChapter] = useState<string>('23');
  const [pickerVerse, setPickerVerse] = useState<string>('1');
  const [playlistError, setPlaylistError] = useState<string | null>(null);
  const [savingPlaylist, setSavingPlaylist] = useState<boolean>(false);
  const [playlistStatusMessage, setPlaylistStatusMessage] = useState<string | null>(null);
  const [deletingPlaylist, setDeletingPlaylist] = useState<CustomPlanSummary | null>(null);
  const [isDeletingPlaylist, setIsDeletingPlaylist] = useState<boolean>(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const playlistDialogRef = useRef<HTMLDialogElement>(null);
  const deletePlaylistDialogRef = useRef<HTMLDialogElement>(null);

  const loadData = useCallback(async () => {
    if (!MemoryService?.getDeck) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const [deckData, plansData, customPlansData] = await Promise.all([
        MemoryService.getDeck(),
        PlanService?.getPlans
          ? PlanService.getPlans().catch(() => FALLBACK_PLANS)
          : Promise.resolve(FALLBACK_PLANS),
        PlanService?.getCustomPlans
          ? PlanService.getCustomPlans().catch(() => [])
          : Promise.resolve([]),
      ]);
      const normalizedDeck = Array.isArray(deckData) ? deckData : [];
      const normalizedPlans =
        Array.isArray(plansData) && plansData.length > 0 ? plansData : FALLBACK_PLANS;
      setDeck(normalizedDeck);
      setPlans(normalizedPlans);
      setCustomPlans(Array.isArray(customPlansData) ? customPlansData : []);
      if (normalizedDeck.length > 0) {
        setSelectedItemId((prev) => {
          const existing = prev
            ? normalizedDeck.find((item) => item._id === prev)
            : undefined;
          const target = existing ?? normalizedDeck[0];
          setActiveStage(target.stage);
          return target._id;
        });
      } else {
        setSelectedItemId(null);
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Unable to load Memory Deck. Please check your connection.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (mode !== 'entra' && !user) {
      setLoading(false);
      return;
    }
    if (!MemoryService?.getDeck) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const init = async () => {
      try {
        setLoading(true);
        setError(null);
        const [deckData, plansData, customPlansData] = await Promise.all([
          MemoryService.getDeck(),
          PlanService?.getPlans
            ? PlanService.getPlans().catch(() => FALLBACK_PLANS)
            : Promise.resolve(FALLBACK_PLANS),
          PlanService?.getCustomPlans
            ? PlanService.getCustomPlans().catch(() => [])
            : Promise.resolve([]),
        ]);
        if (cancelled) return;
        const normalizedDeck = Array.isArray(deckData) ? deckData : [];
        const normalizedPlans =
          Array.isArray(plansData) && plansData.length > 0 ? plansData : FALLBACK_PLANS;
        setDeck(normalizedDeck);
        setPlans(normalizedPlans);
        setCustomPlans(Array.isArray(customPlansData) ? customPlansData : []);
        if (normalizedDeck.length > 0) {
          setSelectedItemId(normalizedDeck[0]._id);
          setActiveStage(normalizedDeck[0].stage);
        } else {
          setSelectedItemId(null);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(
            err?.response?.data?.message ||
              err?.message ||
              'Unable to load Memory Deck. Please check your connection.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [authLoading, mode, user]);

  useEffect(() => {
    if (!pickerBook || !VerseService?.getBookChapters) {
      setPickerChapters([]);
      return;
    }
    let cancelled = false;
    VerseService.getBookChapters(pickerBook)
      .then((chapters) => {
        if (!cancelled && Array.isArray(chapters)) {
          setPickerChapters(chapters);
        }
      })
      .catch(() => {
        if (!cancelled) setPickerChapters([]);
      });
    return () => {
      cancelled = true;
    };
  }, [pickerBook]);

  const selectedItem = deck.find((item) => item._id === selectedItemId) ?? deck[0] ?? null;

  const handleSelectVerse = (item: MemoryItem) => {
    setSelectedItemId(item._id);
    setActiveStage(item.stage);
    setTypedText('');
    setStartTime(null);
    setPracticeFeedback(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleStageSelect = async (stage: MemoryStage) => {
    setActiveStage(stage);
    setTypedText('');
    setStartTime(null);
    setPracticeFeedback(null);

    if (selectedItem) {
      try {
        const updated = await MemoryService.updateStage(selectedItem._id, stage);
        setDeck((prev) =>
          prev.map((item) => (item._id === updated._id ? updated : item))
        );
      } catch (err) {
        console.error('Failed to update stage:', err);
      }
    }
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleRemoveVerse = async (id: string) => {
    try {
      await MemoryService.removeVerse(id);
      setDeck((prev) => {
        const remaining = prev.filter((item) => item._id !== id);
        if (selectedItemId === id) {
          const next = remaining[0] ?? null;
          setSelectedItemId(next ? next._id : null);
          if (next) {
            setActiveStage(next.stage);
          }
          setTypedText('');
          setStartTime(null);
          setPracticeFeedback(null);
        }
        return remaining;
      });
    } catch (err) {
      console.error('Failed to remove verse from Memory Deck:', err);
    }
  };

  const handleAddPack = async (packId: string, packTitle: string) => {
    try {
      setAddingPackId(packId);
      setPackStatusMessage(null);
      const response = await MemoryService.addPack(packId);
      setDeck(response.data);
      if (response.data.length > 0 && !selectedItemId) {
        setSelectedItemId(response.data[0]._id);
        setActiveStage(response.data[0].stage);
      }
      setPackStatusMessage(
        `Added "${packTitle}" to your Memory Deck (${response.data.length} total verses in deck).`
      );
      const refreshedPlans = await PlanService.getPlans().catch(() => plans);
      setPlans(refreshedPlans);
    } catch (err: any) {
      setPackStatusMessage(
        err?.response?.data?.message || err?.message || 'Failed to add pack to Memory Deck.'
      );
    } finally {
      setAddingPackId(null);
    }
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextValue = e.target.value;
    if (!selectedItem || !selectedItem.verse) return;

    const now = new Date();
    const effectiveStart = startTime ?? (nextValue.length > 0 ? now : null);
    if (!startTime && effectiveStart) {
      setStartTime(effectiveStart);
    }
    setTypedText(nextValue);

    const verseText = selectedItem.verse.text;
    if (nextValue.length >= verseText.length) {
      const durationMs = effectiveStart
        ? Math.max(0, now.getTime() - effectiveStart.getTime())
        : 0;
      const incorrect = countIncorrectCharacters(nextValue, verseText);
      const finalAccuracy = calculateAccuracy(nextValue.length, incorrect);
      const finalWpm = calculateWpm(selectedItem.verse.words, durationMs);
      const finalCps = calculateCps(selectedItem.verse.characters, durationMs);
      const previousStage = activeStage;
      const promoted = finalAccuracy >= 95 && previousStage < 5;
      const computedNextStage: MemoryStage = promoted
        ? ((previousStage + 1) as MemoryStage)
        : previousStage;

      setTypedText('');
      setStartTime(null);
      setActiveStage(computedNextStage);
      setPracticeFeedback({
        reference: `${selectedItem.book} ${selectedItem.chapter}:${selectedItem.verseNum}`,
        wpm: finalWpm,
        accuracy: finalAccuracy,
        previousStage,
        nextStage: computedNextStage,
        promoted,
      });

      try {
        const updatedItem = await MemoryService.recordPractice(selectedItem._id, {
          wpm: finalWpm,
          accuracy: finalAccuracy,
          stage: previousStage,
          advance: finalAccuracy >= 95,
        });
        setDeck((prev) =>
          prev.map((item) => (item._id === updatedItem._id ? updatedItem : item))
        );
        setActiveStage(updatedItem.stage);
      } catch (err) {
        console.error('Failed to record memory practice:', err);
      }

      if (user && ProgressService?.submitResult) {
        ProgressService.submitResult({
          user: user._id,
          verse: selectedItem.verse._id,
          verseOrder: selectedItem.verseOrder,
          startTime: (effectiveStart || now).toISOString(),
          endTime: now.toISOString(),
          duration: durationMs,
          wpm: finalWpm,
          cps: finalCps,
          accuracy: finalAccuracy,
          incorrectCharacters: incorrect,
          totalCharacters: selectedItem.verse.characters,
        }).catch(() => {});
      }
    }
  };

  const handleOpenCreatePlaylist = () => {
    setEditingCustomPlan(null);
    setPlaylistTitle('');
    setPlaylistDescription('');
    setPlaylistVerses([]);
    setPlaylistError(null);
    openNativeDialog(playlistDialogRef.current);
  };

  const handleOpenEditPlaylist = (plan: CustomPlanSummary) => {
    setEditingCustomPlan(plan);
    setPlaylistTitle(plan.title);
    setPlaylistDescription(plan.description || '');
    setPlaylistVerses([...plan.verseRefs]);
    setPlaylistError(null);
    openNativeDialog(playlistDialogRef.current);
  };

  const handleClosePlaylistModal = () => {
    closeNativeDialog(playlistDialogRef.current);
    setPlaylistError(null);
  };

  const handleAddPickerVerse = () => {
    const ch = Number(pickerChapter);
    const vs = Number(pickerVerse);
    if (!pickerBook || !Number.isInteger(ch) || ch < 1 || !Number.isInteger(vs) || vs < 1) {
      setPlaylistError('Choose a valid book, chapter, and verse number.');
      return;
    }
    const exists = playlistVerses.some(
      (v) => v.book === pickerBook && v.chapter === ch && v.verse === vs
    );
    if (!exists) {
      setPlaylistVerses((prev) => [...prev, { book: pickerBook, chapter: ch, verse: vs }]);
    }
    setPlaylistError(null);
  };

  const handleAddMemoryItemToPlaylist = (item: MemoryItem) => {
    const exists = playlistVerses.some(
      (v) => v.book === item.book && v.chapter === item.chapter && v.verse === item.verseNum
    );
    if (!exists) {
      setPlaylistVerses((prev) => [
        ...prev,
        { book: item.book, chapter: item.chapter, verse: item.verseNum },
      ]);
    }
  };

  const handleRemovePlaylistVerse = (idx: number) => {
    setPlaylistVerses((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleMovePlaylistVerse = (idx: number, direction: -1 | 1) => {
    const target = idx + direction;
    if (target < 0 || target >= playlistVerses.length) return;
    setPlaylistVerses((prev) => {
      const next = [...prev];
      const [moved] = next.splice(idx, 1);
      next.splice(target, 0, moved);
      return next;
    });
  };

  const handleSavePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = playlistTitle.trim();
    if (!trimmedTitle) {
      setPlaylistError('Please enter a playlist title.');
      return;
    }
    if (!PlanService?.createCustomPlan || !PlanService?.updateCustomPlan) {
      setPlaylistError('Custom playlist service is unavailable.');
      return;
    }

    try {
      setSavingPlaylist(true);
      setPlaylistError(null);
      if (editingCustomPlan) {
        const updated = await PlanService.updateCustomPlan(editingCustomPlan._id, {
          title: trimmedTitle,
          description: playlistDescription.trim(),
          verses: playlistVerses,
        });
        setCustomPlans((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
        setPlaylistStatusMessage(`Updated custom playlist "${updated.title}".`);
      } else {
        const created = await PlanService.createCustomPlan({
          title: trimmedTitle,
          description: playlistDescription.trim(),
          verses: playlistVerses,
        });
        setCustomPlans((prev) => [created, ...prev]);
        setPlaylistStatusMessage(`Created custom playlist "${created.title}".`);
      }
      closeNativeDialog(playlistDialogRef.current);
    } catch (err: any) {
      setPlaylistError(
        err?.response?.data?.message || err?.message || 'Failed to save custom playlist.'
      );
    } finally {
      setSavingPlaylist(false);
    }
  };

  const handleRequestDeletePlaylist = (plan: CustomPlanSummary) => {
    setDeletingPlaylist(plan);
    openNativeDialog(deletePlaylistDialogRef.current);
  };

  const handleConfirmDeletePlaylist = async () => {
    if (!deletingPlaylist || !PlanService?.deleteCustomPlan) return;
    try {
      setIsDeletingPlaylist(true);
      await PlanService.deleteCustomPlan(deletingPlaylist._id);
      setCustomPlans((prev) => prev.filter((p) => p._id !== deletingPlaylist._id));
      setPlaylistStatusMessage(`Deleted custom playlist "${deletingPlaylist.title}".`);
      closeNativeDialog(deletePlaylistDialogRef.current);
      setDeletingPlaylist(null);
    } catch (err: any) {
      setPlaylistStatusMessage(
        err?.response?.data?.message || err?.message || 'Failed to delete playlist.'
      );
    } finally {
      setIsDeletingPlaylist(false);
    }
  };

  const handleAddCustomPlanToMemory = async (plan: CustomPlanSummary) => {
    if (!PlanService?.addCustomPlanToMemory) return;
    try {
      setAddingPackId(plan._id);
      const res = await PlanService.addCustomPlanToMemory(plan._id);
      setDeck(res.data);
      if (res.data.length > 0 && !selectedItemId) {
        setSelectedItemId(res.data[0]._id);
        setActiveStage(res.data[0].stage);
      }
      setPlaylistStatusMessage(
        `Added ${res.addedCount} new ${
          res.addedCount === 1 ? 'verse' : 'verses'
        } from "${plan.title}" to your Memory Deck.`
      );
      if (PlanService.getCustomPlans) {
        const refreshed = await PlanService.getCustomPlans().catch(() => customPlans);
        setCustomPlans(refreshed);
      }
    } catch (err: any) {
      setPlaylistStatusMessage(
        err?.response?.data?.message || err?.message || 'Failed to add playlist to Memory Deck.'
      );
    } finally {
      setAddingPackId(null);
    }
  };

  const filteredPlans =
    selectedCategory === 'All'
      ? plans
      : plans.filter((p) => p.category === selectedCategory);

  const selectedPickerChapterInfo = pickerChapters.find(
    (c) => c.chapter === Number(pickerChapter)
  );

  const currentStageMeta =
    MEMORY_STAGES.find((s) => s.stage === activeStage) ?? MEMORY_STAGES[0];

  const liveIncorrect =
    selectedItem?.verse && typedText.length > 0
      ? countIncorrectCharacters(typedText, selectedItem.verse.text)
      : 0;
  const liveAccuracy =
    typedText.length > 0 ? calculateAccuracy(typedText.length, liveIncorrect) : 100;

  return (
    <div className="memory-studio-container" data-testid="memory-studio">
      <header className="dashboard-header">
        <div>
          <span className="editorial-kicker">PROGRESSIVE RECALL &amp; CURATED SCRIPTURE</span>
          <h2>Memory Deck &amp; Mantra Studio</h2>
          <p className="dashboard-subtitle">
            Internalize noteworthy passages and Psalms mantras across five progressive masking
            stages.
          </p>
        </div>
      </header>

      {error && (
        <div className="error-container" role="alert">
          <p className="error-message">{error}</p>
          <button type="button" onClick={loadData} className="primary-button">
            Retry
          </button>
        </div>
      )}

      {/* Section 1: 5-Stage Progressive Memory Trainer */}
      <section className="dashboard-section" aria-labelledby="memory-trainer-heading">
        <div className="dashboard-section-header">
          <div>
            <h3 id="memory-trainer-heading">5-Stage Progressive Mantra Trainer</h3>
            <p className="dashboard-section-subtitle">
              Score 95% or higher accuracy on any stage to automatically advance to the next recall
              stage.
            </p>
          </div>
          <span className="memory-count-pill" data-testid="memory-deck-count">
            {deck.length} {deck.length === 1 ? 'Verse' : 'Verses'} in Deck
          </span>
        </div>

        {loading && deck.length === 0 ? (
          <div className="dashboard-inline-loading">Loading Memory Deck...</div>
        ) : deck.length === 0 ? (
          <div className="dashboard-empty-state" data-testid="memory-empty-state">
            <p>
              Your Memory Deck is currently empty. Save any verse while typing with{' '}
              <strong>★ Save to Memory Deck</strong>, or load one of the curated Mantra &amp; Study
              packs below.
            </p>
            <div className="memory-empty-actions">
              <button
                type="button"
                className="primary-button"
                onClick={() =>
                  handleAddPack('psalms-mantras', 'Psalms for Daily Mantras & Focus')
                }
                disabled={addingPackId === 'psalms-mantras'}
              >
                Load Psalms Mantras Pack
              </button>
              <Link to="/typing" className="secondary-button">
                Go to Typing Console
              </Link>
            </div>
          </div>
        ) : (
          <div className="memory-workbench">
            {/* Saved Verses List */}
            <aside className="memory-deck-sidebar" aria-label="Saved Memory Deck Verses">
              <h4 className="memory-sidebar-title">Saved Passages</h4>
              <ul className="memory-deck-list" data-testid="memory-deck-list">
                {deck.map((item) => {
                  const isSelected = selectedItem?._id === item._id;
                  const reference = `${item.book} ${item.chapter}:${item.verseNum}`;
                  return (
                    <li
                      key={item._id}
                      className={`memory-deck-item ${isSelected ? 'is-selected' : ''}`}
                    >
                      <button
                        type="button"
                        className="memory-deck-select-btn"
                        onClick={() => handleSelectVerse(item)}
                        data-testid={`select-memory-item-${item._id}`}
                      >
                        <span className="memory-item-ref">{reference}</span>
                        <span className="memory-item-stage-badge">Stage {item.stage}/5</span>
                      </button>
                      <button
                        type="button"
                        className="memory-deck-remove-btn"
                        aria-label={`Remove ${reference} from Memory Deck`}
                        title="Remove from Memory Deck"
                        onClick={() => handleRemoveVerse(item._id)}
                      >
                        ×
                      </button>
                    </li>
                  );
                })}
              </ul>
            </aside>

            {/* Active 5-Stage Trainer Console */}
            {selectedItem && selectedItem.verse && (
              <div className="memory-trainer-console">
                <div className="memory-stage-tabs" role="tablist" aria-label="Memory Recall Stages">
                  {MEMORY_STAGES.map((s) => (
                    <button
                      key={s.stage}
                      type="button"
                      role="tab"
                      aria-selected={activeStage === s.stage}
                      className={`selection-button memory-stage-tab ${
                        activeStage === s.stage ? 'active' : ''
                      }`}
                      onClick={() => handleStageSelect(s.stage)}
                      data-testid={`stage-tab-${s.stage}`}
                    >
                      Stage {s.stage}: {s.shortTitle}
                    </button>
                  ))}
                </div>

                <p className="memory-stage-description" data-testid="stage-description">
                  <strong>{currentStageMeta.title}</strong> — {currentStageMeta.description}
                </p>

                {practiceFeedback && (
                  <div
                    className="last-completed-banner"
                    role="status"
                    data-testid="memory-practice-feedback"
                  >
                    <span>
                      <strong>Completed {practiceFeedback.reference}</strong> (Stage{' '}
                      {practiceFeedback.previousStage}) — {practiceFeedback.wpm} WPM ·{' '}
                      {practiceFeedback.accuracy}% Accuracy.{' '}
                      {practiceFeedback.promoted
                        ? `Promoted to Stage ${practiceFeedback.nextStage}!`
                        : practiceFeedback.previousStage === 5 && practiceFeedback.accuracy >= 95
                        ? 'Stage 5 Full Recall mastered!'
                        : 'Score 95%+ accuracy to advance to the next stage.'}
                    </span>
                  </div>
                )}

                <div className="verse-reference">
                  <h2>
                    {selectedItem.book} {selectedItem.chapter}:{selectedItem.verseNum}
                  </h2>
                  <span className="memory-completions-meta">
                    {selectedItem.stageCompletions || 0} reps completed
                  </span>
                </div>

                <div
                  className="verse-display memory-masked-display"
                  data-testid="memory-verse-display"
                >
                  {renderMaskedVerseCharacters(
                    selectedItem.verse.text,
                    typedText,
                    activeStage
                  ).map((desc) => {
                    const classes = [
                      desc.status !== 'untyped' ? desc.status : '',
                      desc.isMasked ? 'masked-char' : '',
                    ]
                      .filter(Boolean)
                      .join(' ');
                    return (
                      <span key={desc.index} className={classes}>
                        {desc.displayChar}
                      </span>
                    );
                  })}
                </div>

                <div className="typing-stats">
                  <div className="stat">
                    <span className="stat-label">Active Stage:</span> {activeStage} / 5
                  </div>
                  <div className="stat">
                    <span className="stat-label">Accuracy:</span> {liveAccuracy}%
                  </div>
                  <div className="stat">
                    <span className="stat-label">Progress:</span>{' '}
                    {Math.round((typedText.length / selectedItem.verse.text.length) * 100)}%
                  </div>
                </div>

                <textarea
                  ref={inputRef}
                  className="typing-input"
                  value={typedText}
                  onChange={handleInputChange}
                  placeholder={`Type ${selectedItem.book} ${selectedItem.chapter}:${selectedItem.verseNum} (${currentStageMeta.shortTitle})...`}
                  aria-label="Memory Trainer Typing Input"
                  data-testid="memory-typing-input"
                />
              </div>
            )}
          </div>
        )}
      </section>

      {/* Section 2: My Custom Mantra & Study Playlists */}
      <section className="dashboard-section" aria-labelledby="custom-playlists-heading">
        <div className="dashboard-section-header">
          <div>
            <h3 id="custom-playlists-heading">My Custom Playlists</h3>
            <p className="dashboard-section-subtitle">
              Build your own named mantra playlists from any of the 73 books or your Memory Deck.
            </p>
          </div>
          <button
            type="button"
            className="primary-button"
            onClick={handleOpenCreatePlaylist}
            data-testid="new-playlist-button"
          >
            ＋ New Playlist
          </button>
        </div>

        {playlistStatusMessage && (
          <div
            className="last-completed-banner"
            role="status"
            data-testid="playlist-status-message"
          >
            <span>{playlistStatusMessage}</span>
          </div>
        )}

        {customPlans.length === 0 ? (
          <div className="dashboard-empty-state" data-testid="custom-playlists-empty">
            <p>
              No custom playlists yet. Create a personal mantra or study list (like{' '}
              <strong>Morning Psalms</strong> or <strong>Anchor Verses</strong>) and practice it in
              sequence.
            </p>
          </div>
        ) : (
          <div className="curated-plans-grid" data-testid="custom-playlists-grid">
            {customPlans.map((cp) => (
              <article
                key={cp._id}
                className="curated-plan-card custom-playlist-card"
                data-testid={`custom-plan-${cp._id}`}
              >
                <div className="curated-plan-header">
                  <span className="curated-plan-category">Custom Playlist</span>
                  <span className="curated-plan-count">
                    {cp.completedVerses}/{cp.totalVerses} typed · {cp.inMemoryDeckCount} in deck
                  </span>
                </div>
                <h4>{cp.title}</h4>
                {cp.description && <p className="curated-plan-description">{cp.description}</p>}
                {cp.verseRefs.length > 0 && (
                  <div className="playlist-ref-chips">
                    {cp.verseRefs.slice(0, 6).map((ref) => (
                      <span
                        key={`${ref.book}:${ref.chapter}:${ref.verse}`}
                        className="playlist-ref-chip"
                      >
                        {ref.book} {ref.chapter}:{ref.verse}
                      </span>
                    ))}
                    {cp.verseRefs.length > 6 && (
                      <span className="playlist-ref-chip">+{cp.verseRefs.length - 6} more</span>
                    )}
                  </div>
                )}
                <div className="curated-plan-actions">
                  {cp.totalVerses > 0 && (
                    <Link
                      to={`/typing?customPlan=${encodeURIComponent(cp._id)}`}
                      className="primary-button"
                      data-testid={`practice-custom-plan-${cp._id}`}
                    >
                      Practice Playlist
                    </Link>
                  )}
                  {cp.totalVerses > 0 && (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => handleAddCustomPlanToMemory(cp)}
                      disabled={addingPackId === cp._id}
                    >
                      {addingPackId === cp._id ? 'Adding...' : 'Add to Memory Deck'}
                    </button>
                  )}
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => handleOpenEditPlaylist(cp)}
                    data-testid={`edit-custom-plan-${cp._id}`}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="secondary-button danger-outline-button"
                    onClick={() => handleRequestDeletePlaylist(cp)}
                    data-testid={`delete-custom-plan-${cp._id}`}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Section 3: Curated Mantras & Study Plans Knowledgebase */}
      <section className="dashboard-section" aria-labelledby="curated-plans-heading">
        <div className="dashboard-section-header">
          <div>
            <h3 id="curated-plans-heading">Curated Mantras &amp; Study Plans Knowledgebase</h3>
            <p className="dashboard-section-subtitle">
              Hand-picked collections of noteworthy Psalms, Proverbs, Gospels, Epistles, and anchor
              passages from the World English Bible.
            </p>
          </div>
        </div>

        <div
          className="plan-category-filters"
          role="group"
          aria-label="Filter curated study plans by category"
          data-testid="plan-category-filters"
        >
          {PLAN_CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              className={`selection-button plan-filter-chip ${
                selectedCategory === category ? 'active' : ''
              }`}
              aria-pressed={selectedCategory === category}
              onClick={() => setSelectedCategory(category)}
              data-testid={`filter-category-${category.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {category}
            </button>
          ))}
        </div>

        {packStatusMessage && (
          <div
            className="last-completed-banner"
            role="status"
            data-testid="pack-status-message"
          >
            <span>{packStatusMessage}</span>
          </div>
        )}

        <div className="curated-plans-grid" data-testid="curated-plans-grid">
          {filteredPlans.map((plan) => (
            <article
              key={plan.id}
              className="curated-plan-card"
              data-testid={`curated-plan-${plan.id}`}
            >
              <div className="curated-plan-header">
                <span className="curated-plan-category">{plan.category}</span>
                <span className="curated-plan-count">
                  {plan.completedVerses}/{plan.totalVerses} typed · {plan.inMemoryDeckCount} in deck
                </span>
              </div>
              <h4>{plan.title}</h4>
              <p className="curated-plan-subtitle">{plan.subtitle}</p>
              <p className="curated-plan-description">{plan.description}</p>
              <blockquote className="curated-plan-context">{plan.contextNote}</blockquote>
              <div className="curated-plan-actions">
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => handleAddPack(plan.id, plan.title)}
                  disabled={addingPackId === plan.id}
                  data-testid={`add-pack-${plan.id}`}
                >
                  {addingPackId === plan.id ? 'Adding Pack...' : 'Add Pack to Memory Deck'}
                </button>
                <Link
                  to={`/typing?plan=${encodeURIComponent(plan.id)}`}
                  className="secondary-button"
                  data-testid={`practice-plan-${plan.id}`}
                >
                  Practice Plan in Typing Console
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Native <dialog>: Create / Edit Custom Playlist */}
      <dialog
        ref={playlistDialogRef}
        className="editorial-dialog playlist-editor-dialog"
        aria-labelledby="playlist-dialog-title"
        onClose={(e) => {
          e.currentTarget.returnValue = '';
        }}
      >
        <div className="editorial-dialog-header">
          <h3 id="playlist-dialog-title">
            {editingCustomPlan ? 'Edit Custom Playlist' : 'Create Custom Playlist'}
          </h3>
          <button
            type="button"
            className="dialog-close-button"
            aria-label="Close playlist editor"
            onClick={handleClosePlaylistModal}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSavePlaylist} className="editorial-dialog-form">
          {playlistError && (
            <p className="error-message" role="alert">
              {playlistError}
            </p>
          )}

          <div className="form-group">
            <label htmlFor="playlist-title-input">Playlist Title</label>
            <input
              id="playlist-title-input"
              type="text"
              value={playlistTitle}
              onChange={(e) => setPlaylistTitle(e.target.value)}
              placeholder="e.g., Morning Psalms Mantras"
              maxLength={100}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="playlist-desc-input">Description (optional)</label>
            <input
              id="playlist-desc-input"
              type="text"
              value={playlistDescription}
              onChange={(e) => setPlaylistDescription(e.target.value)}
              placeholder="Short note on when or why you practice these verses"
              maxLength={300}
            />
          </div>

          <fieldset className="playlist-verse-picker">
            <legend>Add Verses to Playlist</legend>
            <div className="playlist-picker-row">
              <select
                aria-label="Playlist verse book"
                value={pickerBook}
                onChange={(e) => {
                  setPickerBook(e.target.value);
                  setPickerChapter('1');
                  setPickerVerse('1');
                }}
              >
                {CANONICAL_BOOKS.map((book) => (
                  <option key={book} value={book}>
                    {book}
                  </option>
                ))}
              </select>

              {pickerChapters.length > 0 ? (
                <select
                  aria-label="Playlist verse chapter"
                  value={pickerChapter}
                  onChange={(e) => {
                    setPickerChapter(e.target.value);
                    setPickerVerse('1');
                  }}
                >
                  {pickerChapters.map((c) => (
                    <option key={c.chapter} value={String(c.chapter)}>
                      Ch. {c.chapter}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="number"
                  min={1}
                  aria-label="Playlist verse chapter"
                  value={pickerChapter}
                  onChange={(e) => setPickerChapter(e.target.value)}
                  placeholder="Ch."
                />
              )}

              {selectedPickerChapterInfo ? (
                <select
                  aria-label="Playlist verse number"
                  value={pickerVerse}
                  onChange={(e) => setPickerVerse(e.target.value)}
                >
                  {Array.from(
                    { length: selectedPickerChapterInfo.verseCount },
                    (_, i) => i + 1
                  ).map((vNum) => (
                    <option key={vNum} value={String(vNum)}>
                      v. {vNum}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="number"
                  min={1}
                  aria-label="Playlist verse number"
                  value={pickerVerse}
                  onChange={(e) => setPickerVerse(e.target.value)}
                  placeholder="Verse"
                />
              )}

              <button
                type="button"
                className="secondary-button"
                onClick={handleAddPickerVerse}
                data-testid="add-verse-to-playlist-btn"
              >
                Add Verse
              </button>
            </div>

            {deck.length > 0 && (
              <div className="playlist-from-deck">
                <span className="playlist-from-deck-label">Quick add from Memory Deck:</span>
                <div className="playlist-ref-chips">
                  {deck.slice(0, 8).map((item) => (
                    <button
                      key={item._id}
                      type="button"
                      className="playlist-ref-chip playlist-ref-chip-btn"
                      onClick={() => handleAddMemoryItemToPlaylist(item)}
                    >
                      ＋ {item.book} {item.chapter}:{item.verseNum}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </fieldset>

          <div className="playlist-draft-list" data-testid="playlist-draft-verses">
            <span className="playlist-from-deck-label">
              Selected Verses ({playlistVerses.length})
            </span>
            {playlistVerses.length === 0 ? (
              <p className="playlist-draft-empty">No verses added yet.</p>
            ) : (
              <ul className="playlist-verse-items">
                {playlistVerses.map((ref, idx) => (
                  <li
                    key={`${ref.book}:${ref.chapter}:${ref.verse}`}
                    className="playlist-verse-item"
                  >
                    <span>
                      {idx + 1}. {ref.book} {ref.chapter}:{ref.verse}
                    </span>
                    <div className="playlist-verse-item-actions">
                      <button
                        type="button"
                        className="table-action-btn"
                        aria-label={`Move ${ref.book} ${ref.chapter}:${ref.verse} up`}
                        disabled={idx === 0}
                        onClick={() => handleMovePlaylistVerse(idx, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="table-action-btn"
                        aria-label={`Move ${ref.book} ${ref.chapter}:${ref.verse} down`}
                        disabled={idx === playlistVerses.length - 1}
                        onClick={() => handleMovePlaylistVerse(idx, 1)}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="table-action-btn table-action-delete"
                        aria-label={`Remove ${ref.book} ${ref.chapter}:${ref.verse}`}
                        onClick={() => handleRemovePlaylistVerse(idx)}
                      >
                        ×
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="editorial-dialog-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={handleClosePlaylistModal}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary-button"
              disabled={savingPlaylist}
              data-testid="save-playlist-submit"
            >
              {savingPlaylist
                ? 'Saving...'
                : editingCustomPlan
                ? 'Save Changes'
                : 'Create Playlist'}
            </button>
          </div>
        </form>
      </dialog>

      {/* Native <dialog>: Delete Custom Playlist Confirmation */}
      <dialog
        ref={deletePlaylistDialogRef}
        className="editorial-dialog"
        aria-labelledby="delete-playlist-dialog-title"
        onClose={(e) => {
          e.currentTarget.returnValue = '';
        }}
      >
        <div className="editorial-dialog-header">
          <h3 id="delete-playlist-dialog-title">Delete Custom Playlist?</h3>
          <button
            type="button"
            className="dialog-close-button"
            aria-label="Close delete confirmation"
            onClick={() => closeNativeDialog(deletePlaylistDialogRef.current)}
          >
            ×
          </button>
        </div>
        <p className="editorial-dialog-body">
          Delete <strong>{deletingPlaylist?.title}</strong>? Your typing history and Memory Deck
          items will stay intact.
        </p>
        <div className="editorial-dialog-actions">
          <button
            type="button"
            className="secondary-button"
            autoFocus
            onClick={() => closeNativeDialog(deletePlaylistDialogRef.current)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="primary-button danger-solid-button"
            disabled={isDeletingPlaylist}
            onClick={handleConfirmDeletePlaylist}
            data-testid="confirm-delete-playlist-btn"
          >
            {isDeletingPlaylist ? 'Deleting...' : 'Confirm Delete'}
          </button>
        </div>
      </dialog>
    </div>
  );
};

export default MemoryStudio;
