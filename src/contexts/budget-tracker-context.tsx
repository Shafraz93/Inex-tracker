"use client";

import * as React from "react";

import {
  BUDGET_TRACKER_LOCAL_STORAGE_KEY,
  emptyBudgetTrackerState,
  readBudgetTrackerStateFromLocal,
  writeBudgetTrackerStateToLocal,
} from "@/lib/budget-tracker/local-storage";
import {
  fetchBudgetTrackerState,
  replaceBudgetTrackerState,
} from "@/lib/budget-tracker/supabase-budget-tracker";
import type { BudgetTrackerState } from "@/lib/budget-tracker/types";
import { createClient } from "@/lib/supabase/client";

type BudgetTrackerContextValue = {
  state: BudgetTrackerState;
  setState: React.Dispatch<React.SetStateAction<BudgetTrackerState>>;
  hydrated: boolean;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
};

const BudgetTrackerContext =
  React.createContext<BudgetTrackerContextValue | null>(null);

function stateMeaningful(state: BudgetTrackerState): boolean {
  return (
    state.categories.length > 0 ||
    state.income_entries.length > 0 ||
    state.expense_entries.length > 0 ||
    state.budget_entries.length > 0
  );
}

export function BudgetTrackerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = React.useMemo(() => createClient(), []);
  const lastSyncedRef = React.useRef("");

  const [userId, setUserId] = React.useState<string | null>(null);
  const [state, setState] = React.useState<BudgetTrackerState>(
    emptyBudgetTrackerState
  );
  const [hydrated, setHydrated] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

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
        const local = readBudgetTrackerStateFromLocal();
        setUserId(null);
        setState(local);
        lastSyncedRef.current = JSON.stringify(local);
        setError(
          e instanceof Error ? e.message : "Could not read auth user for budget."
        );
        setHydrated(true);
        return;
      }
      if (cancelled) return;

      if (!user) {
        const next = readBudgetTrackerStateFromLocal();
        setUserId(null);
        setState(next);
        lastSyncedRef.current = JSON.stringify(next);
        setHydrated(true);
        return;
      }

      setUserId(user.id);

      try {
        let next = await fetchBudgetTrackerState(supabase, user.id);

        if (!stateMeaningful(next)) {
          const local = readBudgetTrackerStateFromLocal();
          if (stateMeaningful(local)) {
            next = await replaceBudgetTrackerState(supabase, user.id, local);
            try {
              localStorage.removeItem(BUDGET_TRACKER_LOCAL_STORAGE_KEY);
            } catch {
              /* ignore */
            }
          }
        }

        if (cancelled) return;
        setState(next);
        lastSyncedRef.current = JSON.stringify(next);
        setError(null);
        setHydrated(true);
      } catch (e) {
        if (cancelled) return;
        const local = readBudgetTrackerStateFromLocal();
        setState(local);
        lastSyncedRef.current = JSON.stringify(local);
        setError(
          e instanceof Error ? e.message : "Could not load budget data from cloud."
        );
        setHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      writeBudgetTrackerStateToLocal(state);
    } catch (e) {
      console.error("Could not save budget data in browser.", e);
    }
  }, [state, hydrated]);

  React.useEffect(() => {
    if (!hydrated || !userId) return;

    const snapshot = JSON.stringify(state);
    if (snapshot === lastSyncedRef.current) return;

    const timer = window.setTimeout(async () => {
      try {
        const fresh = await replaceBudgetTrackerState(supabase, userId, state);
        lastSyncedRef.current = JSON.stringify(fresh);
        setState(fresh);
        setError(null);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Could not save budget data to cloud."
        );
      }
    }, 500);

    return () => window.clearTimeout(timer);
  }, [state, hydrated, userId, supabase]);

  const fetchLatestFromCloud = React.useCallback(async () => {
    if (!userId) return;
    try {
      const fresh = await fetchBudgetTrackerState(supabase, userId);
      lastSyncedRef.current = JSON.stringify(fresh);
      setState(fresh);
      setError(null);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not sync budget data from cloud."
      );
    }
  }, [supabase, userId]);

  React.useEffect(() => {
    function onSync() {
      void fetchLatestFromCloud();
    }
    window.addEventListener("inex-tracker:sync-request", onSync);
    return () => window.removeEventListener("inex-tracker:sync-request", onSync);
  }, [fetchLatestFromCloud]);

  const value = React.useMemo(
    () => ({ state, setState, hydrated, error, setError }),
    [state, hydrated, error]
  );

  return (
    <BudgetTrackerContext.Provider value={value}>
      {children}
    </BudgetTrackerContext.Provider>
  );
}

export function useBudgetTracker(): BudgetTrackerContextValue {
  const ctx = React.useContext(BudgetTrackerContext);
  if (!ctx) {
    throw new Error("useBudgetTracker must be used within BudgetTrackerProvider");
  }
  return ctx;
}
