import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthSession } from '../../context/AuthContext';
import { StatsService } from '../../services/api';
import { ActivityPoint, CoverageData, TrendPoint, TrendRange } from '../../types';
import ActivityHeatmap from './ActivityHeatmap';
import BookCoverage from './BookCoverage';
import TrendChart from './TrendChart';

function getCurrentYear(): number {
  return new Date().getFullYear();
}

function buildYearChoices(currentYear: number): number[] {
  const startYear = 2023;
  const years: number[] = [];
  for (let y = currentYear; y >= startYear; y -= 1) {
    years.push(y);
  }
  return years;
}

const Dashboard: React.FC = () => {
  const currentYear = useMemo(() => getCurrentYear(), []);
  const availableYears = useMemo(() => buildYearChoices(currentYear), [currentYear]);

  const [range, setRange] = useState<TrendRange>('30');
  const [year, setYear] = useState<number>(currentYear);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [activity, setActivity] = useState<ActivityPoint[]>([]);
  const [coverage, setCoverage] = useState<CoverageData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [trendLoading, setTrendLoading] = useState<boolean>(false);
  const [activityLoading, setActivityLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { mode, user, loading: authLoading } = useAuthSession();
  const navigate = useNavigate();

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [trendData, activityData, coverageData] = await Promise.all([
        StatsService.getTrend(range),
        StatsService.getActivity(year),
        StatsService.getCoverage(),
      ]);
      setTrend(trendData);
      setActivity(activityData);
      setCoverage(coverageData);
    } catch (err) {
      console.error('Failed to load dashboard statistics:', err);
      setError('Failed to load dashboard statistics. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [range, year]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (mode !== 'entra' && !user) {
      navigate('/login');
      return;
    }

    let cancelled = false;
    const init = async () => {
      try {
        setLoading(true);
        setError(null);
        const [trendData, activityData, coverageData] = await Promise.all([
          StatsService.getTrend('30'),
          StatsService.getActivity(currentYear),
          StatsService.getCoverage(),
        ]);
        if (!cancelled) {
          setTrend(trendData);
          setActivity(activityData);
          setCoverage(coverageData);
        }
      } catch (err) {
        console.error('Failed to load dashboard statistics:', err);
        if (!cancelled) {
          setError('Failed to load dashboard statistics. Please try again.');
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
  }, [authLoading, mode, user, navigate, currentYear]);

  const handleRangeChange = async (nextRange: TrendRange) => {
    setRange(nextRange);
    try {
      setTrendLoading(true);
      const nextTrend = await StatsService.getTrend(nextRange);
      setTrend(nextTrend);
    } catch (err) {
      console.error('Failed to update trend range:', err);
      setError('Failed to load trend statistics. Please try again.');
    } finally {
      setTrendLoading(false);
    }
  };

  const handleYearChange = async (nextYear: number) => {
    setYear(nextYear);
    try {
      setActivityLoading(true);
      const nextActivity = await StatsService.getActivity(nextYear);
      setActivity(nextActivity);
    } catch (err) {
      console.error('Failed to update activity year:', err);
      setError('Failed to load activity statistics. Please try again.');
    } finally {
      setActivityLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner-overlay">
          <div className="spinner" />
        </div>
        <div className="loading-text">
          <h3>Loading your statistics dashboard...</h3>
          <p>Calculating trends, daily activity, and Bible coverage.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-message">{error}</p>
        <button type="button" onClick={loadDashboard} className="primary-button">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h2>Statistics Dashboard</h2>
          <p className="dashboard-subtitle">
            Track your typing speed, consistency, and progress across all 73 books.
          </p>
        </div>
        <Link to="/typing" className="primary-button">
          Practice Typing
        </Link>
      </div>

      <TrendChart
        data={trend}
        range={range}
        onRangeChange={handleRangeChange}
        loading={trendLoading}
      />

      <ActivityHeatmap
        data={activity}
        year={year}
        availableYears={availableYears}
        onYearChange={handleYearChange}
        loading={activityLoading}
      />

      {coverage && <BookCoverage coverage={coverage} />}
    </div>
  );
};

export default Dashboard;
