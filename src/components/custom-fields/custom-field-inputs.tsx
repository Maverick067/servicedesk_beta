"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface CustomField {
  id: string;
  name: string;
  label: string;
  description: string | null;
  type: string;
  options: string[] | null;
  isRequired: boolean;
}

interface CustomFieldInputsProps {
  fields: CustomField[];
  values: Record<string, string>;
  onChange: (fieldId: string, value: string) => void;
}

export function CustomFieldInputs({ fields, values, onChange }: CustomFieldInputsProps) {
  if (fields.length === 0) {
    return null;
  }

  const renderField = (field: CustomField) => {
    const value = values[field.id] || "";

    switch (field.type) {
      case "TEXT":
      case "EMAIL":
      case "URL":
        return (
          <Input
            type={field.type === "EMAIL" ? "email" : field.type === "URL" ? "url" : "text"}
            value={value}
            onChange={(e) => onChange(field.id, e.target.value)}
            required={field.isRequired}
            placeholder={field.description || undefined}
          />
        );

      case "NUMBER":
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => onChange(field.id, e.target.value)}
            required={field.isRequired}
            placeholder={field.description || undefined}
          />
        );

      case "DATE":
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => onChange(field.id, e.target.value)}
            required={field.isRequired}
          />
        );

      case "CHECKBOX":
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={field.id}
              checked={value === "true"}
              onCheckedChange={(checked) => onChange(field.id, checked ? "true" : "false")}
            />
            <label
              htmlFor={field.id}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {field.description || field.label}
            </label>
          </div>
        );

      case "SELECT":
        return (
          <Select
            value={value}
            onValueChange={(val) => onChange(field.id, val)}
            required={field.isRequired}
          >
            <SelectTrigger>
              <SelectValue placeholder="Выберите значение" />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "MULTI_SELECT":
        // Для упрощения используем текстовое поле с подсказкой
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => onChange(field.id, e.target.value)}
            required={field.isRequired}
            placeholder={`Выберите из: ${field.options?.join(", ")}`}
          />
        );

      default:
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => onChange(field.id, e.target.value)}
            required={field.isRequired}
          />
        );
    }
  };

  return (
    <div className="space-y-4 border-t pt-4 mt-4">
      <h3 className="text-lg font-semibold">Дополнительные поля</h3>
      {fields.map((field) => (
        <div key={field.id}>
          <Label htmlFor={field.id}>
            {field.label}
            {field.isRequired && <span className="text-red-500 ml-1">*</span>}
          </Label>
          {renderField(field)}
          {field.description && field.type !== "CHECKBOX" && (
            <p className="text-sm text-muted-foreground mt-1">{field.description}</p>
          )}
        </div>
      ))}
    </div>
  );
}

