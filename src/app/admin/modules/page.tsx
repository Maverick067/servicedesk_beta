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
  { key: "queues", name: "Очереди", description: "Система очередей для группировки тикетов" },
  { key: "sla", name: "SLA Политики", description: "Управление временем реакции и решения" },
  { key: "knowledge", name: "База знаний", description: "Статьи и документация" },
  { key: "automation", name: "Автоматизация", description: "Правила автоматической обработки" },
  { key: "assets", name: "IT Активы (CMDB)", description: "Управление оборудованием" },
  { key: "reports", name: "Отчёты", description: "Расширенная аналитика и экспорт" },
  { key: "webhooks", name: "Webhooks", description: "Интеграция с внешними системами" },
  { key: "ldap", name: "LDAP/SSO", description: "Active Directory интеграция" },
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
        toast.error("Ошибка загрузки организаций");
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

      // Обновляем локальное состояние
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

      toast.success(`Модуль ${!currentValue ? "включён" : "выключен"}`);
    } catch (error: any) {
      toast.error("Ошибка обновления модуля", { description: error.message });
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

      toast.success("Все модули включены");
    } catch (error: any) {
      toast.error("Ошибка", { description: error.message });
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-3xl font-bold">Управление модулями</h1>
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
          Управление модулями
        </h1>
        <p className="text-muted-foreground mt-2">
          Активируйте или деактивируйте функции для каждой организации
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
                      {enabledCount} / {AVAILABLE_MODULES.length} модулей
                    </Badge>
                    <Button
                      size="sm"
                      onClick={() => enableAllModules(tenant.id)}
                      disabled={enabledCount === AVAILABLE_MODULES.length}
                    >
                      Включить все
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
              <h3 className="text-lg font-semibold mb-2">Нет организаций</h3>
              <p className="text-muted-foreground">
                Создайте организацию для управления модулями
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

