import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSettingsSchema = z.object({
  // Delivery channels
  enableInApp: z.boolean().optional(),
  enableEmail: z.boolean().optional(),
  enablePush: z.boolean().optional(),
  
  // Grouping
  groupSimilar: z.boolean().optional(),
  groupingInterval: z.number().min(5).max(60).optional(),
  
  // Email
  emailFrequency: z.enum(["instant", "hourly", "daily", "off"]).optional(),
  emailDigestTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  
  // Notification types
  notifyTicketCreated: z.boolean().optional(),
  notifyTicketAssigned: z.boolean().optional(),
  notifyTicketStatusChanged: z.boolean().optional(),
  notifyTicketCommented: z.boolean().optional(),
  notifyTicketMentioned: z.boolean().optional(),
  notifyTicketEscalated: z.boolean().optional(),
  notifySlaBreach: z.boolean().optional(),
  
  // Priority and quiet hours
  priorityOverride: z.boolean().optional(),
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  quietHoursEnd: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
});

// GET /api/notifications/settings - Get notification settings
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

    // If no settings exist, create with default values
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

// PATCH /api/notifications/settings - Update notification settings
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
      // Update existing settings
      settings = await prisma.notificationSettings.update({
        where: { userId: session.user.id },
        data: validatedData,
      });
    } else {
      // Create new settings
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

