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
import { enUS } from "date-fns/locale";

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
      toast.error("Error loading automation rules", {
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
        throw new Error(errorData.message || "Failed to change rule status");
      }

      toast.success(rule.isActive ? "Rule deactivated" : "Rule activated");
      fetchRules();
    } catch (e: any) {
      toast.error("Error", {
        description: e.message,
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this automation rule?")) return;

    try {
      const response = await fetch(`/api/automation/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete rule");
      }

      toast.success("Rule deleted");
      fetchRules();
    } catch (e: any) {
      toast.error("Error deleting rule", {
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
      TICKET_CREATED: "Ticket Created",
      TICKET_UPDATED: "Ticket Updated",
      TICKET_ASSIGNED: "Ticket Assigned",
      STATUS_CHANGED: "Status Changed",
      PRIORITY_CHANGED: "Priority Changed",
      COMMENT_ADDED: "Comment Added",
      SLA_BREACH: "SLA Breach",
      TIME_BASED: "Scheduled",
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
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (rules.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Zap className="mx-auto h-12 w-12 mb-4" />
        <h3 className="text-lg font-semibold">No Automation Rules Found</h3>
        <p className="text-sm">
          Create the first rule to automate ticket management.
        </p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Trigger</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Executions</TableHead>
            <TableHead>Last Execution</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
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
                  ? format(new Date(rule.lastExecutedAt), "MM/dd/yyyy HH:mm", {
                      locale: enUS,
                    })
                  : "Never executed"}
              </TableCell>
              <TableCell>
                <Badge variant={rule.isActive ? "default" : "outline"}>
                  {rule.isActive ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleToggleActive(rule)}>
                      {rule.isActive ? (
                        <>
                          <Pause className="mr-2 h-4 w-4" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Activate
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleEdit(rule)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(rule.id)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
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

