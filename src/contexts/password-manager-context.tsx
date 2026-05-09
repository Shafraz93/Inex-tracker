"use client";

import * as React from "react";

import {
  emptyPmState,
  normalizePmState,
  PM_LOCAL_STORAGE_KEY,
  readPmStateFromLocal,
  writePmStateToLocal,
} from "@/lib/password-manager/local-storage";
import {
  fetchPmState,
  replacePmState,
} from "@/lib/password-manager/supabase-password-manager";
import type { PasswordManagerState } from "@/lib/password-manager/types";
import { createClient } from "@/lib/supabase/client";

type PmContextValue = {
  state: PasswordManagerState;
  setState: React.Dispatch<React.SetStateAction<PasswordManagerState>>;
  hydrated: boolean;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
};

const PmContext = React.createContext<PmContextValue | null>(null);

export function PasswordManagerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = React.useMemo(() => createClient(), []);
  const lastSyncedRef = React.useRef<string>("");

  const [userId, setUserId] = React.useState<string | null>(null);
  const [state, setState] = React.useState<PasswordManagerState>(emptyPmState);
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
        const local = readPmStateFromLocal();
        setUserId(null);
        setState(local);
        lastSyncedRef.current = JSON.stringify(local);
        setError(e instanceof Error ? e.message : "Could not read auth user.");
        setHydrated(true);
        return;
      }
      if (cancelled) return;

      if (!user) {
        const local = readPmStateFromLocal();
        setUserId(null);
        setState(local);
        lastSyncedRef.current = JSON.stringify(local);
        setHydrated(true);
        return;
      }

      setUserId(user.id);
      try {
        let cloud = await fetchPmState(supabase, user.id);
        if (cloud.entries.length === 0) {
          const local = readPmStateFromLocal();
          if (local.entries.length > 0) {
            cloud = await replacePmState(supabase, user.id, local);
            try { localStorage.removeItem(PM_LOCAL_STORAGE_KEY); } catch { /* ignore */ }
          }
        }
        if (cancelled) return;
        setState(cloud);
        lastSyncedRef.current = JSON.stringify(cloud);
        setHydrated(true);
      } catch (e) {
        if (!cancelled) {
          const local = readPmStateFromLocal();
          setState(local);
          lastSyncedRef.current = JSON.stringify(local);
          setError(e instanceof Error ? e.message : "Could not load from cloud.");
          setHydrated(true);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [supabase]);

  React.useEffect(() => {
    if (!hydrated) return;
    try { writePmStateToLocal(state); } catch { /* ignore */ }
  }, [state, hydrated]);

  React.useEffect(() => {
    if (!hydrated || !userId) return;
    const snapshot = JSON.stringify(state);
    if (snapshot === lastSyncedRef.current) return;
    const timer = window.setTimeout(async () => {
      try {
        await replacePmState(supabase, userId, state);
        lastSyncedRef.current = JSON.stringify(state);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save to cloud.");
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [state, hydrated, userId, supabase]);

  const value = React.useMemo<PmContextValue>(
    () => ({ state, setState, hydrated, error, setError }),
    [state, hydrated, error]
  );

  return <PmContext.Provider value={value}>{children}</PmContext.Provider>;
}

export function usePasswordManager(): PmContextValue {
  const ctx = React.useContext(PmContext);
  if (!ctx) throw new Error("usePasswordManager must be used within PasswordManagerProvider");
  return ctx;
}
