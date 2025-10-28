"use client";

import { useState } from "react";
import { toast } from "sonner";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, CheckCircle2, Info, Shield } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SimpleADConfigDialogProps {
  children: React.ReactNode;
  onConfigCreated?: () => void;
}

export function SimpleADConfigDialog({ 
  children, 
  onConfigCreated 
}: SimpleADConfigDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);

  // Простые поля
  const [name, setName] = useState("");
  const [serverAddress, setServerAddress] = useState("");
  const [domain, setDomain] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [isActive, setIsActive] = useState(false);

  // Продвинутые настройки (опционально)
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customPort, setCustomPort] = useState("");
  const [useSSL, setUseSSL] = useState(false);

  // Автоматически меняем порт при переключении SSL
  const effectivePort = customPort || (useSSL ? "636" : "389");

  const handleTestConnection = async () => {
    if (!serverAddress || !domain || !adminUsername || !adminPassword) {
      toast.error("Заполните все обязательные поля");
      return;
    }

    setIsTesting(true);
    setTestSuccess(false);

    try {
      const response = await fetch(`/api/ldap/test-connection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serverAddress,
          domain,
          adminUsername,
          adminPassword,
          port: parseInt(effectivePort),
          useSSL,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setTestSuccess(true);
        toast.success("Подключение успешно!", {
          description: `Найдено ${result.usersCount || 0} пользователей`,
        });
      } else {
        const errorMsg = result.error || "Проверьте настройки";
        
        toast.error("Ошибка подключения", {
          description: errorMsg,
          duration: 8000, // Показываем дольше для таймаутов
        });
      }
    } catch (error: any) {
      toast.error("Ошибка", {
        description: error.message || "Не удалось подключиться к серверу",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !serverAddress || !domain || !adminUsername || !adminPassword) {
      toast.error("Заполните все обязательные поля");
      return;
    }

    setIsSubmitting(true);

    try {
      // Автоматически формируем правильные настройки LDAP
      const port = parseInt(effectivePort);
      const baseDn = `DC=${domain.split('.').join(',DC=')}`;
      const bindDn = `${adminUsername}@${domain}`;
      const userSearchBase = baseDn;
      // Правильный фильтр: только пользователи (не компьютеры), только активные
      const userSearchFilter = "(&(objectClass=user)(objectCategory=person)(!(objectClass=computer))(!(userAccountControl:1.2.840.113556.1.4.803:=2)))";

      const response = await fetch(`/api/ldap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type: "ACTIVE_DIRECTORY",
          host: serverAddress,
          port,
          baseDn,
          bindDn,
          bindPassword: adminPassword,
          userSearchBase,
          userSearchFilter,
          isActive,
          useSSL, // Передаем флаг SSL
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Не удалось создать подключение");
      }

      toast.success("Active Directory подключен!", {
        description: "Пользователи могут входить используя учетные данные домена",
      });

      // Сбрасываем форму
      setName("");
      setServerAddress("");
      setDomain("");
      setAdminUsername("");
      setAdminPassword("");
      setIsActive(false);
      setTestSuccess(false);
      setIsOpen(false);

      onConfigCreated?.();
    } catch (error: any) {
      toast.error("Ошибка", {
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Подключить Active Directory
          </DialogTitle>
          <DialogDescription>
            Подключите ваш корпоративный домен для единого входа сотрудников
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Информационный блок */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Быстрая подсказка:</strong> Откройте командную строку на любом компьютере в домене и выполните{" "}
              <code className="bg-muted px-1 rounded">echo %LOGONSERVER%</code> чтобы узнать адрес сервера и{" "}
              <code className="bg-muted px-1 rounded">echo %USERDNSDOMAIN%</code> чтобы узнать домен.
            </AlertDescription>
          </Alert>

          {/* Основные настройки */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Основные настройки</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Название подключения <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Корпоративный Active Directory"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Например: "Корпоративный AD" или "Office Domain"
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="serverAddress">
                  Адрес сервера <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="serverAddress"
                  value={serverAddress}
                  onChange={(e) => setServerAddress(e.target.value)}
                  placeholder="dc.company.local или 192.168.1.10"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  IP-адрес или имя вашего контроллера домена
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="domain">
                  Домен <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="domain"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="company.local"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Ваш доменное имя (например: company.local, office.com)
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="adminUsername">
                    Логин администратора <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="adminUsername"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    placeholder="administrator"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adminPassword">
                    Пароль <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="adminPassword"
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <Label htmlFor="isActive" className="text-sm font-medium">
                    Активировать подключение
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Разрешить вход через домен
                  </p>
                </div>
                <Switch
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
            </CardContent>
          </Card>

          {/* Продвинутые настройки (скрыты по умолчанию) */}
          <div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm"
            >
              {showAdvanced ? "Скрыть" : "Показать"} продвинутые настройки
            </Button>

            {showAdvanced && (
              <Card className="mt-2">
                <CardHeader>
                  <CardTitle className="text-base">Продвинутые настройки</CardTitle>
                  <CardDescription>
                    Обычно не требуется изменять
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="useSSL">Защищенное подключение (SSL/TLS)</Label>
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <span className="text-sm font-medium">
                            Использовать LDAPS
                          </span>
                          <p className="text-xs text-muted-foreground">
                            {useSSL ? "Порт 636 (защищено)" : "Порт 389 (не защищено)"}
                          </p>
                        </div>
                        <Switch
                          id="useSSL"
                          checked={useSSL}
                          onCheckedChange={setUseSSL}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="customPort">Порт (опционально)</Label>
                      <Input
                        id="customPort"
                        value={customPort}
                        onChange={(e) => setCustomPort(e.target.value)}
                        placeholder={effectivePort}
                      />
                      <p className="text-xs text-muted-foreground">
                        Текущий порт: {effectivePort}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Кнопки действий */}
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleTestConnection}
              disabled={isTesting || isSubmitting}
              className="flex-1"
            >
              {isTesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Проверка...
                </>
              ) : testSuccess ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                  Подключено
                </>
              ) : (
                "Проверить подключение"
              )}
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting || isTesting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Сохранение...
                </>
              ) : (
                "Сохранить"
              )}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            После сохранения пользователи смогут входить используя логин и пароль домена
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}

