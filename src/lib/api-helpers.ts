/**
 * Helper функции для API routes с поддержкой RLS
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { prisma } from './prisma';
import { setRLSContext, getRLSContextFromSession, validateTenantAccess } from './prisma-rls';

/**
 * Получить авторизованную сессию для API route
 * Автоматически устанавливает RLS контекст
 */
export async function getAuthenticatedSession() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error('UNAUTHORIZED');
  }

  // Устанавливаем RLS контекст
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
 * Проверить доступ к tenant
 */
export function checkTenantAccess(session: any, tenantId: string): void {
  if (!validateTenantAccess(session, tenantId)) {
    throw new Error('FORBIDDEN');
  }
}

/**
 * Обработчик ошибок для API routes
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
 * Wrapper для API route handler с автоматическим RLS и error handling
 */
export function withApiHandler<T = any>(
  handler: (request: Request, context?: any) => Promise<NextResponse<T>>
) {
  return async (request: Request, context?: any) => {
    try {
      // Устанавливаем RLS контекст
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

      // Выполняем handler
      return await handler(request, context);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

/**
 * Проверить роль пользователя
 */
export function requireRole(session: any, allowedRoles: string[]): void {
  if (!allowedRoles.includes(session.user.role)) {
    throw new Error('FORBIDDEN');
  }
}

/**
 * Проверить конкретное permission для agent
 */
export function requirePermission(session: any, permission: string): void {
  // ADMIN и TENANT_ADMIN имеют все права
  if (session.user.role === 'ADMIN' || session.user.role === 'TENANT_ADMIN') {
    return;
  }

  // Проверяем модульные permissions для AGENT
  if (session.user.role === 'AGENT') {
    const permissions = session.user.permissions || {};
    if (!permissions[permission]) {
      throw new Error('FORBIDDEN');
    }
  } else {
    // USER не имеет расширенных permissions
    throw new Error('FORBIDDEN');
  }
}

/**
 * Логирование API запросов
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

