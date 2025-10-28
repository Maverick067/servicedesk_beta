import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./prisma";
import type { FeatureFlag } from "./feature-flags";

/**
 * Проверяет, имеет ли пользователь доступ к модулю на сервере
 */
export async function checkModuleAccess(module: FeatureFlag): Promise<boolean> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return false;
  }

  // Глобальный ADMIN имеет доступ ко всем модулям
  if (session.user.role === "ADMIN" && !session.user.tenantId) {
    return true;
  }

  // Если нет tenantId, доступа нет
  if (!session.user.tenantId) {
    return false;
  }

  try {
    // Получаем настройки модулей tenant'а
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
 * Маппинг путей к модулям
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
 * Определяет, какой модуль требуется для данного пути
 */
export function getRequiredModuleForPath(path: string): FeatureFlag | null {
  for (const [module, paths] of Object.entries(MODULE_PATHS)) {
    if (paths.some(p => path.startsWith(p))) {
      return module as FeatureFlag;
    }
  }
  return null;
}

