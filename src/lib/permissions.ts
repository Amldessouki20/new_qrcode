import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Permission constants based on the seeded data
export const PERMISSIONS = {
  // User Management
  USER_CREATE: "users.create",
  USER_READ: "users.read",
  USER_UPDATE: "users.update",
  USER_DELETE: "users.delete",
  USER_LIST: "users.read",

  // Guest Management
  GUEST_CREATE: "guests.create",
  GUEST_READ: "guests.read",
  GUEST_UPDATE: "guests.update",
  GUEST_DELETE: "guests.delete",
  GUEST_LIST: "guests.read",

  // Card Management
  CARD_CREATE: "cards.create",
  CARD_READ: "cards.read",
  CARD_UPDATE: "cards.update",
  CARD_DELETE: "cards.delete",
  CARD_LIST: "cards.read",

  // Restaurant Management
  RESTAURANT_CREATE: "restaurants.create",
  RESTAURANT_READ: "restaurants.read",
  RESTAURANT_UPDATE: "restaurants.update",
  RESTAURANT_DELETE: "restaurants.delete",
  RESTAURANT_LIST: "restaurants.read",

  // Scan Logs
  SCAN_LOG_READ: "scan.logs",
  SCAN_LOG_LIST: "scan.logs",

  // Gate Management
  GATE_CREATE: "gates.create",
  GATE_READ: "gates.read",
  GATE_UPDATE: "gates.update",
  GATE_DELETE: "gates.delete",
  GATE_LIST: "gates.read",
  GATE_VIEW: "gates.read",
  GATE_CONTROL: "gates.control",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Check if user has a specific permission
 */
export async function hasPermission(
  userId: string,
  permission: Permission
): Promise<boolean> {
  try {
    const userPermission = await prisma.userPermission.findFirst({
      where: {
        userId,
        permission: {
          name: permission,
        },
      },
      include: {
        permission: true,
      },
    });

    // Permission check completed

    return !!userPermission;
  } catch (error) {
    console.error("Error checking permission:", error);
    return false;
  }
}

/**
 * Check if user has any of the specified permissions
 */
export async function hasAnyPermission(
  userId: string,
  permissions: Permission[]
): Promise<boolean> {
  try {
    const userPermission = await prisma.userPermission.findFirst({
      where: {
        userId,
        permission: {
          name: {
            in: permissions,
          },
        },
      },
    });

    return !!userPermission;
  } catch (error) {
    console.error("Error checking permissions:", error);
    return false;
  }
}

/**
 * Check if user has all of the specified permissions
 */
export async function hasAllPermissions(
  userId: string,
  permissions: Permission[]
): Promise<boolean> {
  try {
    for (const permission of permissions) {
      const hasPermissionResult = await hasPermission(userId, permission);
      if (!hasPermissionResult) {
        return false;
      }
    }
    return true;
  } catch (error) {
    console.error("Error checking permissions:", error);
    return false;
  }
}

/**
 * Get all permissions for a user
 */
export async function getUserPermissions(
  userId: string
): Promise<Permission[]> {
  try {
    const userPermissions = await prisma.userPermission.findMany({
      where: {
        userId,
      },
      include: {
        permission: true,
      },
    });
    // User permissions retrieved

    return userPermissions.map((up) => up.permission.name as Permission);
  } catch (error) {
    console.error("Error getting user permissions:", error);
    return [];
  }
}

/**
 * Check if user role has admin privileges
 */
export function isAdmin(role: UserRole): boolean {
  return role === UserRole.ADMIN;
}

/**
 * Check if user role has manager privileges
 */
export function isManager(role: UserRole): boolean {
  return role === UserRole.MANAGER || role === UserRole.ADMIN;
}

/**
 * Check if user role has user privileges
 */
export function isUser(role: UserRole): boolean {
  return (
    role === UserRole.USER ||
    role === UserRole.MANAGER ||
    role === UserRole.ADMIN
  );
}

/**
 * Get role hierarchy level (higher number = more privileges)
 */
export function getRoleLevel(role: UserRole): number {
  switch (role) {
    case UserRole.ADMIN:
      return 3;
    case UserRole.MANAGER:
      return 2;
    case UserRole.USER:
      return 1;
    default:
      return 0;
  }
}

/**
 * Check if user can access resource based on role hierarchy
 */
export function canAccessByRole(
  userRole: UserRole,
  requiredRole: UserRole
): boolean {
  return getRoleLevel(userRole) >= getRoleLevel(requiredRole);
}

/**
 * Permission groups for easier management
 */
export const PERMISSION_GROUPS = {
  USER_MANAGEMENT: [
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.USER_DELETE,
    PERMISSIONS.USER_LIST,
  ],
  GUEST_MANAGEMENT: [
    PERMISSIONS.GUEST_CREATE,
    PERMISSIONS.GUEST_READ,
    PERMISSIONS.GUEST_UPDATE,
    PERMISSIONS.GUEST_DELETE,
    PERMISSIONS.GUEST_LIST,
  ],
  CARD_MANAGEMENT: [
    PERMISSIONS.CARD_CREATE,
    PERMISSIONS.CARD_READ,
    PERMISSIONS.CARD_UPDATE,
    PERMISSIONS.CARD_DELETE,
    PERMISSIONS.CARD_LIST,
  ],

  RESTAURANT_MANAGEMENT: [
    PERMISSIONS.RESTAURANT_CREATE,
    PERMISSIONS.RESTAURANT_READ,
    PERMISSIONS.RESTAURANT_UPDATE,
    PERMISSIONS.RESTAURANT_DELETE,
    PERMISSIONS.RESTAURANT_LIST,
  ],
  SCAN_LOG_ACCESS: [PERMISSIONS.SCAN_LOG_READ, PERMISSIONS.SCAN_LOG_LIST],
  GATE_MANAGEMENT: [
    PERMISSIONS.GATE_CREATE,
    PERMISSIONS.GATE_READ,
    PERMISSIONS.GATE_UPDATE,
    PERMISSIONS.GATE_DELETE,
    PERMISSIONS.GATE_LIST,
    PERMISSIONS.GATE_VIEW,
    PERMISSIONS.GATE_CONTROL,
  ],
} as const;

/**
 * Check if user has permission group access
 */
export async function hasPermissionGroup(
  userId: string,
  permissionGroup: keyof typeof PERMISSION_GROUPS
): Promise<boolean> {
  const permissions = [...PERMISSION_GROUPS[permissionGroup]] as Permission[];
  return await hasAnyPermission(userId, permissions);
}

/**
 * Middleware helper to check permissions
 */
export function requirePermission(permission: Permission) {
  return async (userId: string): Promise<boolean> => {
    return await hasPermission(userId, permission);
  };
}

/**
 * Check if user role has permission (simple role-based check)
 * This is a simplified permission system based on role hierarchy
 */
export function hasRolePermission(
  role: UserRole,
  permission: Permission
): boolean {
  // Admin has all permissions
  if (role === UserRole.ADMIN) {
    return true;
  }

  // Manager has most permissions except user creation/deletion
  if (role === UserRole.MANAGER) {
    const managerPermissions: Permission[] = [
      PERMISSIONS.USER_READ,
      PERMISSIONS.USER_LIST,
      PERMISSIONS.RESTAURANT_CREATE,
      PERMISSIONS.RESTAURANT_READ,
      PERMISSIONS.RESTAURANT_UPDATE,
      PERMISSIONS.RESTAURANT_DELETE,
      PERMISSIONS.RESTAURANT_LIST,
      PERMISSIONS.CARD_CREATE,
      PERMISSIONS.CARD_READ,
      PERMISSIONS.CARD_UPDATE,
      PERMISSIONS.CARD_DELETE,
      PERMISSIONS.CARD_LIST,
      PERMISSIONS.GUEST_CREATE,
      PERMISSIONS.GUEST_READ,
      PERMISSIONS.GUEST_UPDATE,
      PERMISSIONS.GUEST_DELETE,
      PERMISSIONS.GUEST_LIST,
      PERMISSIONS.SCAN_LOG_READ,
      PERMISSIONS.SCAN_LOG_LIST,
      PERMISSIONS.GATE_CREATE,
      PERMISSIONS.GATE_READ,
      PERMISSIONS.GATE_UPDATE,
      PERMISSIONS.GATE_DELETE,
      PERMISSIONS.GATE_LIST,
      PERMISSIONS.GATE_VIEW,
      PERMISSIONS.GATE_CONTROL,
    ];
    return managerPermissions.includes(permission);
  }

  // Regular users have limited permissions
  if (role === UserRole.USER) {
    const userPermissions: Permission[] = [
      PERMISSIONS.CARD_READ,
      PERMISSIONS.RESTAURANT_READ,
      PERMISSIONS.SCAN_LOG_READ,
      PERMISSIONS.GATE_READ,
      PERMISSIONS.GATE_VIEW,
    ];
    return userPermissions.includes(permission);
  }

  return false;
}

/**
 * Middleware helper to check role
 */
export function requireRole(requiredRole: UserRole) {
  return (userRole: UserRole): boolean => {
    return canAccessByRole(userRole, requiredRole);
  };
}
