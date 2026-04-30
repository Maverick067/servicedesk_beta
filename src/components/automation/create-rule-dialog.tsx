"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const ruleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  isActive: z.boolean(),
  triggerType: z.string().min(1, "Select a trigger"),
  priority: z.number().int(),
});

type RuleFormValues = z.infer<typeof ruleSchema>;

interface Condition {
  field: string;
  operator: string;
  value: string;
}

interface Action {
  type: string;
  value: string;
}

interface CreateRuleDialogProps {
  children: React.ReactNode;
  onRuleCreated?: () => void;
}

export function CreateRuleDialog({
  children,
  onRuleCreated,
}: CreateRuleDialogProps) {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [actions, setActions] = useState<Action[]>([]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<RuleFormValues>({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
      name: "",
      description: "",
      isActive: true,
      triggerType: "",
      priority: 0,
    },
  });

  const addCondition = () => {
    setConditions([...conditions, { field: "priority", operator: "equals", value: "" }]);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, field: keyof Condition, value: string) => {
    const newConditions = [...conditions];
    newConditions[index][field] = value;
    setConditions(newConditions);
  };

  const addAction = () => {
    setActions([...actions, { type: "CHANGE_STATUS", value: "" }]);
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const updateAction = (index: number, field: keyof Action, value: string) => {
    const newActions = [...actions];
    newActions[index][field] = value;
    setActions(newActions);
  };

  const onSubmit = async (data: RuleFormValues) => {
    if (conditions.length === 0) {
      toast.error("Add at least one condition");
      return;
    }
    if (actions.length === 0) {
      toast.error("Add at least one action");
      return;
    }

    setIsSubmitting(true);
    try {
      const conditionsObject = conditions.reduce((acc, cond, idx) => {
        acc[`condition_${idx}`] = cond;
        return acc;
      }, {} as any);

      const payload = {
        ...data,
        priority: Number(data.priority),
        conditions: conditionsObject,
        actions: actions.map((action, idx) => ({
          ...action,
          id: `action_${idx}`,
        })),
      };

      const response = await fetch(`/api/automation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create rule");
      }

      toast.success("Rule Created", {
        description: "New automation rule was successfully added.",
      });
      reset();
      setConditions([]);
      setActions([]);
      setIsOpen(false);
      onRuleCreated?.();
    } catch (e: any) {
      toast.error("Error Creating Rule", {
        description: e.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerOptions = [
    { value: "TICKET_CREATED", label: "Ticket Created" },
    { value: "TICKET_UPDATED", label: "Ticket Updated" },
    { value: "TICKET_ASSIGNED", label: "Ticket Assigned" },
    { value: "STATUS_CHANGED", label: "Status Changed" },
    { value: "PRIORITY_CHANGED", label: "Priority Changed" },
    { value: "COMMENT_ADDED", label: "Comment Added" },
    { value: "SLA_BREACH", label: "SLA Breach" },
    { value: "TIME_BASED", label: "Scheduled" },
  ];

  const fieldOptions = [
    { value: "priority", label: "Priority" },
    { value: "status", label: "Status" },
    { value: "category", label: "Category" },
    { value: "assignee", label: "Assignee" },
  ];

  const operatorOptions = [
    { value: "equals", label: "equals" },
    { value: "not_equals", label: "not equals" },
    { value: "contains", label: "contains" },
    { value: "not_contains", label: "not contains" },
  ];

  const actionOptions = [
    { value: "CHANGE_STATUS", label: "Change Status" },
    { value: "CHANGE_PRIORITY", label: "Change Priority" },
    { value: "ASSIGN_TO_AGENT", label: "Assign to Agent" },
    { value: "ADD_COMMENT", label: "Add Comment" },
    { value: "SEND_EMAIL", label: "Send Email" },
    { value: "SEND_NOTIFICATION", label: "Send Notification" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Automation Rule</DialogTitle>
          <DialogDescription>
            Configure conditions and actions for ticket automation.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 py-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                {...register("name")}
                className="col-span-3"
                placeholder="Auto-assign high priority"
              />
              {errors.name && (
                <p className="col-span-4 text-right text-sm text-red-500">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="description" className="text-right pt-2">
                Description
              </Label>
              <Textarea
                id="description"
                {...register("description")}
                className="col-span-3"
                placeholder="Rule description..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="triggerType" className="text-right">
                Trigger
              </Label>
              <Controller
                name="triggerType"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select an event" />
                    </SelectTrigger>
                    <SelectContent>
                      {triggerOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.triggerType && (
                <p className="col-span-4 text-right text-sm text-red-500">
                  {errors.triggerType.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="priority" className="text-right">
                Priority
              </Label>
              <Input
                id="priority"
                type="number"
                {...register("priority", { valueAsNumber: true })}
                className="col-span-3"
                placeholder="0"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="isActive" className="text-right">
                Active
              </Label>
              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <Switch
                    id="isActive"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="col-span-3 justify-self-start"
                  />
                )}
              />
            </div>
          </div>

          {/* Conditions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Conditions (IF)</Label>
              <Button type="button" size="sm" variant="outline" onClick={addCondition}>
                <Plus className="h-4 w-4 mr-1" />
                Add Condition
              </Button>
            </div>
            <div className="space-y-2">
              {conditions.map((condition, index) => (
                <div key={index} className="flex gap-2 items-center p-3 border rounded-lg">
                  <Select
                    value={condition.field}
                    onValueChange={(value) => updateCondition(index, "field", value)}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fieldOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={condition.operator}
                    onValueChange={(value) => updateCondition(index, "operator", value)}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {operatorOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={condition.value}
                    onChange={(e) => updateCondition(index, "value", e.target.value)}
                    placeholder="Value"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removeCondition(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {conditions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No conditions. Add at least one condition.
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Actions (THEN)</Label>
              <Button type="button" size="sm" variant="outline" onClick={addAction}>
                <Plus className="h-4 w-4 mr-1" />
                Add Action
              </Button>
            </div>
            <div className="space-y-2">
              {actions.map((action, index) => (
                <div key={index} className="flex gap-2 items-center p-3 border rounded-lg">
                  <Select
                    value={action.type}
                    onValueChange={(value) => updateAction(index, "type", value)}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {actionOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={action.value}
                    onChange={(e) => updateAction(index, "value", e.target.value)}
                    placeholder="Value"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removeAction(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {actions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No actions. Add at least one action.
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Create Rule
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

