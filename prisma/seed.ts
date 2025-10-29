import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  // Hash passwords
  const superAdminPassword = await bcrypt.hash("superadmin", 10);
  const adminPassword = await bcrypt.hash("admin123", 10);
  const agentPassword = await bcrypt.hash("agent123", 10);
  const userPassword = await bcrypt.hash("user123", 10);

  // IMPORTANT: Create GLOBAL SUPER ADMIN without tenantId
  const superAdmin = await prisma.user.upsert({
    where: { email: "superadmin@servicedesk.com" },
    update: {},
    create: {
      email: "superadmin@servicedesk.com",
      name: "Super Administrator",
      password: superAdminPassword,
      role: "ADMIN",
      tenantId: null, // Global admin WITHOUT tenant binding
    },
  });

  console.log("✅ Created global super-admin:", superAdmin.email);

  // Create demo organization (tenant)
  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo" },
    update: {},
    create: {
      name: "Demo Company",
      slug: "demo",
      domain: "demo.com",
    },
  });

  console.log("✅ Created organization:", tenant.name);

  // Create users for demo organization
  const admin = await prisma.user.upsert({
    where: { email: "admin@demo.com" },
    update: {},
    create: {
      email: "admin@demo.com",
      name: "Organization Administrator",
      password: adminPassword,
      role: "TENANT_ADMIN", // Changed to TENANT_ADMIN
      tenantId: tenant.id,
    },
  });

  const agent = await prisma.user.upsert({
    where: { email: "agent@demo.com" },
    update: {},
    create: {
      email: "agent@demo.com",
      name: "Support Agent",
      password: agentPassword,
      role: "AGENT",
      tenantId: tenant.id,
    },
  });

  const user = await prisma.user.upsert({
    where: { email: "user@demo.com" },
    update: {},
    create: {
      email: "user@demo.com",
      name: "Regular User",
      password: userPassword,
      role: "USER",
      tenantId: tenant.id,
    },
  });

  console.log("✅ Created organization users:");
  console.log("  - Tenant Administrator:", admin.email);
  console.log("  - Agent:", agent.email);
  console.log("  - User:", user.email);

  // Create categories
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: "Technical Support",
        color: "#3b82f6",
        tenantId: tenant.id,
      },
    }),
    prisma.category.create({
      data: {
        name: "Network and Connectivity",
        color: "#10b981",
        tenantId: tenant.id,
      },
    }),
    prisma.category.create({
      data: {
        name: "Software",
        color: "#f59e0b",
        tenantId: tenant.id,
      },
    }),
    prisma.category.create({
      data: {
        name: "Hardware",
        color: "#ef4444",
        tenantId: tenant.id,
      },
    }),
  ]);

  console.log("✅ Created categories:", categories.length);

  // Create tickets
  const tickets = await Promise.all([
    prisma.ticket.create({
      data: {
        title: "Printer not working on third floor",
        description:
          "Good day! The HP LaserJet printer on the third floor of our office stopped working. When trying to print, it shows an error.",
        status: "OPEN",
        priority: "HIGH",
        tenantId: tenant.id,
        categoryId: categories[3].id,
        creatorId: user.id,
      },
    }),
    prisma.ticket.create({
      data: {
        title: "Request to install Adobe Photoshop",
        description:
          "Hello! I need Adobe Photoshop installed for working on design projects. When can we schedule the installation?",
        status: "IN_PROGRESS",
        priority: "MEDIUM",
        tenantId: tenant.id,
        categoryId: categories[2].id,
        creatorId: user.id,
        assigneeId: agent.id,
      },
    }),
    prisma.ticket.create({
      data: {
        title: "Wi-Fi connection issue",
        description:
          "After updating the system, I cannot connect to the corporate Wi-Fi network. I'm entering the correct password, but it shows an authentication error.",
        status: "RESOLVED",
        priority: "URGENT",
        tenantId: tenant.id,
        categoryId: categories[1].id,
        creatorId: user.id,
        assigneeId: agent.id,
        resolvedAt: new Date(),
      },
    }),
    prisma.ticket.create({
      data: {
        title: "Slow computer performance",
        description:
          "For the past week, my computer has been running very slowly. Programs take a long time to open, and the system often freezes.",
        status: "OPEN",
        priority: "LOW",
        tenantId: tenant.id,
        categoryId: categories[0].id,
        creatorId: user.id,
      },
    }),
  ]);

  console.log("✅ Created tickets:", tickets.length);

  // Create comments
  await prisma.comment.createMany({
    data: [
      {
        content:
          "Thank you for contacting us! We will check the printer shortly.",
        ticketId: tickets[0].id,
        authorId: agent.id,
        isInternal: false,
      },
      {
        content: "Starting work on software installation.",
        ticketId: tickets[1].id,
        authorId: agent.id,
        isInternal: false,
      },
      {
        content: "Installation completed. Please check.",
        ticketId: tickets[1].id,
        authorId: agent.id,
        isInternal: false,
      },
      {
        content:
          "Issue resolved. Encryption type was changed on the router. Please try reconnecting.",
        ticketId: tickets[2].id,
        authorId: agent.id,
        isInternal: false,
      },
      {
        content: "Thank you! Everything works great!",
        ticketId: tickets[2].id,
        authorId: user.id,
        isInternal: false,
      },
    ],
  });

  console.log("✅ Created comments");

  console.log("\n🎉 Database successfully seeded with demo data!");
  console.log("\n📝 Login credentials:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔥 SUPER ADMINISTRATOR (Global access):");
  console.log("   Email: superadmin@servicedesk.com");
  console.log("   Password: superadmin");
  console.log("   Access: Admin panel, all organizations");
  console.log("\n👑 Demo Organization Administrator:");
  console.log("   Email: admin@demo.com");
  console.log("   Password: admin123");
  console.log("\n👨‍💼 Support Agent:");
  console.log("   Email: agent@demo.com");
  console.log("   Password: agent123");
  console.log("\n👤 User:");
  console.log("   Email: user@demo.com");
  console.log("   Password: user123");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

