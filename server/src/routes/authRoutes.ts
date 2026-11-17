import express, { Request, Response } from 'express';
import { asyncHandler } from '../utils/errorHandler';
import {
  getActiveConfig,
  readSingleHeader,
  upsertEntraUser,
} from '../middleware/authMiddleware';

const router = express.Router();

/**
 * @desc    Return active authentication mode and (in entra mode when authenticated) owner profile
 * @route   GET /api/auth/mode
 * @access  Public
 */
router.get(
  '/mode',
  asyncHandler(async (req: Request, res: Response) => {
    const activeConfig = getActiveConfig(req);

    if (activeConfig.authMode === 'entra') {
      const oid = readSingleHeader(req, 'x-ms-client-principal-id');
      if (oid && oid === activeConfig.ownerOid) {
        const principalName = readSingleHeader(req, 'x-ms-client-principal-name');
        const owner = await upsertEntraUser(oid, principalName);
        res.json({
          success: true,
          data: {
            mode: 'entra',
            user: owner
              ? {
                  _id: owner._id,
                  username: owner.username,
                  email: owner.email,
                  isAdmin: owner.isAdmin,
                }
              : null,
          },
        });
        return;
      }

      res.json({
        success: true,
        data: {
          mode: 'entra',
          user: null,
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        mode: 'local',
        user: null,
      },
    });
  })
);

export default router;
