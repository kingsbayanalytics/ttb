import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { CuratedPlanSummary, MemoryItem, MemoryStage } from '../../types';
import { MemoryService, PlanService, ProgressService } from '../../services/api';
import { useAuthSession } from '../../context/AuthContext';
import { CURATED_PLANS } from '../../data/curatedCatalog';
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

  const inputRef = useRef<HTMLTextAreaElement>(null);

  const loadData = useCallback(async () => {
    if (!MemoryService?.getDeck) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const [deckData, plansData] = await Promise.all([
        MemoryService.getDeck(),
        PlanService?.getPlans
          ? PlanService.getPlans().catch(() => FALLBACK_PLANS)
          : Promise.resolve(FALLBACK_PLANS),
      ]);
      const normalizedDeck = Array.isArray(deckData) ? deckData : [];
      const normalizedPlans =
        Array.isArray(plansData) && plansData.length > 0 ? plansData : FALLBACK_PLANS;
      setDeck(normalizedDeck);
      setPlans(normalizedPlans);
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
        const [deckData, plansData] = await Promise.all([
          MemoryService.getDeck(),
          PlanService?.getPlans
            ? PlanService.getPlans().catch(() => FALLBACK_PLANS)
            : Promise.resolve(FALLBACK_PLANS),
        ]);
        if (cancelled) return;
        const normalizedDeck = Array.isArray(deckData) ? deckData : [];
        const normalizedPlans =
          Array.isArray(plansData) && plansData.length > 0 ? plansData : FALLBACK_PLANS;
        setDeck(normalizedDeck);
        setPlans(normalizedPlans);
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

      {/* Section 2: Curated Mantras & Study Plans Knowledgebase */}
      <section className="dashboard-section" aria-labelledby="curated-plans-heading">
        <div className="dashboard-section-header">
          <div>
            <h3 id="curated-plans-heading">Curated Mantras &amp; Study Plans Knowledgebase</h3>
            <p className="dashboard-section-subtitle">
              Hand-picked collections of noteworthy Psalms, Proverbs, Gospels, and anchor passages
              from the World English Bible.
            </p>
          </div>
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
          {plans.map((plan) => (
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
    </div>
  );
};

export default MemoryStudio;
