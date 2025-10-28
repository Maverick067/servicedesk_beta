"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, CreditCard, AlertCircle } from "lucide-react";
import { Subscription } from "@prisma/client";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface SubscriptionCardProps {
  subscription: Subscription | null;
  onManage: () => void;
  loading?: boolean;
}

export function SubscriptionCard({ subscription, onManage, loading }: SubscriptionCardProps) {
  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Текущая подписка</CardTitle>
          <CardDescription>У вас пока нет активной подписки</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm">Вы используете бесплатный план FREE</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusMap = {
    ACTIVE: { label: "Активна", variant: "default" as const, color: "text-green-500" },
    TRIALING: { label: "Пробная", variant: "secondary" as const, color: "text-blue-500" },
    PAST_DUE: { label: "Просрочена", variant: "destructive" as const, color: "text-red-500" },
    CANCELED: { label: "Отменена", variant: "outline" as const, color: "text-gray-500" },
    UNPAID: { label: "Неоплачена", variant: "destructive" as const, color: "text-red-500" },
  };

  const status = statusMap[subscription.status];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Текущая подписка</CardTitle>
            <CardDescription className="mt-2">
              План <span className="font-semibold text-foreground">{subscription.plan}</span>
            </CardDescription>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Начало</p>
              <p className="text-sm font-medium">
                {format(new Date(subscription.currentPeriodStart), "d MMMM yyyy", { locale: ru })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Окончание</p>
              <p className="text-sm font-medium">
                {format(new Date(subscription.currentPeriodEnd), "d MMMM yyyy", { locale: ru })}
              </p>
            </div>
          </div>
        </div>

        {subscription.cancelAtPeriodEnd && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <p className="text-sm text-destructive">
              Подписка будет отменена {format(new Date(subscription.currentPeriodEnd), "d MMMM yyyy", { locale: ru })}
            </p>
          </div>
        )}

        <div className="pt-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={onManage}
            disabled={loading}
          >
            <CreditCard className="w-4 h-4 mr-2" />
            {loading ? "Загрузка..." : "Управление подпиской"}
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Управляйте способами оплаты, счетами и подпиской
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

