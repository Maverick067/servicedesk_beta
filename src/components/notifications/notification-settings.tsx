"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, Bell, Mail, Smartphone, Clock, Filter } from "lucide-react";

interface NotificationSettings {
  id: string;
  // Каналы
  enableInApp: boolean;
  enableEmail: boolean;
  enablePush: boolean;
  // Группировка
  groupSimilar: boolean;
  groupingInterval: number;
  // Email
  emailFrequency: string;
  emailDigestTime: string | null;
  // Типы
  notifyTicketCreated: boolean;
  notifyTicketAssigned: boolean;
  notifyTicketStatusChanged: boolean;
  notifyTicketCommented: boolean;
  notifyTicketMentioned: boolean;
  notifyTicketEscalated: boolean;
  notifySlaBreach: boolean;
  // Прочее
  priorityOverride: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
}

export function NotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const response = await fetch("/api/notifications/settings");
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Не удалось загрузить настройки");
    } finally {
      setIsLoading(false);
    }
  }

  async function saveSettings() {
    if (!settings) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/notifications/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast.success("Настройки сохранены");
      } else {
        toast.error("Ошибка при сохранении");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Не удалось сохранить настройки");
    } finally {
      setIsSaving(false);
    }
  }

  function updateSetting<K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Настройки не найдены</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Каналы доставки */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Каналы доставки
          </CardTitle>
          <CardDescription>
            Выберите, как вы хотите получать уведомления
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>В приложении</Label>
              <p className="text-sm text-muted-foreground">
                Показывать уведомления в интерфейсе
              </p>
            </div>
            <Switch
              checked={settings.enableInApp}
              onCheckedChange={(checked) => updateSetting("enableInApp", checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email уведомления
              </Label>
              <p className="text-sm text-muted-foreground">
                Получать уведомления на email
              </p>
            </div>
            <Switch
              checked={settings.enableEmail}
              onCheckedChange={(checked) => updateSetting("enableEmail", checked)}
            />
          </div>

          {settings.enableEmail && (
            <div className="ml-6 space-y-4">
              <div className="space-y-2">
                <Label>Частота отправки</Label>
                <Select
                  value={settings.emailFrequency}
                  onValueChange={(value) => updateSetting("emailFrequency", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instant">Мгновенно</SelectItem>
                    <SelectItem value="hourly">Раз в час</SelectItem>
                    <SelectItem value="daily">Ежедневный дайджест</SelectItem>
                    <SelectItem value="off">Отключено</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {settings.emailFrequency === "daily" && (
                <div className="space-y-2">
                  <Label>Время отправки дайджеста</Label>
                  <Input
                    type="time"
                    value={settings.emailDigestTime || "09:00"}
                    onChange={(e) => updateSetting("emailDigestTime", e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          <Separator />

          <div className="flex items-center justify-between opacity-50">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Push-уведомления
              </Label>
              <p className="text-sm text-muted-foreground">
                Скоро будет доступно
              </p>
            </div>
            <Switch disabled checked={false} />
          </div>
        </CardContent>
      </Card>

      {/* Группировка */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Группировка уведомлений
          </CardTitle>
          <CardDescription>
            Объединять похожие уведомления для удобства
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Группировать похожие</Label>
              <p className="text-sm text-muted-foreground">
                Объединять уведомления одного типа
              </p>
            </div>
            <Switch
              checked={settings.groupSimilar}
              onCheckedChange={(checked) => updateSetting("groupSimilar", checked)}
            />
          </div>

          {settings.groupSimilar && (
            <div className="space-y-2">
              <Label>Интервал группировки (минут)</Label>
              <Input
                type="number"
                min="5"
                max="60"
                value={settings.groupingInterval}
                onChange={(e) =>
                  updateSetting("groupingInterval", parseInt(e.target.value))
                }
              />
              <p className="text-xs text-muted-foreground">
                Уведомления в течение этого времени будут объединены
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Типы уведомлений */}
      <Card>
        <CardHeader>
          <CardTitle>Типы уведомлений</CardTitle>
          <CardDescription>
            Выберите, о каких событиях вы хотите получать уведомления
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: "notifyTicketCreated", label: "Создание тикета", desc: "Новый тикет создан" },
            { key: "notifyTicketAssigned", label: "Назначение тикета", desc: "Тикет назначен на вас" },
            { key: "notifyTicketStatusChanged", label: "Изменение статуса", desc: "Статус тикета изменён" },
            { key: "notifyTicketCommented", label: "Новый комментарий", desc: "Комментарий добавлен к тикету" },
            { key: "notifyTicketMentioned", label: "Упоминание", desc: "Вас упомянули в комментарии" },
            { key: "notifyTicketEscalated", label: "Эскалация тикета", desc: "Тикет эскалирован" },
            { key: "notifySlaBreach", label: "Нарушение SLA", desc: "SLA тикета нарушен или скоро будет нарушен" },
          ].map((item, index) => (
            <div key={item.key}>
              {index > 0 && <Separator />}
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label>{item.label}</Label>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
                <Switch
                  checked={settings[item.key as keyof NotificationSettings] as boolean}
                  onCheckedChange={(checked) =>
                    updateSetting(item.key as keyof NotificationSettings, checked as any)
                  }
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Тихий режим */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Тихий режим
          </CardTitle>
          <CardDescription>
            Не получать уведомления в определённое время
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Включить тихий режим</Label>
              <p className="text-sm text-muted-foreground">
                Отключать уведомления ночью
              </p>
            </div>
            <Switch
              checked={settings.quietHoursEnabled}
              onCheckedChange={(checked) => updateSetting("quietHoursEnabled", checked)}
            />
          </div>

          {settings.quietHoursEnabled && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Начало (с)</Label>
                <Input
                  type="time"
                  value={settings.quietHoursStart || "22:00"}
                  onChange={(e) => updateSetting("quietHoursStart", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Конец (до)</Label>
                <Input
                  type="time"
                  value={settings.quietHoursEnd || "08:00"}
                  onChange={(e) => updateSetting("quietHoursEnd", e.target.value)}
                />
              </div>
            </div>
          )}

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Приоритетные уведомления</Label>
              <p className="text-sm text-muted-foreground">
                Всегда получать срочные уведомления
              </p>
            </div>
            <Switch
              checked={settings.priorityOverride}
              onCheckedChange={(checked) => updateSetting("priorityOverride", checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Кнопка сохранения */}
      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={isSaving} size="lg">
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Сохранение...
            </>
          ) : (
            "Сохранить настройки"
          )}
        </Button>
      </div>
    </div>
  );
}

