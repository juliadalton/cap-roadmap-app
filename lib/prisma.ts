import { PrismaClient } from '@prisma/client';

// Declare a global variable to hold the Prisma Client instance
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Instantiate PrismaClient, reusing the instance in development
const prisma = globalThis.prisma || new PrismaClient({
  // Log Prisma queries in development (optional)
  // log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : [],
});

// Assign the instance to the global variable in development
if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

export default prisma; 