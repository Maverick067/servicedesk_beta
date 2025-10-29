import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateGroupSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  tenantIds: z.array(z.string()).optional(), // Array of tenant IDs to add to the group
});

/**
 * GET /api/tenant-groups/[id]
 * Get tenant group
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const group = await prisma.tenantGroup.findUnique({
      where: { id: params.id },
      include: {
        tenants: {
          include: {
            _count: {
              select: {
                users: true,
                tickets: true,
              },
            },
          },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    return NextResponse.json(group);
  } catch (error: any) {
    console.error("Error fetching tenant group:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tenant-groups/[id]
 * Update tenant group
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateGroupSchema.parse(body);

    const updateData: any = {};
    if (validatedData.name) updateData.name = validatedData.name;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;

    // Update group
    const group = await prisma.tenantGroup.update({
      where: { id: params.id },
      data: updateData,
      include: {
        tenants: true,
      },
    });

    // If tenantIds are provided, update group composition
    if (validatedData.tenantIds !== undefined) {
      // First, remove all tenants from the group
      await prisma.tenant.updateMany({
        where: { groupId: params.id },
        data: { groupId: null },
      });

      // Then add new ones
      if (validatedData.tenantIds.length > 0) {
        await prisma.tenant.updateMany({
          where: {
            id: {
              in: validatedData.tenantIds,
            },
          },
          data: { groupId: params.id },
        });
      }
    }

    // Get updated group
    const updatedGroup = await prisma.tenantGroup.findUnique({
      where: { id: params.id },
      include: {
        tenants: {
          select: {
            id: true,
            name: true,
            slug: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json(updatedGroup);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Error updating tenant group:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tenant-groups/[id]
 * Delete tenant group
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // First, remove all tenants from the group (groupId becomes null)
    await prisma.tenant.updateMany({
      where: { groupId: params.id },
      data: { groupId: null },
    });

    // Then delete the group
    await prisma.tenantGroup.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting tenant group:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

