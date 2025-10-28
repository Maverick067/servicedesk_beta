import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";

const registerSchema = z.object({
  // Данные организации
  tenantName: z.string().min(2, "Название организации должно содержать минимум 2 символа"),
  tenantSlug: z.string().min(2, "Slug должен содержать минимум 2 символа").regex(/^[a-z0-9-]+$/, "Slug может содержать только строчные буквы, цифры и дефисы"),
  tenantDomain: z.string().nullable().optional(),
  // Данные пользователя
  name: z.string().min(2, "Имя должно содержать минимум 2 символа"),
  email: z.string().email("Некорректный email"),
  password: z.string().min(6, "Пароль должен содержать минимум 6 символов"),
});

// POST /api/register - Регистрация новой организации с админом
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = registerSchema.parse(body);

    // Проверяем уникальность slug
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug: validatedData.tenantSlug },
    });

    if (existingTenant) {
      return NextResponse.json(
        { error: "Организация с таким slug уже существует" },
        { status: 400 }
      );
    }

    // Проверяем уникальность domain (если указан)
    if (validatedData.tenantDomain) {
      const existingDomain = await prisma.tenant.findUnique({
        where: { domain: validatedData.tenantDomain },
      });

      if (existingDomain) {
        return NextResponse.json(
          { error: "Организация с таким доменом уже существует" },
          { status: 400 }
        );
      }
    }

    // Проверяем уникальность email
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Пользователь с таким email уже существует" },
        { status: 400 }
      );
    }

    // Создаем организацию и пользователя в транзакции
    const result = await prisma.$transaction(async (tx) => {
      console.log("Creating tenant with data:", {
        name: validatedData.tenantName,
        slug: validatedData.tenantSlug,
        domain: validatedData.tenantDomain || null,
      });

      // Создаем организацию
      const tenant = await tx.tenant.create({
        data: {
          name: validatedData.tenantName,
          slug: validatedData.tenantSlug,
          domain: validatedData.tenantDomain || null,
        },
      });

      console.log("Tenant created with ID:", tenant.id);

      // Хешируем пароль
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);

      console.log("Creating user with data:", {
        email: validatedData.email,
        name: validatedData.name,
        role: "ADMIN",
        tenantId: tenant.id,
      });

          // Создаем пользователя-админа
          const user = await tx.user.create({
            data: {
              email: validatedData.email,
              name: validatedData.name,
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

      console.log("User created with ID:", user.id, "for tenant:", user.tenantId);

      return { tenant, user };
    });

    return NextResponse.json(
      {
        message: "Организация и пользователь успешно созданы",
        tenant: result.tenant,
        user: result.user,
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

    console.error("Error during registration:", error);
    return NextResponse.json(
      { error: "Failed to create organization" },
      { status: 500 }
    );
  }
}
