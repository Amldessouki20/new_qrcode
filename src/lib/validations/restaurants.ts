import { z } from "zod";

// Restaurant validation schema
export const restaurantSchema = z.object({
  name: z
    .string()
    .min(1, "Restaurant name is required")
    .max(100, "Name must be less than 100 characters"),
  description: z.string().optional(),
  location: z.string().optional(),
  capacity: z
    .number()
    .int()
    .min(1, "Capacity must be at least 1")
    .max(10000, "Capacity must be less than 10,000"),
  restaurantType: z.string().optional(),
  gateId: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const updateRestaurantSchema = restaurantSchema.partial();

// Create restaurant schema with meal times
export const createRestaurantSchema = restaurantSchema.extend({
  mealTimes: z
    .array(
      z
        .object({
          name: z.string().min(1, "Meal name is required"),
          startTime: z
            .string()
            .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
          endTime: z
            .string()
            .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
          isActive: z.boolean().default(true),
        })
        .refine(
          (data) => {
            const start = new Date(`1970-01-01T${data.startTime}:00`);
            const end = new Date(`1970-01-01T${data.endTime}:00`);
            return start < end;
          },
          {
            message: "End time must be after start time",
            path: ["endTime"],
          }
        )
    )
    .min(1, "At least one meal time is required"),
});

// Meal time validation schema
export const mealTimeSchema = z
  .object({
    name: z
      .string()
      .min(1, "Meal name is required")
      .max(50, "Name must be less than 50 characters"),
    startTime: z
      .string()
      .regex(
        /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
        "Invalid time format (HH:MM)"
      ),
    endTime: z
      .string()
      .regex(
        /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
        "Invalid time format (HH:MM)"
      ),
    isActive: z.boolean().default(true),
    restaurantId: z.string().uuid("Invalid restaurant ID"),
  })
  .refine(
    (data) => {
      const start = new Date(`1970-01-01T${data.startTime}:00`);
      const end = new Date(`1970-01-01T${data.endTime}:00`);
      return start < end;
    },
    {
      message: "End time must be after start time",
      path: ["endTime"],
    }
  );

export const updateMealTimeSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name is required")
      .max(50, "Name must be less than 50 characters")
      .optional(),
    startTime: z
      .string()
      .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format")
      .optional(),
    endTime: z
      .string()
      .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format")
      .optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        const start = new Date(`2000-01-01T${data.startTime}:00`);
        const end = new Date(`2000-01-01T${data.endTime}:00`);
        return start < end;
      }
      return true;
    },
    {
      message: "End time must be after start time",
      path: ["endTime"],
    }
  );

// Query validation schemas
export const restaurantQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10)),
  search: z.string().optional(),
  isActive: z
    .string()
    .optional()
    .transform((val) =>
      val === "true" ? true : val === "false" ? false : undefined
    ),
});

export const mealTimeQuerySchema = z.object({
  restaurantId: z.string().uuid("Invalid restaurant ID"),
  isActive: z
    .string()
    .optional()
    .transform((val) =>
      val === "true" ? true : val === "false" ? false : undefined
    ),
});

// Type exports
export type RestaurantInput = z.infer<typeof restaurantSchema>;
export type CreateRestaurantInput = z.infer<typeof createRestaurantSchema>;
export type UpdateRestaurantInput = z.infer<typeof updateRestaurantSchema>;
export type MealTimeInput = z.infer<typeof mealTimeSchema>;
export type UpdateMealTimeInput = z.infer<typeof updateMealTimeSchema>;

export type RestaurantQuery = z.infer<typeof restaurantQuerySchema>;
export type MealTimeQuery = z.infer<typeof mealTimeQuerySchema>;
