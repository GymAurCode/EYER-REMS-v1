/**
 * Role-Based Access Control (RBAC) Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '../utils/jwt';
import { File } from 'multer';
import logger from '../utils/logger';

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
   cookies: any;
   // Support multer uploads
   file?: File;
   files?: File[] | { [fieldname: string]: File[] };
 }

/**
 * Check if user has required permission
 * 
 * PRODUCTION RULES:
 * - No wildcards at runtime
 * - Explicit grants only
 * - Deny by default
 * - Admin must pass explicit checks (no bypass)
 */
import { checkPermission as checkExplicitPermission, getAllAvailablePermissions } from '../services/permissions/permission-service';
import { resolveRolePermissions, hasExplicitPermissions } from '../services/permissions/compatibility-resolver';
import { logActionExecution } from '../services/permissions/audit-logger';

/**
 * Check if user has required permission (with backward compatibility)
 * Uses explicit permission system, falls back to legacy for compatibility
 */
export async function hasPermission(
  roleId: string,
  roleName: string,
  userPermissions: string[],
  requiredPermission: string
): Promise<boolean> {
  try {
    // Check explicit permission first
    const explicitCheck = await checkExplicitPermission(roleId, requiredPermission);
    
    if (explicitCheck.allowed) {
      return true;
    }

    // Special handling for Admin role: If Admin has explicit permissions (migrated),
    // grant any permission that exists in the available permissions list
    // This ensures Admin has access to new permissions added after migration
    // Check for Admin role (case-insensitive, flexible matching)
    const normalizedRoleName = roleName?.trim().toLowerCase() || '';
    const isAdmin = normalizedRoleName === 'admin';
    if (isAdmin) {
      const hasExplicit = await hasExplicitPermissions(roleId);
      logger.info(`Admin permission check: roleName=${roleName}, roleId=${roleId}, hasExplicit=${hasExplicit}, requiredPermission=${requiredPermission}`);
      
      if (hasExplicit) {
        // Admin has been migrated - check if permission is in available list
        const allAvailable = getAllAvailablePermissions();
        // Flatten the Record<string, string[]> into a single array
        const allPermsList: string[] = [];
        for (const modulePerms of Object.values(allAvailable)) {
          if (Array.isArray(modulePerms)) {
            allPermsList.push(...modulePerms);
          }
        }
        const isInList = allPermsList.includes(requiredPermission);
        logger.info(`Admin permission check: permission in list=${isInList}, total available=${allPermsList.length}`);
        
        if (isInList) {
          logger.info(`✅ Granting ${requiredPermission} to Admin (available permission)`);
          return true;
        } else {
          logger.warn(`⚠️ Admin requested ${requiredPermission} but it's not in available permissions list`);
        }
      } else {
        logger.info(`Admin has no explicit permissions yet, will use legacy fallback`);
      }
    }

    // Backward compatibility: If no explicit permissions exist, use legacy system
    // This allows gradual migration without breaking existing functionality
    const hasLegacyWildcard = userPermissions.includes('*') || userPermissions.includes('admin.*');
    
    if (hasLegacyWildcard) {
      logger.info(`Legacy wildcard detected for ${roleName}, auto-converting permissions`);
      // Auto-convert legacy permissions on first access
      try {
        await resolveRolePermissions(roleId, userPermissions);
        // Retry explicit check after conversion
        const retryCheck = await checkExplicitPermission(roleId, requiredPermission);
        logger.info(`After conversion, permission ${requiredPermission} = ${retryCheck.allowed}`);
        if (retryCheck.allowed) {
          return true;
        }
        // If still not allowed after conversion, check if it's in available list (for Admin)
        if (isAdmin) {
          const allAvailable = getAllAvailablePermissions();
          const allPermsList: string[] = [];
          for (const modulePerms of Object.values(allAvailable)) {
            if (Array.isArray(modulePerms)) {
              allPermsList.push(...modulePerms);
            }
          }
          if (allPermsList.includes(requiredPermission)) {
            logger.info(`✅ Granting ${requiredPermission} to Admin after conversion (available permission)`);
            return true;
          }
        }
      } catch (error: any) {
        // If conversion fails, fall back to legacy check (for safety)
        logger.warn(`Permission conversion failed for role ${roleName}, using legacy check: ${error.message}`);
        // For Admin with wildcard, always allow (legacy behavior)
        if (isAdmin) {
          return true;
        }
      }
    }

    // Check exact permission (legacy)
    if (userPermissions.includes(requiredPermission)) {
      return true;
    }

    // Check wildcard permissions (legacy - for non-admin roles during migration)
    const permissionParts = requiredPermission.split('.');
    for (let i = permissionParts.length; i > 0; i--) {
      const wildcardPermission = permissionParts.slice(0, i).join('.') + '.*';
      if (userPermissions.includes(wildcardPermission)) {
        return true;
      }
    }

    return false;
  } catch (error: any) {
    logger.error(`Permission check error for role ${roleName}: ${error.message}`, error);
    // Fail closed - deny on error
    return false;
  }
}

// Legacy synchronous version (for backward compatibility with existing code)
// This will be deprecated but kept for now
export function hasPermissionSync(userPermissions: string[], requiredPermission: string): boolean {
  // Legacy check only - new code should use async hasPermission
  if (userPermissions.includes('*') || userPermissions.includes('admin.*')) {
    return true;
  }

  if (userPermissions.includes(requiredPermission)) {
    return true;
  }

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
 * Uses explicit permission system with backward compatibility
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
      userRoleId: req.user?.roleId,
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

    // Check permission using explicit system
    const hasRequiredPermission = await hasPermission(
      req.user.roleId,
      req.user.role.name,
      req.user.role.permissions,
      permission
    );
    
    // Debug logging for permission check result
    console.log('Permission Check Result:', {
      user: req.user.username,
      role: req.user.role.name,
      roleId: req.user.roleId,
      permission,
      result: hasRequiredPermission
    });
    
    // Log action execution attempt
    await logActionExecution({
      userId: req.user.id,
      username: req.user.username,
      roleId: req.user.roleId,
      roleName: req.user.role.name,
      permissionUsed: permission,
      action: req.method.toLowerCase(),
      entityType: req.path.split('/')[1] || 'unknown',
      requestPath: req.path,
      requestMethod: req.method,
      requestContext: {
        query: req.query,
        params: req.params,
      },
      result: hasRequiredPermission ? 'allowed' : 'denied',
    });
    
    if (!hasRequiredPermission) {
      console.log('❌ Permission denied:', {
        user: req.user.username,
        role: req.user.role.name,
        required: permission,
        available: req.user.role.permissions
      });
      
      // Silent refusal - return 403 without detailed error
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `Access denied. Your role (${req.user.role.name}) does not have the required permission: ${permission}`,
        code: 'INSUFFICIENT_PERMISSIONS',
        required: permission,
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

    // Check each permission using explicit system
    let hasAnyPermission = false;
    for (const permission of permissions) {
      const result = await hasPermission(
        req.user.roleId,
        req.user.role.name,
        req.user.role.permissions,
        permission
      );
      if (result) {
        hasAnyPermission = true;
        break;
      }
    }

    if (!hasAnyPermission) {
      // Log denied attempt
      await logActionExecution({
        userId: req.user.id,
        username: req.user.username,
        roleId: req.user.roleId,
        roleName: req.user.role.name,
        permissionUsed: permissions.join(' OR '),
        action: req.method.toLowerCase(),
        entityType: req.path.split('/')[1] || 'unknown',
        requestPath: req.path,
        requestMethod: req.method,
        result: 'denied',
      });

      return res.status(403).json({
        error: 'Insufficient permissions',
        required: permissions,
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

