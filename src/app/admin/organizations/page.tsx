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

export default function AdminOrganizationsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Check that user is global admin
  useEffect(() => {
    if (status === "loading") return;
    
    if (!session || session.user.role !== "ADMIN" || session.user.tenantId) {
      router.push("/dashboard");
      return;
    }
  }, [session, status, router]);

  useEffect(() => {
    async function fetchTenants() {
      if (!session || session.user.role !== "ADMIN" || session.user.tenantId) {
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
        toast.error("Failed to load organizations");
      } finally {
        setIsLoading(false);
      }
    }

    fetchTenants();
  }, [session]);

  const handleDeleteTenant = async (tenantId: string, tenantName: string) => {
    if (!confirm(`Are you sure you want to delete the organization "${tenantName}"? This action is irreversible!`)) {
      return;
    }

    try {
      const response = await fetch(`/api/tenants/${tenantId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ confirmation: "DELETE" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete tenant");
      }

      toast.success("Organization successfully deleted!");
      setTenants(tenants.filter((t) => t.id !== tenantId));
    } catch (error: any) {
      console.error("Error deleting tenant:", error);
      toast.error(error.message || "Failed to delete organization");
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6 px-3 sm:px-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Organizations</h1>
            <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
              Manage all platform organizations
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-40 sm:h-32" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-3 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Organizations</h1>
          <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
            Manage all platform organizations
          </p>
        </div>
      </div>

      {tenants.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-4" />
            <h3 className="text-base sm:text-lg font-semibold mb-2">No Organizations</h3>
            <p className="text-muted-foreground mb-4 text-sm sm:text-base">
              No organizations have been registered in the system yet
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tenants.map((tenant) => (
            <Card key={tenant.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3 sm:pb-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-0">
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                      <CardTitle className="text-lg sm:text-xl">{tenant.name}</CardTitle>
                      {tenant.group && (
                        <Badge variant="secondary" className="text-xs w-fit">
                          {tenant.group.name}
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="mb-2 text-sm">
                      <code className="text-xs sm:text-sm bg-muted px-2 py-1 rounded">
                        {tenant.slug}
                      </code>
                    </CardDescription>
                    {tenant.domain && (
                      <p className="text-xs sm:text-sm text-muted-foreground break-all">
                        {tenant.domain}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs sm:text-sm w-fit">
                    {formatDate(tenant.createdAt)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0 sm:pt-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between text-xs sm:text-sm mb-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                      <span>{tenant._count.users} users</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Ticket className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                      <span>{tenant._count.tickets} tickets</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full sm:flex-1 text-sm sm:text-base"
                    onClick={() => router.push(`/dashboard/tenants/${tenant.id}/edit`)}
                  >
                    Edit
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="w-full sm:w-auto"
                    onClick={() => handleDeleteTenant(tenant.id, tenant.name)}
                  >
                    <Trash2 className="h-3 w-3 sm:mr-2" />
                    <span className="hidden sm:inline">Delete</span>
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

