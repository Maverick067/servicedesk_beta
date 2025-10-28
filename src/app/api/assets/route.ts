import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit-log";
import { getTenantWhereClause, getTenantIdForCreate } from "@/lib/api-utils";

const assetSchema = z.object({
  name: z.string().min(1),
  type: z.enum([
    "COMPUTER",
    "LAPTOP",
    "SERVER",
    "NETWORK",
    "PRINTER",
    "PHONE",
    "MOBILE",
    "SOFTWARE",
    "LICENSE",
    "OTHER",
  ]),
  status: z.enum(["IN_USE", "AVAILABLE", "MAINTENANCE", "RETIRED", "LOST"]).default("AVAILABLE"),
  assignedToId: z.string().optional(),
  locationId: z.string().optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  inventoryNumber: z.string().optional(),
  purchaseDate: z.string().optional(),
  warrantyExpiry: z.string().optional(),
  notes: z.string().optional(),
  customData: z.record(z.any()).optional(),
});

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");

    const where: any = {
      ...getTenantWhereClause(session),
    };

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    const assets = await prisma.asset.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(assets);
  } catch (error: any) {
    console.error("Error fetching assets:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions
    if (
      session.user.role !== "TENANT_ADMIN" &&
      session.user.role !== "ADMIN" &&
      session.user.role !== "AGENT"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const json = await request.json();
    const data = assetSchema.parse(json);

    // Convert date strings to Date objects if provided
    const assetData: any = {
      ...data,
      ...getTenantWhereClause(session),
    };

    if (data.purchaseDate) {
      assetData.purchaseDate = new Date(data.purchaseDate);
    }

    if (data.warrantyExpiry) {
      assetData.warrantyExpiry = new Date(data.warrantyExpiry);
    }

    const asset = await prisma.asset.create({
      data: assetData,
    });

    // Audit log
    await createAuditLog({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "CREATE",
      resourceType: "ASSET",
      resourceId: asset.id,
      metadata: { name: asset.name, type: asset.type },
      request,
    });

    return NextResponse.json(asset, { status: 201 });
  } catch (error: any) {
    console.error("Error creating asset:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}



