"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

const webhookSchema = z.object({
  name: z.string().min(1, "Название обязательно"),
  url: z.string().url("Введите корректный URL"),
  secret: z.string().optional(),
  isActive: z.boolean().default(true),
  events: z.array(z.string()).min(1, "Выберите хотя бы одно событие"),
});

type WebhookFormValues = z.infer<typeof webhookSchema>;

export function CreateWebhookDialog({ children, onWebhookCreated }: { children: React.ReactNode; onWebhookCreated?: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<WebhookFormValues>({
    resolver: zodResolver(webhookSchema),
    defaultValues: { name: "", url: "", secret: "", isActive: true, events: [] },
  });

  const onSubmit = async (data: WebhookFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/webhooks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Не удалось создать webhook");
      toast.success("Webhook создан");
      reset();
      setIsOpen(false);
      onWebhookCreated?.();
    } catch (e: any) {
      toast.error("Ошибка", { description: e.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const eventOptions = [
    { value: "TICKET_CREATED", label: "Тикет создан" },
    { value: "TICKET_UPDATED", label: "Тикет обновлён" },
    { value: "TICKET_RESOLVED", label: "Тикет решён" },
    { value: "TICKET_CLOSED", label: "Тикет закрыт" },
    { value: "COMMENT_ADDED", label: "Комментарий добавлен" },
    { value: "USER_CREATED", label: "Пользователь создан" },
    { value: "ALL", label: "Все события" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Создать webhook</DialogTitle>
          <DialogDescription>Настройте webhook для интеграции с внешними сервисами.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Название</Label>
            <Input id="name" {...register("name")} className="col-span-3" placeholder="Slack уведомления" />
            {errors.name && <p className="col-span-4 text-right text-sm text-red-500">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="url" className="text-right">URL</Label>
            <Input id="url" {...register("url")} className="col-span-3" placeholder="https://hooks.slack.com/..." />
            {errors.url && <p className="col-span-4 text-right text-sm text-red-500">{errors.url.message}</p>}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="secret" className="text-right">Secret</Label>
            <Input id="secret" {...register("secret")} className="col-span-3" placeholder="Опционально" type="password" />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right pt-2">События</Label>
            <div className="col-span-3 space-y-2">
              <Controller name="events" control={control} render={({ field }) => (
                <>
                  {eventOptions.map((event) => (
                    <div key={event.value} className="flex items-center space-x-2">
                      <Checkbox id={event.value} checked={field.value.includes(event.value)} onCheckedChange={(checked) => {
                        if (checked) field.onChange([...field.value, event.value]);
                        else field.onChange(field.value.filter((v) => v !== event.value));
                      }} />
                      <Label htmlFor={event.value} className="font-normal">{event.label}</Label>
                    </div>
                  ))}
                </>
              )} />
              {errors.events && <p className="text-sm text-red-500">{errors.events.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="isActive" className="text-right">Активен</Label>
            <Controller name="isActive" control={control} render={({ field }) => (
              <Switch id="isActive" checked={field.value} onCheckedChange={field.onChange} className="col-span-3 justify-self-start" />
            )} />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Создать webhook
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

