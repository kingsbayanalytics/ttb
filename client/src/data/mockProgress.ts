import { Progress } from '../types';

// Sample progress data for development/testing when API is not available
export const mockProgress: Progress[] = [
  {
    _id: 'p1',
    user: 'user1',
    verse: 'verse1',
    verseOrder: 1,
    completed: true,
    attempts: 5,
    bestWPM: 45.5,
    bestAccuracy: 98.2,
    lastAttemptDate: new Date(2023, 5, 15).toISOString()
  },
  {
    _id: 'p2',
    user: 'user1',
    verse: 'verse2',
    verseOrder: 2,
    completed: true,
    attempts: 3,
    bestWPM: 50.8,
    bestAccuracy: 95.7,
    lastAttemptDate: new Date(2023, 5, 16).toISOString()
  },
  {
    _id: 'p3',
    user: 'user1',
    verse: 'verse3',
    verseOrder: 3,
    completed: true,
    attempts: 2,
    bestWPM: 42.3,
    bestAccuracy: 92.5,
    lastAttemptDate: new Date(2023, 5, 17).toISOString()
  },
  {
    _id: 'p4',
    user: 'user1',
    verse: 'verse4',
    verseOrder: 4,
    completed: false,
    attempts: 1,
    bestWPM: 38.6,
    bestAccuracy: 85.0,
    lastAttemptDate: new Date(2023, 5, 18).toISOString()
  },
  {
    _id: 'p5',
    user: 'user1',
    verse: 'verse5',
    verseOrder: 5,
    completed: true,
    attempts: 7,
    bestWPM: 52.1,
    bestAccuracy: 97.8,
    lastAttemptDate: new Date(2023, 5, 19).toISOString()
  }
];

// Sample progress summary data
export const mockProgressSummary = {
  completedVerses: 4,
  attemptedVerses: 5,
  totalVerses: 10,
  percentageCompleted: 40,
  averageWPM: 45.86,
  bestWPM: 52.1,
  averageAccuracy: 93.84,
  totalTests: 18
}; 