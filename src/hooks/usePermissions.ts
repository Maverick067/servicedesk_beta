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

  // If user is ADMIN or TENANT_ADMIN - full access
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

  // For agents check their permissions
  if (session?.user.role === "AGENT") {
    const permissions = (session.user as any).permissions as AgentPermissions | null;
    
    if (permissions) {
      return permissions;
    }

    // By default agent has minimal permissions
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

  // Regular users have no permissions
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

