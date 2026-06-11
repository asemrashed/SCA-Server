import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

/** Recreate client after `prisma generate` — tsx watch keeps a stale global otherwise. */
function getPrisma(): PrismaClient {
  const cached = globalForPrisma.prisma
  if (cached && 'enrollment' in cached) {
    return cached
  }
  const client = createPrismaClient()
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client
  }
  return client
}

export const prisma = getPrisma()
