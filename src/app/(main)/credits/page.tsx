import { OptionalFeatureGuard } from "@/components/feature/optional-feature-guard";
import { CreditsDashboard } from "@/components/credits/credits-dashboard";

export default function CreditsPage() {
  return (
    <div className="bg-background flex min-h-0 flex-1 flex-col px-4 py-6">
      <OptionalFeatureGuard feature="credits">
        <CreditsDashboard />
      </OptionalFeatureGuard>
    </div>
  );
}
