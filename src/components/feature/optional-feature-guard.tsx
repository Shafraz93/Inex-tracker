"use client";

import Link from "next/link";

import { useAppSettings } from "@/contexts/app-settings-context";
import type { AppFeatureKey } from "@/lib/app-settings/local-storage";

const FEATURE_LABELS: Record<AppFeatureKey, string> = {
  vehicle_logs: "Vehicle logs",
  credits: "Credits",
  salary_advance: "Salary advance",
  seetu: "Seetu",
  password_manager: "Password Manager",
};

export function OptionalFeatureGuard({
  feature,
  children,
}: {
  feature: AppFeatureKey;
  children: React.ReactNode;
}) {
  const { settings, hydrated } = useAppSettings();

  if (!hydrated) {
    return (
      <div className="flex flex-col gap-6 px-4 py-6">
        <div className="h-7 w-40 animate-pulse rounded-lg bg-muted" />
        <div className="flex flex-col gap-3">
          <div className="h-28 w-full animate-pulse rounded-xl bg-muted" />
          <div className="h-28 w-full animate-pulse rounded-xl bg-muted" />
          <div className="h-28 w-full animate-pulse rounded-xl bg-muted" />
        </div>
        <div className="flex flex-col gap-2">
          <div className="h-12 w-full animate-pulse rounded-xl bg-muted" />
          <div className="h-12 w-full animate-pulse rounded-xl bg-muted" />
          <div className="h-12 w-full animate-pulse rounded-xl bg-muted" />
          <div className="h-12 w-4/5 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  if (!settings.app_features[feature]) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
        <p className="font-medium">{FEATURE_LABELS[feature]} is disabled.</p>
        <p className="text-muted-foreground mt-1">
          Enable it from <Link href="/settings" className="text-primary underline">Settings</Link>.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
