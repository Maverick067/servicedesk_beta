import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createGroupSchema = z.object({
  name: z.string().min(1, "Название обязательно"),
  description: z.string().optional(),
});

/**
 * GET /api/tenant-groups
 * Получить все группы тенантов
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Временно отключаем RLS для суперадмина
    const groups = await prisma.$queryRaw`
      SELECT 
        tg.id,
        tg.name,
        tg.description,
        tg."createdAt",
        tg."updatedAt",
        COALESCE(
          json_agg(
            json_build_object(
              'id', t.id,
              'name', t.name,
              'slug', t.slug,
              'createdAt', t."createdAt"
            )
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'::json
        ) as tenants
      FROM tenant_groups tg
      LEFT JOIN tenants t ON tg.id = t."groupId"
      GROUP BY tg.id, tg.name, tg.description, tg."createdAt", tg."updatedAt"
      ORDER BY tg."createdAt" DESC
    `;

    return NextResponse.json(groups);
  } catch (error: any) {
    console.error("Error fetching tenant groups:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tenant-groups
 * Создать новую группу тенантов
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createGroupSchema.parse(body);

    // Временно отключаем RLS для суперадмина
    // Используем cuid() для генерации ID
    const result = await prisma.$queryRaw`
      INSERT INTO tenant_groups (id, name, description, "createdAt", "updatedAt")
      VALUES (
        concat('cm', left(md5(random()::text || clock_timestamp()::text), 10)),
        ${validatedData.name},
        ${validatedData.description || null},
        NOW(),
        NOW()
      )
      RETURNING id, name, description, "createdAt", "updatedAt"
    `;

    const group = result[0];

    return NextResponse.json(group, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Error creating tenant group:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

