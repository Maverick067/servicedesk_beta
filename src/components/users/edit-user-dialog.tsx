"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface EditUserDialogProps {
  user: {
    id: string;
    name: string | null;
    email: string;
    role: "ADMIN" | "TENANT_ADMIN" | "AGENT" | "USER";
    isActive: boolean;
  };
  children: React.ReactNode;
  onUserUpdated?: () => void;
}

const roleLabels = {
  ADMIN: "Глобальный админ",
  TENANT_ADMIN: "Админ организации",
  AGENT: "Агент",
  USER: "Пользователь",
};

export function EditUserDialog({ user, children, onUserUpdated }: EditUserDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [role, setRole] = useState(user.role);
  const [isActive, setIsActive] = useState(user.isActive);

  // Обновляем состояние при изменении пользователя
  useEffect(() => {
    setRole(user.role);
    setIsActive(user.isActive);
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          isActive,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update user");
      }

      toast.success("Пользователь обновлен", {
        description: `Роль: ${roleLabels[role]}, Статус: ${isActive ? "Активен" : "Неактивен"}`,
      });

      setIsOpen(false);
      onUserUpdated?.();
    } catch (error: any) {
      toast.error("Ошибка", {
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Редактировать пользователя</DialogTitle>
          <DialogDescription>
            {user.name || user.email}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-4">
            {/* Роль */}
            <div className="space-y-2">
              <Label htmlFor="role">Роль</Label>
              <Select value={role} onValueChange={(value: any) => setRole(value)}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Выберите роль" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">👤 Пользователь</SelectItem>
                  <SelectItem value="AGENT">🎧 Агент</SelectItem>
                  <SelectItem value="TENANT_ADMIN">👨‍💼 Админ организации</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {role === "USER" && "Может создавать тикеты и комментировать"}
                {role === "AGENT" && "Может обрабатывать тикеты"}
                {role === "TENANT_ADMIN" && "Полный доступ к настройкам организации"}
              </p>
            </div>

            {/* Статус */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="isActive">Статус аккаунта</Label>
                <p className="text-xs text-muted-foreground">
                  {isActive ? "Пользователь может входить в систему" : "Вход заблокирован"}
                </p>
              </div>
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          </div>

          {/* Кнопки */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Сохранение...
                </>
              ) : (
                "Сохранить"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

