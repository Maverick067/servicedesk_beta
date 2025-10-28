"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import type { FeatureFlag, TenantModules } from "@/lib/feature-flags";

/**
 * Hook для проверки доступности модулей на клиенте
 */
export function useModules() {
  const { data: session } = useSession();
  const [modules, setModules] = useState<TenantModules>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchModules() {
      // Для глобального ADMIN все модули доступны
      if (!session?.user.tenantId) {
        if (session?.user.role === "ADMIN") {
          // Включаем все модули для глобального ADMIN
          setModules({
            queues: true,
            sla: true,
            knowledge: true,
            automation: true,
            assets: true,
            webhooks: true,
            ldap: true,
            reports: true,
            customFields: true,
            savedFilters: true,
          });
        }
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/tenants/${session.user.tenantId}/modules`);
        if (response.ok) {
          const data = await response.json();
          setModules(data.modules || {});
        }
      } catch (error) {
        console.error("Error fetching modules:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchModules();
  }, [session?.user.tenantId, session?.user.role]);

  const isModuleEnabled = (module: FeatureFlag): boolean => {
    // Для глобального ADMIN все модули доступны
    if (session?.user.role === "ADMIN" && !session?.user.tenantId) {
      return true;
    }
    return modules[module] === true;
  };

  return {
    modules,
    isLoading,
    isModuleEnabled,
  };
}

