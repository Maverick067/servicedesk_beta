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
  name: z.string().min(1, "Name is required"),
  url: z.string().url("Enter a valid URL"),
  secret: z.string().optional(),
  isActive: z.boolean(),
  events: z.array(z.string()).min(1, "Select at least one event"),
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
      if (!response.ok) throw new Error("Failed to create webhook");
      toast.success("Webhook created");
      reset();
      setIsOpen(false);
      onWebhookCreated?.();
    } catch (e: any) {
      toast.error("Error", { description: e.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const eventOptions = [
    { value: "TICKET_CREATED", label: "Ticket Created" },
    { value: "TICKET_UPDATED", label: "Ticket Updated" },
    { value: "TICKET_RESOLVED", label: "Ticket Resolved" },
    { value: "TICKET_CLOSED", label: "Ticket Closed" },
    { value: "COMMENT_ADDED", label: "Comment Added" },
    { value: "USER_CREATED", label: "User Created" },
    { value: "ALL", label: "All Events" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Webhook</DialogTitle>
          <DialogDescription>Configure webhook for integration with external services.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Name</Label>
            <Input id="name" {...register("name")} className="col-span-3" placeholder="Slack notifications" />
            {errors.name && <p className="col-span-4 text-right text-sm text-red-500">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="url" className="text-right">URL</Label>
            <Input id="url" {...register("url")} className="col-span-3" placeholder="https://hooks.slack.com/..." />
            {errors.url && <p className="col-span-4 text-right text-sm text-red-500">{errors.url.message}</p>}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="secret" className="text-right">Secret</Label>
            <Input id="secret" {...register("secret")} className="col-span-3" placeholder="Optional" type="password" />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right pt-2">Events</Label>
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
            <Label htmlFor="isActive" className="text-right">Active</Label>
            <Controller name="isActive" control={control} render={({ field }) => (
              <Switch id="isActive" checked={field.value} onCheckedChange={field.onChange} className="col-span-3 justify-self-start" />
            )} />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Webhook
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

