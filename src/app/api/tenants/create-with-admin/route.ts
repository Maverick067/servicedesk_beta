import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";
import slugify from "slugify";

const createTenantWithAdminSchema = z.object({
  tenantName: z.string().min(2, "Название организации должно содержать минимум 2 символов"),
  tenantSlug: z.string().optional(),
  tenantDomain: z.string().nullable().optional(),
  adminName: z.string().min(2, "Имя должно содержать минимум 2 символа"),
  adminEmail: z.string().email("Некорректный email"),
  adminPassword: z.string().min(6, "Пароль должен содержать минимум 6 символов"),
});

// POST /api/tenants/create-with-admin - Создать tenant с автоматическим админом
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createTenantWithAdminSchema.parse(body);

    let tenantSlug = validatedData.tenantSlug;
    if (!tenantSlug) {
      tenantSlug = slugify(validatedData.tenantName, { lower: true, strict: true });
    }

    // Проверяем уникальность slug и domain
    const existingTenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          { slug: tenantSlug },
          { domain: validatedData.tenantDomain || undefined },
        ],
      },
    });

    if (existingTenant) {
      return NextResponse.json(
        { error: "Организация с таким slug или доменом уже существует" },
        { status: 400 }
      );
    }

    // Проверяем уникальность email
    const existingUser = await prisma.user.findFirst({
      where: { email: validatedData.adminEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Пользователь с таким email уже существует" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(validatedData.adminPassword, 10);

    const result = await prisma.$transaction(async (tx) => {
      // Создаем tenant
      const tenant = await tx.tenant.create({
        data: {
          name: validatedData.tenantName,
          slug: tenantSlug,
          domain: validatedData.tenantDomain,
        },
      });

          // Создаем админа для tenant'а
          const admin = await tx.user.create({
            data: {
              email: validatedData.adminEmail,
              name: validatedData.adminName,
              password: hashedPassword,
              role: "TENANT_ADMIN",
              tenantId: tenant.id,
            },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          tenantId: true,
        },
      });

      return { tenant, admin };
    });

    return NextResponse.json(
      {
        message: "Организация и администратор успешно созданы",
        tenant: result.tenant,
        admin: result.admin,
        credentials: {
          email: validatedData.adminEmail,
          password: validatedData.adminPassword,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating tenant with admin:", error);
    return NextResponse.json(
      { error: "Failed to create organization" },
      { status: 500 }
    );
  }
}
