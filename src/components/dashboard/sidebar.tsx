"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
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
} from "lucide-react";
import type { FeatureFlag } from "@/lib/feature-flags";

const menuItems = [
  {
    label: "Дашборд",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["ADMIN", "TENANT_ADMIN", "AGENT", "USER"],
  },
  {
    label: "Тикеты",
    href: "/dashboard/tickets",
    icon: Ticket,
    roles: ["ADMIN", "TENANT_ADMIN", "AGENT", "USER"],
  },
  {
    label: "Уведомления",
    href: "/dashboard/notifications",
    icon: Bell,
    roles: ["ADMIN", "TENANT_ADMIN", "AGENT", "USER"],
  },
  {
    label: "Очереди",
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
    label: "База знаний",
    href: "/dashboard/knowledge",
    icon: BookOpen,
    roles: ["ADMIN", "TENANT_ADMIN", "AGENT", "USER"],
    requiredModule: "knowledge" as FeatureFlag,
  },
  {
    label: "Автоматизация",
    href: "/dashboard/automation",
    icon: Zap,
    roles: ["ADMIN", "TENANT_ADMIN"],
    requiredModule: "automation" as FeatureFlag,
  },
  {
    label: "Активы (CMDB)",
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
    requiredModule: "ldap" as FeatureFlag, // SSO часть LDAP модуля
  },
  {
    label: "Telegram",
    href: "/dashboard/settings/telegram",
    icon: MessageCircle,
    roles: ["ADMIN", "TENANT_ADMIN"],
    // Telegram пока без модуля, всегда доступен
  },
  {
    label: "Тарифы и оплата",
    href: "/dashboard/billing",
    icon: CreditCard,
    roles: ["ADMIN", "TENANT_ADMIN"],
  },
  {
    label: "Организации",
    href: "/dashboard/tenants",
    icon: Building2,
    roles: ["ADMIN", "TENANT_ADMIN"],
  },
  {
    label: "Категории",
    href: "/dashboard/categories",
    icon: FolderKanban,
    roles: ["ADMIN", "TENANT_ADMIN", "AGENT"],
  },
  {
    label: "Агенты",
    href: "/dashboard/agents",
    icon: Users,
    roles: ["ADMIN", "TENANT_ADMIN"],
  },
  {
    label: "Пользователи",
    href: "/dashboard/users",
    icon: UserCheck,
    roles: ["ADMIN", "TENANT_ADMIN", "AGENT"],
  },
  {
    label: "Кастомные поля",
    href: "/dashboard/custom-fields",
    icon: FileText,
    roles: ["ADMIN", "TENANT_ADMIN"],
    requiredModule: "customFields" as FeatureFlag,
  },
  {
    label: "Настройки",
    href: "/dashboard/settings",
    icon: Settings,
    roles: ["ADMIN", "TENANT_ADMIN", "AGENT"],
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { isModuleEnabled, isLoading: modulesLoading } = useModules();

  const filteredMenuItems = menuItems.filter((item) => {
    // Проверка ролей
    if (!item.roles.includes(session?.user.role || "USER")) {
      return false;
    }

    // Billing доступен только для TENANT_ADMIN с tenantId
    if (item.href === "/dashboard/billing") {
      if (session?.user.role === "ADMIN" && !session?.user.tenantId) {
        return false; // Global ADMIN не видит billing
      }
      if (session?.user.role === "TENANT_ADMIN" && !session?.user.tenantId) {
        return false;
      }
    }

    // Настройки недоступны для глобального ADMIN (без tenantId)
    if (item.href === "/dashboard/settings") {
      if (session?.user.role === "ADMIN" && !session?.user.tenantId) {
        return false; // Global ADMIN не видит настройки tenant'а
      }
    }
    
    // Проверка модулей (если требуется)
    if (item.requiredModule) {
      // Во время загрузки скрываем все модули
      if (modulesLoading) {
        return false;
      }
      // После загрузки проверяем, включен ли модуль
      return isModuleEnabled(item.requiredModule);
    }
    
    return true;
  });

  // Возвращаем href без изменений
  const getItemHref = (item: typeof menuItems[0]) => {
    return item.href;
  };

  return (
    <aside className="w-64 border-r bg-white min-h-[calc(100vh-4rem)]">
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
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

