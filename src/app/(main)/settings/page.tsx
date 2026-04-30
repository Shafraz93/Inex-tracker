"use client";

import * as React from "react";
import { ArrowDown, ArrowUp } from "lucide-react";

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
import type { AppFeatureKey, HomeCardKey } from "@/lib/app-settings/local-storage";
import { updateCreditsGlobalCategoryLocal } from "@/lib/credits/local-storage";

function normalizeCategoryId(value: string): string | null {
  const v = value.trim();
  return v.length > 0 ? v : null;
}

const HOME_CARD_META: Record<
  HomeCardKey,
  { title: string; description: string }
> = {
  vehicle: {
    title: "Vehicle card",
    description: "Bike spend summary card.",
  },
  food_groceries: {
    title: "Food & groceries card",
    description: "Quickly add food/grocery expenses from Home.",
  },
  seetu: {
    title: "Seetu card",
    description: "Seetu summary card.",
  },
  salary_advance: {
    title: "Salary advance card",
    description: "Salary advance summary card.",
  },
};

const OPTIONAL_FEATURE_META: Record<
  AppFeatureKey,
  { title: string; description: string }
> = {
  vehicle_logs: {
    title: "Vehicle logs",
    description: "Bike service, upgrade, and fuel logs.",
  },
  credits: {
    title: "Credits",
    description: "Borrowed/settled credit tracking.",
  },
  salary_advance: {
    title: "Salary advance",
    description: "Advance and repayment tracking.",
  },
  seetu: {
    title: "Seetu",
    description: "Rotating savings pools and payouts.",
  },
};

const HOME_CARD_FEATURE_MAP: Record<HomeCardKey, AppFeatureKey | null> = {
  vehicle: "vehicle_logs",
  food_groceries: null,
  seetu: "seetu",
  salary_advance: "salary_advance",
};

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

  function moveHomeCard(card: HomeCardKey, direction: -1 | 1) {
    setSettings((prev) => {
      const order = [...prev.home_card_order];
      const from = order.indexOf(card);
      if (from < 0) return prev;
      const to = from + direction;
      if (to < 0 || to >= order.length) return prev;
      [order[from], order[to]] = [order[to], order[from]];
      return {
        ...prev,
        home_card_order: order,
      };
    });
  }

  const expenseCategories = React.useMemo(
    () => budgetState.categories.filter((c) => c.kind === "expense"),
    [budgetState.categories]
  );
  const enabledHomeCards = settings.home_card_order.filter(
    (cardKey) => {
      const feature = HOME_CARD_FEATURE_MAP[cardKey];
      return feature == null || settings.app_features[feature];
    }
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
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="space-y-2">
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            Settings
          </h1>
          <p className="text-muted-foreground text-sm">
            Configure salary month start, optional features, global categories, and home cards.
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
            <CardTitle>Optional features</CardTitle>
            <CardDescription>
              Budget, Income, and Expenses are always enabled. Toggle other
              features to show or hide them in the app.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {(Object.keys(OPTIONAL_FEATURE_META) as AppFeatureKey[]).map((featureKey) => (
              <div
                key={featureKey}
                className="flex items-center justify-between gap-4 rounded-lg border border-border px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{OPTIONAL_FEATURE_META[featureKey].title}</p>
                  <p className="text-muted-foreground text-xs">
                    {OPTIONAL_FEATURE_META[featureKey].description}
                  </p>
                </div>
                <Button
                  type="button"
                  variant={settings.app_features[featureKey] ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    setSettings((prev) => ({
                      ...prev,
                      app_features: {
                        ...prev.app_features,
                        [featureKey]: !prev.app_features[featureKey],
                      },
                    }))
                  }
                >
                  {settings.app_features[featureKey] ? "Enabled" : "Disabled"}
                </Button>
              </div>
            ))}
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
              Choose which summary cards are visible on the Home page and arrange their order.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {enabledHomeCards.length === 0 ? (
              <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
                No Home cards available. Enable at least one related feature in
                Optional features.
              </p>
            ) : null}
            {enabledHomeCards.map((cardKey, idx) => (
              <div
                key={cardKey}
                className="flex items-center justify-between gap-4 rounded-lg border border-border px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{HOME_CARD_META[cardKey].title}</p>
                  <p className="text-muted-foreground text-xs">
                    {HOME_CARD_META[cardKey].description}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-xs"
                    aria-label={`Move ${HOME_CARD_META[cardKey].title} up`}
                    disabled={idx === 0}
                    onClick={() => moveHomeCard(cardKey, -1)}
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-xs"
                    aria-label={`Move ${HOME_CARD_META[cardKey].title} down`}
                    disabled={idx === enabledHomeCards.length - 1}
                    onClick={() => moveHomeCard(cardKey, 1)}
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant={settings.home_cards[cardKey] ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      setSettings((prev) => ({
                        ...prev,
                        home_cards: {
                          ...prev.home_cards,
                          [cardKey]: !prev.home_cards[cardKey],
                        },
                      }))
                    }
                  >
                    {settings.home_cards[cardKey] ? "Enabled" : "Disabled"}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
