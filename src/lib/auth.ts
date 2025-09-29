import { NextRequest } from 'next/server';
import { UserRole } from '@prisma/client';
import { prisma } from './prisma'
import { verifyAccessToken, extractTokenFromHeader } from './jwt';
import { verifyPassword } from './bcrypt';
import { hasPermission, Permission } from './permissions';

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

export interface AuthContext {
  user: AuthUser | null;
  isAuthenticated: boolean;
  hasPermission: (permission: Permission) => Promise<boolean>;
}

/**
 * Authenticate user with email and password
 */
export async function authenticateUser(credentials: LoginCredentials): Promise<AuthResult> {
  try {
    const { username, password } = credentials;

    // Find user by username
    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
    });

    if (!user) {
      return {
        success: false,
        error: 'Invalid username or password',
      };
    }

    // Check if user is active
    if (!user.isActive) {
      return {
        success: false,
        error: 'Account is deactivated',
      };
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password);
    // Password validation completed
    if (!isPasswordValid) {
      return {
        success: false,
        error: 'Invalid username or password',
      };
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { updatedAt: new Date() },
    });

    // Return user without password
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: userPassword, ...userWithoutPassword } = user;
    
    return {
      success: true,
      user: userWithoutPassword as AuthUser,
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      error: 'Authentication failed',
    };
  }
}

/**
 * Get user from JWT token
 */
export async function getUserFromToken(token: string): Promise<AuthUser | null> {
  try {
    const payload = verifyAccessToken(token);
    if (!payload) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || !user.isActive) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword as AuthUser;
  } catch (error) {
    console.error('Error getting user from token:', error);
    return null;
  }
}

/**
 * Get user from request (Authorization header or cookies)
 */
export async function getUserFromRequest(request: NextRequest): Promise<AuthUser | null> {
  try {
    // Try to get token from Authorization header first
    const authHeader = request.headers.get('authorization');
    let token = extractTokenFromHeader(authHeader);
    
    // If no Authorization header, try to get from cookies
    if (!token) {
      token = request.cookies.get('accessToken')?.value || null;
    }
    
    if (!token) {
      return null;
    }

    return await getUserFromToken(token);
  } catch (error) {
    console.error('Error getting user from request:', error);
    return null;
  }
}

/**
 * Get user from cookies (for SSR)
 */
export async function getUserFromCookies(cookies: { [key: string]: string }): Promise<AuthUser | null> {
  try {
    const token = cookies.accessToken;
    
    if (!token) {
      return null;
    }

    return await getUserFromToken(token);
  } catch (error) {
    console.error('Error getting user from cookies:', error);
    return null;
  }
}

/**
 * Create authentication context
 */
export async function createAuthContext(user: AuthUser | null): Promise<AuthContext> {
  return {
    user,
    isAuthenticated: !!user,
    hasPermission: async (permission: Permission) => {
      if (!user) return false;
      return await hasPermission(user.id, permission);
    },
  };
}


export async function checkUserPermission(request: NextRequest, permission: Permission) {
  const token = request.cookies.get('accessToken')?.value;
  if (!token) throw new Error('Unauthorized');

  const payload = await verifyAccessToken(token);
  if (!payload) throw new Error('Invalid token');

  const hasPerm = await hasPermission(payload.userId, permission);
  if (!hasPerm) throw new Error('Forbidden');

  return payload;
}

/**
 * Validate session and refresh if needed
 */
export async function validateSession(accessToken: string, refreshToken?: string): Promise<{
  isValid: boolean;
  user?: AuthUser;
  needsRefresh?: boolean;
}> {
  try {
    // Try to get user from access token
    const user = await getUserFromToken(accessToken);
    
    if (user) {
      return {
        isValid: true,
        user,
        needsRefresh: false,
      };
    }

    // If access token is invalid, check if we can refresh
    if (refreshToken) {
      return {
        isValid: false,
        needsRefresh: true,
      };
    }

    return {
      isValid: false,
      needsRefresh: false,
    };
  } catch (error) {
    console.error('Session validation error:', error);
    return {
      isValid: false,
      needsRefresh: false,
    };
  }
}

/**
 * Check if user can access resource
 */
export async function canAccessResource(
  user: AuthUser,
  requiredPermission: Permission
): Promise<boolean> {
  try {
    return await hasPermission(user.id, requiredPermission);
  } catch (error) {
    console.error('Access check error:', error);
    return false;
  }
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<AuthUser | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword as AuthUser;
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
}

/**
 * Update user last activity
 */
export async function updateUserActivity(userId: string): Promise<void> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { updatedAt: new Date() },
    });
  } catch (error) {
    console.error('Error updating user activity:', error);
  }
}

/**
 * Security helpers
 */
export const AUTH_CONSTANTS = {
  COOKIE_NAME: 'token',
  REFRESH_COOKIE_NAME: 'refreshToken',
  CSRF_HEADER: 'x-csrf-token',
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
} as const;

/**
 * Rate limiting for login attempts
 */
const loginAttempts = new Map<string, { count: number; lastAttempt: Date }>();

export function checkRateLimit(identifier: string): { allowed: boolean; remainingAttempts: number } {
  const now = new Date();
  const attempts = loginAttempts.get(identifier);
  
  if (!attempts) {
    loginAttempts.set(identifier, { count: 1, lastAttempt: now });
    return { allowed: true, remainingAttempts: AUTH_CONSTANTS.MAX_LOGIN_ATTEMPTS - 1 };
  }
  
  // Reset if lockout period has passed
  if (now.getTime() - attempts.lastAttempt.getTime() > AUTH_CONSTANTS.LOCKOUT_DURATION) {
    loginAttempts.set(identifier, { count: 1, lastAttempt: now });
    return { allowed: true, remainingAttempts: AUTH_CONSTANTS.MAX_LOGIN_ATTEMPTS - 1 };
  }
  
  // Check if max attempts exceeded
  if (attempts.count >= AUTH_CONSTANTS.MAX_LOGIN_ATTEMPTS) {
    return { allowed: false, remainingAttempts: 0 };
  }
  
  // Increment attempts
  attempts.count++;
  attempts.lastAttempt = now;
  
  return {
    allowed: true,
    remainingAttempts: AUTH_CONSTANTS.MAX_LOGIN_ATTEMPTS - attempts.count,
  };
}

export function resetRateLimit(identifier: string): void {
  loginAttempts.delete(identifier);
}