/**
 * Helper functions for API routes with RLS support
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { prisma } from './prisma';
import { setRLSContext, getRLSContextFromSession, validateTenantAccess } from './prisma-rls';

/**
 * Get authenticated session for API route
 * Automatically sets RLS context
 */
export async function getAuthenticatedSession() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error('UNAUTHORIZED');
  }

  // Set RLS context
  try {
    const rlsContext = getRLSContextFromSession(session);
    await setRLSContext(prisma, rlsContext);
  } catch (error) {
    console.error('[API] Failed to set RLS context:', error);
    throw new Error('INTERNAL_ERROR');
  }

  return session;
}

/**
 * Check access to tenant
 */
export function checkTenantAccess(session: any, tenantId: string): void {
  if (!validateTenantAccess(session, tenantId)) {
    throw new Error('FORBIDDEN');
  }
}

/**
 * Error handler for API routes
 */
export function handleApiError(error: any) {
  console.error('[API Error]:', error);

  if (error.message === 'UNAUTHORIZED') {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  if (error.message === 'FORBIDDEN') {
    return NextResponse.json(
      { error: 'Forbidden: Access denied' },
      { status: 403 }
    );
  }

  if (error.message === 'NOT_FOUND') {
    return NextResponse.json(
      { error: 'Resource not found' },
      { status: 404 }
    );
  }

  // Prisma validation errors
  if (error.code === 'P2025') {
    return NextResponse.json(
      { error: 'Resource not found' },
      { status: 404 }
    );
  }

  // Prisma unique constraint errors
  if (error.code === 'P2002') {
    return NextResponse.json(
      { error: 'Resource already exists' },
      { status: 409 }
    );
  }

  // RLS violation or permission denied
  if (error.code === '42501') {
    return NextResponse.json(
      { error: 'Forbidden: Insufficient permissions' },
      { status: 403 }
    );
  }

  // Generic error
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}

/**
 * Wrapper for API route handler with automatic RLS and error handling
 */
export function withApiHandler<T = any>(
  handler: (request: Request, context?: any) => Promise<NextResponse<T>>
) {
  return async (request: Request, context?: any) => {
    try {
      // Set RLS context
      try {
        await getAuthenticatedSession();
      } catch (error: any) {
        if (error.message === 'UNAUTHORIZED') {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
          );
        }
        throw error;
      }

      // Execute handler
      return await handler(request, context);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

/**
 * Check user role
 */
export function requireRole(session: any, allowedRoles: string[]): void {
  if (!allowedRoles.includes(session.user.role)) {
    throw new Error('FORBIDDEN');
  }
}

/**
 * Check specific permission for agent
 */
export function requirePermission(session: any, permission: string): void {
  // ADMIN and TENANT_ADMIN have all permissions
  if (session.user.role === 'ADMIN' || session.user.role === 'TENANT_ADMIN') {
    return;
  }

  // Check module permissions for AGENT
  if (session.user.role === 'AGENT') {
    const permissions = session.user.permissions || {};
    if (!permissions[permission]) {
      throw new Error('FORBIDDEN');
    }
  } else {
    // USER does not have extended permissions
    throw new Error('FORBIDDEN');
  }
}

/**
 * API request logging
 */
export function logApiRequest(
  method: string,
  path: string,
  userId?: string,
  tenantId?: string
) {
  if (process.env.NODE_ENV === 'development') {
    console.log('[API Request]', {
      method,
      path,
      userId,
      tenantId,
      timestamp: new Date().toISOString(),
    });
  }
}

