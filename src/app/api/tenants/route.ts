import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createTenantSchema = z.object({
  name: z.string().min(2, "Название должно содержать минимум 2 символа"),
  slug: z.string().min(2, "Slug должен содержать минимум 2 символа").regex(/^[a-z0-9-]+$/, "Slug может содержать только строчные буквы, цифры и дефисы"),
  domain: z.string().optional(),
});

// GET /api/tenants - Получить организации
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Глобальный админ видит все организации
    if (session.user.role === "ADMIN") {
      const tenants = await prisma.tenant.findMany({
        include: {
          _count: {
            select: {
              users: true,
              tickets: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return NextResponse.json(tenants);
    }

    // TENANT_ADMIN видит только свою организацию
    if (session.user.role === "TENANT_ADMIN") {
      const tenant = await prisma.tenant.findUnique({
        where: { id: session.user.tenantId },
        include: {
          _count: {
            select: {
              users: true,
              tickets: true,
            },
          },
        },
      });

      if (!tenant) {
        return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
      }

      return NextResponse.json([tenant]);
    }

    // AGENT и USER не могут видеть организации
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } catch (error) {
    console.error("Error fetching tenants:", error);
    return NextResponse.json(
      { error: "Failed to fetch tenants" },
      { status: 500 }
    );
  }
}

// POST /api/tenants - Создать новую организацию (только для админов)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createTenantSchema.parse(body);

    // Проверяем уникальность slug
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug: validatedData.slug },
    });

    if (existingTenant) {
      return NextResponse.json(
        { error: "Организация с таким slug уже существует" },
        { status: 400 }
      );
    }

    // Проверяем уникальность domain (если указан)
    if (validatedData.domain) {
      const existingDomain = await prisma.tenant.findUnique({
        where: { domain: validatedData.domain },
      });

      if (existingDomain) {
        return NextResponse.json(
          { error: "Организация с таким доменом уже существует" },
          { status: 400 }
        );
      }
    }

    const tenant = await prisma.tenant.create({
      data: {
        name: validatedData.name,
        slug: validatedData.slug,
        domain: validatedData.domain,
      },
      include: {
        _count: {
          select: {
            users: true,
            tickets: true,
          },
        },
      },
    });

    return NextResponse.json(tenant, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating tenant:", error);
    return NextResponse.json(
      { error: "Failed to create tenant" },
      { status: 500 }
    );
  }
}
