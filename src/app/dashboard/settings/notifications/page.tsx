import { NotificationSettings } from "@/components/notifications/notification-settings";

export default function NotificationsSettingsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Настройки уведомлений</h1>
        <p className="text-muted-foreground mt-2">
          Управляйте тем, как и когда вы получаете уведомления
        </p>
      </div>

      <NotificationSettings />
    </div>
  );
}

