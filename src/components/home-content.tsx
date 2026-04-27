"use client";

import type { ReactNode } from "react";

import { SalaryAdvanceHomeSummary } from "@/components/salary-advance/salary-advance-home-summary";
import { SeetuHomeSummary } from "@/components/seetu/seetu-home-summary";
import { VehicleLicenseHomeSummary } from "@/components/vehicle-license/vehicle-license-home-summary";
import { useAppSettings } from "@/contexts/app-settings-context";
import type { HomeCardKey } from "@/lib/app-settings/local-storage";

const HOME_CARD_COMPONENTS: Record<HomeCardKey, ReactNode> = {
  vehicle: <VehicleLicenseHomeSummary />,
  seetu: <SeetuHomeSummary />,
  salary_advance: <SalaryAdvanceHomeSummary />,
};

const HOME_CARD_FEATURES = {
  vehicle: "vehicle_logs",
  seetu: "seetu",
  salary_advance: "salary_advance",
} as const;

export function HomeContent() {
  const { settings, hydrated } = useAppSettings();

  if (!hydrated) return null;

  const visibleCards = settings.home_card_order.filter(
    (key) => settings.home_cards[key] && settings.app_features[HOME_CARD_FEATURES[key]]
  );

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-8">
      {visibleCards.map((key) => (
        <div key={key}>{HOME_CARD_COMPONENTS[key]}</div>
      ))}
    </div>
  );
}
