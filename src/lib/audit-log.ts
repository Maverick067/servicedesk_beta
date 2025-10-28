/**
 * Утилиты для audit log (логирование действий пользователей)
 */

import { prisma } from "./prisma";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "LOGOUT"
  | "ASSIGN"
  | "UNASSIGN"
  | "STATUS_CHANGE"
  | "COMMENT"
  | "INVITE";

export type ResourceType =
  | "TICKET"
  | "USER"
  | "CATEGORY"
  | "TENANT"
  | "COMMENT"
  | "ROLE"
  | "PERMISSION"
  | "SETTINGS";

interface AuditLogOptions {
  tenantId: string;
  userId?: string;
  action: AuditAction;
  resourceType: ResourceType;
  resourceId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Создает запись в audit log
 */
export async function createAuditLog(options: AuditLogOptions): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId: options.tenantId,
        userId: options.userId || null,
        action: options.action,
        resourceType: options.resourceType,
        resourceId: options.resourceId || null,
        metadata: options.metadata || null,
        ipAddress: options.ipAddress || null,
        userAgent: options.userAgent || null,
      },
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
    // Не прерываем основную операцию, если логирование не удалось
  }
}

/**
 * Получает IP адрес из запроса
 */
export function getClientIp(request: Request): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  return undefined;
}

/**
 * Получает User-Agent из запроса
 */
export function getUserAgent(request: Request): string | undefined {
  return request.headers.get("user-agent") || undefined;
}

/**
 * Получает логи аудита для tenant
 */
export async function getAuditLogs(
  tenantId: string,
  options?: {
    userId?: string;
    resourceType?: ResourceType;
    action?: AuditAction;
    limit?: number;
    offset?: number;
  }
) {
  const where: any = {
    tenantId,
  };

  if (options?.userId) {
    where.userId = options.userId;
  }

  if (options?.resourceType) {
    where.resourceType = options.resourceType;
  }

  if (options?.action) {
    where.action = options.action;
  }

  return await prisma.auditLog.findMany({
    where,
    orderBy: {
      createdAt: "desc",
    },
    take: options?.limit || 100,
    skip: options?.offset || 0,
  });
}

/**
 * Форматирует действие для отображения
 */
export function formatAuditAction(action: string, resourceType: string): string {
  const actionMap: Record<string, string> = {
    CREATE: "создал(а)",
    UPDATE: "обновил(а)",
    DELETE: "удалил(а)",
    LOGIN: "вошел(а) в систему",
    LOGOUT: "вышел(а) из системы",
    ASSIGN: "назначил(а)",
    UNASSIGN: "снял(а) назначение",
    STATUS_CHANGE: "изменил(а) статус",
    COMMENT: "прокомментировал(а)",
    INVITE: "пригласил(а)",
  };

  const resourceMap: Record<string, string> = {
    TICKET: "тикет",
    USER: "пользователя",
    CATEGORY: "категорию",
    TENANT: "организацию",
    COMMENT: "комментарий",
    ROLE: "роль",
    PERMISSION: "разрешение",
    SETTINGS: "настройки",
  };

  const actionText = actionMap[action] || action;
  const resourceText = resourceMap[resourceType] || resourceType;

  if (action === "LOGIN" || action === "LOGOUT") {
    return actionText;
  }

  return `${actionText} ${resourceText}`;
}

