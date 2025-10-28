import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateTenantSchema = z.object({
  name: z.string().min(2).optional(),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/).optional(),
  domain: z.string().optional(),
});

// GET /api/tenants/[id] - Получить организацию
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Только админы и tenant админы могут получать данные организации
    if (session.user.role !== "ADMIN" && session.user.role !== "TENANT_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // TENANT_ADMIN может видеть только свою организацию
    if (session.user.role === "TENANT_ADMIN" && session.user.tenantId !== params.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: params.id },
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

    return NextResponse.json(tenant);
  } catch (error) {
    console.error("Error fetching tenant:", error);
    return NextResponse.json(
      { error: "Failed to fetch tenant" },
      { status: 500 }
    );
  }
}

// PATCH /api/tenants/[id] - Обновить организацию
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Только админы и tenant админы могут обновлять организацию
    if (session.user.role !== "ADMIN" && session.user.role !== "TENANT_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // TENANT_ADMIN может обновлять только свою организацию
    if (session.user.role === "TENANT_ADMIN" && session.user.tenantId !== params.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateTenantSchema.parse(body);

    // Проверяем существование tenant
    const existingTenant = await prisma.tenant.findUnique({
      where: { id: params.id },
    });

    if (!existingTenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Проверяем уникальность slug (если изменяется)
    if (validatedData.slug && validatedData.slug !== existingTenant.slug) {
      const slugExists = await prisma.tenant.findUnique({
        where: { slug: validatedData.slug },
      });

      if (slugExists) {
        return NextResponse.json(
          { error: "Организация с таким slug уже существует" },
          { status: 400 }
        );
      }
    }

    // Проверяем уникальность domain (если изменяется)
    if (validatedData.domain && validatedData.domain !== existingTenant.domain) {
      const domainExists = await prisma.tenant.findUnique({
        where: { domain: validatedData.domain },
      });

      if (domainExists) {
        return NextResponse.json(
          { error: "Организация с таким доменом уже существует" },
          { status: 400 }
        );
      }
    }

    const tenant = await prisma.tenant.update({
      where: { id: params.id },
      data: validatedData,
      include: {
        _count: {
          select: {
            users: true,
            tickets: true,
          },
        },
      },
    });

    return NextResponse.json(tenant);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating tenant:", error);
    return NextResponse.json(
      { error: "Failed to update tenant" },
      { status: 500 }
    );
  }
}

// DELETE /api/tenants/[id] - Удалить организацию
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: params.id },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Нельзя удалить свою организацию
    if (tenant.id === session.user.tenantId) {
      return NextResponse.json(
        { error: "Нельзя удалить свою организацию" },
        { status: 400 }
      );
    }

    await prisma.tenant.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Tenant deleted successfully" });
  } catch (error) {
    console.error("Error deleting tenant:", error);
    return NextResponse.json(
      { error: "Failed to delete tenant" },
      { status: 500 }
    );
  }
}
