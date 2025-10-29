import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateCategorySchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

// GET /api/categories/[id] - Get category
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins and tenant admins can view categories
    if (session.user.role !== "ADMIN" && session.user.role !== "TENANT_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const category = await prisma.category.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
      include: {
        _count: {
          select: {
            tickets: true,
          },
        },
      },
    });

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error("Error fetching category:", error);
    return NextResponse.json(
      { error: "Failed to fetch category" },
      { status: 500 }
    );
  }
}

// PATCH /api/categories/[id] - Update category
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions to edit categories
    const canEdit = 
      session.user.role === "ADMIN" || 
      session.user.role === "TENANT_ADMIN" ||
      (session.user.role === "AGENT" && session.user.permissions?.canEditCategories);

    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateCategorySchema.parse(body);

    // Check category existence
    const existingCategory = await prisma.category.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
    });

    if (!existingCategory) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // Check name uniqueness (if changed)
    if (validatedData.name && validatedData.name !== existingCategory.name) {
      const nameExists = await prisma.category.findFirst({
        where: {
          name: validatedData.name,
          tenantId: session.user.tenantId,
          id: { not: params.id },
        },
      });

      if (nameExists) {
        return NextResponse.json(
          { error: "Category with this name already exists" },
          { status: 400 }
        );
      }
    }

    const category = await prisma.category.update({
      where: { id: params.id },
      data: validatedData,
      include: {
        _count: {
          select: {
            tickets: true,
          },
        },
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating category:", error);
    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 }
    );
  }
}

// DELETE /api/categories/[id] - Delete category
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions to delete categories
    const canDelete = 
      session.user.role === "ADMIN" || 
      session.user.role === "TENANT_ADMIN" ||
      (session.user.role === "AGENT" && session.user.permissions?.canDeleteCategories);

    if (!canDelete) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const category = await prisma.category.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
    });

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // Check if there are tickets in this category
    const ticketsCount = await prisma.ticket.count({
      where: {
        categoryId: params.id,
      },
    });

    if (ticketsCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete category that has tickets" },
        { status: 400 }
      );
    }

    await prisma.category.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    );
  }
}
