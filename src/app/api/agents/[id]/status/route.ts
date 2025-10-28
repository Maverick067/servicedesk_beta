import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { AgentStatus } from "@prisma/client";
import { reassignAgentTickets } from "@/lib/ticket-assignment";

const updateStatusSchema = z.object({
  status: z.enum(["AVAILABLE", "BUSY", "AWAY", "ON_LEAVE"]),
});

/**
 * PATCH /api/agents/[id]/status
 * Изменение статуса агента
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Проверяем права доступа
    const canChangeStatus =
      session.user.role === "ADMIN" ||
      session.user.role === "TENANT_ADMIN" ||
      session.user.id === params.id; // Агент может менять свой статус

    if (!canChangeStatus) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { status } = updateStatusSchema.parse(body);

    // Проверяем существование агента
    const agent = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        role: true,
        agentStatus: true,
        tenantId: true,
        isActive: true,
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (agent.role !== "AGENT") {
      return NextResponse.json(
        { error: "User is not an agent" },
        { status: 400 }
      );
    }

    // Проверяем, что агент из того же tenant (если не глобальный админ)
    if (
      session.user.role !== "ADMIN" &&
      session.user.tenantId !== agent.tenantId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const oldStatus = agent.agentStatus;

    // Обновляем статус
    const updatedAgent = await prisma.user.update({
      where: { id: params.id },
      data: { agentStatus: status },
      select: {
        id: true,
        name: true,
        email: true,
        agentStatus: true,
      },
    });

    // Если агент становится недоступным (AWAY или ON_LEAVE), переназначаем его активные тикеты
    const isNowUnavailable =
      (status === AgentStatus.AWAY || status === AgentStatus.ON_LEAVE) &&
      (oldStatus === AgentStatus.AVAILABLE || oldStatus === AgentStatus.BUSY);

    if (isNowUnavailable) {
      console.log(`🔄 Agent ${params.id} is now unavailable. Reassigning tickets...`);
      const reassignedCount = await reassignAgentTickets(params.id);
      console.log(`✅ Reassigned ${reassignedCount} tickets from agent ${params.id}`);
    }

    return NextResponse.json({
      ...updatedAgent,
      message: `Status updated to ${status}`,
      reassignedTickets: isNowUnavailable
        ? await reassignAgentTickets(params.id)
        : 0,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid status value", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating agent status:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agents/[id]/status
 * Получить текущий статус агента
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const agent = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        agentStatus: true,
        isActive: true,
        _count: {
          select: {
            assignedTickets: {
              where: {
                status: {
                  in: ["OPEN", "IN_PROGRESS"],
                },
              },
            },
          },
        },
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (agent.role !== "AGENT") {
      return NextResponse.json(
        { error: "User is not an agent" },
        { status: 400 }
      );
    }

    // Проверяем доступ к тенанту
    if (session.user.role !== "ADMIN") {
      const userTenant = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { tenantId: true },
      });

      const agentTenant = await prisma.user.findUnique({
        where: { id: params.id },
        select: { tenantId: true },
      });

      if (userTenant?.tenantId !== agentTenant?.tenantId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.json({
      id: agent.id,
      name: agent.name,
      email: agent.email,
      status: agent.agentStatus,
      isActive: agent.isActive,
      activeTicketsCount: agent._count.assignedTickets,
    });
  } catch (error: any) {
    console.error("Error fetching agent status:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
