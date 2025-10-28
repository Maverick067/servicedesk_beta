"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { PlanCard } from "@/components/billing/plan-card";
import { UsageCard } from "@/components/billing/usage-card";
import { SubscriptionCard } from "@/components/billing/subscription-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { PlanType, Subscription } from "@prisma/client";
import { toast } from "sonner";

export default function BillingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<any>(null);

  // Redirect global ADMIN (без tenantId) на страницу tenants
  useEffect(() => {
    if (session?.user.role === "ADMIN" && !session?.user.tenantId) {
      router.push("/dashboard/tenants");
    }
  }, [session, router]);

  // Проверяем success/canceled query params
  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  useEffect(() => {
    if (success === "true") {
      toast.success("Подписка успешно оформлена!");
      // Очищаем query params
      router.replace("/dashboard/billing");
      fetchData();
    } else if (canceled === "true") {
      toast.error("Оформление подписки отменено");
      router.replace("/dashboard/billing");
    }
  }, [success, canceled, router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [subRes, usageRes] = await Promise.all([
        fetch("/api/billing/subscription"),
        fetch("/api/billing/usage"),
      ]);

      if (subRes.ok) {
        const subData = await subRes.json();
        setSubscription(subData);
      }

      if (usageRes.ok) {
        const usageData = await usageRes.json();
        setUsage(usageData);
      }
    } catch (error) {
      console.error("Error fetching billing data:", error);
      toast.error("Ошибка загрузки данных");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchData();
    }
  }, [session]);

  const handleSelectPlan = async (plan: PlanType) => {
    try {
      setCheckoutLoading(true);
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      if (!res.ok) {
        throw new Error("Failed to create checkout session");
      }

      const { url } = await res.json();
      window.location.href = url;
    } catch (error) {
      console.error("Error creating checkout:", error);
      toast.error("Ошибка создания сессии оплаты");
      setCheckoutLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setPortalLoading(true);
      const res = await fetch("/api/billing/portal", {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Failed to create portal session");
      }

      const { url } = await res.json();
      window.location.href = url;
    } catch (error) {
      console.error("Error creating portal:", error);
      toast.error("Ошибка создания портала");
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Тарифы и оплата</h1>
          <p className="text-muted-foreground">Управление подпиской и тарифным планом</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[300px]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-[500px]" />
          <Skeleton className="h-[500px]" />
          <Skeleton className="h-[500px]" />
        </div>
      </div>
    );
  }

  const currentPlan = subscription?.plan || PlanType.FREE;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Тарифы и оплата</h1>
        <p className="text-muted-foreground">Управление подпиской и тарифным планом</p>
      </div>

      {/* Current subscription and usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SubscriptionCard
          subscription={subscription}
          onManage={handleManageSubscription}
          loading={portalLoading}
        />
        {usage && <UsageCard data={usage} />}
      </div>

      {/* Available plans */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Доступные тарифы</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <PlanCard
            plan={PlanType.FREE}
            currentPlan={currentPlan}
            onSelect={handleSelectPlan}
            loading={checkoutLoading}
          />
          <PlanCard
            plan={PlanType.PRO}
            currentPlan={currentPlan}
            onSelect={handleSelectPlan}
            loading={checkoutLoading}
          />
          <PlanCard
            plan={PlanType.ENTERPRISE}
            currentPlan={currentPlan}
            onSelect={handleSelectPlan}
            loading={checkoutLoading}
          />
        </div>
      </div>

      {/* FAQ */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6">Часто задаваемые вопросы</h2>
        <div className="space-y-4">
          <Alert>
            <AlertTitle>Как изменить тарифный план?</AlertTitle>
            <AlertDescription>
              Вы можете в любой момент перейти на более высокий тариф. При переходе вы будете платить пропорционально оставшемуся времени подписки.
            </AlertDescription>
          </Alert>
          <Alert>
            <AlertTitle>Что происходит при отмене подписки?</AlertTitle>
            <AlertDescription>
              При отмене подписка остается активной до конца оплаченного периода. После этого вы автоматически переходите на план FREE.
            </AlertDescription>
          </Alert>
          <Alert>
            <AlertTitle>Возможен ли возврат средств?</AlertTitle>
            <AlertDescription>
              Мы предлагаем возврат средств в течение 14 дней с момента покупки. Свяжитесь с нашей поддержкой для оформления возврата.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}

