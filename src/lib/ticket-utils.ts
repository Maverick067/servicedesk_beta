/**
 * Utilities for working with tickets
 */

/**
 * Formats ticket number with tenant prefix
 * @param tenantSlug - Organization slug
 * @param ticketNumber - Ticket number
 * @returns Formatted ticket number (e.g., "COMPANY-001")
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
 * Gets ticket prefix from tenant settings
 * @param settings - Tenant settings (JSON)
 * @returns Ticket prefix
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
 * Checks if module is enabled for tenant
 * @param settings - Tenant settings (JSON)
 * @param moduleName - Module name
 * @returns true if module is enabled
 */
export function isModuleEnabled(settings: any, moduleName: string): boolean {
  try {
    const parsed = typeof settings === 'string' ? JSON.parse(settings) : settings;
    return parsed?.modules?.[moduleName] === true;
  } catch {
    return false;
  }
}

