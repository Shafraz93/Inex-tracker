"use client";

import * as React from "react";

import { SalaryAdvanceProvider } from "@/contexts/salary-advance-context";
import { SeetuProvider } from "@/contexts/seetu-context";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SeetuProvider>
      <SalaryAdvanceProvider>{children}</SalaryAdvanceProvider>
    </SeetuProvider>
  );
}
