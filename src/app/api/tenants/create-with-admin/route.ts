import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";
import slugify from "slugify";

const createTenantWithAdminSchema = z.object({
  tenantName: z.string().min(2, "Organization name must contain at least 2 characters"),
  tenantSlug: z.string().optional(),
  tenantDomain: z.string().nullable().optional(),
  adminName: z.string().min(2, "Name must contain at least 2 characters"),
  adminEmail: z.string().email("Invalid email"),
  adminPassword: z.string().min(6, "Password must contain at least 6 characters"),
});

// POST /api/tenants/create-with-admin - Create tenant with automatic admin
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createTenantWithAdminSchema.parse(body);

    let tenantSlug = validatedData.tenantSlug;
    if (!tenantSlug) {
      tenantSlug = slugify(validatedData.tenantName, { lower: true, strict: true });
    }

    // Check slug and domain uniqueness
    const existingTenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          { slug: tenantSlug },
          { domain: validatedData.tenantDomain || undefined },
        ],
      },
    });

    if (existingTenant) {
      return NextResponse.json(
        { error: "Organization with this slug or domain already exists" },
        { status: 400 }
      );
    }

    // Check email uniqueness
    const existingUser = await prisma.user.findFirst({
      where: { email: validatedData.adminEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(validatedData.adminPassword, 10);

    const result = await prisma.$transaction(async (tx) => {
      // Create tenant
      const tenant = await tx.tenant.create({
        data: {
          name: validatedData.tenantName,
          slug: tenantSlug,
          domain: validatedData.tenantDomain,
        },
      });

          // Create admin for tenant
          const admin = await tx.user.create({
            data: {
              email: validatedData.adminEmail,
              name: validatedData.adminName,
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

      return { tenant, admin };
    });

    return NextResponse.json(
      {
        message: "Organization and administrator successfully created",
        tenant: result.tenant,
        admin: result.admin,
        credentials: {
          email: validatedData.adminEmail,
          password: validatedData.adminPassword,
        },
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

    console.error("Error creating tenant with admin:", error);
    return NextResponse.json(
      { error: "Failed to create organization" },
      { status: 500 }
    );
  }
}
