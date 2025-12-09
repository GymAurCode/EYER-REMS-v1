import express, { Request, Response, NextFunction } from 'express';
import type { Express } from 'express-serve-static-core';
import { Server } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { validateEnv } from './utils/env-validation';
import authRoutes from './routes/auth';
import roleRoutes from './routes/roles';
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
import financeReportsRoutes from './routes/finance-reports';
import locationRoutes from './routes/locations';
import advancedOptionsRoutes from './routes/advanced-options';
import secureFilesRoutes from './routes/secure-files';
import { csrfProtection } from './middleware/csrf';
import path from 'path';
import logger from './utils/logger';
import { errorResponse } from './utils/error-handler';

dotenv.config();

// Validate environment variables at startup
try {
  validateEnv();
} catch (error) {
  logger.error('❌ Failed to start server: Environment validation failed');
  logger.error(error);
  process.exit(1);
}

const app = express() as any as Express;
const env = validateEnv();
const PORT = process.env.PORT || 3000; // fallback for local development

// Trust proxy - Required for Railway, Vercel, and other cloud platforms
// This allows Express to correctly identify client IPs behind reverse proxies
// Trust only 1 proxy hop (standard for most cloud platforms)
// This is more secure than trusting all proxies
app.set('trust proxy', 1);

// CORS configuration - MUST be before other middleware
// Local development only - remove Vercel URLs
app.use(
  cors({
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'https://hopeful-courage-production.up.railway.app', // production frontend
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  })
);


// SECURITY: Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for React
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding for development
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin requests
}));

// SECURITY: Rate limiting - More lenient in development
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 1000 : 100, // Higher limit in development (1000) vs production (100)
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

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 50 : 5, // Higher limit in development (50) vs production (5)
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
app.use((express as any).json({ limit: '10mb' })); // Limit JSON payload size
app.use((express as any).urlencoded({ extended: true, limit: '10mb' }));

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
  return csrfProtection(req as any, res, next);
});

// Serve secure files (authenticated endpoint)
app.use('/api/secure-files', secureFilesRoutes);

// Legacy static file serving (deprecated - use secure-files endpoint)
// Keep for backward compatibility but files should be moved outside web root
app.use('/uploads', (express as any).static(path.join(process.cwd(), 'public', 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/properties', propertiesRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/units', unitsRoutes);
app.use('/api/tenants', tenantsRoutes);
app.use('/api/leases', leasesRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/buyers', buyersRoutes);
app.use('/api/blocks', blocksRoutes);
app.use('/api/floors', floorsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/hr/employees', employeesRoutes);
app.use('/api/hr/attendance', attendanceRoutes);
app.use('/api/hr/payroll', payrollRoutes);
app.use('/api/hr/leave', leaveRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/finance-enhanced', financeEnhancedRoutes);
app.use('/api/finance-reports', financeReportsRoutes);
app.use('/api/properties-enhanced', propertiesEnhancedRoutes);
app.use('/api/crm-enhanced', crmEnhancedRoutes);
app.use('/api/advanced-options', advancedOptionsRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/tenant-portal', tenantPortalRoutes);
app.use('/api/bulk', bulkRoutes);
app.use('/api/bulk/excel', excelBulkRoutes);

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'REMS Backend is running' });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  errorResponse(res, err, (err as { statusCode?: number })?.statusCode || 500);
});

// Start server with proper error handling
const server: Server = app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🌐 Server accessible at http://localhost:${PORT}`);
});

// Handle server errors
if (server && typeof server.on === 'function') {
  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      logger.error(`❌ Port ${PORT} is already in use.`);
      logger.error(`   Please stop the process using port ${PORT} or change the PORT environment variable.`);
      logger.error(`   To find the process: netstat -ano | findstr :${PORT}`);
      logger.error(`   To kill it: taskkill /PID <PID> /F`);
      process.exit(1);
    } else {
      logger.error('❌ Server error:', error);
      process.exit(1);
    }
  });
}
