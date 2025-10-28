import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const assignAgentSchema = z.object({
  agentId: z.string().min(1, "Agent ID is required"),
});

// GET /api/categories/[id]/agents - Получить агентов, назначенных на категорию
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Только админы и tenant админы могут управлять назначениями
    if (session.user.role !== "ADMIN" && session.user.role !== "TENANT_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const assignments = await prisma.categoryAgentAssignment.findMany({
      where: {
        categoryId: params.id,
        agent: {
          tenantId: session.user.tenantId,
        },
      },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            email: true,
            agentStatus: true,
          },
        },
      },
    });

    return NextResponse.json(assignments);
  } catch (error) {
    console.error("Error fetching category agents:", error);
    return NextResponse.json(
      { error: "Failed to fetch category agents" },
      { status: 500 }
    );
  }
}

// POST /api/categories/[id]/agents - Назначить агента на категорию
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Проверяем права на назначение агентов
    const canAssign = 
      session.user.role === "ADMIN" || 
      session.user.role === "TENANT_ADMIN" ||
      (session.user.role === "AGENT" && session.user.permissions?.canAssignAgents);

    if (!canAssign) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = assignAgentSchema.parse(body);

    // Проверяем, что агент существует и принадлежит к той же организации
    const agent = await prisma.user.findFirst({
      where: {
        id: validatedData.agentId,
        tenantId: session.user.tenantId,
        role: "AGENT",
        isActive: true,
      },
    });

    if (!agent) {
      return NextResponse.json(
        { error: "Agent not found or not active" },
        { status: 404 }
      );
    }

    // Проверяем, что категория существует
    const category = await prisma.category.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // Создаем назначение
    const assignment = await prisma.categoryAgentAssignment.create({
      data: {
        categoryId: params.id,
        agentId: validatedData.agentId,
      },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            email: true,
            agentStatus: true,
          },
        },
      },
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error assigning agent to category:", error);
    return NextResponse.json(
      { error: "Failed to assign agent to category" },
      { status: 500 }
    );
  }
}

// DELETE /api/categories/[id]/agents - Удалить назначение агента на категорию
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Проверяем права на назначение агентов
    const canAssign = 
      session.user.role === "ADMIN" || 
      session.user.role === "TENANT_ADMIN" ||
      (session.user.role === "AGENT" && session.user.permissions?.canAssignAgents);

    if (!canAssign) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = assignAgentSchema.parse(body);
    const agentId = validatedData.agentId;

    await prisma.categoryAgentAssignment.deleteMany({
      where: {
        categoryId: params.id,
        agentId: agentId,
        agent: {
          tenantId: session.user.tenantId,
        },
      },
    });

    return NextResponse.json({ message: "Assignment removed successfully" });
  } catch (error) {
    console.error("Error removing agent assignment:", error);
    return NextResponse.json(
      { error: "Failed to remove agent assignment" },
      { status: 500 }
    );
  }
}
