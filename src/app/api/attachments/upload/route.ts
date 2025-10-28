import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const UPLOAD_DIR = join(process.cwd(), "uploads");
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/x-zip-compressed",
];

/**
 * POST /api/attachments/upload
 * Загрузка файла и сохранение метаданных в базу
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const ticketId = formData.get("ticketId") as string | null;
    const ticketType = formData.get("ticketType") as string | "regular"; // "regular" или "support"

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ticketId) {
      return NextResponse.json({ error: "Ticket ID is required" }, { status: 400 });
    }

    // Проверка типа файла
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `File type ${file.type} is not allowed` },
        { status: 400 }
      );
    }

    // Проверка размера файла
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
        { status: 400 }
      );
    }

    // Проверка прав доступа к тикету
    if (ticketType === "support") {
      const supportTicket = await prisma.supportTicket.findUnique({
        where: { id: ticketId },
      });

      if (!supportTicket) {
        return NextResponse.json({ error: "Support ticket not found" }, { status: 404 });
      }

      // Только создатель или супер-админ могут загружать файлы
      if (
        session.user.role !== "ADMIN" &&
        supportTicket.creatorId !== session.user.id
      ) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
      });

      if (!ticket) {
        return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
      }

      // Проверка прав доступа к обычному тикету
      if (session.user.role === "USER" && ticket.creatorId !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Создаем директорию uploads если её нет
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    // Генерируем уникальное имя файла
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split(".").pop();
    const filename = `${timestamp}-${randomString}.${extension}`;
    const filepath = join(UPLOAD_DIR, filename);

    // Сохраняем файл на диск
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Сохраняем метаданные в базу
    if (ticketType === "support") {
      const attachment = await prisma.supportAttachment.create({
        data: {
          filename: file.name,
          filepath: filename, // Сохраняем только имя файла, не полный путь
          mimetype: file.type,
          size: file.size,
          ticketId,
        },
      });

      return NextResponse.json(attachment, { status: 201 });
    } else {
      const attachment = await prisma.attachment.create({
        data: {
          filename: file.name,
          filepath: filename,
          mimetype: file.type,
          size: file.size,
          ticketId,
        },
      });

      return NextResponse.json(attachment, { status: 201 });
    }
  } catch (error: any) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

