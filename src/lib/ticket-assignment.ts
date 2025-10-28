import { prisma } from "./prisma";
import { AgentStatus, UserRole } from "@prisma/client";

/**
 * Автоматическое распределение тикета между агентами
 * 
 * Логика:
 * 1. Если указана категория с назначенным агентом - назначаем ему (если он доступен)
 * 2. Если агент категории недоступен или категория без агента - ищем наименее загруженного агента
 * 3. Доступные агенты: статус AVAILABLE или BUSY
 * 4. Недоступные агенты: статус AWAY или ON_LEAVE
 */
export async function autoAssignTicket(params: {
  tenantId: string;
  categoryId?: string | null;
}): Promise<string | null> {
  const { tenantId, categoryId } = params;

  try {
    // Шаг 1: Если указана категория, проверяем назначенного агента
    if (categoryId) {
      const categoryAgent = await prisma.categoryAgentAssignment.findFirst({
        where: {
          categoryId,
        },
        include: {
          agent: {
            select: {
              id: true,
              agentStatus: true,
              role: true,
              isActive: true,
              tenantId: true,
            },
          },
        },
      });

      // Если есть агент категории и он доступен
      if (
        categoryAgent &&
        categoryAgent.agent.isActive &&
        categoryAgent.agent.tenantId === tenantId &&
        categoryAgent.agent.role === UserRole.AGENT &&
        (categoryAgent.agent.agentStatus === AgentStatus.AVAILABLE ||
          categoryAgent.agent.agentStatus === AgentStatus.BUSY)
      ) {
        console.log(`✅ [AUTO-ASSIGN] Category agent found: ${categoryAgent.agent.id}`);
        return categoryAgent.agent.id;
      } else {
        console.log(`⚠️ [AUTO-ASSIGN] Category agent unavailable, finding alternative...`);
      }
    }

    // Шаг 2: Ищем наименее загруженного доступного агента
    const agents = await prisma.user.findMany({
      where: {
        tenantId,
        role: UserRole.AGENT,
        isActive: true,
        agentStatus: {
          in: [AgentStatus.AVAILABLE, AgentStatus.BUSY],
        },
      },
      select: {
        id: true,
        name: true,
        agentStatus: true,
        _count: {
          select: {
            assignedTickets: {
              where: {
                status: {
                  in: ["OPEN", "IN_PROGRESS"], // Только активные тикеты
                },
              },
            },
          },
        },
      },
    });

    if (agents.length === 0) {
      console.log(`❌ [AUTO-ASSIGN] No available agents found`);
      return null;
    }

    // Сортируем агентов по количеству активных тикетов (наименее загруженные первыми)
    // Приоритет: AVAILABLE > BUSY
    agents.sort((a, b) => {
      // Сначала сортируем по статусу (AVAILABLE первые)
      if (a.agentStatus === AgentStatus.AVAILABLE && b.agentStatus !== AgentStatus.AVAILABLE) {
        return -1;
      }
      if (a.agentStatus !== AgentStatus.AVAILABLE && b.agentStatus === AgentStatus.AVAILABLE) {
        return 1;
      }
      // Затем по количеству активных тикетов
      return a._count.assignedTickets - b._count.assignedTickets;
    });

    const selectedAgent = agents[0];
    console.log(
      `✅ [AUTO-ASSIGN] Selected agent: ${selectedAgent.name} (${selectedAgent.id}) with ${selectedAgent._count.assignedTickets} active tickets`
    );

    return selectedAgent.id;
  } catch (error) {
    console.error("❌ [AUTO-ASSIGN] Error:", error);
    return null;
  }
}

/**
 * Проверка доступности агента
 */
export async function isAgentAvailable(agentId: string): Promise<boolean> {
  try {
    const agent = await prisma.user.findUnique({
      where: { id: agentId },
      select: {
        isActive: true,
        role: true,
        agentStatus: true,
      },
    });

    if (!agent || !agent.isActive || agent.role !== UserRole.AGENT) {
      return false;
    }

    return (
      agent.agentStatus === AgentStatus.AVAILABLE ||
      agent.agentStatus === AgentStatus.BUSY
    );
  } catch (error) {
    console.error("❌ [isAgentAvailable] Error:", error);
    return false;
  }
}

/**
 * Переназначение тикетов при изменении статуса агента на недоступный
 */
export async function reassignAgentTickets(agentId: string): Promise<number> {
  try {
    // Получаем все активные тикеты агента
    const activeTickets = await prisma.ticket.findMany({
      where: {
        assigneeId: agentId,
        status: {
          in: ["OPEN", "IN_PROGRESS"],
        },
      },
      select: {
        id: true,
        tenantId: true,
        categoryId: true,
      },
    });

    if (activeTickets.length === 0) {
      return 0;
    }

    let reassignedCount = 0;

    // Переназначаем каждый тикет
    for (const ticket of activeTickets) {
      const newAgentId = await autoAssignTicket({
        tenantId: ticket.tenantId,
        categoryId: ticket.categoryId,
      });

      if (newAgentId && newAgentId !== agentId) {
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: { assigneeId: newAgentId },
        });
        reassignedCount++;
      }
    }

    console.log(`✅ [REASSIGN] Reassigned ${reassignedCount} tickets from agent ${agentId}`);
    return reassignedCount;
  } catch (error) {
    console.error("❌ [REASSIGN] Error:", error);
    return 0;
  }
}

