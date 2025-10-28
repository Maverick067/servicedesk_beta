"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface CreateCustomFieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const fieldTypes = [
  { value: "TEXT", label: "Текст" },
  { value: "NUMBER", label: "Число" },
  { value: "DATE", label: "Дата" },
  { value: "CHECKBOX", label: "Чекбокс" },
  { value: "SELECT", label: "Выбор из списка" },
  { value: "MULTI_SELECT", label: "Множественный выбор" },
  { value: "URL", label: "Ссылка" },
  { value: "EMAIL", label: "Email" },
];

export function CreateCustomFieldDialog({ open, onOpenChange, onSuccess }: CreateCustomFieldDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    label: "",
    description: "",
    type: "TEXT",
    options: "",
    isRequired: false,
    order: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const payload: any = {
        name: formData.name,
        label: formData.label,
        description: formData.description || undefined,
        type: formData.type,
        isRequired: formData.isRequired,
        order: formData.order,
      };

      // Добавляем опции для SELECT и MULTI_SELECT
      if ((formData.type === "SELECT" || formData.type === "MULTI_SELECT") && formData.options) {
        payload.options = formData.options.split(",").map((opt) => opt.trim()).filter(Boolean);
      }

      const response = await fetch("/api/custom-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success("Поле успешно создано");
        setFormData({
          name: "",
          label: "",
          description: "",
          type: "TEXT",
          options: "",
          isRequired: false,
          order: 0,
        });
        onSuccess();
        onOpenChange(false);
      } else {
        const error = await response.json();
        toast.error(error.error || "Не удалось создать поле");
      }
    } catch (error) {
      console.error("Error creating custom field:", error);
      toast.error("Ошибка при создании поля");
    } finally {
      setIsLoading(false);
    }
  };

  const showOptionsField = formData.type === "SELECT" || formData.type === "MULTI_SELECT";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Создать кастомное поле</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Имя поля (внутреннее)</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="client_code"
                required
                pattern="[a-zA-Z0-9_]+"
                title="Только латинские буквы, цифры и подчеркивания"
              />
            </div>
            <div>
              <Label htmlFor="label">Отображаемое название</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="Код клиента"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Необязательное описание поля"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">Тип поля</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fieldTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
          </div>

          {showOptionsField && (
            <div>
              <Label htmlFor="options">Опции (через запятую)</Label>
              <Input
                id="options"
                value={formData.options}
                onChange={(e) => setFormData({ ...formData, options: e.target.value })}
                placeholder="Опция 1, Опция 2, Опция 3"
                required={showOptionsField}
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <Switch
              id="isRequired"
              checked={formData.isRequired}
              onCheckedChange={(checked) => setFormData({ ...formData, isRequired: checked })}
            />
            <Label htmlFor="isRequired">Обязательное поле</Label>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Создание..." : "Создать"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

