"use client";

import * as React from "react";

import {
  defaultAppSettings,
  readAppSettingsFromLocal,
  writeAppSettingsToLocal,
  type AppSettingsState,
} from "@/lib/app-settings/local-storage";
import {
  fetchAppSettingsState,
  replaceAppSettingsState,
} from "@/lib/app-settings/supabase-app-settings";
import { createClient } from "@/lib/supabase/client";

type AppSettingsContextValue = {
  settings: AppSettingsState;
  setSettings: React.Dispatch<React.SetStateAction<AppSettingsState>>;
  hydrated: boolean;
  saveToCloud: () => Promise<void>;
  cloudSyncing: boolean;
  cloudError: string | null;
  canSyncToCloud: boolean;
};

const AppSettingsContext = React.createContext<AppSettingsContextValue | null>(null);

function isMeaningful(s: AppSettingsState): boolean {
  const d = defaultAppSettings();
  return (
    s.month_start_day !== d.month_start_day ||
    s.home_cards.vehicle !== d.home_cards.vehicle ||
    s.home_cards.food_groceries !== d.home_cards.food_groceries ||
    s.home_cards.seetu !== d.home_cards.seetu ||
    s.home_cards.salary_advance !== d.home_cards.salary_advance ||
    s.home_card_order.join(",") !== d.home_card_order.join(",") ||
    s.app_features.vehicle_logs !== d.app_features.vehicle_logs ||
    s.app_features.credits !== d.app_features.credits ||
    s.app_features.salary_advance !== d.app_features.salary_advance ||
    s.app_features.seetu !== d.app_features.seetu
  );
}

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const supabase = React.useMemo(() => createClient(), []);

  const [userId, setUserId] = React.useState<string | null>(null);
  const [settings, setSettings] = React.useState<AppSettingsState>(defaultAppSettings);
  const [hydrated, setHydrated] = React.useState(false);
  const [cloudSyncing, setCloudSyncing] = React.useState(false);
  const [cloudError, setCloudError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      const local = readAppSettingsFromLocal();
      if (!cancelled) {
        setSettings(local);
        setHydrated(true);
      }

      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw new Error(error.message);
        const user = data.user;
        if (!user || cancelled) {
          if (!cancelled) {
            setUserId(null);
            setCloudError(null);
          }
          return;
        }

        setUserId(user.id);
        const cloud = await fetchAppSettingsState(supabase, user.id);
        if (cancelled) return;

        const localMeaningful = isMeaningful(local);
        const cloudMeaningful = isMeaningful(cloud);

        if (!cloudMeaningful && localMeaningful) {
          const merged = await replaceAppSettingsState(supabase, user.id, local);
          if (cancelled) return;
          setSettings(merged);
        } else {
          setSettings(cloud);
        }

        setCloudError(null);
      } catch (e) {
        if (cancelled) return;
        setCloudError(e instanceof Error ? e.message : "Could not load cloud settings.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      writeAppSettingsToLocal(settings);
    } catch (e) {
      console.error("Could not save app settings.", e);
    }
  }, [settings, hydrated]);

  const saveToCloud = React.useCallback(async () => {
    if (!userId) throw new Error("Sign in to sync settings to cloud.");

    setCloudSyncing(true);
    try {
      const fresh = await replaceAppSettingsState(supabase, userId, settings);
      setSettings(fresh);
      setCloudError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not sync settings to cloud.";
      setCloudError(msg);
      throw new Error(msg);
    } finally {
      setCloudSyncing(false);
    }
  }, [supabase, userId, settings]);

  const fetchLatestFromCloud = React.useCallback(async () => {
    if (!userId) return;
    try {
      const fresh = await fetchAppSettingsState(supabase, userId);
      setSettings(fresh);
      setCloudError(null);
    } catch (e) {
      setCloudError(
        e instanceof Error ? e.message : "Could not sync settings from cloud."
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
    () => ({
      settings,
      setSettings,
      hydrated,
      saveToCloud,
      cloudSyncing,
      cloudError,
      canSyncToCloud: !!userId,
    }),
    [settings, hydrated, saveToCloud, cloudSyncing, cloudError, userId]
  );

  return (
    <AppSettingsContext.Provider value={value}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings(): AppSettingsContextValue {
  const ctx = React.useContext(AppSettingsContext);
  if (!ctx) throw new Error("useAppSettings must be used within AppSettingsProvider");
  return ctx;
}
