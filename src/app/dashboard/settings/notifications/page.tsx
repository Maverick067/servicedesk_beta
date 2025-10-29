import { NotificationSettings } from "@/components/notifications/notification-settings";

export default function NotificationsSettingsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Notification Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage how and when you receive notifications
        </p>
      </div>

      <NotificationSettings />
    </div>
  );
}

