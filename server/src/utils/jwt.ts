import jwt, { SignOptions } from 'jsonwebtoken';
import type { StringValue } from 'ms';

// SECURITY: JWT_SECRET must be set in environment variables
// Fail fast if JWT_SECRET is not provided in production
const JWT_SECRET = process.env.JWT_SECRET;
const DEFAULT_SECRET = 'CHANGE-THIS-IN-PRODUCTION-DEVELOPMENT-ONLY';

if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  console.warn('⚠️  WARNING: JWT_SECRET not set. Using default for development only. This is INSECURE for production!');
}

const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '7d') as StringValue;

// Use a strong default only in development, fail in production
const finalJwtSecret = JWT_SECRET || DEFAULT_SECRET;

export interface TokenPayload {
  userId: string;
  username: string;
  email: string;
  roleId: string;
  deviceId?: string;
}

export const generateToken = (payload: TokenPayload): string => {
  if (!finalJwtSecret || finalJwtSecret === DEFAULT_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot generate token: JWT_SECRET not configured');
    }
  }
  const options: SignOptions = {
    expiresIn: JWT_EXPIRES_IN,
  };
  return jwt.sign(payload, finalJwtSecret, options);
};

export const verifyToken = (token: string): TokenPayload => {
  if (!finalJwtSecret || finalJwtSecret === DEFAULT_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot verify token: JWT_SECRET not configured');
    }
  }
  return jwt.verify(token, finalJwtSecret) as TokenPayload;
};

