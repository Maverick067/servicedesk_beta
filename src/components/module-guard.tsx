"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useModules } from "@/hooks/use-modules";
import type { FeatureFlag } from "@/lib/feature-flags";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ModuleGuardProps {
  module: FeatureFlag;
  children: React.ReactNode;
  moduleName?: string;
}

/**
 * Компонент для защиты страниц модулей
 * Проверяет, включен ли модуль для tenant'а, и перенаправляет на dashboard, если нет
 */
export function ModuleGuard({ module, children, moduleName }: ModuleGuardProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { isModuleEnabled, isLoading: modulesLoading } = useModules();

  // Проверяем доступ к модулю
  useEffect(() => {
    // Ждем загрузки сессии и модулей
    if (status === "loading" || modulesLoading) {
      return;
    }

    // Если не авторизован, редирект на логин
    if (!session?.user) {
      router.replace("/login");
      return;
    }

    // Глобальный ADMIN имеет доступ ко всем модулям
    if (session.user.role === "ADMIN" && !session.user.tenantId) {
      return;
    }

    // Проверяем, включен ли модуль
    if (!isModuleEnabled(module)) {
      router.replace("/dashboard");
    }
  }, [session, status, modulesLoading, module, isModuleEnabled, router]);

  // Показываем loader во время загрузки
  if (status === "loading" || modulesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

  // Если не авторизован, не показываем контент
  if (!session?.user) {
    return null;
  }

  // Глобальный ADMIN видит всё
  if (session.user.role === "ADMIN" && !session.user.tenantId) {
    return <>{children}</>;
  }

  // Если модуль не включен, показываем заглушку (пока идет редирект)
  if (!isModuleEnabled(module)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Модуль недоступен</CardTitle>
            <CardDescription>
              {moduleName ? `Модуль "${moduleName}" отключен` : "Этот модуль отключен"} для вашей организации.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/dashboard")} className="w-full">
              Вернуться на главную
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Модуль включен, показываем контент
  return <>{children}</>;
}

