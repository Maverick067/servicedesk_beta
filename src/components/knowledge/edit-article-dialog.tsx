"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
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

const articleSchema = z.object({
  title: z.string().min(1, "Название обязательно"),
  content: z.string().min(1, "Содержание обязательно"),
  excerpt: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  isPublic: z.boolean(),
  tags: z.string().optional(),
});

type ArticleFormValues = z.infer<typeof articleSchema>;

interface Article {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  status: string;
  isPublic: boolean;
  tags: string[];
}

interface EditArticleDialogProps {
  article: Article;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onArticleUpdated: () => void;
}

export function EditArticleDialog({
  article,
  isOpen,
  onOpenChange,
  onArticleUpdated,
}: EditArticleDialogProps) {
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
      title: article.title,
      content: article.content,
      excerpt: article.excerpt || "",
      status: article.status as "DRAFT" | "PUBLISHED" | "ARCHIVED",
      isPublic: article.isPublic,
      tags: article.tags.join(", "),
    },
  });

  useEffect(() => {
    reset({
      title: article.title,
      content: article.content,
      excerpt: article.excerpt || "",
      status: article.status as "DRAFT" | "PUBLISHED" | "ARCHIVED",
      isPublic: article.isPublic,
      tags: article.tags.join(", "),
    });
  }, [article, reset]);

  const onSubmit = async (data: ArticleFormValues) => {
    setIsSubmitting(true);
    try {
      const tagsArray = data.tags
        ? data.tags.split(",").map((t) => t.trim()).filter((t) => t.length > 0)
        : [];

      const payload = {
        ...data,
        tags: tagsArray,
      };

      const response = await fetch(`/api/knowledge/${article.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Не удалось обновить статью");
      }

      toast.success("Статья обновлена", {
        description: "Статья была успешно изменена.",
      });
      onOpenChange(false);
      onArticleUpdated?.();
    } catch (e: any) {
      toast.error("Ошибка при обновлении статьи", {
        description: e.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Редактировать статью</DialogTitle>
          <DialogDescription>
            Измените детали статьи базы знаний.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">
              Название
            </Label>
            <Input
              id="title"
              {...register("title")}
              className="col-span-3"
            />
            {errors.title && (
              <p className="col-span-4 text-right text-sm text-red-500">
                {errors.title.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="excerpt" className="text-right pt-2">
              Краткое описание
            </Label>
            <Textarea
              id="excerpt"
              {...register("excerpt")}
              className="col-span-3"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="content" className="text-right pt-2">
              Содержание
            </Label>
            <Textarea
              id="content"
              {...register("content")}
              className="col-span-3"
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
              Теги
            </Label>
            <Input
              id="tags"
              {...register("tags")}
              className="col-span-3"
              placeholder="пароль, аккаунт, безопасность"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              Статус
            </Label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Выберите статус" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Черновик</SelectItem>
                    <SelectItem value="PUBLISHED">Опубликовать</SelectItem>
                    <SelectItem value="ARCHIVED">В архив</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="isPublic" className="text-right">
              Публичный доступ
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
                    Статья будет доступна всем пользователям
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
              Сохранить изменения
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

