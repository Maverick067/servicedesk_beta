"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Settings } from "lucide-react";

interface SyncSettingsDialogProps {
  configId: string;
  configName: string;
  syncEnabled: boolean;
  syncInterval: number | null;
  onSettingsUpdated?: () => void;
}

const intervalOptions = [
  { value: "900", label: "Каждые 15 минут" },
  { value: "1800", label: "Каждые 30 минут" },
  { value: "3600", label: "Каждый час" },
  { value: "7200", label: "Каждые 2 часа" },
  { value: "14400", label: "Каждые 4 часа" },
  { value: "28800", label: "Каждые 8 часов" },
  { value: "86400", label: "Каждый день" },
];

export function SyncSettingsDialog({
  configId,
  configName,
  syncEnabled: initialSyncEnabled,
  syncInterval: initialSyncInterval,
  onSettingsUpdated,
}: SyncSettingsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(initialSyncEnabled);
  const [syncInterval, setSyncInterval] = useState(
    (initialSyncInterval || 3600).toString()
  );

  useEffect(() => {
    setSyncEnabled(initialSyncEnabled);
    setSyncInterval((initialSyncInterval || 3600).toString());
  }, [initialSyncEnabled, initialSyncInterval]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/ldap/${configId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          syncEnabled,
          syncInterval: parseInt(syncInterval),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update sync settings");
      }

      toast.success("Настройки синхронизации обновлены", {
        description: syncEnabled
          ? `Автоматическая синхронизация: ${
              intervalOptions.find((opt) => opt.value === syncInterval)?.label
            }`
          : "Автоматическая синхронизация отключена",
      });

      setIsOpen(false);
      onSettingsUpdated?.();
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
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Настройки синхронизации</DialogTitle>
          <DialogDescription>{configName}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-4">
            {/* Включить автосинхронизацию */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="syncEnabled">
                  Автоматическая синхронизация
                </Label>
                <p className="text-xs text-muted-foreground">
                  Периодически обновлять пользователей из AD
                </p>
              </div>
              <Switch
                id="syncEnabled"
                checked={syncEnabled}
                onCheckedChange={setSyncEnabled}
              />
            </div>

            {/* Интервал синхронизации */}
            {syncEnabled && (
              <div className="space-y-2">
                <Label htmlFor="syncInterval">Интервал синхронизации</Label>
                <Select
                  value={syncInterval}
                  onValueChange={setSyncInterval}
                >
                  <SelectTrigger id="syncInterval">
                    <SelectValue placeholder="Выберите интервал" />
                  </SelectTrigger>
                  <SelectContent>
                    {intervalOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Как часто обновлять список пользователей из Active Directory
                </p>
              </div>
            )}

            {syncEnabled && (
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  ℹ️ <strong>Важно:</strong> Для работы автоматической
                  синхронизации необходимо настроить cron job на сервере:
                </p>
                <code className="block mt-2 p-2 bg-muted text-xs rounded">
                  0 * * * * curl -H "Authorization: Bearer YOUR_CRON_SECRET"
                  https://yourapp.com/api/cron/ldap-sync
                </code>
              </div>
            )}
          </div>

          {/* Кнопки */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={isSubmitting}>
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
        </form>
      </DialogContent>
    </Dialog>
  );
}

