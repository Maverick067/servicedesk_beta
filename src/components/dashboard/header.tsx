"use client";

import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { LogOut, Menu, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DashboardHeaderProps {
  onMenuToggle?: () => void;
  mobileMenuOpen?: boolean;
}

export function DashboardHeader({ onMenuToggle, mobileMenuOpen }: DashboardHeaderProps) {
  const { data: session } = useSession();

  const getRoleLabel = () => {
    switch (session?.user.role) {
      case "ADMIN": return "Administrator";
      case "TENANT_ADMIN": return "Organization Admin";
      case "AGENT": return "Agent";
      case "USER": return "User";
      default: return "";
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/75 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.8)] backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between px-3 sm:h-16 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMenuToggle}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
          
          <h1 className="bg-gradient-to-r from-cyan-300 via-sky-300 to-indigo-300 bg-clip-text text-lg font-extrabold tracking-tight text-transparent sm:text-2xl">
            ServiceDesk
          </h1>
          {session?.user.tenantSlug && (
            <span className="hidden rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300 sm:inline">
              {session.user.tenantSlug}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {/* Desktop profile version */}
          <div className="hidden items-center gap-4 md:flex">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-100">{session?.user.name || session?.user.email}</p>
              <p className="text-xs text-slate-400">{getRoleLabel()}</p>
            </div>
            <Avatar className="ring-2 ring-cyan-400/30 ring-offset-2 ring-offset-slate-950">
              <AvatarImage src={session?.user.image || undefined} />
              <AvatarFallback className="bg-slate-800 text-slate-100">
                {session?.user.name ? getInitials(session.user.name) : "UN"}
              </AvatarFallback>
            </Avatar>
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-300 hover:bg-white/10 hover:text-white"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>

          {/* Mobile profile version (dropdown) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={session?.user.image || undefined} />
                  <AvatarFallback className="text-xs">
                    {session?.user.name ? getInitials(session.user.name) : "UN"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div>
                  <p className="text-sm font-medium">{session?.user.name || session?.user.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">{getRoleLabel()}</p>
                  {session?.user.tenantSlug && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Tenant: {session.user.tenantSlug}
                    </p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

