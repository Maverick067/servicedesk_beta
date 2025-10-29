import { SavedFiltersList } from "@/components/filters/saved-filters-list";
import { ModuleGuard } from "@/components/module-guard";

export default function FiltersPage() {
  return (
    <ModuleGuard module="savedFilters" moduleName="Saved Filters">
      <div className="container mx-auto py-8">
        <SavedFiltersList />
      </div>
    </ModuleGuard>
  );
}

