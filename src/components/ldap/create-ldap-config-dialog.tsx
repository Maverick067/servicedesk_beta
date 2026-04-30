"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

const ldapSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.string().min(1, "Select type"),
  host: z.string().optional(),
  port: z.number().int().optional(),
  baseDn: z.string().optional(),
  bindDn: z.string().optional(),
  bindPassword: z.string().optional(),
  userSearchBase: z.string().optional(),
  userSearchFilter: z.string().optional(),
  isActive: z.boolean(),
});

type LdapFormValues = z.infer<typeof ldapSchema>;

export function CreateLdapConfigDialog({ children, onConfigCreated }: { children: React.ReactNode; onConfigCreated?: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<LdapFormValues>({
    resolver: zodResolver(ldapSchema),
    defaultValues: { name: "", type: "", host: "", port: 389, baseDn: "", bindDn: "", bindPassword: "", userSearchBase: "", userSearchFilter: "", isActive: false },
  });

  const onSubmit = async (data: LdapFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/ldap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create configuration");
      toast.success("LDAP configuration created");
      reset();
      setIsOpen(false);
      onConfigCreated?.();
    } catch (e: any) {
      toast.error("Error", { description: e.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeOptions = [
    { value: "LDAP", label: "LDAP" },
    { value: "ACTIVE_DIRECTORY", label: "Active Directory" },
    { value: "OAUTH2", label: "OAuth 2.0" },
    { value: "SAML", label: "SAML" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add LDAP/SSO Integration</DialogTitle>
          <DialogDescription>Configure integration with external authentication provider.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Name</Label>
            <Input id="name" {...register("name")} className="col-span-3" placeholder="Corporate AD" />
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
            <Label htmlFor="host" className="text-right">Host</Label>
            <Input id="host" {...register("host")} className="col-span-3" placeholder="ldap.company.com" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="port" className="text-right">Port</Label>
            <Input id="port" type="number" {...register("port", { valueAsNumber: true })} className="col-span-3" placeholder="389" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="baseDn" className="text-right">Base DN</Label>
            <Input id="baseDn" {...register("baseDn")} className="col-span-3" placeholder="dc=company,dc=com" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="bindDn" className="text-right">Bind DN</Label>
            <Input id="bindDn" {...register("bindDn")} className="col-span-3" placeholder="cn=admin,dc=company,dc=com" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="bindPassword" className="text-right">Bind Password</Label>
            <Input id="bindPassword" type="password" {...register("bindPassword")} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="userSearchBase" className="text-right">User Search Base</Label>
            <Input id="userSearchBase" {...register("userSearchBase")} className="col-span-3" placeholder="ou=users,dc=company,dc=com" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="userSearchFilter" className="text-right">User Search Filter</Label>
            <Input id="userSearchFilter" {...register("userSearchFilter")} className="col-span-3" placeholder="(uid={0})" />
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
              Create Configuration
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

