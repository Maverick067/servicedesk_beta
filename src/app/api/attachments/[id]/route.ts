import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const UPLOAD_DIR = join(process.cwd(), "uploads");

/**
 * GET /api/attachments/[id]
 * Скачивание файла
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Пытаемся найти вложение в обычных тикетах
    let attachment = await prisma.attachment.findUnique({
      where: { id: params.id },
      include: { ticket: true },
    });

    let isSupportTicket = false;

    // Если не нашли, ищем в support тикетах
    if (!attachment) {
      const supportAttachment = await prisma.supportAttachment.findUnique({
        where: { id: params.id },
        include: { ticket: true },
      });

      if (!supportAttachment) {
        return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
      }

      attachment = supportAttachment as any;
      isSupportTicket = true;
    }

    // Проверка прав доступа
    if (isSupportTicket) {
      const supportTicket = attachment.ticket as any;
      if (
        session.user.role !== "ADMIN" &&
        supportTicket.creatorId !== session.user.id
      ) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      const ticket = attachment.ticket as any;
      if (
        session.user.role === "USER" &&
        ticket.creatorId !== session.user.id
      ) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Читаем файл с диска
    const filepath = join(UPLOAD_DIR, attachment.filepath);

    if (!existsSync(filepath)) {
      return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
    }

    const file = await readFile(filepath);

    // Возвращаем файл с правильными заголовками
    return new NextResponse(file, {
      status: 200,
      headers: {
        "Content-Type": attachment.mimetype,
        "Content-Disposition": `attachment; filename="${attachment.filename}"`,
        "Content-Length": attachment.size.toString(),
      },
    });
  } catch (error: any) {
    console.error("Error downloading file:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/attachments/[id]
 * Удаление файла
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Пытаемся найти вложение в обычных тикетах
    let attachment = await prisma.attachment.findUnique({
      where: { id: params.id },
      include: { ticket: true },
    });

    let isSupportTicket = false;

    // Если не нашли, ищем в support тикетах
    if (!attachment) {
      const supportAttachment = await prisma.supportAttachment.findUnique({
        where: { id: params.id },
        include: { ticket: true },
      });

      if (!supportAttachment) {
        return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
      }

      attachment = supportAttachment as any;
      isSupportTicket = true;
    }

    // Проверка прав доступа (только создатель тикета или админы могут удалять)
    if (isSupportTicket) {
      const supportTicket = attachment.ticket as any;
      if (
        session.user.role !== "ADMIN" &&
        session.user.role !== "TENANT_ADMIN" &&
        supportTicket.creatorId !== session.user.id
      ) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      const ticket = attachment.ticket as any;
      if (
        session.user.role === "USER" &&
        ticket.creatorId !== session.user.id
      ) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Удаляем файл с диска
    const filepath = join(UPLOAD_DIR, attachment.filepath);
    if (existsSync(filepath)) {
      const { unlink } = await import("fs/promises");
      await unlink(filepath);
    }

    // Удаляем запись из базы
    if (isSupportTicket) {
      await prisma.supportAttachment.delete({
        where: { id: params.id },
      });
    } else {
      await prisma.attachment.delete({
        where: { id: params.id },
      });
    }

    return NextResponse.json({ message: "Attachment deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting file:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

