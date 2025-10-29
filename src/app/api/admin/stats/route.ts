import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/stats - Get statistics for admin panel
 * Only for global ADMIN
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get statistics
    const [totalTenants, totalUsers, totalTickets, totalAgents] = await Promise.all([
      prisma.tenant.count(),
      prisma.user.count(),
      prisma.ticket.count(),
      prisma.user.count({
        where: {
          role: { in: ["AGENT", "TENANT_ADMIN"] }
        }
      })
    ]);

    // Count active tenants (with at least one ticket in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeTenants = await prisma.tenant.count({
      where: {
        tickets: {
          some: {
            createdAt: {
              gte: thirtyDaysAgo
            }
          }
        }
      }
    });

    return NextResponse.json({
      totalTenants,
      totalUsers,
      totalTickets,
      totalAgents,
      activeTenants,
    });
  } catch (error: any) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

