import express from 'express';
import { getCuratedPlans, getCuratedPlanDetail } from '../controllers/planController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect);

router.get('/', getCuratedPlans);
router.get('/:planId', getCuratedPlanDetail);

export default router;
