import React, { useState } from 'react';
import { WeaknessReport } from '../../types';
import {
  calculateAccuracy,
  calculateWpm,
  countIncorrectCharacters,
} from '../../utils/typingMetrics';

interface WeaknessAnalyticsProps {
  weakness: WeaknessReport;
}

const WeaknessAnalytics: React.FC<WeaknessAnalyticsProps> = ({ weakness }) => {
  const { topCharacters, topWords, totalTrackedAttempts, suggestedDrillText } = weakness;
  const hasWeaknessData = topCharacters.length > 0 || topWords.length > 0;

  const [drillOpen, setDrillOpen] = useState<boolean>(false);
  const [drillTyped, setDrillTyped] = useState<string>('');
  const [drillStartTime, setDrillStartTime] = useState<number | null>(null);
  const [drillCompletedResult, setDrillCompletedResult] = useState<{
    wpm: number;
    accuracy: number;
  } | null>(null);

  const drillTarget =
    suggestedDrillText ||
    (topWords.length > 0
      ? `${topWords.map((w) => w.word).join(' ')} ${topWords.map((w) => w.word).join(' ')}`
      : '');

  const handleStartOrResetDrill = () => {
    setDrillOpen(true);
    setDrillTyped('');
    setDrillStartTime(null);
    setDrillCompletedResult(null);
  };

  const handleDrillInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextValue = e.target.value;
    const now = Date.now();
    const effectiveStart = drillStartTime ?? (nextValue.length > 0 ? now : null);
    if (drillStartTime === null && nextValue.length > 0) {
      setDrillStartTime(now);
    }

    setDrillTyped(nextValue);

    if (drillTarget && nextValue.length >= drillTarget.length) {
      const durationMs = Math.max(500, now - (effectiveStart ?? now));
      const wordCount = drillTarget.trim().split(/\s+/).filter(Boolean).length;
      const incorrect = countIncorrectCharacters(nextValue, drillTarget);
      const accuracy = calculateAccuracy(nextValue.length, incorrect);
      const wpm = calculateWpm(wordCount, durationMs);
      setDrillCompletedResult({ wpm, accuracy });
    } else {
      setDrillCompletedResult(null);
    }
  };

  return (
    <section
      className="dashboard-section"
      aria-labelledby="weakness-analytics-heading"
      data-testid="weakness-analytics-section"
    >
      <div className="dashboard-section-header">
        <div>
          <h3 id="weakness-analytics-heading">Per-Word &amp; Per-Character Weakness Analytics</h3>
          <p className="dashboard-section-subtitle">
            Pinpoint recurring punctuation, character, and scripture vocabulary slips across{' '}
            {totalTrackedAttempts} tracked {totalTrackedAttempts === 1 ? 'attempt' : 'attempts'}.
          </p>
        </div>

        {drillTarget && (
          <button
            type="button"
            className="selection-button"
            onClick={() => (drillOpen ? setDrillOpen(false) : handleStartOrResetDrill())}
            data-testid="toggle-weak-words-drill"
          >
            {drillOpen ? 'Close Drill' : 'Practice Weak Words Drill'}
          </button>
        )}
      </div>

      {!hasWeaknessData ? (
        <div className="dashboard-empty-state" data-testid="weakness-empty-state">
          No character or word weaknesses recorded yet. Complete a typing session to unlock targeted
          keystroke diagnostics and custom word drills.
        </div>
      ) : (
        <div className="weakness-columns-grid">
          <div className="weakness-column-card">
            <h4>Top Missed Characters &amp; Punctuation</h4>
            {topCharacters.length === 0 ? (
              <p className="weakness-column-empty">No character slips recorded.</p>
            ) : (
              <ul className="weakness-badge-list" aria-label="Top missed characters">
                {topCharacters.map((item) => (
                  <li
                    key={item.char}
                    className="weakness-mono-badge"
                    data-testid={`weak-char-${item.char}`}
                  >
                    <span className="weakness-token">{item.label}</span>
                    <span className="weakness-count">{item.count}×</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="weakness-column-card">
            <h4>Top Missed Scripture Words</h4>
            {topWords.length === 0 ? (
              <p className="weakness-column-empty">No word slips recorded.</p>
            ) : (
              <ul className="weakness-badge-list" aria-label="Top missed words">
                {topWords.map((item) => (
                  <li
                    key={item.word}
                    className="weakness-mono-badge"
                    data-testid={`weak-word-${item.word}`}
                  >
                    <span className="weakness-token">{item.word}</span>
                    <span className="weakness-count">{item.count}×</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {drillOpen && drillTarget && (
        <div className="weakness-drill-console" data-testid="weakness-drill-console">
          <div className="weakness-drill-header">
            <h4>Targeted Weak Words Drill</h4>
            <button
              type="button"
              className="selection-button"
              onClick={handleStartOrResetDrill}
            >
              Reset Drill
            </button>
          </div>

          <div className="verse-display weakness-drill-display" data-testid="weakness-drill-target">
            {drillTarget.split('').map((char, index) => {
              let className = '';
              if (index < drillTyped.length) {
                className = drillTyped[index] === char ? 'correct' : 'incorrect';
              }
              return (
                <span key={index} className={className}>
                  {char}
                </span>
              );
            })}
          </div>

          <textarea
            className="typing-input weakness-drill-input"
            aria-label="Weak words drill input"
            placeholder="Type the targeted weak words drill above..."
            value={drillTyped}
            onChange={handleDrillInputChange}
          />

          {drillCompletedResult && (
            <div className="last-completed-banner" role="status" data-testid="weakness-drill-result">
              <strong>Drill Complete</strong> — {drillCompletedResult.wpm} WPM ·{' '}
              {drillCompletedResult.accuracy}% Accuracy
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default WeaknessAnalytics;
