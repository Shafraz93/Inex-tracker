"use client";

import * as React from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBudgetTracker } from "@/contexts/budget-tracker-context";
import { useVehicleLicense } from "@/contexts/vehicle-license-context";
import { formatMoney } from "@/lib/currency";
import {
  addFuelLogLocal,
  addServiceLogLocal,
  addUpgradeLogLocal,
  removeFuelLogLocal,
  removeServiceLogLocal,
  removeUpgradeLogLocal,
  updateFuelLogLocal,
  updateServiceLogLocal,
  updateUpgradeLogLocal,
} from "@/lib/vehicle-license/local-storage";
import { getUpgradeRows } from "@/lib/vehicle-license/summary";

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type VehicleTab = "service" | "upgrades" | "fuel";

export function VehicleLicenseDashboard() {
  const { state, setState, hydrated } = useVehicleLicense();
  const { state: budgetState } = useBudgetTracker();
  const [error, setError] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<VehicleTab>("service");

  const [serviceDate, setServiceDate] = React.useState(todayIso);
  const [serviceCharge, setServiceCharge] = React.useState("");
  const [servicePartsTitle, setServicePartsTitle] = React.useState("");
  const [servicePartPrice, setServicePartPrice] = React.useState("");
  const [servicePartAssembleFee, setServicePartAssembleFee] = React.useState("");
  const [editingServiceId, setEditingServiceId] = React.useState<string | null>(null);

  const [upgradeDate, setUpgradeDate] = React.useState(todayIso);
  const [upgradeTitle, setUpgradeTitle] = React.useState("");
  const [upgradePartPrice, setUpgradePartPrice] = React.useState("");
  const [upgradePartAssembleFee, setUpgradePartAssembleFee] = React.useState("");
  const [editingUpgradeId, setEditingUpgradeId] = React.useState<string | null>(null);

  const [fuelDate, setFuelDate] = React.useState(todayIso);
  const [fuelLiters, setFuelLiters] = React.useState("");
  const [fuelAmount, setFuelAmount] = React.useState("");
  const [editingFuelId, setEditingFuelId] = React.useState<string | null>(null);
  const [isEditingDetails, setIsEditingDetails] = React.useState(false);
  const [detailsDraft, setDetailsDraft] = React.useState(state.details);
  const detailsView = isEditingDetails ? detailsDraft : state.details;

  const upgradeRows = React.useMemo(() => getUpgradeRows(state), [state]);
  const expenseCategories = React.useMemo(
    () => budgetState.categories.filter((c) => c.kind === "expense"),
    [budgetState.categories]
  );
  const categoryNameById = React.useMemo(
    () => new Map(expenseCategories.map((c) => [c.id, c.name])),
    [expenseCategories]
  );
  const globalCategoryValue =
    state.details.log_category_id && categoryNameById.has(state.details.log_category_id)
      ? state.details.log_category_id
      : "";

  function setDetailDraft<K extends keyof typeof state.details>(
    key: K,
    value: (typeof state.details)[K]
  ) {
    setDetailsDraft((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function onSaveDetails() {
    const nextCategoryId =
      detailsDraft.log_category_id &&
      categoryNameById.has(detailsDraft.log_category_id)
        ? detailsDraft.log_category_id
        : null;

    if (expenseCategories.length > 0 && !nextCategoryId) {
      setError("Select a global category for vehicle logs.");
      return;
    }

    setState((prev) => ({
      ...prev,
      details: {
        bike_number: detailsDraft.bike_number.trim(),
        chassis_number: detailsDraft.chassis_number.trim(),
        year_made: detailsDraft.year_made.trim(),
        model: detailsDraft.model.trim(),
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
    setError(null);
    setIsEditingDetails(false);
  }

  function resetServiceForm() {
    setEditingServiceId(null);
    setServiceDate(todayIso());
    setServiceCharge("");
    setServicePartsTitle("");
    setServicePartPrice("");
    setServicePartAssembleFee("");
  }

  function resetUpgradeForm() {
    setEditingUpgradeId(null);
    setUpgradeDate(todayIso());
    setUpgradeTitle("");
    setUpgradePartPrice("");
    setUpgradePartAssembleFee("");
  }

  function resetFuelForm() {
    setEditingFuelId(null);
    setFuelDate(todayIso());
    setFuelLiters("");
    setFuelAmount("");
  }

  function onAddService(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const charge = Number(serviceCharge.replace(/,/g, ""));
    const partPrice = Number(servicePartPrice.replace(/,/g, "") || "0");
    const partAssembleFee = Number(
      servicePartAssembleFee.replace(/,/g, "") || "0"
    );
    if (!serviceDate.trim()) {
      setError("Choose the service date.");
      return;
    }
    if (!Number.isFinite(charge) || charge < 0) {
      setError("Enter a valid service charge.");
      return;
    }
    if (!Number.isFinite(partPrice) || partPrice < 0) {
      setError("Enter a valid part price.");
      return;
    }
    if (!Number.isFinite(partAssembleFee) || partAssembleFee < 0) {
      setError("Enter a valid part assemble fee.");
      return;
    }
    if (!globalCategoryValue) {
      setError("Set a global vehicle category in Bike details first.");
      return;
    }
    const payload = {
      service_date: serviceDate,
      category_id: globalCategoryValue,
      service_charge: charge,
      parts_title: servicePartsTitle,
      part_price: partPrice,
      part_assemble_fee: partAssembleFee,
    };
    setState((prev) =>
      editingServiceId
        ? updateServiceLogLocal(prev, editingServiceId, payload)
        : addServiceLogLocal(prev, payload)
    );
    resetServiceForm();
  }

  function onAddUpgrade(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const partPrice = Number(upgradePartPrice.replace(/,/g, "") || "0");
    const partAssembleFee = Number(
      upgradePartAssembleFee.replace(/,/g, "") || "0"
    );
    if (!upgradeDate.trim()) {
      setError("Choose the upgrade date.");
      return;
    }
    if (!upgradeTitle.trim()) {
      setError("Enter upgrade or part change title.");
      return;
    }
    if (!Number.isFinite(partPrice) || partPrice < 0) {
      setError("Enter a valid part price.");
      return;
    }
    if (!Number.isFinite(partAssembleFee) || partAssembleFee < 0) {
      setError("Enter a valid part assemble fee.");
      return;
    }
    if (!globalCategoryValue) {
      setError("Set a global vehicle category in Bike details first.");
      return;
    }
    const payload = {
      upgrade_date: upgradeDate,
      category_id: globalCategoryValue,
      title: upgradeTitle,
      part_price: partPrice,
      part_assemble_fee: partAssembleFee,
    };
    setState((prev) =>
      editingUpgradeId
        ? updateUpgradeLogLocal(prev, editingUpgradeId, payload)
        : addUpgradeLogLocal(prev, payload)
    );
    resetUpgradeForm();
  }

  function onAddFuel(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const liters = Number(fuelLiters.replace(/,/g, ""));
    const amount = Number(fuelAmount.replace(/,/g, ""));
    if (!fuelDate.trim()) {
      setError("Choose the fuel date.");
      return;
    }
    if (!Number.isFinite(liters) || liters <= 0) {
      setError("Enter valid liters value.");
      return;
    }
    if (!Number.isFinite(amount) || amount < 0) {
      setError("Enter a valid fuel amount.");
      return;
    }
    if (!globalCategoryValue) {
      setError("Set a global vehicle category in Bike details first.");
      return;
    }
    const payload = {
      filled_on: fuelDate,
      category_id: globalCategoryValue,
      liters,
      amount,
    };
    setState((prev) =>
      editingFuelId
        ? updateFuelLogLocal(prev, editingFuelId, payload)
        : addFuelLogLocal(prev, payload)
    );
    resetFuelForm();
  }

  if (!hydrated) {
    return <p className="text-muted-foreground text-sm">Loading...</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="max-w-2xl space-y-2">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Vehicle logs
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Track bike details, service spending, upgrades/parts changes, and fuel
          logs in one place.
        </p>
      </header>

      {error ? (
        <p className="text-destructive bg-destructive/10 rounded-lg px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}
      {expenseCategories.length === 0 ? (
        <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
          Add at least one `Expense` category in the Categories page to create
          vehicle logs.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Bike details</CardTitle>
              <CardDescription>
                Save your vehicle information and set one global category for all
                vehicle logs.
              </CardDescription>
            </div>
            {isEditingDetails ? (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDetailsDraft(state.details);
                    setIsEditingDetails(false);
                  }}
                >
                  <X className="size-4" />
                  Cancel
                </Button>
                <Button type="button" onClick={onSaveDetails}>
                  Save
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDetailsDraft(state.details);
                  setIsEditingDetails(true);
                }}
              >
                <Pencil className="size-4" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="bike-number">Bike number</Label>
            <Input
              id="bike-number"
              value={detailsView.bike_number}
              onChange={(e) => setDetailDraft("bike_number", e.target.value)}
              readOnly={!isEditingDetails}
              placeholder="ABC-1234"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bike-chassis">Chassis number</Label>
            <Input
              id="bike-chassis"
              value={detailsView.chassis_number}
              onChange={(e) => setDetailDraft("chassis_number", e.target.value)}
              readOnly={!isEditingDetails}
              placeholder="Chassis no."
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bike-year">Year made</Label>
            <Input
              id="bike-year"
              value={detailsView.year_made}
              onChange={(e) => setDetailDraft("year_made", e.target.value)}
              readOnly={!isEditingDetails}
              placeholder="2024"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bike-model">Model</Label>
            <Input
              id="bike-model"
              value={detailsView.model}
              onChange={(e) => setDetailDraft("model", e.target.value)}
              readOnly={!isEditingDetails}
              placeholder="Model"
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="vehicle-global-category">Global log category</Label>
            <select
              id="vehicle-global-category"
              className="h-8 rounded-lg border border-input bg-background px-2 text-sm disabled:opacity-70"
              value={detailsView.log_category_id ?? ""}
              onChange={(e) =>
                setDetailDraft(
                  "log_category_id",
                  e.target.value ? e.target.value : null
                )
              }
              disabled={!isEditingDetails}
            >
              <option value="">Select category</option>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as VehicleTab)}
        className="gap-4"
      >
        <TabsList variant="line">
          <TabsTrigger value="service">Service</TabsTrigger>
          <TabsTrigger value="upgrades">Upgrade / parts</TabsTrigger>
          <TabsTrigger value="fuel">Fuel</TabsTrigger>
        </TabsList>

        <TabsContent value="service" className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Service log</CardTitle>
              <CardDescription>
                Date of service, service charge, part price, and part assemble
                fee done during service.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={onAddService}
                className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end"
              >
                <div className="grid w-full gap-2 sm:w-44">
                  <Label htmlFor="service-date">Service date</Label>
                  <Input
                    id="service-date"
                    type="date"
                    value={serviceDate}
                    onChange={(e) => setServiceDate(e.target.value)}
                  />
                </div>
                <div className="grid w-full gap-2 sm:w-44">
                  <Label htmlFor="service-charge">Service charge</Label>
                  <Input
                    id="service-charge"
                    inputMode="decimal"
                    value={serviceCharge}
                    onChange={(e) => setServiceCharge(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="grid w-full gap-2 sm:w-64">
                  <Label htmlFor="service-parts-title">Parts/upgrade notes</Label>
                  <Input
                    id="service-parts-title"
                    value={servicePartsTitle}
                    onChange={(e) => setServicePartsTitle(e.target.value)}
                    placeholder="Oil filter / brake pad / tune-up"
                  />
                </div>
                <div className="grid w-full gap-2 sm:w-44">
                  <Label htmlFor="service-part-price">Part price</Label>
                  <Input
                    id="service-part-price"
                    inputMode="decimal"
                    value={servicePartPrice}
                    onChange={(e) => setServicePartPrice(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="grid w-full gap-2 sm:w-44">
                  <Label htmlFor="service-part-assemble-fee">
                    Part assemble fee
                  </Label>
                  <Input
                    id="service-part-assemble-fee"
                    inputMode="decimal"
                    value={servicePartAssembleFee}
                    onChange={(e) => setServicePartAssembleFee(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <Button type="submit">
                  <Plus className="size-4" />
                  {editingServiceId ? "Update service" : "Add service"}
                </Button>
                {editingServiceId ? (
                  <Button type="button" variant="outline" onClick={resetServiceForm}>
                    <X className="size-4" />
                    Cancel
                  </Button>
                ) : null}
              </form>
            </CardContent>
          </Card>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-lg text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border text-left">
                  <th className="text-muted-foreground px-3 py-2.5 text-xs font-medium tracking-wide uppercase">
                    Service date
                  </th>
                  <th className="text-muted-foreground px-3 py-2.5 text-xs font-medium tracking-wide uppercase">
                    Service charge
                  </th>
                  <th className="text-muted-foreground px-3 py-2.5 text-xs font-medium tracking-wide uppercase">
                    Parts / upgrade
                  </th>
                  <th className="text-muted-foreground px-3 py-2.5 text-xs font-medium tracking-wide uppercase">
                    Part price
                  </th>
                  <th className="text-muted-foreground px-3 py-2.5 text-xs font-medium tracking-wide uppercase">
                    Assemble fee
                  </th>
                  <th className="text-muted-foreground px-3 py-2.5 text-xs font-medium tracking-wide uppercase">
                    Total
                  </th>
                  <th className="text-muted-foreground w-28 px-3 py-2.5 text-xs font-medium tracking-wide uppercase">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {state.service_logs.length > 0 ? (
                  state.service_logs.map((row) => (
                    <tr key={row.id} className="bg-card">
                      <td className="px-3 py-2.5 tabular-nums">{row.service_date}</td>
                      <td className="px-3 py-2.5 font-medium tabular-nums">
                        {formatMoney(row.service_charge)}
                      </td>
                      <td className="px-3 py-2.5">
                        {row.parts_title || <span className="text-muted-foreground">-</span>}
                      </td>
                      <td className="px-3 py-2.5 font-medium tabular-nums">
                        {row.part_price > 0 ? (
                          formatMoney(row.part_price)
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 font-medium tabular-nums">
                        {row.part_assemble_fee > 0 ? (
                          formatMoney(row.part_assemble_fee)
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 font-medium tabular-nums">
                        {row.part_price > 0 || row.part_assemble_fee > 0 ? (
                          formatMoney(row.part_price + row.part_assemble_fee)
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label="Edit service entry"
                            onClick={() => {
                              setEditingServiceId(row.id);
                              setServiceDate(row.service_date);
                              setServiceCharge(String(row.service_charge));
                              setServicePartsTitle(row.parts_title);
                              setServicePartPrice(String(row.part_price));
                              setServicePartAssembleFee(String(row.part_assemble_fee));
                            }}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label="Delete service entry"
                            onClick={() =>
                              setState((prev) => removeServiceLogLocal(prev, row.id))
                            }
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-muted-foreground px-3 py-6 text-center">
                      No service entries yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="upgrades" className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Upgrades / parts change log</CardTitle>
              <CardDescription>
                Add direct upgrades. Service-tab parts changes automatically show
                in this list with the same service date.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={onAddUpgrade}
                className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end"
              >
                <div className="grid w-full gap-2 sm:w-44">
                  <Label htmlFor="upgrade-date">Upgrade date</Label>
                  <Input
                    id="upgrade-date"
                    type="date"
                    value={upgradeDate}
                    onChange={(e) => setUpgradeDate(e.target.value)}
                  />
                </div>
                <div className="grid w-full gap-2 sm:w-72">
                  <Label htmlFor="upgrade-title">Upgrade / parts change</Label>
                  <Input
                    id="upgrade-title"
                    value={upgradeTitle}
                    onChange={(e) => setUpgradeTitle(e.target.value)}
                    placeholder="New tire / chain set / light upgrade"
                  />
                </div>
                <div className="grid w-full gap-2 sm:w-44">
                  <Label htmlFor="upgrade-part-price">Part price</Label>
                  <Input
                    id="upgrade-part-price"
                    inputMode="decimal"
                    value={upgradePartPrice}
                    onChange={(e) => setUpgradePartPrice(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="grid w-full gap-2 sm:w-44">
                  <Label htmlFor="upgrade-part-assemble-fee">
                    Part assemble fee
                  </Label>
                  <Input
                    id="upgrade-part-assemble-fee"
                    inputMode="decimal"
                    value={upgradePartAssembleFee}
                    onChange={(e) => setUpgradePartAssembleFee(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <Button type="submit">
                  <Plus className="size-4" />
                  {editingUpgradeId ? "Update upgrade" : "Add upgrade"}
                </Button>
                {editingUpgradeId ? (
                  <Button type="button" variant="outline" onClick={resetUpgradeForm}>
                    <X className="size-4" />
                    Cancel
                  </Button>
                ) : null}
              </form>
            </CardContent>
          </Card>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-lg text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border text-left">
                  <th className="text-muted-foreground px-3 py-2.5 text-xs font-medium tracking-wide uppercase">
                    Date
                  </th>
                  <th className="text-muted-foreground px-3 py-2.5 text-xs font-medium tracking-wide uppercase">
                    Upgrade / parts
                  </th>
                  <th className="text-muted-foreground px-3 py-2.5 text-xs font-medium tracking-wide uppercase">
                    Part price
                  </th>
                  <th className="text-muted-foreground px-3 py-2.5 text-xs font-medium tracking-wide uppercase">
                    Assemble fee
                  </th>
                  <th className="text-muted-foreground px-3 py-2.5 text-xs font-medium tracking-wide uppercase">
                    Total
                  </th>
                  <th className="text-muted-foreground px-3 py-2.5 text-xs font-medium tracking-wide uppercase">
                    Source
                  </th>
                  <th className="text-muted-foreground w-28 px-3 py-2.5 text-xs font-medium tracking-wide uppercase">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {upgradeRows.length > 0 ? (
                  upgradeRows.map((row) => (
                    <tr key={row.id} className="bg-card">
                      <td className="px-3 py-2.5 tabular-nums">{row.date}</td>
                      <td className="px-3 py-2.5">{row.title}</td>
                      <td className="px-3 py-2.5 font-medium tabular-nums">
                        {row.part_price > 0 ? (
                          formatMoney(row.part_price)
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 font-medium tabular-nums">
                        {row.part_assemble_fee > 0 ? (
                          formatMoney(row.part_assemble_fee)
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 font-medium tabular-nums">
                        {formatMoney(row.amount)}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-muted-foreground rounded bg-muted px-2 py-0.5 text-xs">
                          {row.source === "service" ? "Service entry" : "Upgrade tab"}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {row.source === "upgrade" ? (
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              aria-label="Edit upgrade entry"
                              onClick={() => {
                                const id = row.id.replace("upgrade:", "");
                                const found = state.upgrade_logs.find((r) => r.id === id);
                                if (!found) return;
                                setEditingUpgradeId(id);
                                setUpgradeDate(found.upgrade_date);
                                setUpgradeTitle(found.title);
                                setUpgradePartPrice(String(found.part_price));
                                setUpgradePartAssembleFee(
                                  String(found.part_assemble_fee)
                                );
                              }}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              aria-label="Delete upgrade entry"
                              onClick={() =>
                                setState((prev) =>
                                  removeUpgradeLogLocal(
                                    prev,
                                    row.id.replace("upgrade:", "")
                                  )
                                )
                              }
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-muted-foreground px-3 py-6 text-center">
                      No upgrade entries yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="fuel" className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Fuel log</CardTitle>
              <CardDescription>
                Record date, liters, and amount for each fill.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={onAddFuel}
                className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end"
              >
                <div className="grid w-full gap-2 sm:w-44">
                  <Label htmlFor="fuel-date">Date</Label>
                  <Input
                    id="fuel-date"
                    type="date"
                    value={fuelDate}
                    onChange={(e) => setFuelDate(e.target.value)}
                  />
                </div>
                <div className="grid w-full gap-2 sm:w-44">
                  <Label htmlFor="fuel-liters">Liters</Label>
                  <Input
                    id="fuel-liters"
                    inputMode="decimal"
                    value={fuelLiters}
                    onChange={(e) => setFuelLiters(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="grid w-full gap-2 sm:w-44">
                  <Label htmlFor="fuel-amount">Amount</Label>
                  <Input
                    id="fuel-amount"
                    inputMode="decimal"
                    value={fuelAmount}
                    onChange={(e) => setFuelAmount(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <Button type="submit">
                  <Plus className="size-4" />
                  {editingFuelId ? "Update fuel" : "Add fuel"}
                </Button>
                {editingFuelId ? (
                  <Button type="button" variant="outline" onClick={resetFuelForm}>
                    <X className="size-4" />
                    Cancel
                  </Button>
                ) : null}
              </form>
            </CardContent>
          </Card>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-md text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border text-left">
                  <th className="text-muted-foreground px-3 py-2.5 text-xs font-medium tracking-wide uppercase">
                    Date
                  </th>
                  <th className="text-muted-foreground px-3 py-2.5 text-xs font-medium tracking-wide uppercase">
                    Liters
                  </th>
                  <th className="text-muted-foreground px-3 py-2.5 text-xs font-medium tracking-wide uppercase">
                    Amount
                  </th>
                  <th className="text-muted-foreground w-28 px-3 py-2.5 text-xs font-medium tracking-wide uppercase">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {state.fuel_logs.length > 0 ? (
                  state.fuel_logs.map((row) => (
                    <tr key={row.id} className="bg-card">
                      <td className="px-3 py-2.5 tabular-nums">{row.filled_on}</td>
                      <td className="px-3 py-2.5 tabular-nums">{row.liters}</td>
                      <td className="px-3 py-2.5 font-medium tabular-nums">
                        {formatMoney(row.amount)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label="Edit fuel entry"
                            onClick={() => {
                              setEditingFuelId(row.id);
                              setFuelDate(row.filled_on);
                              setFuelLiters(String(row.liters));
                              setFuelAmount(String(row.amount));
                            }}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label="Delete fuel entry"
                            onClick={() =>
                              setState((prev) => removeFuelLogLocal(prev, row.id))
                            }
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="text-muted-foreground px-3 py-6 text-center">
                      No fuel entries yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
