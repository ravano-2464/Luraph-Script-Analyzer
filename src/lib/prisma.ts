import { PrismaClient } from '../../generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const getAdapter = () => {
  const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';
  return new PrismaBetterSqlite3({
    url: dbUrl,
  });
};

const adapter = getAdapter();

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
