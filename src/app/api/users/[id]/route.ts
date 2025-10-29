import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createAuditLog, getClientIp, getUserAgent } from "@/lib/audit-log";

const updateUserSchema = z.object({
  role: z.enum(["ADMIN", "TENANT_ADMIN", "AGENT", "USER"]).optional(),
  isActive: z.boolean().optional(),
  name: z.string().optional(),
  email: z.string().email().optional(),
});

/**
 * GET /api/users/[id]
 * Get user information
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        avatar: true,
        tenantId: true,
        createdAt: true,
        _count: {
          select: {
            createdTickets: true,
            assignedTickets: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check access rights
    if (
      session.user.role !== "ADMIN" &&
      session.user.tenantId !== user.tenantId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(user);
  } catch (error: any) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch user" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/users/[id]
 * Update user
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN and TENANT_ADMIN can update users
    if (session.user.role !== "ADMIN" && session.user.role !== "TENANT_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const validatedData = updateUserSchema.parse(body);

    // Get current user
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        tenantId: true,
        role: true,
      },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check access rights
    if (
      session.user.role === "TENANT_ADMIN" &&
      session.user.tenantId !== existingUser.tenantId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // TENANT_ADMIN cannot create ADMIN or change ADMIN role
    if (session.user.role === "TENANT_ADMIN") {
      if (validatedData.role === "ADMIN") {
        return NextResponse.json(
          { error: "Only global administrator can assign ADMIN role" },
          { status: 403 }
        );
      }
      if (existingUser.role === "ADMIN") {
        return NextResponse.json(
          { error: "Cannot modify global administrator" },
          { status: 403 }
        );
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: validatedData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        avatar: true,
        tenantId: true,
      },
    });

    // Log action
    await createAuditLog({
      tenantId: existingUser.tenantId,
      userId: session.user.id,
      action: "UPDATE",
      resourceType: "USER",
      resourceId: params.id,
      metadata: {
        changes: validatedData,
        updatedBy: session.user.role,
      },
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    });

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    console.error("Error updating user:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to update user" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/[id]
 * Delete user
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN and TENANT_ADMIN can delete users
    if (session.user.role !== "ADMIN" && session.user.role !== "TENANT_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Cannot delete yourself
    if (params.id === session.user.id) {
      return NextResponse.json(
        { error: "Cannot delete yourself" },
        { status: 400 }
      );
    }

    // Get user
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        tenantId: true,
        role: true,
        email: true,
      },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check access rights
    if (
      session.user.role === "TENANT_ADMIN" &&
      session.user.tenantId !== existingUser.tenantId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // TENANT_ADMIN cannot delete ADMIN
    if (session.user.role === "TENANT_ADMIN" && existingUser.role === "ADMIN") {
      return NextResponse.json(
        { error: "Cannot delete global administrator" },
        { status: 403 }
      );
    }

    // Delete user
    await prisma.user.delete({
      where: { id: params.id },
    });

    // Log action
    await createAuditLog({
      tenantId: existingUser.tenantId,
      userId: session.user.id,
      action: "DELETE",
      resourceType: "USER",
      resourceId: params.id,
      metadata: {
        deletedUser: existingUser.email,
        deletedBy: session.user.role,
      },
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete user" },
      { status: 500 }
    );
  }
}
