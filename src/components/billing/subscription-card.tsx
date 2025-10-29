"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, CreditCard, AlertCircle } from "lucide-react";
import { Subscription } from "@prisma/client";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";

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
          <CardTitle>Current Subscription</CardTitle>
          <CardDescription>You don't have an active subscription yet</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm">You are using the FREE plan</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusMap = {
    ACTIVE: { label: "Active", variant: "default" as const, color: "text-green-500" },
    TRIALING: { label: "Trial", variant: "secondary" as const, color: "text-blue-500" },
    PAST_DUE: { label: "Past Due", variant: "destructive" as const, color: "text-red-500" },
    CANCELED: { label: "Canceled", variant: "outline" as const, color: "text-gray-500" },
    UNPAID: { label: "Unpaid", variant: "destructive" as const, color: "text-red-500" },
  };

  const status = statusMap[subscription.status];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Current Subscription</CardTitle>
            <CardDescription className="mt-2">
              Plan <span className="font-semibold text-foreground">{subscription.plan}</span>
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
              <p className="text-sm text-muted-foreground">Start</p>
              <p className="text-sm font-medium">
                {format(new Date(subscription.currentPeriodStart), "MMMM d, yyyy", { locale: enUS })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">End</p>
              <p className="text-sm font-medium">
                {format(new Date(subscription.currentPeriodEnd), "MMMM d, yyyy", { locale: enUS })}
              </p>
            </div>
          </div>
        </div>

        {subscription.cancelAtPeriodEnd && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <p className="text-sm text-destructive">
              Subscription will be canceled on {format(new Date(subscription.currentPeriodEnd), "MMMM d, yyyy", { locale: enUS })}
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
            {loading ? "Loading..." : "Manage Subscription"}
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Manage payment methods, invoices and subscription
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

