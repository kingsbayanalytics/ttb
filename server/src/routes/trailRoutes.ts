import express from 'express';
import {
  getTrailBookHandler,
  getTrailOverviewHandler,
} from '../controllers/trailController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// Protect every trail endpoint (local JWT or Entra OWNER_OID)
router.use(protect);

router.get('/overview', getTrailOverviewHandler);
router.get('/books/:book', getTrailBookHandler);

export default router;
