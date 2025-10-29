import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createGroupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

/**
 * GET /api/tenant-groups
 * Get all tenant groups
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Temporarily disable RLS for super-admin
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
 * Create a new tenant group
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createGroupSchema.parse(body);

    // Temporarily disable RLS for super-admin
    // Use cuid() for ID generation
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

