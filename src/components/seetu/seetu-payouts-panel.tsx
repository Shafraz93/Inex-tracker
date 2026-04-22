"use client";

import { ChevronDown, Lock } from "lucide-react";
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

  const locked = selected?.is_locked ?? false;

  if (!hydrated) {
    return (
      <p className="text-muted-foreground text-sm">Loading saved data…</p>
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
          {locked ? (
            <div className="flex gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-50">
              <Lock className="mt-0.5 size-4 shrink-0" />
              <p className="leading-relaxed">
                This pool is <strong>locked</strong>. Payment checkmarks and
                month settings cannot be changed. Unlock it on the{" "}
                <Link href="/seetu/pools" className="text-primary underline">
                  Pools
                </Link>{" "}
                page if you need to edit.
              </p>
            </div>
          ) : null}
          <div className="bg-primary/10 border-primary/25 space-y-2 rounded-xl border px-4 py-4 text-sm">
            <p className="text-primary font-medium">Your workflow</p>
            <p className="text-foreground leading-relaxed">
              Each month, <strong>everyone</strong> pays their share. You
              collect all of it. The person whose <strong>turn number</strong>{" "}
              matches that month receives the <strong>full pot</strong> from you
              in one transfer. Tick people below when they&apos;ve paid you.
            </p>
            {selected.start_month ? (
              <p className="text-muted-foreground text-xs">
                First month:{" "}
                <span className="text-foreground font-medium">
                  {monthLabelLong(selected.start_month)}
                </span>{" "}
                = turn #1.
              </p>
            ) : (
              <p className="text-muted-foreground text-xs">
                Set the first month on the{" "}
                <Link href="/seetu/pools" className="text-primary underline">
                  Pools
                </Link>{" "}
                page for clearer month names.
              </p>
            )}
          </div>

          <div className="bg-muted/50 space-y-2 rounded-xl border border-border px-4 py-4 text-sm">
            <p className="font-medium">This month&apos;s totals</p>
            <p>
              <span className="text-muted-foreground">Slot per roster row:</span>{" "}
              {formatMoney(selected.contribution_per_slot)}
            </p>
            <p>
              <span className="text-muted-foreground">Turns:</span>{" "}
              {selected.seetu_roster_rows.length}
            </p>
            <p>
              <span className="text-muted-foreground">
                Full pot when everyone has paid you:
              </span>{" "}
              <span className="font-semibold">
                {formatMoney(poolPayoutPerCycle(selected))}
              </span>
            </p>
          </div>

          {selected.seetu_cycles.length > 0 ? (
            <div className="space-y-4">
              <h2 className="text-base font-semibold">
                Payouts
              </h2>
              <ul className="flex flex-col gap-4">
                {selected.seetu_cycles.map((cycle) => {
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
                  return (
                    <li
                      key={cycle.id}
                      className="bg-card rounded-xl border border-border p-4"
                    >
                      <div className="border-border mb-3 space-y-2 border-b pb-3">
                        <p className="text-foreground text-base font-semibold">
                          {monthTitle}{" "}
                          <span className="text-muted-foreground font-normal">
                            · Turn #{cycle.cycle_number}
                          </span>
                        </p>
                        <p className="text-muted-foreground text-sm leading-relaxed">
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
                          (turn #{cycle.cycle_number}) when you have collected
                          what you need for the month.
                        </p>
                      </div>
                      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                        <div className="grid gap-1 sm:w-44">
                          <Label className="text-xs" htmlFor={`month-${cycle.id}`}>
                            Month date (override)
                          </Label>
                          <Input
                            id={`month-${cycle.id}`}
                            type="date"
                            disabled={locked}
                            value={cycle.month_start ?? ""}
                            onChange={(e) =>
                              updateCycle(selected.id, cycle.id, {
                                month_start: e.target.value || null,
                              })
                            }
                          />
                        </div>
                        <div className="grid min-w-48 flex-1 gap-1">
                          <Label className="text-xs" htmlFor={`recv-${cycle.id}`}>
                            Who receives the pot
                          </Label>
                          <select
                            id={`recv-${cycle.id}`}
                            disabled={locked}
                            className={cn(
                              "border-input bg-background h-9 w-full rounded-md border px-2 text-sm",
                              "outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                              locked && "cursor-not-allowed opacity-60"
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
                              className={cn(
                                "bg-muted/40 flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
                                locked
                                  ? "cursor-not-allowed opacity-70"
                                  : "cursor-pointer"
                              )}
                            >
                              <input
                                type="checkbox"
                                className="accent-primary size-4"
                                disabled={locked}
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
                                    rowShareBreakdown(r, selected).get(m.id) ??
                                      0
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
