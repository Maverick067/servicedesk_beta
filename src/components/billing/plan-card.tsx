"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Crown, Building2 } from "lucide-react";
import { PlanType } from "@prisma/client";

interface PlanCardProps {
  plan: PlanType;
  currentPlan?: PlanType;
  onSelect: (plan: PlanType) => void;
  loading?: boolean;
}

const planConfig = {
  FREE: {
    name: "Free",
    price: "$0",
    description: "Для начала работы",
    icon: Zap,
    features: [
      "До 5 пользователей",
      "До 2 агентов",
      "1 GB хранилища",
      "100 тикетов/месяц",
      "Базовая поддержка",
    ],
    color: "bg-gray-500",
  },
  PRO: {
    name: "Pro",
    price: "$49",
    description: "Для растущих команд",
    icon: Crown,
    features: [
      "До 50 пользователей",
      "До 10 агентов",
      "50 GB хранилища",
      "Безлимитные тикеты",
      "Приоритетная поддержка",
      "SSO/LDAP интеграция",
      "API доступ",
      "Webhooks",
    ],
    color: "bg-blue-500",
  },
  ENTERPRISE: {
    name: "Enterprise",
    price: "$199",
    description: "Для крупных организаций",
    icon: Building2,
    features: [
      "Безлимитные пользователи",
      "Безлимитные агенты",
      "500 GB хранилища",
      "Безлимитные тикеты",
      "VIP поддержка 24/7",
      "SSO/SAML интеграция",
      "API доступ",
      "Webhooks",
      "Кастомные домены",
      "Белый лейбл",
      "Персональный менеджер",
    ],
    color: "bg-purple-500",
  },
};

export function PlanCard({ plan, currentPlan, onSelect, loading }: PlanCardProps) {
  const config = planConfig[plan];
  const Icon = config.icon;
  const isCurrent = currentPlan === plan;
  const isUpgrade = currentPlan && plan !== "FREE" && (
    (currentPlan === "FREE") ||
    (currentPlan === "PRO" && plan === "ENTERPRISE")
  );

  return (
    <Card className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl ${
      isCurrent ? "ring-2 ring-primary shadow-lg scale-105" : ""
    }`}>
      {isCurrent && (
        <div className="absolute top-4 right-4">
          <Badge variant="default">Текущий план</Badge>
        </div>
      )}
      
      <CardHeader>
        <div className={`w-12 h-12 rounded-full ${config.color} bg-opacity-10 flex items-center justify-center mb-4`}>
          <Icon className={`w-6 h-6 ${config.color.replace('bg-', 'text-')}`} />
        </div>
        <CardTitle className="text-2xl">{config.name}</CardTitle>
        <CardDescription>{config.description}</CardDescription>
        <div className="mt-4">
          <span className="text-4xl font-bold">{config.price}</span>
          {plan !== "FREE" && <span className="text-muted-foreground ml-2">/месяц</span>}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <ul className="space-y-3">
          {config.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <span className="text-sm text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      
      <CardFooter>
        {plan === "FREE" ? (
          <Button
            variant="outline"
            className="w-full"
            disabled={isCurrent || loading}
          >
            {isCurrent ? "Текущий план" : "Базовый план"}
          </Button>
        ) : (
          <Button
            variant={isCurrent ? "outline" : "default"}
            className="w-full"
            onClick={() => onSelect(plan)}
            disabled={isCurrent || loading}
          >
            {loading ? (
              "Загрузка..."
            ) : isCurrent ? (
              "Текущий план"
            ) : isUpgrade ? (
              "Апгрейд"
            ) : (
              "Выбрать план"
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

