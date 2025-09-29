// src/prisma.ts
import { PrismaClient } from '@prisma/client';

declare global {
  // Prevent multiple instances in development (HMR)
  var prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  global.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.POSTGRES_URL_NON_POOLING,
      },
    },
    // Optimizations for serverless environments
    transactionOptions: {
      timeout: 10000, // 10 seconds
    },
  });

if (process.env.NODE_ENV === 'development') global.prisma = prisma;

// Graceful shutdown for serverless
if (process.env.NODE_ENV === 'production') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect();
  });
}
