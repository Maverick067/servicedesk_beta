import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateAgentStatusSchema = z.object({
  agentStatus: z.enum(["AVAILABLE", "BUSY", "AWAY", "ON_LEAVE"]),
});

// GET /api/agents - Получить всех агентов организации
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Только админы, tenant админы и агенты могут видеть агентов
    if (session.user.role !== "ADMIN" && session.user.role !== "TENANT_ADMIN" && session.user.role !== "AGENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const agents = await prisma.user.findMany({
      where: {
        tenantId: session.user.tenantId,
        role: "AGENT",
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        agentStatus: true,
        permissions: true,
        createdAt: true,
        _count: {
          select: {
            assignedTickets: {
              where: {
                status: {
                  in: ["OPEN", "IN_PROGRESS", "PENDING"],
                },
              },
            },
            categoryAssignments: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(agents);
  } catch (error) {
    console.error("Error fetching agents:", error);
    return NextResponse.json(
      { error: "Failed to fetch agents" },
      { status: 500 }
    );
  }
}

// PATCH /api/agents/[id]/status - Обновить статус агента
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Агент может обновить только свой статус
    // Админы и tenant админы могут обновлять статусы всех агентов
    if (session.user.role === "AGENT" && session.user.id !== params.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "TENANT_ADMIN" && session.user.role !== "AGENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateAgentStatusSchema.parse(body);

    // Проверяем, что агент существует и принадлежит к той же организации
    const agent = await prisma.user.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
        role: "AGENT",
        isActive: true,
      },
    });

    if (!agent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    // Обновляем статус агента
    const updatedAgent = await prisma.user.update({
      where: { id: params.id },
      data: { agentStatus: validatedData.agentStatus },
      select: {
        id: true,
        name: true,
        email: true,
        agentStatus: true,
      },
    });

    return NextResponse.json(updatedAgent);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating agent status:", error);
    return NextResponse.json(
      { error: "Failed to update agent status" },
      { status: 500 }
    );
  }
}


