"use client";

import * as React from "react";

import {
  CREDITS_LOCAL_STORAGE_KEY,
  emptyCreditsState,
  readCreditsStateFromLocal,
  writeCreditsStateToLocal,
} from "@/lib/credits/local-storage";
import { fetchCreditsState, replaceCreditsState } from "@/lib/credits/supabase-credits";
import type { CreditsState } from "@/lib/credits/types";
import { createClient } from "@/lib/supabase/client";

type CreditsContextValue = {
  state: CreditsState;
  setState: React.Dispatch<React.SetStateAction<CreditsState>>;
  hydrated: boolean;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
};

const CreditsContext = React.createContext<CreditsContextValue | null>(null);

function stateMeaningful(s: CreditsState): boolean {
  return (
    !!s.global_expense_category_id ||
    s.persons.length > 0 ||
    s.settlements.length > 0
  );
}

export function CreditsProvider({ children }: { children: React.ReactNode }) {
  const supabase = React.useMemo(() => createClient(), []);
  const lastSyncedRef = React.useRef<string>("");

  const [userId, setUserId] = React.useState<string | null>(null);
  const [state, setState] = React.useState<CreditsState>(emptyCreditsState);
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
        const local = readCreditsStateFromLocal();
        setUserId(null);
        setState(local);
        lastSyncedRef.current = JSON.stringify(local);
        setError(
          e instanceof Error ? e.message : "Could not read auth user for credits."
        );
        setHydrated(true);
        return;
      }
      if (cancelled) return;

      if (!user) {
        const next = readCreditsStateFromLocal();
        setUserId(null);
        setState(next);
        lastSyncedRef.current = JSON.stringify(next);
        setHydrated(true);
        return;
      }

      setUserId(user.id);
      try {
        let next = await fetchCreditsState(supabase, user.id);
        if (!stateMeaningful(next)) {
          const local = readCreditsStateFromLocal();
          if (stateMeaningful(local)) {
            next = await replaceCreditsState(supabase, user.id, local);
            try {
              localStorage.removeItem(CREDITS_LOCAL_STORAGE_KEY);
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
        const local = readCreditsStateFromLocal();
        setState(local);
        lastSyncedRef.current = JSON.stringify(local);
        setError(e instanceof Error ? e.message : "Could not load credits.");
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
      writeCreditsStateToLocal(state);
    } catch (e) {
      console.error("Could not save credits in browser.", e);
    }
  }, [state, hydrated]);

  React.useEffect(() => {
    if (!hydrated || !userId) return;

    const snapshot = JSON.stringify(state);
    if (snapshot === lastSyncedRef.current) return;

    const timer = window.setTimeout(async () => {
      try {
        const fresh = await replaceCreditsState(supabase, userId, state);
        lastSyncedRef.current = JSON.stringify(fresh);
        setState(fresh);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save credits.");
      }
    }, 500);

    return () => window.clearTimeout(timer);
  }, [state, hydrated, userId, supabase]);

  const fetchLatestFromCloud = React.useCallback(async () => {
    if (!userId) return;
    try {
      const fresh = await fetchCreditsState(supabase, userId);
      lastSyncedRef.current = JSON.stringify(fresh);
      setState(fresh);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sync credits.");
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
    <CreditsContext.Provider value={value}>{children}</CreditsContext.Provider>
  );
}

export function useCredits(): CreditsContextValue {
  const ctx = React.useContext(CreditsContext);
  if (!ctx) throw new Error("useCredits must be used within CreditsProvider");
  return ctx;
}
