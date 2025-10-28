"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

const assetSchema = z.object({
  name: z.string().min(1, "Название обязательно"),
  type: z.string().min(1, "Выберите тип"),
  status: z.string().default("AVAILABLE"),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  inventoryNumber: z.string().optional(),
  notes: z.string().optional(),
});

type AssetFormValues = z.infer<typeof assetSchema>;

export function CreateAssetDialog({ children, onAssetCreated }: { children: React.ReactNode; onAssetCreated?: () => void }) {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues: { name: "", type: "", status: "AVAILABLE", manufacturer: "", model: "", serialNumber: "", inventoryNumber: "", notes: "" },
  });

  const onSubmit = async (data: AssetFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Не удалось создать актив");
      toast.success("Актив создан");
      reset();
      setIsOpen(false);
      onAssetCreated?.();
    } catch (e: any) {
      toast.error("Ошибка", { description: e.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeOptions = [
    { value: "COMPUTER", label: "Компьютер" },
    { value: "LAPTOP", label: "Ноутбук" },
    { value: "SERVER", label: "Сервер" },
    { value: "NETWORK", label: "Сетевое оборудование" },
    { value: "PRINTER", label: "Принтер" },
    { value: "PHONE", label: "Телефон" },
    { value: "MOBILE", label: "Мобильное устройство" },
    { value: "SOFTWARE", label: "ПО" },
    { value: "LICENSE", label: "Лицензия" },
    { value: "OTHER", label: "Другое" },
  ];

  const statusOptions = [
    { value: "AVAILABLE", label: "Доступен" },
    { value: "IN_USE", label: "В использовании" },
    { value: "MAINTENANCE", label: "На обслуживании" },
    { value: "RETIRED", label: "Списан" },
    { value: "LOST", label: "Утерян" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Добавить IT-актив</DialogTitle>
          <DialogDescription>Добавьте новое оборудование в базу данных.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Название</Label>
            <Input id="name" {...register("name")} className="col-span-3" placeholder="MacBook Pro 2024" />
            {errors.name && <p className="col-span-4 text-right text-sm text-red-500">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">Тип</Label>
            <Controller name="type" control={control} render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="col-span-3"><SelectValue placeholder="Выберите тип" /></SelectTrigger>
                <SelectContent>{typeOptions.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent>
              </Select>
            )} />
            {errors.type && <p className="col-span-4 text-right text-sm text-red-500">{errors.type.message}</p>}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">Статус</Label>
            <Controller name="status" control={control} render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                <SelectContent>{statusOptions.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent>
              </Select>
            )} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="manufacturer" className="text-right">Производитель</Label>
            <Input id="manufacturer" {...register("manufacturer")} className="col-span-3" placeholder="Apple" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="model" className="text-right">Модель</Label>
            <Input id="model" {...register("model")} className="col-span-3" placeholder="MacBook Pro 14 M3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="serialNumber" className="text-right">Серийный номер</Label>
            <Input id="serialNumber" {...register("serialNumber")} className="col-span-3" placeholder="C02XZ..." />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="inventoryNumber" className="text-right">Инвентарный №</Label>
            <Input id="inventoryNumber" {...register("inventoryNumber")} className="col-span-3" placeholder="INV-001" />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="notes" className="text-right pt-2">Примечания</Label>
            <Textarea id="notes" {...register("notes")} className="col-span-3" rows={3} />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Добавить актив
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

