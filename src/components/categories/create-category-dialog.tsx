"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface Agent {
  id: string;
  name: string | null;
  email: string;
  agentStatus: string;
}

interface CreateCategoryDialogProps {
  onCategoryCreated: () => void;
}

export function CreateCategoryDialog({ onCategoryCreated }: CreateCategoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState({
    name: "",
    description: "",
    color: "#3b82f6",
  });

  useEffect(() => {
    if (open) {
      fetchAgents();
    }
  }, [open]);

  const fetchAgents = async () => {
    try {
      const response = await fetch("/api/agents");
      if (response.ok) {
        const data = await response.json();
        setAgents(data);
      }
    } catch (error) {
      console.error("Error fetching agents:", error);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategory.name.trim()) {
      toast.error("Enter category name");
      return;
    }

    setIsCreating(true);
    try {
      // Create category
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCategory),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create category");
      }

      const category = await response.json();

      // Assign selected agents to category
      if (selectedAgents.length > 0) {
        for (const agentId of selectedAgents) {
          await fetch(`/api/categories/${category.id}/agents`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ agentId }),
          });
        }
      }

      toast.success("Category created successfully!");
      setNewCategory({ name: "", description: "", color: "#3b82f6" });
      setSelectedAgents([]);
      setOpen(false);
      onCategoryCreated();
    } catch (error: any) {
      toast.error("Error creating category", { description: error.message });
    } finally {
      setIsCreating(false);
    }
  };

  const handleAddAgent = (agentId: string) => {
    if (!selectedAgents.includes(agentId)) {
      setSelectedAgents([...selectedAgents, agentId]);
    }
  };

  const handleRemoveAgent = (agentId: string) => {
    setSelectedAgents(selectedAgents.filter((id) => id !== agentId));
  };

  const getAgentById = (id: string) => agents.find((a) => a.id === id);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Category
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Create New Category</DialogTitle>
          <DialogDescription>
            Add a new category and assign agents to it
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Category Name *</Label>
            <Input
              id="name"
              placeholder="e.g. Technical Support"
              value={newCategory.name}
              onChange={(e) =>
                setNewCategory({ ...newCategory, name: e.target.value })
              }
              disabled={isCreating}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Category description"
              value={newCategory.description}
              onChange={(e) =>
                setNewCategory({ ...newCategory, description: e.target.value })
              }
              disabled={isCreating}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="color">Color</Label>
            <div className="flex items-center gap-2">
              <Input
                id="color"
                type="color"
                value={newCategory.color}
                onChange={(e) =>
                  setNewCategory({ ...newCategory, color: e.target.value })
                }
                disabled={isCreating}
                className="w-16 h-10"
              />
              <Input
                value={newCategory.color}
                onChange={(e) =>
                  setNewCategory({ ...newCategory, color: e.target.value })
                }
                disabled={isCreating}
                placeholder="#3b82f6"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Assign Agents</Label>
            <Select onValueChange={handleAddAgent} disabled={isCreating} value="">
              <SelectTrigger>
                <SelectValue placeholder="Select agent" />
              </SelectTrigger>
              <SelectContent>
                {agents.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No available agents
                  </div>
                ) : (
                  agents
                    .filter((agent) => agent.id && !selectedAgents.includes(agent.id))
                    .map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name || agent.email}
                      </SelectItem>
                    ))
                )}
              </SelectContent>
            </Select>
            {selectedAgents.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedAgents.map((agentId) => {
                  const agent = getAgentById(agentId);
                  return agent ? (
                    <Badge key={agentId} variant="secondary" className="pr-1">
                      {agent.name || agent.email}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-2"
                        onClick={() => handleRemoveAgent(agentId)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ) : null;
                })}
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Tickets in this category will be automatically assigned to selected agents
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button onClick={handleCreateCategory} disabled={isCreating || !newCategory.name}>
            {isCreating ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

