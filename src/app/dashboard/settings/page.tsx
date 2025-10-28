"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { ModulesSettings } from "@/components/settings/modules-settings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Building2 } from "lucide-react";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Перенаправляем глобального ADMIN на страницу управления tenants
  // ВАЖНО: useEffect должен быть ДО любых условных возвратов!
  useEffect(() => {
    if (session?.user.role === "ADMIN" && !session?.user.tenantId) {
      router.replace("/dashboard/tenants");
    }
  }, [session, router]);
  
  // Если еще загружаемся, показываем загрузку
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

  // Если это глобальный ADMIN, показываем заглушку пока происходит редирект
  if (session?.user.role === "ADMIN" && !session?.user.tenantId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Управление организациями
            </CardTitle>
            <CardDescription>
              Как глобальный администратор, вы управляете всеми организациями
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push("/dashboard/tenants")}
              className="w-full"
            >
              Перейти к управлению организациями
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const canManageModules = session?.user.role === "TENANT_ADMIN" || (session?.user.role === "ADMIN" && session?.user.tenantId);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent">
          Настройки
        </h1>
        <p className="text-muted-foreground mt-2">
          Управление вашей организацией и профилем
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Tabs defaultValue="modules" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="modules">Модули</TabsTrigger>
            <TabsTrigger value="profile">Профиль</TabsTrigger>
            <TabsTrigger value="organization">Организация</TabsTrigger>
          </TabsList>

          <TabsContent value="modules">
            {canManageModules ? (
              <ModulesSettings />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Нет доступа</CardTitle>
                  <CardDescription>
                    Только администраторы организации могут управлять модулями
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Профиль</CardTitle>
                <CardDescription>
                  Управление вашими личными данными
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">Имя</p>
                    <p className="text-sm text-muted-foreground">{session?.user.name || "Не указано"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{session?.user.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Роль</p>
                    <p className="text-sm text-muted-foreground">{session?.user.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="organization">
            <Card>
              <CardHeader>
                <CardTitle>Организация</CardTitle>
                <CardDescription>
                  Информация о вашей организации
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Настройки организации будут доступны в следующих версиях
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
