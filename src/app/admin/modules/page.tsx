"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Building2, Settings, Check, X } from "lucide-react";
import { toast } from "sonner";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  settings: {
    modules: {
      [key: string]: boolean;
    };
  };
}

const AVAILABLE_MODULES = [
  { key: "queues", name: "Queues", description: "Queue system for grouping tickets" },
  { key: "sla", name: "SLA Policies", description: "Response and resolution time management" },
  { key: "knowledge", name: "Knowledge Base", description: "Articles and documentation" },
  { key: "automation", name: "Automation", description: "Automatic processing rules" },
  { key: "assets", name: "IT Assets (CMDB)", description: "Equipment management" },
  { key: "reports", name: "Reports", description: "Advanced analytics and export" },
  { key: "webhooks", name: "Webhooks", description: "Integration with external systems" },
  { key: "ldap", name: "LDAP/SSO", description: "Active Directory integration" },
];

export default function AdminModulesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingModules, setUpdatingModules] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session || session.user.role !== "ADMIN") {
      router.push("/dashboard");
      return;
    }
  }, [session, status, router]);

  useEffect(() => {
    if (!session || session.user.role !== "ADMIN") return;

    async function fetchTenants() {
      try {
        const response = await fetch("/api/tenants");
        if (!response.ok) throw new Error("Failed to fetch tenants");
        const data = await response.json();
        setTenants(data);
      } catch (error) {
        console.error("Error fetching tenants:", error);
        toast.error("Error loading organizations");
      } finally {
        setIsLoading(false);
      }
    }

    fetchTenants();
  }, [session]);

  const handleModuleToggle = async (tenantId: string, moduleKey: string, currentValue: boolean) => {
    const updateKey = `${tenantId}-${moduleKey}`;
    setUpdatingModules(prev => ({ ...prev, [updateKey]: true }));

    try {
      const tenant = tenants.find(t => t.id === tenantId);
      if (!tenant) throw new Error("Tenant not found");

      const newModules = {
        ...tenant.settings.modules,
        [moduleKey]: !currentValue
      };

      const response = await fetch(`/api/tenants/${tenantId}/modules`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modules: newModules }),
      });

      if (!response.ok) throw new Error("Failed to update module");

      // Update local state
      setTenants(prev =>
        prev.map(t =>
          t.id === tenantId
            ? {
                ...t,
                settings: {
                  ...t.settings,
                  modules: newModules
                }
              }
            : t
        )
      );

      toast.success(`Module ${!currentValue ? "enabled" : "disabled"}`);
    } catch (error: any) {
      toast.error("Error updating module", { description: error.message });
    } finally {
      setUpdatingModules(prev => ({ ...prev, [updateKey]: false }));
    }
  };

  const enableAllModules = async (tenantId: string) => {
    try {
      const allModules = AVAILABLE_MODULES.reduce((acc, mod) => ({
        ...acc,
        [mod.key]: true
      }), {});

      const response = await fetch(`/api/tenants/${tenantId}/modules`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modules: allModules }),
      });

      if (!response.ok) throw new Error("Failed to update modules");

      setTenants(prev =>
        prev.map(t =>
          t.id === tenantId
            ? {
                ...t,
                settings: {
                  ...t.settings,
                  modules: allModules
                }
              }
            : t
        )
      );

      toast.success("All modules enabled");
    } catch (error: any) {
      toast.error("Error", { description: error.message });
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-3xl font-bold">Module Management</h1>
        <div className="animate-pulse space-y-4">
          {[1, 2].map(i => (
            <Card key={i}>
              <CardContent className="h-64" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-3">
          <Settings className="h-8 w-8 text-purple-600" />
          Module Management
        </h1>
        <p className="text-muted-foreground mt-2">
          Activate or deactivate features for each organization
        </p>
      </div>

      <div className="space-y-6">
        {tenants.map(tenant => {
          const enabledCount = Object.values(tenant.settings.modules || {}).filter(Boolean).length;
          
          return (
            <Card key={tenant.id} className="border-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-6 w-6 text-blue-600" />
                    <div>
                      <CardTitle className="text-xl">{tenant.name}</CardTitle>
                      <CardDescription className="mt-1">
                        <code className="bg-muted px-2 py-1 rounded text-xs">
                          {tenant.slug}
                        </code>
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={enabledCount === AVAILABLE_MODULES.length ? "default" : "secondary"}>
                      {enabledCount} / {AVAILABLE_MODULES.length} modules
                    </Badge>
                    <Button
                      size="sm"
                      onClick={() => enableAllModules(tenant.id)}
                      disabled={enabledCount === AVAILABLE_MODULES.length}
                    >
                      Enable All
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {AVAILABLE_MODULES.map(module => {
                    const isEnabled = tenant.settings.modules?.[module.key] || false;
                    const updateKey = `${tenant.id}-${module.key}`;
                    const isUpdating = updatingModules[updateKey];

                    return (
                      <div
                        key={module.key}
                        className={`flex items-start justify-between p-4 rounded-lg border-2 transition-all ${
                          isEnabled
                            ? "bg-green-50 border-green-200"
                            : "bg-slate-50 border-slate-200"
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{module.name}</h4>
                            {isEnabled ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <X className="h-4 w-4 text-slate-400" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {module.description}
                          </p>
                        </div>
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={() =>
                            handleModuleToggle(tenant.id, module.key, isEnabled)
                          }
                          disabled={isUpdating}
                        />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {tenants.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Organizations</h3>
              <p className="text-muted-foreground">
                Create an organization to manage modules
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

