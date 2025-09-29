import { z } from 'zod';

// Guest validation schemas
export const createGuestSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(100, 'Last name too long'),
  nationalId: z.string().max(50, 'National ID too long').optional(),
  passportNo: z.string().max(50, 'Passport number too long').optional(),
  nationality: z.string().max(50, 'Nationality too long').optional(),
  company: z.string().max(100, 'Company name too long').optional(),
  jobTitle: z.string().max(100, 'Job title too long').optional(),
  checkInDate: z.string().datetime().optional(),
  checkOutDate: z.string().datetime().optional(),
  roomNumber: z.string().max(20, 'Room number too long').optional(),
  isActive: z.boolean().default(true),
  restaurantId: z.string().min(1, 'Restaurant ID is required'),
}).refine((data) => {
  if (data.checkInDate && data.checkOutDate) {
    return new Date(data.checkInDate) < new Date(data.checkOutDate);
  }
  return true;
}, {
  message: 'Check-out date must be after check-in date',
  path: ['checkOutDate'],
});

export const updateGuestSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  nationalId: z.string().max(50).optional(),
  passportNo: z.string().max(50).optional(),
  nationality: z.string().max(50).optional(),
  company: z.string().max(100).optional(),
  jobTitle: z.string().max(100).optional(),
  checkInDate: z.string().datetime().optional(),
  checkOutDate: z.string().datetime().optional(),
  roomNumber: z.string().max(20).optional(),
  isActive: z.boolean().optional(),
  restaurantId: z.string().optional(),
}).refine((data) => {
  if (data.checkInDate && data.checkOutDate) {
    return new Date(data.checkInDate) < new Date(data.checkOutDate);
  }
  return true;
}, {
  message: 'Check-out date must be after check-in date',
  path: ['checkOutDate'],
});

// Card validation schemas
export const createCardSchema = z.object({
  guestId: z.string().min(1, 'Guest ID is required'),
  cardType: z.enum(['QR', 'RFID']).default('QR'),
  mealTimeId: z.string().min(1, 'Meal time is required'),
  validFrom: z.string().refine((date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  }, 'Valid from date must be a valid date'),
  validTo: z.string().refine((date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime()) && parsed > new Date();
  }, 'Valid to date must be a valid future date'),
  maxUsage: z.number().min(1).optional(),
  isActive: z.boolean().default(true),
});

export const updateCardSchema = z.object({
  cardType: z.enum(['QR', 'RFID']).optional(),
  mealTimeId: z.string().optional(),
  validTo: z.string().refine((date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime()) && parsed > new Date();
  }, 'Valid to date must be a valid future date').optional(),
  maxUsage: z.number().min(1).optional(),
  isActive: z.boolean().optional(),
});

// QR code generation schema
export const generateQRSchema = z.object({
  cardId: z.string().min(1, 'Card ID is required'),
  size: z.number().min(100).max(1000).default(300),
  format: z.enum(['PNG', 'SVG']).default('PNG'),
});

// Print card schema
export const printCardSchema = z.object({
  cardId: z.string().min(1, 'Card ID is required'),
  copies: z.number().min(1).max(10).default(1),
  printerName: z.string().optional(),
});

export const qrGenerationSchema = z.object({
  format: z.enum(['png', 'svg', 'dataurl']).default('dataurl'),
  size: z.number().min(100).max(1000).optional(),
  margin: z.number().min(0).max(10).optional(),
});

export const cardPrintSchema = z.object({
  includeQR: z.boolean().optional(),
  includeRFID: z.boolean().optional(),
  cardSize: z.enum(['standard', 'large', 'small']).optional(),
  orientation: z.enum(['portrait', 'landscape']).optional(),
});

export type CreateGuestData = z.infer<typeof createGuestSchema>;
export type UpdateGuestData = z.infer<typeof updateGuestSchema>;
export type CreateCardData = z.infer<typeof createCardSchema>;
export type UpdateCardData = z.infer<typeof updateCardSchema>;
export type GenerateQRData = z.infer<typeof generateQRSchema>;
export type PrintCardData = z.infer<typeof printCardSchema>;