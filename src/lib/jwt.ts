import jwt from 'jsonwebtoken';
import { User } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

export interface JWTPayload {
  userId: string;
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenVersion: number;
  iat?: number;
  exp?: number;
}

/**
 * Generate access token
 */
export function generateAccessToken(user: Pick<User, 'id' | 'username' | 'role'>): string {
  const payload: JWTPayload = {

    userId: user.id,
    username: user.username,
    role: user.role,
  };
    console.log("Signing access token with payload:", payload);


  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
   issuer: 'qr-code',
    audience: 'qr-code-users',
  } as jwt.SignOptions);



}

/**
 * Generate refresh token
 */
export function generateRefreshToken(userId: string, tokenVersion: number = 0): string {
  const payload: RefreshTokenPayload = {
    userId,
    tokenVersion,
  };

  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    issuer: 'qr-code',
    audience: 'qr-code-users',
  } as jwt.SignOptions);
}

/**
 * Verify access token
 */
export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
    issuer: 'qr-code',
    audience: 'qr-code-users',
    }) as JWTPayload;
    console.log("Verified access token payload:", decoded);
    return decoded;
  } catch (error) {
    console.error('Access token verification failed:', error);
    
    return null;
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
    issuer: 'qr-code',
    audience: 'qr-code-users',
    }) as RefreshTokenPayload;
    
    return decoded;
  } catch (error) {
    console.error('Refresh token verification failed:', error);
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.substring(7); // Remove 'Bearer ' prefix
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as { exp?: number };
    if (!decoded || !decoded.exp) {
      return true;
    }
    
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch {
    return true;
  }
}

/**
 * Get token expiration time
 */
export function getTokenExpiration(token: string): Date | null {
  try {
    const decoded = jwt.decode(token) as { exp?: number };
    if (!decoded || !decoded.exp) {
      return null;
    }
    
    return new Date(decoded.exp * 1000);
  } catch {
    return null;
  }
}

/**
 * Generate token pair (access + refresh)
 */
export function generateTokenPair(user: Pick<User, 'id' | 'username' | 'role'>, tokenVersion: number = 0) {
  return {
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user.id, tokenVersion),
  };
}