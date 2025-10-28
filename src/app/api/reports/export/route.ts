import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "csv"; // csv or json
    const type = searchParams.get("type") || "tickets"; // tickets, users, etc
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let data: any[] = [];
    let headers: string[] = [];

    if (type === "tickets") {
      const where: any = { tenantId: session.user.tenantId };
      
      if (startDate) {
        where.createdAt = { ...where.createdAt, gte: new Date(startDate) };
      }
      if (endDate) {
        where.createdAt = { ...where.createdAt, lte: new Date(endDate) };
      }

      const tickets = await prisma.ticket.findMany({
        where,
        include: {
          creator: { select: { name: true, email: true } },
          assignee: { select: { name: true, email: true } },
          category: { select: { name: true } },
          queue: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      headers = [
        "Number",
        "Title",
        "Status",
        "Priority",
        "Creator",
        "Assignee",
        "Category",
        "Queue",
        "Created At",
        "Updated At",
      ];

      data = tickets.map((ticket) => ({
        Number: ticket.number || "",
        Title: ticket.title,
        Status: ticket.status,
        Priority: ticket.priority,
        Creator: ticket.creator?.name || "",
        Assignee: ticket.assignee?.name || "",
        Category: ticket.category?.name || "",
        Queue: ticket.queue?.name || "",
        "Created At": ticket.createdAt.toISOString(),
        "Updated At": ticket.updatedAt.toISOString(),
      }));
    } else if (type === "users") {
      const users = await prisma.user.findMany({
        where: { tenantId: session.user.tenantId },
        select: {
          name: true,
          email: true,
          role: true,
          agentStatus: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });

      headers = ["Name", "Email", "Role", "Agent Status", "Active", "Created At"];
      
      data = users.map((user) => ({
        Name: user.name,
        Email: user.email,
        Role: user.role,
        "Agent Status": user.agentStatus || "",
        Active: user.isActive ? "Yes" : "No",
        "Created At": user.createdAt.toISOString(),
      }));
    }

    if (format === "csv") {
      // Generate CSV
      const csvRows = [headers.join(",")];
      for (const row of data) {
        const values = headers.map((header) => {
          const value = row[header] || "";
          // Escape quotes and wrap in quotes if contains comma
          const escaped = String(value).replace(/"/g, '""');
          return escaped.includes(",") ? `"${escaped}"` : escaped;
        });
        csvRows.push(values.join(","));
      }
      const csv = csvRows.join("\n");

      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="export_${type}_${Date.now()}.csv"`,
        },
      });
    } else {
      // Return JSON
      return NextResponse.json(data);
    }
  } catch (error: any) {
    console.error("Error exporting data:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

