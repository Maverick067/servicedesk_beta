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
import { Loader2 } from "lucide-react";

const articleSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  excerpt: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  isPublic: z.boolean(),
  tags: z.string().optional(),
});

type ArticleFormValues = z.infer<typeof articleSchema>;

interface CreateArticleDialogProps {
  children: React.ReactNode;
  onArticleCreated?: () => void;
}

export function CreateArticleDialog({
  children,
  onArticleCreated,
}: CreateArticleDialogProps) {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ArticleFormValues>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      title: "",
      content: "",
      excerpt: "",
      status: "DRAFT",
      isPublic: false,
      tags: "",
    },
  });

  const onSubmit = async (data: ArticleFormValues) => {
    setIsSubmitting(true);
    try {
      const tagsArray = data.tags
        ? data.tags.split(",").map((t) => t.trim()).filter((t) => t.length > 0)
        : [];

      const payload = {
        ...data,
        tags: tagsArray,
        authorId: session?.user?.id,
        tenantId: session?.user?.tenantId,
      };

      const response = await fetch(`/api/knowledge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create article");
      }

      toast.success("Article created", {
        description: "New article has been successfully added to the knowledge base.",
      });
      reset();
      setIsOpen(false);
      onArticleCreated?.();
    } catch (e: any) {
      toast.error("Error creating article", {
        description: e.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Article</DialogTitle>
          <DialogDescription>
            Add a new article to the knowledge base for user self-service.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">
              Title
            </Label>
            <Input
              id="title"
              {...register("title")}
              className="col-span-3"
              placeholder="How to reset password?"
            />
            {errors.title && (
              <p className="col-span-4 text-right text-sm text-red-500">
                {errors.title.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="excerpt" className="text-right pt-2">
              Short Description
            </Label>
            <Textarea
              id="excerpt"
              {...register("excerpt")}
              className="col-span-3"
              placeholder="Brief article description..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="content" className="text-right pt-2">
              Content
            </Label>
            <Textarea
              id="content"
              {...register("content")}
              className="col-span-3"
              placeholder="Full article content..."
              rows={10}
            />
            {errors.content && (
              <p className="col-span-4 text-right text-sm text-red-500">
                {errors.content.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tags" className="text-right">
              Tags
            </Label>
            <Input
              id="tags"
              {...register("tags")}
              className="col-span-3"
              placeholder="password, account, security (comma-separated)"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              Status
            </Label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="PUBLISHED">Published</SelectItem>
                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="isPublic" className="text-right">
              Public Access
            </Label>
            <Controller
              name="isPublic"
              control={control}
              render={({ field }) => (
                <div className="col-span-3 flex items-center gap-2">
                  <Switch
                    id="isPublic"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                  <span className="text-sm text-muted-foreground">
                    Article will be available to all users
                  </span>
                </div>
              )}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Create Article
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

