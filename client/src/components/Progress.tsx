import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Progress as ProgressType, ResultHistoryItem } from '../types';
import { ProgressService } from '../services/api';
import { useAuthSession } from '../context/AuthContext';

type ProgressTab = 'summary' | 'recent' | 'all' | 'history';

type DeleteTarget =
  | { kind: 'result'; id: string; label: string; detail: string }
  | { kind: 'verse'; id: string; label: string; detail: string };

function formatVerseLabel(verse: unknown, fallbackOrder: number): string {
  if (verse && typeof verse === 'object' && 'book' in verse) {
    const v = verse as { book: string; chapter: number; verse: number };
    return `${v.book} ${v.chapter}:${v.verse}`;
  }
  return `Verse #${fallbackOrder}`;
}

function getVerseIdFromProgress(item: ProgressType): string {
  if (item.verse && typeof item.verse === 'object' && '_id' in item.verse) {
    return String((item.verse as { _id: string })._id);
  }
  return String(item.verse);
}

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

const Progress: React.FC = () => {
  const [progress, setProgress] = useState<ProgressType[]>([]);
  const [results, setResults] = useState<ResultHistoryItem[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProgressTab>('summary');

  const [editingResult, setEditingResult] = useState<ResultHistoryItem | null>(null);
  const [editWpm, setEditWpm] = useState<string>('');
  const [editAccuracy, setEditAccuracy] = useState<string>('');
  const [editDurationSec, setEditDurationSec] = useState<string>('');
  const [editError, setEditError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  const editDialogRef = useRef<HTMLDialogElement>(null);
  const deleteDialogRef = useRef<HTMLDialogElement>(null);

  const { mode, user, loading: authLoading } = useAuthSession();
  const navigate = useNavigate();

  const fetchProgressData = useCallback(async (inline = false) => {
    try {
      if (inline) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const [summaryData, progressData, resultsData] = await Promise.all([
        ProgressService.getProgressSummary(),
        ProgressService.getUserProgress(),
        typeof ProgressService.getUserResults === 'function'
          ? ProgressService.getUserResults()
          : Promise.resolve([]),
      ]);

      setSummary(summaryData);
      setProgress(progressData);
      setResults(resultsData);
    } catch (err) {
      setError('Failed to fetch progress data. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (mode !== 'entra' && !user) {
      navigate('/login');
      return;
    }

    fetchProgressData(false);
  }, [authLoading, mode, user, navigate, fetchProgressData]);

  const openEditModal = (item: ResultHistoryItem) => {
    setEditingResult(item);
    setEditWpm(String(Math.round(item.wpm * 10) / 10));
    setEditAccuracy(String(Math.round(item.accuracy * 10) / 10));
    setEditDurationSec(((item.duration || 0) / 1000).toFixed(1));
    setEditError(null);
    openNativeDialog(editDialogRef.current);
  };

  const handleEditDialogClose = () => {
    if (editDialogRef.current) {
      editDialogRef.current.returnValue = '';
    }
    setEditingResult(null);
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResult) return;

    const wpmNum = Number(editWpm);
    const accNum = Number(editAccuracy);
    const durSecNum = Number(editDurationSec);

    if (!Number.isFinite(wpmNum) || wpmNum < 0 || wpmNum > 500) {
      setEditError('WPM must be between 0 and 500.');
      return;
    }
    if (!Number.isFinite(accNum) || accNum < 0 || accNum > 100) {
      setEditError('Accuracy must be between 0 and 100.');
      return;
    }
    if (!Number.isFinite(durSecNum) || durSecNum < 0) {
      setEditError('Duration must be 0 or greater.');
      return;
    }

    try {
      setSavingEdit(true);
      setEditError(null);
      await ProgressService.updateResult(editingResult._id, {
        wpm: wpmNum,
        accuracy: accNum,
        duration: Math.round(durSecNum * 1000),
      });
      const label = formatVerseLabel(editingResult.verse, editingResult.verseOrder);
      closeNativeDialog(editDialogRef.current);
      setEditingResult(null);
      setStatusMessage(`Updated attempt for ${label} (${wpmNum} WPM, ${accNum}% accuracy).`);
      await fetchProgressData(true);
    } catch (err: any) {
      setEditError(err?.response?.data?.message || 'Failed to update attempt.');
    } finally {
      setSavingEdit(false);
    }
  };

  const openDeleteResultModal = (item: ResultHistoryItem) => {
    const label = formatVerseLabel(item.verse, item.verseOrder);
    setDeleteTarget({
      kind: 'result',
      id: item._id,
      label,
      detail: `${Number(item.wpm).toFixed(1)} WPM · ${Number(item.accuracy).toFixed(1)}% accuracy on ${new Date(
        item.startTime
      ).toLocaleDateString()}`,
    });
    openNativeDialog(deleteDialogRef.current);
  };

  const openDeleteVerseModal = (item: ProgressType) => {
    const label = formatVerseLabel(item.verse, item.verseOrder);
    const verseId = getVerseIdFromProgress(item);
    setDeleteTarget({
      kind: 'verse',
      id: verseId,
      label,
      detail: `All ${item.attempts} recorded ${item.attempts === 1 ? 'attempt' : 'attempts'} (best ${item.bestWPM.toFixed(
        1
      )} WPM)`,
    });
    openNativeDialog(deleteDialogRef.current);
  };

  const handleDeleteDialogClose = () => {
    if (deleteDialogRef.current) {
      deleteDialogRef.current.returnValue = '';
    }
    setDeleteTarget(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      if (deleteTarget.kind === 'result') {
        await ProgressService.deleteResult(deleteTarget.id);
        setStatusMessage(`Deleted attempt for ${deleteTarget.label} and recalculated your stats.`);
      } else {
        await ProgressService.deleteVerseProgress(deleteTarget.id);
        setStatusMessage(`Deleted all recorded attempts for ${deleteTarget.label}.`);
      }
      closeNativeDialog(deleteDialogRef.current);
      setDeleteTarget(null);
      await fetchProgressData(true);
    } catch (err) {
      console.error('Failed to delete record:', err);
      setError('Failed to delete the selected record. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  // Calculate progress trends (improvements over time)
  const calculateTrends = () => {
    if (!progress.length) return null;

    const sortedProgress = [...progress].sort((a, b) => {
      return new Date(b.lastAttemptDate).getTime() - new Date(a.lastAttemptDate).getTime();
    });

    const recentProgress = sortedProgress.slice(0, 10);
    const totalAttempts = recentProgress.reduce((sum, item) => sum + item.attempts, 0);
    const averageWPM =
      recentProgress.reduce((sum, item) => sum + item.bestWPM, 0) / recentProgress.length;

    return {
      recentAttempts: totalAttempts,
      recentAverageWPM: averageWPM,
      mostPracticed: [...sortedProgress].sort((a, b) => b.attempts - a.attempts)[0],
    };
  };

  const renderProgressBar = (percentage: number) => {
    return (
      <div className="progress-bar-container">
        <div
          className="progress-bar"
          style={{ width: `${Math.min(percentage, 100)}%` }}
        >
          <span className="progress-bar-text">{percentage.toFixed(1)}%</span>
        </div>
      </div>
    );
  };

  const renderSummaryTab = () => {
    if (!summary) return <div>No summary data available</div>;

    const trends = calculateTrends();

    return (
      <div className="summary-tab">
        <div className="dashboard-promo-banner">
          <p>Explore daily speed trends, activity heatmap, and book-by-book Bible coverage.</p>
          <Link to="/dashboard" className="primary-button">
            Open Statistics Dashboard
          </Link>
        </div>

        <div className="progress-summary">
          <div className="summary-card">
            <h3>Completion</h3>
            <div className="summary-value">{summary.percentageCompleted.toFixed(1)}%</div>
            <div className="summary-detail">
              {summary.completedVerses} of {summary.totalVerses} verses
            </div>
            {renderProgressBar(summary.percentageCompleted)}
          </div>

          <div className="summary-card">
            <h3>Speed</h3>
            <div className="summary-value">{summary.averageWPM.toFixed(1)} WPM</div>
            <div className="summary-detail">Best: {summary.bestWPM.toFixed(1)} WPM</div>
          </div>

          <div className="summary-card">
            <h3>Accuracy</h3>
            <div className="summary-value">{summary.averageAccuracy.toFixed(1)}%</div>
            {renderProgressBar(summary.averageAccuracy)}
          </div>

          <div className="summary-card">
            <h3>Total Tests</h3>
            <div className="summary-value">{summary.totalTests}</div>
            <div className="summary-detail">{summary.attemptedVerses} verses attempted</div>
          </div>
        </div>

        {trends && (
          <div className="trends-section">
            <h3>Your Progress Insights</h3>
            <div className="trend-cards">
              <div className="trend-card">
                <h4>Most Practiced Verse</h4>
                {trends.mostPracticed ? (
                  <div>
                    <p>
                      {formatVerseLabel(
                        trends.mostPracticed.verse,
                        trends.mostPracticed.verseOrder
                      )}
                    </p>
                    <p>Attempts: {trends.mostPracticed.attempts}</p>
                    <p>Best WPM: {trends.mostPracticed.bestWPM.toFixed(1)}</p>
                  </div>
                ) : (
                  <p>No data available</p>
                )}
              </div>

              <div className="trend-card">
                <h4>Recent Activity</h4>
                <p>Attempts: {trends.recentAttempts}</p>
                <p>Avg. WPM: {trends.recentAverageWPM.toFixed(1)}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderProgressTable = (items: ProgressType[], caption: string) => {
    if (!items.length) {
      return (
        <div className="no-progress">
          <p>You haven't completed any typing tests yet.</p>
          <button onClick={() => navigate('/typing')} className="primary-button">
            Start Typing
          </button>
        </div>
      );
    }

    return (
      <div
        className={`progress-table-container ${refreshing ? 'is-refreshing' : ''}`}
        tabIndex={0}
        role="region"
        aria-label={caption}
      >
        <table className="progress-table responsive-progress-table">
          <caption>{caption}</caption>
          <thead>
            <tr>
              <th scope="col">Verse</th>
              <th scope="col">Attempts</th>
              <th scope="col">Best WPM</th>
              <th scope="col">Best Accuracy</th>
              <th scope="col">Last Attempt</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const label = formatVerseLabel(item.verse, item.verseOrder);
              return (
                <tr key={item._id}>
                  <th scope="row">{label}</th>
                  <td data-label="Attempts">{item.attempts}</td>
                  <td data-label="Best WPM">{item.bestWPM.toFixed(1)}</td>
                  <td data-label="Best Accuracy">{item.bestAccuracy.toFixed(1)}%</td>
                  <td data-label="Last Attempt">
                    {new Date(item.lastAttemptDate).toLocaleDateString()}
                  </td>
                  <td data-label="Actions" className="table-actions-cell">
                    <button
                      type="button"
                      className="table-action-button table-action-danger"
                      onClick={() => openDeleteVerseModal(item)}
                      aria-label={`Delete all progress for ${label}`}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderRecentTab = () => {
    const recentProgress = [...progress]
      .sort((a, b) => new Date(b.lastAttemptDate).getTime() - new Date(a.lastAttemptDate).getTime())
      .slice(0, 10);
    return renderProgressTable(recentProgress, 'Recent verse progress');
  };

  const renderAllProgressTab = () => {
    const allProgress = [...progress].sort((a, b) => a.verseOrder - b.verseOrder);
    return renderProgressTable(allProgress, 'All verse progress');
  };

  const renderManageHistoryTab = () => {
    if (!results.length) {
      return (
        <div className="no-progress">
          <p>No individual typing attempts recorded yet.</p>
          <button onClick={() => navigate('/typing')} className="primary-button">
            Start Typing
          </button>
        </div>
      );
    }

    return (
      <div
        className={`progress-table-container ${refreshing ? 'is-refreshing' : ''}`}
        tabIndex={0}
        role="region"
        aria-label="Individual typing attempt history"
      >
        <table className="progress-table responsive-history-table">
          <caption>Individual typing attempts — edit or delete outliers to keep stats accurate</caption>
          <thead>
            <tr>
              <th scope="col">Verse</th>
              <th scope="col">Date</th>
              <th scope="col">WPM</th>
              <th scope="col">Accuracy</th>
              <th scope="col">Time</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {results.map((item) => {
              const label = formatVerseLabel(item.verse, item.verseOrder);
              return (
                <tr key={item._id} data-testid={`history-row-${item._id}`}>
                  <th scope="row">{label}</th>
                  <td data-label="Date">{new Date(item.startTime).toLocaleString()}</td>
                  <td data-label="WPM">{Number(item.wpm).toFixed(1)}</td>
                  <td data-label="Accuracy">{Number(item.accuracy).toFixed(1)}%</td>
                  <td data-label="Time">{((item.duration || 0) / 1000).toFixed(1)}s</td>
                  <td data-label="Actions" className="table-actions-cell">
                    <button
                      type="button"
                      className="table-action-button"
                      onClick={() => openEditModal(item)}
                      aria-label={`Edit attempt for ${label}`}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="table-action-button table-action-danger"
                      onClick={() => openDeleteResultModal(item)}
                      aria-label={`Delete attempt for ${label}`}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner-overlay">
          <div className="spinner"></div>
        </div>
        <div className="loading-text">
          <h3>Loading your progress data...</h3>
          <p>This may take a moment as we gather your statistics.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <p className="error-message">{error}</p>
        <button onClick={() => fetchProgressData(false)} className="primary-button">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="progress-container">
      <h2>
        Your Typing Progress
        {refreshing && (
          <span className="inline-refresh-badge" role="status" aria-live="polite">
            Updating…
          </span>
        )}
      </h2>

      {statusMessage && (
        <div className="success-message" role="status" data-testid="progress-status-message">
          {statusMessage}
        </div>
      )}

      <div className="progress-tabs">
        <button
          type="button"
          className={`tab-button ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          Summary
        </button>
        <button
          type="button"
          className={`tab-button ${activeTab === 'recent' ? 'active' : ''}`}
          onClick={() => setActiveTab('recent')}
        >
          Recent Activity
        </button>
        <button
          type="button"
          className={`tab-button ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All Progress
        </button>
        <button
          type="button"
          className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Manage History ({results.length})
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'summary' && renderSummaryTab()}
        {activeTab === 'recent' && renderRecentTab()}
        {activeTab === 'all' && renderAllProgressTab()}
        {activeTab === 'history' && renderManageHistoryTab()}
      </div>

      <div className="progress-actions">
        <button type="button" onClick={() => navigate('/typing')} className="primary-button">
          Practice More
        </button>
        <button
          type="button"
          onClick={() => fetchProgressData(true)}
          className="secondary-button"
        >
          Refresh Data
        </button>
      </div>

      {/* Native Edit Attempt Modal Dialog */}
      <dialog
        ref={editDialogRef}
        className="editorial-dialog"
        aria-labelledby="edit-result-title"
        onClose={handleEditDialogClose}
      >
        <h3 id="edit-result-title">
          Edit Attempt{editingResult ? ` — ${formatVerseLabel(editingResult.verse, editingResult.verseOrder)}` : ''}
        </h3>
        <form onSubmit={handleSaveEdit} className="editorial-dialog-form">
          {editError && <div className="error-message">{editError}</div>}
          <div className="form-group">
            <label htmlFor="edit-wpm-input">Words Per Minute (0–500)</label>
            <input
              id="edit-wpm-input"
              type="number"
              step="0.1"
              min="0"
              max="500"
              value={editWpm}
              onChange={(e) => setEditWpm(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="edit-accuracy-input">Accuracy % (0–100)</label>
            <input
              id="edit-accuracy-input"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={editAccuracy}
              onChange={(e) => setEditAccuracy(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="edit-duration-input">Duration (seconds)</label>
            <input
              id="edit-duration-input"
              type="number"
              step="0.1"
              min="0"
              value={editDurationSec}
              onChange={(e) => setEditDurationSec(e.target.value)}
              required
            />
          </div>
          <div className="editorial-dialog-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => closeNativeDialog(editDialogRef.current)}
            >
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={savingEdit}>
              {savingEdit ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </dialog>

      {/* Native Confirm Delete Modal Dialog */}
      <dialog
        ref={deleteDialogRef}
        className="editorial-dialog"
        aria-labelledby="delete-result-title"
        onClose={handleDeleteDialogClose}
      >
        <h3 id="delete-result-title">
          Delete {deleteTarget?.kind === 'verse' ? 'Verse Progress' : 'Typing Attempt'}?
        </h3>
        {deleteTarget && (
          <div className="editorial-dialog-body">
            <p>
              Remove <strong>{deleteTarget.label}</strong> ({deleteTarget.detail})?
            </p>
            <p className="editorial-dialog-note">
              Your dashboard trends, streaks, and book coverage will recalculate automatically.
            </p>
          </div>
        )}
        <div className="editorial-dialog-actions">
          <button
            type="button"
            className="secondary-button"
            autoFocus
            onClick={() => closeNativeDialog(deleteDialogRef.current)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={deleting}
            onClick={handleConfirmDelete}
          >
            {deleting ? 'Deleting…' : 'Confirm Delete'}
          </button>
        </div>
      </dialog>
    </div>
  );
};

export default Progress;
