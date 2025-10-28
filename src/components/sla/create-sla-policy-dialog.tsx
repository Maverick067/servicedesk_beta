"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Category {
  id: string;
  name: string;
}

interface Queue {
  id: string;
  name: string;
}

interface CreateSlaPolicyDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateSlaPolicyDialog({ open, onClose, onSuccess }: CreateSlaPolicyDialogProps) {
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isActive: true,
    responseTime: "",
    resolutionTime: "",
    priorities: [] as string[],
    categoryIds: [] as string[],
    queueIds: [] as string[],
    businessHoursOnly: false,
    businessHoursStart: "09:00",
    businessHoursEnd: "18:00",
    businessDays: [1, 2, 3, 4, 5], // Пн-Пт
  });

  useEffect(() => {
    if (open) {
      // Fetch categories
      fetch("/api/categories")
        .then((res) => res.json())
        .then(setCategories)
        .catch(console.error);

      // Fetch queues
      fetch("/api/queues")
        .then((res) => res.json())
        .then(setQueues)
        .catch(console.error);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        responseTime: formData.responseTime ? parseInt(formData.responseTime) : null,
        resolutionTime: parseInt(formData.resolutionTime),
      };

      const res = await fetch("/api/sla-policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create SLA policy");
      }

      toast.success("SLA политика создана");
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error creating SLA policy:", error);
      toast.error(error.message || "Ошибка при создании SLA политики");
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePriority = (priority: string) => {
    setFormData((prev) => ({
      ...prev,
      priorities: prev.priorities.includes(priority)
        ? prev.priorities.filter((p) => p !== priority)
        : [...prev.priorities, priority],
    }));
  };

  const toggleCategory = (categoryId: string) => {
    setFormData((prev) => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(categoryId)
        ? prev.categoryIds.filter((id) => id !== categoryId)
        : [...prev.categoryIds, categoryId],
    }));
  };

  const toggleQueue = (queueId: string) => {
    setFormData((prev) => ({
      ...prev,
      queueIds: prev.queueIds.includes(queueId)
        ? prev.queueIds.filter((id) => id !== queueId)
        : [...prev.queueIds, queueId],
    }));
  };

  const toggleBusinessDay = (day: number) => {
    setFormData((prev) => ({
      ...prev,
      businessDays: prev.businessDays.includes(day)
        ? prev.businessDays.filter((d) => d !== day)
        : [...prev.businessDays, day].sort(),
    }));
  };

  const weekDays = [
    { value: 1, label: "Пн" },
    { value: 2, label: "Вт" },
    { value: 3, label: "Ср" },
    { value: 4, label: "Чт" },
    { value: 5, label: "Пт" },
    { value: 6, label: "Сб" },
    { value: 7, label: "Вс" },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Создать SLA политику</DialogTitle>
          <DialogDescription>
            Настройте время ответа и решения для тикетов
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Название *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked as boolean })
                }
              />
              <Label htmlFor="isActive" className="font-normal">
                Активна
              </Label>
            </div>
          </div>

          {/* Time Settings */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold">Временные рамки</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="responseTime">Время первого ответа (мин)</Label>
                <Input
                  id="responseTime"
                  type="number"
                  min="1"
                  value={formData.responseTime}
                  onChange={(e) => setFormData({ ...formData, responseTime: e.target.value })}
                  placeholder="Опционально"
                />
              </div>

              <div>
                <Label htmlFor="resolutionTime">Время решения (мин) *</Label>
                <Input
                  id="resolutionTime"
                  type="number"
                  min="1"
                  value={formData.resolutionTime}
                  onChange={(e) => setFormData({ ...formData, resolutionTime: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>

          {/* Priorities */}
          <div className="space-y-2 border-t pt-4">
            <Label>Приоритеты (оставьте пустым для всех)</Label>
            <div className="flex flex-wrap gap-2">
              {["LOW", "MEDIUM", "HIGH", "URGENT"].map((priority) => (
                <div key={priority} className="flex items-center space-x-2">
                  <Checkbox
                    id={`priority-${priority}`}
                    checked={formData.priorities.includes(priority)}
                    onCheckedChange={() => togglePriority(priority)}
                  />
                  <Label htmlFor={`priority-${priority}`} className="font-normal">
                    {priority}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Categories */}
          {categories.length > 0 && (
            <div className="space-y-2 border-t pt-4">
              <Label>Категории (оставьте пустым для всех)</Label>
              <div className="grid grid-cols-2 gap-2">
                {categories.map((category) => (
                  <div key={category.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`category-${category.id}`}
                      checked={formData.categoryIds.includes(category.id)}
                      onCheckedChange={() => toggleCategory(category.id)}
                    />
                    <Label htmlFor={`category-${category.id}`} className="font-normal">
                      {category.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Queues */}
          {queues.length > 0 && (
            <div className="space-y-2 border-t pt-4">
              <Label>Очереди (оставьте пустым для всех)</Label>
              <div className="grid grid-cols-2 gap-2">
                {queues.map((queue) => (
                  <div key={queue.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`queue-${queue.id}`}
                      checked={formData.queueIds.includes(queue.id)}
                      onCheckedChange={() => toggleQueue(queue.id)}
                    />
                    <Label htmlFor={`queue-${queue.id}`} className="font-normal">
                      {queue.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Business Hours */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="businessHoursOnly"
                checked={formData.businessHoursOnly}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, businessHoursOnly: checked as boolean })
                }
              />
              <Label htmlFor="businessHoursOnly" className="font-normal">
                Учитывать только рабочее время
              </Label>
            </div>

            {formData.businessHoursOnly && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="businessHoursStart">Начало рабочего дня</Label>
                    <Input
                      id="businessHoursStart"
                      type="time"
                      value={formData.businessHoursStart}
                      onChange={(e) =>
                        setFormData({ ...formData, businessHoursStart: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="businessHoursEnd">Конец рабочего дня</Label>
                    <Input
                      id="businessHoursEnd"
                      type="time"
                      value={formData.businessHoursEnd}
                      onChange={(e) =>
                        setFormData({ ...formData, businessHoursEnd: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label>Рабочие дни</Label>
                  <div className="flex gap-2 mt-2">
                    {weekDays.map((day) => (
                      <div key={day.value} className="flex items-center space-x-1">
                        <Checkbox
                          id={`day-${day.value}`}
                          checked={formData.businessDays.includes(day.value)}
                          onCheckedChange={() => toggleBusinessDay(day.value)}
                        />
                        <Label htmlFor={`day-${day.value}`} className="font-normal text-sm">
                          {day.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Создание..." : "Создать"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

