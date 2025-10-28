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
    label: "Доступен",
    color: "bg-green-100 text-green-800",
    icon: CheckCircle,
  },
  BUSY: {
    label: "Занят",
    color: "bg-yellow-100 text-yellow-800",
    icon: Clock,
  },
  AWAY: {
    label: "Не на работе",
    color: "bg-orange-100 text-orange-800",
    icon: AlertCircle,
  },
  ON_LEAVE: {
    label: "В отпуске",
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

  // Проверяем доступ
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
        toast.error("Ошибка загрузки агентов");
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
      toast.success(`Статус агента изменен на "${statusLabel}"`);
    } catch (error: any) {
      toast.error("Ошибка изменения статуса", { description: error.message });
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
      toast.success("Разрешения агента обновлены");
    } catch (error: any) {
      toast.error("Ошибка обновления разрешений", { description: error.message });
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
            <h1 className="text-3xl font-bold">Агенты</h1>
            <p className="text-muted-foreground mt-2">Загрузка...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Агенты поддержки</h1>
          <p className="text-muted-foreground mt-2">
            Управление агентами и их статусами
          </p>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего агентов</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agents.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Доступны</CardTitle>
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
            <CardTitle className="text-sm font-medium">Заняты</CardTitle>
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
            <CardTitle className="text-sm font-medium">Недоступны</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {agents.filter(a => a.agentStatus === "AWAY" || a.agentStatus === "ON_LEAVE").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Список агентов */}
      {agents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Нет агентов</h3>
            <p className="text-muted-foreground">
              В вашей организации пока нет агентов поддержки
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
                      <span className="text-muted-foreground">Назначенных тикетов:</span>
                      <span className="font-medium">{agent._count.assignedTickets}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Категорий:</span>
                      <span className="font-medium">{agent._count.categoryAssignments}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">В команде с:</span>
                      <span className="font-medium">
                        {new Date(agent.createdAt).toLocaleDateString('ru-RU')}
                      </span>
                    </div>
                  </div>

                  {/* Разрешения агента */}
                  {editingPermissions === agent.id ? (
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">Разрешения агента</div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSavePermissions(agent.id)}
                          >
                            Сохранить
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCancelEditPermissions}
                          >
                            Отмена
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Создание категорий</Label>
                          <Switch
                            checked={agentPermissions.canCreateCategories}
                            onCheckedChange={(checked) => 
                              setAgentPermissions({ ...agentPermissions, canCreateCategories: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Редактирование категорий</Label>
                          <Switch
                            checked={agentPermissions.canEditCategories}
                            onCheckedChange={(checked) => 
                              setAgentPermissions({ ...agentPermissions, canEditCategories: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Удаление категорий</Label>
                          <Switch
                            checked={agentPermissions.canDeleteCategories}
                            onCheckedChange={(checked) => 
                              setAgentPermissions({ ...agentPermissions, canDeleteCategories: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Назначение агентов</Label>
                          <Switch
                            checked={agentPermissions.canAssignAgents}
                            onCheckedChange={(checked) => 
                              setAgentPermissions({ ...agentPermissions, canAssignAgents: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Сброс паролей</Label>
                          <Switch
                            checked={agentPermissions.canResetPasswords}
                            onCheckedChange={(checked) => 
                              setAgentPermissions({ ...agentPermissions, canResetPasswords: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Приглашение пользователей</Label>
                          <Switch
                            checked={agentPermissions.canInviteUsers}
                            onCheckedChange={(checked) => 
                              setAgentPermissions({ ...agentPermissions, canInviteUsers: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Удаление пользователей</Label>
                          <Switch
                            checked={agentPermissions.canDeleteUsers}
                            onCheckedChange={(checked) => 
                              setAgentPermissions({ ...agentPermissions, canDeleteUsers: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Просмотр всех тикетов</Label>
                          <Switch
                            checked={agentPermissions.canViewAllTickets}
                            onCheckedChange={(checked) => 
                              setAgentPermissions({ ...agentPermissions, canViewAllTickets: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Редактирование всех тикетов</Label>
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
                          Разрешения
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditPermissions(agent)}
                        >
                          <Settings className="mr-1 h-3 w-3" />
                          Настроить
                        </Button>
                      </div>
                      {agent.permissions && (
                        <div className="grid grid-cols-2 gap-1 text-xs">
                          {agent.permissions.canCreateCategories && (
                            <Badge variant="secondary" className="text-xs">Создание категорий</Badge>
                          )}
                          {agent.permissions.canEditCategories && (
                            <Badge variant="secondary" className="text-xs">Редактирование категорий</Badge>
                          )}
                          {agent.permissions.canDeleteCategories && (
                            <Badge variant="secondary" className="text-xs">Удаление категорий</Badge>
                          )}
                          {agent.permissions.canAssignAgents && (
                            <Badge variant="secondary" className="text-xs">Назначение агентов</Badge>
                          )}
                          {agent.permissions.canResetPasswords && (
                            <Badge variant="secondary" className="text-xs">Сброс паролей</Badge>
                          )}
                          {agent.permissions.canInviteUsers && (
                            <Badge variant="secondary" className="text-xs">Приглашение пользователей</Badge>
                          )}
                          {agent.permissions.canDeleteUsers && (
                            <Badge variant="secondary" className="text-xs">Удаление пользователей</Badge>
                          )}
                          {agent.permissions.canViewAllTickets && (
                            <Badge variant="secondary" className="text-xs">Просмотр всех тикетов</Badge>
                          )}
                          {agent.permissions.canEditAllTickets && (
                            <Badge variant="secondary" className="text-xs">Редактирование всех тикетов</Badge>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Кнопки изменения статуса */}
                  <div className="mt-4 space-y-2">
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                      Изменить статус:
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={agent.agentStatus === "AVAILABLE" ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleStatusChange(agent.id, "AVAILABLE")}
                      >
                        <UserCheck className="mr-1 h-3 w-3" />
                        Доступен
                      </Button>
                      <Button
                        variant={agent.agentStatus === "BUSY" ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleStatusChange(agent.id, "BUSY")}
                      >
                        <Clock className="mr-1 h-3 w-3" />
                        Занят
                      </Button>
                      <Button
                        variant={agent.agentStatus === "AWAY" ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleStatusChange(agent.id, "AWAY")}
                      >
                        <AlertCircle className="mr-1 h-3 w-3" />
                        Не на работе
                      </Button>
                      <Button
                        variant={agent.agentStatus === "ON_LEAVE" ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleStatusChange(agent.id, "ON_LEAVE")}
                      >
                        <UserX className="mr-1 h-3 w-3" />
                        В отпуске
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
