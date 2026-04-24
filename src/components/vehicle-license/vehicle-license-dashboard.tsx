"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";

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
import { useVehicleLicense } from "@/contexts/vehicle-license-context";
import { formatMoney } from "@/lib/currency";
import {
  addFuelLogLocal,
  addServiceLogLocal,
  addUpgradeLogLocal,
  removeFuelLogLocal,
  removeServiceLogLocal,
  removeUpgradeLogLocal,
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
  const [error, setError] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<VehicleTab>("service");

  const [serviceDate, setServiceDate] = React.useState(todayIso);
  const [serviceCharge, setServiceCharge] = React.useState("");
  const [servicePartsTitle, setServicePartsTitle] = React.useState("");
  const [servicePartPrice, setServicePartPrice] = React.useState("");
  const [servicePartAssembleFee, setServicePartAssembleFee] = React.useState("");

  const [upgradeDate, setUpgradeDate] = React.useState(todayIso);
  const [upgradeTitle, setUpgradeTitle] = React.useState("");
  const [upgradePartPrice, setUpgradePartPrice] = React.useState("");
  const [upgradePartAssembleFee, setUpgradePartAssembleFee] = React.useState("");

  const [fuelDate, setFuelDate] = React.useState(todayIso);
  const [fuelLiters, setFuelLiters] = React.useState("");
  const [fuelAmount, setFuelAmount] = React.useState("");

  const upgradeRows = React.useMemo(() => getUpgradeRows(state), [state]);

  function setDetail<K extends keyof typeof state.details>(
    key: K,
    value: (typeof state.details)[K]
  ) {
    setState((prev) => ({
      ...prev,
      details: {
        ...prev.details,
        [key]: value,
      },
    }));
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
    setState((prev) =>
      addServiceLogLocal(prev, {
        service_date: serviceDate,
        service_charge: charge,
        parts_title: servicePartsTitle,
        part_price: partPrice,
        part_assemble_fee: partAssembleFee,
      })
    );
    setServiceCharge("");
    setServicePartsTitle("");
    setServicePartPrice("");
    setServicePartAssembleFee("");
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
    setState((prev) =>
      addUpgradeLogLocal(prev, {
        upgrade_date: upgradeDate,
        title: upgradeTitle,
        part_price: partPrice,
        part_assemble_fee: partAssembleFee,
      })
    );
    setUpgradeTitle("");
    setUpgradePartPrice("");
    setUpgradePartAssembleFee("");
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
    setState((prev) =>
      addFuelLogLocal(prev, {
        filled_on: fuelDate,
        liters,
        amount,
      })
    );
    setFuelLiters("");
    setFuelAmount("");
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

      <Card>
        <CardHeader>
          <CardTitle>Bike details</CardTitle>
          <CardDescription>
            Save your vehicle information once and update when needed.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="bike-number">Bike number</Label>
            <Input
              id="bike-number"
              value={state.details.bike_number}
              onChange={(e) => setDetail("bike_number", e.target.value)}
              placeholder="ABC-1234"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bike-chassis">Chassis number</Label>
            <Input
              id="bike-chassis"
              value={state.details.chassis_number}
              onChange={(e) => setDetail("chassis_number", e.target.value)}
              placeholder="Chassis no."
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bike-year">Year made</Label>
            <Input
              id="bike-year"
              value={state.details.year_made}
              onChange={(e) => setDetail("year_made", e.target.value)}
              placeholder="2024"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bike-model">Model</Label>
            <Input
              id="bike-model"
              value={state.details.model}
              onChange={(e) => setDetail("model", e.target.value)}
              placeholder="Model"
            />
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
                  Add service
                </Button>
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
                  <th className="text-muted-foreground w-20 px-3 py-2.5 text-xs font-medium tracking-wide uppercase">
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
                  Add upgrade
                </Button>
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
                  <th className="text-muted-foreground w-20 px-3 py-2.5 text-xs font-medium tracking-wide uppercase">
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
                  Add fuel
                </Button>
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
                  <th className="text-muted-foreground w-20 px-3 py-2.5 text-xs font-medium tracking-wide uppercase">
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
