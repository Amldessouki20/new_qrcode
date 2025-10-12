// API Response Types
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
  success?: boolean;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Error Response Type
export interface ErrorResponse {
  error: string;
  message?: string;
  details?: unknown;
  code?: string;
}

// Common Entity Types
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

// User Types
export interface User extends BaseEntity {
  username: string;
  role: "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "USER";
  isActive: boolean;
}

// Guest Types
export interface Guest extends BaseEntity {
  firstName: string;
  lastName: string;
  nationalId?: string | null;
  passportNo?: string | null;
  nationality?: string | null;
  company?: string | null;
  religion?: string | null;
  jobTitle?: string | null;
  checkInDate?: Date | null;
  expiredDate?: Date | null;
  roomNumber?: string | null;
  restaurantId: string;
  isActive: boolean;
  createdBy: string;
  updatedBy?: string | null;
}

// Restaurant Types
export interface Restaurant extends BaseEntity {
  name: string;
  nameAr?: string | null;
  description?: string | null;
  location?: string | null;
  capacity: number;
  restaurantType: string;
  gateId?: string | null;
  isActive: boolean;
}

// Gate Types
export interface Gate extends BaseEntity {
  name: string;
  nameAr: string;
  type: "MAIN" | "RESTAURANT";
  location: string;
  ipAddress?: string | null;
  port?: number | null;
  serialPort?: string | null;
  baudRate?: number | null;
  protocol: "TCP_IP" | "RS485" | "HTTP";
  model?: string | null;
  maxCapacity?: number | null;
  isActive: boolean;
  status?: "OPEN" | "CLOSED" | "ERROR" | "MAINTENANCE" | null;
  lastControlAt?: Date | null;
  description?: string | null;
  createdById: string;
}

// Card Types
export interface Card extends BaseEntity {
  guestId: string;
  mealTimeId: string;
  cardType: "QR" | "RFID";
  cardData: string;
  validFrom: Date;
  validTo: Date;
  isActive: boolean;
  usageCount: number;
  maxUsage: number;
  createdBy: string;
}

// MealTime Types
export interface MealTime extends BaseEntity {
  restaurantId: string;
  name: string;
  nameAr?: string | null;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

// ScanLog Types
export interface ScanLog extends BaseEntity {
  stationId?: string | null;
  cardId?: string | null;
  guestId?: string | null;
  scanTime: Date;
  isSuccess: boolean;
  errorCode?: string | null;
  errorMessage?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  processingTime?: number | null;
}

// AccessLog Types
export interface AccessLog extends BaseEntity {
  gateId: string;
  cardId?: string | null;
  guestId?: string | null;
  scanTime: Date;
  isSuccess: boolean;
  accessType?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

// GateControlLog Types
export interface GateControlLog extends BaseEntity {
  gateId: string;
  action: string;
  userId?: string | null;
  isSuccess: boolean;
  errorCode?: string | null;
  errorMessage?: string | null;
  duration?: number | null;
  timestamp: Date;
}

// Permission Types
export interface Permission extends BaseEntity {
  name: string;
  description?: string | null;
  module: string;
  action: string;
}

// UserPermission Types
export interface UserPermission extends BaseEntity {
  userId: string;
  permissionId: string;
}

// AuditLog Types
export interface AuditLog extends BaseEntity {
  userId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

// Performance Metric Types
export interface PerformanceMetric extends BaseEntity {
  name: string;
  value: number;
  timestamp: Date;
  url: string;
  sessionId: string;
  metadata?: string | null;
}



// Session Stats Types
export interface SessionStats extends BaseEntity {
  sessionId: string;
  errorCount: number;
  performanceCount: number;
  startTime: Date;
  lastActivity: Date;
}

// Error Log Types
export interface ErrorLog extends BaseEntity {
  message: string;
  stack?: string | null;
  componentStack?: string | null;
  errorBoundary?: string | null;
  timestamp: Date;
  url: string;
  userAgent: string;
  userId?: string | null;
  sessionId: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  category:
    | "JAVASCRIPT"
    | "NETWORK"
    | "AUTHENTICATION"
    | "VALIDATION"
    | "DATABASE"
    | "GATE_COMMUNICATION"
    | "SCANNING"
    | "UNKNOWN";
  metadata?: string | null;
}

// Form Types
export interface LoginForm {
  username: string;
  password: string;
}

export interface CreateUserForm {
  username: string;
  password: string;
  role: "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "USER";
}

export interface CreateGuestForm {
  firstName: string;
  lastName: string;
  nationalId?: string;
  passportNo?: string;
  nationality?: string;
  company?: string;
  jobTitle?: string;
  checkInDate?: Date;
  expiredDate?: Date;
  roomNumber?: string;
  restaurantId: string;
}

export interface CreateRestaurantForm {
  name: string;
  nameAr?: string;
  description?: string;
  location?: string;
  capacity: number;
  restaurantType: "EASTERN" | "WESTERN" | "MIXED";
}

export interface CreateGateForm {
  name: string;
  nameAr: string;
  type: "MAIN" | "RESTAURANT";
  location: string;
  ipAddress?: string;
  port?: number;
  serialPort?: string;
  baudRate?: number;
  protocol: "TCP_IP" | "RS485" | "HTTP";
  model?: string;
  maxCapacity?: number;
  description?: string;
}

export interface CreateCardForm {
  guestId: string;
  mealTimeId: string;
  cardType: "QR" | "RFID";
  validFrom: Date;
  validTo: Date;
  maxUsage: number;
}

export interface CreateMealTimeForm {
  restaurantId: string;
  name: string;
  nameAr?: string;
  startTime: string;
  endTime: string;
}

// Query Types
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface FilterQuery {
  search?: string;
  isActive?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
}

// Statistics Types
export interface DashboardStats {
  totalGuests: number;
  totalRestaurants: number;
  totalGates: number;
  totalCards: number;
  activeGuests: number;
  activeRestaurants: number;
  activeGates: number;
  activeCards: number;
  todayScans: number;
  todayAccess: number;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: "scan" | "access" | "gate_control" | "user_action";
  description: string;
  timestamp: Date;
  userId?: string;
  guestId?: string;
  gateId?: string;
  isSuccess: boolean;
}

// Monitoring Types
export interface MonitoringData {
  errors: ErrorLog[];
  performance: PerformanceMetric[];
  sessionStats: SessionStats;
}

export interface PerformanceMetrics {
  pageLoadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  totalBlockingTime: number;
}

// Gate Control Types
export interface GateControlCommand {
  action: "OPEN" | "CLOSE" | "RESET" | "EMERGENCY_OPEN" | "STATUS";
  duration?: number;
  reason?: string;
}

export interface GateStatus {
  gateId: string;
  status: "OPEN" | "CLOSED" | "ERROR" | "MAINTENANCE";
  lastAction?: string;
  lastActionTime?: Date;
  isOnline: boolean;
  errorMessage?: string;
}

// Network Communication Types
export interface NetworkConfig {
  host: string;
  port: number;
  timeout: number;
  retries: number;
}

export interface NetworkResponse {
  success: boolean;
  data?: string;
  error?: string;
  responseTime: number;
}

// QR Code Types
export interface QRCodeData {
  cardId: string;
  guestId: string;
  restaurantId: string;
  mealTimeId: string;
  validFrom: Date;
  validTo: Date;
  checksum: string;
}

// RFID Types
export interface RFIDData {
  tagId: string;
  cardId: string;
  guestId: string;
  restaurantId: string;
  mealTimeId: string;
  validFrom: Date;
  validTo: Date;
}

// Validation Types
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Utility Types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

// Generic Types
export type ID = string;
export type Timestamp = Date;
export type Status = "active" | "inactive" | "pending" | "error";
export type SortOrder = "asc" | "desc";
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
