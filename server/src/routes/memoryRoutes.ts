import express from 'express';
import {
  getMemoryDeck,
  addMemoryItem,
  addCuratedPackToMemory,
  recordMemoryPractice,
  updateMemoryItemStage,
  deleteMemoryItem,
} from '../controllers/memoryController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect);

router.get('/', getMemoryDeck);
router.post('/', addMemoryItem);
router.post('/pack/:packId', addCuratedPackToMemory);
router.post('/:id/practice', recordMemoryPractice);
router.patch('/:id', updateMemoryItemStage);
router.delete('/:id', deleteMemoryItem);

export default router;
