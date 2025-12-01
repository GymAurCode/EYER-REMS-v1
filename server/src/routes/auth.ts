import express from 'express';
import { z } from 'zod';
import prisma from '../prisma/client';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { extractDeviceInfo } from '../utils/deviceInfo';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Validation schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  deviceId: z.string().optional(),
});

const roleLoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  deviceId: z.string().optional(),
});

const inviteLoginSchema = z.object({
  token: z.string(),
  password: z.string().min(6),
  username: z.string().optional(),
  deviceId: z.string().optional(),
});

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { email, password, deviceId: clientDeviceId } = loginSchema.parse(req.body);

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is Admin
    if (user.role.name !== 'Admin') {
      return res.status(403).json({ error: 'Only Admin can login directly' });
    }

    // Verify password
    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Extract device info and use client deviceId if provided
    const deviceInfo = extractDeviceInfo(req);
    const finalDeviceId = clientDeviceId || deviceInfo.deviceId;
    
    // Update deviceInfo with the final deviceId
    const updatedDeviceInfo = {
      ...deviceInfo,
      deviceId: finalDeviceId,
    };

    // Generate token with deviceId
    const token = generateToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      roleId: user.roleId,
      deviceId: finalDeviceId,
    });

    return res.json({
      token,
      deviceId: finalDeviceId,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role.name,
        roleId: user.roleId,
        permissions: user.role.permissions, // Include permissions
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Login error:', error);
    
    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Login failed';
    const errorDetails = process.env.NODE_ENV === 'development' 
      ? { message: errorMessage, stack: error instanceof Error ? error.stack : undefined }
      : { message: 'Login failed. Please check your credentials and try again.' };
    
    res.status(500).json({ 
      error: 'Login failed',
      details: errorDetails
    });
  }
});

// Role login (username-based login for non-admin roles)
router.post('/role-login', async (req, res) => {
  try {
    const { username, password, deviceId: clientDeviceId } = roleLoginSchema.parse(req.body);

    // Find user by username
    const user = await prisma.user.findUnique({
      where: { username },
      include: { role: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is Admin - Admin should use regular login
    if (user.role.name === 'Admin' || user.role.name === 'admin') {
      return res.status(403).json({ error: 'Admin users must use the admin login page' });
    }

    // Verify password
    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Extract device info and use client deviceId if provided
    const deviceInfo = extractDeviceInfo(req);
    const finalDeviceId = clientDeviceId || deviceInfo.deviceId;

    // Generate token with deviceId
    const jwtToken = generateToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      roleId: user.roleId,
      deviceId: finalDeviceId,
    });

    // Create login notification for all admin users
    const adminUsers = await prisma.user.findMany({
      where: {
        role: {
          name: 'Admin',
        },
      },
    });

    // Get current date and time
    const loginTime = new Date();
    const formattedTime = loginTime.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    // Create notifications for all admins about role login
    await Promise.all(
      adminUsers.map((admin: any) =>
        prisma.notification.create({
          data: {
            userId: admin.id,
            title: 'Role User Login',
            message: `${user.role.name} user "${user.username}" logged in at ${formattedTime}`,
            type: 'info',
          },
        })
      )
    );

    return res.json({
      token: jwtToken,
      deviceId: finalDeviceId,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role.name,
        roleId: user.roleId,
        permissions: user.role.permissions, // Include permissions
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors);
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors,
        message: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      });
    }
    console.error('Role login error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Role login failed';
    const errorDetails = process.env.NODE_ENV === 'development'
      ? { message: errorMessage, stack: error instanceof Error ? error.stack : undefined }
      : { message: 'Role login failed. Please check your credentials and try again.' };
    
    res.status(500).json({ 
      error: 'Role login failed',
      details: errorDetails
    });
  }
});

// Invite link login
router.post('/invite-login', async (req, res) => {
  try {
    const { token, password, username: providedUsername, deviceId: clientDeviceId } = inviteLoginSchema.parse(req.body);

    // Find invite link
    const inviteLink = await prisma.roleInviteLink.findUnique({
      where: { token },
      include: { role: true },
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
        await prisma.roleInviteLink.update({
          where: { id: inviteLink.id },
          data: { status: 'expired' },
        });
        return res.status(400).json({ error: 'Invite link expired' });
      }
    }

    // Verify username if provided
    if (providedUsername && providedUsername !== inviteLink.username) {
      return res.status(401).json({ error: 'Invalid username' });
    }

    // Verify password
    const isValid = await comparePassword(password, inviteLink.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email: inviteLink.email },
      include: { role: true },
    });

    if (user) {
      // Update existing user
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          password: inviteLink.password, // Already hashed
          roleId: inviteLink.roleId,
        },
        include: { role: true },
      });
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          username: inviteLink.username,
          email: inviteLink.email,
          password: inviteLink.password, // Already hashed
          roleId: inviteLink.roleId,
        },
        include: { role: true },
      });
    }

    // Mark invite link as used
    await prisma.roleInviteLink.update({
      where: { id: inviteLink.id },
      data: { status: 'used' },
    });

    // Extract device info and use client deviceId if provided
    const deviceInfo = extractDeviceInfo(req);
    const finalDeviceId = (clientDeviceId as string | undefined) || deviceInfo.deviceId;
    
    // Generate token with deviceId
    const jwtToken = generateToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      roleId: user.roleId,
      deviceId: finalDeviceId,
    });

    // Create login notification for all admin users (only for role-based users, not admin)
    if (user.role.name !== 'Admin' && user.role.name !== 'admin') {
      const adminUsers = await prisma.user.findMany({
        where: {
          role: {
            name: 'Admin',
          },
        },
      });

      // Get current date and time
      const loginTime = new Date();
      const formattedTime = loginTime.toLocaleString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      // Create notifications for all admins about role login
      await Promise.all(
        adminUsers.map((admin: any) =>
          prisma.notification.create({
            data: {
              userId: admin.id,
              title: 'Role User Login',
              message: `${user.role.name} user "${user.username}" logged in at ${formattedTime}`,
              type: 'info',
            },
          })
        )
      );
    }

    return res.json({
      token: jwtToken,
      deviceId: finalDeviceId,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role.name,
        roleId: user.roleId,
        permissions: user.role.permissions, // Include permissions
      },
      message: inviteLink.message || `Welcome! Your role is ${user.role.name}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors);
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors,
        message: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      });
    }
    console.error('Invite login error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    const errorMessage = error instanceof Error ? error.message : 'Invite login failed';
    const errorDetails = process.env.NODE_ENV === 'development'
      ? { message: errorMessage, stack: error instanceof Error ? error.stack : undefined }
      : { message: 'Invite login failed. Please check your credentials and try again.' };
    
    res.status(500).json({ 
      error: 'Invite login failed',
      details: errorDetails
    });
  }
});

// Get current user
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { role: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role.name,
      roleId: user.roleId,
      permissions: user.role.permissions, // Include permissions
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

export default router;

