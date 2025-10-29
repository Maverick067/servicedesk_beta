/**
 * Domain-based Tenant Resolution
 * 
 * This module determines tenant by subdomain or custom domain.
 */

import { prisma } from "./prisma";
import { headers } from "next/headers";

/**
 * Get tenant slug from subdomain or custom domain
 */
export async function getTenantFromDomain(): Promise<string | null> {
  const headersList = headers();
  
  // X-Tenant header is set by Nginx for subdomain routing
  const tenantSlug = headersList.get("x-tenant");
  
  // X-Custom-Domain header is set by Nginx for custom domains
  const customDomain = headersList.get("x-custom-domain");

  // If tenant slug (subdomain) exists, use it
  if (tenantSlug && tenantSlug !== "") {
    return tenantSlug;
  }

  // If custom domain exists, find tenant by it
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
 * Check if request is subdomain request
 */
export function isSubdomainRequest(): boolean {
  const headersList = headers();
  const tenantSlug = headersList.get("x-tenant");
  return !!tenantSlug && tenantSlug !== "";
}

/**
 * Check if request is custom domain request
 */
export function isCustomDomainRequest(): boolean {
  const headersList = headers();
  const customDomain = headersList.get("x-custom-domain");
  return !!customDomain;
}

/**
 * Get tenant ID by slug
 */
export async function getTenantIdBySlug(slug: string): Promise<string | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true },
  });

  return tenant?.id || null;
}

/**
 * Middleware helper: redirect if tenant not found
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

