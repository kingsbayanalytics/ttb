import React from 'react';
import { AchievementsData, BadgeCategory } from '../../types';

interface StreakAndBadgesProps {
  achievements: AchievementsData;
}

const CATEGORY_LABELS: Record<BadgeCategory, string> = {
  consistency: 'Consistency',
  velocity: 'Velocity',
  precision: 'Precision',
  canon: 'Canon',
};

const StreakAndBadges: React.FC<StreakAndBadgesProps> = ({ achievements }) => {
  const { streak, milestones, badges } = achievements;
  const unlockedCount = badges.filter((b) => b.unlocked).length;

  return (
    <section
      className="dashboard-section"
      aria-labelledby="streaks-badges-heading"
      data-testid="streak-and-badges-section"
    >
      <div className="dashboard-section-header">
        <div>
          <h3 id="streaks-badges-heading">Streaks, Milestones &amp; Badges</h3>
          <p className="dashboard-section-subtitle">
            Daily scripture rhythm, personal bests, and {unlockedCount} of {badges.length} editorial
            commendations unlocked.
          </p>
        </div>
        <span
          className={`streak-status-pill ${streak.activeToday ? 'is-active' : ''}`}
          data-testid="streak-status-pill"
        >
          {streak.activeToday
            ? 'Practiced Today'
            : streak.currentStreakDays > 0
              ? 'Streak Active — Practice Today'
              : 'Start a New Streak'}
        </span>
      </div>

      <div className="milestones-overview-grid">
        <div className="summary-card">
          <h4>Current Streak</h4>
          <div className="summary-value" data-testid="current-streak-value">
            {streak.currentStreakDays} {streak.currentStreakDays === 1 ? 'Day' : 'Days'}
          </div>
          <div className="summary-detail">
            {streak.lastActiveDate ? `Last active ${streak.lastActiveDate}` : 'No sessions yet'}
          </div>
        </div>

        <div className="summary-card">
          <h4>Longest Streak</h4>
          <div className="summary-value" data-testid="longest-streak-value">
            {streak.longestStreakDays} {streak.longestStreakDays === 1 ? 'Day' : 'Days'}
          </div>
          <div className="summary-detail">
            {milestones.totalAttempts} total typing{' '}
            {milestones.totalAttempts === 1 ? 'attempt' : 'attempts'}
          </div>
        </div>

        <div className="summary-card">
          <h4>Best WPM</h4>
          <div className="summary-value" data-testid="best-wpm-value">
            {milestones.bestWpm} WPM
          </div>
          <div className="summary-detail">Peak transcription velocity</div>
        </div>

        <div className="summary-card">
          <h4>Flawless Verses</h4>
          <div className="summary-value" data-testid="flawless-verses-value">
            {milestones.flawlessCount}
          </div>
          <div className="summary-detail">
            100% accuracy · {milestones.psalmsCompletedCount} Psalms completed
          </div>
        </div>
      </div>

      {badges.length > 0 && (
        <ul className="editorial-badge-grid" aria-label="Editorial badges">
          {badges.map((badge) => (
            <li
              key={badge.id}
              className={`editorial-badge-card ${badge.unlocked ? 'is-unlocked' : 'is-locked'}`}
              data-testid={`badge-card-${badge.id}`}
            >
              <div className="editorial-badge-header">
                <span className="editorial-badge-category">
                  {CATEGORY_LABELS[badge.category] ?? badge.category}
                </span>
                <span className="editorial-badge-status">
                  {badge.unlocked ? 'Unlocked' : `${badge.progressCurrent}/${badge.progressTarget}`}
                </span>
              </div>

              <h4 className="editorial-badge-title">{badge.title}</h4>
              <p className="editorial-badge-description">{badge.description}</p>

              <div className="editorial-badge-progress">
                <div
                  className="progress-bar-container"
                  role="progressbar"
                  aria-label={`${badge.title} progress`}
                  aria-valuenow={badge.progressPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="progress-bar"
                    style={{ width: `${Math.min(100, badge.progressPct)}%` }}
                  />
                </div>
                <span className="editorial-badge-numbers">
                  {badge.progressCurrent} / {badge.progressTarget} ({badge.progressPct}%)
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default StreakAndBadges;
