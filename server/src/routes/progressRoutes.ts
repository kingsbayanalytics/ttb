import express from 'express';
import {
  getUserProgress,
  getUserResults,
  getVerseProgress,
  getProgressSummary,
  getBookChapterProgress,
  submitResult,
  updateResult,
  deleteResult,
  deleteVerseProgress
} from '../controllers/progressController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get user progress
router.get('/', getUserProgress);

// Get individual typing test results
router.get('/results', getUserResults);

// Get progress summary
router.get('/summary', getProgressSummary);

// Get completion counts & percentages for current book and chapter
router.get('/book-context', getBookChapterProgress);

// Get or delete progress for a specific verse
router.get('/verse/:verseId', getVerseProgress);
router.delete('/verse/:verseId', deleteVerseProgress);

// Submit, modify, or delete a typing test result
router.post('/result/:verseId', submitResult);
router.post('/result', submitResult);
router.patch('/result/:resultId', updateResult);
router.delete('/result/:resultId', deleteResult);

export default router;