/**
 * Движок выполнения правил автоматизации
 */

import { prisma } from "./prisma";

type TriggerType =
  | "TICKET_CREATED"
  | "TICKET_UPDATED"
  | "TICKET_ASSIGNED"
  | "STATUS_CHANGED"
  | "PRIORITY_CHANGED"
  | "COMMENT_ADDED"
  | "SLA_BREACH"
  | "TIME_BASED";

type ActionType =
  | "ASSIGN_TO_AGENT"
  | "CHANGE_STATUS"
  | "CHANGE_PRIORITY"
  | "ADD_COMMENT"
  | "SEND_EMAIL"
  | "SEND_NOTIFICATION"
  | "ADD_TAG"
  | "CALL_WEBHOOK";

interface Condition {
  field: string;
  operator: string;
  value: string;
}

interface Action {
  type: ActionType;
  value: string;
  [key: string]: any;
}

interface TicketData {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  categoryId: string | null;
  assigneeId: string | null;
  tenantId: string;
  [key: string]: any;
}

/**
 * Проверяет условие
 */
function evaluateCondition(condition: Condition, ticketData: TicketData): boolean {
  const fieldValue = ticketData[condition.field];
  const conditionValue = condition.value;

  switch (condition.operator) {
    case "equals":
      return String(fieldValue) === String(conditionValue);
    case "not_equals":
      return String(fieldValue) !== String(conditionValue);
    case "contains":
      return String(fieldValue).toLowerCase().includes(String(conditionValue).toLowerCase());
    case "not_contains":
      return !String(fieldValue).toLowerCase().includes(String(conditionValue).toLowerCase());
    case "greater_than":
      return Number(fieldValue) > Number(conditionValue);
    case "less_than":
      return Number(fieldValue) < Number(conditionValue);
    default:
      return false;
  }
}

/**
 * Проверяет все условия правила
 */
function evaluateConditions(conditions: Record<string, Condition>, ticketData: TicketData): boolean {
  const conditionArray = Object.values(conditions);
  
  if (conditionArray.length === 0) {
    return false;
  }

  // Все условия должны быть выполнены (AND logic)
  return conditionArray.every((condition) => evaluateCondition(condition, ticketData));
}

/**
 * Выполняет действие
 */
async function executeAction(action: Action, ticketData: TicketData): Promise<void> {
  try {
    switch (action.type) {
      case "CHANGE_STATUS":
        await prisma.ticket.update({
          where: { id: ticketData.id },
          data: { status: action.value },
        });
        break;

      case "CHANGE_PRIORITY":
        await prisma.ticket.update({
          where: { id: ticketData.id },
          data: { priority: action.value },
        });
        break;

      case "ASSIGN_TO_AGENT":
        await prisma.ticket.update({
          where: { id: ticketData.id },
          data: { assigneeId: action.value },
        });
        break;

      case "ADD_COMMENT":
        // Создаём системный комментарий
        await prisma.comment.create({
          data: {
            content: action.value,
            ticketId: ticketData.id,
            authorId: action.value || ticketData.assigneeId || ticketData.tenantId, // Fallback to system
            tenantId: ticketData.tenantId,
          },
        });
        break;

      case "SEND_NOTIFICATION":
        // Создаём уведомление
        if (ticketData.assigneeId) {
          await prisma.notification.create({
            data: {
              type: "TICKET_UPDATED",
              message: action.value,
              userId: ticketData.assigneeId,
              tenantId: ticketData.tenantId,
              resourceType: "ticket",
              resourceId: ticketData.id,
            },
          });
        }
        break;

      case "SEND_EMAIL":
        // TODO: Интеграция с email сервисом
        console.log(`[Automation] Send email: ${action.value} for ticket ${ticketData.id}`);
        break;

      case "ADD_TAG":
        // TODO: Добавление тега (если будет поле tags в Ticket)
        console.log(`[Automation] Add tag: ${action.value} to ticket ${ticketData.id}`);
        break;

      case "CALL_WEBHOOK":
        // TODO: Вызов webhook
        console.log(`[Automation] Call webhook: ${action.value} for ticket ${ticketData.id}`);
        break;

      default:
        console.warn(`[Automation] Unknown action type: ${action.type}`);
    }
  } catch (error) {
    console.error(`[Automation] Error executing action ${action.type}:`, error);
    throw error;
  }
}

/**
 * Выполняет правило автоматизации
 */
async function executeRule(ruleId: string, ticketData: TicketData): Promise<boolean> {
  try {
    const rule = await prisma.automationRule.findUnique({
      where: { id: ruleId },
    });

    if (!rule || !rule.isActive) {
      return false;
    }

    // Проверяем условия
    const conditionsMet = evaluateConditions(rule.conditions as any, ticketData);

    if (!conditionsMet) {
      return false;
    }

    // Выполняем действия
    const actions = rule.actions as Action[];
    for (const action of actions) {
      await executeAction(action, ticketData);
    }

    // Обновляем статистику выполнения
    await prisma.automationRule.update({
      where: { id: ruleId },
      data: {
        executionCount: { increment: 1 },
        lastExecutedAt: new Date(),
      },
    });

    return true;
  } catch (error) {
    console.error(`[Automation] Error executing rule ${ruleId}:`, error);
    return false;
  }
}

/**
 * Запускает правила автоматизации для тикета
 */
export async function runAutomationRules(
  triggerType: TriggerType,
  ticketData: TicketData
): Promise<void> {
  try {
    // Получаем все активные правила для данного триггера
    const rules = await prisma.automationRule.findMany({
      where: {
        tenantId: ticketData.tenantId,
        isActive: true,
        triggerType,
      },
      orderBy: { priority: "asc" },
    });

    if (rules.length === 0) {
      return;
    }

    console.log(
      `[Automation] Running ${rules.length} rules for trigger ${triggerType} on ticket ${ticketData.id}`
    );

    // Выполняем правила по порядку приоритета
    for (const rule of rules) {
      try {
        const executed = await executeRule(rule.id, ticketData);
        if (executed) {
          console.log(`[Automation] Rule "${rule.name}" executed successfully`);
        }
      } catch (error) {
        console.error(`[Automation] Error in rule "${rule.name}":`, error);
        // Продолжаем выполнение других правил даже если одно упало
      }
    }
  } catch (error) {
    console.error("[Automation] Error running automation rules:", error);
  }
}

/**
 * Хелпер для вызова из API routes
 */
export async function triggerAutomation(
  triggerType: TriggerType,
  ticketId: string
): Promise<void> {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        category: true,
        assignee: true,
      },
    });

    if (!ticket) {
      console.warn(`[Automation] Ticket ${ticketId} not found`);
      return;
    }

    await runAutomationRules(triggerType, ticket as any);
  } catch (error) {
    console.error("[Automation] Error triggering automation:", error);
  }
}

