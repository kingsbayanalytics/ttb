import express from 'express';
import {
  getCuratedPlans,
  getCuratedPlanDetail,
  getCustomPlans,
  createCustomPlan,
  getCustomPlanDetail,
  updateCustomPlan,
  deleteCustomPlan,
  addCustomPlanToMemory,
} from '../controllers/planController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect);

// Custom user playlists (mounted BEFORE /:planId)
router.get('/custom', getCustomPlans);
router.post('/custom', createCustomPlan);
router.get('/custom/:planId', getCustomPlanDetail);
router.patch('/custom/:planId', updateCustomPlan);
router.delete('/custom/:planId', deleteCustomPlan);
router.post('/custom/:planId/add-to-memory', addCustomPlanToMemory);

// Curated plans catalog
router.get('/', getCuratedPlans);
router.get('/:planId', getCuratedPlanDetail);

export default router;
