import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateFilterSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  isDefault: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  sortOrder: z.number().optional(),
  filters: z.record(z.any()).optional(),
});

// GET /api/filters/[id] - Получить конкретный фильтр
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const filter = await prisma.savedFilter.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
        OR: [
          { userId: session.user.id },
          { isPublic: true },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!filter) {
      return NextResponse.json({ error: "Filter not found" }, { status: 404 });
    }

    return NextResponse.json(filter);
  } catch (error) {
    console.error("Error fetching filter:", error);
    return NextResponse.json(
      { error: "Failed to fetch filter" },
      { status: 500 }
    );
  }
}

// PATCH /api/filters/[id] - Обновить фильтр
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Проверить права доступа
    const existingFilter = await prisma.savedFilter.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
        userId: session.user.id, // Только владелец может редактировать
      },
    });

    if (!existingFilter) {
      return NextResponse.json(
        { error: "Filter not found or access denied" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = updateFilterSchema.parse(body);

    // Если фильтр помечен как default, снять флаг с других фильтров пользователя
    if (validatedData.isDefault) {
      await prisma.savedFilter.updateMany({
        where: {
          userId: session.user.id,
          isDefault: true,
          id: { not: params.id },
        },
        data: {
          isDefault: false,
        },
      });
    }

    const filter = await prisma.savedFilter.update({
      where: { id: params.id },
      data: validatedData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(filter);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating filter:", error);
    return NextResponse.json(
      { error: "Failed to update filter" },
      { status: 500 }
    );
  }
}

// DELETE /api/filters/[id] - Удалить фильтр
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Проверить права доступа
    const existingFilter = await prisma.savedFilter.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
        userId: session.user.id,
      },
    });

    if (!existingFilter) {
      return NextResponse.json(
        { error: "Filter not found or access denied" },
        { status: 404 }
      );
    }

    await prisma.savedFilter.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting filter:", error);
    return NextResponse.json(
      { error: "Failed to delete filter" },
      { status: 500 }
    );
  }
}

