"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Building2, Users } from "lucide-react";
import { toast } from "sonner";

interface TenantGroup {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  tenants: Array<{
    id: string;
    name: string;
    slug: string;
    createdAt: string;
  }>;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  group: {
    id: string;
    name: string;
  } | null;
}

export default function TenantGroupsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [groups, setGroups] = useState<TenantGroup[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<TenantGroup | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [selectedTenants, setSelectedTenants] = useState<string[]>([]);

  useEffect(() => {
    if (session?.user.role === "ADMIN") {
      fetchData();
    }
  }, [session]);

  const fetchData = async () => {
    try {
      const [groupsRes, tenantsRes] = await Promise.all([
        fetch("/api/tenant-groups"),
        fetch("/api/tenants"),
      ]);

      if (groupsRes.ok) {
        const groupsData = await groupsRes.json();
        console.log("Groups data:", groupsData);
        setGroups(groupsData);
      } else {
        console.error("Failed to fetch groups:", groupsRes.status, await groupsRes.text());
      }

      if (tenantsRes.ok) {
        const tenantsData = await tenantsRes.json();
        console.log("Tenants data:", tenantsData);
        // Transform data to get only necessary fields
        const formattedTenants = tenantsData.map((t: any) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          group: t.group,
        }));
        setTenants(formattedTenants);
      } else {
        console.error("Failed to fetch tenants:", tenantsRes.status, await tenantsRes.text());
        toast.error("Failed to load organizations");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    try {
      console.log("Creating group with data:", formData);
      
      const response = await fetch("/api/tenant-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to create group:", response.status, errorText);
        throw new Error(errorText || "Failed to create group");
      }

      const createdGroup = await response.json();
      console.log("Created group:", createdGroup);

      toast.success("Group Created!");
      setDialogOpen(false);
      setFormData({ name: "", description: "" });
      setSelectedTenants([]);
      fetchData();
    } catch (error: any) {
      console.error("Error creating group:", error);
      toast.error(error.message || "Failed to create group");
    }
  };

  const handleUpdateGroup = async (group: TenantGroup) => {
    try {
      const response = await fetch(`/api/tenant-groups/${group.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          tenantIds: selectedTenants,
        }),
      });

      if (!response.ok) throw new Error("Failed to update group");

      toast.success("Group Updated!");
      setDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error("Failed to update group");
    }
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroup) return;

    try {
      const response = await fetch(`/api/tenant-groups/${selectedGroup.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete group");

      toast.success("Group Deleted!");
      setDeleteDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error("Failed to delete group");
    }
  };

  const handleEditGroup = (group: TenantGroup) => {
    setSelectedGroup(group);
    setFormData({
      name: group.name,
      description: group.description || "",
    });
    setSelectedTenants(group.tenants.map((t) => t.id));
    setDialogOpen(true);
  };

  const handleCreateNew = () => {
    setSelectedGroup(null);
    setFormData({ name: "", description: "" });
    setSelectedTenants([]);
    setDialogOpen(true);
  };

  if (!session?.user || session.user.role !== "ADMIN") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">
              Access Denied
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold">Organization Groups</h1>
          <p className="text-muted-foreground mt-2">
            Group multiple organizations for joint management
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleCreateNew}>
              <Plus className="mr-2 h-4 w-4" />
              Create Group
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {selectedGroup ? "Edit Group" : "Create Group"}
              </DialogTitle>
              <DialogDescription>
                {selectedGroup
                  ? "Update group information and tenant composition"
                  : "Create a new group to unite organizations"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., IT Team Company X"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Group description (optional)"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Tenants in Group</Label>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {tenants.map((tenant) => (
                    <div
                      key={tenant.id}
                      className="flex items-center space-x-2 p-2 border rounded-md"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTenants.includes(tenant.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTenants([...selectedTenants, tenant.id]);
                          } else {
                            setSelectedTenants(
                              selectedTenants.filter((id) => id !== tenant.id)
                            );
                          }
                        }}
                      />
                      <span className="flex-1">{tenant.name}</span>
                      {tenant.group && tenant.group.id !== selectedGroup?.id && (
                        <Badge variant="outline">{tenant.group.name}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() =>
                  selectedGroup ? handleUpdateGroup(selectedGroup) : handleCreateGroup()
                }
              >
                {selectedGroup ? "Save" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-48" />
            </Card>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Groups</h3>
            <p className="text-muted-foreground mb-4">
              Create the first group to unite organizations
            </p>
            <Button onClick={handleCreateNew}>
              <Plus className="mr-2 h-4 w-4" />
              Create Group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{group.name}</CardTitle>
                      {group.description && (
                        <CardDescription className="mt-1">
                          {group.description}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditGroup(group)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedGroup(group);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{group.tenants.length} organizations</span>
                    </div>
                    {group.tenants.length > 0 && (
                      <div className="space-y-1">
                        {group.tenants.slice(0, 3).map((tenant) => (
                          <div
                            key={tenant.id}
                            className="text-sm p-2 bg-muted rounded"
                          >
                            {tenant.name}
                          </div>
                        ))}
                        {group.tenants.length > 3 && (
                          <p className="text-xs text-muted-foreground">
                            +{group.tenants.length - 3} more
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the group "{selectedGroup?.name}"?
              Organizations will not be deleted, they will just be removed from the group.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGroup}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

