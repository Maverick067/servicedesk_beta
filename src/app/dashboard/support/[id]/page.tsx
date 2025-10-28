"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, MessageSquare, Clock, Send, User } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { FileUpload } from "@/components/attachments/file-upload";

interface SupportTicket {
  id: string;
  number: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
  attachments: Array<{
    id: string;
    filename: string;
    filepath: string;
    mimetype: string;
    size: number;
    createdAt: string;
  }>;
  comments: Array<{
    id: string;
    content: string;
    createdAt: string;
    isInternal: boolean;
    author: {
      name: string;
      email: string;
      role: string;
    };
  }>;
}

export default function TenantSupportTicketDetailPage() {
  const router = useRouter();
  const params = useParams();
  const ticketId = params.id as string;
  const { data: session, status } = useSession();
  
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (status === "loading") return;

    if (!session || session.user.role !== "TENANT_ADMIN") {
      router.push("/dashboard");
      return;
    }

    // Load immediately
    fetchTicket();

    // Update every 10 seconds
    const interval = setInterval(fetchTicket, 10000);

    return () => clearInterval(interval);
  }, [session, status, router, ticketId]);

  async function fetchTicket() {
    try {
      const response = await fetch(`/api/support-tickets/${ticketId}`);
      if (!response.ok) {
        if (response.status === 404) {
          toast.error("Ticket not found");
          router.push("/dashboard/support");
          return;
        }
        throw new Error("Failed to fetch ticket");
      }
      const data = await response.json();
      setTicket(data);
    } catch (error) {
      console.error("Error fetching ticket:", error);
      toast.error("Error loading ticket");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddComment() {
    if (!comment.trim()) {
      toast.error("Enter comment text");
      return;
    }

    if (comment.trim().length < 5) {
      toast.error("Comment must be at least 5 characters");
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/support-tickets/${ticketId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: comment, isInternal: false }),
      });

      if (!response.ok) throw new Error("Failed to add comment");

      toast.success("Comment added!");
      setComment("");
      fetchTicket();
    } catch (error: any) {
      toast.error("Error adding comment");
    } finally {
      setIsUpdating(false);
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

  const getPriorityBadge = (priority: string) => {
    const variants: any = {
      LOW: { className: "bg-gray-500", label: "Low" },
      MEDIUM: { className: "bg-blue-500", label: "Medium" },
      HIGH: { className: "bg-orange-500", label: "High" },
      URGENT: { className: "bg-red-600", label: "Urgent" },
    };
    const config = variants[priority] || variants.MEDIUM;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.push("/dashboard/support")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Card className="animate-pulse">
          <CardContent className="h-96" />
        </Card>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.push("/dashboard/support")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Ticket not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" onClick={() => router.push("/dashboard/support")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to List
        </Button>
      </div>

      {/* Ticket Header */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm text-muted-foreground font-mono">
                  #{ticket.number}
                </span>
                {getStatusBadge(ticket.status)}
                {getPriorityBadge(ticket.priority)}
              </div>
              <CardTitle className="text-3xl mb-2">{ticket.title}</CardTitle>
              <CardDescription className="text-base">{ticket.description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">Created:</span>
            <span>{formatDate(ticket.createdAt)}</span>
          </div>
          {ticket.updatedAt !== ticket.createdAt && (
            <div className="flex items-center gap-2 text-sm mt-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">Updated:</span>
              <span>{formatDate(ticket.updatedAt)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* File Attachments */}
      <Card>
        <CardHeader>
          <CardTitle>Attachments</CardTitle>
        </CardHeader>
        <CardContent>
          <FileUpload
            ticketId={ticket.id}
            ticketType="support"
            attachments={ticket.attachments}
            onUploadComplete={fetchTicket}
            onDeleteComplete={fetchTicket}
          />
        </CardContent>
      </Card>

      {/* Comments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Comments ({ticket.comments.filter(c => !c.isInternal).length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {ticket.comments
            .filter(comment => !comment.isInternal) // Tenant admins don't see internal notes
            .map((comment) => (
              <div
                key={comment.id}
                className="p-4 rounded-lg border-2 bg-gray-50"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">{comment.author.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {comment.author.role === "ADMIN" ? "Support" : "You"}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(comment.createdAt)}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
              </div>
            ))}

          {ticket.comments.filter(c => !c.isInternal).length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No comments yet
            </p>
          )}

          {/* Add Comment - only if not closed */}
          {ticket.status !== "CLOSED" && (
            <div className="pt-4 border-t space-y-4">
              <Label>Add Comment</Label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Enter your comment or additional information (minimum 5 characters)"
                rows={4}
                className={comment && comment.length < 5 ? "border-red-500" : ""}
              />
              <p className="text-xs text-muted-foreground">
                {comment.length} / 5 characters (minimum)
              </p>
              <div className="flex justify-end">
                <Button
                  onClick={handleAddComment}
                  disabled={isUpdating || comment.length < 5}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Send
                </Button>
              </div>
            </div>
          )}

          {ticket.status === "CLOSED" && (
            <div className="pt-4 border-t">
              <p className="text-center text-muted-foreground">
                Ticket is closed. Adding comments is not available.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

