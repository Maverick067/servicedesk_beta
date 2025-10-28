"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Bell, CheckCircle, Loader2, TicketIcon, MessageSquareText, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

interface Notification {
  id: string;
  type: "TICKET_CREATED" | "TICKET_ASSIGNED" | "TICKET_UPDATED" | "COMMENT_ADDED" | "TICKET_RESOLVED" | "TICKET_CLOSED";
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  ticket: {
    id: string;
    title: string;
    status: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  } | null;
}

const getPriorityColor = (priority: Notification["ticket"]["priority"]) => {
  switch (priority) {
    case "LOW":
      return "bg-green-500";
    case "MEDIUM":
      return "bg-yellow-500";
    case "HIGH":
      return "bg-orange-500";
    case "URGENT":
      return "bg-red-500";
    default:
      return "bg-gray-500";
  }
};

const getNotificationIcon = (type: Notification["type"]) => {
  switch (type) {
    case "TICKET_CREATED":
    case "TICKET_ASSIGNED":
    case "TICKET_UPDATED":
    case "TICKET_RESOLVED":
    case "TICKET_CLOSED":
      return <TicketIcon className="h-4 w-4 text-blue-500" />;
    case "COMMENT_ADDED":
      return <MessageSquareText className="h-4 w-4 text-purple-500" />;
    default:
      return <Bell className="h-4 w-4 text-gray-500" />;
  }
};

export function NotificationBell() {
  const { data: session } = useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNotifications = async () => {
    if (!session) return;
    setIsLoading(true);
    try {
      const response = await fetch("/api/notifications?unreadOnly=true");
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
        setUnreadCount(data.length);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Обновлять каждые 60 секунд
    return () => clearInterval(interval);
  }, [session]);

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllAsRead: true }),
      });
      if (response.ok) {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      try {
        await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notificationIds: [notification.id] }),
        });
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }
    }
    if (notification.ticket?.id) {
      router.push(`/dashboard/tickets/${notification.ticket.id}`);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="text-md font-semibold">Уведомления</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={isLoading}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              ) : (
                <CheckCircle className="mr-1 h-3 w-3" />
              )}
              Прочитать все
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 && !isLoading ? (
            <p className="text-center text-muted-foreground p-4 text-sm">
              Нет новых уведомлений
            </p>
          ) : isLoading ? (
            <div className="flex justify-center items-center h-full p-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className="flex items-start gap-2 p-3 cursor-pointer hover:bg-gray-50"
              >
                <div className="flex-shrink-0 mt-1">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-grow">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{notification.title}</p>
                    {notification.ticket?.priority && (
                      <Badge
                        className={`text-white px-2 py-0.5 text-xs ${getPriorityColor(
                          notification.ticket.priority
                        )}`}
                      >
                        {notification.ticket.priority}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDistanceToNow(new Date(notification.createdAt), {
                      addSuffix: true,
                      locale: ru,
                    })}
                  </p>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
        {notifications.length > 0 && (
          <DropdownMenuSeparator />
        )}
        {/* Можно добавить ссылку на страницу всех уведомлений */}
        {/* <DropdownMenuItem className="justify-center p-2">
          <Button variant="link" size="sm" className="text-sm">
            Показать все
          </Button>
        </DropdownMenuItem> */}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}