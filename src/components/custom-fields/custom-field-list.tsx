"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Edit, Trash2, GripVertical } from "lucide-react";
import { CreateCustomFieldDialog } from "./create-custom-field-dialog";
import { EditCustomFieldDialog } from "./edit-custom-field-dialog";
import { motion } from "framer-motion";

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
  createdAt: string;
}

const fieldTypeLabels: Record<string, string> = {
  TEXT: "Text",
  NUMBER: "Number",
  DATE: "Date",
  CHECKBOX: "Checkbox",
  SELECT: "Select",
  MULTI_SELECT: "Multi-select",
  URL: "URL",
  EMAIL: "Email",
};

const fieldTypeColors: Record<string, string> = {
  TEXT: "bg-blue-100 text-blue-800",
  NUMBER: "bg-green-100 text-green-800",
  DATE: "bg-purple-100 text-purple-800",
  CHECKBOX: "bg-yellow-100 text-yellow-800",
  SELECT: "bg-pink-100 text-pink-800",
  MULTI_SELECT: "bg-indigo-100 text-indigo-800",
  URL: "bg-cyan-100 text-cyan-800",
  EMAIL: "bg-orange-100 text-orange-800",
};

export function CustomFieldList() {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);

  const fetchFields = async () => {
    try {
      const response = await fetch("/api/custom-fields");
      if (response.ok) {
        const data = await response.json();
        setFields(data);
      }
    } catch (error) {
      console.error("Error fetching custom fields:", error);
      toast.error("Failed to load custom fields");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFields();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this field? All existing values will be lost.")) {
      return;
    }

    try {
      const response = await fetch(`/api/custom-fields/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Field deleted successfully");
        fetchFields();
      } else {
        toast.error("Failed to delete field");
      }
    } catch (error) {
      console.error("Error deleting custom field:", error);
      toast.error("Error deleting field");
    }
  };

  const toggleActive = async (field: CustomField) => {
    try {
      const response = await fetch(`/api/custom-fields/${field.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !field.isActive }),
      });

      if (response.ok) {
        toast.success(`Field ${field.isActive ? "deactivated" : "activated"}`);
        fetchFields();
      } else {
        toast.error("Failed to change field status");
      }
    } catch (error) {
      console.error("Error toggling field status:", error);
      toast.error("Error changing status");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="h-32" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Custom Fields
          </h2>
          <p className="text-muted-foreground mt-1">
            Configure additional fields for tickets
          </p>
        </div>
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Field
        </Button>
      </div>

      {fields.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No custom fields. Create the first field for tickets.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {fields.map((field, index) => (
            <motion.div
              key={field.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 cursor-grab">
                        <GripVertical className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-lg">{field.label}</CardTitle>
                          {field.isRequired && (
                            <Badge variant="destructive" className="text-xs">
                              Required
                            </Badge>
                          )}
                          {!field.isActive && (
                            <Badge variant="secondary" className="text-xs">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        <CardDescription>
                          <span className="font-mono text-xs">{field.name}</span>
                          {field.description && ` · ${field.description}`}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={fieldTypeColors[field.type]}>
                        {fieldTypeLabels[field.type]}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleActive(field)}
                      >
                        {field.isActive ? "👁️" : "👁️‍🗨️"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingField(field)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(field.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {field.options && field.options.length > 0 && (
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Options:</span>{" "}
                      {field.options.join(", ")}
                    </div>
                  </CardContent>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <CreateCustomFieldDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={fetchFields}
      />

      {editingField && (
        <EditCustomFieldDialog
          open={!!editingField}
          onOpenChange={(open) => !open && setEditingField(null)}
          field={editingField}
          onSuccess={fetchFields}
        />
      )}
    </div>
  );
}

