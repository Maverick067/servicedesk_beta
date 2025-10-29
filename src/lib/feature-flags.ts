/**
 * Feature Flags system for managing modules at tenant level
 */

export type FeatureFlag =
  | "queues"
  | "sla"
  | "knowledge"
  | "automation"
  | "assets"
  | "reports"
  | "webhooks"
  | "ldap"
  | "customFields"
  | "savedFilters";

export interface TenantModules {
  queues?: boolean;
  sla?: boolean;
  knowledge?: boolean;
  automation?: boolean;
  assets?: boolean;
  reports?: boolean;
  webhooks?: boolean;
  ldap?: boolean;
  customFields?: boolean;
  savedFilters?: boolean;
}

export interface TenantSettings {
  ticketPrefix?: string;
  modules?: TenantModules;
  [key: string]: any;
}

/**
 * Checks if module is enabled for tenant
 */
export function isModuleEnabled(
  settings: TenantSettings | null,
  module: FeatureFlag
): boolean {
  if (!settings || !settings.modules) {
    return false;
  }
  return settings.modules[module] === true;
}

/**
 * Gets list of enabled modules
 */
export function getEnabledModules(settings: TenantSettings | null): FeatureFlag[] {
  if (!settings || !settings.modules) {
    return [];
  }
  
  return Object.entries(settings.modules)
    .filter(([_, enabled]) => enabled === true)
    .map(([module]) => module as FeatureFlag);
}

/**
 * Updates module state
 */
export function toggleModule(
  settings: TenantSettings | null,
  module: FeatureFlag,
  enabled: boolean
): TenantSettings {
  const currentSettings = settings || { modules: {} };
  
  return {
    ...currentSettings,
    modules: {
      ...currentSettings.modules,
      [module]: enabled,
    },
  };
}

/**
 * Subscription plan types
 */
export type SubscriptionPlan = "FREE" | "PRO" | "ENTERPRISE";

/**
 * Defines which modules are available on which plan
 */
export const MODULE_PLAN_REQUIREMENTS: Record<FeatureFlag, SubscriptionPlan> = {
  // Free modules (available on FREE plan)
  queues: "FREE",
  reports: "FREE",
  customFields: "FREE",
  savedFilters: "FREE",
  
  // PRO modules
  knowledge: "PRO",
  automation: "PRO",
  sla: "PRO",
  
  // ENTERPRISE modules
  assets: "ENTERPRISE",
  webhooks: "ENTERPRISE",
  ldap: "ENTERPRISE",
};

/**
 * Checks if module is available on given plan
 */
export function isModuleAvailableOnPlan(
  module: FeatureFlag,
  currentPlan: SubscriptionPlan
): boolean {
  const requiredPlan = MODULE_PLAN_REQUIREMENTS[module];
  
  const planHierarchy: Record<SubscriptionPlan, number> = {
    FREE: 0,
    PRO: 1,
    ENTERPRISE: 2,
  };
  
  return planHierarchy[currentPlan] >= planHierarchy[requiredPlan];
}

/**
 * Gets list of free modules
 */
export function getFreeModules(): FeatureFlag[] {
  return Object.entries(MODULE_PLAN_REQUIREMENTS)
    .filter(([_, plan]) => plan === "FREE")
    .map(([module]) => module as FeatureFlag);
}

/**
 * Module metadata for UI
 */
export const MODULE_METADATA: Record<
  FeatureFlag,
  {
    name: string;
    description: string;
    icon: string;
    color: string;
    requiredPlan: SubscriptionPlan;
    comingSoon?: boolean;
  }
> = {
  queues: {
    name: "Queues",
    description: "Organization and grouping of tickets by queues",
    icon: "📥",
    color: "#8b5cf6",
    requiredPlan: "FREE",
  },
  sla: {
    name: "SLA",
    description: "Response and resolution time control, escalations",
    icon: "⏱️",
    color: "#ef4444",
    requiredPlan: "PRO",
  },
  knowledge: {
    name: "Knowledge Base",
    description: "Articles, FAQ and documentation for users",
    icon: "📚",
    color: "#06b6d4",
    requiredPlan: "PRO",
  },
  automation: {
    name: "Automation",
    description: "Triggers, rules and automatic actions",
    icon: "⚡",
    color: "#f59e0b",
    requiredPlan: "PRO",
  },
  assets: {
    name: "CMDB/Assets",
    description: "IT assets and equipment management",
    icon: "💻",
    color: "#10b981",
    requiredPlan: "ENTERPRISE",
  },
  reports: {
    name: "Reports",
    description: "Analytics, charts and data export",
    icon: "📊",
    color: "#6366f1",
    requiredPlan: "FREE",
  },
  webhooks: {
    name: "Webhooks",
    description: "Integrations via HTTP callbacks",
    icon: "🔗",
    color: "#ec4899",
    requiredPlan: "ENTERPRISE",
  },
  ldap: {
    name: "LDAP/SSO",
    description: "Authentication via LDAP or Single Sign-On",
    icon: "🔐",
    color: "#8b5cf6",
    requiredPlan: "ENTERPRISE",
  },
  customFields: {
    name: "Custom Fields",
    description: "Additional fields for tickets",
    icon: "📝",
    color: "#14b8a6",
    requiredPlan: "FREE",
  },
  savedFilters: {
    name: "Saved Filters",
    description: "Quick access to frequently used filters",
    icon: "🔍",
    color: "#f97316",
    requiredPlan: "FREE",
  },
};

/**
 * Gets default settings for new tenant
 */
export function getDefaultTenantSettings(): TenantSettings {
  return {
    ticketPrefix: "TICKET",
    modules: {
      queues: true, // Enable by default
      reports: true, // Enable by default
      sla: false,
      knowledge: false,
      automation: false,
      assets: false,
      webhooks: false,
      ldap: false,
      customFields: false,
      savedFilters: false,
    },
  };
}

