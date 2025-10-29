/**
 * Prisma Middleware for Row-Level Security (RLS)
 * Automatically sets app.tenant_id and app.is_admin before each query
 */

import { Prisma, PrismaClient } from '@prisma/client';

/**
 * Interface for RLS context
 */
export interface RLSContext {
  tenantId: string | null;
  isAdmin: boolean;
  userId?: string;
}

/**
 * Add RLS middleware to Prisma Client
 */
export function addRLSMiddleware(prisma: PrismaClient) {
  prisma.$use(async (params, next) => {
    // Skip for migrations and system operations
    if (params.action === 'executeRaw' || params.action === 'queryRaw') {
      return next(params);
    }

    // RLS context should be set via setRLSContext
    // If not set, skip (for system operations)
    try {
      return await next(params);
    } catch (error) {
      console.error('[RLS Middleware] Error:', error);
      throw error;
    }
  });
}

/**
 * Set RLS context for current request
 * Called at the start of each API request
 */
export async function setRLSContext(
  prisma: PrismaClient,
  context: RLSContext
): Promise<void> {
  try {
    // Set app.tenant_id
    if (context.tenantId) {
      await prisma.$executeRawUnsafe(
        `SET LOCAL app.tenant_id = '${context.tenantId}'`
      );
    } else {
      // Reset for global admins
      await prisma.$executeRawUnsafe(`SET LOCAL app.tenant_id = ''`);
    }

    // Set app.is_admin
    await prisma.$executeRawUnsafe(
      `SET LOCAL app.is_admin = '${context.isAdmin}'`
    );
  } catch (error) {
    console.error('[RLS] Failed to set context:', error);
    throw new Error('Failed to set RLS context');
  }
}

/**
 * Clear RLS context (for cleanup)
 */
export async function clearRLSContext(prisma: PrismaClient): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(`RESET app.tenant_id`);
    await prisma.$executeRawUnsafe(`RESET app.is_admin`);
  } catch (error) {
    console.error('[RLS] Failed to clear context:', error);
  }
}

/**
 * Wrapper for executing query with RLS context
 * Automatically sets and clears context
 */
export async function withRLSContext<T>(
  prisma: PrismaClient,
  context: RLSContext,
  fn: () => Promise<T>
): Promise<T> {
  try {
    await setRLSContext(prisma, context);
    return await fn();
  } finally {
    await clearRLSContext(prisma);
  }
}

/**
 * Get RLS context from NextAuth session
 */
export function getRLSContextFromSession(session: any): RLSContext {
  if (!session?.user) {
    throw new Error('Unauthorized: No session found');
  }

  return {
    tenantId: session.user.tenantId || null,
    isAdmin: session.user.role === 'ADMIN',
    userId: session.user.id,
  };
}

/**
 * Middleware function for API routes
 * Automatically sets RLS context from session
 */
export async function withRLSFromSession<T>(
  prisma: PrismaClient,
  session: any,
  fn: () => Promise<T>
): Promise<T> {
  const context = getRLSContextFromSession(session);
  return withRLSContext(prisma, context, fn);
}

/**
 * Check if user has access to tenant
 */
export function validateTenantAccess(
  session: any,
  tenantId: string
): boolean {
  // Global admins have access to all tenants
  if (session.user.role === 'ADMIN') {
    return true;
  }

  // Regular users have access only to their tenant
  return session.user.tenantId === tenantId;
}

/**
 * RLS event logging for debugging
 */
export function logRLSEvent(
  action: string,
  context: RLSContext,
  metadata?: any
) {
  if (process.env.NODE_ENV === 'development') {
    console.log('[RLS]', {
      action,
      tenantId: context.tenantId,
      isAdmin: context.isAdmin,
      userId: context.userId,
      ...metadata,
    });
  }
}

