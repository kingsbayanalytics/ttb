import express, { Request, Response, NextFunction } from 'express';
import {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile
} from '../controllers/userController';
import { authenticate, getActiveConfig } from '../middleware/authMiddleware';
import { ApiError } from '../utils/errorHandler';

const router = express.Router();

const requireLocalAuthMode = (req: Request, _res: Response, next: NextFunction) => {
  if (getActiveConfig(req).authMode === 'entra') {
    return next(new ApiError(`Not Found - ${req.originalUrl}`, 404));
  }
  return next();
};

// Register a new user (disabled in entra mode)
router.post('/', requireLocalAuthMode, registerUser);

// Login user (disabled in entra mode)
router.post('/login', requireLocalAuthMode, loginUser);

// Get user profile
router.get('/profile', authenticate, getUserProfile);

// Update user profile
router.put('/profile', authenticate, updateUserProfile);

export default router;
