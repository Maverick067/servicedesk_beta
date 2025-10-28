import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Начало заполнения базы данных...");

  // Создаем демо организацию (tenant)
  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo" },
    update: {},
    create: {
      name: "Demo Company",
      slug: "demo",
      domain: "demo.com",
    },
  });

  console.log("✅ Создана организация:", tenant.name);

  // Хешируем пароли
  const adminPassword = await bcrypt.hash("admin123", 10);
  const agentPassword = await bcrypt.hash("agent123", 10);
  const userPassword = await bcrypt.hash("user123", 10);

  // Создаем пользователей
  const admin = await prisma.user.upsert({
    where: { email: "admin@demo.com" },
    update: {},
    create: {
      email: "admin@demo.com",
      name: "Администратор",
      password: adminPassword,
      role: "ADMIN",
      tenantId: tenant.id,
    },
  });

  const agent = await prisma.user.upsert({
    where: { email: "agent@demo.com" },
    update: {},
    create: {
      email: "agent@demo.com",
      name: "Агент Поддержки",
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
      name: "Обычный Пользователь",
      password: userPassword,
      role: "USER",
      tenantId: tenant.id,
    },
  });

  console.log("✅ Созданы пользователи:");
  console.log("  - Админ:", admin.email);
  console.log("  - Агент:", agent.email);
  console.log("  - Пользователь:", user.email);

  // Создаем категории
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: "Техническая поддержка",
        color: "#3b82f6",
        tenantId: tenant.id,
      },
    }),
    prisma.category.create({
      data: {
        name: "Сеть и подключение",
        color: "#10b981",
        tenantId: tenant.id,
      },
    }),
    prisma.category.create({
      data: {
        name: "Программное обеспечение",
        color: "#f59e0b",
        tenantId: tenant.id,
      },
    }),
    prisma.category.create({
      data: {
        name: "Оборудование",
        color: "#ef4444",
        tenantId: tenant.id,
      },
    }),
  ]);

  console.log("✅ Созданы категории:", categories.length);

  // Создаем тикеты
  const tickets = await Promise.all([
    prisma.ticket.create({
      data: {
        title: "Не работает принтер на третьем этаже",
        description:
          "Добрый день! У нас в офисе на третьем этаже перестал работать принтер HP LaserJet. При попытке печати выдает ошибку.",
        status: "OPEN",
        priority: "HIGH",
        tenantId: tenant.id,
        categoryId: categories[3].id,
        creatorId: user.id,
      },
    }),
    prisma.ticket.create({
      data: {
        title: "Запрос на установку Adobe Photoshop",
        description:
          "Здравствуйте! Мне нужна установка Adobe Photoshop для работы над дизайном проектов. Когда можно организовать установку?",
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
        title: "Проблема с подключением к Wi-Fi",
        description:
          "После обновления системы не могу подключиться к корпоративной сети Wi-Fi. Пароль вводу правильный, но выдает ошибку аутентификации.",
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
        title: "Медленная работа компьютера",
        description:
          "В последнюю неделю компьютер стал очень медленно работать. Программы открываются долго, система часто зависает.",
        status: "OPEN",
        priority: "LOW",
        tenantId: tenant.id,
        categoryId: categories[0].id,
        creatorId: user.id,
      },
    }),
  ]);

  console.log("✅ Созданы тикеты:", tickets.length);

  // Создаем комментарии
  await prisma.comment.createMany({
    data: [
      {
        content:
          "Спасибо за обращение! Мы проверим принтер в ближайшее время.",
        ticketId: tickets[0].id,
        authorId: agent.id,
        isInternal: false,
      },
      {
        content: "Начинаю работу над установкой ПО.",
        ticketId: tickets[1].id,
        authorId: agent.id,
        isInternal: false,
      },
      {
        content: "Установка завершена. Проверьте, пожалуйста.",
        ticketId: tickets[1].id,
        authorId: agent.id,
        isInternal: false,
      },
      {
        content:
          "Проблема решена. Был изменен тип шифрования на роутере. Попробуйте переподключиться.",
        ticketId: tickets[2].id,
        authorId: agent.id,
        isInternal: false,
      },
      {
        content: "Спасибо! Все работает отлично!",
        ticketId: tickets[2].id,
        authorId: user.id,
        isInternal: false,
      },
    ],
  });

  console.log("✅ Созданы комментарии");

  console.log("\n🎉 База данных успешно заполнена демо данными!");
  console.log("\n📝 Учетные данные для входа:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("👑 Администратор:");
  console.log("   Email: admin@demo.com");
  console.log("   Пароль: admin123");
  console.log("\n👨‍💼 Агент поддержки:");
  console.log("   Email: agent@demo.com");
  console.log("   Пароль: agent123");
  console.log("\n👤 Пользователь:");
  console.log("   Email: user@demo.com");
  console.log("   Пароль: user123");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
  .catch((e) => {
    console.error("❌ Ошибка при заполнении базы данных:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

