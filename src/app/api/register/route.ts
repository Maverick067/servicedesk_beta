import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";

const registerSchema = z.object({
  // Organization data
  tenantName: z.string().min(2, "Organization name must contain at least 2 characters"),
  tenantSlug: z.string().min(2, "Slug must contain at least 2 characters").regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers and hyphens"),
  tenantDomain: z.string().nullable().optional(),
  // User data
  name: z.string().min(2, "Name must contain at least 2 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must contain at least 6 characters"),
});

// POST /api/register - Register new organization with admin
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = registerSchema.parse(body);

    // Check slug uniqueness
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug: validatedData.tenantSlug },
    });

    if (existingTenant) {
      return NextResponse.json(
        { error: "Organization with this slug already exists" },
        { status: 400 }
      );
    }

    // Check domain uniqueness (if specified)
    if (validatedData.tenantDomain) {
      const existingDomain = await prisma.tenant.findUnique({
        where: { domain: validatedData.tenantDomain },
      });

      if (existingDomain) {
        return NextResponse.json(
          { error: "Organization with this domain already exists" },
          { status: 400 }
        );
      }
    }

    // Check email uniqueness
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Create organization and user in transaction
    const result = await prisma.$transaction(async (tx) => {
      console.log("Creating tenant with data:", {
        name: validatedData.tenantName,
        slug: validatedData.tenantSlug,
        domain: validatedData.tenantDomain || null,
      });

      // Create organization
      const tenant = await tx.tenant.create({
        data: {
          name: validatedData.tenantName,
          slug: validatedData.tenantSlug,
          domain: validatedData.tenantDomain || null,
        },
      });

      console.log("Tenant created with ID:", tenant.id);

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);

      console.log("Creating user with data:", {
        email: validatedData.email,
        name: validatedData.name,
        role: "ADMIN",
        tenantId: tenant.id,
      });

          // Create admin user
          const user = await tx.user.create({
            data: {
              email: validatedData.email,
              name: validatedData.name,
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

      console.log("User created with ID:", user.id, "for tenant:", user.tenantId);

      return { tenant, user };
    });

    return NextResponse.json(
      {
        message: "Organization and user successfully created",
        tenant: result.tenant,
        user: result.user,
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

    console.error("Error during registration:", error);
    return NextResponse.json(
      { error: "Failed to create organization" },
      { status: 500 }
    );
  }
}
