import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateCategorySchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

// GET /api/categories/[id] - Получить категорию
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Только админы и tenant админы могут видеть категории
    if (session.user.role !== "ADMIN" && session.user.role !== "TENANT_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const category = await prisma.category.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
      include: {
        _count: {
          select: {
            tickets: true,
          },
        },
      },
    });

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error("Error fetching category:", error);
    return NextResponse.json(
      { error: "Failed to fetch category" },
      { status: 500 }
    );
  }
}

// PATCH /api/categories/[id] - Обновить категорию
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Проверяем права на редактирование категорий
    const canEdit = 
      session.user.role === "ADMIN" || 
      session.user.role === "TENANT_ADMIN" ||
      (session.user.role === "AGENT" && session.user.permissions?.canEditCategories);

    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateCategorySchema.parse(body);

    // Проверяем существование категории
    const existingCategory = await prisma.category.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
    });

    if (!existingCategory) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // Проверяем уникальность названия (если изменяется)
    if (validatedData.name && validatedData.name !== existingCategory.name) {
      const nameExists = await prisma.category.findFirst({
        where: {
          name: validatedData.name,
          tenantId: session.user.tenantId,
          id: { not: params.id },
        },
      });

      if (nameExists) {
        return NextResponse.json(
          { error: "Категория с таким названием уже существует" },
          { status: 400 }
        );
      }
    }

    const category = await prisma.category.update({
      where: { id: params.id },
      data: validatedData,
      include: {
        _count: {
          select: {
            tickets: true,
          },
        },
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating category:", error);
    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 }
    );
  }
}

// DELETE /api/categories/[id] - Удалить категорию
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Проверяем права на удаление категорий
    const canDelete = 
      session.user.role === "ADMIN" || 
      session.user.role === "TENANT_ADMIN" ||
      (session.user.role === "AGENT" && session.user.permissions?.canDeleteCategories);

    if (!canDelete) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const category = await prisma.category.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
    });

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // Проверяем, есть ли тикеты в этой категории
    const ticketsCount = await prisma.ticket.count({
      where: {
        categoryId: params.id,
      },
    });

    if (ticketsCount > 0) {
      return NextResponse.json(
        { error: "Нельзя удалить категорию, в которой есть тикеты" },
        { status: 400 }
      );
    }

    await prisma.category.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    );
  }
}
