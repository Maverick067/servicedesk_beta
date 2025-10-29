"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Loader2 } from "lucide-react";

const ruleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  isActive: z.boolean(),
  triggerType: z.string().min(1, "Select trigger"),
  priority: z.number().int(),
});

type RuleFormValues = z.infer<typeof ruleSchema>;

interface Rule {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  triggerType: string;
  priority: number;
  conditions: any;
  actions: any[];
}

interface EditRuleDialogProps {
  rule: Rule;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onRuleUpdated: () => void;
}

export function EditRuleDialog({
  rule,
  isOpen,
  onOpenChange,
  onRuleUpdated,
}: EditRuleDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<RuleFormValues>({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
      name: rule.name,
      description: rule.description || "",
      isActive: rule.isActive,
      triggerType: rule.triggerType,
      priority: rule.priority,
    },
  });

  useEffect(() => {
    reset({
      name: rule.name,
      description: rule.description || "",
      isActive: rule.isActive,
      triggerType: rule.triggerType,
      priority: rule.priority,
    });
  }, [rule, reset]);

  const onSubmit = async (data: RuleFormValues) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...data,
        priority: Number(data.priority),
      };

      const response = await fetch(`/api/automation/${rule.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update rule");
      }

      toast.success("Rule updated");
      onOpenChange(false);
      onRuleUpdated?.();
    } catch (e: any) {
      toast.error("Error updating rule", {
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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Rule</DialogTitle>
          <DialogDescription>
            Change automation rule settings.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              {...register("name")}
              className="col-span-3"
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
                    <SelectValue />
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

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

