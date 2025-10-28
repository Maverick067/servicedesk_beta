/**
 * Утилиты для API routes
 */

/**
 * Получить WHERE clause для фильтрации по tenantId
 * Глобальный ADMIN видит все данные, остальные - только своего тенанта
 */
export function getTenantWhereClause(session: any): { tenantId?: string } {
  // Глобальный ADMIN видит всё
  if (session.user.role === "ADMIN") {
    return {};
  }
  
  // Остальные - только свой tenant
  if (!session.user.tenantId) {
    throw new Error("Tenant ID required for non-admin users");
  }
  
  return { tenantId: session.user.tenantId };
}

/**
 * Получить tenantId для создания ресурсов
 * Возвращает tenantId пользователя или выбрасывает ошибку для глобального админа
 */
export function getTenantIdForCreate(session: any, explicitTenantId?: string): string {
  // Если явно указан tenantId (например, при создании организации), используем его
  if (explicitTenantId) {
    return explicitTenantId;
  }
  
  // Для обычных пользователей используем их tenantId
  if (session.user.tenantId) {
    return session.user.tenantId;
  }
  
  // Глобальный админ не может создавать ресурсы без указания tenantId
  throw new Error("Global admin must specify tenantId when creating resources");
}

/**
 * Проверить доступ к ресурсу по tenantId
 */
export function checkTenantAccess(session: any, resourceTenantId: string | null): boolean {
  // Глобальный ADMIN имеет доступ ко всему
  if (session.user.role === "ADMIN") {
    return true;
  }
  
  // Остальные - только к своему тенанту
  return session.user.tenantId === resourceTenantId;
}

