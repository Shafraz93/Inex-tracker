"use client";

import { SalaryAdvanceHomeSummary } from "@/components/salary-advance/salary-advance-home-summary";
import { SeetuHomeSummary } from "@/components/seetu/seetu-home-summary";
import { VehicleLicenseHomeSummary } from "@/components/vehicle-license/vehicle-license-home-summary";
import { useAppSettings } from "@/contexts/app-settings-context";

export function HomeContent() {
  const { settings, hydrated } = useAppSettings();

  if (!hydrated) return null;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-8">
      {settings.home_cards.vehicle ? <VehicleLicenseHomeSummary /> : null}
      {settings.home_cards.seetu ? <SeetuHomeSummary /> : null}
      {settings.home_cards.salary_advance ? <SalaryAdvanceHomeSummary /> : null}
    </div>
  );
}
