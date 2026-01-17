/**
 * Permission Service - Production-Grade Action-Based Permission System
 * 
 * CRITICAL RULES:
 * - No wildcards at runtime
 * - Deny by default
 * - Explicit allow required
 * - Admin must pass explicit checks (no bypass)
 * - Silent refusal preferred over errors
 */

import prisma from '../../prisma/client';
import logger from '../../utils/logger';

export interface PermissionPath {
  module: string;
  submodule?: string;
  action: string;
}

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  permissionPath?: string;
}

/**
 * Parse permission string into structured path
 * Format: "module.submodule.action" or "module.action"
 */
export function parsePermission(permission: string): PermissionPath | null {
  const parts = permission.split('.');
  
  if (parts.length < 2 || parts.length > 3) {
    return null;
  }

  if (parts.length === 2) {
    return {
      module: parts[0],
      action: parts[1],
    };
  }

  return {
    module: parts[0],
    submodule: parts[1],
    action: parts[2],
  };
}

/**
 * Build permission path string from components
 */
export function buildPermissionPath(module: string, submodule: string | undefined, action: string): string {
  if (submodule) {
    return `${module}.${submodule}.${action}`;
  }
  return `${module}.${action}`;
}

/**
 * Standard actions available across all modules
 */
export const STANDARD_ACTIONS = [
  'view',
  'create',
  'edit',
  'delete',
  'approve',
  'export',
] as const;

/**
 * Restricted actions (require explicit grant, OFF by default)
 */
export const RESTRICTED_ACTIONS = [
  'override', // For AI, Finance, Audit modules
] as const;

/**
 * Check if user has explicit permission
 * NO WILDCARDS - Explicit grants only
 */
export async function checkPermission(
  roleId: string,
  permission: string
): Promise<PermissionCheckResult> {
  try {
    const parsed = parsePermission(permission);
    if (!parsed) {
      logger.warn(`Invalid permission format: ${permission}`);
      return {
        allowed: false,
        reason: 'Invalid permission format',
        permissionPath: permission,
      };
    }

    // Get role with permissions
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        rolePermissions: {
          where: {
            module: parsed.module,
            submodule: parsed.submodule ?? null,
            action: parsed.action,
            granted: true,
          },
        },
      },
    });

    if (!role) {
      return {
        allowed: false,
        reason: 'Role not found',
        permissionPath: permission,
      };
    }

    // Check explicit permission
    const hasExplicitPermission = role.rolePermissions.length > 0;

    if (hasExplicitPermission) {
      return {
        allowed: true,
        permissionPath: permission,
      };
    }

    // Deny by default - no explicit grant found
    return {
      allowed: false,
      reason: 'No explicit permission granted',
      permissionPath: permission,
    };
  } catch (error: any) {
    logger.error(`Permission check error: ${error.message}`, error);
    // Fail closed - deny on error
    return {
      allowed: false,
      reason: 'Permission check failed',
      permissionPath: permission,
    };
  }
}

/**
 * Check if user has any of the required permissions
 */
export async function checkAnyPermission(
  roleId: string,
  permissions: string[]
): Promise<PermissionCheckResult> {
  for (const permission of permissions) {
    const result = await checkPermission(roleId, permission);
    if (result.allowed) {
      return result;
    }
  }

  return {
    allowed: false,
    reason: 'None of the required permissions granted',
  };
}

/**
 * Get all permissions for a role
 */
export async function getRolePermissions(roleId: string): Promise<RolePermission[]> {
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: {
      rolePermissions: {
        orderBy: [
          { module: 'asc' },
          { submodule: 'asc' },
          { action: 'asc' },
        ],
      },
    },
  });

  return role?.rolePermissions || [];
}

/**
 * Grant permission to role
 */
export async function grantPermission(
  roleId: string,
  module: string,
  submodule: string | undefined,
  action: string,
  actorId: string
): Promise<void> {
  // Build where clause - Prisma's compound unique constraint handles null properly
  // but TypeScript types are strict, so we use type assertion
  await prisma.rolePermission.upsert({
    where: {
      roleId_module_submodule_action: {
        roleId,
        module,
        // @ts-ignore - Prisma's generated types don't properly handle nullable fields in compound unique constraints
        submodule: submodule ?? null,
        action,
      },
    },
    create: {
      roleId,
      module,
      submodule: submodule ?? null,
      action,
      granted: true,
      createdBy: actorId,
    },
    update: {
      granted: true,
      createdBy: actorId,
    },
  });
}

/**
 * Revoke permission from role
 */
export async function revokePermission(
  roleId: string,
  module: string,
  submodule: string | undefined,
  action: string,
  actorId: string
): Promise<void> {
  await prisma.rolePermission.updateMany({
    where: {
      roleId,
      module,
      submodule: submodule ?? null,
      action,
    },
    data: {
      granted: false,
      createdBy: actorId,
    },
  });
}

/**
 * Bulk grant/revoke permissions
 */
export async function bulkUpdatePermissions(
  roleId: string,
  permissions: Array<{
    module: string;
    submodule?: string;
    action: string;
    granted: boolean;
  }>,
  actorId: string
): Promise<void> {
  try {
    // Use a transaction to ensure atomicity and avoid issues with nullable fields in compound unique constraints
    await prisma.$transaction(
      async (tx) => {
        for (const perm of permissions) {
          try {
            // Normalize submodule: convert empty string or undefined to null
            const submoduleValue: string | null = 
              perm.submodule && perm.submodule.trim() !== '' 
                ? perm.submodule.trim() 
                : null;
            
            const permPath = submoduleValue
              ? `${perm.module}.${submoduleValue}.${perm.action}`
              : `${perm.module}.${perm.action}`;
            
            // Find existing permission using the compound unique constraint fields
            const existing = await tx.rolePermission.findFirst({
              where: {
                roleId,
                module: perm.module,
                submodule: submoduleValue,
                action: perm.action,
              },
            });
            
            if (existing) {
              // Update existing permission
              await tx.rolePermission.update({
                where: { id: existing.id },
                data: {
                  granted: perm.granted,
                  createdBy: actorId,
                },
              });
            } else {
              // Create new permission
              await tx.rolePermission.create({
                data: {
                  roleId,
                  module: perm.module,
                  submodule: submoduleValue,
                  action: perm.action,
                  granted: perm.granted,
                  createdBy: actorId,
                },
              });
            }
          } catch (permError: any) {
            // Log the specific permission that failed with detailed error info
            const permPath = perm.submodule 
              ? `${perm.module}.${perm.submodule}.${perm.action}`
              : `${perm.module}.${perm.action}`;
            const errorDetails = {
              message: permError?.message,
              code: permError?.code,
              meta: permError?.meta,
              stack: permError?.stack,
              permission: perm,
              roleId,
              actorId,
            };
            logger.error(`Failed to update permission ${permPath} for role ${roleId}:`, errorDetails);
            throw new Error(`Failed to update permission ${permPath}: ${permError?.message || 'Database error'} (Code: ${permError?.code || 'UNKNOWN'})`);
          }
        }
      },
      {
        maxWait: 5000, // Maximum time to wait for a transaction slot
        timeout: 10000, // Maximum time the transaction can run
      }
    );
  } catch (error: any) {
    const errorDetails = {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack,
      permissionsCount: permissions.length,
      roleId,
      actorId,
    };
    logger.error(`Bulk update permissions failed for role ${roleId}:`, errorDetails);
    throw error;
  }
}

/**
 * Generate all possible permissions for a module
 */
export function generateModulePermissions(module: string, submodules?: string[]): string[] {
  const permissions: string[] = [];

  // Standard actions at module level
  STANDARD_ACTIONS.forEach((action) => {
    permissions.push(buildPermissionPath(module, undefined, action));
  });

  // Submodule permissions
  if (submodules) {
    submodules.forEach((submodule) => {
      STANDARD_ACTIONS.forEach((action) => {
        permissions.push(buildPermissionPath(module, submodule, action));
      });
    });
  }

  return permissions;
}

/**
 * Get all available modules and their permissions
 */
export function getAllAvailablePermissions(): Record<string, string[]> {
  return {
    finance: generateModulePermissions('finance', ['transactions', 'reports', 'vouchers', 'journal']),
    properties: generateModulePermissions('properties', ['units', 'leases', 'maintenance']),
    hr: generateModulePermissions('hr', ['employees', 'payroll', 'attendance', 'leave']),
    crm: generateModulePermissions('crm', ['leads', 'clients', 'deals', 'communications']),
    construction: generateModulePermissions('construction', ['projects', 'milestones', 'budgets']),
    tenants: generateModulePermissions('tenants', ['payments', 'leases', 'maintenance']),
    ai: [
      ...generateModulePermissions('ai', ['intelligence', 'assistant']),
      'ai.intelligence.override_decision',
      'ai.intelligence.view_explanations',
    ],
    audit: [
      ...generateModulePermissions('audit', ['logs', 'reports']),
      'audit.logs.view',
    ],
    permissions: [
      'permissions.view',
      'permissions.inspect', // Read-only permission inspection
    ],
  };
}

// Type helper for RolePermission
type RolePermission = {
  id: string;
  roleId: string;
  module: string;
  submodule: string | null;
  action: string;
  granted: boolean;
  createdAt: Date;
  createdBy: string | null;
};
