"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, MessageCircle, Info, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface TelegramBot {
  id: string;
  botToken: string;
  botUsername: string;
  groupChatId: string | null;
  isActive: boolean;
  notifyOnNewTicket: boolean;
  notifyOnTicketUpdate: boolean;
  notifyOnNewComment: boolean;
  users: TelegramUser[];
}

interface TelegramUser {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string;
  lastName: string | null;
  chatId: string;
  user: {
    name: string;
    email: string;
  } | null;
}

export default function TelegramSettingsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [bot, setBot] = useState<TelegramBot | null>(null);
  const [formData, setFormData] = useState({
    botToken: "",
    groupChatId: "",
    notifyOnNewTicket: true,
    notifyOnTicketUpdate: true,
    notifyOnNewComment: true,
  });

  // Загрузка настроек бота
  useEffect(() => {
    fetchBot();
  }, []);

  const fetchBot = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/telegram/bot");
      if (!response.ok) throw new Error("Failed to fetch bot");
      const data = await response.json();
      
      if (data.bot) {
        setBot(data.bot);
        setFormData({
          botToken: data.bot.botToken,
          groupChatId: data.bot.groupChatId || "",
          notifyOnNewTicket: data.bot.notifyOnNewTicket,
          notifyOnTicketUpdate: data.bot.notifyOnTicketUpdate,
          notifyOnNewComment: data.bot.notifyOnNewComment,
        });
      }
    } catch (error) {
      console.error("Error fetching bot:", error);
      toast.error("Ошибка загрузки настроек");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.botToken) {
      toast.error("Введите токен бота");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/telegram/bot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save bot");
      }

      const data = await response.json();
      setBot(data.bot);
      toast.success("Настройки сохранены");
    } catch (error: any) {
      console.error("Error saving bot:", error);
      toast.error(error.message || "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Вы уверены, что хотите удалить бота?")) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch("/api/telegram/bot", {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete bot");

      setBot(null);
      setFormData({
        botToken: "",
        groupChatId: "",
        notifyOnNewTicket: true,
        notifyOnTicketUpdate: true,
        notifyOnNewComment: true,
      });
      toast.success("Бот удален");
    } catch (error) {
      console.error("Error deleting bot:", error);
      toast.error("Ошибка удаления");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <MessageCircle className="w-8 h-8" />
        <div>
          <h1 className="text-3xl font-bold">Настройки Telegram</h1>
          <p className="text-muted-foreground">
            Интеграция с Telegram Bot для создания тикетов и уведомлений
          </p>
        </div>
      </div>

      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p>
              <strong>Как настроить Telegram бота:</strong>
            </p>
            <ol className="list-decimal list-inside space-y-1">
              <li>
                Создайте бота через{" "}
                <a
                  href="https://t.me/BotFather"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  @BotFather
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>Скопируйте токен бота и вставьте его ниже</li>
              <li>
                Для групповых уведомлений: добавьте бота в группу и получите Chat
                ID
              </li>
              <li>Пользователи могут привязать свой Telegram через команду /link</li>
            </ol>
          </div>
        </AlertDescription>
      </Alert>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Настройки бота</CardTitle>
          <CardDescription>
            {bot
              ? `Бот @${bot.botUsername} подключен`
              : "Подключите Telegram бота для вашей организации"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="botToken">Токен бота *</Label>
            <Input
              id="botToken"
              type="text"
              placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
              value={formData.botToken}
              onChange={(e) =>
                setFormData({ ...formData, botToken: e.target.value })
              }
              className="font-mono"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Получите токен от @BotFather в Telegram
            </p>
          </div>

          <div>
            <Label htmlFor="groupChatId">ID группы для уведомлений (опционально)</Label>
            <Input
              id="groupChatId"
              type="text"
              placeholder="-1001234567890"
              value={formData.groupChatId}
              onChange={(e) =>
                setFormData({ ...formData, groupChatId: e.target.value })
              }
              className="font-mono"
            />
            <p className="text-sm text-muted-foreground mt-1">
              ID группы для отправки уведомлений агентам (начинается с "-")
            </p>
          </div>

          <div className="space-y-3 pt-4">
            <Label>Настройки уведомлений</Label>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="notifyNewTicket" className="cursor-pointer">
                Уведомлять о новых тикетах
              </Label>
              <Switch
                id="notifyNewTicket"
                checked={formData.notifyOnNewTicket}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, notifyOnNewTicket: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="notifyTicketUpdate" className="cursor-pointer">
                Уведомлять об обновлениях тикетов
              </Label>
              <Switch
                id="notifyTicketUpdate"
                checked={formData.notifyOnTicketUpdate}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, notifyOnTicketUpdate: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="notifyNewComment" className="cursor-pointer">
                Уведомлять о новых комментариях
              </Label>
              <Switch
                id="notifyNewComment"
                checked={formData.notifyOnNewComment}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, notifyOnNewComment: checked })
                }
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} disabled={saving || deleting}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Сохранение...
                </>
              ) : (
                "Сохранить"
              )}
            </Button>
            {bot && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={saving || deleting}
              >
                {deleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Удаление...
                  </>
                ) : (
                  "Удалить бота"
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {bot && bot.users.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Привязанные пользователи</CardTitle>
            <CardDescription>
              Пользователи, которые привязали свой Telegram к аккаунту
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {bot.users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      {user.firstName} {user.lastName}
                      {user.username && (
                        <span className="text-muted-foreground ml-2">
                          @{user.username}
                        </span>
                      )}
                    </p>
                    {user.user && (
                      <p className="text-sm text-muted-foreground">
                        {user.user.name} ({user.user.email})
                      </p>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground font-mono">
                    ID: {user.telegramId}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

