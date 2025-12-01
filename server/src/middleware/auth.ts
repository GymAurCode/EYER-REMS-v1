import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../prisma/client';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    email: string;
    roleId: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const requestDeviceId = req.headers['x-device-id'] as string;

    if (!token) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    // SECURITY: Require JWT_SECRET in production
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      if (process.env.NODE_ENV === 'production') {
        res.status(500).json({ error: 'Server configuration error' });
        return;
      }
      console.warn('⚠️  WARNING: JWT_SECRET not set. Using default for development only.');
    }
    const decoded = jwt.verify(token, jwtSecret || 'CHANGE-THIS-IN-PRODUCTION-DEVELOPMENT-ONLY') as {
      userId: string;
      username: string;
      email: string;
      roleId: string;
      deviceId?: string;
    };

    // Verify user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, username: true, email: true, roleId: true, deviceApprovalStatus: true },
    });

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    // Validate deviceId if present in token
    if (decoded.deviceId && requestDeviceId) {
      if (decoded.deviceId !== requestDeviceId) {
        res.status(403).json({
          error: 'Device ID mismatch',
          message: 'Session device ID does not match request device ID',
        });
        return;
      }
    }

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      roleId: user.roleId,
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const role = await prisma.role.findUnique({
      where: { id: req.user.roleId },
    });

    // Case-insensitive check for Admin role
    const isAdmin = role?.name?.toLowerCase() === 'admin';

    if (!role || !isAdmin) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    next();
  } catch (error) {
    console.error('Error checking admin status:', error);
    res.status(500).json({ error: 'Error checking admin status' });
  }
};

export const checkPermission = (requiredPermission: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const role = await prisma.role.findUnique({
        where: { id: req.user.roleId },
      });

      if (!role) {
        res.status(403).json({ error: 'Role not found' });
        return;
      }

      const permissions = role.permissions as string[];
      if (!permissions.includes(requiredPermission) && role.name !== 'Admin') {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      next();
    } catch (error) {
      res.status(500).json({ error: 'Error checking permissions' });
    }
  };
};

