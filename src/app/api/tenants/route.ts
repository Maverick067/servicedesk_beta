import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { setRLSContext, getRLSContextFromSession, withRLSContext } from "@/lib/prisma-rls";
import { z } from "zod";

const createTenantSchema = z.object({
  name: z.string().min(2, "Name must contain at least 2 characters"),
  slug: z.string().min(2, "Slug must contain at least 2 characters").regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  domain: z.string().optional(),
});

// GET /api/tenants - Get organizations
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Global admin sees all organizations with groups
    if (session.user.role === "ADMIN" && !session.user.tenantId) {
      // For super-admin, try Prisma query first (might work if RLS allows)
      try {
        const tenants = await prisma.tenant.findMany({
          include: {
            _count: {
              select: {
                users: true,
                tickets: true,
              },
            },
            group: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        return NextResponse.json(tenants);
      } catch (prismaError: any) {
        console.error("❌ Prisma query failed for super-admin:", prismaError);
        console.error("Error details:", {
          message: prismaError.message,
          code: prismaError.code,
          meta: prismaError.meta,
        });

        // Fallback: use raw SQL query
        try {
          console.log("🔄 Trying raw SQL query as fallback...");
          
          const tenants = await prisma.$queryRawUnsafe(`
            SELECT 
              t.id, 
              t.name, 
              t.slug, 
              t.domain, 
              t."createdAt",
              (SELECT COUNT(*)::bigint FROM users WHERE "tenantId" = t.id) as users_count,
              (SELECT COUNT(*)::bigint FROM tickets WHERE "tenantId" = t.id) as tickets_count,
              tg.id as group_id,
              tg.name as group_name
            FROM tenants t
            LEFT JOIN tenant_groups tg ON t."groupId" = tg.id
            ORDER BY t."createdAt" DESC
          `) as Array<{
            id: string;
            name: string;
            slug: string;
            domain: string | null;
            createdAt: Date;
            users_count: bigint;
            tickets_count: bigint;
            group_id: string | null;
            group_name: string | null;
          }>;

          // Transform result to required format
          const formattedTenants = tenants.map((t) => ({
            id: t.id,
            name: t.name,
            slug: t.slug,
            domain: t.domain,
            createdAt: t.createdAt,
            _count: {
              users: Number(t.users_count) || 0,
              tickets: Number(t.tickets_count) || 0,
            },
            group: t.group_id
              ? {
                  id: t.group_id,
                  name: t.group_name,
                }
              : null,
          }));

          console.log(`✅ Raw SQL query succeeded, found ${formattedTenants.length} tenants`);
          return NextResponse.json(formattedTenants);
        } catch (rawError: any) {
          console.error("❌ Raw SQL query also failed:", rawError);
          console.error("Error details:", {
            message: rawError.message,
            code: rawError.code,
            meta: rawError.meta,
          });
          
          return NextResponse.json(
            { 
              error: rawError.message || "Failed to fetch tenants",
              details: rawError.meta || null,
            },
            { status: 500 }
          );
        }
      }
    }

    // TENANT_ADMIN sees only their organization
    if (session.user.role === "TENANT_ADMIN") {
      const tenant = await prisma.tenant.findUnique({
        where: { id: session.user.tenantId },
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

      return NextResponse.json([tenant]);
    }

    // AGENT and USER cannot see organizations
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } catch (error) {
    console.error("Error fetching tenants:", error);
    return NextResponse.json(
      { error: "Failed to fetch tenants" },
      { status: 500 }
    );
  }
}

// POST /api/tenants - Create a new organization (admin only)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createTenantSchema.parse(body);

    // Check slug uniqueness
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug: validatedData.slug },
    });

    if (existingTenant) {
      return NextResponse.json(
        { error: "Organization with this slug already exists" },
        { status: 400 }
      );
    }

    // Check domain uniqueness (if specified)
    if (validatedData.domain) {
      const existingDomain = await prisma.tenant.findUnique({
        where: { domain: validatedData.domain },
      });

      if (existingDomain) {
        return NextResponse.json(
          { error: "Organization with this domain already exists" },
          { status: 400 }
        );
      }
    }

    const tenant = await prisma.tenant.create({
      data: {
        name: validatedData.name,
        slug: validatedData.slug,
        domain: validatedData.domain,
      },
      include: {
        _count: {
          select: {
            users: true,
            tickets: true,
          },
        },
      },
    });

    return NextResponse.json(tenant, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating tenant:", error);
    return NextResponse.json(
      { error: "Failed to create tenant" },
      { status: 500 }
    );
  }
}
