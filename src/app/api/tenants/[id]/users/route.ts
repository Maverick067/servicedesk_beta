import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";

const createUserSchema = z.object({
  email: z.string().email("Некорректный email"),
  name: z.string().min(2, "Имя должно содержать минимум 2 символа"),
  password: z.string().min(6, "Пароль должен содержать минимум 6 символов"),
  role: z.enum(["TENANT_ADMIN", "AGENT", "USER"]),
});

// GET /api/tenants/[id]/users - Получить всех пользователей организации
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Только админы и tenant админы могут видеть пользователей
    if (session.user.role !== "ADMIN" && session.user.role !== "TENANT_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Проверяем, что пользователь запрашивает пользователей своей организации
    if (session.user.tenantId !== params.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      where: {
        tenantId: params.id,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            createdTickets: true,
            assignedTickets: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching tenant users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// POST /api/tenants/[id]/users - Создать нового пользователя в организации
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    console.log("Session:", session);
    
    if (!session?.user) {
      console.log("No session or user");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("User role:", session.user.role, "Expected: ADMIN");
    console.log("User tenantId:", session.user.tenantId, "Requested tenantId:", params.id);

    // Только админы и tenant админы могут создавать пользователей
    if (session.user.role !== "ADMIN" && session.user.role !== "TENANT_ADMIN") {
      console.log("User role is not ADMIN or TENANT_ADMIN:", session.user.role);
      return NextResponse.json({ error: "Forbidden - Not an admin" }, { status: 403 });
    }

    // Проверяем, что пользователь создает пользователя в своей организации
    if (session.user.tenantId !== params.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createUserSchema.parse(body);

    // TENANT_ADMIN может создавать только USER и AGENT
    if (session.user.role === "TENANT_ADMIN" && validatedData.role === "TENANT_ADMIN") {
      return NextResponse.json(
        { error: "TENANT_ADMIN не может создавать других TENANT_ADMIN" },
        { status: 403 }
      );
    }

    // Проверяем уникальность email в рамках организации
    const existingUser = await prisma.user.findFirst({
      where: {
        email: validatedData.email,
        tenantId: params.id,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Пользователь с таким email уже существует" },
        { status: 400 }
      );
    }

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        name: validatedData.name,
        password: hashedPassword,
        role: validatedData.role,
        tenantId: params.id,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating tenant user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
