"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Users, Shield, HardDrive, Ticket } from "lucide-react";

interface UsageData {
  usage: {
    users: number;
    agents: number;
    storageGB: number;
    ticketsThisMonth: number;
  };
  limits: {
    maxUsers: number;
    maxAgents: number;
    maxStorageGB: number;
    maxTicketsPerMonth: number | null;
  };
  percentages: {
    users: number;
    agents: number;
    storage: number;
    tickets: number;
  };
}

interface UsageCardProps {
  data: UsageData;
}

export function UsageCard({ data }: UsageCardProps) {
  const metrics = [
    {
      label: "Пользователи",
      icon: Users,
      current: data.usage.users,
      max: data.limits.maxUsers,
      percentage: data.percentages.users,
      color: "text-blue-500",
    },
    {
      label: "Агенты",
      icon: Shield,
      current: data.usage.agents,
      max: data.limits.maxAgents,
      percentage: data.percentages.agents,
      color: "text-purple-500",
    },
    {
      label: "Хранилище",
      icon: HardDrive,
      current: `${data.usage.storageGB.toFixed(2)} GB`,
      max: `${data.limits.maxStorageGB} GB`,
      percentage: data.percentages.storage,
      color: "text-green-500",
    },
    {
      label: "Тикеты (месяц)",
      icon: Ticket,
      current: data.usage.ticketsThisMonth,
      max: data.limits.maxTicketsPerMonth || "∞",
      percentage: data.percentages.tickets,
      color: "text-orange-500",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Использование ресурсов</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const isNearLimit = metric.percentage >= 80;
          
          return (
            <div key={metric.label} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={`w-5 h-5 ${metric.color}`} />
                  <span className="text-sm font-medium">{metric.label}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {metric.current} / {metric.max}
                </span>
              </div>
              <Progress
                value={metric.percentage}
                className={`h-2 ${
                  isNearLimit ? "[&>div]:bg-destructive" : ""
                }`}
              />
              {isNearLimit && (
                <p className="text-xs text-destructive">
                  Приближается лимит! Рассмотрите апгрейд плана.
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

