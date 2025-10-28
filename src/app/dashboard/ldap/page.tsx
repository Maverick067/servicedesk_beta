"use client";

import { LdapConfigList } from "@/components/ldap/ldap-config-list";
import { SimpleADConfigDialog } from "@/components/ldap/simple-ad-config-dialog";
import { PageHeader, PageHeaderDescription, PageHeaderHeading } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PlusCircle, Shield, Info, CheckCircle2, AlertTriangle } from "lucide-react";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ModuleGuard } from "@/components/module-guard";
import { useSession } from "next-auth/react";

export default function LdapPage() {
  const { data: session } = useSession();
  const isGlobalAdmin = session?.user.role === "ADMIN" && !session?.user.tenantId;

  return (
    <ModuleGuard module="ldap" moduleName="LDAP / SSO">
      <div className="container relative space-y-6">
        <PageHeader>
          <PageHeaderHeading className="flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Active Directory / LDAP
          </PageHeaderHeading>
          <PageHeaderDescription>
            Подключите корпоративный домен для единого входа сотрудников
          </PageHeaderDescription>
        </PageHeader>

        {/* Предупреждение для глобального админа */}
        {isGlobalAdmin && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Внимание:</strong> Вы вошли как глобальный администратор. 
              Для настройки LDAP/Active Directory необходимо войти как администратор конкретной организации (TENANT_ADMIN).
              LDAP конфигурация привязывается к организации, а не к глобальному админу.
            </AlertDescription>
          </Alert>
        )}

        {/* Информационная карточка */}
        {!isGlobalAdmin && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Подключите Active Directory за 2 минуты! Вам понадобится только адрес контроллера домена, 
              имя домена и учетные данные администратора. Все технические параметры настраиваются автоматически.
            </AlertDescription>
          </Alert>
        )}

        {/* Преимущества */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Что дает подключение?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Единый вход</p>
                  <p className="text-xs text-muted-foreground">
                    Сотрудники входят своими учетными данными Windows
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Автоматическая регистрация</p>
                  <p className="text-xs text-muted-foreground">
                    Новые пользователи создаются при первом входе
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Безопасность</p>
                  <p className="text-xs text-muted-foreground">
                    Пароли не хранятся, только чтение из AD
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Кнопка подключения */}
        <div className="flex justify-end">
          <SimpleADConfigDialog>
            <Button size="lg" disabled={isGlobalAdmin}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Подключить домен
            </Button>
          </SimpleADConfigDialog>
        </div>

        {/* Список подключений */}
        <Suspense fallback={<Skeleton className="w-full h-[300px] rounded-lg" />}>
          <LdapConfigList />
        </Suspense>
      </div>
    </ModuleGuard>
  );
}

