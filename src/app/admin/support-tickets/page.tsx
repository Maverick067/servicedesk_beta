"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, Clock, CheckCircle2, Building2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface SupportTicket {
  id: string;
  number: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  tenantId: string;
  createdAt: string;
  tenant: {
    name: string;
    slug: string;
  };
  _count: {
    comments: number;
  };
}

export default function SupportTicketsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;

    if (!session || session.user.role !== "ADMIN") {
      router.push("/dashboard");
      return;
    }
  }, [session, status, router]);

  async function fetchTickets() {
    try {
      const response = await fetch("/api/support-tickets");
      if (!response.ok) throw new Error("Failed to fetch tickets");
      const data = await response.json();
      setTickets(data);
    } catch (error) {
      console.error("Error fetching support tickets:", error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!session || session.user.role !== "ADMIN") return;

    // Load immediately
    fetchTickets();

    // Update every 15 seconds
    const interval = setInterval(fetchTickets, 15000);

    return () => clearInterval(interval);
  }, [session]);

  const getStatusBadge = (status: string) => {
    const variants: any = {
      OPEN: { variant: "default", label: "Open" },
      IN_PROGRESS: { variant: "secondary", label: "In Progress" },
      PENDING: { variant: "outline", label: "Pending" },
      RESOLVED: { variant: "default", label: "Resolved", className: "bg-green-600" },
      CLOSED: { variant: "outline", label: "Closed" },
    };
    const config = variants[status] || variants.OPEN;
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const variants: any = {
      LOW: { variant: "outline", label: "Low" },
      MEDIUM: { variant: "secondary", label: "Medium" },
      HIGH: { variant: "default", label: "High", className: "bg-orange-600" },
      URGENT: { variant: "destructive", label: "Urgent" },
    };
    const config = variants[priority] || variants.MEDIUM;
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-3xl font-bold">Support Tickets</h1>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-32" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === "OPEN" || t.status === "IN_PROGRESS").length,
    resolved: tickets.filter(t => t.status === "RESOLVED").length,
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent flex items-center gap-3">
          <MessageSquare className="h-8 w-8 text-orange-600" />
          Support Tickets
        </h1>
        <p className="text-muted-foreground mt-2">
          Requests from organization administrators
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Open
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.open}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Resolved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tickets List */}
      <div className="space-y-4">
        {tickets.map((ticket) => (
          <Card
            key={ticket.id}
            className="border-2 hover:border-primary hover:shadow-lg transition-all cursor-pointer"
            onClick={() => router.push(`/admin/support-tickets/${ticket.id}`)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm text-muted-foreground font-mono">
                      #{ticket.number}
                    </span>
                    {getStatusBadge(ticket.status)}
                    {getPriorityBadge(ticket.priority)}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{ticket.title}</h3>
                  <p className="text-muted-foreground line-clamp-2 mb-3">
                    {ticket.description}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      <span>{ticket.tenant.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{formatDate(ticket.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      <span>{ticket._count.comments} comments</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {tickets.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No tickets</h3>
              <p className="text-muted-foreground">
                Requests from organization administrators will be displayed here
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

