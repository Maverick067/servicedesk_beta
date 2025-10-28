"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2, Zap, Play, Pause } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EditRuleDialog } from "./edit-rule-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface AutomationRule {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  triggerType: string;
  conditions: any;
  actions: any[];
  priority: number;
  executionCount: number;
  lastExecutedAt: string | null;
  createdAt: string;
}

export function AutomationRuleList() {
  const { data: session } = useSession();
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null);

  const fetchRules = async () => {
    if (!session?.user?.tenantId) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/automation`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setRules(data);
    } catch (e: any) {
      setError(e.message);
      toast.error("Ошибка при загрузке правил автоматизации", {
        description: e.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, [session]);

  const handleToggleActive = async (rule: AutomationRule) => {
    try {
      const response = await fetch(`/api/automation/${rule.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: !rule.isActive }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Не удалось изменить статус правила");
      }

      toast.success(rule.isActive ? "Правило деактивировано" : "Правило активировано");
      fetchRules();
    } catch (e: any) {
      toast.error("Ошибка", {
        description: e.message,
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить это правило автоматизации?")) return;

    try {
      const response = await fetch(`/api/automation/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Не удалось удалить правило");
      }

      toast.success("Правило удалено");
      fetchRules();
    } catch (e: any) {
      toast.error("Ошибка при удалении правила", {
        description: e.message,
      });
    }
  };

  const handleEdit = (rule: AutomationRule) => {
    setSelectedRule(rule);
    setIsEditDialogOpen(true);
  };

  const handleRuleUpdated = () => {
    setIsEditDialogOpen(false);
    fetchRules();
  };

  const getTriggerName = (trigger: string) => {
    const names: Record<string, string> = {
      TICKET_CREATED: "Тикет создан",
      TICKET_UPDATED: "Тикет обновлён",
      TICKET_ASSIGNED: "Тикет назначен",
      STATUS_CHANGED: "Статус изменён",
      PRIORITY_CHANGED: "Приоритет изменён",
      COMMENT_ADDED: "Добавлен комментарий",
      SLA_BREACH: "Нарушение SLA",
      TIME_BASED: "По расписанию",
    };
    return names[trigger] || trigger;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <ExclamationTriangleIcon className="h-4 w-4" />
        <AlertTitle>Ошибка</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (rules.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Zap className="mx-auto h-12 w-12 mb-4" />
        <h3 className="text-lg font-semibold">Правила автоматизации не найдены</h3>
        <p className="text-sm">
          Создайте первое правило для автоматизации работы с тикетами.
        </p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Название</TableHead>
            <TableHead>Триггер</TableHead>
            <TableHead>Приоритет</TableHead>
            <TableHead>Выполнений</TableHead>
            <TableHead>Последнее выполнение</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead className="text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules.map((rule) => (
            <TableRow key={rule.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{rule.name}</p>
                  {rule.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {rule.description}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{getTriggerName(rule.triggerType)}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{rule.priority}</Badge>
              </TableCell>
              <TableCell>{rule.executionCount}</TableCell>
              <TableCell>
                {rule.lastExecutedAt
                  ? format(new Date(rule.lastExecutedAt), "dd.MM.yyyy HH:mm", {
                      locale: ru,
                    })
                  : "Не выполнялось"}
              </TableCell>
              <TableCell>
                <Badge variant={rule.isActive ? "default" : "outline"}>
                  {rule.isActive ? "Активно" : "Неактивно"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Открыть меню</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleToggleActive(rule)}>
                      {rule.isActive ? (
                        <>
                          <Pause className="mr-2 h-4 w-4" />
                          Деактивировать
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Активировать
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleEdit(rule)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Редактировать
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(rule.id)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Удалить
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {selectedRule && (
        <EditRuleDialog
          rule={selectedRule}
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onRuleUpdated={handleRuleUpdated}
        />
      )}
    </>
  );
}

