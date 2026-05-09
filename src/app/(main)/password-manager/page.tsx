import { OptionalFeatureGuard } from "@/components/feature/optional-feature-guard";
import { PasswordManagerDashboard } from "@/components/password-manager/password-manager-dashboard";

export default function PasswordManagerPage() {
  return (
    <div className="bg-background flex min-h-0 flex-1 flex-col px-4 py-6">
      <OptionalFeatureGuard feature="password_manager">
        <PasswordManagerDashboard />
      </OptionalFeatureGuard>
    </div>
  );
}
