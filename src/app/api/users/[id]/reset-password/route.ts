import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// POST /api/users/[id]/reset-password - Сбросить пароль пользователя
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Проверяем права на сброс паролей
    const canReset = 
      session.user.role === "ADMIN" || 
      session.user.role === "TENANT_ADMIN" ||
      (session.user.role === "AGENT" && session.user.permissions?.canResetPasswords);

    if (!canReset) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Проверяем, что пользователь существует и принадлежит к той же организации
    const user = await prisma.user.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Агенты не могут сбрасывать пароли админов
    if (session.user.role === "AGENT" && (user.role === "ADMIN" || user.role === "TENANT_ADMIN")) {
      return NextResponse.json(
        { error: "Агенты не могут сбрасывать пароли админов" },
        { status: 403 }
      );
    }

    // Генерируем временный пароль
    const temporaryPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    await prisma.user.update({
      where: { id: params.id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ 
      message: "Password reset successfully",
      temporaryPassword,
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }
}

