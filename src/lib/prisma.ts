// src/prisma.ts
import { PrismaClient } from '@prisma/client';

declare global {
  // Prevent multiple instances in development (HMR)
  var prisma: PrismaClient | undefined;
}

// Create a function to initialize Prisma with proper error handling
function createPrismaClient() {
  try {
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      // Optimizations for serverless environments
      transactionOptions: {
        timeout: 10000, // 10 seconds
      },
    });
  } catch (error) {
    console.error('Failed to initialize Prisma Client:', error);
    throw error;
  }
}

export const prisma: PrismaClient = global.prisma || createPrismaClient();

if (process.env.NODE_ENV === 'development') global.prisma = prisma;

// Graceful shutdown for serverless
if (process.env.NODE_ENV === 'production') {
  process.on('beforeExit', async () => {
    try {
      await prisma.$disconnect();
    } catch (error) {
      console.error('Error disconnecting Prisma:', error);
    }
  });
}
