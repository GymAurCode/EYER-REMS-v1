import express from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import prisma from '../prisma/client';
import { hashPassword } from '../utils/password';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Validation schemas
const createRoleSchema = z.object({
  name: z.string().min(1),
  permissions: z.array(z.string()),
});

const generateInviteLinkSchema = z.object({
  roleId: z.string().uuid(),
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  message: z.string().optional(),
  expiresInDays: z.number().optional().default(7),
});

// Get all roles
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const roles = await prisma.role.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        permissions: true,
        defaultPassword: true, // Include defaultPassword for admin to see if password is set
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            users: true,
            inviteLinks: true,
          },
        },
      } as any, // Type assertion until Prisma client is regenerated
    });

    res.json(roles);
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// Get role by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const role = await prisma.role.findUnique({
      where: { id: req.params.id },
      include: {
        _count: {
          select: {
            users: true,
            inviteLinks: true,
          },
        },
      },
    });

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    res.json(role);
  } catch (error) {
    console.error('Get role error:', error);
    res.status(500).json({ error: 'Failed to fetch role' });
  }
});

// Create role with user (Admin only)
router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    // Preprocess phoneNumber - convert empty string to undefined
    const body = { ...req.body };
    if (body.phoneNumber === '' || !body.phoneNumber) {
      delete body.phoneNumber;
    }
    
    const schema = z.object({
      name: z.string().min(1, 'Role name is required'),
      permissions: z.array(z.string()).optional(),
      username: z.string().min(1, 'Username is required'),
      email: z.string().email('Invalid email format'),
      password: z.string().min(6, 'Password must be at least 6 characters'),
      phoneNumber: z.string().optional(),
    });
    
    const parsed = schema.parse(body);
    const { name, permissions, username, email, password, phoneNumber } = parsed;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username },
        ],
      },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email or username already exists' });
    }

    // Check if role already exists
    let role = await prisma.role.findUnique({
      where: { name },
    });

    // Hash password
    const hashedPassword = await hashPassword(password);

    // If role doesn't exist, create it
    if (!role) {
      // Default permissions if not provided
      const defaultPermissions = permissions || [];

      role = await prisma.role.create({
        data: {
          name,
          permissions: defaultPermissions,
          defaultPassword: hashedPassword, // Store the password with the role
          createdBy: req.user!.id,
        } as any, // Type assertion until Prisma client is regenerated
      });
    } else {
      // If role exists, update its default password
      role = await prisma.role.update({
        where: { id: role.id },
        data: {
          defaultPassword: hashedPassword, // Update the default password
        } as any, // Type assertion until Prisma client is regenerated
      });
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        roleId: role.id,
      },
      include: {
        role: true,
      },
    });

    res.status(201).json({
      role,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role.name,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors);
      console.error('Request body:', req.body);
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors,
        message: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      });
    }
    console.error('Create role error:', error);
    res.status(500).json({ error: 'Failed to create role' });
  }
});

// Update role (Admin only)
router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { permissions } = createRoleSchema.partial().extend({
      permissions: z.array(z.string()).optional(),
    }).parse(req.body);

    const role = await prisma.role.findUnique({
      where: { id: req.params.id },
    });

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Don't allow updating Admin role
    if (role.name === 'Admin') {
      return res.status(403).json({ error: 'Cannot update Admin role' });
    }

    const updatedRole = await prisma.role.update({
      where: { id: req.params.id },
      data: {
        ...(permissions && { permissions }),
      },
    });

    res.json(updatedRole);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// Generate invite link (Admin only)
router.post('/generate-invite', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    // Preprocess and validate
    const body = { ...req.body };
    
    // Preprocess body - remove empty strings for optional fields
    const processedBody = {
      ...body,
      password: body.password && body.password.trim() ? body.password.trim() : undefined,
      message: body.message && body.message.trim() ? body.message.trim() : undefined,
    };
    
    const schema = z.object({
      roleId: z.string().uuid('Invalid role ID'),
      username: z.string().min(3, 'Username must be at least 3 characters'),
      email: z.string().email('Invalid email format'),
      password: z.string().min(6, 'Password must be at least 6 characters').optional(),
      message: z.string().optional(),
      expiresInDays: z.number().optional().default(7),
    });
    
    const { roleId, username, email, password: providedPassword, message, expiresInDays } = schema.parse(processedBody);

    // Check if role exists
    const role = await prisma.role.findUnique({
      where: { id: roleId },
    }) as any; // Type assertion until Prisma client is regenerated

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Check if there's a pending invite for this email
    // If exists, update it instead of creating a new one
    const existingInvite = await prisma.roleInviteLink.findFirst({
      where: {
        email,
        status: 'pending',
      },
    });

    // Note: We allow generating invite links for existing users
    // The invite link can be used to update the user's role or reset their password
    
    // Use provided password or role's default password
    let hashedPassword: string;
    let plainPasswordForAutoFill: string | null = null; // Store plain password temporarily for auto-fill
    
    if (providedPassword) {
      // Hash the provided password
      hashedPassword = await hashPassword(providedPassword);
      plainPasswordForAutoFill = providedPassword; // Store for auto-fill
    } else if (role.defaultPassword) {
      // Use the role's default password (already hashed)
      hashedPassword = role.defaultPassword;
      // Can't retrieve plain password from hash, so we'll indicate to use role default
      plainPasswordForAutoFill = null; // Will be handled on frontend
    } else {
      // Fallback: If role doesn't have defaultPassword, use the first user's password from that role
      const firstUser = await prisma.user.findFirst({
        where: { roleId: role.id },
        select: { password: true },
      });
      
      if (firstUser) {
        // Use the first user's password (already hashed)
        hashedPassword = firstUser.password;
        
        // Also update the role to set this as the default password for future use
        await prisma.role.update({
          where: { id: role.id },
          data: {
            defaultPassword: hashedPassword,
          } as any,
        });
      } else {
        return res.status(400).json({ 
          error: 'Password is required', 
          message: `The role "${role.name}" does not have a default password set and has no users. Please create a user for this role first, or provide a password when generating the invite link.`,
          requiresPassword: true 
        });
      }
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (expiresInDays || 7));

    let inviteLink;
    
    if (existingInvite) {
      // Update existing pending invite
      inviteLink = await prisma.roleInviteLink.update({
        where: { id: existingInvite.id },
        data: {
          roleId,
          username,
          email,
          password: hashedPassword,
          message: message || `Welcome! Your role is ${role.name}`,
          token,
          expiresAt,
        },
        include: {
          role: true,
        },
      });
    } else {
      // Create new invite link
      inviteLink = await prisma.roleInviteLink.create({
        data: {
          roleId,
          username,
          email,
          password: hashedPassword,
          message: message || `Welcome! Your role is ${role.name}`,
          token,
          expiresAt,
        },
        include: {
          role: true,
        },
      });
    }

    // Generate full invite URL - redirect to /roles/login instead of /invite-login
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const inviteUrl = `${frontendUrl}/roles/login?token=${token}`;
    
    res.status(201).json({
      ...inviteLink,
      inviteUrl,
      // Include plain password for auto-fill (only if provided, not if using role default)
      // This will be used to auto-fill password on the login page for first time use
      // Note: This is only sent when link is generated, frontend should store it temporarily
      tempPassword: plainPasswordForAutoFill || undefined, // Only include if password was provided
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors);
      console.error('Request body:', req.body);
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors,
        message: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      });
    }
    console.error('Generate invite link error:', error);
    console.error('Error details:', error);
    res.status(500).json({ error: 'Failed to generate invite link' });
  }
});

// Get invite link details by token (for auto-fill on login page)
router.get('/invite/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const inviteLink = await prisma.roleInviteLink.findUnique({
      where: { token },
      select: {
        id: true,
        username: true,
        email: true,
        status: true,
        expiresAt: true,
        role: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!inviteLink) {
      return res.status(404).json({ error: 'Invalid invite link' });
    }

    if (inviteLink.status !== 'pending') {
      return res.status(400).json({ error: 'Invite link already used or expired' });
    }

    // Check expiration
    if (inviteLink.expiresAt) {
      const expiresAt = new Date(inviteLink.expiresAt);
      if (expiresAt < new Date()) {
        return res.status(400).json({ error: 'Invite link expired' });
      }
    }

    // Return username and email for auto-fill (but not password for security)
    res.json({
      username: inviteLink.username,
      email: inviteLink.email,
      roleName: inviteLink.role.name,
    });
  } catch (error) {
    console.error('Get invite link error:', error);
    res.status(500).json({ error: 'Failed to fetch invite link' });
  }
});

// Get invite links for a role (Admin only)
router.get('/:id/invites', authenticate, requireAdmin, async (req, res) => {
  try {
    const inviteLinks = await prisma.roleInviteLink.findMany({
      where: { roleId: req.params.id },
      orderBy: { createdAt: 'desc' },
      include: {
        role: {
          select: {
            name: true,
          },
        },
      },
    });

    res.json(inviteLinks);
  } catch (error) {
    console.error('Get invite links error:', error);
    res.status(500).json({ error: 'Failed to fetch invite links' });
  }
});

// Get users by role (Admin only)
router.get('/:id/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { roleId: req.params.id },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(users);
  } catch (error) {
    console.error('Get users by role error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

export default router;

