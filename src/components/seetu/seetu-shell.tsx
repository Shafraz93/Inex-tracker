"use client";

import { OptionalFeatureGuard } from "@/components/feature/optional-feature-guard";

import { SeetuSubNav } from "./seetu-sub-nav";

export function SeetuShell({ children }: { children: React.ReactNode }) {
  return (
    <OptionalFeatureGuard feature="seetu">
      <div className="bg-background flex min-h-0 flex-1 flex-col px-4 py-6">
        <SeetuSubNav />
        {children}
      </div>
    </OptionalFeatureGuard>
  );
}
