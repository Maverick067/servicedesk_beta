import { WebhookList } from "@/components/webhooks/webhook-list";
import { CreateWebhookDialog } from "@/components/webhooks/create-webhook-dialog";
import { PageHeader, PageHeaderDescription, PageHeaderHeading } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ModuleGuard } from "@/components/module-guard";

export default function WebhooksPage() {
  return (
    <ModuleGuard module="webhooks" moduleName="Webhooks">
      <div className="container relative">
        <PageHeader>
          <PageHeaderHeading>Webhooks</PageHeaderHeading>
          <PageHeaderDescription>
            Настройте webhooks для интеграции с внешними сервисами.
          </PageHeaderDescription>
        </PageHeader>
        <div className="flex justify-end mb-4">
          <CreateWebhookDialog>
            <Link href="#" className={cn(buttonVariants({ variant: "default" }))}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Создать webhook
            </Link>
          </CreateWebhookDialog>
        </div>
        <Suspense fallback={<Skeleton className="w-full h-[300px] rounded-lg" />}>
          <WebhookList />
        </Suspense>
      </div>
    </ModuleGuard>
  );
}

