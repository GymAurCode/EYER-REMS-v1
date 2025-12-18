import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../prisma/client';
import logger from '../utils/logger';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    email: string;
    roleId: string;
  };
  // Explicitly include Request properties to ensure type resolution
  params: any;
  body: any;
  query: any;
  headers: any;
  method?: string;
  path?: string;
  cookies?: any;
  file?: any;
  files?: any;
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
      logger.warn('Authentication failed: No token provided', {
        path: req.path,
        method: req.method,
      });
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    // SECURITY: Require JWT_SECRET in production
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      if (process.env.NODE_ENV === 'production') {
        logger.error('JWT_SECRET not set in production');
        res.status(500).json({ error: 'Server configuration error' });
        return;
      }
      logger.warn('⚠️  WARNING: JWT_SECRET not set. Using default for development only.');
    }
    
    let decoded: {
      userId: string;
      username: string;
      email: string;
      roleId: string;
      deviceId?: string;
    };
    
    try {
      decoded = jwt.verify(token, jwtSecret || 'CHANGE-THIS-IN-PRODUCTION-DEVELOPMENT-ONLY') as {
        userId: string;
        username: string;
        email: string;
        roleId: string;
        deviceId?: string;
      };
    } catch (jwtError: any) {
      logger.warn('JWT verification failed', {
        path: req.path,
        method: req.method,
        error: jwtError?.message || 'Unknown JWT error',
        name: jwtError?.name,
      });
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    // Verify user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, username: true, email: true, roleId: true, deviceApprovalStatus: true },
    });

    if (!user) {
      logger.warn('Authentication failed: User not found', {
        path: req.path,
        method: req.method,
        userId: decoded.userId,
      });
      res.status(401).json({ error: 'User not found' });
      return;
    }

    // Validate deviceId if present in token
    if (decoded.deviceId && requestDeviceId) {
      if (decoded.deviceId !== requestDeviceId) {
        logger.warn('Device ID mismatch', {
          path: req.path,
          method: req.method,
          tokenDeviceId: decoded.deviceId,
          requestDeviceId,
        });
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
  } catch (error: any) {
    logger.error('Authentication error:', {
      error: error?.message || 'Unknown error',
      stack: error?.stack,
      name: error?.name,
      path: req.path,
      method: req.method,
    });
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
    logger.error('Error checking admin status:', error);
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

