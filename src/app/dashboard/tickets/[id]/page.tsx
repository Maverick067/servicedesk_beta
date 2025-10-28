"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { formatDate, getInitials } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Loader2, MessageSquare, Hash } from "lucide-react";
import { formatTicketNumber } from "@/lib/ticket-utils";

const statusColors: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  PENDING: "bg-purple-100 text-purple-800",
  RESOLVED: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-100 text-gray-800",
};

const priorityColors: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-800",
  MEDIUM: "bg-blue-100 text-blue-800",
  HIGH: "bg-orange-100 text-orange-800",
  URGENT: "bg-red-100 text-red-800",
};

const statusLabels: Record<string, string> = {
  OPEN: "Открыт",
  IN_PROGRESS: "В работе",
  PENDING: "Ожидание",
  RESOLVED: "Решен",
  CLOSED: "Закрыт",
};

const priorityLabels: Record<string, string> = {
  LOW: "Низкий",
  MEDIUM: "Средний",
  HIGH: "Высокий",
  URGENT: "Срочный",
};

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [ticket, setTicket] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const canEdit = session?.user.role === "ADMIN" || session?.user.role === "AGENT";

  useEffect(() => {
    async function fetchTicket() {
      try {
        const response = await fetch(`/api/tickets/${params.id}`);
        if (!response.ok) throw new Error("Failed to fetch ticket");
        const data = await response.json();
        setTicket(data);

        // Помечаем комментарии как прочитанные
        try {
          await fetch(`/api/tickets/${params.id}/unread-comments`, {
            method: "POST",
          });
        } catch (error) {
          console.error("Error marking comments as read:", error);
          // Не прерываем загрузку тикета из-за ошибки
        }
      } catch (error) {
        console.error("Error fetching ticket:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (params.id) {
      fetchTicket();
    }
  }, [params.id]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/tickets/${params.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: comment }),
      });

      if (!response.ok) throw new Error("Failed to add comment");

      const newComment = await response.json();
      setTicket({
        ...ticket,
        comments: [...ticket.comments, newComment],
      });
      setComment("");
      
      // Обновляем счетчик комментариев в списке тикетов
      // Это можно сделать через событие или через обновление localStorage
      window.dispatchEvent(new CustomEvent('commentAdded', { 
        detail: { ticketId: params.id, commentCount: ticket.comments.length + 1 } 
      }));
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/tickets/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) throw new Error("Failed to update status");

      const updatedTicket = await response.json();
      setTicket({ ...ticket, status: updatedTicket.status });
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdatePriority = async (priority: string) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/tickets/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority }),
      });

      if (!response.ok) throw new Error("Failed to update priority");

      const updatedTicket = await response.json();
      setTicket({ ...ticket, priority: updatedTicket.priority });
    } catch (error) {
      console.error("Error updating priority:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Тикет не найден</p>
        <Button onClick={() => router.back()} className="mt-4">
          Вернуться назад
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Назад
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-l-4" style={{ borderLeftColor: ticket.category?.color || '#3b82f6' }}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="font-mono bg-gradient-to-r from-blue-50 to-purple-50">
                      <Hash className="h-3 w-3 mr-1" />
                      {formatTicketNumber(ticket.tenant?.slug || 'GLOBAL', ticket.number)}
                    </Badge>
                    {ticket.category && (
                      <Badge 
                        variant="secondary"
                        style={{ 
                          backgroundColor: `${ticket.category.color}20`,
                          color: ticket.category.color,
                          borderColor: ticket.category.color
                        }}
                      >
                        {ticket.category.name}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-2xl mb-2">
                    {ticket.title}
                  </CardTitle>
                  <CardDescription>
                    Создан {formatDate(ticket.createdAt)}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge className={statusColors[ticket.status]}>
                    {statusLabels[ticket.status]}
                  </Badge>
                  <Badge className={priorityColors[ticket.priority]}>
                    {priorityLabels[ticket.priority]}
                  </Badge>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 text-blue-700">
                    <MessageSquare className="h-4 w-4" />
                    <span className="text-sm font-medium">{ticket.comments.length}</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <p className="whitespace-pre-wrap">{ticket.description}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Комментарии ({ticket.comments.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ticket.comments.map((comment: any) => (
                <div key={comment.id} className="flex gap-4">
                  <Avatar>
                    <AvatarImage src={comment.author.avatar || undefined} />
                    <AvatarFallback>
                      {getInitials(comment.author.name || comment.author.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">
                        {comment.author.name || comment.author.email}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(comment.createdAt)}
                      </span>
                      {comment.isInternal && (
                        <Badge variant="secondary" className="text-xs">
                          Внутренний
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))}

              <form onSubmit={handleAddComment} className="space-y-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label>Добавить комментарий</Label>
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Напишите комментарий..."
                    disabled={isSubmitting}
                    rows={4}
                  />
                </div>
                <Button type="submit" disabled={isSubmitting || !comment.trim()}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Отправка...
                    </>
                  ) : (
                    "Отправить"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Информация</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Создатель</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={ticket.creator.avatar || undefined} />
                    <AvatarFallback>
                      {getInitials(ticket.creator.name || ticket.creator.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      {ticket.creator.name || ticket.creator.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ticket.creator.role === "ADMIN" && "Администратор"}
                      {ticket.creator.role === "AGENT" && "Агент"}
                      {ticket.creator.role === "USER" && "Пользователь"}
                    </p>
                  </div>
                </div>
              </div>

              {ticket.assignee && (
                <div>
                  <Label className="text-muted-foreground">Назначен</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={ticket.assignee.avatar || undefined} />
                      <AvatarFallback>
                        {getInitials(ticket.assignee.name || ticket.assignee.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {ticket.assignee.name || ticket.assignee.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {ticket.assignee.role === "AGENT" && "Агент"}
                        {ticket.assignee.role === "ADMIN" && "Администратор"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {canEdit && (
                <>
                  <div className="space-y-2">
                    <Label>Статус</Label>
                    <Select
                      value={ticket.status}
                      onValueChange={handleUpdateStatus}
                      disabled={isUpdating}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OPEN">Открыт</SelectItem>
                        <SelectItem value="IN_PROGRESS">В работе</SelectItem>
                        <SelectItem value="PENDING">Ожидание</SelectItem>
                        <SelectItem value="RESOLVED">Решен</SelectItem>
                        <SelectItem value="CLOSED">Закрыт</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Приоритет</Label>
                    <Select
                      value={ticket.priority}
                      onValueChange={handleUpdatePriority}
                      disabled={isUpdating}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Низкий</SelectItem>
                        <SelectItem value="MEDIUM">Средний</SelectItem>
                        <SelectItem value="HIGH">Высокий</SelectItem>
                        <SelectItem value="URGENT">Срочный</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {ticket.category && (
                <div>
                  <Label className="text-muted-foreground">Категория</Label>
                  <p className="text-sm mt-1">{ticket.category.name}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

