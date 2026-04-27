"use client";

import Link from "next/link";

import { useAppSettings } from "@/contexts/app-settings-context";
import type { AppFeatureKey } from "@/lib/app-settings/local-storage";

const FEATURE_LABELS: Record<AppFeatureKey, string> = {
  vehicle_logs: "Vehicle logs",
  credits: "Credits",
  salary_advance: "Salary advance",
  seetu: "Seetu",
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
    return <p className="text-muted-foreground text-sm">Loading...</p>;
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
