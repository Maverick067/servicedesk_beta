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
 * Change agent status
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

    // Check access rights
    const canChangeStatus =
      session.user.role === "ADMIN" ||
      session.user.role === "TENANT_ADMIN" ||
      session.user.id === params.id; // Agent can change their own status

    if (!canChangeStatus) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { status } = updateStatusSchema.parse(body);

    // Check if agent exists
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

    // Check that agent is from the same tenant (if not global admin)
    if (
      session.user.role !== "ADMIN" &&
      session.user.tenantId !== agent.tenantId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const oldStatus = agent.agentStatus;

    // Update status
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

    // If agent becomes unavailable (AWAY or ON_LEAVE), reassign their active tickets
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
 * Get current agent status
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

    // Check tenant access
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
