import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit-log";

const updateWebhookSchema = z.object({
  name: z.string().min(1).optional(),
  url: z.string().url().optional(),
  secret: z.string().optional(),
  events: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  headers: z.record(z.string()).optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "TENANT_ADMIN" && session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const json = await request.json();
    const data = updateWebhookSchema.parse(json);

    const webhook = await prisma.webhook.findFirst({ where: { id: params.id, tenantId: session.user.tenantId } });
    if (!webhook) return NextResponse.json({ error: "Webhook not found" }, { status: 404 });

    const updated = await prisma.webhook.update({ where: { id: params.id }, data });
    
    await createAuditLog({ tenantId: session.user.tenantId, userId: session.user.id, action: "UPDATE", resourceType: "WEBHOOK", resourceId: updated.id, metadata: { name: updated.name }, request });
    
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "TENANT_ADMIN" && session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const webhook = await prisma.webhook.findFirst({ where: { id: params.id, tenantId: session.user.tenantId } });
    if (!webhook) return NextResponse.json({ error: "Webhook not found" }, { status: 404 });

    await prisma.webhook.delete({ where: { id: params.id } });
    await createAuditLog({ tenantId: session.user.tenantId, userId: session.user.id, action: "DELETE", resourceType: "WEBHOOK", resourceId: webhook.id, metadata: { name: webhook.name }, request });
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

