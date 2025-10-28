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
import { FileUpload } from "@/components/attachments/file-upload";

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

  const fetchTicket = async () => {
    try {
      const response = await fetch(`/api/tickets/${params.id}`);
      if (!response.ok) throw new Error("Failed to fetch ticket");
      const data = await response.json();
      setTicket(data);

      // Mark comments as read
      try {
        await fetch(`/api/tickets/${params.id}/unread-comments`, {
          method: "POST",
        });
      } catch (error) {
        console.error("Error marking comments as read:", error);
        // Don't interrupt ticket loading due to error
      }
    } catch (error) {
      console.error("Error fetching ticket:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
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
      
      // Update comment counter in ticket list
      // This can be done via event or localStorage update
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
        <p className="text-muted-foreground">Ticket not found</p>
        <Button onClick={() => router.back()} className="mt-4">
          Go back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Button 
        variant="ghost" 
        onClick={() => router.back()}
        className="touch-manipulation -ml-2 sm:ml-0"
        size="sm"
      >
        <ArrowLeft className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
        <span className="text-xs sm:text-sm">Back</span>
      </Button>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          <Card className="border-l-4" style={{ borderLeftColor: ticket.category?.color || '#3b82f6' }}>
            <CardHeader className="pb-3 sm:pb-6 px-3 sm:px-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  {/* Badges - horizontal scroll on mobile */}
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 overflow-x-auto pb-1 scrollbar-thin">
                    <Badge variant="outline" className="font-mono text-[10px] sm:text-xs bg-gradient-to-r from-blue-50 to-purple-50 flex-shrink-0">
                      <Hash className="h-3 w-3 mr-0.5 sm:mr-1" />
                      <span className="hidden xs:inline">{formatTicketNumber(ticket.tenant?.slug || 'GLOBAL', ticket.number)}</span>
                      <span className="xs:hidden">#{ticket.number}</span>
                    </Badge>
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
                  </div>
                  <CardTitle className="text-lg sm:text-xl md:text-2xl mb-1 sm:mb-2 line-clamp-2">
                    {ticket.title}
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Created {formatDate(ticket.createdAt)}
                  </CardDescription>
                </div>
                
                {/* Status/Priority/Comments - vertical on mobile */}
                <div className="flex sm:flex-col gap-1.5 sm:gap-2 flex-wrap">
                  <Badge className={`${statusColors[ticket.status]} text-[10px] sm:text-xs flex-shrink-0`}>
                    {statusLabels[ticket.status]}
                  </Badge>
                  <Badge className={`${priorityColors[ticket.priority]} text-[10px] sm:text-xs flex-shrink-0`}>
                    {priorityLabels[ticket.priority]}
                  </Badge>
                  <div className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md bg-blue-50 text-blue-700 flex-shrink-0">
                    <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="text-xs sm:text-sm font-medium">{ticket.comments.length}</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="prose max-w-none prose-sm sm:prose-base">
                <p className="whitespace-pre-wrap text-sm sm:text-base">{ticket.description}</p>
              </div>
            </CardContent>
          </Card>

          {/* File Attachments */}
          <Card>
            <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
              <CardTitle className="text-base sm:text-lg">Attachments</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <FileUpload
                ticketId={ticket.id}
                ticketType="regular"
                attachments={ticket.attachments || []}
                onUploadComplete={fetchTicket}
                onDeleteComplete={fetchTicket}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
              <CardTitle className="text-base sm:text-lg">Comments ({ticket.comments.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6">
              {ticket.comments.map((comment: any) => (
                <div key={comment.id} className="flex gap-2 sm:gap-4">
                  <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
                    <AvatarImage src={comment.author.avatar || undefined} />
                    <AvatarFallback className="text-xs sm:text-sm">
                      {getInitials(comment.author.name || comment.author.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col xs:flex-row xs:items-center gap-1 xs:gap-2 mb-1">
                      <span className="font-medium text-xs sm:text-sm truncate">
                        {comment.author.name || comment.author.email}
                      </span>
                      <span className="text-[10px] xs:text-xs text-muted-foreground flex-shrink-0">
                        {formatDate(comment.createdAt)}
                      </span>
                      {comment.isInternal && (
                        <Badge variant="secondary" className="text-[10px] xs:text-xs w-fit">
                          Internal
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))}

              <form onSubmit={handleAddComment} className="space-y-3 sm:space-y-4 pt-3 sm:pt-4 border-t">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label className="text-xs sm:text-sm">Add Comment</Label>
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Write a comment..."
                    disabled={isSubmitting}
                    rows={3}
                    className="text-xs sm:text-sm min-h-[60px] sm:min-h-[80px]"
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={isSubmitting || !comment.trim()}
                  className="w-full sm:w-auto touch-manipulation"
                  size="sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                      <span className="text-xs sm:text-sm">Sending...</span>
                    </>
                  ) : (
                    <span className="text-xs sm:text-sm">Send</span>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
              <CardTitle className="text-base sm:text-lg">Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6">
              <div>
                <Label className="text-muted-foreground text-xs sm:text-sm">Creator</Label>
                <div className="flex items-center gap-2 mt-1.5 sm:mt-2">
                  <Avatar className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0">
                    <AvatarImage src={ticket.creator.avatar || undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(ticket.creator.name || ticket.creator.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium truncate">
                      {ticket.creator.name || ticket.creator.email}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      {ticket.creator.role === "ADMIN" && "Administrator"}
                      {ticket.creator.role === "AGENT" && "Agent"}
                      {ticket.creator.role === "USER" && "User"}
                    </p>
                  </div>
                </div>
              </div>

              {ticket.assignee && (
                <div>
                  <Label className="text-muted-foreground text-xs sm:text-sm">Assigned To</Label>
                  <div className="flex items-center gap-2 mt-1.5 sm:mt-2">
                    <Avatar className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0">
                      <AvatarImage src={ticket.assignee.avatar || undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(ticket.assignee.name || ticket.assignee.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium truncate">
                        {ticket.assignee.name || ticket.assignee.email}
                      </p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        {ticket.assignee.role === "AGENT" && "Agent"}
                        {ticket.assignee.role === "ADMIN" && "Administrator"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {canEdit && (
                <>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">Status</Label>
                    <Select
                      value={ticket.status}
                      onValueChange={handleUpdateStatus}
                      disabled={isUpdating}
                    >
                      <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OPEN" className="text-xs sm:text-sm">Open</SelectItem>
                        <SelectItem value="IN_PROGRESS" className="text-xs sm:text-sm">In Progress</SelectItem>
                        <SelectItem value="PENDING" className="text-xs sm:text-sm">Pending</SelectItem>
                        <SelectItem value="RESOLVED" className="text-xs sm:text-sm">Resolved</SelectItem>
                        <SelectItem value="CLOSED" className="text-xs sm:text-sm">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">Priority</Label>
                    <Select
                      value={ticket.priority}
                      onValueChange={handleUpdatePriority}
                      disabled={isUpdating}
                    >
                      <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW" className="text-xs sm:text-sm">Low</SelectItem>
                        <SelectItem value="MEDIUM" className="text-xs sm:text-sm">Medium</SelectItem>
                        <SelectItem value="HIGH" className="text-xs sm:text-sm">High</SelectItem>
                        <SelectItem value="URGENT" className="text-xs sm:text-sm">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {ticket.category && (
                <div>
                  <Label className="text-muted-foreground text-xs sm:text-sm">Category</Label>
                  <p className="text-xs sm:text-sm mt-1">{ticket.category.name}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


