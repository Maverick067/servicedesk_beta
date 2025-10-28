"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { MessageSquare, Hash } from "lucide-react";
import { formatTicketNumber } from "@/lib/ticket-utils";
import { motion } from "framer-motion";
import { SlaBadge } from "@/components/sla/sla-badge";

interface Ticket {
  id: string;
  number: number | null;
  title: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  slaDueDate: string | null;
  slaBreached: boolean;
  creator: {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
  };
  assignee: {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
  } | null;
  category: {
    id: string;
    name: string;
    color: string;
  } | null;
  queue: {
    id: string;
    name: string;
    color: string;
  } | null;
  tenant: {
    slug: string;
  };
  _count: {
    comments: number;
  };
}

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

export function TicketList() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    async function fetchData() {
      try {
        // Загружаем тикеты
        const ticketsResponse = await fetch("/api/tickets");
        const ticketsData = await ticketsResponse.json();
        setTickets(ticketsData);

        // Загружаем количество непрочитанных комментариев
        const unreadResponse = await fetch("/api/tickets/unread-counts");
        if (unreadResponse.ok) {
          const unreadData = await unreadResponse.json();
          setUnreadCounts(unreadData);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();

    // Слушаем события обновления комментариев
    const handleCommentAdded = (event: CustomEvent) => {
      const { ticketId, commentCount } = event.detail;
      setTickets(prevTickets => 
        prevTickets.map(ticket => 
          ticket.id === ticketId 
            ? { ...ticket, _count: { ...ticket._count, comments: commentCount } }
            : ticket
        )
      );
      // Обновляем счетчик непрочитанных
      setUnreadCounts(prev => ({
        ...prev,
        [ticketId]: (prev[ticketId] || 0) + 1
      }));
    };

    window.addEventListener('commentAdded', handleCommentAdded as EventListener);
    
    return () => {
      window.removeEventListener('commentAdded', handleCommentAdded as EventListener);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="h-32" />
          </Card>
        ))}
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Нет тикетов</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {tickets.map((ticket, index) => (
        <motion.div
          key={ticket.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, duration: 0.3 }}
        >
          <Card
            className="cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-l-4 overflow-hidden group"
            style={{ borderLeftColor: ticket.category?.color || '#3b82f6' }}
            onClick={() => router.push(`/dashboard/tickets/${ticket.id}`)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="font-mono text-xs bg-gradient-to-r from-blue-50 to-purple-50">
                      <Hash className="h-3 w-3 mr-1" />
                      {formatTicketNumber(ticket.tenant?.slug || 'GLOBAL', ticket.number)}
                    </Badge>
                    {ticket.queue && (
                      <Badge 
                        variant="secondary" 
                        className="text-xs"
                        style={{ 
                          backgroundColor: `${ticket.queue.color}20`,
                          color: ticket.queue.color,
                          borderColor: ticket.queue.color
                        }}
                      >
                        📥 {ticket.queue.name}
                      </Badge>
                    )}
                    {ticket.category && (
                      <Badge 
                        variant="secondary" 
                        className="text-xs"
                        style={{ 
                          backgroundColor: `${ticket.category.color}20`,
                          color: ticket.category.color,
                          borderColor: ticket.category.color
                        }}
                      >
                        {ticket.category.name}
                      </Badge>
                    )}
                    <SlaBadge slaDueDate={ticket.slaDueDate} slaBreached={ticket.slaBreached} />
                  </div>
                  <CardTitle className="text-lg mb-2 group-hover:text-blue-600 transition-colors">
                    {ticket.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {ticket.description}
                  </CardDescription>
                </div>
                <div className="flex gap-2 ml-4">
                  <Badge className={`${statusColors[ticket.status]} transition-transform group-hover:scale-105`}>
                    {statusLabels[ticket.status]}
                  </Badge>
                  <Badge className={`${priorityColors[ticket.priority]} transition-transform group-hover:scale-105`}>
                    {priorityLabels[ticket.priority]}
                  </Badge>
                </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={ticket.creator.avatar || undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(ticket.creator.name || ticket.creator.email)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-muted-foreground">
                    {ticket.creator.name || ticket.creator.email}
                  </span>
                </div>
                {ticket.assignee && (
                  <>
                    <span className="text-muted-foreground">→</span>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={ticket.assignee.avatar || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(ticket.assignee.name || ticket.assignee.email)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-muted-foreground">
                        {ticket.assignee.name || ticket.assignee.email}
                      </span>
                    </div>
                  </>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 text-blue-700">
                    <MessageSquare className="h-4 w-4" />
                    <span className="text-sm font-medium">{ticket._count.comments}</span>
                  </div>
                  {unreadCounts[ticket.id] > 0 && (
                    <div className="relative">
                      <div className="flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-red-500 text-white text-xs font-bold">
                        {unreadCounts[ticket.id]}
                      </div>
                      <span className="sr-only">Непрочитанных комментариев: {unreadCounts[ticket.id]}</span>
                    </div>
                  )}
                </div>
                <span className="text-muted-foreground">
                  {formatDate(ticket.createdAt)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>
      ))}
    </div>
  );
}

