import { prisma } from "./prisma";

/**
 * Вычисляет SLA due date для тикета
 */
export async function calculateSlaDueDate(
  ticket: {
    priority: string;
    categoryId: string | null;
    queueId: string | null;
    tenantId: string;
    createdAt: Date;
  }
): Promise<{ slaId: string; slaDueDate: Date; responseTime?: Date } | null> {
  // Находим подходящую SLA политику
  const slaPolicy = await prisma.slaPolicy.findFirst({
    where: {
      tenantId: ticket.tenantId,
      isActive: true,
      OR: [
        // Проверяем соответствие по приоритету
        {
          AND: [
            { priorities: { has: ticket.priority } },
            { categoryIds: { isEmpty: true } },
            { queueIds: { isEmpty: true } },
          ],
        },
        // Проверяем соответствие по категории
        ...(ticket.categoryId
          ? [
              {
                AND: [
                  { categoryIds: { has: ticket.categoryId } },
                  { queueIds: { isEmpty: true } },
                ],
              },
            ]
          : []),
        // Проверяем соответствие по очереди
        ...(ticket.queueId
          ? [
              {
                queueIds: { has: ticket.queueId },
              },
            ]
          : []),
        // Универсальная политика (без условий)
        {
          AND: [
            { priorities: { isEmpty: true } },
            { categoryIds: { isEmpty: true } },
            { queueIds: { isEmpty: true } },
          ],
        },
      ],
    },
    orderBy: [
      // Приоритет: очередь > категория > приоритет > универсальная
      { queueIds: "desc" },
      { categoryIds: "desc" },
      { priorities: "desc" },
    ],
  });

  if (!slaPolicy) {
    return null;
  }

  const now = ticket.createdAt;
  
  // Вычисляем время ответа (response time)
  let responseDate: Date | undefined;
  if (slaPolicy.responseTime) {
    responseDate = addBusinessMinutes(
      now,
      slaPolicy.responseTime,
      slaPolicy.businessHoursOnly,
      slaPolicy.businessHoursStart,
      slaPolicy.businessHoursEnd,
      slaPolicy.businessDays
    );
  }

  // Вычисляем время решения (resolution time)
  const dueDate = addBusinessMinutes(
    now,
    slaPolicy.resolutionTime,
    slaPolicy.businessHoursOnly,
    slaPolicy.businessHoursStart,
    slaPolicy.businessHoursEnd,
    slaPolicy.businessDays
  );

  return {
    slaId: slaPolicy.id,
    slaDueDate: dueDate,
    responseTime: responseDate,
  };
}

/**
 * Добавляет минуты с учетом рабочего времени
 */
function addBusinessMinutes(
  startDate: Date,
  minutes: number,
  businessHoursOnly: boolean,
  businessHoursStart: string | null,
  businessHoursEnd: string | null,
  businessDays: number[]
): Date {
  if (!businessHoursOnly) {
    // Простое добавление минут
    return new Date(startDate.getTime() + minutes * 60000);
  }

  // Рабочие часы
  const [startHour, startMinute] = (businessHoursStart || "09:00")
    .split(":")
    .map(Number);
  const [endHour, endMinute] = (businessHoursEnd || "18:00")
    .split(":")
    .map(Number);

  const businessMinutesPerDay =
    (endHour * 60 + endMinute) - (startHour * 60 + startMinute);

  let currentDate = new Date(startDate);
  let remainingMinutes = minutes;

  while (remainingMinutes > 0) {
    const dayOfWeek = currentDate.getDay() || 7; // 0 = Воскресенье, преобразуем в 7

    // Проверяем, является ли день рабочим
    if (!businessDays.includes(dayOfWeek)) {
      // Переходим к следующему дню
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(startHour, startMinute, 0, 0);
      continue;
    }

    // Текущее время в минутах от начала дня
    const currentMinutes = currentDate.getHours() * 60 + currentDate.getMinutes();
    const businessStartMinutes = startHour * 60 + startMinute;
    const businessEndMinutes = endHour * 60 + endMinute;

    // Если сейчас до начала рабочего дня
    if (currentMinutes < businessStartMinutes) {
      currentDate.setHours(startHour, startMinute, 0, 0);
      continue;
    }

    // Если сейчас после окончания рабочего дня
    if (currentMinutes >= businessEndMinutes) {
      // Переходим к следующему рабочему дню
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(startHour, startMinute, 0, 0);
      continue;
    }

    // Сколько минут осталось до конца рабочего дня
    const minutesUntilEnd = businessEndMinutes - currentMinutes;

    if (remainingMinutes <= minutesUntilEnd) {
      // Все оставшиеся минуты помещаются в текущий рабочий день
      currentDate.setMinutes(currentDate.getMinutes() + remainingMinutes);
      remainingMinutes = 0;
    } else {
      // Переходим к следующему рабочему дню
      remainingMinutes -= minutesUntilEnd;
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(startHour, startMinute, 0, 0);
    }
  }

  return currentDate;
}

/**
 * Проверяет нарушение SLA для тикетов
 */
export async function checkSlaBreaches(tenantId: string): Promise<string[]> {
  const now = new Date();

  const breachedTickets = await prisma.ticket.findMany({
    where: {
      tenantId,
      slaBreached: false,
      slaDueDate: {
        lte: now,
      },
      status: {
        notIn: ["RESOLVED", "CLOSED"],
      },
    },
    select: {
      id: true,
    },
  });

  if (breachedTickets.length === 0) {
    return [];
  }

  const ticketIds = breachedTickets.map((t) => t.id);

  // Обновляем статус нарушения
  await prisma.ticket.updateMany({
    where: {
      id: { in: ticketIds },
    },
    data: {
      slaBreached: true,
    },
  });

  return ticketIds;
}

/**
 * Получает статистику SLA для дашборда
 */
export async function getSlaStat(tenantId: string) {
  const [total, breached, nearBreach] = await Promise.all([
    // Всего активных тикетов с SLA
    prisma.ticket.count({
      where: {
        tenantId,
        slaId: { not: null },
        status: { notIn: ["RESOLVED", "CLOSED"] },
      },
    }),
    // Нарушенные SLA
    prisma.ticket.count({
      where: {
        tenantId,
        slaBreached: true,
        status: { notIn: ["RESOLVED", "CLOSED"] },
      },
    }),
    // Близкие к нарушению (менее 1 часа)
    prisma.ticket.count({
      where: {
        tenantId,
        slaBreached: false,
        slaDueDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 60 * 60 * 1000), // +1 час
        },
        status: { notIn: ["RESOLVED", "CLOSED"] },
      },
    }),
  ]);

  return {
    total,
    breached,
    nearBreach,
    complianceRate: total > 0 ? ((total - breached) / total) * 100 : 100,
  };
}

