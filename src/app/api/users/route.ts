import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantWhereClause } from "@/lib/api-utils";

// GET /api/users - Get all organization users
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check access rights
    const canView = 
      session.user.role === "ADMIN" || 
      session.user.role === "TENANT_ADMIN" ||
      (session.user.role === "AGENT" && (
        session.user.permissions?.canInviteUsers ||
        session.user.permissions?.canResetPasswords ||
        session.user.permissions?.canDeleteUsers
      ));

    if (!canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Super-admin sees only TENANT_ADMINs (not regular users and agents)
    let whereClause: any = getTenantWhereClause(session);
    
    if (session.user.role === "ADMIN" && !session.user.tenantId) {
      // Global admin sees only TENANT_ADMINs
      whereClause = {
        role: "TENANT_ADMIN",
      };
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        isActive: true,
        createdAt: true,
        tenantId: true,
        tenant: {
          select: {
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            createdTickets: true,
            assignedTickets: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
