/**
 * Утилиты для работы с тикетами
 */

/**
 * Форматирует номер тикета с префиксом tenant
 * @param tenantSlug - Slug организации
 * @param ticketNumber - Номер тикета
 * @returns Отформатированный номер тикета (например, "COMPANY-001")
 */
export function formatTicketNumber(tenantSlug: string, ticketNumber: number | null | undefined): string {
  if (!ticketNumber) {
    return "N/A";
  }
  
  const prefix = tenantSlug.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const paddedNumber = String(ticketNumber).padStart(4, '0');
  
  return `${prefix}-${paddedNumber}`;
}

/**
 * Получает префикс для номеров тикетов из настроек tenant
 * @param settings - Настройки tenant (JSON)
 * @returns Префикс для тикетов
 */
export function getTicketPrefix(settings: any): string {
  try {
    const parsed = typeof settings === 'string' ? JSON.parse(settings) : settings;
    return parsed?.ticketPrefix || 'TICKET';
  } catch {
    return 'TICKET';
  }
}

/**
 * Проверяет, включен ли модуль для tenant
 * @param settings - Настройки tenant (JSON)
 * @param moduleName - Название модуля
 * @returns true если модуль включен
 */
export function isModuleEnabled(settings: any, moduleName: string): boolean {
  try {
    const parsed = typeof settings === 'string' ? JSON.parse(settings) : settings;
    return parsed?.modules?.[moduleName] === true;
  } catch {
    return false;
  }
}

