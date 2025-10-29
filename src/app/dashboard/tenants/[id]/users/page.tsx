"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { ArrowLeft, Plus, UserCheck, UserX, Ticket, Users } from "lucide-react";
import { formatDate, getInitials } from "@/lib/utils";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  avatar: string | null;
  isActive: boolean;
  createdAt: string;
  _count: {
    createdTickets: number;
    assignedTickets: number;
  };
}

const roleLabels: Record<string, string> = {
  ADMIN: "Global Administrator",
  TENANT_ADMIN: "Organization Administrator",
  AGENT: "Agent",
  USER: "User",
};

const roleColors: Record<string, string> = {
  ADMIN: "bg-red-100 text-red-800",
  TENANT_ADMIN: "bg-orange-100 text-orange-800",
  AGENT: "bg-blue-100 text-blue-800",
  USER: "bg-gray-100 text-gray-800",
};

export default function TenantUsersPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tenantName, setTenantName] = useState("");

  // Check that user is admin or tenant admin
  useEffect(() => {
    if (status === "loading") return; // Wait for session load
    
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "TENANT_ADMIN")) {
      router.push("/dashboard");
      return;
    }
  }, [session, status, router]);

  useEffect(() => {
    async function fetchData() {
      try {
        // Get organization data
        const tenantResponse = await fetch(`/api/tenants/${params.id}`);
        if (tenantResponse.ok) {
          const tenant = await tenantResponse.json();
          setTenantName(tenant.name);
        }

        // Get organization users
        const usersResponse = await fetch(`/api/tenants/${params.id}/users`);
        if (!usersResponse.ok) throw new Error("Failed to fetch users");
        const data = await usersResponse.json();
        setUsers(data);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (params.id) {
      fetchData();
    }
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Organization Users</h1>
            <p className="text-muted-foreground mt-2">Loading...</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
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
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Organization Users</h1>
            <p className="text-muted-foreground mt-2">
              {tenantName && `Users of "${tenantName}"`}
            </p>
          </div>
        </div>
        <Button onClick={() => router.push(`/dashboard/tenants/${params.id}/users/new`)}>
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      {users.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Users</h3>
            <p className="text-muted-foreground mb-4">
              Add the first user to the organization
            </p>
            <Button onClick={() => router.push(`/dashboard/tenants/${params.id}/users/new`)}>
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {users.map((user) => (
            <Card key={user.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user.avatar || undefined} />
                      <AvatarFallback>
                        {getInitials(user.name || user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {user.name || "No Name"}
                      </CardTitle>
                      <CardDescription>{user.email}</CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Badge className={roleColors[user.role]}>
                      {roleLabels[user.role]}
                    </Badge>
                    <Badge variant={user.isActive ? "default" : "secondary"}>
                      {user.isActive ? (
                        <>
                          <UserCheck className="mr-1 h-3 w-3" />
                          Active
                        </>
                      ) : (
                        <>
                          <UserX className="mr-1 h-3 w-3" />
                          Blocked
                        </>
                      )}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Created:</span>
                    <span>{formatDate(user.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Ticket className="h-4 w-4 text-muted-foreground" />
                      <span>Created tickets:</span>
                    </div>
                    <span className="font-medium">{user._count.createdTickets}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>Assigned to:</span>
                    </div>
                    <span className="font-medium">{user._count.assignedTickets}</span>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
