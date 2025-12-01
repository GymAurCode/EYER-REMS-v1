/**
 * Role-Based Access Control (RBAC) Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '../utils/jwt';

const prisma = new PrismaClient();

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    email: string;
    roleId: string;
    role?: {
      id: string;
      name: string;
      permissions: string[];
    };
  };
}

/**
 * Check if user has required permission
 */
export function hasPermission(userPermissions: string[], requiredPermission: string): boolean {
  // Admin has all permissions
  if (userPermissions.includes('*') || userPermissions.includes('admin.*')) {
    return true;
  }

  // Check exact permission
  if (userPermissions.includes(requiredPermission)) {
    return true;
  }

  // Check wildcard permissions (e.g., 'properties.*' matches 'properties.create')
  const permissionParts = requiredPermission.split('.');
  for (let i = permissionParts.length; i > 0; i--) {
    const wildcardPermission = permissionParts.slice(0, i).join('.') + '.*';
    if (userPermissions.includes(wildcardPermission)) {
      return true;
    }
  }

  return false;
}

/**
 * Middleware to require authentication
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = verifyToken(token) as any;
    
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user with role
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { role: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      roleId: user.roleId,
      role: user.role ? {
        id: user.role.id,
        name: user.role.name,
        permissions: (user.role.permissions as string[]) || [],
      } : undefined,
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * Middleware to require specific permission
 */
export function requirePermission(permission: string) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!req.user.role || !req.user.role.permissions) {
      return res.status(403).json({ error: 'No permissions assigned' });
    }

    if (!hasPermission(req.user.role.permissions, permission)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: permission,
        userPermissions: req.user.role.permissions,
      });
    }

    next();
  };
}

/**
 * Middleware to require one of multiple permissions
 */
export function requireAnyPermission(permissions: string[]) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!req.user.role || !req.user.role.permissions) {
      return res.status(403).json({ error: 'No permissions assigned' });
    }

    const hasAnyPermission = permissions.some(permission =>
      hasPermission(req.user!.role!.permissions, permission)
    );

    if (!hasAnyPermission) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: permissions,
        userPermissions: req.user.role.permissions,
      });
    }

    next();
  };
}

/**
 * Middleware to require admin role
 */
export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!req.user.role || req.user.role.name !== 'Admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
}

