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
import { Plus, Building2, Users, Ticket, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  createdAt: string;
  group: {
    id: string;
    name: string;
  } | null;
  _count: {
    users: number;
    tickets: number;
  };
}

export default function TenantsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is admin or tenant admin
  useEffect(() => {
    if (status === "loading") return; // Wait for session to load
    
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "TENANT_ADMIN")) {
      router.push("/dashboard");
      return;
    }
  }, [session, status, router]);

  useEffect(() => {
    async function fetchTenants() {
      // Don't load data if user is not admin or tenant admin
      if (!session || (session.user.role !== "ADMIN" && session.user.role !== "TENANT_ADMIN")) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/tenants");
        if (!response.ok) throw new Error("Failed to fetch tenants");
        const data = await response.json();
        setTenants(data);
      } catch (error) {
        console.error("Error fetching tenants:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTenants();
  }, [session]);

  const handleDeleteTenant = async (tenantId: string, tenantName: string) => {
    if (!confirm(`Are you sure you want to delete the organization "${tenantName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/tenants/${tenantId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete tenant");
      }

      // Update organizations list
      setTenants(tenants.filter(tenant => tenant.id !== tenantId));
      toast.success("Organization successfully deleted!");
    } catch (err: any) {
      toast.error("Error deleting organization", { description: err.message });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Organizations</h1>
            <p className="text-muted-foreground mt-2">
              Manage organizations and their data
            </p>
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
        <div>
          <h1 className="text-3xl font-bold">Organizations</h1>
          <p className="text-muted-foreground mt-2">
            Manage organizations and their data
          </p>
        </div>
        {session?.user.role === "ADMIN" && (
          <Button onClick={() => router.push('/dashboard/tenants/create-with-admin')}>
            <Plus className="mr-2 h-4 w-4" />
            Create Organization
          </Button>
        )}
      </div>

      {tenants.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No organizations</h3>
            <p className="text-muted-foreground mb-4">
              Create your first organization to get started
            </p>
            {session?.user.role === "ADMIN" && (
              <Button onClick={() => router.push('/dashboard/tenants/create-with-admin')}>
                <Plus className="mr-2 h-4 w-4" />
                Create Organization
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tenants.map((tenant) => (
            <Card key={tenant.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-xl">{tenant.name}</CardTitle>
                      {tenant.group && (
                        <Badge variant="secondary" className="text-xs">
                          {tenant.group.name}
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="mb-2">
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {tenant.slug}
                      </code>
                    </CardDescription>
                    {tenant.domain && (
                      <p className="text-sm text-muted-foreground">
                        {tenant.domain}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline">
                    {formatDate(tenant.createdAt)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{tenant._count.users} users</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Ticket className="h-4 w-4 text-muted-foreground" />
                      <span>{tenant._count.tickets} tickets</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => router.push(`/dashboard/tenants/${tenant.id}/edit`)}
                  >
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => router.push(`/dashboard/tenants/${tenant.id}/users`)}
                  >
                    Users
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleDeleteTenant(tenant.id, tenant.name)}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Delete
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
