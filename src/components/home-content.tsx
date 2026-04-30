"use client";

import type { ReactNode } from "react";

import { FoodGroceriesHomeCard } from "@/components/budget-tracker/food-groceries-home-card";
import { SalaryAdvanceHomeSummary } from "@/components/salary-advance/salary-advance-home-summary";
import { SeetuHomeSummary } from "@/components/seetu/seetu-home-summary";
import { VehicleLicenseHomeSummary } from "@/components/vehicle-license/vehicle-license-home-summary";
import { useAppSettings } from "@/contexts/app-settings-context";
import type { HomeCardKey } from "@/lib/app-settings/local-storage";

const HOME_CARD_COMPONENTS: Record<HomeCardKey, ReactNode> = {
  vehicle: <VehicleLicenseHomeSummary />,
  food_groceries: <FoodGroceriesHomeCard />,
  seetu: <SeetuHomeSummary />,
  salary_advance: <SalaryAdvanceHomeSummary />,
};

const HOME_CARD_FEATURES = {
  vehicle: "vehicle_logs",
  food_groceries: null,
  seetu: "seetu",
  salary_advance: "salary_advance",
} as const;

export function HomeContent() {
  const { settings, hydrated } = useAppSettings();

  if (!hydrated) return null;

  const visibleCards = settings.home_card_order.filter(
    (key) => {
      const feature = HOME_CARD_FEATURES[key];
      return (
        settings.home_cards[key] &&
        (feature == null || settings.app_features[feature])
      );
    }
  );

  return (
    <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-6 px-4 py-8 md:grid-cols-2 xl:grid-cols-1">
      {visibleCards.map((key) => (
        <div key={key} className="h-full">
          {HOME_CARD_COMPONENTS[key]}
        </div>
      ))}
    </div>
  );
}
