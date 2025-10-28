"use client";

import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { LogOut, Settings } from "lucide-react";

export function DashboardHeader() {
  const { data: session } = useSession();

  return (
    <header className="border-b bg-white">
      <div className="flex h-16 items-center px-6 justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-primary">ServiceDesk</h1>
          {session?.user.tenantSlug && (
            <span className="text-sm text-muted-foreground">
              {session.user.tenantSlug}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* <NotificationBell /> */}
          <div className="text-right">
            <p className="text-sm font-medium">{session?.user.name || session?.user.email}</p>
            <p className="text-xs text-muted-foreground">
              {session?.user.role === "ADMIN" && "Администратор"}
              {session?.user.role === "TENANT_ADMIN" && "Администратор организации"}
              {session?.user.role === "AGENT" && "Агент"}
              {session?.user.role === "USER" && "Пользователь"}
            </p>
          </div>
          <Avatar>
            <AvatarImage src={session?.user.avatar} />
            <AvatarFallback>
              {session?.user.name ? getInitials(session.user.name) : "UN"}
            </AvatarFallback>
          </Avatar>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}

