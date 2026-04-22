"use client";

import * as React from "react";

import {
  readSalaryAdvanceStateFromLocal,
  SALARY_ADVANCE_LOCAL_STORAGE_KEY,
} from "@/lib/salary-advance/local-storage-salary-advance";
import {
  fetchSalaryAdvanceState,
  replaceSalaryAdvanceState,
} from "@/lib/salary-advance/supabase-salary-advance";
import type { SalaryAdvanceState } from "@/lib/salary-advance/types";
import { createClient } from "@/lib/supabase/client";

type SalaryAdvanceContextValue = {
  state: SalaryAdvanceState;
  setState: React.Dispatch<React.SetStateAction<SalaryAdvanceState>>;
  hydrated: boolean;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
};

const SalaryAdvanceContext =
  React.createContext<SalaryAdvanceContextValue | null>(null);

function emptyState(): SalaryAdvanceState {
  return {
    starting_balance: 0,
    starting_balance_date: null,
    repayments: [],
    advance_logs: [],
  };
}

function stateMeaningful(s: SalaryAdvanceState): boolean {
  return (
    s.starting_balance > 0 ||
    s.repayments.length > 0 ||
    s.advance_logs.length > 0
  );
}

export function SalaryAdvanceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = React.useMemo(() => createClient(), []);
  const lastSyncedRef = React.useRef<string>("");

  const [userId, setUserId] = React.useState<string | null>(null);
  const [state, setState] = React.useState<SalaryAdvanceState>(emptyState);
  const [hydrated, setHydrated] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;

      if (!user) {
        setUserId(null);
        setState(emptyState());
        lastSyncedRef.current = JSON.stringify(emptyState());
        setHydrated(true);
        return;
      }

      setUserId(user.id);

      try {
        let next = await fetchSalaryAdvanceState(supabase, user.id);

        if (!stateMeaningful(next)) {
          const local = readSalaryAdvanceStateFromLocal();
          if (stateMeaningful(local)) {
            next = await replaceSalaryAdvanceState(supabase, user.id, local);
            try {
              localStorage.removeItem(SALARY_ADVANCE_LOCAL_STORAGE_KEY);
            } catch {
              /* ignore */
            }
          }
        }

        if (cancelled) return;
        setState(next);
        lastSyncedRef.current = JSON.stringify(next);
        setHydrated(true);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : "Could not load salary advance from cloud."
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
    if (!hydrated || !userId) return;

    const snapshot = JSON.stringify(state);
    if (snapshot === lastSyncedRef.current) return;

    const timer = window.setTimeout(async () => {
      try {
        const fresh = await replaceSalaryAdvanceState(
          supabase,
          userId,
          state
        );
        lastSyncedRef.current = JSON.stringify(fresh);
        setState(fresh);
        setError(null);
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Could not save salary advance to cloud."
        );
      }
    }, 500);

    return () => window.clearTimeout(timer);
  }, [state, hydrated, userId, supabase]);

  const value = React.useMemo(
    () => ({ state, setState, hydrated, error, setError }),
    [state, hydrated, error]
  );

  return (
    <SalaryAdvanceContext.Provider value={value}>
      {children}
    </SalaryAdvanceContext.Provider>
  );
}

export function useSalaryAdvance(): SalaryAdvanceContextValue {
  const ctx = React.useContext(SalaryAdvanceContext);
  if (!ctx) {
    throw new Error("useSalaryAdvance must be used within SalaryAdvanceProvider");
  }
  return ctx;
}
