import express, { Response, Request } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import prisma from '../prisma/client';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { extractDeviceInfo } from '../utils/deviceInfo';
import { authenticate, AuthRequest } from '../middleware/auth';
import { generateTokenPair, revokeAllUserRefreshTokens } from '../utils/refresh-token';
import { generateCsrfToken } from '../middleware/csrf';
import logger from '../utils/logger';

const router = (express as any).Router();

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

// Test route to verify auth routes are working
router.get('/login', (_req: Request, res: Response) => {
  res.json({ 
    message: 'Auth route is working. Use POST method to login.',
    endpoint: '/api/auth/login',
    method: 'POST',
    requiredFields: ['email', 'password']
  });
});

// Admin login
router.post('/login', async (req: Request, res: Response) => {
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

    // Generate access and refresh token pair
    const { accessToken, refreshToken } = await generateTokenPair({
      userId: user.id,
      username: user.username,
      email: user.email,
      roleId: user.roleId,
      deviceId: finalDeviceId,
    });

    // Generate CSRF token
    const sessionId = crypto.randomBytes(16).toString('hex');
    const csrfToken = await generateCsrfToken(sessionId, finalDeviceId, user.id);

    return res.json({
      token: accessToken,
      refreshToken,
      csrfToken,
      sessionId,
      deviceId: finalDeviceId,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role.name,
        roleId: user.roleId,
        permissions: user.role.permissions || [], // Include permissions, default to empty array if null
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    
    // Log full error details for debugging
    logger.error('Login error:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Unknown',
    });
    
    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Login failed';
    const errorDetails = process.env.NODE_ENV === 'development' 
      ? { 
          message: errorMessage, 
          stack: error instanceof Error ? error.stack : undefined,
          name: error instanceof Error ? error.name : 'Unknown',
        }
      : { message: 'Login failed. Please check your credentials and try again.' };
    
    // Always include error message in response for debugging
    const response: any = { 
      error: 'Login failed',
      message: errorMessage,
    };
    
    // Include details in development
    if (process.env.NODE_ENV === 'development') {
      response.details = errorDetails;
      response.stack = error instanceof Error ? error.stack : undefined;
    }
    
    res.status(500).json(response);
  }
});

// Role login (username-based login for non-admin roles)
router.post('/role-login', async (req: Request, res: Response) => {
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

    // Generate access and refresh token pair
    const { accessToken, refreshToken } = await generateTokenPair({
      userId: user.id,
      username: user.username,
      email: user.email,
      roleId: user.roleId,
      deviceId: finalDeviceId,
    });

    // Generate CSRF token
    const sessionId = crypto.randomBytes(16).toString('hex');
    const csrfToken = await generateCsrfToken(sessionId, finalDeviceId, user.id);

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
      token: accessToken,
      refreshToken,
      csrfToken,
      sessionId,
      deviceId: finalDeviceId,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role.name,
        roleId: user.roleId,
        permissions: user.role.permissions || [], // Include permissions, default to empty array if null
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Validation error:', error.errors);
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors,
        message: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      });
    }
    logger.error('Role login error:', error);
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
router.post('/invite-login', async (req: Request, res: Response) => {
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
    
    // Generate access and refresh token pair
    const { accessToken, refreshToken } = await generateTokenPair({
      userId: user.id,
      username: user.username,
      email: user.email,
      roleId: user.roleId,
      deviceId: finalDeviceId,
    });

    // Generate CSRF token
    const sessionId = crypto.randomBytes(16).toString('hex');
    const csrfToken = await generateCsrfToken(sessionId, finalDeviceId, user.id);

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
      token: accessToken,
      refreshToken,
      csrfToken,
      sessionId,
      deviceId: finalDeviceId,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role.name,
        roleId: user.roleId,
        permissions: user.role.permissions || [], // Include permissions, default to empty array if null
      },
      message: inviteLink.message || `Welcome! Your role is ${user.role.name}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Validation error:', error.errors);
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors,
        message: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      });
    }
    logger.error('Invite login error:', error);
    logger.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
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
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
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
    logger.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Refresh token endpoint
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken: token } = z.object({
      refreshToken: z.string().min(1, 'Refresh token is required'),
    }).parse(req.body);

    const { verifyRefreshToken, generateTokenPair, revokeRefreshToken } = await import('../utils/refresh-token');
    const verification = await verifyRefreshToken(token);

    if (!verification.valid || !verification.userId) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: verification.userId },
      include: { role: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Revoke old refresh token
    await revokeRefreshToken(token);

    // Generate new token pair
    const { accessToken, refreshToken: newRefreshToken } = await generateTokenPair({
      userId: user.id,
      username: user.username,
      email: user.email,
      roleId: user.roleId,
      deviceId: verification.deviceId,
    });

    // Generate new CSRF token
    const sessionId = crypto.randomBytes(16).toString('hex');
    const csrfToken = await generateCsrfToken(sessionId, verification.deviceId, user.id);

    return res.json({
      token: accessToken,
      refreshToken: newRefreshToken,
      csrfToken,
      sessionId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    logger.error('Refresh token error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

// Logout endpoint (revoke refresh token)
router.post('/logout', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { refreshToken } = z.object({
      refreshToken: z.string().optional(),
    }).parse(req.body);

    if (refreshToken) {
      const { revokeRefreshToken } = await import('../utils/refresh-token');
      await revokeRefreshToken(refreshToken);
    } else {
      // Revoke all refresh tokens for user
      await revokeAllUserRefreshTokens(req.user!.id);
    }

    return res.json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ error: 'Failed to logout' });
  }
});

export default router;

