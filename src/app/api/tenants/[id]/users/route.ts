import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";

const createUserSchema = z.object({
  email: z.string().email("Invalid email"),
  name: z.string().min(2, "Name must contain at least 2 characters"),
  password: z.string().min(6, "Password must contain at least 6 characters"),
  role: z.enum(["TENANT_ADMIN", "AGENT", "USER"]),
});

// GET /api/tenants/[id]/users - Get all organization users
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins and tenant admins can view users
    if (session.user.role !== "ADMIN" && session.user.role !== "TENANT_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check that user requests users of their organization
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

// POST /api/tenants/[id]/users - Create new user in organization
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

    // Only admins and tenant admins can create users
    if (session.user.role !== "ADMIN" && session.user.role !== "TENANT_ADMIN") {
      console.log("User role is not ADMIN or TENANT_ADMIN:", session.user.role);
      return NextResponse.json({ error: "Forbidden - Not an admin" }, { status: 403 });
    }

    // Check that user creates user in their organization
    if (session.user.tenantId !== params.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createUserSchema.parse(body);

    // TENANT_ADMIN can only create USER and AGENT
    if (session.user.role === "TENANT_ADMIN" && validatedData.role === "TENANT_ADMIN") {
      return NextResponse.json(
        { error: "TENANT_ADMIN cannot create other TENANT_ADMINs" },
        { status: 403 }
      );
    }

    // Check email uniqueness within organization
    const existingUser = await prisma.user.findFirst({
      where: {
        email: validatedData.email,
        tenantId: params.id,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Hash password
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
