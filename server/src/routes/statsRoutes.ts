import express from 'express';
import {
  getActivityStats,
  getCoverageStats,
  getTrendStats,
} from '../controllers/statsController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect);

router.get('/trend', getTrendStats);
router.get('/activity', getActivityStats);
router.get('/coverage', getCoverageStats);

export default router;
