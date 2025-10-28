import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantWhereClause } from "@/lib/api-utils";

// GET /api/dashboard/stats - Получить статистику для дашборда
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "7d"; // 7d, 30d, 90d

    // Вычисляем дату начала периода
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case "7d":
        startDate.setDate(now.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(now.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    // Условие для фильтрации по ролям
    const whereCondition: any = {
      ...getTenantWhereClause(session),
      createdAt: {
        gte: startDate,
      },
    };

    // USER видит только свои тикеты
    if (session.user.role === "USER") {
      whereCondition.creatorId = session.user.id;
    } else if (session.user.role === "AGENT" && !session.user.permissions?.canViewAllTickets) {
      whereCondition.OR = [
        { assigneeId: session.user.id },
        { creatorId: session.user.id },
      ];
    }

    // Получаем тикеты за период
    const tickets = await prisma.ticket.findMany({
      where: whereCondition,
      select: {
        id: true,
        status: true,
        priority: true,
        createdAt: true,
        resolvedAt: true,
        categoryId: true,
        queueId: true,
      },
    });

    // Общая статистика
    const totalTickets = tickets.length;
    const openTickets = tickets.filter(t => t.status === "OPEN").length;
    const inProgressTickets = tickets.filter(t => t.status === "IN_PROGRESS").length;
    const resolvedTickets = tickets.filter(t => t.status === "RESOLVED" || t.status === "CLOSED").length;
    const pendingTickets = tickets.filter(t => t.status === "PENDING").length;

    // Статистика по приоритетам
    const priorityStats = {
      LOW: tickets.filter(t => t.priority === "LOW").length,
      MEDIUM: tickets.filter(t => t.priority === "MEDIUM").length,
      HIGH: tickets.filter(t => t.priority === "HIGH").length,
      URGENT: tickets.filter(t => t.priority === "URGENT").length,
    };

    // Тренд по дням
    const dailyTrend = [];
    const daysInPeriod = period === "7d" ? 7 : period === "30d" ? 30 : 90;
    
    for (let i = daysInPeriod - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const dayTickets = tickets.filter(t => {
        const ticketDate = new Date(t.createdAt);
        return ticketDate >= date && ticketDate < nextDate;
      });
      
      dailyTrend.push({
        date: date.toISOString().split('T')[0],
        created: dayTickets.length,
        resolved: dayTickets.filter(t => t.resolvedAt).length,
      });
    }

    // Статистика по категориям (топ 5)
    const categoryStats = await prisma.category.findMany({
      where: {
        tenantId: session.user.tenantId,
      },
      select: {
        id: true,
        name: true,
        color: true,
        _count: {
          select: {
            tickets: true,
          },
        },
      },
      orderBy: {
        tickets: {
          _count: "desc",
        },
      },
      take: 5,
    });

    // Статистика по очередям (топ 5)
    const queueStats = await prisma.queue.findMany({
      where: {
        tenantId: session.user.tenantId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        color: true,
        _count: {
          select: {
            tickets: true,
          },
        },
      },
      orderBy: {
        tickets: {
          _count: "desc",
        },
      },
      take: 5,
    });

    // Среднее время решения
    const resolvedTicketsWithTime = tickets.filter(t => t.resolvedAt && t.createdAt);
    const avgResolutionTime = resolvedTicketsWithTime.length > 0
      ? resolvedTicketsWithTime.reduce((sum, t) => {
          const created = new Date(t.createdAt).getTime();
          const resolved = new Date(t.resolvedAt!).getTime();
          return sum + (resolved - created);
        }, 0) / resolvedTicketsWithTime.length
      : 0;

    // Конвертируем в часы
    const avgResolutionHours = Math.round(avgResolutionTime / (1000 * 60 * 60));

    return NextResponse.json({
      overview: {
        total: totalTickets,
        open: openTickets,
        inProgress: inProgressTickets,
        resolved: resolvedTickets,
        pending: pendingTickets,
        avgResolutionHours,
      },
      priorities: priorityStats,
      dailyTrend,
      categories: categoryStats.map(c => ({
        name: c.name,
        value: c._count.tickets,
        color: c.color,
      })),
      queues: queueStats.map(q => ({
        name: q.name,
        value: q._count.tickets,
        color: q.color,
      })),
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}

