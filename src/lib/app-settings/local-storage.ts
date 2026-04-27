export type HomeCardKey = "vehicle" | "seetu" | "salary_advance";
export type AppFeatureKey =
  | "vehicle_logs"
  | "credits"
  | "salary_advance"
  | "seetu";

export type HomeCardVisibility = {
  vehicle: boolean;
  seetu: boolean;
  salary_advance: boolean;
};

export type AppSettingsState = {
  month_start_day: number; // 1..28
  home_cards: HomeCardVisibility;
  home_card_order: HomeCardKey[];
  app_features: Record<AppFeatureKey, boolean>;
};

export const APP_SETTINGS_LOCAL_STORAGE_KEY = "inex-tracker.app-settings.v1";

export function defaultAppSettings(): AppSettingsState {
  return {
    month_start_day: 6,
    home_cards: {
      vehicle: true,
      seetu: true,
      salary_advance: true,
    },
    home_card_order: ["vehicle", "seetu", "salary_advance"],
    app_features: {
      vehicle_logs: true,
      credits: true,
      salary_advance: true,
      seetu: true,
    },
  };
}

function normalizeHomeCardOrder(raw: unknown): HomeCardKey[] {
  const fallback: HomeCardKey[] = ["vehicle", "seetu", "salary_advance"];
  if (!Array.isArray(raw)) return fallback;

  const allowed = new Set<HomeCardKey>(fallback);
  const seen = new Set<HomeCardKey>();
  const next: HomeCardKey[] = [];

  for (const item of raw) {
    if (typeof item !== "string") continue;
    const key = item as HomeCardKey;
    if (!allowed.has(key) || seen.has(key)) continue;
    next.push(key);
    seen.add(key);
  }

  for (const key of fallback) {
    if (!seen.has(key)) next.push(key);
  }
  return next;
}

export function normalizeAppSettings(data: unknown): AppSettingsState {
  const d = defaultAppSettings();
  if (!data || typeof data !== "object") return d;
  const raw = data as Record<string, unknown>;
  const cards = (raw.home_cards ?? {}) as Record<string, unknown>;
  const features = (raw.app_features ?? {}) as Record<string, unknown>;
  const day = Number(raw.month_start_day ?? d.month_start_day);
  return {
    month_start_day:
      Number.isFinite(day) && day >= 1 && day <= 28 ? Math.trunc(day) : d.month_start_day,
    home_cards: {
      vehicle: cards.vehicle == null ? d.home_cards.vehicle : Boolean(cards.vehicle),
      seetu: cards.seetu == null ? d.home_cards.seetu : Boolean(cards.seetu),
      salary_advance:
        cards.salary_advance == null
          ? d.home_cards.salary_advance
          : Boolean(cards.salary_advance),
    },
    home_card_order: normalizeHomeCardOrder(raw.home_card_order),
    app_features: {
      vehicle_logs:
        features.vehicle_logs == null
          ? d.app_features.vehicle_logs
          : Boolean(features.vehicle_logs),
      credits:
        features.credits == null ? d.app_features.credits : Boolean(features.credits),
      salary_advance:
        features.salary_advance == null
          ? d.app_features.salary_advance
          : Boolean(features.salary_advance),
      seetu: features.seetu == null ? d.app_features.seetu : Boolean(features.seetu),
    },
  };
}

export function readAppSettingsFromLocal(): AppSettingsState {
  if (typeof window === "undefined") return defaultAppSettings();
  try {
    const raw = window.localStorage.getItem(APP_SETTINGS_LOCAL_STORAGE_KEY);
    if (!raw) return defaultAppSettings();
    return normalizeAppSettings(JSON.parse(raw));
  } catch {
    return defaultAppSettings();
  }
}

export function writeAppSettingsToLocal(settings: AppSettingsState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      APP_SETTINGS_LOCAL_STORAGE_KEY,
      JSON.stringify(normalizeAppSettings(settings))
    );
  } catch {
    throw new Error("Could not save app settings to browser.");
  }
}
