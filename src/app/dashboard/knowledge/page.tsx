import { KnowledgeArticleList } from "@/components/knowledge/article-list";
import { CreateArticleDialog } from "@/components/knowledge/create-article-dialog";
import { PageHeader, PageHeaderDescription, PageHeaderHeading } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ModuleGuard } from "@/components/module-guard";

export default function KnowledgeBasePage() {
  return (
    <ModuleGuard module="knowledge" moduleName="Knowledge Base">
      <div className="container relative">
        <PageHeader>
          <PageHeaderHeading>Knowledge Base</PageHeaderHeading>
          <PageHeaderDescription>
            Manage knowledge base articles for user self-service.
          </PageHeaderDescription>
        </PageHeader>
        <div className="flex justify-end mb-4">
          <CreateArticleDialog>
            <Link
              href="#"
              className={cn(buttonVariants({ variant: "default" }))}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Article
            </Link>
          </CreateArticleDialog>
        </div>
        <Suspense fallback={<Skeleton className="w-full h-[300px] rounded-lg" />}>
          <KnowledgeArticleList />
        </Suspense>
      </div>
    </ModuleGuard>
  );
}
