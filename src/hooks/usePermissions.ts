import { useSession } from "next-auth/react";

export interface AgentPermissions {
  canCreateCategories: boolean;
  canEditCategories: boolean;
  canDeleteCategories: boolean;
  canAssignAgents: boolean;
  canResetPasswords: boolean;
  canInviteUsers: boolean;
  canDeleteUsers: boolean;
  canViewAllTickets: boolean;
  canEditAllTickets: boolean;
}

export function usePermissions() {
  const { data: session } = useSession();

  // Если пользователь ADMIN или TENANT_ADMIN - полный доступ
  if (session?.user.role === "ADMIN" || session?.user.role === "TENANT_ADMIN") {
    return {
      canCreateCategories: true,
      canEditCategories: true,
      canDeleteCategories: true,
      canAssignAgents: true,
      canResetPasswords: true,
      canInviteUsers: true,
      canDeleteUsers: true,
      canViewAllTickets: true,
      canEditAllTickets: true,
    };
  }

  // Для агентов проверяем их разрешения
  if (session?.user.role === "AGENT") {
    const permissions = (session.user as any).permissions as AgentPermissions | null;
    
    if (permissions) {
      return permissions;
    }

    // По умолчанию агент имеет минимальные права
    return {
      canCreateCategories: false,
      canEditCategories: false,
      canDeleteCategories: false,
      canAssignAgents: false,
      canResetPasswords: false,
      canInviteUsers: false,
      canDeleteUsers: false,
      canViewAllTickets: false,
      canEditAllTickets: false,
    };
  }

  // Обычные пользователи не имеют прав
  return {
    canCreateCategories: false,
    canEditCategories: false,
    canDeleteCategories: false,
    canAssignAgents: false,
    canResetPasswords: false,
    canInviteUsers: false,
    canDeleteUsers: false,
    canViewAllTickets: false,
    canEditAllTickets: false,
  };
}

