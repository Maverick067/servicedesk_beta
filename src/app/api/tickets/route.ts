import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createTicketNotifications } from "@/lib/notifications";
import { createAuditLog, getClientIp, getUserAgent } from "@/lib/audit-log";
import { calculateSlaDueDate } from "@/lib/sla-utils";
import { autoAssignTicket } from "@/lib/ticket-assignment";

const createTicketSchema = z.object({
  title: z.string().min(3, "Заголовок должен содержать минимум 3 символа"),
  description: z.string().min(5, "Описание должно содержать минимум 5 символов"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  queueId: z.string().optional(),
  categoryId: z.string().optional(),
  customFields: z.record(z.string()).optional(), // { fieldId: value }
});

// GET /api/tickets - Получить все тикеты (с учетом tenant)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const queueId = searchParams.get("queue");

    const where: any = {};

    // Глобальный ADMIN (без tenantId) НЕ видит обычные тикеты
    if (session.user.role === "ADMIN" && !session.user.tenantId) {
      // Супер-админ работает только с support-тикетами
      return NextResponse.json([]);
    }

    // Все остальные роли фильтруем по tenantId
    if (!session.user.tenantId) {
      return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
    }
    where.tenantId = session.user.tenantId;

    // Логика видимости тикетов:
    // - USER: видит только свои тикеты (созданные им)
    // - AGENT: видит ВСЕ тикеты своего тенанта (поддержка всех клиентов)
    // - TENANT_ADMIN: видит ВСЕ тикеты своей организации
    if (session.user.role === "USER") {
      where.creatorId = session.user.id;
    }
    // AGENT и TENANT_ADMIN видят все тикеты своего тенанта (фильтр по tenantId уже установлен)

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (queueId) {
      where.queueId = queueId;
    }

    const tickets = await prisma.ticket.findMany({
      where,
      select: {
        id: true,
        number: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        createdAt: true,
        slaDueDate: true,
        slaBreached: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        category: true,
        queue: true,
        tenant: {
          select: {
            slug: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(tickets);
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return NextResponse.json(
      { error: "Failed to fetch tickets" },
      { status: 500 }
    );
  }
}

// POST /api/tickets - Создать новый тикет
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Супер-админ не может создавать обычные тикеты (только support-тикеты)
    if (session.user.role === "ADMIN" && !session.user.tenantId) {
      return NextResponse.json(
        { error: "Super admins cannot create regular tickets. Use support tickets instead." },
        { status: 403 }
      );
    }

    // Проверяем наличие tenantId
    if (!session.user.tenantId) {
      return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = createTicketSchema.parse(body);

    // Генерируем следующий номер тикета для этого tenant
    const lastTicket = await prisma.ticket.findFirst({
      where: { tenantId: session.user.tenantId },
      orderBy: { number: "desc" },
      select: { number: true },
    });

    const nextNumber = (lastTicket?.number || 0) + 1;

    // Вычисляем SLA для тикета
    const now = new Date();
    const slaData = await calculateSlaDueDate({
      priority: validatedData.priority,
      categoryId: validatedData.categoryId || null,
      queueId: validatedData.queueId || null,
      tenantId: session.user.tenantId,
      createdAt: now,
    });

    // Создаем тикет
    const ticket = await prisma.ticket.create({
      data: {
        number: nextNumber,
        title: validatedData.title,
        description: validatedData.description,
        priority: validatedData.priority,
        queueId: validatedData.queueId,
        categoryId: validatedData.categoryId,
        tenantId: session.user.tenantId,
        creatorId: session.user.id,
        status: "OPEN",
        slaId: slaData?.slaId,
        slaDueDate: slaData?.slaDueDate,
        slaBreached: false,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        category: true,
        queue: true,
        slaPolicy: true,
      },
    });

    // Сохраняем значения кастомных полей
    if (validatedData.customFields && Object.keys(validatedData.customFields).length > 0) {
      const customFieldValues = Object.entries(validatedData.customFields).map(
        ([fieldId, value]) => ({
          customFieldId: fieldId,
          ticketId: ticket.id,
          value: String(value),
        })
      );

      await prisma.customFieldValue.createMany({
        data: customFieldValues,
      });
    }

    // 🤖 Автоматическое распределение тикета между агентами
    const assignedAgentId = await autoAssignTicket({
      tenantId: session.user.tenantId,
      categoryId: validatedData.categoryId || null,
    });

    // Обновляем тикет с назначенным агентом
    if (assignedAgentId) {
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { assigneeId: assignedAgentId },
      });
    }

    // Создаем уведомления о новом тикете
    try {
      await createTicketNotifications(
        ticket.id,
        "TICKET_CREATED",
        ticket.title,
        session.user.id,
        assignedAgentId || undefined
      );
    } catch (error) {
      console.error("Error creating notifications:", error);
      // Не прерываем создание тикета из-за ошибки уведомлений
    }

    // Логируем создание тикета
    await createAuditLog({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "CREATE",
      resourceType: "TICKET",
      resourceId: ticket.id,
      metadata: {
        title: ticket.title,
        priority: ticket.priority,
        categoryId: ticket.categoryId,
        number: ticket.number,
      },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating ticket:", error);
    return NextResponse.json(
      { error: "Failed to create ticket" },
      { status: 500 }
    );
  }
}
