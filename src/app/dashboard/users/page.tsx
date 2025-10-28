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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Users as UsersIcon, 
  UserPlus, 
  Mail, 
  Shield, 
  Trash2,
  KeyRound,
  Search,
  Edit
} from "lucide-react";
import { toast } from "sonner";
import { getInitials } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { EditUserDialog } from "@/components/users/edit-user-dialog";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: "ADMIN" | "TENANT_ADMIN" | "AGENT" | "USER";
  avatar: string | null;
  isActive: boolean;
  createdAt: string;
  _count: {
    createdTickets: number;
    assignedTickets: number;
  };
}

const roleLabels = {
  ADMIN: "Глобальный админ",
  TENANT_ADMIN: "Админ организации",
  AGENT: "Агент",
  USER: "Пользователь",
};

const roleColors = {
  ADMIN: "bg-purple-100 text-purple-800",
  TENANT_ADMIN: "bg-blue-100 text-blue-800",
  AGENT: "bg-green-100 text-green-800",
  USER: "bg-gray-100 text-gray-800",
};

export default function UsersPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const permissions = usePermissions();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/login");
      return;
    }

    // Только админы, tenant админы и агенты с правами могут видеть пользователей
    if (
      session.user.role !== "ADMIN" && 
      session.user.role !== "TENANT_ADMIN" && 
      !permissions.canInviteUsers &&
      !permissions.canResetPasswords &&
      !permissions.canDeleteUsers
    ) {
      router.push("/dashboard");
      return;
    }
  }, [session, status, router, permissions]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/users");
      if (!response.ok) throw new Error("Failed to fetch users");
      const data = await response.json();
      setUsers(data);
      setFilteredUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Ошибка загрузки пользователей");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchUsers();
    }
  }, [session]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = users.filter(
        (user) =>
          user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchQuery, users]);

  const handleResetPassword = async (userId: string, userName: string) => {
    if (!permissions.canResetPasswords) {
      toast.error("У вас нет прав на сброс паролей");
      return;
    }

    if (!confirm(`Сбросить пароль для ${userName}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}/reset-password`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to reset password");
      }

      const { temporaryPassword } = await response.json();
      
      // Копируем пароль в буфер обмена
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(temporaryPassword);
        toast.success(`Пароль сброшен! Новый пароль скопирован в буфер обмена: ${temporaryPassword}`);
      } else {
        toast.success(`Пароль сброшен! Новый пароль: ${temporaryPassword}`);
      }
    } catch (error: any) {
      toast.error("Ошибка сброса пароля", { description: error.message });
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!permissions.canDeleteUsers) {
      toast.error("У вас нет прав на удаление пользователей");
      return;
    }

    if (!confirm(`Вы уверены, что хотите удалить пользователя "${userName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete user");
      }

      setUsers(users.filter((u) => u.id !== userId));
      toast.success("Пользователь успешно удален!");
    } catch (error: any) {
      toast.error("Ошибка удаления пользователя", { description: error.message });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Пользователи</h1>
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
          <h1 className="text-3xl font-bold">Пользователи</h1>
          <p className="text-muted-foreground mt-2">
            Управление пользователями вашей организации
          </p>
        </div>
        {permissions.canInviteUsers && (
          <Button onClick={() => router.push(`/dashboard/tenants/${session?.user.tenantId}/users/new`)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Добавить пользователя
          </Button>
        )}
      </div>

      {/* Поиск */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Поиск пользователей
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Поиск по имени или email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Список пользователей */}
      {filteredUsers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UsersIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {searchQuery ? "Пользователи не найдены" : "Нет пользователей"}
            </h3>
            <p className="text-muted-foreground">
              {searchQuery
                ? "Попробуйте изменить поисковый запрос"
                : "В вашей организации пока нет пользователей."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.map((user) => (
            <Card key={user.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={user.avatar || undefined} />
                    <AvatarFallback>
                      {getInitials(user.name || user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{user.name || user.email}</CardTitle>
                    <CardDescription>{user.email}</CardDescription>
                  </div>
                </div>
                <Badge className={roleColors[user.role]}>
                  {roleLabels[user.role]}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Создал тикетов:</span>
                  <Badge variant="outline">{user._count.createdTickets}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Назначено тикетов:</span>
                  <Badge variant="outline">{user._count.assignedTickets}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Статус:</span>
                  <Badge variant={user.isActive ? "default" : "destructive"}>
                    {user.isActive ? "Активен" : "Неактивен"}
                  </Badge>
                </div>

                {/* Кнопки управления */}
                <div className="flex gap-2 pt-2">
                  {(session?.user.role === "ADMIN" || session?.user.role === "TENANT_ADMIN") && (
                    <EditUserDialog user={user} onUserUpdated={fetchUsers}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        <Edit className="mr-1 h-3 w-3" />
                        Редактировать
                      </Button>
                    </EditUserDialog>
                  )}
                  {permissions.canResetPasswords && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleResetPassword(user.id, user.name || user.email)}
                    >
                      <KeyRound className="mr-1 h-3 w-3" />
                      Сбросить пароль
                    </Button>
                  )}
                  {permissions.canDeleteUsers && user.id !== session?.user.id && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteUser(user.id, user.name || user.email)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

