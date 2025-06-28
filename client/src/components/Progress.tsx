import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Progress as ProgressType } from '../types';
import { ProgressService, AuthService } from '../services/api';

const Progress: React.FC = () => {
  const [progress, setProgress] = useState<ProgressType[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'recent' | 'all'>('summary');
  
  const navigate = useNavigate();
  const user = AuthService.getCurrentUser();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!user) {
      navigate('/login');
      return;
    }
    
    fetchProgressData();
  }, [navigate, user]);

  const fetchProgressData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch progress summary
      const summaryData = await ProgressService.getProgressSummary();
      setSummary(summaryData);
      
      // Fetch detailed progress
      const progressData = await ProgressService.getUserProgress();
      setProgress(progressData);
    } catch (err) {
      setError('Failed to fetch progress data. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate progress trends (improvements over time)
  const calculateTrends = () => {
    if (!progress.length) return null;
    
    // Sort by last attempt date, most recent first
    const sortedProgress = [...progress].sort((a, b) => {
      return new Date(b.lastAttemptDate).getTime() - new Date(a.lastAttemptDate).getTime();
    });
    
    // Get first 10 for recent progress
    const recentProgress = sortedProgress.slice(0, 10);
    
    const totalAttempts = recentProgress.reduce((sum, item) => sum + item.attempts, 0);
    const averageWPM = recentProgress.reduce((sum, item) => sum + item.bestWPM, 0) / recentProgress.length;
    
    return {
      recentAttempts: totalAttempts,
      recentAverageWPM: averageWPM,
      mostPracticed: sortedProgress.sort((a, b) => b.attempts - a.attempts)[0]
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
            <div className="summary-detail">
              Best: {summary.bestWPM.toFixed(1)} WPM
            </div>
          </div>
          
          <div className="summary-card">
            <h3>Accuracy</h3>
            <div className="summary-value">{summary.averageAccuracy.toFixed(1)}%</div>
            {renderProgressBar(summary.averageAccuracy)}
          </div>
          
          <div className="summary-card">
            <h3>Total Tests</h3>
            <div className="summary-value">{summary.totalTests}</div>
            <div className="summary-detail">
              {summary.attemptedVerses} verses attempted
            </div>
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
                      {trends.mostPracticed.verse && typeof trends.mostPracticed.verse === 'object' ? (
                        `${(trends.mostPracticed.verse as any).book} ${(trends.mostPracticed.verse as any).chapter}:${(trends.mostPracticed.verse as any).verse}`
                      ) : (
                        `Verse #${trends.mostPracticed.verseOrder}`
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

  const renderRecentTab = () => {
    if (!progress.length) {
      return (
        <p className="no-progress">
          You haven't completed any typing tests yet. 
          <button onClick={() => navigate('/typing')} className="primary-button">
            Start Typing
          </button>
        </p>
      );
    }
    
    // Sort by last attempt date, most recent first
    const recentProgress = [...progress]
      .sort((a, b) => new Date(b.lastAttemptDate).getTime() - new Date(a.lastAttemptDate).getTime())
      .slice(0, 10);
    
    return (
      <div className="progress-table-container">
        <table className="progress-table">
          <thead>
            <tr>
              <th>Verse</th>
              <th>Attempts</th>
              <th>Best WPM</th>
              <th>Best Accuracy</th>
              <th>Last Attempt</th>
            </tr>
          </thead>
          <tbody>
            {recentProgress.map((item) => (
              <tr key={item._id}>
                <td>
                  {item.verse && typeof item.verse === 'object' ? (
                    `${(item.verse as any).book} ${(item.verse as any).chapter}:${(item.verse as any).verse}`
                  ) : (
                    `Verse #${item.verseOrder}`
                  )}
                </td>
                <td>{item.attempts}</td>
                <td>{item.bestWPM.toFixed(1)}</td>
                <td>{item.bestAccuracy.toFixed(1)}%</td>
                <td>
                  {new Date(item.lastAttemptDate).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderAllProgressTab = () => {
    if (!progress.length) {
      return (
        <p className="no-progress">
          You haven't completed any typing tests yet. 
          <button onClick={() => navigate('/typing')} className="primary-button">
            Start Typing
          </button>
        </p>
      );
    }
    
    // Sort by verse order
    const allProgress = [...progress].sort((a, b) => a.verseOrder - b.verseOrder);
    
    return (
      <div className="progress-table-container">
        <table className="progress-table">
          <thead>
            <tr>
              <th>Verse</th>
              <th>Attempts</th>
              <th>Best WPM</th>
              <th>Best Accuracy</th>
              <th>Last Attempt</th>
            </tr>
          </thead>
          <tbody>
            {allProgress.map((item) => (
              <tr key={item._id}>
                <td>
                  {item.verse && typeof item.verse === 'object' ? (
                    `${(item.verse as any).book} ${(item.verse as any).chapter}:${(item.verse as any).verse}`
                  ) : (
                    `Verse #${item.verseOrder}`
                  )}
                </td>
                <td>{item.attempts}</td>
                <td>{item.bestWPM.toFixed(1)}</td>
                <td>{item.bestAccuracy.toFixed(1)}%</td>
                <td>
                  {new Date(item.lastAttemptDate).toLocaleDateString()}
                </td>
              </tr>
            ))}
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
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <p className="error-message">{error}</p>
        <button onClick={fetchProgressData} className="primary-button">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="progress-container">
      <h2>Your Typing Progress</h2>
      
      <div className="progress-tabs">
        <button 
          className={`tab-button ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          Summary
        </button>
        <button 
          className={`tab-button ${activeTab === 'recent' ? 'active' : ''}`}
          onClick={() => setActiveTab('recent')}
        >
          Recent Activity
        </button>
        <button 
          className={`tab-button ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All Progress
        </button>
      </div>
      
      <div className="tab-content">
        {activeTab === 'summary' && renderSummaryTab()}
        {activeTab === 'recent' && renderRecentTab()}
        {activeTab === 'all' && renderAllProgressTab()}
      </div>
      
      <div className="progress-actions">
        <button onClick={() => navigate('/typing')} className="primary-button">
          Practice More
        </button>
        <button onClick={fetchProgressData} className="secondary-button">
          Refresh Data
        </button>
      </div>
    </div>
  );
};

export default Progress; 