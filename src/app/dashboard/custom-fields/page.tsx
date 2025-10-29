import { CustomFieldList } from "@/components/custom-fields/custom-field-list";
import { ModuleGuard } from "@/components/module-guard";

export default function CustomFieldsPage() {
  return (
    <ModuleGuard module="customFields" moduleName="Custom Fields">
      <div className="p-8">
        <CustomFieldList />
      </div>
    </ModuleGuard>
  );
}

