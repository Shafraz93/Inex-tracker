"use client";

import * as React from "react";

import { BudgetTrackerProvider } from "@/contexts/budget-tracker-context";
import { CreditsProvider } from "@/contexts/credits-context";
import { SalaryAdvanceProvider } from "@/contexts/salary-advance-context";
import { SeetuProvider } from "@/contexts/seetu-context";
import { VehicleLicenseProvider } from "@/contexts/vehicle-license-context";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SeetuProvider>
      <BudgetTrackerProvider>
        <CreditsProvider>
          <SalaryAdvanceProvider>
            <VehicleLicenseProvider>{children}</VehicleLicenseProvider>
          </SalaryAdvanceProvider>
        </CreditsProvider>
      </BudgetTrackerProvider>
    </SeetuProvider>
  );
}
