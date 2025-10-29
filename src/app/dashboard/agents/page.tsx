"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Users, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  UserCheck,
  UserX,
  Edit,
  Settings,
  Shield
} from "lucide-react";
import { toast } from "sonner";
import { getInitials } from "@/lib/utils";

interface Agent {
  id: string;
  name: string | null;
  email: string;
  agentStatus: "AVAILABLE" | "BUSY" | "AWAY" | "ON_LEAVE";
  createdAt: string;
  permissions?: AgentPermissions;
  _count: {
    assignedTickets: number;
    categoryAssignments: number;
  };
}

interface AgentPermissions {
  canCreateCategories: boolean;
  canEditCategories: boolean;
  canDeleteCategories: boolean;
  canAssignAgents: boolean;
  canResetPasswords: boolean;
  canInviteUsers: boolean;
  canDeleteUsers: boolean;
  canViewAllTickets: boolean;
  canEditAllTickets: boolean;
}

const statusConfig = {
  AVAILABLE: {
    label: "Available",
    color: "bg-green-100 text-green-800",
    icon: CheckCircle,
  },
  BUSY: {
    label: "Busy",
    color: "bg-yellow-100 text-yellow-800",
    icon: Clock,
  },
  AWAY: {
    label: "Away",
    color: "bg-orange-100 text-orange-800",
    icon: AlertCircle,
  },
  ON_LEAVE: {
    label: "On Leave",
    color: "bg-red-100 text-red-800",
    icon: XCircle,
  },
};

export default function AgentsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPermissions, setEditingPermissions] = useState<string | null>(null);
  const [agentPermissions, setAgentPermissions] = useState<AgentPermissions>({
    canCreateCategories: false,
    canEditCategories: false,
    canDeleteCategories: false,
    canAssignAgents: false,
    canResetPasswords: false,
    canInviteUsers: false,
    canDeleteUsers: false,
    canViewAllTickets: false,
    canEditAllTickets: false,
  });

  // Check access
  useEffect(() => {
    if (status === "loading") return;
    
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "TENANT_ADMIN")) {
      router.push("/dashboard");
      return;
    }
  }, [session, status, router]);

  useEffect(() => {
    async function fetchAgents() {
      try {
        const response = await fetch("/api/agents");
        if (!response.ok) throw new Error("Failed to fetch agents");
        const data = await response.json();
        setAgents(data);
      } catch (error) {
        console.error("Error fetching agents:", error);
        toast.error("Error loading agents");
      } finally {
        setIsLoading(false);
      }
    }

    if (session) {
      fetchAgents();
    }
  }, [session]);

  const handleStatusChange = async (agentId: string, newStatus: Agent["agentStatus"]) => {
    try {
      const response = await fetch(`/api/agents/${agentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentStatus: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update status");
      }

      setAgents(agents.map(agent => 
        agent.id === agentId ? { ...agent, agentStatus: newStatus } : agent
      ));
      
      const statusLabel = statusConfig[newStatus].label;
      toast.success(`Agent status changed to "${statusLabel}"`);
    } catch (error: any) {
      toast.error("Error changing status", { description: error.message });
    }
  };

  const handleEditPermissions = (agent: Agent) => {
    setEditingPermissions(agent.id);
    setAgentPermissions(agent.permissions || {
      canCreateCategories: false,
      canEditCategories: false,
      canDeleteCategories: false,
      canAssignAgents: false,
      canResetPasswords: false,
      canInviteUsers: false,
      canDeleteUsers: false,
      canViewAllTickets: false,
      canEditAllTickets: false,
    });
  };

  const handleSavePermissions = async (agentId: string) => {
    try {
      const response = await fetch(`/api/agents/${agentId}/permissions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: agentPermissions }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update permissions");
      }

      setAgents(agents.map(agent => 
        agent.id === agentId ? { ...agent, permissions: agentPermissions } : agent
      ));
      
      setEditingPermissions(null);
      toast.success("Agent permissions updated");
    } catch (error: any) {
      toast.error("Error updating permissions", { description: error.message });
    }
  };

  const handleCancelEditPermissions = () => {
    setEditingPermissions(null);
    setAgentPermissions({
      canCreateCategories: false,
      canEditCategories: false,
      canDeleteCategories: false,
      canAssignAgents: false,
      canResetPasswords: false,
      canInviteUsers: false,
      canDeleteUsers: false,
      canViewAllTickets: false,
      canEditAllTickets: false,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Agents</h1>
            <p className="text-muted-foreground mt-2">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Support Agents</h1>
          <p className="text-muted-foreground mt-2">
            Manage agents and their statuses
          </p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agents.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {agents.filter(a => a.agentStatus === "AVAILABLE").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Busy</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {agents.filter(a => a.agentStatus === "BUSY").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unavailable</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {agents.filter(a => a.agentStatus === "AWAY" || a.agentStatus === "ON_LEAVE").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agents list */}
      {agents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Agents</h3>
            <p className="text-muted-foreground">
              Your organization has no support agents yet
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => {
            const status = statusConfig[agent.agentStatus];
            const StatusIcon = status.icon;
            
            return (
              <Card key={agent.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={undefined} />
                        <AvatarFallback>
                          {getInitials(agent.name || agent.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">
                          {agent.name || agent.email}
                        </CardTitle>
                        <CardDescription>
                          {agent.email}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className={status.color}>
                      <StatusIcon className="mr-1 h-3 w-3" />
                      {status.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Assigned tickets:</span>
                      <span className="font-medium">{agent._count.assignedTickets}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Categories:</span>
                      <span className="font-medium">{agent._count.categoryAssignments}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">In team since:</span>
                      <span className="font-medium">
                        {new Date(agent.createdAt).toLocaleDateString('en-US')}
                      </span>
                    </div>
                  </div>

                  {/* Agent permissions */}
                  {editingPermissions === agent.id ? (
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">Agent Permissions</div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSavePermissions(agent.id)}
                          >
                            Save
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCancelEditPermissions}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Create Categories</Label>
                          <Switch
                            checked={agentPermissions.canCreateCategories}
                            onCheckedChange={(checked) => 
                              setAgentPermissions({ ...agentPermissions, canCreateCategories: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Edit Categories</Label>
                          <Switch
                            checked={agentPermissions.canEditCategories}
                            onCheckedChange={(checked) => 
                              setAgentPermissions({ ...agentPermissions, canEditCategories: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Delete Categories</Label>
                          <Switch
                            checked={agentPermissions.canDeleteCategories}
                            onCheckedChange={(checked) => 
                              setAgentPermissions({ ...agentPermissions, canDeleteCategories: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Assign Agents</Label>
                          <Switch
                            checked={agentPermissions.canAssignAgents}
                            onCheckedChange={(checked) => 
                              setAgentPermissions({ ...agentPermissions, canAssignAgents: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Reset Passwords</Label>
                          <Switch
                            checked={agentPermissions.canResetPasswords}
                            onCheckedChange={(checked) => 
                              setAgentPermissions({ ...agentPermissions, canResetPasswords: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Invite Users</Label>
                          <Switch
                            checked={agentPermissions.canInviteUsers}
                            onCheckedChange={(checked) => 
                              setAgentPermissions({ ...agentPermissions, canInviteUsers: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Delete Users</Label>
                          <Switch
                            checked={agentPermissions.canDeleteUsers}
                            onCheckedChange={(checked) => 
                              setAgentPermissions({ ...agentPermissions, canDeleteUsers: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">View All Tickets</Label>
                          <Switch
                            checked={agentPermissions.canViewAllTickets}
                            onCheckedChange={(checked) => 
                              setAgentPermissions({ ...agentPermissions, canViewAllTickets: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Edit All Tickets</Label>
                          <Switch
                            checked={agentPermissions.canEditAllTickets}
                            onCheckedChange={(checked) => 
                              setAgentPermissions({ ...agentPermissions, canEditAllTickets: checked })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-muted-foreground">
                          Permissions
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditPermissions(agent)}
                        >
                          <Settings className="mr-1 h-3 w-3" />
                          Configure
                        </Button>
                      </div>
                      {agent.permissions && (
                        <div className="grid grid-cols-2 gap-1 text-xs">
                          {agent.permissions.canCreateCategories && (
                            <Badge variant="secondary" className="text-xs">Create Categories</Badge>
                          )}
                          {agent.permissions.canEditCategories && (
                            <Badge variant="secondary" className="text-xs">Edit Categories</Badge>
                          )}
                          {agent.permissions.canDeleteCategories && (
                            <Badge variant="secondary" className="text-xs">Delete Categories</Badge>
                          )}
                          {agent.permissions.canAssignAgents && (
                            <Badge variant="secondary" className="text-xs">Assign Agents</Badge>
                          )}
                          {agent.permissions.canResetPasswords && (
                            <Badge variant="secondary" className="text-xs">Reset Passwords</Badge>
                          )}
                          {agent.permissions.canInviteUsers && (
                            <Badge variant="secondary" className="text-xs">Invite Users</Badge>
                          )}
                          {agent.permissions.canDeleteUsers && (
                            <Badge variant="secondary" className="text-xs">Delete Users</Badge>
                          )}
                          {agent.permissions.canViewAllTickets && (
                            <Badge variant="secondary" className="text-xs">View All Tickets</Badge>
                          )}
                          {agent.permissions.canEditAllTickets && (
                            <Badge variant="secondary" className="text-xs">Edit All Tickets</Badge>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Status change buttons */}
                  <div className="mt-4 space-y-2">
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                      Change Status:
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={agent.agentStatus === "AVAILABLE" ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleStatusChange(agent.id, "AVAILABLE")}
                      >
                        <UserCheck className="mr-1 h-3 w-3" />
                        Available
                      </Button>
                      <Button
                        variant={agent.agentStatus === "BUSY" ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleStatusChange(agent.id, "BUSY")}
                      >
                        <Clock className="mr-1 h-3 w-3" />
                        Busy
                      </Button>
                      <Button
                        variant={agent.agentStatus === "AWAY" ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleStatusChange(agent.id, "AWAY")}
                      >
                        <AlertCircle className="mr-1 h-3 w-3" />
                        Away
                      </Button>
                      <Button
                        variant={agent.agentStatus === "ON_LEAVE" ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleStatusChange(agent.id, "ON_LEAVE")}
                      >
                        <UserX className="mr-1 h-3 w-3" />
                        On Leave
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
