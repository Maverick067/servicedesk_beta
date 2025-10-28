"use client";

import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

interface SlaBadgeProps {
  slaDueDate: string | Date | null;
  slaBreached: boolean;
}

export function SlaBadge({ slaDueDate, slaBreached }: SlaBadgeProps) {
  if (!slaDueDate) {
    return null;
  }

  const dueDate = new Date(slaDueDate);
  const now = new Date();
  const isOverdue = dueDate < now;
  const timeLeft = formatDistanceToNow(dueDate, { locale: ru, addSuffix: true });

  if (slaBreached || isOverdue) {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        SLA нарушен
      </Badge>
    );
  }

  // Менее 1 часа до нарушения
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
  const isNearBreach = dueDate < oneHourFromNow;

  if (isNearBreach) {
    return (
      <Badge variant="secondary" className="gap-1 bg-orange-100 text-orange-700 border-orange-300">
        <Clock className="h-3 w-3" />
        {timeLeft}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1 text-gray-600">
      <Clock className="h-3 w-3" />
      {timeLeft}
    </Badge>
  );
}

