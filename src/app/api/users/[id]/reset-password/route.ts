import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

/**
 * POST /api/users/[id]/reset-password - Сброс пароля пользователя
 * Только для глобальных ADMIN
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Только глобальные админы могут сбрасывать пароли
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized. Only global admins can reset passwords." },
        { status: 401 }
      );
    }

    const { newPassword } = await request.json();

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    // Проверяем, существует ли пользователь
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Хешируем новый пароль
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Обновляем пароль
    await prisma.user.update({
      where: { id: params.id },
      data: {
        password: hashedPassword,
      },
    });

    // Логируем действие
    console.log(
      `[ADMIN ACTION] Admin ${session.user.email} reset password for user ${user.email}`
    );

    return NextResponse.json({
      success: true,
      message: `Password reset successfully for ${user.email}`,
    });
  } catch (error: any) {
    console.error("Error resetting password:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
