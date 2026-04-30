/**
 * Utilities for audit log (logging user actions)
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
  | "SETTINGS"
  | "ASSET"
  | "AUTOMATION_RULE"
  | "CUSTOM_FIELD"
  | "KNOWLEDGE_ARTICLE"
  | "LDAP_CONFIG"
  | "QUEUE"
  | "SLA_POLICY"
  | "TENANT_MODULES"
  | "WEBHOOK";

interface AuditLogOptions {
  tenantId: string;
  userId?: string | null;
  action: AuditAction | string;
  resourceType: ResourceType | string;
  resourceId?: string;
  metadata?: Record<string, any>;
  request?: Request;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Creates an entry in audit log
 */
export async function createAuditLog(options: AuditLogOptions): Promise<void> {
  try {
    const ipAddress = options.ipAddress || (options.request ? getClientIp(options.request) : undefined);
    const userAgent = options.userAgent || (options.request ? getUserAgent(options.request) : undefined);

    await prisma.auditLog.create({
      data: {
        tenantId: options.tenantId,
        userId: options.userId || null,
        action: options.action,
        resourceType: options.resourceType,
        resourceId: options.resourceId || null,
        metadata: options.metadata ?? undefined,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
    // Don't interrupt main operation if logging failed
  }
}

/**
 * Gets IP address from request
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
 * Gets User-Agent from request
 */
export function getUserAgent(request: Request): string | undefined {
  return request.headers.get("user-agent") || undefined;
}

/**
 * Gets audit logs for tenant
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
 * Formats action for display
 */
export function formatAuditAction(action: string, resourceType: string): string {
  const actionMap: Record<string, string> = {
    CREATE: "created",
    UPDATE: "updated",
    DELETE: "deleted",
    LOGIN: "logged in",
    LOGOUT: "logged out",
    ASSIGN: "assigned",
    UNASSIGN: "unassigned",
    STATUS_CHANGE: "changed status",
    COMMENT: "commented",
    INVITE: "invited",
  };

  const resourceMap: Record<string, string> = {
    TICKET: "ticket",
    USER: "user",
    CATEGORY: "category",
    TENANT: "organization",
    COMMENT: "comment",
    ROLE: "role",
    PERMISSION: "permission",
    SETTINGS: "settings",
    ASSET: "asset",
    AUTOMATION_RULE: "automation rule",
    CUSTOM_FIELD: "custom field",
    KNOWLEDGE_ARTICLE: "knowledge article",
    LDAP_CONFIG: "LDAP config",
    QUEUE: "queue",
    SLA_POLICY: "SLA policy",
    TENANT_MODULES: "tenant modules",
    WEBHOOK: "webhook",
  };

  const actionText = actionMap[action] || action;
  const resourceText = resourceMap[resourceType] || resourceType;

  if (action === "LOGIN" || action === "LOGOUT") {
    return actionText;
  }

  return `${actionText} ${resourceText}`;
}

