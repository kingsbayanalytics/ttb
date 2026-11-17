import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config, AppConfig } from '../config';
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

export function getActiveConfig(req: Request): AppConfig {
  return (req.app?.get('appConfig') as AppConfig | undefined) ?? config;
}

export function readSingleHeader(req: Request, name: string): string | undefined {
  const raw = req.headers[name.toLowerCase()];
  if (typeof raw !== 'string') {
    return undefined;
  }
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export async function upsertEntraUser(entraOid: string, principalName?: string) {
  const existing = await User.findOne({ entraOid }).select('-password');
  if (existing) {
    return existing;
  }

  const baseUsername = principalName || 'Owner';
  const baseEmail =
    principalName && principalName.includes('@')
      ? principalName.toLowerCase()
      : `${entraOid}@entra.local`;

  try {
    return await User.findOneAndUpdate(
      { entraOid },
      {
        $setOnInsert: {
          entraOid,
          username: baseUsername,
          email: baseEmail,
          isAdmin: false,
        },
      },
      { upsert: true, new: true, runValidators: true }
    ).select('-password');
  } catch (error: any) {
    if (error?.code === 11000) {
      const raced = await User.findOne({ entraOid }).select('-password');
      if (raced) {
        return raced;
      }
      return await User.findOneAndUpdate(
        { entraOid },
        {
          $setOnInsert: {
            entraOid,
            username: `${baseUsername}-${entraOid.slice(0, 8)}`,
            email: `${entraOid}@entra.local`,
            isAdmin: false,
          },
        },
        { upsert: true, new: true, runValidators: true }
      ).select('-password');
    }
    throw error;
  }
}

/**
 * Middleware to authenticate requests using the configured AUTH_MODE strategy:
 * - local: JWT Bearer token
 * - entra: App Service Easy Auth X-MS-CLIENT-PRINCIPAL-ID matching OWNER_OID
 */
export const authenticate = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const activeConfig = getActiveConfig(req);

    if (activeConfig.authMode === 'entra') {
      const oid = readSingleHeader(req, 'x-ms-client-principal-id');
      if (!oid) {
        throw new ApiError('Not authorized, missing principal header', 401);
      }

      if (oid !== activeConfig.ownerOid) {
        throw new ApiError('Forbidden, principal is not authorized owner', 403);
      }

      const principalName = readSingleHeader(req, 'x-ms-client-principal-name');
      req.user = await upsertEntraUser(oid, principalName);
      next();
      return;
    }

    let token: string | undefined;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new ApiError('Not authorized, no token', 401);
    }

    if (!activeConfig.jwtSecret) {
      throw new ApiError('Server JWT configuration missing', 500);
    }

    try {
      const decoded = jwt.verify(token, activeConfig.jwtSecret) as JwtPayload;
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        throw new ApiError('Not authorized, user not found', 401);
      }

      req.user = user;
      next();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error('Error in authenticate middleware:', error);
      throw new ApiError('Not authorized, token failed', 401);
    }
  }
);

export const protect = authenticate;

/**
 * Middleware to check if user is an admin
 * Must be used after the authenticate/protect middleware
 */
export const admin = (req: Request, _res: Response, next: NextFunction) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    throw new ApiError('Not authorized as an admin', 403);
  }
};
