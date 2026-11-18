import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthSession } from '../../context/AuthContext';
import { StatsService } from '../../services/api';
import {
  AchievementsData,
  ActivityPoint,
  CoverageData,
  TrendPoint,
  TrendRange,
  WeaknessReport,
} from '../../types';
import ActivityHeatmap from './ActivityHeatmap';
import BookCoverage from './BookCoverage';
import StreakAndBadges from './StreakAndBadges';
import TrendChart from './TrendChart';
import WeaknessAnalytics from './WeaknessAnalytics';

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

const DEFAULT_WEAKNESS_REPORT: WeaknessReport = {
  topCharacters: [],
  topWords: [],
  totalTrackedAttempts: 0,
  suggestedDrillText: '',
};

const DEFAULT_ACHIEVEMENTS_DATA: AchievementsData = {
  streak: {
    currentStreakDays: 0,
    longestStreakDays: 0,
    lastActiveDate: null,
    activeToday: false,
  },
  milestones: {
    totalAttempts: 0,
    bestWpm: 0,
    flawlessCount: 0,
    uniqueVersesCompleted: 0,
    psalmsCompletedCount: 0,
  },
  badges: [],
};

async function fetchOptionalWeakness(): Promise<WeaknessReport> {
  if (typeof StatsService.getWeakness !== 'function') {
    return DEFAULT_WEAKNESS_REPORT;
  }
  try {
    const result = await StatsService.getWeakness();
    return result ?? DEFAULT_WEAKNESS_REPORT;
  } catch {
    return DEFAULT_WEAKNESS_REPORT;
  }
}

async function fetchOptionalAchievements(): Promise<AchievementsData> {
  if (typeof StatsService.getAchievements !== 'function') {
    return DEFAULT_ACHIEVEMENTS_DATA;
  }
  try {
    const result = await StatsService.getAchievements();
    return result ?? DEFAULT_ACHIEVEMENTS_DATA;
  } catch {
    return DEFAULT_ACHIEVEMENTS_DATA;
  }
}

const Dashboard: React.FC = () => {
  const currentYear = useMemo(() => getCurrentYear(), []);
  const availableYears = useMemo(() => buildYearChoices(currentYear), [currentYear]);

  const [range, setRange] = useState<TrendRange>('30');
  const [year, setYear] = useState<number>(currentYear);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [activity, setActivity] = useState<ActivityPoint[]>([]);
  const [coverage, setCoverage] = useState<CoverageData | null>(null);
  const [weakness, setWeakness] = useState<WeaknessReport>(DEFAULT_WEAKNESS_REPORT);
  const [achievements, setAchievements] = useState<AchievementsData>(DEFAULT_ACHIEVEMENTS_DATA);
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
      const [trendData, activityData, coverageData, weaknessData, achievementsData] =
        await Promise.all([
          StatsService.getTrend(range),
          StatsService.getActivity(year),
          StatsService.getCoverage(),
          fetchOptionalWeakness(),
          fetchOptionalAchievements(),
        ]);
      setTrend(trendData);
      setActivity(activityData);
      setCoverage(coverageData);
      setWeakness(weaknessData);
      setAchievements(achievementsData);
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
        const [trendData, activityData, coverageData, weaknessData, achievementsData] =
          await Promise.all([
            StatsService.getTrend('30'),
            StatsService.getActivity(currentYear),
            StatsService.getCoverage(),
            fetchOptionalWeakness(),
            fetchOptionalAchievements(),
          ]);
        if (!cancelled) {
          setTrend(trendData);
          setActivity(activityData);
          setCoverage(coverageData);
          setWeakness(weaknessData);
          setAchievements(achievementsData);
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

      <StreakAndBadges achievements={achievements} />

      <TrendChart
        data={trend}
        range={range}
        onRangeChange={handleRangeChange}
        loading={trendLoading}
      />

      <WeaknessAnalytics weakness={weakness} />

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
