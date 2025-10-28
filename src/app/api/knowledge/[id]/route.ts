import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import slugify from "slugify";
import { createAuditLog } from "@/lib/audit-log";

// Validation schema
const updateArticleSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  excerpt: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  categoryId: z.string().nullable().optional(),
  isPublic: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  attachments: z.array(z.string()).optional(),
});

// GET /api/knowledge/[id] - Получить статью по ID или slug
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Пытаемся найти по ID или slug
    const article = await prisma.knowledgeArticle.findFirst({
      where: {
        tenantId: session.user.tenantId,
        OR: [{ id: params.id }, { slug: params.id }],
      },
    });

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    // Проверка доступа
    if (session.user.role === "USER" && (!article.isPublic || article.status !== "PUBLISHED")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Увеличиваем счетчик просмотров
    await prisma.knowledgeArticle.update({
      where: { id: article.id },
      data: { views: { increment: 1 } },
    });

    return NextResponse.json({ ...article, views: article.views + 1 });
  } catch (error) {
    console.error("Error fetching knowledge article:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PATCH /api/knowledge/[id] - Обновить статью
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Только админы и tenant админы могут редактировать статьи
    if (!["ADMIN", "TENANT_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validated = updateArticleSchema.parse(body);

    // Проверяем существование статьи
    const existingArticle = await prisma.knowledgeArticle.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
    });

    if (!existingArticle) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    // Если меняется название, обновляем slug
    let slug = existingArticle.slug;
    if (validated.title && validated.title !== existingArticle.title) {
      const baseSlug = slugify(validated.title, { lower: true, strict: true });
      slug = baseSlug;
      let counter = 1;

      while (
        await prisma.knowledgeArticle.findFirst({
          where: {
            tenantId: session.user.tenantId,
            slug,
            id: { not: params.id },
          },
        })
      ) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
    }

    // Если статус меняется на PUBLISHED и publishedAt не установлен, устанавливаем
    const publishedAt =
      validated.status === "PUBLISHED" && !existingArticle.publishedAt
        ? new Date()
        : undefined;

    // Увеличиваем версию
    const version = existingArticle.version + 1;

    // Обновляем статью
    const article = await prisma.knowledgeArticle.update({
      where: { id: params.id },
      data: {
        ...validated,
        slug,
        version,
        publishedAt,
      },
    });

    // Аудит лог
    await createAuditLog({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "UPDATE",
      resourceType: "KNOWLEDGE_ARTICLE",
      resourceId: article.id,
      metadata: {
        title: article.title,
        changes: validated,
      },
    });

    return NextResponse.json(article);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating knowledge article:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE /api/knowledge/[id] - Удалить статью
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Только админы и tenant админы могут удалять статьи
    if (!["ADMIN", "TENANT_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Проверяем существование статьи
    const article = await prisma.knowledgeArticle.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
    });

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    // Удаляем статью
    await prisma.knowledgeArticle.delete({
      where: { id: params.id },
    });

    // Аудит лог
    await createAuditLog({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "DELETE",
      resourceType: "KNOWLEDGE_ARTICLE",
      resourceId: article.id,
      metadata: {
        title: article.title,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting knowledge article:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

