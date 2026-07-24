import { PrismaClient } from '@prisma/client';

// 复用 Prisma 客户端，避免开发环境热重载时创建过多连接
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
