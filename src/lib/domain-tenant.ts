/**
 * Domain-based Tenant Resolution
 * 
 * Этот модуль определяет tenant по subdomain или custom domain.
 */

import { prisma } from "./prisma";
import { headers } from "next/headers";

/**
 * Получить tenant slug из subdomain или custom domain
 */
export async function getTenantFromDomain(): Promise<string | null> {
  const headersList = headers();
  
  // X-Tenant header устанавливается Nginx для subdomain routing
  const tenantSlug = headersList.get("x-tenant");
  
  // X-Custom-Domain header устанавливается Nginx для custom domains
  const customDomain = headersList.get("x-custom-domain");

  // Если есть tenant slug (subdomain), используем его
  if (tenantSlug && tenantSlug !== "") {
    return tenantSlug;
  }

  // Если есть custom domain, ищем tenant по нему
  if (customDomain) {
    const tenant = await prisma.tenant.findFirst({
      where: {
        customDomain: customDomain,
        customDomainVerified: true,
      },
      select: {
        slug: true,
      },
    });

    return tenant?.slug || null;
  }

  return null;
}

/**
 * Проверить, является ли запрос subdomain запросом
 */
export function isSubdomainRequest(): boolean {
  const headersList = headers();
  const tenantSlug = headersList.get("x-tenant");
  return !!tenantSlug && tenantSlug !== "";
}

/**
 * Проверить, является ли запрос custom domain запросом
 */
export function isCustomDomainRequest(): boolean {
  const headersList = headers();
  const customDomain = headersList.get("x-custom-domain");
  return !!customDomain;
}

/**
 * Получить tenant ID по slug
 */
export async function getTenantIdBySlug(slug: string): Promise<string | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true },
  });

  return tenant?.id || null;
}

/**
 * Middleware helper: redirect если tenant не найден
 */
export async function requireTenant(): Promise<{
  tenantSlug: string;
  tenantId: string;
} | null> {
  const tenantSlug = await getTenantFromDomain();

  if (!tenantSlug) {
    return null;
  }

  const tenantId = await getTenantIdBySlug(tenantSlug);

  if (!tenantId) {
    return null;
  }

  return {
    tenantSlug,
    tenantId,
  };
}

