"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, MessageSquare, Clock, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

interface SupportTicket {
  id: string;
  number: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  _count: {
    comments: number;
  };
}

export default function TenantSupportPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createDialog, setCreateDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
  });

  useEffect(() => {
    if (status === "loading") return;

    if (!session || session.user.role !== "TENANT_ADMIN") {
      router.push("/dashboard");
      return;
    }
  }, [session, status, router]);

  useEffect(() => {
    if (!session || session.user.role !== "TENANT_ADMIN") return;
    
    // Load immediately
    fetchTickets();

    // Update every 15 seconds
    const interval = setInterval(fetchTickets, 15000);

    return () => clearInterval(interval);
  }, [session]);

  async function fetchTickets() {
    try {
      const response = await fetch("/api/support-tickets");
      if (!response.ok) throw new Error("Failed to fetch tickets");
      const data = await response.json();
      setTickets(data);
    } catch (error) {
      console.error("Error fetching support tickets:", error);
      toast.error("Error loading tickets");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreate() {
    // Client-side validation
    if (!formData.title.trim()) {
      toast.error("Enter ticket title");
      return;
    }
    if (formData.title.trim().length < 5) {
      toast.error("Title must be at least 5 characters");
      return;
    }
    if (!formData.description.trim()) {
      toast.error("Enter problem description");
      return;
    }
    if (formData.description.trim().length < 10) {
      toast.error("Description must be at least 10 characters");
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch("/api/support-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create ticket");
      }

      toast.success("Ticket created successfully!");
      setCreateDialog(false);
      setFormData({ title: "", description: "", priority: "MEDIUM" });
      fetchTickets();
    } catch (error: any) {
      console.error("Error creating support ticket:", error);
      toast.error("Error creating ticket", { description: error.message });
    } finally {
      setIsCreating(false);
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: any = {
      OPEN: { variant: "default", label: "Open" },
      IN_PROGRESS: { variant: "secondary", label: "In Progress" },
      RESOLVED: { variant: "default", label: "Resolved", className: "bg-green-600" },
      CLOSED: { variant: "outline", label: "Closed" },
    };
    const config = variants[status] || variants.OPEN;
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Support</h1>
        <div className="grid gap-4">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-32" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <HelpCircle className="h-8 w-8 text-blue-600" />
            Support
          </h1>
          <p className="text-muted-foreground mt-2">
            Contact platform administrators for help
          </p>
        </div>
        <Button onClick={() => setCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Ticket
        </Button>
      </div>

      {/* Tickets List */}
      <div className="space-y-4">
        {tickets.map((ticket) => (
          <Card
            key={ticket.id}
            className="border-2 hover:border-primary hover:shadow-lg transition-all cursor-pointer"
            onClick={() => router.push(`/dashboard/support/${ticket.id}`)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm text-muted-foreground font-mono">
                      #{ticket.number}
                    </span>
                    {getStatusBadge(ticket.status)}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{ticket.title}</h3>
                  <p className="text-muted-foreground line-clamp-2 mb-3">
                    {ticket.description}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{formatDate(ticket.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      <span>{ticket._count.comments} replies</span>
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
              <HelpCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No tickets yet</h3>
              <p className="text-muted-foreground mb-4">
                Create a ticket if you have questions or issues
              </p>
              <Button onClick={() => setCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Ticket
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Support Ticket</DialogTitle>
            <DialogDescription>
              Describe your problem or question. Platform administrators will respond to you soon.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Brief description of the problem (minimum 5 characters)"
                className={formData.title && formData.title.length < 5 ? "border-red-500" : ""}
              />
              <p className="text-xs text-muted-foreground">
                {formData.title.length} / 5 characters (minimum)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detailed description of the problem or question (minimum 10 characters)"
                rows={6}
                className={formData.description && formData.description.length < 10 ? "border-red-500" : ""}
              />
              <p className="text-xs text-muted-foreground">
                {formData.description.length} / 10 characters (minimum)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)} disabled={isCreating}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreate} 
              disabled={isCreating || formData.title.length < 5 || formData.description.length < 10}
            >
              {isCreating ? "Creating..." : "Create Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

