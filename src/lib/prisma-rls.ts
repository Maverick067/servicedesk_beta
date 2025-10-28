/**
 * Prisma Middleware для Row-Level Security (RLS)
 * Автоматически устанавливает app.tenant_id и app.is_admin перед каждым запросом
 */

import { Prisma, PrismaClient } from '@prisma/client';

/**
 * Интерфейс для контекста RLS
 */
export interface RLSContext {
  tenantId: string | null;
  isAdmin: boolean;
  userId?: string;
}

/**
 * Добавить RLS middleware к Prisma Client
 */
export function addRLSMiddleware(prisma: PrismaClient) {
  prisma.$use(async (params, next) => {
    // Пропускаем для миграций и системных операций
    if (params.action === 'executeRaw' || params.action === 'queryRaw') {
      return next(params);
    }

    // RLS context должен быть установлен через setRLSContext
    // Если не установлен, пропускаем (для системных операций)
    try {
      return await next(params);
    } catch (error) {
      console.error('[RLS Middleware] Error:', error);
      throw error;
    }
  });
}

/**
 * Установить RLS контекст для текущего запроса
 * Вызывается в начале каждого API запроса
 */
export async function setRLSContext(
  prisma: PrismaClient,
  context: RLSContext
): Promise<void> {
  try {
    // Устанавливаем app.tenant_id
    if (context.tenantId) {
      await prisma.$executeRawUnsafe(
        `SET LOCAL app.tenant_id = '${context.tenantId}'`
      );
    } else {
      // Сбрасываем для глобальных админов
      await prisma.$executeRawUnsafe(`SET LOCAL app.tenant_id = ''`);
    }

    // Устанавливаем app.is_admin
    await prisma.$executeRawUnsafe(
      `SET LOCAL app.is_admin = '${context.isAdmin}'`
    );
  } catch (error) {
    console.error('[RLS] Failed to set context:', error);
    throw new Error('Failed to set RLS context');
  }
}

/**
 * Сбросить RLS контекст (для cleanup)
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
 * Обертка для выполнения запроса с RLS контекстом
 * Автоматически устанавливает и очищает контекст
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
 * Получить RLS контекст из NextAuth session
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
 * Middleware функция для API routes
 * Автоматически устанавливает RLS контекст из session
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
 * Проверить, имеет ли пользователь доступ к tenant
 */
export function validateTenantAccess(
  session: any,
  tenantId: string
): boolean {
  // Глобальные админы имеют доступ ко всем tenants
  if (session.user.role === 'ADMIN') {
    return true;
  }

  // Обычные пользователи имеют доступ только к своему tenant
  return session.user.tenantId === tenantId;
}

/**
 * Логирование RLS events для debugging
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

