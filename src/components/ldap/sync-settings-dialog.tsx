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
  { value: "900", label: "Every 15 minutes" },
  { value: "1800", label: "Every 30 minutes" },
  { value: "3600", label: "Every hour" },
  { value: "7200", label: "Every 2 hours" },
  { value: "14400", label: "Every 4 hours" },
  { value: "28800", label: "Every 8 hours" },
  { value: "86400", label: "Daily" },
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

      toast.success("Sync settings updated", {
        description: syncEnabled
          ? `Automatic synchronization: ${
              intervalOptions.find((opt) => opt.value === syncInterval)?.label
            }`
          : "Automatic synchronization disabled",
      });

      setIsOpen(false);
      onSettingsUpdated?.();
    } catch (error: any) {
      toast.error("Error", {
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
          <DialogTitle>Sync Settings</DialogTitle>
          <DialogDescription>{configName}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-4">
            {/* Enable auto-sync */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="syncEnabled">
                  Automatic Synchronization
                </Label>
                <p className="text-xs text-muted-foreground">
                  Periodically update users from AD
                </p>
              </div>
              <Switch
                id="syncEnabled"
                checked={syncEnabled}
                onCheckedChange={setSyncEnabled}
              />
            </div>

            {/* Sync interval */}
            {syncEnabled && (
              <div className="space-y-2">
                <Label htmlFor="syncInterval">Sync Interval</Label>
                <Select
                  value={syncInterval}
                  onValueChange={setSyncInterval}
                >
                  <SelectTrigger id="syncInterval">
                    <SelectValue placeholder="Select interval" />
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
                  How often to update the user list from Active Directory
                </p>
              </div>
            )}

            {syncEnabled && (
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  ℹ️ <strong>Important:</strong> To enable automatic
                  synchronization, you need to configure a cron job on the server:
                </p>
                <code className="block mt-2 p-2 bg-muted text-xs rounded">
                  0 * * * * curl -H "Authorization: Bearer YOUR_CRON_SECRET"
                  https://yourapp.com/api/cron/ldap-sync
                </code>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

