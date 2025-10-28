import { AutomationRuleList } from "@/components/automation/rule-list";
import { CreateRuleDialog } from "@/components/automation/create-rule-dialog";
import { PageHeader, PageHeaderDescription, PageHeaderHeading } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ModuleGuard } from "@/components/module-guard";

export default function AutomationPage() {
  return (
    <ModuleGuard module="automation" moduleName="Автоматизация">
      <div className="container relative">
      <PageHeader>
        <PageHeaderHeading>Автоматизация</PageHeaderHeading>
        <PageHeaderDescription>
          Создавайте правила автоматизации для тикетов с условиями и действиями.
        </PageHeaderDescription>
      </PageHeader>
      <div className="flex justify-end mb-4">
        <CreateRuleDialog>
          <Link
            href="#"
            className={cn(buttonVariants({ variant: "default" }))}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Создать правило
          </Link>
        </CreateRuleDialog>
      </div>
      <Suspense fallback={<Skeleton className="w-full h-[300px] rounded-lg" />}>
        <AutomationRuleList />
      </Suspense>
    </div>
    </ModuleGuard>
  );
}

