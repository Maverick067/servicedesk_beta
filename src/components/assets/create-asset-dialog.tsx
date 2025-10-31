"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Search, User, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const assetSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.string().min(1, "Select type"),
  status: z.string().default("AVAILABLE"),
  assignedToId: z.string().optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  inventoryNumber: z.string().optional(),
  notes: z.string().optional(),
});

type AssetFormValues = z.infer<typeof assetSchema>;

interface User {
  id: string;
  name: string;
  email: string;
}

export function CreateAssetDialog({ children, onAssetCreated }: { children: React.ReactNode; onAssetCreated?: () => void }) {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [userSearchOpen, setUserSearchOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues: { name: "", type: "", status: "AVAILABLE", assignedToId: undefined, manufacturer: "", model: "", serialNumber: "", inventoryNumber: "", notes: "" },
  });

  // Fetch users when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const onSubmit = async (data: AssetFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create asset");
      toast.success("Asset created");
      reset({
        name: "",
        type: "",
        status: "AVAILABLE",
        assignedToId: undefined,
        manufacturer: "",
        model: "",
        serialNumber: "",
        inventoryNumber: "",
        notes: "",
      });
      setUserSearchQuery("");
      setUserSearchOpen(false);
      setIsOpen(false);
      onAssetCreated?.();
    } catch (e: any) {
      toast.error("Error", { description: e.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeOptions = [
    { value: "COMPUTER", label: "Computer" },
    { value: "LAPTOP", label: "Laptop" },
    { value: "SERVER", label: "Server" },
    { value: "NETWORK", label: "Network Equipment" },
    { value: "PRINTER", label: "Printer" },
    { value: "PHONE", label: "Phone" },
    { value: "MOBILE", label: "Mobile Device" },
    { value: "SOFTWARE", label: "Software" },
    { value: "LICENSE", label: "License" },
    { value: "OTHER", label: "Other" },
  ];

  const statusOptions = [
    { value: "AVAILABLE", label: "Available" },
    { value: "IN_USE", label: "In Use" },
    { value: "MAINTENANCE", label: "Maintenance" },
    { value: "RETIRED", label: "Retired" },
    { value: "LOST", label: "Lost" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add IT Asset</DialogTitle>
          <DialogDescription>Add new equipment to the database.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Name</Label>
            <Input id="name" {...register("name")} className="col-span-3" placeholder="MacBook Pro 2024" />
            {errors.name && <p className="col-span-4 text-right text-sm text-red-500">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">Type</Label>
            <Controller name="type" control={control} render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="col-span-3"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>{typeOptions.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent>
              </Select>
            )} />
            {errors.type && <p className="col-span-4 text-right text-sm text-red-500">{errors.type.message}</p>}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">Status</Label>
            <Controller name="status" control={control} render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                <SelectContent>{statusOptions.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent>
              </Select>
            )} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="assignedToId" className="text-right">Assigned To</Label>
            <Controller name="assignedToId" control={control} render={({ field }) => {
              const selectedUser = users.find(u => u.id === field.value);
              const filteredUsers = users.filter(user => 
                user.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                user.email.toLowerCase().includes(userSearchQuery.toLowerCase())
              );

              return (
                <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "col-span-3 justify-between",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {selectedUser ? (
                        <span className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {selectedUser.name} ({selectedUser.email})
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Select user or leave empty
                        </span>
                      )}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <div className="flex items-center border-b px-3">
                      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                      <Input
                        placeholder="Search users..."
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        className="h-9 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </div>
                    <div className="max-h-[300px] overflow-auto">
                      <div
                        className={cn(
                          "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent",
                          !field.value && "bg-accent"
                        )}
                        onClick={() => {
                          field.onChange(undefined);
                          setUserSearchOpen(false);
                          setUserSearchQuery("");
                        }}
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-4 flex items-center justify-center">
                              {!field.value && <Check className="h-4 w-4" />}
                            </div>
                            <span className="text-muted-foreground">None (Not assigned)</span>
                          </div>
                        </div>
                      </div>
                      {filteredUsers.length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                          No users found
                        </div>
                      ) : (
                        filteredUsers.map((user) => (
                          <div
                            key={user.id}
                            className={cn(
                              "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent",
                              field.value === user.id && "bg-accent"
                            )}
                            onClick={() => {
                              field.onChange(user.id);
                              setUserSearchOpen(false);
                              setUserSearchQuery("");
                            }}
                          >
                            <div className="flex items-center gap-2 flex-1">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <div className="flex-1">
                                <div className="font-medium">{user.name}</div>
                                <div className="text-xs text-muted-foreground">{user.email}</div>
                              </div>
                              {field.value === user.id && (
                                <Check className="h-4 w-4" />
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              );
            }} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="manufacturer" className="text-right">Manufacturer</Label>
            <Input id="manufacturer" {...register("manufacturer")} className="col-span-3" placeholder="Apple" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="model" className="text-right">Model</Label>
            <Input id="model" {...register("model")} className="col-span-3" placeholder="MacBook Pro 14 M3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="serialNumber" className="text-right">Serial Number</Label>
            <Input id="serialNumber" {...register("serialNumber")} className="col-span-3" placeholder="C02XZ..." />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="inventoryNumber" className="text-right">Inventory Number</Label>
            <Input id="inventoryNumber" {...register("inventoryNumber")} className="col-span-3" placeholder="INV-001" />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="notes" className="text-right pt-2">Notes</Label>
            <Textarea id="notes" {...register("notes")} className="col-span-3" rows={3} />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Asset
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

