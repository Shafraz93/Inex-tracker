import type { AppFeatureKey } from "@/lib/app-settings/local-storage";

/** Main app navigation - adjust paths and labels as the product evolves. */
export const MAIN_NAV_ITEMS: ReadonlyArray<{
  href: string;
  label: string;
  feature?: AppFeatureKey;
}> = [
  { href: "/", label: "Home" },
  { href: "/vehicle-logs", label: "Vehicle logs", feature: "vehicle_logs" },
  { href: "/budget", label: "Budget" },
  { href: "/income", label: "Income" },
  { href: "/expenses", label: "Expenses" },
  { href: "/credits", label: "Credits", feature: "credits" },
  { href: "/salary-advance", label: "Salary advance", feature: "salary_advance" },
  { href: "/categories", label: "Categories" },
  { href: "/seetu/pools", label: "Seetu (rotating savings)", feature: "seetu" },
] as const;
