import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createCommentSchema = z.object({
  content: z.string().min(5, "Comment must be at least 5 characters"),
  isInternal: z.boolean().optional(),
});

/**
 * POST /api/support-tickets/[id]/comments
 * Add comment to support ticket
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check ticket existence
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: params.id },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Check access rights
    if (
      session.user.role === "TENANT_ADMIN" &&
      ticket.tenantId !== session.user.tenantId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createCommentSchema.parse(body);

    // Only SUPER_ADMIN can create internal comments
    const isInternal =
      validatedData.isInternal && session.user.role === "ADMIN";

    const comment = await prisma.supportComment.create({
      data: {
        content: validatedData.content,
        ticketId: params.id,
        authorId: session.user.id,
        isInternal,
      },
    });

    // Update ticket updatedAt
    await prisma.supportTicket.update({
      where: { id: params.id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error: any) {
    console.error("Error creating support comment:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

