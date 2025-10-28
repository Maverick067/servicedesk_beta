"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Trash2, Shield, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SyncSettingsDialog } from "./sync-settings-dialog";

interface LdapConfig {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  host: string | null;
  port: number | null;
  useSSL: boolean | null;
  syncEnabled: boolean;
  syncInterval: number | null;
  lastSyncAt: string | null;
}

export function LdapConfigList() {
  const { data: session } = useSession();
  const [configs, setConfigs] = useState<LdapConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const fetchConfigs = async () => {
    if (!session?.user?.tenantId) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/ldap`);
      if (response.ok) setConfigs(await response.json());
    } catch (e: any) {
      toast.error("Ошибка при загрузке конфигураций");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, [session]);

  const handleSync = async (configId: string) => {
    setSyncingId(configId);
    try {
      const response = await fetch(`/api/ldap/${configId}/sync`, {
        method: "POST",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Sync failed");
      }

      const result = await response.json();
      
      const messages = [
        `Найдено: ${result.usersFound}`,
        `Создано: ${result.usersCreated}`,
        `Обновлено: ${result.usersUpdated}`,
      ];
      
      if (result.usersDeactivated > 0) {
        messages.push(`Деактивировано: ${result.usersDeactivated}`);
      }

      toast.success("Синхронизация завершена!", {
        description: messages.join(', '),
        duration: 5000,
      });

      // Обновляем список конфигураций
      fetchConfigs();
    } catch (error: any) {
      toast.error("Ошибка синхронизации", {
        description: error.message,
      });
    } finally {
      setSyncingId(null);
    }
  };

  if (isLoading) return <Skeleton className="h-[400px] w-full" />;

  if (configs.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed rounded-lg">
        <Shield className="mx-auto h-16 w-16 mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">Active Directory не подключен</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Подключите корпоративный домен, чтобы сотрудники могли входить 
          используя свои учетные данные Windows
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Подключение</TableHead>
          <TableHead>Сервер</TableHead>
          <TableHead>Статус</TableHead>
          <TableHead className="text-right">Действия</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {configs.map((config) => (
          <TableRow key={config.id}>
            <TableCell>
              <div className="flex flex-col">
                <span className="font-medium">{config.name}</span>
                <span className="text-xs text-muted-foreground">{config.type}</span>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex flex-col">
                <span className="font-mono text-sm">{config.host || "—"}</span>
                {config.port && (
                  <span className="text-xs text-muted-foreground">
                    Порт: {config.port} {config.useSSL && <Badge variant="secondary" className="ml-1 text-xs">SSL</Badge>}
                  </span>
                )}
              </div>
            </TableCell>
            <TableCell>
              <div className="flex flex-col gap-1">
                <Badge variant={config.isActive ? "default" : "outline"}>
                  {config.isActive ? "✓ Активен" : "Отключен"}
                </Badge>
                {config.syncEnabled && (
                  <Badge variant="secondary" className="text-xs">
                    🔄 Автосинхр.
                  </Badge>
                )}
                {config.lastSyncAt && (
                  <span className="text-xs text-muted-foreground">
                    Синхр: {new Date(config.lastSyncAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-2">
                <SyncSettingsDialog
                  configId={config.id}
                  configName={config.name}
                  syncEnabled={config.syncEnabled}
                  syncInterval={config.syncInterval}
                  onSettingsUpdated={fetchConfigs}
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={() => handleSync(config.id)}
                      disabled={syncingId === config.id}
                    >
                      <RefreshCw className={`mr-2 h-4 w-4 ${syncingId === config.id ? "animate-spin" : ""}`} />
                      {syncingId === config.id ? "Синхронизация..." : "Синхронизировать сейчас"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Удалить
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

