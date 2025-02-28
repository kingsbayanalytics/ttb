import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models';
import { asyncHandler, ApiError } from '../utils/errorHandler';

// Define the JWT payload interface
interface JwtPayload {
  id: string;
}

// Extend the Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

/**
 * Middleware to protect routes
 * Verifies the JWT token and sets the user in the request
 */
export const protect = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  let token;

  // Check if token exists in the Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as JwtPayload;

      // Get user from the token
      req.user = await User.findById(decoded.id).select('-password');

      next();
    } catch (error) {
      console.error(error);
      throw new ApiError('Not authorized, token failed', 401);
    }
  }

  if (!token) {
    throw new ApiError('Not authorized, no token', 401);
  }
});

/**
 * Middleware to check if user is an admin
 * Must be used after the protect middleware
 */
export const admin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    throw new ApiError('Not authorized as an admin', 403);
  }
}; 