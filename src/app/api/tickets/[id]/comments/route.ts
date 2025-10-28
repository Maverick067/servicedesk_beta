import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createCommentNotification } from "@/lib/notifications";

const createCommentSchema = z.object({
  content: z.string().min(1, "Комментарий не может быть пустым"),
  isInternal: z.boolean().optional().default(false),
});

// POST /api/tickets/[id]/comments - Добавить комментарий
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createCommentSchema.parse(body);

    // Проверяем доступ к тикету
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Логика доступа к комментариям:
    // - USER: может комментировать только свои тикеты
    // - AGENT: может комментировать все тикеты организации
    // - TENANT_ADMIN: может комментировать все тикеты организации
    // - ADMIN: может комментировать все тикеты организации
    if (session.user.role === "USER" && ticket.creatorId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Только агенты и админы могут создавать внутренние комментарии
    const isInternal =
      session.user.role !== "USER" ? validatedData.isInternal : false;

    const comment = await prisma.comment.create({
      data: {
        content: validatedData.content,
        isInternal,
        ticketId: params.id,
        authorId: session.user.id,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
          },
        },
      },
    });

    // Создаем уведомления о новом комментарии
    try {
      await createCommentNotification(
        params.id,
        session.user.id,
        validatedData.content
      );
    } catch (error) {
      console.error("Error creating comment notifications:", error);
      // Не прерываем создание комментария из-за ошибки уведомлений
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating comment:", error);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}

