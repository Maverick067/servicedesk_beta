"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface CustomField {
  id: string;
  name: string;
  label: string;
  description: string | null;
  type: string;
  options: string[] | null;
  isRequired: boolean;
  isActive: boolean;
  order: number;
}

interface EditCustomFieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field: CustomField;
  onSuccess: () => void;
}

export function EditCustomFieldDialog({ open, onOpenChange, field, onSuccess }: EditCustomFieldDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    label: field.label,
    description: field.description || "",
    options: field.options?.join(", ") || "",
    isRequired: field.isRequired,
    isActive: field.isActive,
    order: field.order,
  });

  useEffect(() => {
    setFormData({
      label: field.label,
      description: field.description || "",
      options: field.options?.join(", ") || "",
      isRequired: field.isRequired,
      isActive: field.isActive,
      order: field.order,
    });
  }, [field]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const payload: any = {
        label: formData.label,
        description: formData.description || undefined,
        isRequired: formData.isRequired,
        isActive: formData.isActive,
        order: formData.order,
      };

      // Добавляем опции для SELECT и MULTI_SELECT
      if ((field.type === "SELECT" || field.type === "MULTI_SELECT") && formData.options) {
        payload.options = formData.options.split(",").map((opt) => opt.trim()).filter(Boolean);
      }

      const response = await fetch(`/api/custom-fields/${field.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success("Поле успешно обновлено");
        onSuccess();
        onOpenChange(false);
      } else {
        const error = await response.json();
        toast.error(error.error || "Не удалось обновить поле");
      }
    } catch (error) {
      console.error("Error updating custom field:", error);
      toast.error("Ошибка при обновлении поля");
    } finally {
      setIsLoading(false);
    }
  };

  const showOptionsField = field.type === "SELECT" || field.type === "MULTI_SELECT";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Редактировать поле: {field.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="label">Отображаемое название</Label>
            <Input
              id="label"
              value={formData.label}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
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

          {showOptionsField && (
            <div>
              <Label htmlFor="options">Опции (через запятую)</Label>
              <Input
                id="options"
                value={formData.options}
                onChange={(e) => setFormData({ ...formData, options: e.target.value })}
                required={showOptionsField}
              />
            </div>
          )}

          <div>
            <Label htmlFor="order">Порядок отображения</Label>
            <Input
              id="order"
              type="number"
              value={formData.order}
              onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
              min="0"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Switch
                id="isRequired"
                checked={formData.isRequired}
                onCheckedChange={(checked) => setFormData({ ...formData, isRequired: checked })}
              />
              <Label htmlFor="isRequired">Обязательное поле</Label>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="isActive">Активно</Label>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

