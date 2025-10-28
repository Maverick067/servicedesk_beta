import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/users - Получить всех пользователей
 * Только для глобальных ADMIN
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Супер-админ видит только TENANT_ADMIN'ов (не обычных пользователей и агентов)
    const users = await prisma.user.findMany({
      where: {
        role: "TENANT_ADMIN",
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        tenantId: true,
        createdAt: true,
        tenant: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
      orderBy: [
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json(users);
  } catch (error: any) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

