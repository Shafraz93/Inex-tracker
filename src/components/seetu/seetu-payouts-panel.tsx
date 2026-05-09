"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import Link from "next/link";

import { useSeetu } from "@/contexts/seetu-context";
import { formatMoney } from "@/lib/currency";
import {
  paidAmountCollectedForCycle,
  poolPayoutPerCycle,
  rowShareBreakdown,
} from "@/lib/seetu/money";
import { monthLabelLong, monthStartForCycle } from "@/lib/seetu/months";
import {
  allPayerIds,
  paymentMap,
  rowNamesJoined,
  monthLabelShort,
} from "@/lib/seetu/seetu-shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function SeetuPayoutsPanel() {
  const {
    pools,
    selectedPoolId,
    setSelectedPoolId,
    selected,
    hydrated,
    error,
    setPaid,
    updateCycle,
  } = useSeetu();

  const currentYm = React.useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const [openCycleIds, setOpenCycleIds] = React.useState<Set<string>>(
    () => new Set()
  );

  React.useEffect(() => {
    if (!selected) return;
    const currentCycle = selected.seetu_cycles.find((cycle) => {
      const monthIso =
        cycle.month_start ??
        monthStartForCycle(selected, cycle.cycle_number);
      return monthIso?.slice(0, 7) === currentYm;
    });
    setOpenCycleIds(new Set(currentCycle ? [currentCycle.id] : []));
  }, [selected?.id, currentYm]);

  function toggleCycle(id: string) {
    setOpenCycleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  if (!hydrated) {
    return (
      <div className="flex flex-col gap-8">
        {/* pool selector */}
        <div className="flex flex-col gap-2">
          <div className="h-4 w-10 animate-pulse rounded bg-muted" />
          <div className="h-10 w-full max-w-md animate-pulse rounded-lg bg-muted" />
        </div>

        {/* pool details card */}
        <div className="rounded-xl border border-border p-4">
          <div className="mb-3 h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-lg border border-border p-3">
                <div className="mb-2 h-3 w-20 animate-pulse rounded bg-muted" />
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>

        {/* accordion items */}
        <div className="flex flex-col gap-2">
          <div className="mb-2 h-5 w-16 animate-pulse rounded bg-muted" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
              <div className="flex flex-col gap-1.5">
                <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                <div className="h-3 w-40 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-4 w-4 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {error ? (
        <p className="text-destructive bg-destructive/10 rounded-lg px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}

      {pools.length > 0 ? (
        <section className="flex flex-col gap-2">
          <Label htmlFor="payout-pool-select">Pool</Label>
          <div className="relative max-w-md">
            <select
              id="payout-pool-select"
              className={cn(
                "border-input bg-background h-10 w-full appearance-none rounded-lg border px-3 pr-10 text-sm outline-none",
                "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              )}
              value={selectedPoolId ?? ""}
              onChange={(e) => setSelectedPoolId(e.target.value || null)}
            >
              {pools.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                  {p.is_locked ? " (locked)" : ""}
                </option>
              ))}
            </select>
            <ChevronDown className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2" />
          </div>
        </section>
      ) : null}

      {selected ? (
        <section className="flex flex-col gap-6">
          {(() => {
            const cycles = selected.seetu_cycles;
            const lastCycle = cycles[cycles.length - 1] ?? null;
            const endMonthIso = lastCycle
              ? (lastCycle.month_start ?? monthStartForCycle(selected, lastCycle.cycle_number))
              : null;
            return (
              <div className="rounded-xl border border-border p-4">
                <p className="text-foreground mb-3 text-sm font-medium">Pool details</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-muted-foreground mb-1 text-xs">Starting month</p>
                    <p className="text-sm font-semibold">
                      {selected.start_month ? monthLabelLong(selected.start_month) : "—"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-muted-foreground mb-1 text-xs">Ending month</p>
                    <p className="text-sm font-semibold">
                      {endMonthIso ? monthLabelLong(endMonthIso) : "—"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-muted-foreground mb-1 text-xs">Turns</p>
                    <p className="text-sm font-semibold">{cycles.length}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-muted-foreground mb-1 text-xs">Per turn value</p>
                    <p className="text-sm font-semibold">{formatMoney(poolPayoutPerCycle(selected))}</p>
                  </div>
                </div>
              </div>
            );
          })()}

          {selected.seetu_cycles.length > 0 ? (
            <div className="space-y-4">
              <h2 className="text-base font-semibold">Payouts</h2>
              <ul className="flex flex-col gap-2">
                {selected.seetu_cycles.map((cycle) => {
                  const isOpen = openCycleIds.has(cycle.id);
                  const pm = paymentMap(cycle);
                  const receiverRow = selected.seetu_roster_rows.find(
                    (r) => r.id === cycle.receiver_roster_row_id
                  );
                  const paidTotal = paidAmountCollectedForCycle(
                    selected,
                    cycle
                  );
                  const monthIso =
                    cycle.month_start ??
                    monthStartForCycle(selected, cycle.cycle_number);
                  const monthTitle = monthLabelLong(monthIso);
                  const isCurrentMonth = monthIso?.slice(0, 7) === currentYm;

                  return (
                    <li
                      key={cycle.id}
                      className="bg-card overflow-hidden rounded-xl border border-border"
                    >
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                        onClick={() => toggleCycle(cycle.id)}
                      >
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="text-foreground text-sm font-semibold">
                            {monthTitle}
                            {isCurrentMonth ? (
                              <span className="text-primary ml-2 text-xs font-medium">
                                Current
                              </span>
                            ) : null}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            Turn #{cycle.cycle_number}
                            {receiverRow
                              ? ` · ${rowNamesJoined(receiverRow)} receives pot`
                              : ""}
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-muted-foreground text-xs tabular-nums">
                            {formatMoney(paidTotal)} collected
                          </span>
                          <ChevronDown
                            className={cn(
                              "text-muted-foreground size-4 transition-transform duration-200",
                              isOpen && "rotate-180"
                            )}
                          />
                        </div>
                      </button>

                      {isOpen ? (
                        <div className="border-t border-border px-4 pb-4 pt-3">
                          <p className="text-muted-foreground mb-3 text-sm leading-relaxed">
                            Tick each person when they&apos;ve given you their
                            share. Total from people who have paid (checked
                            above):{" "}
                            <span className="text-foreground font-medium">
                              {formatMoney(paidTotal)}
                            </span>
                            . Pay{" "}
                            <span className="text-foreground font-medium">
                              {receiverRow
                                ? rowNamesJoined(receiverRow)
                                : "—"}
                            </span>{" "}
                            (turn #{cycle.cycle_number}) when you have
                            collected what you need for the month.
                          </p>

                          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                            <div className="grid gap-1 sm:w-44">
                              <Label
                                className="text-xs"
                                htmlFor={`month-${cycle.id}`}
                              >
                                Month date (override)
                              </Label>
                              <Input
                                id={`month-${cycle.id}`}
                                type="date"
                                value={cycle.month_start ?? ""}
                                onChange={(e) =>
                                  updateCycle(selected.id, cycle.id, {
                                    month_start: e.target.value || null,
                                  })
                                }
                              />
                            </div>
                            <div className="grid min-w-48 flex-1 gap-1">
                              <Label
                                className="text-xs"
                                htmlFor={`recv-${cycle.id}`}
                              >
                                Who receives the pot
                              </Label>
                              <select
                                id={`recv-${cycle.id}`}
                                className={cn(
                                  "border-input bg-background h-9 w-full rounded-md border px-2 text-sm",
                                  "outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                )}
                                value={cycle.receiver_roster_row_id ?? ""}
                                onChange={(e) =>
                                  updateCycle(selected.id, cycle.id, {
                                    receiver_roster_row_id: e.target.value
                                      ? e.target.value
                                      : null,
                                  })
                                }
                              >
                                <option value="">—</option>
                                {[...selected.seetu_roster_rows]
                                  .sort((a, b) => a.sort_order - b.sort_order)
                                  .map((r, i) => (
                                    <option key={r.id} value={r.id}>
                                      #{i + 1}{" "}
                                      {rowNamesJoined(r) || `Turn ${i + 1}`}
                                    </option>
                                  ))}
                              </select>
                            </div>
                          </div>

                          <p className="text-muted-foreground mb-2 text-xs font-medium">
                            Paid you ({monthLabelShort(monthIso)})
                          </p>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {allPayerIds(selected).map((pid) => {
                              const payer = selected.seetu_roster_rows
                                .flatMap((r) =>
                                  r.seetu_row_payers.map((p) => ({
                                    p,
                                    row: r,
                                  }))
                                )
                                .find((x) => x.p.id === pid);
                              if (!payer) return null;
                              const { p: m, row: r } = payer;
                              return (
                                <label
                                  key={pid}
                                  className="bg-muted/40 flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    className="accent-primary size-4"
                                    checked={pm.get(pid) ?? false}
                                    onChange={(e) =>
                                      setPaid(
                                        selected.id,
                                        cycle.id,
                                        pid,
                                        e.target.checked
                                      )
                                    }
                                  />
                                  <span>
                                    {m.name}
                                    <span className="text-muted-foreground text-xs">
                                      {" "}
                                      (
                                      {formatMoney(
                                        rowShareBreakdown(r, selected).get(
                                          m.id
                                        ) ?? 0
                                      )}
                                      )
                                    </span>
                                  </span>
                                  {cycle.receiver_roster_row_id === r.id ? (
                                    <span className="text-primary ml-auto text-xs font-medium">
                                      Receives pot
                                    </span>
                                  ) : null}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <div className="text-muted-foreground space-y-2 rounded-xl border border-dashed border-border px-4 py-6 text-sm">
              <p>No payment months yet for this pool.</p>
              <p>
                Add roster rows and tap{" "}
                <strong>Create months</strong> on the{" "}
                <Link href="/seetu/pools" className="text-primary underline">
                  Pools
                </Link>{" "}
                page.
              </p>
            </div>
          )}
        </section>
      ) : pools.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Create a pool on the{" "}
          <Link href="/seetu/pools" className="text-primary underline">
            Pools
          </Link>{" "}
          page first.
        </p>
      ) : null}
    </div>
  );
}
