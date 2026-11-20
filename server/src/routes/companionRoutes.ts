import express from 'express';
import {
  getChapterCompanionHandler,
  getCompanionBookGuideHandler,
  searchCompanionHandler,
} from '../controllers/companionController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// Protect every companion endpoint (local JWT or Entra OWNER_OID)
router.use(protect);

// Static sub-routes MUST be mounted before parameterized /:book/:chapter
router.get('/search', searchCompanionHandler);
router.get('/:book/guide', getCompanionBookGuideHandler);
router.get('/:book/:chapter', getChapterCompanionHandler);

export default router;
