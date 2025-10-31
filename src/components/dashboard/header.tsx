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
    <header 
      className="border-b backdrop-blur-xl sticky top-0 z-30 shadow-lg" 
      style={{
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(20px)',
        borderColor: 'rgb(30, 41, 59)'
      }}
    >
      <div className="flex h-14 sm:h-16 items-center px-3 sm:px-6 justify-between">
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
          
          <h1 
            className="text-lg sm:text-2xl font-extrabold"
            style={{
              background: 'linear-gradient(135deg, #06b6d4, #22d3ee, #67e8f9)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 0 8px rgba(6, 182, 212, 0.5))'
            }}
          >
            ServiceDesk
          </h1>
          {session?.user.tenantSlug && (
            <span className="hidden sm:inline text-sm text-muted-foreground">
              {session.user.tenantSlug}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {/* Desktop profile version */}
          <div className="hidden md:flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium">{session?.user.name || session?.user.email}</p>
              <p className="text-xs text-muted-foreground">{getRoleLabel()}</p>
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

          {/* Mobile profile version (dropdown) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={session?.user.avatar} />
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

