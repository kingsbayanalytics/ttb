import express from 'express';
import {
  getAchievementsStats,
  getActivityStats,
  getCoverageStats,
  getTrendStats,
  getWeaknessStats,
} from '../controllers/statsController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect);

router.get('/trend', getTrendStats);
router.get('/activity', getActivityStats);
router.get('/coverage', getCoverageStats);
router.get('/weakness', getWeaknessStats);
router.get('/achievements', getAchievementsStats);

export default router;
