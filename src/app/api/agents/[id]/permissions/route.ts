import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateAgentPermissionsSchema = z.object({
  permissions: z.object({
    canCreateCategories: z.boolean(),
    canEditCategories: z.boolean(),
    canDeleteCategories: z.boolean(),
    canAssignAgents: z.boolean(),
    canResetPasswords: z.boolean(),
    canInviteUsers: z.boolean(),
    canDeleteUsers: z.boolean(),
    canViewAllTickets: z.boolean(),
    canEditAllTickets: z.boolean(),
  }),
});

// PATCH /api/agents/[id]/permissions - Обновить разрешения агента
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Только админы и tenant админы могут управлять разрешениями агентов
    if (session.user.role !== "ADMIN" && session.user.role !== "TENANT_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateAgentPermissionsSchema.parse(body);

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

    // Обновляем разрешения агента
    const updatedAgent = await prisma.user.update({
      where: { id: params.id },
      data: { permissions: validatedData.permissions },
      select: {
        id: true,
        name: true,
        email: true,
        agentStatus: true,
        permissions: true,
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

    console.error("Error updating agent permissions:", error);
    return NextResponse.json(
      { error: "Failed to update agent permissions" },
      { status: 500 }
    );
  }
}
