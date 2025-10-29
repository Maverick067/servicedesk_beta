"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import type { FeatureFlag, TenantModules } from "@/lib/feature-flags";

/**
 * Hook for checking module availability on client
 */
export function useModules() {
  const { data: session } = useSession();
  const [modules, setModules] = useState<TenantModules>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchModules() {
      // For global ADMIN all modules are available
      if (!session?.user.tenantId) {
        if (session?.user.role === "ADMIN") {
          // Enable all modules for global ADMIN
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
    // For global ADMIN all modules are available
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

