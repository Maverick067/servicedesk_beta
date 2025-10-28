"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { CustomFieldInputs } from "@/components/custom-fields/custom-field-inputs";

interface Category {
  id: string;
  name: string;
  description: string | null;
  color: string;
}

interface Queue {
  id: string;
  name: string;
  description: string | null;
  color: string;
}

interface CustomField {
  id: string;
  name: string;
  label: string;
  description: string | null;
  type: string;
  options: string[] | null;
  isRequired: boolean;
}

export function CreateTicketDialog() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    queueId: "none",
    categoryId: "none",
  });

  // Загружаем категории, очереди и кастомные поля при монтировании компонента
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesRes, queuesRes, customFieldsRes] = await Promise.all([
          fetch("/api/categories"),
          fetch("/api/queues"),
          fetch("/api/custom-fields?active=true"),
        ]);
        
        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json();
          setCategories(categoriesData);
        }
        
        if (queuesRes.ok) {
          const queuesData = await queuesRes.json();
          setQueues(queuesData);
        }

        if (customFieldsRes.ok) {
          const customFieldsData = await customFieldsRes.json();
          setCustomFields(customFieldsData);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          queueId: formData.queueId === "none" ? undefined : formData.queueId,
          categoryId: formData.categoryId === "none" ? undefined : formData.categoryId,
          customFields: customFieldValues,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.details) {
          // Показываем детали валидации
          const errorMessages = data.details.map((detail: any) => detail.message).join(", ");
          throw new Error(errorMessages);
        }
        throw new Error(data.error || "Failed to create ticket");
      }

      router.push("/dashboard/tickets");
      router.refresh();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>Создать новый тикет</CardTitle>
          <CardDescription>
            Опишите вашу проблему или запрос
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Заголовок *</Label>
            <Input
              id="title"
              placeholder="Краткое описание проблемы"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Описание *</Label>
            <Textarea
              id="description"
              placeholder="Подробное описание проблемы или запроса"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              required
              disabled={isLoading}
              rows={6}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="queue">Очередь</Label>
            <Select
              value={formData.queueId || "none"}
              onValueChange={(value) =>
                setFormData({ ...formData, queueId: value === "none" ? "" : value })
              }
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите очередь (необязательно)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Без очереди</SelectItem>
                {queues
                  .filter((queue) => queue.id)
                  .map((queue) => (
                    <SelectItem key={queue.id} value={queue.id}>
                      {queue.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="priority">Приоритет</Label>
            <Select
              value={formData.priority}
              onValueChange={(value) =>
                setFormData({ ...formData, priority: value })
              }
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Низкий</SelectItem>
                <SelectItem value="MEDIUM">Средний</SelectItem>
                <SelectItem value="HIGH">Высокий</SelectItem>
                <SelectItem value="URGENT">Срочный</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Категория</Label>
            <Select
              value={formData.categoryId || "none"}
              onValueChange={(value) =>
                setFormData({ ...formData, categoryId: value === "none" ? "" : value })
              }
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите категорию (необязательно)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Без категории</SelectItem>
                {categories
                  .filter((category) => category.id)
                  .map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <CustomFieldInputs
            fields={customFields}
            values={customFieldValues}
            onChange={(fieldId, value) =>
              setCustomFieldValues({ ...customFieldValues, [fieldId]: value })
            }
          />
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            Отмена
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Создание...
              </>
            ) : (
              "Создать тикет"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

