import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionWithRoles } from "@/lib/api-helpers";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit-log";

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
    const session = await requireSessionWithRoles(["ADMIN", "TENANT_ADMIN", "AGENT", "USER"]);
    if (!session.user.tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 400 });
    }

    const webhooks = await prisma.webhook.findMany({
      where: { tenantId: session.user.tenantId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(webhooks);
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error?.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Error fetching webhooks:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSessionWithRoles(["ADMIN", "TENANT_ADMIN"]);
    if (!session.user.tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 400 });
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
    if (error?.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error?.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Error creating webhook:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}



