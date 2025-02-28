import express from 'express';
import {
  getUserProgress,
  getVerseProgress,
  getProgressSummary,
  submitResult
} from '../controllers/progressController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get user progress
router.get('/', getUserProgress);

// Get progress summary
router.get('/summary', getProgressSummary);

// Get progress for a specific verse
router.get('/verse/:verseId', getVerseProgress);

// Submit a typing test result
router.post('/result', submitResult);

export default router; 