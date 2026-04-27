import { OptionalFeatureGuard } from "@/components/feature/optional-feature-guard";
import { SalaryAdvanceDashboard } from "@/components/salary-advance/salary-advance-dashboard";

export default function SalaryAdvancePage() {
  return (
    <div className="bg-background flex min-h-0 flex-1 flex-col px-4 py-6">
      <OptionalFeatureGuard feature="salary_advance">
        <SalaryAdvanceDashboard />
      </OptionalFeatureGuard>
    </div>
  );
}
