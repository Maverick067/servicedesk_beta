/**
 * Utilities for API routes
 */

/**
 * Get WHERE clause for filtering by tenantId
 * Global ADMIN sees all data, others - only their tenant
 */
export function getTenantWhereClause(session: any): { tenantId?: string } {
  // Global ADMIN sees everything
  if (session.user.role === "ADMIN") {
    return {};
  }
  
  // Others - only their tenant
  if (!session.user.tenantId) {
    throw new Error("Tenant ID required for non-admin users");
  }
  
  return { tenantId: session.user.tenantId };
}

/**
 * Get tenantId for creating resources
 * Returns user's tenantId or throws error for global admin
 */
export function getTenantIdForCreate(session: any, explicitTenantId?: string): string {
  // If tenantId is explicitly specified (e.g., when creating organization), use it
  if (explicitTenantId) {
    return explicitTenantId;
  }
  
  // For regular users, use their tenantId
  if (session.user.tenantId) {
    return session.user.tenantId;
  }
  
  // Global admin cannot create resources without specifying tenantId
  throw new Error("Global admin must specify tenantId when creating resources");
}

/**
 * Check access to resource by tenantId
 */
export function checkTenantAccess(session: any, resourceTenantId: string | null): boolean {
  // Global ADMIN has access to everything
  if (session.user.role === "ADMIN") {
    return true;
  }
  
  // Others - only to their tenant
  return session.user.tenantId === resourceTenantId;
}

