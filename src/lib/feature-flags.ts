/**
 * Feature Flags система для управления модулями на уровне tenant
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
 * Проверяет, включен ли модуль для tenant
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
 * Получает список включенных модулей
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
 * Обновляет состояние модуля
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
 * Типы планов подписки
 */
export type SubscriptionPlan = "FREE" | "PRO" | "ENTERPRISE";

/**
 * Определяет, какие модули доступны на каком плане
 */
export const MODULE_PLAN_REQUIREMENTS: Record<FeatureFlag, SubscriptionPlan> = {
  // Бесплатные модули (доступны на FREE плане)
  queues: "FREE",
  reports: "FREE",
  customFields: "FREE",
  savedFilters: "FREE",
  
  // PRO модули
  knowledge: "PRO",
  automation: "PRO",
  sla: "PRO",
  
  // ENTERPRISE модули
  assets: "ENTERPRISE",
  webhooks: "ENTERPRISE",
  ldap: "ENTERPRISE",
};

/**
 * Проверяет, доступен ли модуль на данном плане
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
 * Получает список бесплатных модулей
 */
export function getFreeModules(): FeatureFlag[] {
  return Object.entries(MODULE_PLAN_REQUIREMENTS)
    .filter(([_, plan]) => plan === "FREE")
    .map(([module]) => module as FeatureFlag);
}

/**
 * Метаданные модулей для UI
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
    name: "Очереди",
    description: "Организация и группировка тикетов по очередям",
    icon: "📥",
    color: "#8b5cf6",
    requiredPlan: "FREE",
  },
  sla: {
    name: "SLA",
    description: "Контроль времени ответа и решения, эскалации",
    icon: "⏱️",
    color: "#ef4444",
    requiredPlan: "PRO",
  },
  knowledge: {
    name: "База знаний",
    description: "Статьи, FAQ и документация для пользователей",
    icon: "📚",
    color: "#06b6d4",
    requiredPlan: "PRO",
  },
  automation: {
    name: "Автоматизация",
    description: "Триггеры, правила и автоматические действия",
    icon: "⚡",
    color: "#f59e0b",
    requiredPlan: "PRO",
  },
  assets: {
    name: "CMDB/Активы",
    description: "Управление IT-активами и оборудованием",
    icon: "💻",
    color: "#10b981",
    requiredPlan: "ENTERPRISE",
  },
  reports: {
    name: "Отчеты",
    description: "Аналитика, графики и экспорт данных",
    icon: "📊",
    color: "#6366f1",
    requiredPlan: "FREE",
  },
  webhooks: {
    name: "Webhooks",
    description: "Интеграции через HTTP callbacks",
    icon: "🔗",
    color: "#ec4899",
    requiredPlan: "ENTERPRISE",
  },
  ldap: {
    name: "LDAP/SSO",
    description: "Аутентификация через LDAP или Single Sign-On",
    icon: "🔐",
    color: "#8b5cf6",
    requiredPlan: "ENTERPRISE",
  },
  customFields: {
    name: "Кастомные поля",
    description: "Дополнительные поля для тикетов",
    icon: "📝",
    color: "#14b8a6",
    requiredPlan: "FREE",
  },
  savedFilters: {
    name: "Сохраненные фильтры",
    description: "Быстрый доступ к часто используемым фильтрам",
    icon: "🔍",
    color: "#f97316",
    requiredPlan: "FREE",
  },
};

/**
 * Получает настройки по умолчанию для нового tenant
 */
export function getDefaultTenantSettings(): TenantSettings {
  return {
    ticketPrefix: "TICKET",
    modules: {
      queues: true, // Включаем по умолчанию
      reports: true, // Включаем по умолчанию
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

