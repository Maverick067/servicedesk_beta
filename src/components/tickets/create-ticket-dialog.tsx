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

  // Load categories, queues and custom fields when component mounts
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
          // Show validation details
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
        <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
          <CardTitle className="text-lg sm:text-xl md:text-2xl">Create New Ticket</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Describe your problem or request
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6">
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="title" className="text-xs sm:text-sm">Title *</Label>
            <Input
              id="title"
              placeholder="Brief description of the problem"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              required
              disabled={isLoading}
              className="h-9 sm:h-10 text-xs sm:text-sm"
            />
          </div>
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="description" className="text-xs sm:text-sm">Description *</Label>
            <Textarea
              id="description"
              placeholder="Detailed description of the problem or request"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              required
              disabled={isLoading}
              rows={4}
              className="text-xs sm:text-sm min-h-[80px] sm:min-h-[120px]"
            />
          </div>
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="queue" className="text-xs sm:text-sm">Queue</Label>
            <Select
              value={formData.queueId || "none"}
              onValueChange={(value) =>
                setFormData({ ...formData, queueId: value === "none" ? "" : value })
              }
              disabled={isLoading}
            >
              <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                <SelectValue placeholder="Select a queue (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="text-xs sm:text-sm">No queue</SelectItem>
                {queues
                  .filter((queue) => queue.id)
                  .map((queue) => (
                    <SelectItem key={queue.id} value={queue.id} className="text-xs sm:text-sm">
                      {queue.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="priority" className="text-xs sm:text-sm">Priority</Label>
            <Select
              value={formData.priority}
              onValueChange={(value) =>
                setFormData({ ...formData, priority: value })
              }
              disabled={isLoading}
            >
              <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW" className="text-xs sm:text-sm">Low</SelectItem>
                <SelectItem value="MEDIUM" className="text-xs sm:text-sm">Medium</SelectItem>
                <SelectItem value="HIGH" className="text-xs sm:text-sm">High</SelectItem>
                <SelectItem value="URGENT" className="text-xs sm:text-sm">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="category" className="text-xs sm:text-sm">Category</Label>
            <Select
              value={formData.categoryId || "none"}
              onValueChange={(value) =>
                setFormData({ ...formData, categoryId: value === "none" ? "" : value })
              }
              disabled={isLoading}
            >
              <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                <SelectValue placeholder="Select a category (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="text-xs sm:text-sm">No category</SelectItem>
                {categories
                  .filter((category) => category.id)
                  .map((category) => (
                    <SelectItem key={category.id} value={category.id} className="text-xs sm:text-sm">
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
            <div className="text-xs sm:text-sm text-red-600 bg-red-50 p-2 sm:p-3 rounded-md">
              {error}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0 justify-between px-3 sm:px-6 pb-3 sm:pb-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isLoading}
            className="w-full sm:w-auto touch-manipulation"
            size="sm"
          >
            <span className="text-xs sm:text-sm">Cancel</span>
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading}
            className="w-full sm:w-auto touch-manipulation"
            size="sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                <span className="text-xs sm:text-sm">Creating...</span>
              </>
            ) : (
              <span className="text-xs sm:text-sm">Create Ticket</span>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

