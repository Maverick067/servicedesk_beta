import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createCategorySchema = z.object({
  name: z.string().min(2, "Название должно содержать минимум 2 символа"),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Некорректный цвет"),
});

// GET /api/categories - Получить все категории
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Все пользователи могут видеть категории своей организации
    // Глобальный ADMIN видит категории всех организаций
    const where: any = {};
    if (session.user.role !== "ADMIN") {
      if (!session.user.tenantId) {
        return NextResponse.json({ error: "No tenant assigned" }, { status: 403 });
      }
      where.tenantId = session.user.tenantId;
    }

    const categories = await prisma.category.findMany({
      where,
      include: {
        _count: {
          select: {
            tickets: true,
          },
        },
        agentAssignments: {
          include: {
            agent: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

// POST /api/categories - Создать новую категорию
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Проверяем права на создание категорий
    const canCreate = 
      session.user.role === "ADMIN" || 
      session.user.role === "TENANT_ADMIN" ||
      (session.user.role === "AGENT" && session.user.permissions?.canCreateCategories);

    if (!canCreate) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createCategorySchema.parse(body);

    // Проверяем уникальность названия в рамках организации
    const existingCategory = await prisma.category.findFirst({
      where: {
        name: validatedData.name,
        tenantId: session.user.tenantId,
      },
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: "Категория с таким названием уже существует" },
        { status: 400 }
      );
    }

    const category = await prisma.category.create({
      data: {
        name: validatedData.name,
        description: validatedData.description || null,
        color: validatedData.color,
        tenantId: session.user.tenantId!,
      },
      include: {
        _count: {
          select: {
            tickets: true,
          },
        },
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating category:", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
}
