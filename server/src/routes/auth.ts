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
    // Use explicit select to avoid querying category column if it doesn't exist
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            status: true,
            permissions: true,
            // Don't select category - may not exist yet
          },
        },
      },
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
    // Use explicit select to avoid querying category column if it doesn't exist
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            status: true,
            permissions: true,
            // Don't select category - may not exist yet
          },
        },
      },
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

    // Create notifications for all admins about role loginimport 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import { Server } from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { validateEnv } from './utils/env-validation';
import authRoutes from './routes/auth';
import roleRoutes from './routes/roles';
import userRoutes from './routes/users';
import permissionsRoutes from './routes/permissions';
import notificationRoutes from './routes/notifications';
import propertiesRoutes from './routes/properties';
import unitsRoutes from './routes/units';
import tenantsRoutes from './routes/tenants';
import leasesRoutes from './routes/leases';
import salesRoutes from './routes/sales';
import buyersRoutes from './routes/buyers';
import blocksRoutes from './routes/blocks';
import floorsRoutes from './routes/floors';
import statsRoutes from './routes/stats';
import uploadRoutes from './routes/upload';
import chatRoutes from './routes/chat';
import employeesRoutes from './routes/employees';
import attendanceRoutes from './routes/attendance';
import payrollRoutes from './routes/payroll';
import leaveRoutes from './routes/leave';
import crmRoutes from './routes/crm';
import financeRoutes from './routes/finance';
import backupRoutes from './routes/backup';
import tenantPortalRoutes from './routes/tenant-portal';
import bulkRoutes from './routes/bulk';
import excelBulkRoutes from './routes/excel-bulk';
import propertiesEnhancedRoutes from './routes/properties-enhanced';
import financeEnhancedRoutes from './routes/finance-enhanced';
import crmEnhancedRoutes from './routes/crm-enhanced';
import crmLeadImportRoutes from './routes/crm-lead-import';
import financeReportsRoutes from './routes/finance-reports';
import financialReportsRoutes from './routes/financial-reports';
import locationRoutes from './routes/locations';
import advancedOptionsRoutes from './routes/advanced-options';
import secureFilesRoutes from './routes/secure-files';
import recycleBinRoutes from './routes/recycle-bin';
import subsidiariesRoutes from './routes/subsidiaries';
import accountsRoutes from './routes/accounts';
import entityAccountsRoutes from './routes/entity-accounts';
import fraudDetectionRoutes from './routes/fraud-detection';
import filesRoutes from './routes/files';
import constructionRoutes from './routes/construction';
import aiIntelligenceRoutes from './routes/ai-intelligence';
import aiChatRoutes from './routes/ai-chat';
import exportRoutes from './routes/export';
import exportJobRoutes from './routes/export-jobs';
import financeOperationsRoutes from './routes/finance-operations';
import { csrfProtection } from './middleware/csrf';
import { apiLoggingMiddleware } from './middleware/api-logging';
import path from 'path';
import logger from './utils/logger';
import { errorResponse } from './utils/error-handler';
import prisma from './prisma/client';

// Validate environment variables at startup
try {
  validateEnv();
} catch (error) {
  logger.error('❌ Failed to start server: Environment validation failed');
  logger.error(error);
  process.exit(1);
}

const app: any = express();
const env = validateEnv();
const PORT = parseInt(process.env.PORT || '3001', 10); // default to 3001 to match frontend api.ts

// Trust proxy - Required for Railway, Vercel, and other cloud platforms
// This allows Express to correctly identify client IPs behind reverse proxies
// Trust only 1 proxy hop (standard for most cloud platforms)
// This is more secure than trusting all proxies
app.set('trust proxy', 1);

// CORS configuration - MUST be before other middleware
const allowedOrigins = [
  'https://eyer-rems-v1-p3c3.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://eyer-rems-v1-production-ee31.up.railway.app'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // allow non-browser requests like Postman
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token', 'X-CSRF-Token', 'X-Device-Id', 'X-Session-Id'],
  credentials: true,
}));

// Remove this duplicate app.options('*', ...)

// Cookie parser - MUST be before CSRF middleware to read cookies
app.use(cookieParser());

// SECURITY: Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: false
}));

// SECURITY: Rate limiting - More lenient in development
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 5000 : 100, // Higher limit in development (5000) vs production (100)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Custom key generator that combines IP with user agent for better security
  keyGenerator: (req) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    // Combine IP with user agent hash to prevent simple IP spoofing
    return `${ip}-${userAgent.substring(0, 50)}`;
  },
  skip: (req) => {
    // Skip rate limiting for health checks
    return (req.path || '') === '/api/health';
  },
});

// Apply rate limiting to all API routes
app.use('/api/', limiter);

// API Request/Response Logging (after rate limiting, before routes)
app.use('/api/', apiLoggingMiddleware);

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,  // 10 minutes
  max: isDevelopment ? 300 : 50,
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true,
  // Custom key generator that combines IP with user agent for better security
  keyGenerator: (req) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    // Combine IP with user agent hash to prevent simple IP spoofing
    return `${ip}-${userAgent.substring(0, 50)}`;
  },
});

app.use('/api/auth/', authLimiter);

// Body parsing middleware
app.use((express as any).json({ limit: '50mb' })); // Limit JSON payload size (supports base64 images)
app.use((express as any).urlencoded({ extended: true, limit: '50mb' }));

// CSRF Protection for state-changing routes
// Note: Applied before routes to protect state-changing requests
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF for safe methods and auth endpoints
  const path = req.path || req.url || '';
  const isAuthEndpoint = path.includes('/auth/login') ||
    path.includes('/auth/role-login') ||
    path.includes('/auth/invite-login') ||
    path.includes('/auth/refresh');

  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method || '') ||
    isAuthEndpoint ||
    path.includes('/health')) {
    return next();
  }

  // Log CSRF check for debugging
  logger.info('CSRF check for POST/PUT/DELETE', {
    method: req.method,
    path: path,
    url: req.url,
  });

  return csrfProtection(req as any, res, next);
});

// Serve secure files (authenticated endpoint)
app.use('/api/secure-files', secureFilesRoutes);

// New centralized file handling routes
app.use('/api/files', filesRoutes);

// Note: The /api/secure-files/:entityType/:entityId/:filename route is handled by secureFilesRoutes above
// This wildcard route is kept for backward compatibility but should not be used for new uploads
// ... (rest of the file)

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
    // Use explicit select to avoid querying category column if it doesn't exist
    const inviteLink = await prisma.roleInviteLink.findUnique({
      where: { token },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            status: true,
            permissions: true,
            // Don't select category - may not exist yet
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
    // Use explicit select to avoid querying category column if it doesn't exist
    let user = await prisma.user.findUnique({
      where: { email: inviteLink.email },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            status: true,
            permissions: true,
            // Don't select category - may not exist yet
          },
        },
      },
    });

    if (user) {
      // Update existing user
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          password: inviteLink.password, // Already hashed
          roleId: inviteLink.roleId,
        },
        include: {
          role: {
            select: {
              id: true,
              name: true,
              status: true,
              permissions: true,
              // Don't select category - may not exist yet
            },
          },
        },
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
        include: {
          role: {
            select: {
              id: true,
              name: true,
              status: true,
              permissions: true,
              // Don't select category - may not exist yet
            },
          },
        },
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
      include: { 
        role: {
          select: {
            id: true,
            name: true,
            status: true,
            permissions: true,
            // Don't select category if column doesn't exist yet
            // category: true,
          },
        },
      },
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
    // Use explicit select to avoid querying category column if it doesn't exist
    const user = await prisma.user.findUnique({
      where: { id: verification.userId },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            status: true,
            permissions: true,
            // Don't select category - may not exist yet
          },
        },
      },
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

