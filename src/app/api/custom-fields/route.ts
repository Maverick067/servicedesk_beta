import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createAuditLog, getClientIp, getUserAgent } from "@/lib/audit-log";
import { getTenantWhereClause, getTenantIdForCreate } from "@/lib/api-utils";

const createCustomFieldSchema = z.object({
  name: z.string().min(1, "Field name is required").regex(/^[a-zA-Z0-9_]+$/, "Field name can only contain Latin letters, numbers and underscores"),
  label: z.string().min(1, "Field label is required"),
  description: z.string().optional(),
  type: z.enum(["TEXT", "NUMBER", "DATE", "CHECKBOX", "SELECT", "MULTI_SELECT", "URL", "EMAIL"]),
  options: z.array(z.string()).optional(),
  isRequired: z.boolean().default(false),
  order: z.number().int().min(0).default(0),
});

// GET /api/custom-fields - Get all custom fields for tenant
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "true";

    const where: any = getTenantWhereClause(session);

    if (activeOnly) {
      where.isActive = true;
    }

    const customFields = await prisma.customField.findMany({
      where,
      orderBy: [
        { order: "asc" },
        { createdAt: "asc" },
      ],
    });

    return NextResponse.json(customFields);
  } catch (error) {
    console.error("Error fetching custom fields:", error);
    return NextResponse.json(
      { error: "Failed to fetch custom fields" },
      { status: 500 }
    );
  }
}

// POST /api/custom-fields - Create new custom field
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only TENANT_ADMIN can create custom fields
    if (session.user.role !== "TENANT_ADMIN" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createCustomFieldSchema.parse(body);

    const tenantId = getTenantIdForCreate(session, body.tenantId);

    // Check name uniqueness
    const existing = await prisma.customField.findUnique({
      where: {
        tenantId_name: {
          tenantId,
          name: validatedData.name,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Field with this name already exists" },
        { status: 400 }
      );
    }

    const customField = await prisma.customField.create({
      data: {
        name: validatedData.name,
        label: validatedData.label,
        description: validatedData.description,
        type: validatedData.type,
        options: validatedData.options,
        isRequired: validatedData.isRequired,
        order: validatedData.order,
        tenantId,
      },
    });

    // Log creation
    await createAuditLog({
      tenantId,
      userId: session.user.id,
      action: "CREATE",
      resourceType: "CUSTOM_FIELD",
      resourceId: customField.id,
      metadata: {
        name: customField.name,
        label: customField.label,
        type: customField.type,
      },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json(customField, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating custom field:", error);
    return NextResponse.json(
      { error: "Failed to create custom field" },
      { status: 500 }
    );
  }
}

