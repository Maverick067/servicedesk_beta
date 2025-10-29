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
  ADMIN: "Global Admin",
  TENANT_ADMIN: "Organization Admin",
  AGENT: "Agent",
  USER: "User",
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

    // Only admins, tenant admins and agents with permissions can see users
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
      toast.error("Error loading users");
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
      toast.error("You don't have permission to reset passwords");
      return;
    }

    if (!confirm(`Reset password for ${userName}?`)) {
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
      
      // Copy password to clipboard
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(temporaryPassword);
        toast.success(`Password reset! New password copied to clipboard: ${temporaryPassword}`);
      } else {
        toast.success(`Password reset! New password: ${temporaryPassword}`);
      }
    } catch (error: any) {
      toast.error("Error resetting password", { description: error.message });
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!permissions.canDeleteUsers) {
      toast.error("You don't have permission to delete users");
      return;
    }

    if (!confirm(`Are you sure you want to delete user "${userName}"?`)) {
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
      toast.success("User successfully deleted!");
    } catch (error: any) {
      toast.error("Error deleting user", { description: error.message });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Users</h1>
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
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground mt-2">
            Manage users in your organization
          </p>
        </div>
        {permissions.canInviteUsers && (
          <Button onClick={() => router.push(`/dashboard/tenants/${session?.user.tenantId}/users/new`)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        )}
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Users list */}
      {filteredUsers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UsersIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {searchQuery ? "No Users Found" : "No Users"}
            </h3>
            <p className="text-muted-foreground">
              {searchQuery
                ? "Try modifying your search query"
                : "Your organization has no users yet."}
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
                  <span>Created tickets:</span>
                  <Badge variant="outline">{user._count.createdTickets}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Assigned tickets:</span>
                  <Badge variant="outline">{user._count.assignedTickets}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Status:</span>
                  <Badge variant={user.isActive ? "default" : "destructive"}>
                    {user.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>

                {/* Management buttons */}
                <div className="flex gap-2 pt-2">
                  {(session?.user.role === "ADMIN" || session?.user.role === "TENANT_ADMIN") && (
                    <EditUserDialog user={user} onUserUpdated={fetchUsers}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        <Edit className="mr-1 h-3 w-3" />
                        Edit
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
                      Reset Password
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

