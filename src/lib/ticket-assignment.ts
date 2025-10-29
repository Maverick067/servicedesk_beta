import { prisma } from "./prisma";
import { AgentStatus, UserRole } from "@prisma/client";

/**
 * Automatic ticket distribution among agents
 * 
 * Logic:
 * 1. If category with assigned agent is specified - assign to them (if available)
 * 2. If category agent is unavailable or category has no agent - find least loaded agent
 * 3. Available agents: status AVAILABLE or BUSY
 * 4. Unavailable agents: status AWAY or ON_LEAVE
 */
export async function autoAssignTicket(params: {
  tenantId: string;
  categoryId?: string | null;
}): Promise<string | null> {
  const { tenantId, categoryId } = params;

  try {
    // Step 1: If category is specified, check assigned agent
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

      // If category agent exists and is available
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

    // Step 2: Find least loaded available agent
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
                  in: ["OPEN", "IN_PROGRESS"], // Only active tickets
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

    // Sort agents by number of active tickets (least loaded first)
    // Priority: AVAILABLE > BUSY
    agents.sort((a, b) => {
      // First sort by status (AVAILABLE first)
      if (a.agentStatus === AgentStatus.AVAILABLE && b.agentStatus !== AgentStatus.AVAILABLE) {
        return -1;
      }
      if (a.agentStatus !== AgentStatus.AVAILABLE && b.agentStatus === AgentStatus.AVAILABLE) {
        return 1;
      }
      // Then by number of active tickets
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
 * Check agent availability
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
 * Reassign tickets when agent status changes to unavailable
 */
export async function reassignAgentTickets(agentId: string): Promise<number> {
  try {
    // Get all active tickets of agent
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

    // Reassign each ticket
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

