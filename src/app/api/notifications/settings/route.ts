import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSettingsSchema = z.object({
  // Каналы доставки
  enableInApp: z.boolean().optional(),
  enableEmail: z.boolean().optional(),
  enablePush: z.boolean().optional(),
  
  // Группировка
  groupSimilar: z.boolean().optional(),
  groupingInterval: z.number().min(5).max(60).optional(),
  
  // Email
  emailFrequency: z.enum(["instant", "hourly", "daily", "off"]).optional(),
  emailDigestTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  
  // Типы уведомлений
  notifyTicketCreated: z.boolean().optional(),
  notifyTicketAssigned: z.boolean().optional(),
  notifyTicketStatusChanged: z.boolean().optional(),
  notifyTicketCommented: z.boolean().optional(),
  notifyTicketMentioned: z.boolean().optional(),
  notifyTicketEscalated: z.boolean().optional(),
  notifySlaBreach: z.boolean().optional(),
  
  // Приоритет и тихий режим
  priorityOverride: z.boolean().optional(),
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  quietHoursEnd: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
});

// GET /api/notifications/settings - Получить настройки уведомлений
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Получить или создать настройки
    let settings = await prisma.notificationSettings.findUnique({
      where: { userId: session.user.id },
    });

    // Если настроек нет, создать с дефолтными значениями
    if (!settings) {
      settings = await prisma.notificationSettings.create({
        data: {
          userId: session.user.id,
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching notification settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch notification settings" },
      { status: 500 }
    );
  }
}

// PATCH /api/notifications/settings - Обновить настройки уведомлений
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateSettingsSchema.parse(body);

    // Получить или создать настройки
    let settings = await prisma.notificationSettings.findUnique({
      where: { userId: session.user.id },
    });

    if (settings) {
      // Обновить существующие настройки
      settings = await prisma.notificationSettings.update({
        where: { userId: session.user.id },
        data: validatedData,
      });
    } else {
      // Создать новые настройки
      settings = await prisma.notificationSettings.create({
        data: {
          userId: session.user.id,
          ...validatedData,
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating notification settings:", error);
    return NextResponse.json(
      { error: "Failed to update notification settings" },
      { status: 500 }
    );
  }
}

