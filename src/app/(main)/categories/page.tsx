import { BudgetTrackerDashboard } from "@/components/budget-tracker/budget-tracker-dashboard";

export default function CategoriesPage() {
  return (
    <div className="bg-background flex min-h-0 flex-1 flex-col px-4 py-6">
      <BudgetTrackerDashboard view="categories" />
    </div>
  );
}
