"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useModules } from "@/hooks/use-modules";
import {
  LayoutDashboard,
  Ticket,
  Users,
  Settings,
  FolderKanban,
  Building2,
  UserCheck,
  Inbox,
  FileText,
  Bell,
  Clock,
  BookOpen,
  Zap,
  HardDrive,
  Webhook,
  Shield,
  CreditCard,
  MessageCircle,
  Crown,
  HelpCircle,
} from "lucide-react";
import type { FeatureFlag } from "@/lib/feature-flags";

const menuItems = [
  {
    label: "🔥 Admin Panel",
    href: "/admin",
    icon: Crown,
    roles: ["ADMIN"],
    superAdmin: true,
  },
  {
    label: "Support Tickets",
    href: "/admin/support-tickets",
    icon: HelpCircle,
    roles: ["ADMIN"],
    superAdmin: true,
  },
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["ADMIN", "TENANT_ADMIN", "AGENT", "USER"],
  },
  {
    label: "Tickets",
    href: "/dashboard/tickets",
    icon: Ticket,
    roles: ["ADMIN", "TENANT_ADMIN", "AGENT", "USER"],
  },
  {
    label: "Notifications",
    href: "/dashboard/notifications",
    icon: Bell,
    roles: ["ADMIN", "TENANT_ADMIN", "AGENT", "USER"],
  },
  {
    label: "Queues",
    href: "/dashboard/queues",
    icon: Inbox,
    roles: ["ADMIN", "TENANT_ADMIN", "AGENT"],
    requiredModule: "queues" as FeatureFlag,
  },
  {
    label: "SLA",
    href: "/dashboard/sla",
    icon: Clock,
    roles: ["ADMIN", "TENANT_ADMIN"],
    requiredModule: "sla" as FeatureFlag,
  },
  {
    label: "Knowledge Base",
    href: "/dashboard/knowledge",
    icon: BookOpen,
    roles: ["ADMIN", "TENANT_ADMIN", "AGENT", "USER"],
    requiredModule: "knowledge" as FeatureFlag,
  },
  {
    label: "Automation",
    href: "/dashboard/automation",
    icon: Zap,
    roles: ["ADMIN", "TENANT_ADMIN"],
    requiredModule: "automation" as FeatureFlag,
  },
  {
    label: "Assets (CMDB)",
    href: "/dashboard/assets",
    icon: HardDrive,
    roles: ["ADMIN", "TENANT_ADMIN", "AGENT"],
    requiredModule: "assets" as FeatureFlag,
  },
  {
    label: "Webhooks",
    href: "/dashboard/webhooks",
    icon: Webhook,
    roles: ["ADMIN", "TENANT_ADMIN"],
    requiredModule: "webhooks" as FeatureFlag,
  },
  {
    label: "LDAP",
    href: "/dashboard/ldap",
    icon: Shield,
    roles: ["ADMIN", "TENANT_ADMIN"],
    requiredModule: "ldap" as FeatureFlag,
  },
  {
    label: "SSO",
    href: "/dashboard/settings/sso",
    icon: Shield,
    roles: ["ADMIN", "TENANT_ADMIN"],
    requiredModule: "ldap" as FeatureFlag, // SSO part of LDAP module
  },
  {
    label: "Telegram",
    href: "/dashboard/settings/telegram",
    icon: MessageCircle,
    roles: ["ADMIN", "TENANT_ADMIN"],
    // Telegram is always available
  },
  {
    label: "Billing & Subscription",
    href: "/dashboard/billing",
    icon: CreditCard,
    roles: ["ADMIN", "TENANT_ADMIN"],
  },
  {
    label: "Support",
    href: "/dashboard/support",
    icon: HelpCircle,
    roles: ["TENANT_ADMIN"],
  },
  {
    label: "Organizations",
    href: "/admin/organizations",
    icon: Building2,
    roles: ["ADMIN"],
    superAdmin: true,
  },
  {
    label: "Organization Groups",
    href: "/admin/tenant-groups",
    icon: Users,
    roles: ["ADMIN"],
    superAdmin: true,
  },
  {
    label: "Categories",
    href: "/dashboard/categories",
    icon: FolderKanban,
    roles: ["ADMIN", "TENANT_ADMIN", "AGENT"],
  },
  {
    label: "Agents",
    href: "/dashboard/agents",
    icon: Users,
    roles: ["ADMIN", "TENANT_ADMIN"],
  },
  {
    label: "Users",
    href: "/dashboard/users",
    icon: UserCheck,
    roles: ["ADMIN", "TENANT_ADMIN", "AGENT"],
  },
  {
    label: "Custom Fields",
    href: "/dashboard/custom-fields",
    icon: FileText,
    roles: ["ADMIN", "TENANT_ADMIN"],
    requiredModule: "customFields" as FeatureFlag,
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    roles: ["ADMIN", "TENANT_ADMIN", "AGENT"],
  },
];

interface DashboardSidebarProps {
  mobileMenuOpen?: boolean;
  onClose?: () => void;
}

export function DashboardSidebar({ mobileMenuOpen = false, onClose }: DashboardSidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { isModuleEnabled, isLoading: modulesLoading } = useModules();
  const [supportUnreadCount, setSupportUnreadCount] = useState(0); // Support tickets (for TENANT_ADMIN)
  const [ticketUnreadCount, setTicketUnreadCount] = useState(0); // Regular tickets (for all)
  const [shouldBounceSuppport, setShouldBounceSupport] = useState(false);
  const [shouldBounceTicket, setShouldBounceTicket] = useState(false);

  // Function to fetch support ticket counter (for TENANT_ADMIN and ADMIN)
  const fetchSupportUnreadCount = () => {
    if (session?.user.role === "TENANT_ADMIN" || session?.user.role === "ADMIN") {
      fetch("/api/support-tickets/unread-count")
        .then((res) => res.json())
        .then((data) => {
          const newCount = data.count || 0;
          console.log(`🔔 [${session.user.role}] Support unread count from API:`, newCount);
          
          // Use functional update to get current value
          setSupportUnreadCount((prevCount) => {
            console.log(`📊 [${session.user.role}] Previous support count:`, prevCount, "→ New count:", newCount);
            if (newCount !== prevCount) {
              // Trigger bounce animation only if counter increased
              if (newCount > prevCount) {
                console.log(`🎉 [${session.user.role}] Support count increased! Triggering bounce animation`);
                setShouldBounceSupport(true);
                setTimeout(() => setShouldBounceSupport(false), 1000);
              }
              return newCount;
            }
            return prevCount;
          });
        })
        .catch((error) => console.error("Error fetching support unread count:", error));
    }
  };

  // Function to fetch regular ticket counter
  const fetchTicketUnreadCount = () => {
    if (session?.user && session.user.tenantId && session.user.role !== "ADMIN") {
      fetch("/api/tickets/unread-count")
        .then((res) => res.json())
        .then((data) => {
          const newCount = data.count || 0;
          console.log("🎫 Ticket unread count from API:", newCount);
          
          setTicketUnreadCount((prevCount) => {
            console.log("📊 Previous ticket count:", prevCount, "→ New count:", newCount);
            if (newCount !== prevCount) {
              if (newCount > prevCount) {
                console.log("🎉 Ticket count increased! Triggering bounce animation");
                setShouldBounceTicket(true);
                setTimeout(() => setShouldBounceTicket(false), 1000);
              }
              return newCount;
            }
            return prevCount;
          });
        })
        .catch((error) => console.error("Error fetching ticket unread count:", error));
    }
  };

  // Initial load and polling of support tickets (for TENANT_ADMIN and ADMIN)
  useEffect(() => {
    if (session?.user.role === "TENANT_ADMIN" || session?.user.role === "ADMIN") {
      fetchSupportUnreadCount();
      const interval = setInterval(fetchSupportUnreadCount, 10000);
      return () => clearInterval(interval);
    }
  }, [session]);

  // Initial load and polling of regular tickets (for all except ADMIN)
  useEffect(() => {
    if (session?.user && session.user.tenantId && session.user.role !== "ADMIN") {
      fetchTicketUnreadCount();
      const interval = setInterval(fetchTicketUnreadCount, 10000);
      return () => clearInterval(interval);
    }
  }, [session]);

  // Update support ticket counter when route changes
  useEffect(() => {
    const isTenantAdminSupportPage = session?.user.role === "TENANT_ADMIN" && pathname.startsWith("/dashboard/support");
    const isSuperAdminSupportPage = session?.user.role === "ADMIN" && pathname.startsWith("/admin/support-tickets");
    
    if (isTenantAdminSupportPage || isSuperAdminSupportPage) {
      const timeout = setTimeout(() => {
        fetchSupportUnreadCount();
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [pathname, session]);

  // Update regular ticket counter when route changes
  useEffect(() => {
    if (session?.user && session.user.tenantId && session.user.role !== "ADMIN" && pathname.startsWith("/dashboard/tickets")) {
      const timeout = setTimeout(() => {
        fetchTicketUnreadCount();
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [pathname, session]);

  const filteredMenuItems = menuItems.filter((item: any) => {
    // Role check
    if (!item.roles.includes(session?.user.role || "USER")) {
      return false;
    }

    // Admin panel only for global ADMIN (without tenantId)
    if (item.superAdmin) {
      return session?.user.role === "ADMIN" && !session?.user.tenantId;
    }

    // Billing available only for TENANT_ADMIN with tenantId
    if (item.href === "/dashboard/billing") {
      if (session?.user.role === "ADMIN" && !session?.user.tenantId) {
        return false; // Global ADMIN doesn't see billing
      }
      if (session?.user.role === "TENANT_ADMIN" && !session?.user.tenantId) {
        return false;
      }
    }

    // Settings not available for global ADMIN (without tenantId)
    if (item.href === "/dashboard/settings") {
      if (session?.user.role === "ADMIN" && !session?.user.tenantId) {
        return false; // Global ADMIN doesn't see tenant settings
      }
    }
    
    // Module check (if required)
    if (item.requiredModule) {
      // Hide all modules during loading
      if (modulesLoading) {
        return false;
      }
      // After loading, check if module is enabled
      return isModuleEnabled(item.requiredModule);
    }
    
    return true;
  });

  // Return href without changes
  const getItemHref = (item: typeof menuItems[0]) => {
    return item.href;
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 border-r bg-white min-h-[calc(100vh-4rem)]">
        <nav className="p-4 space-y-2">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const href = getItemHref(item);
            const isActive = pathname === href;

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors relative",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
                
                {/* Badge for unread regular tickets */}
                {item.href === "/dashboard/tickets" && ticketUnreadCount > 0 && (
                  <span 
                    key={`ticket-badge-${ticketUnreadCount}`}
                    className={cn(
                      "ml-auto flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-xs font-bold text-white shadow-lg ring-2 ring-blue-300 ring-offset-1 transition-all duration-300",
                      ticketUnreadCount > 9 ? "h-6 w-7 px-1" : "h-6 w-6",
                      shouldBounceTicket ? "animate-notification-bounce" : "animate-pulse",
                      "hover:scale-110 hover:shadow-xl"
                    )}
                  >
                    {ticketUnreadCount > 99 ? "99+" : ticketUnreadCount}
                  </span>
                )}
                
                {/* Badge for unread support tickets (for TENANT_ADMIN and ADMIN) */}
                {(item.href === "/dashboard/support" || item.href === "/admin/support-tickets") && supportUnreadCount > 0 && (
                  <span 
                    key={`support-badge-${supportUnreadCount}`}
                    className={cn(
                      "ml-auto flex items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-600 text-xs font-bold text-white shadow-lg ring-2 ring-red-300 ring-offset-1 transition-all duration-300",
                      supportUnreadCount > 9 ? "h-6 w-7 px-1" : "h-6 w-6",
                      shouldBounceSuppport ? "animate-notification-bounce" : "animate-pulse",
                      "hover:scale-110 hover:shadow-xl"
                    )}
                  >
                    {supportUnreadCount > 99 ? "99+" : supportUnreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile sidebar (sliding) */}
      <aside 
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-white border-r shadow-xl lg:hidden transition-transform duration-300 ease-in-out",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Mobile menu header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-bold text-primary">Menu</h2>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              const href = getItemHref(item);
              const isActive = pathname === href;

              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors relative touch-manipulation",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground active:bg-accent"
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="font-medium flex-1">{item.label}</span>
                  
                  {/* Badge for unread regular tickets */}
                  {item.href === "/dashboard/tickets" && ticketUnreadCount > 0 && (
                    <span 
                      key={`ticket-badge-${ticketUnreadCount}`}
                      className={cn(
                        "flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-xs font-bold text-white shadow-lg ring-2 ring-blue-300 ring-offset-1",
                        ticketUnreadCount > 9 ? "h-6 w-7 px-1" : "h-6 w-6",
                        shouldBounceTicket ? "animate-notification-bounce" : "animate-pulse"
                      )}
                    >
                      {ticketUnreadCount > 99 ? "99+" : ticketUnreadCount}
                    </span>
                  )}
                  
                  {/* Badge for unread support tickets */}
                  {(item.href === "/dashboard/support" || item.href === "/admin/support-tickets") && supportUnreadCount > 0 && (
                    <span 
                      key={`support-badge-${supportUnreadCount}`}
                      className={cn(
                        "flex items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-600 text-xs font-bold text-white shadow-lg ring-2 ring-red-300 ring-offset-1",
                        supportUnreadCount > 9 ? "h-6 w-7 px-1" : "h-6 w-6",
                        shouldBounceSuppport ? "animate-notification-bounce" : "animate-pulse"
                      )}
                    >
                      {supportUnreadCount > 99 ? "99+" : supportUnreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}

