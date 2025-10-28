import { PrismaClient } from '@prisma/client'
import { addRLSMiddleware } from './prisma-rls'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn']
      : ['error'],
  })

  // Добавляем RLS middleware
  addRLSMiddleware(client)

  return client
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

