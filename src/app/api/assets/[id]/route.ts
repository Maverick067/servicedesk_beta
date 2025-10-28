import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit-log";

const updateAssetSchema = z.object({
  name: z.string().min(1).optional(),
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
  ]).optional(),
  status: z.enum(["IN_USE", "AVAILABLE", "MAINTENANCE", "RETIRED", "LOST"]).optional(),
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

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const asset = await prisma.asset.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    return NextResponse.json(asset);
  } catch (error: any) {
    console.error("Error fetching asset:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
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
    const data = updateAssetSchema.parse(json);

    const asset = await prisma.asset.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const updateData: any = { ...data };

    if (data.purchaseDate) {
      updateData.purchaseDate = new Date(data.purchaseDate);
    }

    if (data.warrantyExpiry) {
      updateData.warrantyExpiry = new Date(data.warrantyExpiry);
    }

    const updatedAsset = await prisma.asset.update({
      where: { id: params.id },
      data: updateData,
    });

    // Audit log
    await createAuditLog({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "UPDATE",
      resourceType: "ASSET",
      resourceId: updatedAsset.id,
      metadata: { name: updatedAsset.name },
      request,
    });

    return NextResponse.json(updatedAsset);
  } catch (error: any) {
    console.error("Error updating asset:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions
    if (session.user.role !== "TENANT_ADMIN" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const asset = await prisma.asset.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    await prisma.asset.delete({
      where: { id: params.id },
    });

    // Audit log
    await createAuditLog({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "DELETE",
      resourceType: "ASSET",
      resourceId: asset.id,
      metadata: { name: asset.name },
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting asset:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

