"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useAppSettings } from "@/contexts/app-settings-context";
import { useBudgetTracker } from "@/contexts/budget-tracker-context";
import { useCredits } from "@/contexts/credits-context";
import { useVehicleLicense } from "@/contexts/vehicle-license-context";
import { updateCreditsGlobalCategoryLocal } from "@/lib/credits/local-storage";

function normalizeCategoryId(value: string): string | null {
  const v = value.trim();
  return v.length > 0 ? v : null;
}

export default function SettingsPage() {
  const {
    settings,
    setSettings,
    hydrated,
    saveToCloud,
    cloudSyncing,
    cloudError,
    canSyncToCloud,
  } = useAppSettings();
  const { state: budgetState, hydrated: budgetHydrated } = useBudgetTracker();
  const { state: vehicleState, setState: setVehicleState, hydrated: vehicleHydrated } =
    useVehicleLicense();
  const { state: creditsState, setState: setCreditsState, hydrated: creditsHydrated } =
    useCredits();
  const [saveMessage, setSaveMessage] = React.useState<string | null>(null);

  const expenseCategories = React.useMemo(
    () => budgetState.categories.filter((c) => c.kind === "expense"),
    [budgetState.categories]
  );

  if (!hydrated || !budgetHydrated || !vehicleHydrated || !creditsHydrated) {
    return (
      <div className="bg-background flex min-h-0 flex-1 flex-col px-4 py-6">
        <p className="text-muted-foreground text-sm">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="bg-background flex min-h-0 flex-1 flex-col px-4 py-6">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <header className="space-y-2">
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            Settings
          </h1>
          <p className="text-muted-foreground text-sm">
            Configure salary month start, global categories, and home cards.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Button
              type="button"
              onClick={async () => {
                setSaveMessage(null);
                try {
                  await saveToCloud();
                  setSaveMessage("Settings synced to cloud.");
                } catch (e) {
                  const msg =
                    e instanceof Error ? e.message : "Could not sync settings.";
                  setSaveMessage(msg);
                }
              }}
              disabled={!canSyncToCloud || cloudSyncing}
            >
              {cloudSyncing ? "Saving..." : "Save settings"}
            </Button>
            {!canSyncToCloud ? (
              <p className="text-muted-foreground text-xs">
                Sign in to save settings to database.
              </p>
            ) : null}
            {saveMessage ? (
              <p className="text-xs">{saveMessage}</p>
            ) : cloudError ? (
              <p className="text-destructive text-xs">{cloudError}</p>
            ) : null}
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Month start date</CardTitle>
            <CardDescription>
              Salary month tracking will use this day as the month start.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:max-w-xs">
            <Label htmlFor="month-start-day">Start day (1-28)</Label>
            <select
              id="month-start-day"
              className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
              value={String(settings.month_start_day)}
              onChange={(e) => {
                const nextDay = Number(e.target.value);
                setSettings((prev) => ({
                  ...prev,
                  month_start_day: Number.isFinite(nextDay) ? nextDay : prev.month_start_day,
                }));
              }}
            >
              {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Global categories</CardTitle>
            <CardDescription>
              These categories are used automatically in Vehicle and Credits logs.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {expenseCategories.length === 0 ? (
              <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
                Add at least one expense category first from Categories page.
              </p>
            ) : null}

            <div className="grid gap-2 sm:max-w-md">
              <Label htmlFor="vehicle-global-category">Vehicle global category</Label>
              <select
                id="vehicle-global-category"
                className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
                value={vehicleState.details.log_category_id ?? ""}
                onChange={(e) => {
                  const nextCategoryId = normalizeCategoryId(e.target.value);
                  setVehicleState((prev) => ({
                    ...prev,
                    details: {
                      ...prev.details,
                      log_category_id: nextCategoryId,
                    },
                    service_logs: prev.service_logs.map((row) => ({
                      ...row,
                      category_id: nextCategoryId,
                    })),
                    upgrade_logs: prev.upgrade_logs.map((row) => ({
                      ...row,
                      category_id: nextCategoryId,
                    })),
                    fuel_logs: prev.fuel_logs.map((row) => ({
                      ...row,
                      category_id: nextCategoryId,
                    })),
                  }));
                }}
              >
                <option value="">No category</option>
                {expenseCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2 sm:max-w-md">
              <Label htmlFor="credits-global-category">Credits expense category</Label>
              <select
                id="credits-global-category"
                className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
                value={creditsState.global_expense_category_id ?? ""}
                onChange={(e) => {
                  const nextCategoryId = normalizeCategoryId(e.target.value);
                  setCreditsState((prev) =>
                    updateCreditsGlobalCategoryLocal(prev, nextCategoryId)
                  );
                }}
              >
                <option value="">No category</option>
                {expenseCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Home cards</CardTitle>
            <CardDescription>
              Choose which summary cards are visible on the Home page.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-3 py-2">
              <div>
                <p className="text-sm font-medium">Vehicle card</p>
                <p className="text-muted-foreground text-xs">Bike spend summary card.</p>
              </div>
              <Button
                type="button"
                variant={settings.home_cards.vehicle ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    home_cards: {
                      ...prev.home_cards,
                      vehicle: !prev.home_cards.vehicle,
                    },
                  }))
                }
              >
                {settings.home_cards.vehicle ? "Enabled" : "Disabled"}
              </Button>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-3 py-2">
              <div>
                <p className="text-sm font-medium">Seetu card</p>
                <p className="text-muted-foreground text-xs">Seetu summary card.</p>
              </div>
              <Button
                type="button"
                variant={settings.home_cards.seetu ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    home_cards: {
                      ...prev.home_cards,
                      seetu: !prev.home_cards.seetu,
                    },
                  }))
                }
              >
                {settings.home_cards.seetu ? "Enabled" : "Disabled"}
              </Button>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-3 py-2">
              <div>
                <p className="text-sm font-medium">Salary advance card</p>
                <p className="text-muted-foreground text-xs">
                  Salary advance summary card.
                </p>
              </div>
              <Button
                type="button"
                variant={settings.home_cards.salary_advance ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    home_cards: {
                      ...prev.home_cards,
                      salary_advance: !prev.home_cards.salary_advance,
                    },
                  }))
                }
              >
                {settings.home_cards.salary_advance ? "Enabled" : "Disabled"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
