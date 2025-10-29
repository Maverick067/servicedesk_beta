"use client";

import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { enUS } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  Loader2,
  Ticket as TicketIcon,
  MessageSquare,
  AlertTriangle,
  UserPlus,
  CheckCircle,
  Clock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  priority: string;
  createdAt: string;
  ticket?: {
    id: string;
    number: number | null;
    title: string;
    status: string;
    priority: string;
  };
}

interface NotificationGroup {
  id: string;
  type: string;
  resourceType: string | null;
  resourceId: string | null;
  count: number;
  firstEventAt: string;
  lastEventAt: string;
  isRead: boolean;
  isDismissed: boolean;
  notifications: Notification[];
  _count: {
    notifications: number;
  };
}

const notificationIcons: Record<string, React.ElementType> = {
  TICKET_CREATED: TicketIcon,
  TICKET_ASSIGNED: UserPlus,
  TICKET_COMMENTED: MessageSquare,
  TICKET_STATUS_CHANGED: CheckCircle,
  SLA_BREACH_WARNING: AlertTriangle,
  SLA_BREACHED: Clock,
};

const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-800",
  normal: "bg-blue-100 text-blue-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800",
};

export function NotificationList() {
  const [groups, setGroups] = useState<NotificationGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, [unreadOnly]);

  async function fetchNotifications() {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/notifications?grouped=true&unreadOnly=${unreadOnly}`
      );
      if (response.ok) {
        const data = await response.json();
        setGroups(data);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function markAsRead(groupId?: string, notificationId?: string, markAll?: boolean) {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, notificationId, markAll }),
      });

      if (response.ok) {
        fetchNotifications();
      }
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  }

  async function dismissGroup(groupId: string) {
    try {
      const response = await fetch(`/api/notifications?groupId=${groupId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setGroups(groups.filter((g) => g.id !== groupId));
      }
    } catch (error) {
      console.error("Error dismissing group:", error);
    }
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

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={unreadOnly ? "outline" : "default"}
            size="sm"
            onClick={() => setUnreadOnly(false)}
          >
            All
          </Button>
          <Button
            variant={unreadOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setUnreadOnly(true)}
          >
            Unread
          </Button>
        </div>
        <Button variant="ghost" size="sm" onClick={() => markAsRead(undefined, undefined, true)}>
          <CheckCheck className="h-4 w-4 mr-2" />
          Mark All as Read
        </Button>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-semibold">No Notifications</p>
            <p className="text-sm text-muted-foreground mt-2">
              {unreadOnly ? "All notifications read" : "You have no notifications yet"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[600px]">
          <AnimatePresence>
            {groups.map((group) => {
              const Icon = notificationIcons[group.type] || Bell;
              const latestNotification = group.notifications[0];

              return (
                <motion.div
                  key={group.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className={cn(
                    "mb-4 transition-all hover:shadow-md",
                    !group.isRead && "border-l-4 border-l-blue-500"
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "mt-1 p-2 rounded-full",
                          group.isRead ? "bg-gray-100" : "bg-blue-100"
                        )}>
                          <Icon className={cn(
                            "h-5 w-5",
                            group.isRead ? "text-gray-600" : "text-blue-600"
                          )} />
                        </div>

                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <h3 className="font-semibold">
                                {latestNotification.title}
                              </h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                {latestNotification.message}
                              </p>
                            </div>

                            {latestNotification.priority !== "normal" && (
                              <Badge className={priorityColors[latestNotification.priority]}>
                                {latestNotification.priority}
                              </Badge>
                            )}
                          </div>

                          {/* Ticket */}
                          {latestNotification.ticket && (
                            <Link
                              href={`/dashboard/tickets/${latestNotification.ticket.id}`}
                              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
                            >
                              <TicketIcon className="h-4 w-4" />
                              Ticket #{latestNotification.ticket.number}: {latestNotification.ticket.title}
                            </Link>
                          )}

                          {/* Group */}
                          {group.count > 1 && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Badge variant="secondary">
                                +{group.count - 1} more
                              </Badge>
                              <span>
                                {formatDistanceToNow(new Date(group.firstEventAt), {
                                  addSuffix: true,
                                  locale: enUS,
                                })}
                                {" - "}
                                {formatDistanceToNow(new Date(group.lastEventAt), {
                                  addSuffix: true,
                                  locale: enUS,
                                })}
                              </span>
                            </div>
                          )}

                          {group.count === 1 && (
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(latestNotification.createdAt), {
                                addSuffix: true,
                                locale: enUS,
                              })}
                            </p>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-2 pt-2">
                            {!group.isRead && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markAsRead(group.id)}
                              >
                                <CheckCheck className="h-4 w-4 mr-1" />
                                Read
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => dismissGroup(group.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Dismiss
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </ScrollArea>
      )}
    </div>
  );
}

