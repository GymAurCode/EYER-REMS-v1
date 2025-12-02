import express, { Request, Response, NextFunction } from 'express';
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

const app = express();
const env = validateEnv();
const PORT = env.PORT;

// Trust proxy - Required for Railway, Vercel, and other cloud platforms
// This allows Express to correctly identify client IPs behind reverse proxies
app.set('trust proxy', true);

// CORS configuration - MUST be before other middleware
// In production, only allow requests from Vercel frontend
const allowedOrigins = env.ALLOWED_ORIGINS 
  ? env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : [env.FRONTEND_URL];

// Add trailing slash variations for Vercel (some requests may include/exclude trailing slash)
const normalizedOrigins = allowedOrigins.flatMap(origin => {
  const withoutSlash = origin.replace(/\/$/, '');
  const withSlash = `${withoutSlash}/`;
  return withoutSlash === withSlash ? [origin] : [withoutSlash, withSlash];
});

app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin for:
    // - Health checks and monitoring
    // - Server-to-server requests
    // - Mobile apps
    // - Development/testing tools
    if (!origin) {
      // Allow requests without origin header
      // This is safe because:
      // 1. CSRF protection handles security for state-changing requests (POST, PUT, DELETE, PATCH)
      // 2. Health checks and monitoring tools often don't send Origin headers
      // 3. Server-to-server requests and mobile apps may not have Origin headers
      // 4. GET requests are safe by nature (idempotent)
      return callback(null, true);
    }
    
    // Check if origin matches any allowed origin (with or without trailing slash)
    const isAllowed = normalizedOrigins.some(allowed => {
      // Exact match
      if (origin === allowed) return true;
      // Match with/without trailing slash
      const originNormalized = origin.replace(/\/$/, '');
      const allowedNormalized = allowed.replace(/\/$/, '');
      return originNormalized === allowedNormalized;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      logger.warn(`CORS: Blocked request from origin: ${origin}`);
      callback(new Error(`Not allowed by CORS. Allowed origins: ${normalizedOrigins.join(', ')}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-Id', 'X-CSRF-Token', 'X-Session-Id'],
  optionsSuccessStatus: 200, // Some legacy browsers (IE11, various SmartTVs) choke on 204
}));

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
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/api/health';
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
});

app.use('/api/auth/', authLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' })); // Limit JSON payload size
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CSRF Protection for state-changing routes
// Note: Applied after auth routes (login doesn't need CSRF) but before other routes
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF for safe methods and auth endpoints
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || 
      req.path.startsWith('/api/auth/login') ||
      req.path.startsWith('/api/auth/role-login') ||
      req.path.startsWith('/api/auth/invite-login') ||
      req.path.startsWith('/api/health')) {
    return next();
  }
  return csrfProtection(req, res, next);
});

// Serve secure files (authenticated endpoint)
app.use('/api/secure-files', secureFilesRoutes);

// Legacy static file serving (deprecated - use secure-files endpoint)
// Keep for backward compatibility but files should be moved outside web root
app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

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
const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🌐 Server accessible at http://localhost:${PORT}`);
});

// Handle server errors
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
