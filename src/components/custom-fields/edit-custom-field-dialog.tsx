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

      // Add options for SELECT and MULTI_SELECT
      if ((field.type === "SELECT" || field.type === "MULTI_SELECT") && formData.options) {
        payload.options = formData.options.split(",").map((opt) => opt.trim()).filter(Boolean);
      }

      const response = await fetch(`/api/custom-fields/${field.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success("Field updated successfully");
        onSuccess();
        onOpenChange(false);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update field");
      }
    } catch (error) {
      console.error("Error updating custom field:", error);
      toast.error("Error updating field");
    } finally {
      setIsLoading(false);
    }
  };

  const showOptionsField = field.type === "SELECT" || field.type === "MULTI_SELECT";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Field: {field.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="label">Display Label</Label>
            <Input
              id="label"
              value={formData.label}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
            />
          </div>

          {showOptionsField && (
            <div>
              <Label htmlFor="options">Options (comma-separated)</Label>
              <Input
                id="options"
                value={formData.options}
                onChange={(e) => setFormData({ ...formData, options: e.target.value })}
                required={showOptionsField}
              />
            </div>
          )}

          <div>
            <Label htmlFor="order">Display Order</Label>
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
              <Label htmlFor="isRequired">Required Field</Label>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

