import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./prisma";
import type { FeatureFlag } from "./feature-flags";

/**
 * Checks if user has access to module on server
 */
export async function checkModuleAccess(module: FeatureFlag): Promise<boolean> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return false;
  }

  // Global ADMIN has access to all modules
  if (session.user.role === "ADMIN" && !session.user.tenantId) {
    return true;
  }

  // If no tenantId, no access
  if (!session.user.tenantId) {
    return false;
  }

  try {
    // Get tenant module settings
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: {
        settings: true,
      },
    });

    if (!tenant) {
      return false;
    }

    const modules = (tenant.settings as any)?.modules || {};
    return modules[module] === true;
  } catch (error) {
    console.error("Error checking module access:", error);
    return false;
  }
}

/**
 * Mapping of paths to modules
 */
export const MODULE_PATHS: Record<FeatureFlag, string[]> = {
  queues: ["/dashboard/queues"],
  sla: ["/dashboard/sla"],
  knowledge: ["/dashboard/knowledge"],
  automation: ["/dashboard/automation"],
  assets: ["/dashboard/assets"],
  webhooks: ["/dashboard/webhooks"],
  ldap: ["/dashboard/ldap", "/dashboard/settings/sso"],
  reports: ["/dashboard/reports"],
  customFields: ["/dashboard/custom-fields"],
  savedFilters: ["/dashboard/filters"],
};

/**
 * Determines which module is required for the given path
 */
export function getRequiredModuleForPath(path: string): FeatureFlag | null {
  for (const [module, paths] of Object.entries(MODULE_PATHS)) {
    if (paths.some(p => path.startsWith(p))) {
      return module as FeatureFlag;
    }
  }
  return null;
}

