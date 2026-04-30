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
  // Channels
  enableInApp: boolean;
  enableEmail: boolean;
  enablePush: boolean;
  // Grouping
  groupSimilar: boolean;
  groupingInterval: number;
  // Email
  emailFrequency: string;
  emailDigestTime: string | null;
  // Types
  notifyTicketCreated: boolean;
  notifyTicketAssigned: boolean;
  notifyTicketStatusChanged: boolean;
  notifyTicketCommented: boolean;
  notifyTicketMentioned: boolean;
  notifyTicketEscalated: boolean;
  notifySlaBreach: boolean;
  // Other
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
      toast.error("Failed to load settings");
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
        toast.success("Settings saved");
      } else {
        toast.error("Error saving");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
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
          <p className="text-muted-foreground">Settings not found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Delivery channels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Delivery Channels
          </CardTitle>
          <CardDescription>
            Choose how you want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>In App</Label>
              <p className="text-sm text-muted-foreground">
                Show notifications in interface
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
                Email Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications via email
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
                <Label>Email Frequency</Label>
                <Select
                  value={settings.emailFrequency}
                  onValueChange={(value) => updateSetting("emailFrequency", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instant">Instant</SelectItem>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily Digest</SelectItem>
                    <SelectItem value="off">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {settings.emailFrequency === "daily" && (
                <div className="space-y-2">
                  <Label>Digest Time</Label>
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
                Push Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Coming soon
              </p>
            </div>
            <Switch disabled checked={false} />
          </div>
        </CardContent>
      </Card>

      {/* Grouping */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Notification Grouping
          </CardTitle>
          <CardDescription>
            Combine similar notifications for convenience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Group Similar</Label>
              <p className="text-sm text-muted-foreground">
                Combine notifications of the same type
              </p>
            </div>
            <Switch
              checked={settings.groupSimilar}
              onCheckedChange={(checked) => updateSetting("groupSimilar", checked)}
            />
          </div>

          {settings.groupSimilar && (
            <div className="space-y-2">
              <Label>Grouping Interval (minutes)</Label>
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
                Notifications within this time will be combined
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification types */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Types</CardTitle>
          <CardDescription>
            Choose which events you want to receive notifications for
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: "notifyTicketCreated", label: "Ticket Created", desc: "New ticket created" },
            { key: "notifyTicketAssigned", label: "Ticket Assigned", desc: "Ticket assigned to you" },
            { key: "notifyTicketStatusChanged", label: "Status Changed", desc: "Ticket status changed" },
            { key: "notifyTicketCommented", label: "New Comment", desc: "Comment added to ticket" },
            { key: "notifyTicketMentioned", label: "Mentioned", desc: "You were mentioned in a comment" },
            { key: "notifyTicketEscalated", label: "Ticket Escalated", desc: "Ticket escalated" },
            { key: "notifySlaBreach", label: "SLA Breach", desc: "Ticket SLA breached or about to breach" },
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

      {/* Quiet hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Quiet Hours
          </CardTitle>
          <CardDescription>
            Don&apos;t receive notifications during specific time
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Quiet Hours</Label>
              <p className="text-sm text-muted-foreground">
                Disable notifications at night
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
                <Label>Start (from)</Label>
                <Input
                  type="time"
                  value={settings.quietHoursStart || "22:00"}
                  onChange={(e) => updateSetting("quietHoursStart", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End (until)</Label>
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
              <Label>Priority Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Always receive urgent notifications
              </p>
            </div>
            <Switch
              checked={settings.priorityOverride}
              onCheckedChange={(checked) => updateSetting("priorityOverride", checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={isSaving} size="lg">
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Settings"
          )}
        </Button>
      </div>
    </div>
  );
}

