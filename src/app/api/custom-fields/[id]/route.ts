import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createAuditLog, getClientIp, getUserAgent } from "@/lib/audit-log";

const updateCustomFieldSchema = z.object({
  label: z.string().min(1).optional(),
  description: z.string().optional(),
  options: z.array(z.string()).optional(),
  isRequired: z.boolean().optional(),
  isActive: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
});

// GET /api/custom-fields/[id] - Получить одно кастомное поле
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customField = await prisma.customField.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
    });

    if (!customField) {
      return NextResponse.json({ error: "Custom field not found" }, { status: 404 });
    }

    return NextResponse.json(customField);
  } catch (error) {
    console.error("Error fetching custom field:", error);
    return NextResponse.json(
      { error: "Failed to fetch custom field" },
      { status: 500 }
    );
  }
}

// PATCH /api/custom-fields/[id] - Обновить кастомное поле
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Только TENANT_ADMIN может обновлять кастомные поля
    if (session.user.role !== "TENANT_ADMIN" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateCustomFieldSchema.parse(body);

    // Проверяем существование и принадлежность
    const existingField = await prisma.customField.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
    });

    if (!existingField) {
      return NextResponse.json({ error: "Custom field not found" }, { status: 404 });
    }

    const customField = await prisma.customField.update({
      where: { id: params.id },
      data: validatedData,
    });

    // Логируем обновление
    await createAuditLog({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "UPDATE",
      resourceType: "CUSTOM_FIELD",
      resourceId: customField.id,
      metadata: {
        name: customField.name,
        changes: validatedData,
      },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json(customField);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating custom field:", error);
    return NextResponse.json(
      { error: "Failed to update custom field" },
      { status: 500 }
    );
  }
}

// DELETE /api/custom-fields/[id] - Удалить кастомное поле
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Только TENANT_ADMIN может удалять кастомные поля
    if (session.user.role !== "TENANT_ADMIN" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Проверяем существование и принадлежность
    const existingField = await prisma.customField.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
    });

    if (!existingField) {
      return NextResponse.json({ error: "Custom field not found" }, { status: 404 });
    }

    await prisma.customField.delete({
      where: { id: params.id },
    });

    // Логируем удаление
    await createAuditLog({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "DELETE",
      resourceType: "CUSTOM_FIELD",
      resourceId: params.id,
      metadata: {
        name: existingField.name,
        label: existingField.label,
      },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting custom field:", error);
    return NextResponse.json(
      { error: "Failed to delete custom field" },
      { status: 500 }
    );
  }
}

