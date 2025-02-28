import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Progress as ProgressType } from '../types';
import { ProgressService, AuthService } from '../services/api';

const Progress: React.FC = () => {
  const [progress, setProgress] = useState<ProgressType[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
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

  if (loading) {
    return <div className="loading">Loading progress data...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
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
      
      {summary && (
        <div className="progress-summary">
          <div className="summary-card">
            <h3>Completion</h3>
            <div className="summary-value">{summary.percentageCompleted.toFixed(1)}%</div>
            <div className="summary-detail">
              {summary.completedVerses} of {summary.totalVerses} verses
            </div>
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
          </div>
          
          <div className="summary-card">
            <h3>Total Tests</h3>
            <div className="summary-value">{summary.totalTests}</div>
            <div className="summary-detail">
              {summary.attemptedVerses} verses attempted
            </div>
          </div>
        </div>
      )}
      
      <div className="recent-progress">
        <h3>Recent Activity</h3>
        
        {progress.length > 0 ? (
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
                {progress.slice(0, 10).map((item) => (
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
        ) : (
          <p className="no-progress">
            You haven't completed any typing tests yet. 
            <button onClick={() => navigate('/typing')} className="primary-button">
              Start Typing
            </button>
          </p>
        )}
      </div>
    </div>
  );
};

export default Progress; 