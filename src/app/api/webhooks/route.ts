import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit-log";
import { getTenantWhereClause, getTenantIdForCreate } from "@/lib/api-utils";

const webhookSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  secret: z.string().optional(),
  events: z.array(z.enum(["TICKET_CREATED", "TICKET_UPDATED", "TICKET_RESOLVED", "TICKET_CLOSED", "COMMENT_ADDED", "USER_CREATED", "CATEGORY_CREATED", "ALL"])),
  isActive: z.boolean().default(true),
  headers: z.record(z.string()).optional(),
});

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const webhooks = await prisma.webhook.findMany({
      where: { tenantId: session.user.tenantId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(webhooks);
  } catch (error: any) {
    console.error("Error fetching webhooks:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "TENANT_ADMIN" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const json = await request.json();
    const data = webhookSchema.parse(json);

    const webhook = await prisma.webhook.create({
      data: { ...data, tenantId: session.user.tenantId },
    });

    await createAuditLog({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "CREATE",
      resourceType: "WEBHOOK",
      resourceId: webhook.id,
      metadata: { name: webhook.name, url: webhook.url },
      request,
    });

    return NextResponse.json(webhook, { status: 201 });
  } catch (error: any) {
    console.error("Error creating webhook:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}



