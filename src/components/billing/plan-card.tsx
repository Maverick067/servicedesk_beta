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
    description: "To get started",
    icon: Zap,
    features: [
      "Up to 5 users",
      "Up to 2 agents",
      "1 GB storage",
      "100 tickets/month",
      "Basic support",
    ],
    color: "bg-gray-500",
  },
  PRO: {
    name: "Pro",
    price: "$49",
    description: "For growing teams",
    icon: Crown,
    features: [
      "Up to 50 users",
      "Up to 10 agents",
      "50 GB storage",
      "Unlimited tickets",
      "Priority support",
      "SSO/LDAP integration",
      "API access",
      "Webhooks",
    ],
    color: "bg-blue-500",
  },
  ENTERPRISE: {
    name: "Enterprise",
    price: "$199",
    description: "For large organizations",
    icon: Building2,
    features: [
      "Unlimited users",
      "Unlimited agents",
      "500 GB storage",
      "Unlimited tickets",
      "VIP support 24/7",
      "SSO/SAML integration",
      "API access",
      "Webhooks",
      "Custom domains",
      "White label",
      "Dedicated manager",
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
          <Badge variant="default">Current Plan</Badge>
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
          {plan !== "FREE" && <span className="text-muted-foreground ml-2">/month</span>}
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
            {isCurrent ? "Current Plan" : "Basic Plan"}
          </Button>
        ) : (
          <Button
            variant={isCurrent ? "outline" : "default"}
            className="w-full"
            onClick={() => onSelect(plan)}
            disabled={isCurrent || loading}
          >
            {loading ? (
              "Loading..."
            ) : isCurrent ? (
              "Current Plan"
            ) : isUpgrade ? (
              "Upgrade"
            ) : (
              "Select Plan"
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

