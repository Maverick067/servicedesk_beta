import { prisma } from "./prisma";

/**
 * Calculates SLA due date for ticket
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
  // Find matching SLA policy
  const slaPolicy = await prisma.slaPolicy.findFirst({
    where: {
      tenantId: ticket.tenantId,
      isActive: true,
      OR: [
        // Check priority match
        {
          AND: [
            { priorities: { has: ticket.priority } },
            { categoryIds: { isEmpty: true } },
            { queueIds: { isEmpty: true } },
          ],
        },
        // Check category match
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
        // Check queue match
        ...(ticket.queueId
          ? [
              {
                queueIds: { has: ticket.queueId },
              },
            ]
          : []),
        // Universal policy (no conditions)
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
      // Priority: queue > category > priority > universal
      { queueIds: "desc" },
      { categoryIds: "desc" },
      { priorities: "desc" },
    ],
  });

  if (!slaPolicy) {
    return null;
  }

  const now = ticket.createdAt;
  
  // Calculate response time
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

  // Calculate resolution time
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
 * Adds minutes considering business hours
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
    // Simple addition of minutes
    return new Date(startDate.getTime() + minutes * 60000);
  }

  // Business hours
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
    const dayOfWeek = currentDate.getDay() || 7; // 0 = Sunday, convert to 7

    // Check if day is business day
    if (!businessDays.includes(dayOfWeek)) {
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(startHour, startMinute, 0, 0);
      continue;
    }

    // Current time in minutes from start of day
    const currentMinutes = currentDate.getHours() * 60 + currentDate.getMinutes();
    const businessStartMinutes = startHour * 60 + startMinute;
    const businessEndMinutes = endHour * 60 + endMinute;

    // If before business hours start
    if (currentMinutes < businessStartMinutes) {
      currentDate.setHours(startHour, startMinute, 0, 0);
      continue;
    }

    // If after business hours end
    if (currentMinutes >= businessEndMinutes) {
      // Move to next business day
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(startHour, startMinute, 0, 0);
      continue;
    }

    // Minutes remaining until end of business day
    const minutesUntilEnd = businessEndMinutes - currentMinutes;

    if (remainingMinutes <= minutesUntilEnd) {
      // All remaining minutes fit in current business day
      currentDate.setMinutes(currentDate.getMinutes() + remainingMinutes);
      remainingMinutes = 0;
    } else {
      // Move to next business day
      remainingMinutes -= minutesUntilEnd;
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(startHour, startMinute, 0, 0);
    }
  }

  return currentDate;
}

/**
 * Checks SLA breaches for tickets
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

  // Update breach status
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
 * Gets SLA statistics for dashboard
 */
export async function getSlaStat(tenantId: string) {
  const [total, breached, nearBreach] = await Promise.all([
    // Total active tickets with SLA
    prisma.ticket.count({
      where: {
        tenantId,
        slaId: { not: null },
        status: { notIn: ["RESOLVED", "CLOSED"] },
      },
    }),
    // Breached SLA
    prisma.ticket.count({
      where: {
        tenantId,
        slaBreached: true,
        status: { notIn: ["RESOLVED", "CLOSED"] },
      },
    }),
    // Near breach (less than 1 hour)
    prisma.ticket.count({
      where: {
        tenantId,
        slaBreached: false,
        slaDueDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 60 * 60 * 1000), // +1 hour
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

