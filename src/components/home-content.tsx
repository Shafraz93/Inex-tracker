"use client";

import { SalaryAdvanceHomeSummary } from "@/components/salary-advance/salary-advance-home-summary";
import { SeetuHomeSummary } from "@/components/seetu/seetu-home-summary";

export function HomeContent() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-8">
      <SeetuHomeSummary />
      <SalaryAdvanceHomeSummary />
    </div>
  );
}
