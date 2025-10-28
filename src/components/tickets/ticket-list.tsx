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
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  PENDING: "Pending",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

const priorityLabels: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export function TicketList() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    async function fetchData() {
      try {
        // Load tickets
        const ticketsResponse = await fetch("/api/tickets");
        const ticketsData = await ticketsResponse.json();
        setTickets(ticketsData);

        // Load unread comment counts
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

    // Listen for comment update events
    const handleCommentAdded = (event: CustomEvent) => {
      const { ticketId, commentCount } = event.detail;
      setTickets(prevTickets => 
        prevTickets.map(ticket => 
          ticket.id === ticketId 
            ? { ...ticket, _count: { ...ticket._count, comments: commentCount } }
            : ticket
        )
      );
      // Update unread counter
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
          <p className="text-muted-foreground">No tickets</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {tickets.map((ticket, index) => (
        <motion.div
          key={ticket.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, duration: 0.3 }}
        >
          <Card
            className="cursor-pointer hover:shadow-xl transition-all duration-300 sm:hover:-translate-y-1 border-l-4 overflow-hidden group touch-manipulation active:scale-[0.98]"
            style={{ borderLeftColor: ticket.category?.color || '#3b82f6' }}
            onClick={() => router.push(`/dashboard/tickets/${ticket.id}`)}
          >
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 py-3 sm:py-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Badges Row - horizontal scroll on mobile */}
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-2 overflow-x-auto pb-1 scrollbar-thin">
                    <Badge variant="outline" className="font-mono text-[10px] sm:text-xs bg-gradient-to-r from-blue-50 to-purple-50 flex-shrink-0">
                      <Hash className="h-3 w-3 mr-0.5 sm:mr-1" />
                      <span className="hidden xs:inline">{formatTicketNumber(ticket.tenant?.slug || 'GLOBAL', ticket.number)}</span>
                      <span className="xs:hidden">#{ticket.number}</span>
                    </Badge>
                    {ticket.queue && (
                      <Badge 
                        variant="secondary" 
                        className="text-[10px] sm:text-xs flex-shrink-0"
                        style={{ 
                          backgroundColor: `${ticket.queue.color}20`,
                          color: ticket.queue.color,
                          borderColor: ticket.queue.color
                        }}
                      >
                        <span className="hidden sm:inline">📥 </span>{ticket.queue.name}
                      </Badge>
                    )}
                    {ticket.category && (
                      <Badge 
                        variant="secondary" 
                        className="text-[10px] sm:text-xs flex-shrink-0"
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
                  
                  {/* Title - responsive size */}
                  <CardTitle className="text-base sm:text-lg mb-1.5 sm:mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                    {ticket.title}
                  </CardTitle>
                  
                  {/* Description - hide on small screens */}
                  <CardDescription className="line-clamp-1 sm:line-clamp-2 text-xs sm:text-sm">
                    {ticket.description}
                  </CardDescription>
                </div>
                
                {/* Status/Priority - column on mobile */}
                <div className="flex sm:flex-col gap-1.5 sm:gap-2 sm:ml-4">
                  <Badge className={`${statusColors[ticket.status]} transition-transform group-hover:scale-105 text-[10px] sm:text-xs flex-shrink-0`}>
                    {statusLabels[ticket.status]}
                  </Badge>
                  <Badge className={`${priorityColors[ticket.priority]} transition-transform group-hover:scale-105 text-[10px] sm:text-xs flex-shrink-0`}>
                    {priorityLabels[ticket.priority]}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="px-3 sm:px-6 py-2 sm:py-4">
              {/* Mobile version - stack */}
              <div className="flex flex-col sm:hidden gap-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Avatar className="h-5 w-5 flex-shrink-0">
                      <AvatarImage src={ticket.creator.avatar || undefined} />
                      <AvatarFallback className="text-[10px]">
                        {getInitials(ticket.creator.name || ticket.creator.email)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-muted-foreground truncate">
                      {ticket.creator.name || ticket.creator.email}
                    </span>
                  </div>
                  <span className="text-muted-foreground text-[10px] flex-shrink-0 ml-2">
                    {formatDate(ticket.createdAt)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  {ticket.assignee && (
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-muted-foreground flex-shrink-0">→</span>
                      <Avatar className="h-5 w-5 flex-shrink-0">
                        <AvatarImage src={ticket.assignee.avatar || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {getInitials(ticket.assignee.name || ticket.assignee.email)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-muted-foreground truncate">
                        {ticket.assignee.name || ticket.assignee.email}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1.5 ml-auto">
                    <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700">
                      <MessageSquare className="h-3 w-3" />
                      <span className="text-xs font-medium">{ticket._count.comments}</span>
                    </div>
                    {unreadCounts[ticket.id] > 0 && (
                      <div className="flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
                        {unreadCounts[ticket.id]}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Desktop version - row */}
              <div className="hidden sm:flex items-center justify-between text-sm">
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
                        <span className="sr-only">Unread comments: {unreadCounts[ticket.id]}</span>
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

