import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models';
import { asyncHandler, ApiError } from '../utils/errorHandler';

// Generate JWT token
const generateToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '30d'
  });
};

/**
 * @desc    Register a new user
 * @route   POST /api/users
 * @access  Public
 */
export const registerUser = asyncHandler(async (req: Request, res: Response) => {
  const { username, email, password } = req.body;

  // Check if user already exists
  const userExists = await User.findOne({ $or: [{ email }, { username }] });

  if (userExists) {
    throw new ApiError('User already exists', 400);
  }

  // Create user
  const user = await User.create({
    username,
    email,
    password
  });

  if (user) {
    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
        token: generateToken(user._id.toString())
      }
    });
  } else {
    throw new ApiError('Invalid user data', 400);
  }
});

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/users/login
 * @access  Public
 */
export const loginUser = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Check for user email
  const user = await User.findOne({ email });

  if (user && (await user.comparePassword(password))) {
    res.json({
      success: true,
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
        token: generateToken(user._id.toString())
      }
    });
  } else {
    throw new ApiError('Invalid email or password', 401);
  }
});

/**
 * @desc    Get user profile
 * @route   GET /api/users/profile
 * @access  Private
 */
export const getUserProfile = asyncHandler(async (req: Request, res: Response) => {
  // req.user is set by the auth middleware
  const user = await User.findById((req as any).user._id).select('-password');

  if (user) {
    res.json({
      success: true,
      data: user
    });
  } else {
    throw new ApiError('User not found', 404);
  }
});

/**
 * @desc    Update user profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
export const updateUserProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById((req as any).user._id);

  if (user) {
    user.username = req.body.username || user.username;
    user.email = req.body.email || user.email;
    
    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    res.json({
      success: true,
      data: {
        _id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        isAdmin: updatedUser.isAdmin,
        token: generateToken(updatedUser._id.toString())
      }
    });
  } else {
    throw new ApiError('User not found', 404);
  }
});