import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/agents/[id] - Получить информацию об агенте
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Агент может получить свою информацию
    // Админы и tenant админы могут получить информацию о любом агенте
    if (
      session.user.id !== params.id &&
      session.user.role !== "ADMIN" &&
      session.user.role !== "TENANT_ADMIN"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const agent = await prisma.user.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        agentStatus: true,
        permissions: true,
        createdAt: true,
      },
    });

    if (!agent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(agent);
  } catch (error) {
    console.error("Error fetching agent:", error);
    return NextResponse.json(
      { error: "Failed to fetch agent" },
      { status: 500 }
    );
  }
}

