"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ModulesSettings } from "@/components/settings/modules-settings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Building2, Loader2, Users, Ticket, AlertTriangle, Save } from "lucide-react";
import { toast } from "sonner";

interface TenantData {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  customDomain: string | null;
  customDomainVerified: boolean;
  settings: {
    ticketPrefix?: string;
  };
  createdAt: string;
  updatedAt: string;
  stats: {
    totalUsers: number;
    totalAgents: number;
    totalTickets: number;
    openTickets: number;
    categories: number;
    queues: number;
    customFields: number;
  };
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tenantData, setTenantData] = useState<TenantData | null>(null);
  const [isLoadingTenant, setIsLoadingTenant] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [organizationName, setOrganizationName] = useState("");
  const [ticketPrefix, setTicketPrefix] = useState("");
  
  // Redirect global ADMIN to tenant management page
  // IMPORTANT: useEffect must be BEFORE any conditional returns!
  useEffect(() => {
    if (session?.user.role === "ADMIN" && !session?.user.tenantId) {
      router.replace("/dashboard/tenants");
    }
  }, [session, router]);

  // Load organization data
  useEffect(() => {
    if (session?.user.tenantId) {
      fetchTenantData();
    }
  }, [session?.user.tenantId]);

  const fetchTenantData = async () => {
    if (!session?.user.tenantId) return;
    
    setIsLoadingTenant(true);
    try {
      const response = await fetch(`/api/tenants/${session.user.tenantId}`);
      if (!response.ok) throw new Error("Failed to fetch tenant data");
      
      const data = await response.json();
      setTenantData(data);
      setOrganizationName(data.name);
      setTicketPrefix(data.settings?.ticketPrefix || "TICKET");
    } catch (error) {
      console.error("Error fetching tenant data:", error);
      toast.error("Failed to load organization data");
    } finally {
      setIsLoadingTenant(false);
    }
  };

  const handleSaveOrganization = async () => {
    if (!session?.user.tenantId) return;
    
    setIsSaving(true);
    try {
      const response = await fetch(`/api/tenants/${session.user.tenantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: organizationName,
          settings: {
            ticketPrefix: ticketPrefix,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update organization");
      }

      toast.success("Organization settings updated!");
      fetchTenantData(); // Reload data
    } catch (error: any) {
      console.error("Error updating organization:", error);
      toast.error(error.message || "Failed to update settings");
    } finally {
      setIsSaving(false);
    }
  };
  
  // If still loading, show loading state
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If this is a global ADMIN, show stub while redirect happens
  if (session?.user.role === "ADMIN" && !session?.user.tenantId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Manage Organizations
            </CardTitle>
            <CardDescription>
              As a global administrator, you manage all organizations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push("/dashboard/tenants")}
              className="w-full"
            >
              Go to Organization Management
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const canManageModules = session?.user.role === "TENANT_ADMIN" || (session?.user.role === "ADMIN" && session?.user.tenantId);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent">
          Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage your organization and profile
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Tabs defaultValue="modules" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="modules">Modules</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="organization">Organization</TabsTrigger>
          </TabsList>

          <TabsContent value="modules">
            {canManageModules ? (
              <ModulesSettings />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>No Access</CardTitle>
                  <CardDescription>
                    Only organization administrators can manage modules
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>
                  Manage your personal information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">Name</p>
                    <p className="text-sm text-muted-foreground">{session?.user.name || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{session?.user.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Role</p>
                    <p className="text-sm text-muted-foreground">{session?.user.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="organization">
            {isLoadingTenant ? (
              <Card>
                <CardContent className="py-12">
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                </CardContent>
              </Card>
            ) : tenantData ? (
              <div className="space-y-6">
                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                    <CardDescription>
                      Your organization settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="orgName">Organization Name</Label>
                      <Input
                        id="orgName"
                        value={organizationName}
                        onChange={(e) => setOrganizationName(e.target.value)}
                        placeholder="Organization Name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="slug">Unique Slug</Label>
                      <Input
                        id="slug"
                        value={tenantData.slug}
                        disabled
                        className="bg-gray-50"
                      />
                      <p className="text-xs text-muted-foreground">
                        Slug cannot be changed after creation
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ticketPrefix">Ticket Prefix</Label>
                      <Input
                        id="ticketPrefix"
                        value={ticketPrefix}
                        onChange={(e) => setTicketPrefix(e.target.value.toUpperCase())}
                        placeholder="TICKET"
                      />
                      <p className="text-xs text-muted-foreground">
                        Prefix for ticket numbers (e.g., {ticketPrefix || "TICKET"}-1234)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Creation Date</Label>
                      <p className="text-sm text-muted-foreground">
                        {new Date(tenantData.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>

                    <Button onClick={handleSaveOrganization} disabled={isSaving}>
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Statistics */}
                <Card>
                  <CardHeader>
                    <CardTitle>Organization Statistics</CardTitle>
                    <CardDescription>
                      General information about your organization
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      <div className="flex items-center gap-3 p-4 border rounded-lg">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Users</p>
                          <p className="text-2xl font-bold">{tenantData.stats.totalUsers}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-4 border rounded-lg">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <Users className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Agents</p>
                          <p className="text-2xl font-bold">{tenantData.stats.totalAgents}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-4 border rounded-lg">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Ticket className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total Tickets</p>
                          <p className="text-2xl font-bold">{tenantData.stats.totalTickets}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-4 border rounded-lg">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                          <Ticket className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Open Tickets</p>
                          <p className="text-2xl font-bold">{tenantData.stats.openTickets}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-4 border rounded-lg">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                          <Building2 className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Categories</p>
                          <p className="text-2xl font-bold">{tenantData.stats.categories}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-4 border rounded-lg">
                        <div className="p-2 bg-pink-100 rounded-lg">
                          <Building2 className="h-5 w-5 text-pink-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Queues</p>
                          <p className="text-2xl font-bold">{tenantData.stats.queues}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Danger Zone (only for TENANT_ADMIN) */}
                {session?.user.role === "TENANT_ADMIN" && (
                  <Card className="border-red-200 bg-red-50/50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-red-600">
                        <AlertTriangle className="h-5 w-5" />
                        Danger Zone
                      </CardTitle>
                      <CardDescription>
                        Irreversible actions for the organization
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        To delete the organization, contact the global platform administrator through the "Support" section.
                      </p>
                      <Button
                        variant="outline"
                        className="border-red-200 text-red-600 hover:bg-red-100"
                        onClick={() => router.push("/dashboard/support")}
                      >
                        Contact Support
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    Failed to load organization data
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
