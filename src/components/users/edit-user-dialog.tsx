"use client";

import { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface EditUserDialogProps {
  user: {
    id: string;
    name: string | null;
    email: string;
    role: "ADMIN" | "TENANT_ADMIN" | "AGENT" | "USER";
    isActive: boolean;
  };
  children: React.ReactNode;
  onUserUpdated?: () => void;
}

const roleLabels = {
  ADMIN: "Global Admin",
  TENANT_ADMIN: "Organization Admin",
  AGENT: "Agent",
  USER: "User",
};

export function EditUserDialog({ user, children, onUserUpdated }: EditUserDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [role, setRole] = useState(user.role);
  const [isActive, setIsActive] = useState(user.isActive);

  // Update state when user changes
  useEffect(() => {
    setRole(user.role);
    setIsActive(user.isActive);
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          isActive,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update user");
      }

      toast.success("User updated", {
        description: `Role: ${roleLabels[role]}, Status: ${isActive ? "Active" : "Inactive"}`,
      });

      setIsOpen(false);
      onUserUpdated?.();
    } catch (error: any) {
      toast.error("Error", {
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            {user.name || user.email}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-4">
            {/* Role */}
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={(value: any) => setRole(value)}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">👤 User</SelectItem>
                  <SelectItem value="AGENT">🎧 Agent</SelectItem>
                  <SelectItem value="TENANT_ADMIN">👨‍💼 Organization Admin</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {role === "USER" && "Can create tickets and comment"}
                {role === "AGENT" && "Can process tickets"}
                {role === "TENANT_ADMIN" && "Full access to organization settings"}
              </p>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="isActive">Account Status</Label>
                <p className="text-xs text-muted-foreground">
                  {isActive ? "User can sign in" : "Login blocked"}
                </p>
              </div>
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

