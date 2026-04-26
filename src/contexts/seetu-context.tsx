"use client";

import * as React from "react";

import {
  firstDayFromMonthInput,
  monthStartForCycle,
} from "@/lib/seetu/months";
import {
  newEntityId,
  normalizePools,
  readSeetuPoolsFromLocal,
  SEETU_LOCAL_STORAGE_KEY,
  writeSeetuPoolsToLocal,
} from "@/lib/seetu/local-storage";
import {
  fetchSeetuPools,
  replacePoolSnapshot,
} from "@/lib/seetu/supabase-seetu";
import { createClient } from "@/lib/supabase/client";
import {
  seedPaymentsForNewPayer,
  stripPayerFromCycles,
} from "@/lib/seetu/seetu-shared";
import type {
  SeetuCycleRow,
  SeetuPoolRow,
  SeetuRosterRow,
} from "@/lib/seetu/types";

type SeetuContextValue = {
  pools: SeetuPoolRow[];
  setPools: React.Dispatch<React.SetStateAction<SeetuPoolRow[]>>;
  selectedPoolId: string | null;
  setSelectedPoolId: React.Dispatch<React.SetStateAction<string | null>>;
  selected: SeetuPoolRow | null;
  hydrated: boolean;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  newTitle: string;
  setNewTitle: React.Dispatch<React.SetStateAction<string>>;
  newStartMonth: string;
  setNewStartMonth: React.Dispatch<React.SetStateAction<string>>;
  newContribution: string;
  setNewContribution: React.Dispatch<React.SetStateAction<string>>;
  newPayerByRow: Record<string, string>;
  setNewPayerByRow: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  createPool: (e: React.FormEvent) => void;
  deletePool: (poolId: string) => void;
  addRosterRow: (poolId: string) => void;
  addPayer: (rowId: string, poolId: string) => void;
  deleteRosterRow: (rowId: string, poolId: string) => void;
  deletePayer: (payerId: string, rowId: string, poolId: string) => void;
  splitRowEqually: (poolId: string, rowId: string) => void;
  generateCycles: (poolId: string) => void;
  setPaid: (poolId: string, cycleId: string, payerId: string, paid: boolean) => void;
  updateCycle: (
    poolId: string,
    cycleId: string,
    patch: Partial<
      Pick<SeetuCycleRow, "month_start" | "receiver_roster_row_id">
    >
  ) => void;
  syncCycleMonthsToPoolStart: (poolId: string) => void;
  lockPool: (poolId: string) => void;
  unlockPool: (poolId: string) => void;
};

const SeetuContext = React.createContext<SeetuContextValue | null>(null);

export function SeetuProvider({ children }: { children: React.ReactNode }) {
  const supabase = React.useMemo(() => createClient(), []);
  const lastSyncedRef = React.useRef<string>("");

  const [userId, setUserId] = React.useState<string | null>(null);
  const [pools, setPools] = React.useState<SeetuPoolRow[]>([]);
  const [selectedPoolId, setSelectedPoolId] = React.useState<string | null>(
    null
  );
  const [hydrated, setHydrated] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [newTitle, setNewTitle] = React.useState("");
  const [newStartMonth, setNewStartMonth] = React.useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  });
  const [newContribution, setNewContribution] = React.useState("20000");
  const [newPayerByRow, setNewPayerByRow] = React.useState<
    Record<string, string>
  >({});

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      let user: { id: string } | null = null;
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw new Error(error.message);
        user = data.user;
      } catch (e) {
        if (cancelled) return;
        const local = normalizePools(readSeetuPoolsFromLocal());
        setUserId(null);
        setPools(local);
        setSelectedPoolId(local[0]?.id ?? null);
        setError(e instanceof Error ? e.message : "Could not read auth user for Seetu.");
        setHydrated(true);
        return;
      }
      if (cancelled) return;

      if (!user) {
        const local = normalizePools(readSeetuPoolsFromLocal());
        setUserId(null);
        setPools(local);
        setSelectedPoolId(local[0]?.id ?? null);
        setHydrated(true);
        return;
      }

      setUserId(user.id);

      try {
        let rows = await fetchSeetuPools(supabase, user.id);
        rows = normalizePools(rows);

        if (rows.length === 0) {
          const local = readSeetuPoolsFromLocal();
          if (local.length > 0) {
            const norm = normalizePools(local);
            await Promise.all(
              norm.map((p) => replacePoolSnapshot(supabase, user.id, p))
            );
            try {
              localStorage.removeItem(SEETU_LOCAL_STORAGE_KEY);
            } catch {
              /* ignore */
            }
            rows = normalizePools(await fetchSeetuPools(supabase, user.id));
          }
        }

        if (cancelled) return;

        setPools(rows);
        setSelectedPoolId((prev) => {
          if (prev && rows.some((p) => p.id === prev)) return prev;
          return rows[0]?.id ?? null;
        });
        lastSyncedRef.current = JSON.stringify(rows);
        setHydrated(true);
      } catch (e) {
        if (!cancelled) {
          const local = normalizePools(readSeetuPoolsFromLocal());
          setPools(local);
          setSelectedPoolId((prev) => {
            if (prev && local.some((p) => p.id === prev)) return prev;
            return local[0]?.id ?? null;
          });
          setError(
            e instanceof Error ? e.message : "Could not load Seetu from cloud."
          );
          setHydrated(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      writeSeetuPoolsToLocal(pools);
    } catch (e) {
      console.error("Could not save Seetu in browser.", e);
    }
  }, [pools, hydrated]);

  React.useEffect(() => {
    if (!hydrated || !userId) return;

    const snapshot = JSON.stringify(pools);
    if (snapshot === lastSyncedRef.current) return;

    const timer = window.setTimeout(async () => {
      try {
        for (const p of pools) {
          await replacePoolSnapshot(supabase, userId, p);
        }
        lastSyncedRef.current = JSON.stringify(pools);
        setError(null);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Could not save Seetu to cloud."
        );
      }
    }, 500);

    return () => window.clearTimeout(timer);
  }, [pools, hydrated, userId, supabase]);

  const fetchLatestFromCloud = React.useCallback(async () => {
    let uid = userId;
    if (!uid) {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw new Error(error.message);
        uid = data.user?.id ?? null;
        setUserId(uid);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not read auth user for Seetu.");
        return;
      }
    }
    if (!uid) return;
    try {
      const rows = normalizePools(await fetchSeetuPools(supabase, uid));
      setPools(rows);
      setSelectedPoolId((prev) => {
        if (prev && rows.some((p) => p.id === prev)) return prev;
        return rows[0]?.id ?? null;
      });
      lastSyncedRef.current = JSON.stringify(rows);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sync Seetu from cloud.");
    }
  }, [supabase, userId]);

  React.useEffect(() => {
    function onSync() {
      void fetchLatestFromCloud();
    }
    window.addEventListener("inex-tracker:sync-request", onSync);
    return () => window.removeEventListener("inex-tracker:sync-request", onSync);
  }, [fetchLatestFromCloud]);

  const selected =
    pools.find((p) => p.id === selectedPoolId) ?? null;

  const createPool = React.useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const amt = parseFloat(newContribution.replace(/,/g, "")) || 20000;
    const id = newEntityId();
    setPools((prev) =>
      normalizePools([
        {
          id,
          title: newTitle.trim(),
          start_month: firstDayFromMonthInput(newStartMonth),
          contribution_per_slot: amt,
          is_locked: false,
          seetu_roster_rows: [],
          seetu_cycles: [],
        },
        ...prev,
      ])
    );
    setSelectedPoolId(id);
    setNewTitle("");
  }, [newTitle, newContribution, newStartMonth]);

  const deletePool = React.useCallback(
    async (poolId: string) => {
      if (
        !confirm(
          "Delete this pool and all roster rows, cycles, and payments?"
        )
      )
        return;
      if (userId) {
        const { error: delErr } = await supabase
          .from("seetu_pools")
          .delete()
          .eq("id", poolId);
        if (delErr) {
          setError(delErr.message);
          return;
        }
      }
      setPools((prev) => {
        const next = normalizePools(prev.filter((p) => p.id !== poolId));
        setSelectedPoolId((sid) =>
          sid === poolId ? next[0]?.id ?? null : sid
        );
        lastSyncedRef.current = JSON.stringify(next);
        return next;
      });
    },
    [supabase, userId]
  );

  const lockPool = React.useCallback((poolId: string) => {
    if (
      !confirm(
        "Lock this pool? You will not be able to change roster, amounts, months, or payment checkmarks until you unlock it."
      )
    )
      return;
    setPools((prev) =>
      normalizePools(
        prev.map((p) => (p.id === poolId ? { ...p, is_locked: true } : p))
      )
    );
  }, []);

  const unlockPool = React.useCallback((poolId: string) => {
    if (
      !confirm(
        "Unlock this pool? You will be able to edit it again."
      )
    )
      return;
    setPools((prev) =>
      normalizePools(
        prev.map((p) => (p.id === poolId ? { ...p, is_locked: false } : p))
      )
    );
  }, []);

  const addRosterRow = React.useCallback((poolId: string) => {
    setPools((prev) =>
      normalizePools(
        prev.map((p) => {
          if (p.id !== poolId) return p;
          if (p.is_locked) return p;
          const nextOrder =
            (p.seetu_roster_rows.reduce(
              (m, x) => Math.max(m, x.sort_order),
              -1
            ) ?? -1) + 1;
          const rowId = newEntityId();
          const payerId = newEntityId();
          const newRow: SeetuRosterRow = {
            id: rowId,
            sort_order: nextOrder,
            seetu_row_payers: [
              {
                id: payerId,
                name: "",
                sort_order: 0,
                contribution_amount: null,
              },
            ],
          };
          let next: SeetuPoolRow = {
            ...p,
            seetu_roster_rows: [...p.seetu_roster_rows, newRow],
          };
          if (p.seetu_cycles.length > 0) {
            next = seedPaymentsForNewPayer(next, payerId);
          }
          return next;
        })
      )
    );
  }, []);

  const addPayer = React.useCallback(
    (rowId: string, poolId: string) => {
      const name = (newPayerByRow[rowId] ?? "").trim();
      if (!name) return;
      setPools((prev) =>
        normalizePools(
          prev.map((p) => {
            if (p.id !== poolId) return p;
            if (p.is_locked) return p;
            const row = p.seetu_roster_rows.find((r) => r.id === rowId);
            if (!row) return p;
            const nextOrder =
              (row.seetu_row_payers.reduce(
                (m, x) => Math.max(m, x.sort_order),
                -1
              ) ?? -1) + 1;
            const payerId = newEntityId();
            let next: SeetuPoolRow = {
              ...p,
              seetu_roster_rows: p.seetu_roster_rows.map((r) =>
                r.id !== rowId
                  ? r
                  : {
                      ...r,
                      seetu_row_payers: [
                        ...r.seetu_row_payers,
                        {
                          id: payerId,
                          name,
                          sort_order: nextOrder,
                          contribution_amount: null,
                        },
                      ],
                    }
              ),
            };
            if (p.seetu_cycles.length > 0) {
              next = seedPaymentsForNewPayer(next, payerId);
            }
            return next;
          })
        )
      );
      setNewPayerByRow((prev) => ({ ...prev, [rowId]: "" }));
    },
    [newPayerByRow]
  );

  const deleteRosterRow = React.useCallback((rowId: string, poolId: string) => {
    if (
      !confirm(
        "Remove this roster row and all people in it? Clears every cycle for this pool."
      )
    )
      return;
    setPools((prev) =>
      normalizePools(
        prev.map((p) => {
          if (p.id !== poolId) return p;
          if (p.is_locked) return p;
          return {
            ...p,
            seetu_cycles: [],
            seetu_roster_rows: p.seetu_roster_rows.filter(
              (r) => r.id !== rowId
            ),
          };
        })
      )
    );
  }, []);

  const deletePayer = React.useCallback(
    (payerId: string, rowId: string, poolId: string) => {
      setPools((prev) => {
        const pool = prev.find((p) => p.id === poolId);
        if (pool?.is_locked) return prev;
        const row = pool?.seetu_roster_rows.find((r) => r.id === rowId);
        if (!row) return prev;
        if (row.seetu_row_payers.length <= 1) {
          if (
            !confirm(
              "Remove this roster row and all people in it? Clears every cycle for this pool."
            )
          )
            return prev;
          return normalizePools(
            prev.map((p) =>
              p.id !== poolId
                ? p
                : {
                    ...p,
                    seetu_cycles: [],
                    seetu_roster_rows: p.seetu_roster_rows.filter(
                      (r) => r.id !== rowId
                    ),
                  }
            )
          );
        }
        if (
          !confirm(
            "Remove this person from the row? Payment checkmarks for them are removed from all cycles."
          )
        )
          return prev;
        return normalizePools(
          prev.map((p) => {
            if (p.id !== poolId) return p;
            let next: SeetuPoolRow = {
              ...p,
              seetu_roster_rows: p.seetu_roster_rows.map((r) =>
                r.id !== rowId
                  ? r
                  : {
                      ...r,
                      seetu_row_payers: r.seetu_row_payers.filter(
                        (x) => x.id !== payerId
                      ),
                    }
              ),
            };
            next = stripPayerFromCycles(next, payerId);
            return next;
          })
        );
      });
    },
    []
  );

  const splitRowEqually = React.useCallback((poolId: string, rowId: string) => {
    setPools((prev) =>
      normalizePools(
        prev.map((pool) =>
          pool.id !== poolId
            ? pool
            : pool.is_locked
              ? pool
              : {
                ...pool,
                seetu_roster_rows: pool.seetu_roster_rows.map((r) =>
                  r.id !== rowId
                    ? r
                    : {
                        ...r,
                        seetu_row_payers: r.seetu_row_payers.map((p) => ({
                          ...p,
                          contribution_amount: null,
                        })),
                      }
                ),
              }
        )
      )
    );
  }, []);

  const generateCycles = React.useCallback((poolId: string) => {
    setPools((prev) => {
      const pool = prev.find((p) => p.id === poolId);
      if (pool?.is_locked) return prev;
      const rows = pool?.seetu_roster_rows ?? [];
      const rowsOk = rows.filter((r) => r.seetu_row_payers.length > 0);
      if (!pool || rowsOk.length === 0) {
        setError("Add at least one roster row with at least one person.");
        return prev;
      }
      if (pool.seetu_cycles.length > 0) {
        if (
          !confirm(
            "Replace existing cycles and payment checkmarks? This cannot be undone."
          )
        )
          return prev;
      }
      setError(null);
      const ordered = [...rowsOk].sort((a, b) => a.sort_order - b.sort_order);
      const payersFlat = ordered.flatMap((r) => r.seetu_row_payers);
      const cycles: SeetuCycleRow[] = ordered.map((row, i) => {
        const cid = newEntityId();
        const n = i + 1;
        return {
          id: cid,
          cycle_number: n,
          month_start: pool.start_month
            ? monthStartForCycle(pool, n)
            : null,
          receiver_roster_row_id: row.id,
          seetu_payments: payersFlat.map((payer) => ({
            seetu_row_payer_id: payer.id,
            paid: false,
          })),
        };
      });
      return normalizePools(
        prev.map((p) => (p.id !== poolId ? p : { ...p, seetu_cycles: cycles }))
      );
    });
  }, []);

  const setPaid = React.useCallback(
    (poolId: string, cycleId: string, payerId: string, paid: boolean) => {
      setPools((prev) =>
        normalizePools(
          prev.map((pool) => {
            if (pool.id !== poolId) return pool;
            if (pool.is_locked) return pool;
            const hasCycle = pool.seetu_cycles.some((c) => c.id === cycleId);
            if (!hasCycle) return pool;
            return {
              ...pool,
              seetu_cycles: pool.seetu_cycles.map((c) => {
                if (c.id !== cycleId) return c;
                const has = c.seetu_payments.some(
                  (x) => x.seetu_row_payer_id === payerId
                );
                const seetu_payments = has
                  ? c.seetu_payments.map((x) =>
                      x.seetu_row_payer_id === payerId ? { ...x, paid } : x
                    )
                  : [
                      ...c.seetu_payments,
                      { seetu_row_payer_id: payerId, paid },
                    ];
                return { ...c, seetu_payments };
              }),
            };
          })
        )
      );
    },
    []
  );

  const updateCycle = React.useCallback(
    (
      poolId: string,
      cycleId: string,
      patch: Partial<
        Pick<SeetuCycleRow, "month_start" | "receiver_roster_row_id">
      >
    ) => {
      setPools((prev) =>
        normalizePools(
          prev.map((pool) => {
            if (pool.id !== poolId) return pool;
            if (pool.is_locked) return pool;
            return {
              ...pool,
              seetu_cycles: pool.seetu_cycles.map((c) =>
                c.id !== cycleId ? c : { ...c, ...patch }
              ),
            };
          })
        )
      );
    },
    []
  );

  const syncCycleMonthsToPoolStart = React.useCallback((poolId: string) => {
    setPools((prev) =>
      normalizePools(
        prev.map((p) => {
          if (
            p.id !== poolId ||
            p.is_locked ||
            !p.start_month ||
            p.seetu_cycles.length === 0
          ) {
            return p;
          }
          return {
            ...p,
            seetu_cycles: p.seetu_cycles.map((c) => ({
              ...c,
              month_start: monthStartForCycle(p, c.cycle_number),
            })),
          };
        })
      )
    );
  }, []);

  const value = React.useMemo<SeetuContextValue>(
    () => ({
      pools,
      setPools,
      selectedPoolId,
      setSelectedPoolId,
      selected,
      hydrated,
      error,
      setError,
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
      setPaid,
      updateCycle,
      syncCycleMonthsToPoolStart,
      lockPool,
      unlockPool,
    }),
    [
      pools,
      selectedPoolId,
      selected,
      hydrated,
      error,
      newTitle,
      newStartMonth,
      newContribution,
      newPayerByRow,
      createPool,
      deletePool,
      addRosterRow,
      addPayer,
      deleteRosterRow,
      deletePayer,
      splitRowEqually,
      generateCycles,
      setPaid,
      updateCycle,
      syncCycleMonthsToPoolStart,
      lockPool,
      unlockPool,
    ]
  );

  return (
    <SeetuContext.Provider value={value}>{children}</SeetuContext.Provider>
  );
}

export function useSeetu(): SeetuContextValue {
  const ctx = React.useContext(SeetuContext);
  if (!ctx) {
    throw new Error("useSeetu must be used within SeetuProvider");
  }
  return ctx;
}
