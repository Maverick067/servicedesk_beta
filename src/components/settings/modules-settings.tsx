"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Lock, Sparkles } from "lucide-react";
import { MODULE_METADATA, MODULE_PLAN_REQUIREMENTS, type FeatureFlag } from "@/lib/feature-flags";
import { motion } from "framer-motion";
import { toast } from "sonner";

export function ModulesSettings() {
  const { data: session } = useSession();
  const [modules, setModules] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [updatingModules, setUpdatingModules] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchModules() {
      if (!session?.user.tenantId) return;

      try {
        const response = await fetch(`/api/tenants/${session.user.tenantId}/modules`);
        if (!response.ok) throw new Error("Failed to fetch modules");
        
        const data = await response.json();
        setModules(data.modules || {});
      } catch (error) {
        console.error("Error fetching modules:", error);
        toast.error("Failed to load module settings");
      } finally {
        setIsLoading(false);
      }
    }

    fetchModules();
  }, [session?.user.tenantId]);

  const handleToggleModule = async (module: FeatureFlag, enabled: boolean) => {
    if (!session?.user.tenantId) return;

    // Add to updating list
    setUpdatingModules(prev => new Set(prev).add(module));

    // Optimistic UI update
    setModules(prev => ({ ...prev, [module]: enabled }));

    try {
      const response = await fetch(`/api/tenants/${session.user.tenantId}/modules`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modules: { [module]: enabled },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("API Error:", error);
        throw new Error(error.message || error.error || "Failed to update module");
      }

      const data = await response.json();
      setModules(data.modules);
      
      toast.success(
        enabled 
          ? `Module "${MODULE_METADATA[module].name}" enabled`
          : `Module "${MODULE_METADATA[module].name}" disabled`
      );
    } catch (error: any) {
      console.error("Error updating module:", error);
      // Rollback change on error
      setModules(prev => ({ ...prev, [module]: !enabled }));
      toast.error(error.message || "Failed to update module");
    } finally {
      // Remove from updating list
      setUpdatingModules(prev => {
        const newSet = new Set(prev);
        newSet.delete(module);
        return newSet;
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const modulesList = Object.keys(MODULE_METADATA) as FeatureFlag[];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">System Modules</h2>
        <p className="text-muted-foreground mt-2">
          Enable and disable functionality for your organization
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {modulesList.map((moduleKey, index) => {
          const module = MODULE_METADATA[moduleKey];
          const isEnabled = modules[moduleKey] === true;
          const isUpdating = updatingModules.has(moduleKey);
          const requiredPlan = MODULE_PLAN_REQUIREMENTS[moduleKey];
          const isFree = requiredPlan === "FREE";
          const isTenantAdmin = session?.user.role === "TENANT_ADMIN";
          
          // Tenant admin cannot change paid modules
          const isLocked = isTenantAdmin && !isFree;

          return (
            <motion.div
              key={moduleKey}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
            >
              <Card
                className={`relative overflow-hidden transition-all duration-300 ${
                  isEnabled ? "border-l-4 shadow-md" : "opacity-80"
                } ${isLocked ? "bg-gray-50 dark:bg-gray-900" : ""}`}
                style={isEnabled ? { borderLeftColor: module.color } : {}}
              >
                {isEnabled && !isLocked && (
                  <div
                    className="absolute inset-0 opacity-5"
                    style={{
                      background: `linear-gradient(135deg, ${module.color} 0%, ${module.color}88 100%)`,
                    }}
                  ></div>
                )}
                <CardHeader className="pb-3 relative">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className="text-3xl p-3 rounded-lg relative"
                        style={{
                          backgroundColor: isEnabled && !isLocked ? `${module.color}20` : "#f1f5f9",
                        }}
                      >
                        {module.icon}
                        {isLocked && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
                            <Lock className="h-5 w-5 text-gray-600" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-lg">{module.name}</CardTitle>
                          {isFree ? (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                              Free
                            </Badge>
                          ) : (
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                requiredPlan === "PRO" 
                                  ? "bg-blue-50 text-blue-700 border-blue-200" 
                                  : "bg-purple-50 text-purple-700 border-purple-200"
                              }`}
                            >
                              <Sparkles className="h-3 w-3 mr-1" />
                              {requiredPlan}
                            </Badge>
                          )}
                          {module.comingSoon && (
                            <Badge variant="outline" className="text-xs">
                              Coming Soon
                            </Badge>
                          )}
                          {isLocked && isEnabled && (
                            <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                              Active on Subscription
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="mt-1">
                          {module.description}
                          {isLocked && (
                            <span className="block mt-1 text-xs text-muted-foreground">
                              {isEnabled 
                                ? "Module activated via your subscription"
                                : "Available on " + requiredPlan + " plan"}
                            </span>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {isUpdating && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                      <Switch
                        id={moduleKey}
                        checked={isEnabled}
                        onCheckedChange={(checked) => handleToggleModule(moduleKey, checked)}
                        disabled={isUpdating || module.comingSoon || isLocked}
                      />
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="text-2xl">ℹ️</div>
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-100">
                About Modules
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                <strong>Free modules</strong> can be enabled and disabled independently.{" "}
                <strong>Paid modules</strong> (PRO and ENTERPRISE) become available automatically
                after subscribing to the corresponding plan.
              </p>
              {session?.user.role === "TENANT_ADMIN" && (
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                  💡 To activate paid modules, go to{" "}
                  <a href="/dashboard/billing" className="underline font-medium">
                    Plans & Billing
                  </a>
                  .
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

