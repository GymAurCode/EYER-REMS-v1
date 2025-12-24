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
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    // Log auth details for debugging
    console.log('Auth Debug:', {
      endpoint: `${req.method} ${req.path}`,
      hasAuthHeader: !!authHeader,
      hasToken: !!token,
      tokenLength: token?.length || 0,
      userAgent: req.headers['user-agent']?.substring(0, 50)
    });

    if (!authHeader) {
      console.log('❌ Auth failed: No Authorization header');
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Missing Authorization header. Please include "Authorization: Bearer <token>" in your request.',
        code: 'MISSING_AUTH_HEADER'
      });
    }

    if (!token || token.trim() === '') {
      console.log('❌ Auth failed: Empty token');
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Authorization header is malformed. Expected format: "Bearer <token>"',
        code: 'MALFORMED_AUTH_HEADER'
      });
    }

    const decoded = verifyToken(token) as any;
    
    if (!decoded || !decoded.userId) {
      console.log('❌ Auth failed: Invalid token decode');
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'The provided token is invalid, expired, or malformed. Please log in again.',
        code: 'INVALID_TOKEN'
      });
    }

    // Get user with role
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { role: true },
    });

    if (!user) {
      console.log('❌ Auth failed: User not found for ID:', decoded.userId);
      return res.status(401).json({ 
        error: 'User not found',
        message: 'The user associated with this token no longer exists. Please log in again.',
        code: 'USER_NOT_FOUND'
      });
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

    console.log('✅ Auth success:', {
      userId: user.id,
      username: user.username,
      role: user.role?.name,
      permissionCount: (user.role?.permissions as string[])?.length || 0
    });

    next();
  } catch (error: any) {
    console.log('❌ Auth error:', error.message);
    return res.status(401).json({ 
      error: 'Invalid token',
      message: 'Token verification failed. Please log in again.',
      code: 'TOKEN_VERIFICATION_FAILED',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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
    // Log permission check details
    console.log('Permission Debug:', {
      endpoint: `${req.method} ${req.path}`,
      requiredPermission: permission,
      hasUser: !!req.user,
      userId: req.user?.id,
      userRole: req.user?.role?.name,
      userPermissions: req.user?.role?.permissions || []
    });

    if (!req.user) {
      console.log('❌ Permission failed: No user in request (auth middleware not run?)');
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'User authentication is required to access this resource.',
        code: 'NO_USER_CONTEXT'
      });
    }

    if (!req.user.role || !req.user.role.permissions) {
      console.log('❌ Permission failed: User has no role or permissions');
      return res.status(403).json({ 
        error: 'No permissions assigned',
        message: `Your account (${req.user.username}) has no role or permissions assigned. Please contact an administrator.`,
        code: 'NO_ROLE_OR_PERMISSIONS',
        user: {
          id: req.user.id,
          username: req.user.username,
          role: req.user.role?.name || 'No role assigned'
        }
      });
    }

    const hasRequiredPermission = hasPermission(req.user.role.permissions, permission);
    
    if (!hasRequiredPermission) {
      console.log('❌ Permission denied:', {
        user: req.user.username,
        role: req.user.role.name,
        required: permission,
        available: req.user.role.permissions
      });
      
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `Access denied. Your role (${req.user.role.name}) does not have the required permission: ${permission}`,
        code: 'INSUFFICIENT_PERMISSIONS',
        required: permission,
        user: {
          id: req.user.id,
          username: req.user.username,
          role: req.user.role.name,
          permissions: req.user.role.permissions
        }
      });
    }

    console.log('✅ Permission granted:', {
      user: req.user.username,
      permission: permission
    });

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

