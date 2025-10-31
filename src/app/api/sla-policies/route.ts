import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createAuditLog, getClientIp, getUserAgent } from "@/lib/audit-log";
import { getTenantWhereClause, getTenantIdForCreate } from "@/lib/api-utils";

const createSlaPolicySchema = z.object({
  name: z.string().min(3, "Name must contain at least 3 characters"),
  description: z.string().optional(),
  responseTime: z.number().int().positive().optional(),
  resolutionTime: z.number().int().positive("Resolution time is required"),
  priorities: z.array(z.string()).default([]),
  categoryIds: z.array(z.string()).default([]),
  queueIds: z.array(z.string()).default([]),
  businessHoursOnly: z.boolean().default(false),
  businessHoursStart: z.string().optional(),
  businessHoursEnd: z.string().optional(),
  businessDays: z.array(z.number().int().min(1).max(7)).default([1, 2, 3, 4, 5]),
  isActive: z.boolean().default(true),
});

// GET /api/sla-policies - Get all SLA policies
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only TENANT_ADMIN and ADMIN can view SLA policies
    if (session.user.role !== "TENANT_ADMIN" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Super-admin (ADMIN without tenantId) sees all policies
    const whereClause = session.user.role === "ADMIN" && !session.user.tenantId
      ? {} // Super-admin sees all
      : session.user.tenantId 
        ? { tenantId: session.user.tenantId }
        : { id: "never-match" }; // Safety: no tenantId and not super-admin

    // For super-admin, try to use Prisma first (might work if RLS allows)
    if (session.user.role === "ADMIN" && !session.user.tenantId) {
      try {
        // Try Prisma query first
        const policies = await prisma.slaPolicy.findMany({
          include: {
            _count: {
              select: {
                tickets: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        });
        
        return NextResponse.json(policies);
      } catch (prismaError: any) {
        console.error("Prisma query failed for super-admin, trying raw query:", prismaError);
        
        // Fallback to raw query if Prisma fails due to RLS
        try {
          const policies = await prisma.$queryRaw<Array<{
            id: string;
            name: string;
            description: string | null;
            tenantId: string;
            isActive: boolean;
            responseTime: number | null;
            resolutionTime: number;
            priorities: string[];
            categoryIds: string[];
            queueIds: string[];
            businessHoursOnly: boolean;
            businessHoursStart: string | null;
            businessHoursEnd: string | null;
            businessDays: number[];
            createdAt: Date;
            updatedAt: Date;
            tickets_count: bigint;
          }>>`
            SELECT 
              sp.id,
              sp.name,
              sp.description,
              sp."tenantId",
              sp."isActive",
              sp."responseTime",
              sp."resolutionTime",
              sp.priorities,
              sp."categoryIds",
              sp."queueIds",
              sp."businessHoursOnly",
              sp."businessHoursStart",
              sp."businessHoursEnd",
              sp."businessDays",
              sp."createdAt",
              sp."updatedAt",
              COALESCE((SELECT COUNT(*) FROM tickets WHERE "slaId" = sp.id), 0)::bigint as tickets_count
            FROM sla_policies sp
            ORDER BY sp."createdAt" DESC
          `;
          
          // Transform to match expected format
          const formatted = policies.map((p) => {
            // Handle PostgreSQL arrays - they might come as strings or arrays
            const parseArray = (val: any): any[] => {
              if (Array.isArray(val)) return val;
              if (typeof val === 'string') {
                try {
                  return JSON.parse(val);
                } catch {
                  return [];
                }
              }
              return [];
            };

            return {
              id: p.id,
              name: p.name,
              description: p.description,
              tenantId: p.tenantId,
              isActive: p.isActive,
              responseTime: p.responseTime,
              resolutionTime: p.resolutionTime,
              priorities: parseArray(p.priorities),
              categoryIds: parseArray(p.categoryIds),
              queueIds: parseArray(p.queueIds),
              businessHoursOnly: p.businessHoursOnly ?? false,
              businessHoursStart: p.businessHoursStart,
              businessHoursEnd: p.businessHoursEnd,
              businessDays: parseArray(p.businessDays).length > 0 ? parseArray(p.businessDays) : [1, 2, 3, 4, 5],
              createdAt: p.createdAt,
              updatedAt: p.updatedAt,
              _count: {
                tickets: Number(p.tickets_count) || 0,
              },
            };
          });
          
          return NextResponse.json(formatted);
        } catch (rawError: any) {
          console.error("Raw query also failed:", rawError);
          // Last resort: return empty array
          return NextResponse.json([]);
        }
      }
    }

    const policies = await prisma.slaPolicy.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            tickets: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(policies);
  } catch (error: any) {
    console.error("Error fetching SLA policies:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch SLA policies", details: error.stack },
      { status: 500 }
    );
  }
}

// POST /api/sla-policies - Create a new SLA policy
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only TENANT_ADMIN can create SLA policies
    if (session.user.role !== "TENANT_ADMIN" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createSlaPolicySchema.parse(body);

    const policy = await prisma.slaPolicy.create({
      data: {
        ...validatedData,
        tenantId: session.user.tenantId,
      },
    });

    // Log policy creation
    await createAuditLog({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "CREATE",
      resourceType: "SLA_POLICY",
      resourceId: policy.id,
      metadata: {
        name: policy.name,
        resolutionTime: policy.resolutionTime,
      },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json(policy, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating SLA policy:", error);
    return NextResponse.json(
      { error: "Failed to create SLA policy" },
      { status: 500 }
    );
  }
}

