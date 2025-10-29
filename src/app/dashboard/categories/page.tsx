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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, FolderKanban, Edit, Trash2, Ticket, Users, Save, X } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import { CreateCategoryDialog } from "@/components/categories/create-category-dialog";

interface Category {
  id: string;
  name: string;
  description: string | null;
  color: string;
  createdAt: string;
  _count: {
    tickets: number;
  };
  agentAssignments?: {
    id: string;
    agent: {
      id: string;
      name: string | null;
      email: string;
    };
  }[];
}

interface Agent {
  id: string;
  name: string | null;
  email: string;
  agentStatus: string;
}

export default function CategoriesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const permissions = usePermissions();
  const [categories, setCategories] = useState<Category[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState({
    name: "",
    description: "",
    color: "#3b82f6",
  });

  // Check that user is admin, tenant admin or agent
  useEffect(() => {
    if (status === "loading") return;
    
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "TENANT_ADMIN" && session.user.role !== "AGENT")) {
      router.push("/dashboard");
      return;
    }
  }, [session, status, router]);

  const fetchData = async () => {
    try {
      // Load categories
      const categoriesResponse = await fetch("/api/categories");
      if (!categoriesResponse.ok) throw new Error("Failed to fetch categories");
      const categoriesData = await categoriesResponse.json();
      setCategories(categoriesData);

      // Load agents (only for admins and tenant admins)
      if (permissions.canAssignAgents) {
        const agentsResponse = await fetch("/api/agents");
        if (agentsResponse.ok) {
          const agentsData = await agentsResponse.json();
          setAgents(agentsData);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error loading data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session, permissions.canAssignAgents]);

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category.id);
    setEditCategory({
      name: category.name,
      description: category.description || "",
      color: category.color,
    });
  };

  const handleSaveEdit = async (categoryId: string) => {
    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editCategory),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update category");
      }

      const updatedCategory = await response.json();
      setCategories(categories.map(cat => 
        cat.id === categoryId ? { ...cat, ...updatedCategory } : cat
      ));
      setEditingCategory(null);
      toast.success("Category successfully updated!");
    } catch (error: any) {
      toast.error("Error updating category", { description: error.message });
    }
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setEditCategory({ name: "", description: "", color: "#3b82f6" });
  };

  const handleAssignAgent = async (categoryId: string, agentId: string) => {
    try {
      const response = await fetch(`/api/categories/${categoryId}/agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to assign agent");
      }

      // Update categories list
      const updatedResponse = await fetch("/api/categories");
      if (updatedResponse.ok) {
        const updatedCategories = await updatedResponse.json();
        setCategories(updatedCategories);
      }
      
      toast.success("Agent successfully assigned!");
    } catch (error: any) {
      toast.error("Error assigning agent", { description: error.message });
    }
  };

  const handleUnassignAgent = async (categoryId: string, agentId: string) => {
    try {
      const response = await fetch(`/api/categories/${categoryId}/agents`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to unassign agent");
      }

      // Update categories list
      const updatedResponse = await fetch("/api/categories");
      if (updatedResponse.ok) {
        const updatedCategories = await updatedResponse.json();
        setCategories(updatedCategories);
      }
      
      toast.success("Agent successfully unassigned!");
    } catch (error: any) {
      toast.error("Error unassigning agent", { description: error.message });
    }
  };

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    if (!confirm(`Are you sure you want to delete category "${categoryName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete category");
      }

      setCategories(categories.filter(cat => cat.id !== categoryId));
      toast.success("Category successfully deleted!");
    } catch (error: any) {
      toast.error("Error deleting category", { description: error.message });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Categories</h1>
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
          <h1 className="text-3xl font-bold">Categories</h1>
          <p className="text-muted-foreground mt-2">
            Manage ticket categories
          </p>
        </div>
        {/* Create category button - for users with permissions */}
        {permissions.canCreateCategories && (
          <CreateCategoryDialog onCategoryCreated={() => fetchData()} />
        )}
      </div>

      {/* Categories list */}
      {categories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderKanban className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Categories</h3>
            <p className="text-muted-foreground">
              Create the first category for tickets
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Card key={category.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <div className="flex-1">
                      {editingCategory === category.id ? (
                        <div className="space-y-2">
                          <Input
                            value={editCategory.name}
                            onChange={(e) => setEditCategory({ ...editCategory, name: e.target.value })}
                            className="text-lg font-semibold"
                          />
                          <Textarea
                            value={editCategory.description}
                            onChange={(e) => setEditCategory({ ...editCategory, description: e.target.value })}
                            placeholder="Category description"
                            rows={2}
                          />
                          <div className="flex items-center gap-2">
                            <Input
                              type="color"
                              value={editCategory.color}
                              onChange={(e) => setEditCategory({ ...editCategory, color: e.target.value })}
                              className="w-8 h-8"
                            />
                            <Input
                              value={editCategory.color}
                              onChange={(e) => setEditCategory({ ...editCategory, color: e.target.value })}
                              className="flex-1"
                            />
                          </div>
                        </div>
                      ) : (
                        <div>
                          <CardTitle className="text-lg">{category.name}</CardTitle>
                          {category.description && (
                            <CardDescription className="mt-1">
                              {category.description}
                            </CardDescription>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline">
                    {category._count.tickets} tickets
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                  <span>Created:</span>
                  <span>{new Date(category.createdAt).toLocaleDateString('en-US')}</span>
                </div>

                {/* Assigned agents */}
                {category.agentAssignments && category.agentAssignments.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Assigned Agents:</span>
                    </div>
                    <div className="space-y-1">
                      {category.agentAssignments.map((assignment) => (
                        <div key={assignment.id} className="flex items-center justify-between text-sm">
                          <span>{assignment.agent.name || assignment.agent.email}</span>
                          {permissions.canAssignAgents && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUnassignAgent(category.id, assignment.agent.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Available agents for assignment */}
                {permissions.canAssignAgents && agents.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Available Agents:</span>
                    </div>
                    <div className="space-y-1">
                      {agents
                        .filter(agent => !category.agentAssignments?.some(a => a.agent.id === agent.id))
                        .map((agent) => (
                          <div key={agent.id} className="flex items-center justify-between text-sm">
                            <span>{agent.name || agent.email}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAssignAgent(category.id, agent.id)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Management buttons - for users with permissions */}
                {(permissions.canEditCategories || permissions.canDeleteCategories) && (
                  <div className="flex gap-2">
                    {editingCategory === category.id ? (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => handleSaveEdit(category.id)}
                        >
                          <Save className="mr-1 h-3 w-3" />
                          Save
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={handleCancelEdit}
                        >
                          <X className="mr-1 h-3 w-3" />
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        {permissions.canEditCategories && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => handleEditCategory(category)}
                          >
                            <Edit className="mr-1 h-3 w-3" />
                            Edit
                          </Button>
                        )}
                        {permissions.canDeleteCategories && (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleDeleteCategory(category.id, category.name)}
                          >
                            <Trash2 className="mr-1 h-3 w-3" />
                            Delete
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
