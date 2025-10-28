import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import slugify from "slugify";
import { createAuditLog } from "@/lib/audit-log";
import { getTenantWhereClause, getTenantIdForCreate } from "@/lib/api-utils";

// Validation schema
const createArticleSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  excerpt: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  categoryId: z.string().optional(),
  isPublic: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  attachments: z.array(z.string()).default([]),
});

// GET /api/knowledge - Получить все статьи
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const categoryId = searchParams.get("categoryId");
    const tag = searchParams.get("tag");
    const search = searchParams.get("search");

    const where: any = {
      ...getTenantWhereClause(session),
    };

    // Фильтр по статусу
    if (status && status !== "ALL") {
      where.status = status;
    }

    // Показывать только опубликованные статьи обычным пользователям
    if (session.user.role === "USER") {
      where.status = "PUBLISHED";
      where.isPublic = true;
    }

    // Фильтр по категории
    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Фильтр по тегу
    if (tag) {
      where.tags = {
        has: tag,
      };
    }

    // Поиск по названию и содержимому
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
      ];
    }

    const articles = await prisma.knowledgeArticle.findMany({
      where,
      orderBy: {
        publishedAt: "desc",
      },
    });

    return NextResponse.json(articles);
  } catch (error) {
    console.error("Error fetching knowledge articles:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST /api/knowledge - Создать новую статью
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Только админы и tenant админы могут создавать статьи
    if (!["ADMIN", "TENANT_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validated = createArticleSchema.parse(body);

    // Генерируем slug
    const baseSlug = slugify(validated.title, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;

    // Проверяем уникальность slug
    while (
      await prisma.knowledgeArticle.findUnique({
        where: {
          tenantId_slug: {
            tenantId: session.user.tenantId,
            slug,
          },
        },
      })
    ) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Создаем статью
    const article = await prisma.knowledgeArticle.create({
      data: {
        ...validated,
        slug,
        tenantId: session.user.tenantId,
        authorId: session.user.id,
        publishedAt: validated.status === "PUBLISHED" ? new Date() : null,
      },
    });

    // Аудит лог
    await createAuditLog({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "CREATE",
      resourceType: "KNOWLEDGE_ARTICLE",
      resourceId: article.id,
      metadata: {
        title: article.title,
        status: article.status,
      },
    });

    return NextResponse.json(article, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating knowledge article:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}



