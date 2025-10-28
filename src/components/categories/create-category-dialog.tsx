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
      toast.error("Введите название категории");
      return;
    }

    setIsCreating(true);
    try {
      // Создаем категорию
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

      // Назначаем выбранных агентов на категорию
      if (selectedAgents.length > 0) {
        for (const agentId of selectedAgents) {
          await fetch(`/api/categories/${category.id}/agents`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ agentId }),
          });
        }
      }

      toast.success("Категория успешно создана!");
      setNewCategory({ name: "", description: "", color: "#3b82f6" });
      setSelectedAgents([]);
      setOpen(false);
      onCategoryCreated();
    } catch (error: any) {
      toast.error("Ошибка создания категории", { description: error.message });
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
          Создать категорию
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Создать новую категорию</DialogTitle>
          <DialogDescription>
            Добавьте новую категорию и назначьте на нее агентов
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Название категории *</Label>
            <Input
              id="name"
              placeholder="Например: Техническая поддержка"
              value={newCategory.name}
              onChange={(e) =>
                setNewCategory({ ...newCategory, name: e.target.value })
              }
              disabled={isCreating}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              placeholder="Описание категории"
              value={newCategory.description}
              onChange={(e) =>
                setNewCategory({ ...newCategory, description: e.target.value })
              }
              disabled={isCreating}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="color">Цвет</Label>
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
            <Label>Назначить агентов</Label>
            <Select onValueChange={handleAddAgent} disabled={isCreating} value="">
              <SelectTrigger>
                <SelectValue placeholder="Выберите агента" />
              </SelectTrigger>
              <SelectContent>
                {agents.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    Нет доступных агентов
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
              Тикеты этой категории будут автоматически назначаться выбранным агентам
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isCreating}
          >
            Отмена
          </Button>
          <Button onClick={handleCreateCategory} disabled={isCreating || !newCategory.name}>
            {isCreating ? "Создание..." : "Создать"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

