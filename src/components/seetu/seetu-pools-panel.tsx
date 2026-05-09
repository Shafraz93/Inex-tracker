"use client";

import * as React from "react";
import type { ComponentProps } from "react";
import { ChevronDown, Lock, Plus, Trash2, Unlock } from "lucide-react";
import Link from "next/link";

import { useSeetu } from "@/contexts/seetu-context";
import { APP_CURRENCY_CODE, formatMoney } from "@/lib/currency";
import { formatRowAmountParts, rowTotal } from "@/lib/seetu/money";
import { firstDayFromMonthInput, monthLabelLong } from "@/lib/seetu/months";
import { normalizePools } from "@/lib/seetu/local-storage";
import { rowNamesJoined } from "@/lib/seetu/seetu-shared";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function InputWithLkrSuffix({
  className,
  ...props
}: ComponentProps<typeof Input>) {
  return (
    <div className="relative w-full">
      <Input {...props} className={cn("pr-11", className)} />
      <span
        className="text-muted-foreground pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-medium"
        aria-hidden
      >
        {APP_CURRENCY_CODE}
      </span>
    </div>
  );
}

export function SeetuPoolsPanel() {
  const {
    pools,
    setPools,
    selectedPoolId,
    setSelectedPoolId,
    selected,
    hydrated,
    error,
    newTitle,
    setNewTitle,
    newStartMonth,
    setNewStartMonth,
    newContribution,
    setNewContribution,
    newPayerByRow,
    setNewPayerByRow,
    createPool,
    deletePool,
    addRosterRow,
    addPayer,
    deleteRosterRow,
    deletePayer,
    splitRowEqually,
    generateCycles,
    syncCycleMonthsToPoolStart,
    lockPool,
    unlockPool,
  } = useSeetu();

  const locked = selected?.is_locked ?? false;

  const [openRowIds, setOpenRowIds] = React.useState<Set<string>>(() => new Set());

  React.useEffect(() => {
    setOpenRowIds(new Set());
  }, [selected?.id]);

  function toggleRow(id: string) {
    setOpenRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deletePw, setDeletePw] = React.useState("");
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  const [showLockForm, setShowLockForm] = React.useState(false);
  const [lockPw, setLockPw] = React.useState("");
  const [lockPwConfirm, setLockPwConfirm] = React.useState("");
  const [lockFormError, setLockFormError] = React.useState<string | null>(null);

  const [unlockPw, setUnlockPw] = React.useState("");
  const [unlockError, setUnlockError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setDeleteOpen(false);
    setDeletePw("");
    setDeleteError(null);
    setShowLockForm(false);
    setLockPw("");
    setLockPwConfirm("");
    setLockFormError(null);
    setUnlockPw("");
    setUnlockError(null);
  }, [selected?.id]);

  function onLock(e: React.FormEvent) {
    e.preventDefault();
    if (!lockPw.trim()) {
      setLockFormError("Enter a password.");
      return;
    }
    if (lockPw !== lockPwConfirm) {
      setLockFormError("Passwords do not match.");
      return;
    }
    if (selected) lockPool(selected.id, lockPw);
    setShowLockForm(false);
    setLockPw("");
    setLockPwConfirm("");
    setLockFormError(null);
  }

  function onUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    const ok = unlockPool(selected.id, unlockPw);
    if (!ok) {
      setUnlockError("Incorrect password.");
    } else {
      setUnlockPw("");
      setUnlockError(null);
    }
  }

  if (!hydrated) {
    return (
      <div className="flex flex-col gap-8">
        {/* pool selector */}
        <div className="flex flex-col gap-2">
          <div className="h-4 w-10 animate-pulse rounded bg-muted" />
          <div className="h-10 w-full max-w-md animate-pulse rounded-lg bg-muted" />
        </div>

        {/* pool settings card */}
        <div className="rounded-xl border border-border p-4 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="h-3 w-8 animate-pulse rounded bg-muted" />
            <div className="h-9 w-full max-w-sm animate-pulse rounded-lg bg-muted" />
          </div>
          <div className="flex flex-col gap-2">
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
            <div className="h-9 w-44 animate-pulse rounded-lg bg-muted" />
          </div>
          <div className="flex flex-col gap-2">
            <div className="h-3 w-32 animate-pulse rounded bg-muted" />
            <div className="h-9 w-44 animate-pulse rounded-lg bg-muted" />
          </div>
        </div>

        {/* roster section */}
        <div className="flex flex-col gap-3">
          <div className="h-5 w-40 animate-pulse rounded bg-muted" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
              <div className="flex flex-col gap-1.5">
                <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                <div className="h-3 w-32 animate-pulse rounded bg-muted" />
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

      <section>
        <Card>
          <CardHeader>
            <CardTitle>New pool</CardTitle>
            <CardDescription>
              Name the group, pick the <strong>first month</strong> (turn #1),
              and the <strong>slot ({APP_CURRENCY_CODE})</strong> each row pays.
              Then add roster rows
              and open <Link href="/seetu/payouts" className="text-primary underline">Payouts</Link>{" "}
              to record who paid you each month.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={createPool}
              className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
            >
              <div className="grid min-w-50 flex-1 gap-2">
                <Label htmlFor="seetu-title">Pool name</Label>
                <Input
                  id="seetu-title"
                  placeholder="e.g. Family seetu 2026"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>
              <div className="grid w-full gap-2 sm:w-44">
                <Label htmlFor="seetu-first-month">First month (turn #1)</Label>
                <Input
                  id="seetu-first-month"
                  type="month"
                  value={newStartMonth}
                  onChange={(e) => setNewStartMonth(e.target.value)}
                />
              </div>
              <div className="grid w-full gap-2 sm:w-40">
                <Label htmlFor="seetu-pay">Slot per row ({APP_CURRENCY_CODE})</Label>
                <InputWithLkrSuffix
                  id="seetu-pay"
                  inputMode="decimal"
                  placeholder="20000"
                  value={newContribution}
                  onChange={(e) => setNewContribution(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={!newTitle.trim()}>
                <Plus className="size-4" />
                Create pool
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      {pools.length > 0 ? (
        <section className="flex flex-col gap-2">
          <Label htmlFor="pool-select">Pool to edit</Label>
          <div className="relative max-w-md">
            <select
              id="pool-select"
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
          <div className="bg-muted/40 space-y-2 rounded-xl border border-border px-4 py-3 text-sm">
            <p className="font-medium">Roster &amp; months setup</p>
            <p className="text-muted-foreground leading-relaxed">
              Each row is <strong>turn #1, #2, #3…</strong> in order. Use{" "}
              <strong>Create months</strong> to generate one month per turn (Jan →
              Feb → Mar if you set January as the first month). Track who paid
              and who receives on the{" "}
              <Link href="/seetu/payouts" className="text-primary font-medium underline">
                Payouts
              </Link>{" "}
              page.
            </p>
            {selected.start_month ? (
              <p className="text-muted-foreground text-xs">
                First month:{" "}
                <span className="text-foreground font-medium">
                  {monthLabelLong(selected.start_month)}
                </span>
              </p>
            ) : null}
          </div>

          {locked ? (
            <div className="space-y-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
              <div className="flex items-center gap-2">
                <Lock className="size-4 shrink-0 text-amber-700 dark:text-amber-300" />
                <p className="font-medium text-amber-900 dark:text-amber-100">
                  This pool is locked
                </p>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Enter the password to unlock and edit roster, amounts, or
                payment tracking.
              </p>
              <form onSubmit={onUnlock} className="flex flex-col gap-2 sm:flex-row sm:items-start">
                <div className="flex flex-col gap-1">
                  <Input
                    type="password"
                    placeholder="Password"
                    value={unlockPw}
                    onChange={(e) => {
                      setUnlockPw(e.target.value);
                      setUnlockError(null);
                    }}
                    className="h-8 w-48 text-sm"
                    autoComplete="current-password"
                  />
                  {unlockError ? (
                    <p className="text-destructive text-xs">{unlockError}</p>
                  ) : null}
                </div>
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  className="border-amber-600/50 shrink-0"
                >
                  <Unlock className="size-4" />
                  Unlock
                </Button>
              </form>
            </div>
          ) : showLockForm ? (
            <form
              onSubmit={onLock}
              className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm"
            >
              <p className="font-medium">Set a lock password</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="lock-pw" className="text-xs">Password</Label>
                  <Input
                    id="lock-pw"
                    type="password"
                    placeholder="Password"
                    value={lockPw}
                    onChange={(e) => {
                      setLockPw(e.target.value);
                      setLockFormError(null);
                    }}
                    className="h-8 w-48 text-sm"
                    autoComplete="new-password"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="lock-pw-confirm" className="text-xs">Confirm password</Label>
                  <Input
                    id="lock-pw-confirm"
                    type="password"
                    placeholder="Confirm"
                    value={lockPwConfirm}
                    onChange={(e) => {
                      setLockPwConfirm(e.target.value);
                      setLockFormError(null);
                    }}
                    className="h-8 w-48 text-sm"
                    autoComplete="new-password"
                  />
                </div>
              </div>
              {lockFormError ? (
                <p className="text-destructive text-xs">{lockFormError}</p>
              ) : null}
              <div className="flex gap-2">
                <Button type="submit" size="sm">
                  <Lock className="size-4" />
                  Lock pool
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowLockForm(false);
                    setLockPw("");
                    setLockPwConfirm("");
                    setLockFormError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : selected.seetu_cycles.length > 0 ? (
            <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <p className="text-muted-foreground leading-relaxed">
                Finished this seetu? Lock the pool to prevent accidental edits
                to roster, amounts, and payment tracking.
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="shrink-0"
                onClick={() => setShowLockForm(true)}
              >
                <Lock className="size-4" />
                Lock pool
              </Button>
            </div>
          ) : null}

          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1 space-y-3">
                <div>
                  <Label htmlFor="pool-title">Title</Label>
                  <Input
                    id="pool-title"
                    value={selected.title}
                    disabled={locked}
                    onChange={(e) =>
                      setPools((prev) =>
                        normalizePools(
                          prev.map((p) =>
                            p.id === selected.id
                              ? { ...p, title: e.target.value }
                              : p
                          )
                        )
                      )
                    }
                    onBlur={() => {
                      const t = selected.title.trim();
                      if (t) {
                        setPools((prev) =>
                          normalizePools(
                            prev.map((p) =>
                              p.id === selected.id ? { ...p, title: t } : p
                            )
                          )
                        );
                      }
                    }}
                  />
                </div>
                <div className="grid gap-2 sm:w-44">
                  <Label htmlFor="pool-first-month-edit">First month (turn #1)</Label>
                  <Input
                    id="pool-first-month-edit"
                    type="month"
                    disabled={locked}
                    value={
                      selected.start_month
                        ? selected.start_month.slice(0, 7)
                        : ""
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      setPools((prev) =>
                        normalizePools(
                          prev.map((p) =>
                            p.id === selected.id
                              ? {
                                  ...p,
                                  start_month: v
                                    ? firstDayFromMonthInput(v)
                                    : null,
                                }
                              : p
                          )
                        )
                      );
                    }}
                    onBlur={() => syncCycleMonthsToPoolStart(selected.id)}
                  />
                  <p className="text-muted-foreground text-xs">
                    Updates calendar labels on all months when changed.
                  </p>
                </div>
                <div className="grid gap-2 sm:w-44">
                  <Label htmlFor="pool-slot">
                    Slot per row / cycle ({APP_CURRENCY_CODE})
                  </Label>
                  <InputWithLkrSuffix
                    id="pool-slot"
                    inputMode="decimal"
                    disabled={locked}
                    value={String(selected.contribution_per_slot)}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value.replace(/,/g, ""));
                      setPools((prev) =>
                        normalizePools(
                          prev.map((p) =>
                            p.id === selected.id
                              ? {
                                  ...p,
                                  contribution_per_slot: Number.isFinite(v)
                                    ? v
                                    : p.contribution_per_slot,
                                }
                              : p
                          )
                        )
                      );
                    }}
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="shrink-0"
                onClick={() => setDeleteOpen(true)}
              >
                Delete pool
              </Button>

              <Dialog
                open={deleteOpen}
                onOpenChange={(open) => {
                  setDeleteOpen(open);
                  if (!open) { setDeletePw(""); setDeleteError(null); }
                }}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete pool</DialogTitle>
                  </DialogHeader>
                  <form
                    className="flex flex-col gap-4 px-4 py-4"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (selected.lock_password && deletePw !== selected.lock_password) {
                        setDeleteError("Incorrect password.");
                        return;
                      }
                      setDeleteOpen(false);
                      setDeletePw("");
                      setDeleteError(null);
                      await deletePool(selected.id);
                    }}
                  >
                    <p className="text-muted-foreground text-sm">
                      This will permanently delete <strong className="text-foreground">{selected.title}</strong> and all its roster, cycles, and payments.
                    </p>
                    {selected.lock_password ? (
                      <div className="flex flex-col gap-1">
                        <Label htmlFor="delete-pw">Enter password to confirm</Label>
                        <Input
                          id="delete-pw"
                          type="password"
                          placeholder="Password"
                          value={deletePw}
                          autoComplete="current-password"
                          onChange={(e) => {
                            setDeletePw(e.target.value);
                            setDeleteError(null);
                          }}
                        />
                        {deleteError ? (
                          <p className="text-destructive text-xs">{deleteError}</p>
                        ) : null}
                      </div>
                    ) : null}
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => { setDeleteOpen(false); setDeletePw(""); setDeleteError(null); }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" variant="destructive">
                        Delete
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
          </Card>

          <div className="space-y-3">
            <h2 className="text-base font-semibold">Roster (turns → people)</h2>
            <p className="text-muted-foreground text-xs">
              Split a row across several people; shares should add up to the slot
              in {APP_CURRENCY_CODE} (or leave blank for equal split).
            </p>

            {selected.seetu_roster_rows.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Add a row to start the roster.
              </p>
            ) : (
              <ul className="flex flex-col gap-4">
                {[...selected.seetu_roster_rows]
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((row, idx) => {
                    const turn = idx + 1;
                    const total = rowTotal(row, selected);
                    const slot = selected.contribution_per_slot;
                    const mismatch =
                      row.seetu_row_payers.length > 0 &&
                      Math.abs(total - slot) > 0.01;
                    return (
                      <li
                        key={row.id}
                        className="bg-card overflow-hidden rounded-xl border border-border"
                      >
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                          onClick={() => toggleRow(row.id)}
                        >
                          <div className="flex min-w-0 flex-col gap-0.5">
                            <span className="text-foreground text-sm font-semibold">
                              Turn #{turn}
                              {mismatch ? (
                                <span className="text-amber-500 ml-1.5 text-xs font-normal">
                                  ≠ slot {formatMoney(slot)}
                                </span>
                              ) : null}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              {rowNamesJoined(row) || "—"}
                              {" · "}
                              {formatMoney(total)}
                            </span>
                          </div>
                          <ChevronDown
                            className={cn(
                              "text-muted-foreground size-4 shrink-0 transition-transform duration-200",
                              openRowIds.has(row.id) && "rotate-180"
                            )}
                          />
                        </button>

                        {openRowIds.has(row.id) ? (
                        <div className="space-y-2 border-t border-border px-4 pb-4 pt-3">
                          {row.seetu_row_payers.map((p) => (
                            <div
                              key={p.id}
                              className="bg-muted/40 flex flex-col gap-2 rounded-lg p-3 sm:flex-row sm:items-end sm:gap-3"
                            >
                              <Input
                                className="min-w-0 flex-1 sm:max-w-45"
                                aria-label="Member name"
                                placeholder="Member"
                                disabled={locked}
                                value={p.name}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setPools((prev) =>
                                    normalizePools(
                                      prev.map((pool) =>
                                        pool.id !== selected.id
                                          ? pool
                                          : {
                                              ...pool,
                                              seetu_roster_rows:
                                                pool.seetu_roster_rows.map((r) =>
                                                  r.id !== row.id
                                                    ? r
                                                    : {
                                                        ...r,
                                                        seetu_row_payers:
                                                          r.seetu_row_payers.map(
                                                            (x) =>
                                                              x.id === p.id
                                                                ? {
                                                                    ...x,
                                                                    name: v,
                                                                  }
                                                                : x
                                                          ),
                                                      }
                                                ),
                                            }
                                      )
                                    )
                                  );
                                }}
                                onBlur={() => {
                                  const t = p.name.trim();
                                  if (!t) return;
                                  setPools((prev) =>
                                    normalizePools(
                                      prev.map((pool) =>
                                        pool.id !== selected.id
                                          ? pool
                                          : {
                                              ...pool,
                                              seetu_roster_rows:
                                                pool.seetu_roster_rows.map((r) =>
                                                  r.id !== row.id
                                                    ? r
                                                    : {
                                                        ...r,
                                                        seetu_row_payers:
                                                          r.seetu_row_payers.map(
                                                            (x) =>
                                                              x.id === p.id
                                                                ? {
                                                                    ...x,
                                                                    name: t,
                                                                  }
                                                                : x
                                                          ),
                                                      }
                                                ),
                                            }
                                      )
                                    )
                                  );
                                }}
                              />
                              <div className="grid gap-1 sm:w-36 sm:shrink-0">
                                <Label
                                  className="text-muted-foreground text-xs"
                                  htmlFor={`seetu-share-${row.id}-${p.id}`}
                                >
                                  Share ({APP_CURRENCY_CODE}, blank = split)
                                </Label>
                                <InputWithLkrSuffix
                                  id={`seetu-share-${row.id}-${p.id}`}
                                  inputMode="decimal"
                                  className="h-8"
                                  placeholder="Auto"
                                  disabled={locked}
                                  value={
                                    p.contribution_amount == null
                                      ? ""
                                      : String(p.contribution_amount)
                                  }
                                  onChange={(e) => {
                                    const t = e.target.value;
                                    setPools((prev) =>
                                      normalizePools(
                                        prev.map((pool) =>
                                          pool.id !== selected.id
                                            ? pool
                                            : {
                                                ...pool,
                                                seetu_roster_rows:
                                                  pool.seetu_roster_rows.map(
                                                    (r) =>
                                                      r.id !== row.id
                                                        ? r
                                                        : {
                                                            ...r,
                                                            seetu_row_payers:
                                                              r.seetu_row_payers.map(
                                                                (x) =>
                                                                  x.id === p.id
                                                                    ? {
                                                                        ...x,
                                                                        contribution_amount:
                                                                          t ===
                                                                          ""
                                                                            ? null
                                                                            : Number.isFinite(
                                                                                  parseFloat(
                                                                                    t
                                                                                  )
                                                                                )
                                                                              ? parseFloat(
                                                                                  t
                                                                                )
                                                                              : x.contribution_amount,
                                                                      }
                                                                    : x
                                                              ),
                                                          }
                                                  ),
                                              }
                                        )
                                      )
                                    );
                                  }}
                                />
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="text-muted-foreground shrink-0 sm:ml-auto"
                                disabled={locked}
                                aria-label={`Remove ${p.name}`}
                                onClick={() =>
                                  deletePayer(p.id, row.id, selected.id)
                                }
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          ))}
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <Input
                              placeholder="Add another person to this row"
                              value={newPayerByRow[row.id] ?? ""}
                              disabled={locked}
                              onChange={(e) =>
                                setNewPayerByRow((prev) => ({
                                  ...prev,
                                  [row.id]: e.target.value,
                                }))
                              }
                              className="sm:flex-1"
                            />
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => addPayer(row.id, selected.id)}
                              disabled={
                                locked ||
                                !(newPayerByRow[row.id] ?? "").trim()
                              }
                            >
                              <Plus className="size-4" />
                              Add person
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-1 border-t border-border pt-3">
                            {row.seetu_row_payers.length > 0 ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="xs"
                                disabled={locked}
                                onClick={() => splitRowEqually(selected.id, row.id)}
                              >
                                Equal split this row
                              </Button>
                            ) : null}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              className="text-muted-foreground"
                              disabled={locked}
                              aria-label="Delete row"
                              onClick={() => deleteRosterRow(row.id, selected.id)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                        ) : null}
                      </li>
                    );
                  })}
              </ul>
            )}

            <div className="border-border flex flex-wrap gap-2 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                disabled={locked}
                onClick={() => addRosterRow(selected.id)}
              >
                <Plus className="size-4" />
                Add row
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="rounded-full"
                disabled={
                  locked ||
                  selected.seetu_roster_rows.filter(
                    (r) => r.seetu_row_payers.length > 0
                  ).length === 0
                }
                onClick={() => generateCycles(selected.id)}
              >
                {selected.seetu_cycles.length === 0
                  ? "Create months (1 per turn)"
                  : "Reset months"}
              </Button>
            </div>
          </div>

          {selected.seetu_cycles.length === 0 &&
          selected.seetu_roster_rows.some(
            (r) => r.seetu_row_payers.length > 0
          ) ? (
            <p className="text-muted-foreground text-sm">
              Tap <strong>Create months</strong> to add one payment month per
              turn, then go to{" "}
              <Link href="/seetu/payouts" className="text-primary underline">
                Payouts
              </Link>
              .
            </p>
          ) : null}
        </section>
      ) : pools.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Create a pool above to get started.
        </p>
      ) : null}
    </div>
  );
}
