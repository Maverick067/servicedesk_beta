"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, ArrowLeft } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  MODULE_METADATA, 
  type FeatureFlag,
  MODULE_PLAN_REQUIREMENTS,
} from "@/lib/feature-flags";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  createdAt: string;
  settings?: {
    modules?: Record<FeatureFlag, boolean>;
  };
}

export default function EditTenantPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    domain: "",
  });
  const [modules, setModules] = useState<Record<FeatureFlag, boolean>>({} as Record<FeatureFlag, boolean>);
  const [updatingModules, setUpdatingModules] = useState<Set<FeatureFlag>>(new Set());

  // Проверяем, что пользователь - админ или tenant админ
  useEffect(() => {
    if (status === "loading") return; // Ждем загрузки сессии
    
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "TENANT_ADMIN")) {
      router.push("/dashboard");
      return;
    }
  }, [session, status, router]);

  useEffect(() => {
    async function fetchTenant() {
      try {
        const response = await fetch(`/api/tenants/${params.id}`);
        if (!response.ok) throw new Error("Failed to fetch tenant");
        const data = await response.json();
        setTenant(data);
        setFormData({
          name: data.name,
          slug: data.slug,
          domain: data.domain || "",
        });
        
        // Загружаем модули
        const modulesResponse = await fetch(`/api/tenants/${params.id}/modules`);
        if (modulesResponse.ok) {
          const modulesData = await modulesResponse.json();
          setModules(modulesData.modules || {});
        }
      } catch (error) {
        console.error("Error fetching tenant:", error);
        setError("Ошибка загрузки данных");
      } finally {
        setIsLoading(false);
      }
    }

    if (params.id) {
      fetchTenant();
    }
  }, [params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/tenants/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          slug: formData.slug,
          domain: formData.domain || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update tenant");
      }

      toast.success("Организация успешно обновлена");
      router.push("/dashboard/tenants");
    } catch (error: any) {
      setError(error.message);
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleModuleToggle = async (module: FeatureFlag, enabled: boolean) => {
    // Оптимистичное обновление UI
    setModules(prev => ({ ...prev, [module]: enabled }));
    setUpdatingModules(prev => new Set(prev).add(module));

    try {
      const response = await fetch(`/api/tenants/${params.id}/modules`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          modules: { [module]: enabled }
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || "Failed to update module");
      }

      const data = await response.json();
      setModules(data.modules);
      
      toast.success(
        enabled 
          ? `Модуль "${MODULE_METADATA[module].name}" включен`
          : `Модуль "${MODULE_METADATA[module].name}" отключен`
      );
    } catch (error: any) {
      console.error("Error updating module:", error);
      // Откатываем изменение при ошибке
      setModules(prev => ({ ...prev, [module]: !enabled }));
      toast.error(error.message || "Не удалось обновить модуль");
    } finally {
      setUpdatingModules(prev => {
        const newSet = new Set(prev);
        newSet.delete(module);
        return newSet;
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Организация не найдена</p>
        <Button onClick={() => router.back()} className="mt-4">
          Вернуться назад
        </Button>
      </div>
    );
  }

  const modulesList = Object.keys(MODULE_METADATA) as FeatureFlag[];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Редактировать организацию</h1>
          <p className="text-muted-foreground mt-2">
            Изменение данных организации
          </p>
        </div>
      </div>

      <Tabs defaultValue="info" className="space-y-6">
        <TabsList>
          <TabsTrigger value="info">Основная информация</TabsTrigger>
          <TabsTrigger value="modules">Модули</TabsTrigger>
        </TabsList>

        {/* Вкладка: Основная информация */}
        <TabsContent value="info">
          <Card>
            <form onSubmit={handleSubmit}>
              <CardHeader>
                <CardTitle>Данные организации</CardTitle>
                <CardDescription>
                  Обновите информацию об организации
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Название организации *</Label>
                  <Input
                    id="name"
                    placeholder="Название компании"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug (идентификатор) *</Label>
                  <Input
                    id="slug"
                    placeholder="company-slug"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData({ ...formData, slug: e.target.value })
                    }
                    required
                    disabled={isSaving}
                  />
                  <p className="text-xs text-muted-foreground">
                    Используется в URL. Только строчные буквы, цифры и дефисы
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="domain">Домен (опционально)</Label>
                  <Input
                    id="domain"
                    placeholder="company.com"
                    value={formData.domain}
                    onChange={(e) =>
                      setFormData({ ...formData, domain: e.target.value })
                    }
                    disabled={isSaving}
                  />
                </div>
                {error && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                    {error}
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isSaving}
                >
                  Отмена
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Сохранение...
                    </>
                  ) : (
                    "Сохранить изменения"
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* Вкладка: Модули */}
        <TabsContent value="modules" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Управление модулями</CardTitle>
              <CardDescription>
                Включайте или отключайте модули для этой организации. Супер админ может включать любые модули независимо от плана подписки.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {modulesList.map((moduleKey) => {
                  const module = MODULE_METADATA[moduleKey];
                  const isEnabled = modules[moduleKey] === true;
                  const isUpdating = updatingModules.has(moduleKey);
                  const requiredPlan = MODULE_PLAN_REQUIREMENTS[moduleKey];

                  return (
                    <Card
                      key={moduleKey}
                      className={`relative overflow-hidden transition-all duration-300 ${
                        isEnabled ? "border-l-4 shadow-md" : "opacity-80"
                      }`}
                      style={isEnabled ? { borderLeftColor: module.color } : {}}
                    >
                      {isEnabled && (
                        <div
                          className="absolute inset-0 opacity-5"
                          style={{ backgroundColor: module.color }}
                        />
                      )}
                      <CardContent className="pt-6 relative">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-2xl">{module.icon}</span>
                              <h3 className="font-semibold">{module.name}</h3>
                              {module.comingSoon && (
                                <Badge variant="secondary" className="text-xs">
                                  Скоро
                                </Badge>
                              )}
                              <Badge 
                                variant={
                                  requiredPlan === "FREE" 
                                    ? "secondary" 
                                    : requiredPlan === "PRO"
                                    ? "default"
                                    : "destructive"
                                }
                                className="text-xs"
                              >
                                {requiredPlan}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {module.description}
                            </p>
                          </div>
                          <div className="ml-4">
                            {module.comingSoon ? (
                              <Switch disabled checked={false} />
                            ) : (
                              <Switch
                                checked={isEnabled}
                                onCheckedChange={(checked) =>
                                  handleModuleToggle(moduleKey, checked)
                                }
                                disabled={isUpdating}
                              />
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Информационный блок */}
          <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="text-2xl">ℹ️</div>
                <div>
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    О модулях
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Как супер админ, вы можете включать/отключать любые модули для организации независимо от плана подписки. 
                    Модули с отметкой "Скоро" находятся в разработке. Включенные модули будут доступны всем пользователям организации.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
