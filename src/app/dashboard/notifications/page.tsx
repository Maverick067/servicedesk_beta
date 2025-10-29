import { NotificationList } from "@/components/notifications/notification-list";

export default function NotificationsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Notifications
        </h1>
        <p className="text-muted-foreground mt-2">
          All your notifications in one place
        </p>
      </div>

      <NotificationList />
    </div>
  );
}

