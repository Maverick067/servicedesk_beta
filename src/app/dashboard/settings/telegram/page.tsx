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

  // Load bot settings
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
      toast.error("Error loading settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.botToken) {
      toast.error("Enter bot token");
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
      toast.success("Settings saved");
    } catch (error: any) {
      console.error("Error saving bot:", error);
      toast.error(error.message || "Error saving");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete the bot?")) {
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
      toast.success("Bot deleted");
    } catch (error) {
      console.error("Error deleting bot:", error);
      toast.error("Error deleting");
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
          <h1 className="text-3xl font-bold">Telegram Settings</h1>
          <p className="text-muted-foreground">
            Integration with Telegram Bot for ticket creation and notifications
          </p>
        </div>
      </div>

      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p>
              <strong>How to set up Telegram bot:</strong>
            </p>
            <ol className="list-decimal list-inside space-y-1">
              <li>
                Create a bot via{" "}
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
              <li>Copy the bot token and paste it below</li>
              <li>
                For group notifications: add the bot to a group and get the Chat
                ID
              </li>
              <li>Users can link their Telegram via /link command</li>
            </ol>
          </div>
        </AlertDescription>
      </Alert>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Bot Settings</CardTitle>
          <CardDescription>
            {bot
              ? `Bot @${bot.botUsername} connected`
              : "Connect Telegram bot for your organization"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="botToken">Bot Token *</Label>
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
              Get token from @BotFather in Telegram
            </p>
          </div>

          <div>
            <Label htmlFor="groupChatId">Group ID for notifications (optional)</Label>
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
              Group ID for sending notifications to agents (starts with "-")
            </p>
          </div>

          <div className="space-y-3 pt-4">
            <Label>Notification Settings</Label>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="notifyNewTicket" className="cursor-pointer">
                Notify on new tickets
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
                Notify on ticket updates
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
                Notify on new comments
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
                  Saving...
                </>
              ) : (
                "Save"
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
                    Deleting...
                  </>
                ) : (
                  "Delete Bot"
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {bot && bot.users.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Linked Users</CardTitle>
            <CardDescription>
              Users who linked their Telegram to their account
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

