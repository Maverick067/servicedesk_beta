import { AssetList } from "@/components/assets/asset-list";
import { CreateAssetDialog } from "@/components/assets/create-asset-dialog";
import { PageHeader, PageHeaderDescription, PageHeaderHeading } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ModuleGuard } from "@/components/module-guard";

export default function AssetsPage() {
  return (
    <ModuleGuard module="assets" moduleName="IT Assets (CMDB)">
      <div className="container relative">
      <PageHeader>
        <PageHeaderHeading>IT Assets (CMDB)</PageHeaderHeading>
        <PageHeaderDescription>
          Manage IT assets and equipment for your organization.
        </PageHeaderDescription>
      </PageHeader>
      <div className="flex justify-end mb-4">
        <CreateAssetDialog>
          <Link
            href="#"
            className={cn(buttonVariants({ variant: "default" }))}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Asset
          </Link>
        </CreateAssetDialog>
      </div>
      <Suspense fallback={<Skeleton className="w-full h-[300px] rounded-lg" />}>
        <AssetList />
      </Suspense>
    </div>
    </ModuleGuard>
  );
}

